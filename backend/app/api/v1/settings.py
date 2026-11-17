
"""
System settings API endpoints for FaceGate AI.
Provides persistence of all system parameters, thresholds, and configurations directly in PostgreSQL.
"""
from typing import Any, Dict
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.security import get_current_active_admin, get_current_user
from app.database.session import get_db
from app.models.audit import AuditLog
from app.models.setting import SystemSetting
from app.models.user import User
from app.schemas.common import SystemSettingsOut, SystemSettingsUpdate

router = APIRouter()


def _extract_scalar(v: Any) -> Any:
    """Extract primitive value from JSONB wrapped dict or return scalar directly."""
    if isinstance(v, dict):
        for k in ("value", "threshold", "seconds", "mode", "enabled"):
            if k in v:
                return v[k]
        if len(v) == 1:
            return list(v.values())[0]
    return v


def _get_settings_dict(db: Session) -> Dict[str, Any]:
    rows = db.query(SystemSetting).all()
    raw_dict: Dict[str, Any] = {r.key: _extract_scalar(r.value) for r in rows}

    # Canonical threshold & parameter resolution
    rec_thresh = (
        raw_dict.get("recognition.threshold")
        or raw_dict.get("recognition_threshold")
        or raw_dict.get("detection_threshold")
        or 0.60
    )
    try:
        rec_thresh_val = float(rec_thresh)
    except (ValueError, TypeError):
        rec_thresh_val = 0.60

    sim_thresh = (
        raw_dict.get("recognition.similarity_threshold")
        or raw_dict.get("similarity_threshold")
        or 0.82
    )
    try:
        sim_thresh_val = float(sim_thresh)
    except (ValueError, TypeError):
        sim_thresh_val = 0.82

    ai_model = (
        raw_dict.get("recognition.model")
        or raw_dict.get("ai_model")
        or "MobileNet v3 (Fast)"
    )

    door_dur = (
        raw_dict.get("door_unlock_duration")
        or raw_dict.get("auto_lock_delay")
        or 10
    )

    settings_dict = dict(raw_dict)

    # Harmonize aliases across UI modules (settings/page.tsx, recognition/page.tsx, and backend recognition pipeline)
    settings_dict["recognition.threshold"] = str(rec_thresh_val)
    settings_dict["recognition_threshold"] = rec_thresh_val
    settings_dict["detection_threshold"] = rec_thresh_val

    settings_dict["recognition.similarity_threshold"] = str(sim_thresh_val)
    settings_dict["similarity_threshold"] = sim_thresh_val

    settings_dict["recognition.model"] = str(ai_model)
    settings_dict["ai_model"] = str(ai_model)

    settings_dict["door_unlock_duration"] = door_dur
    settings_dict["auto_lock_delay"] = door_dur

    # Defaults if missing
    defaults: Dict[str, Any] = {
        "min_face_size": 60,
        "max_face_size": 300,
        "recognition.min_face_size": "60",
        "recognition.max_face_size": "300",
        "confidence_score": 0.90,
        "recognition.confidence_required": "0.90",
        "resolution": "1280 × 720 (720p)",
        "camera.resolution": "1280 × 720 (720p)",
        "target_fps": 15,
        "camera.fps": "15",
        "tensor_rt": True,
        "system.tensorrt": "true",
        "auto_lock": True,
        "system.auto_lock_on_threat": "true",
        "alert_sound": True,
        "system.alert_sound": "true",
        "multi_face_mode": "reject_multi",
        "save_failed_photos": True,
        "alert_unknown_faces": True,
        "alert_low_confidence": True,
        "alert_camera_offline": True,
        "alert_held_door": True,
    }
    for k, v in defaults.items():
        if k not in settings_dict:
            settings_dict[k] = v

    return settings_dict


@router.get("", response_model=SystemSettingsOut)
def get_settings(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Any:
    """
    Retrieve all system settings from database as a unified dictionary.
    """
    return SystemSettingsOut(settings=_get_settings_dict(db))


@router.put("", response_model=SystemSettingsOut)
def update_settings(
    payload: SystemSettingsUpdate,
    current_user: User = Depends(get_current_active_admin),
    db: Session = Depends(get_db),
) -> Any:
    """
    Update or create system settings in database with bidirectional key synchronization.
    """
    update_items = dict(payload.settings)

    # Sync aliases bidirectionally so both dot-notation and underscore keys are kept in sync
    if "recognition.threshold" in update_items:
        val = update_items["recognition.threshold"]
        update_items["recognition_threshold"] = val
        update_items["detection_threshold"] = val
    elif "recognition_threshold" in update_items:
        val = update_items["recognition_threshold"]
        update_items["recognition.threshold"] = str(val)
        update_items["detection_threshold"] = val
    elif "detection_threshold" in update_items:
        val = update_items["detection_threshold"]
        update_items["recognition.threshold"] = str(val)
        update_items["recognition_threshold"] = val

    if "recognition.similarity_threshold" in update_items:
        val = update_items["recognition.similarity_threshold"]
        update_items["similarity_threshold"] = val
    elif "similarity_threshold" in update_items:
        val = update_items["similarity_threshold"]
        update_items["recognition.similarity_threshold"] = str(val)

    if "recognition.model" in update_items:
        val = update_items["recognition.model"]
        update_items["ai_model"] = val
    elif "ai_model" in update_items:
        val = update_items["ai_model"]
        update_items["recognition.model"] = str(val)

    for key, val in update_items.items():
        setting = db.query(SystemSetting).filter(SystemSetting.key == key).first()
        val_to_store = val if isinstance(val, dict) else {"value": val}
        if not setting:
            setting = SystemSetting(
                key=key,
                value=val_to_store,
                category="general",
            )
            db.add(setting)
        else:
            setting.value = val_to_store

    audit = AuditLog(
        action="SETTINGS_UPDATE",
        user_id=current_user.id,
        user_name=current_user.full_name,
        entity_type="settings",
        details={"updated_keys": list(payload.settings.keys())},
    )
    db.add(audit)
    db.commit()

    return SystemSettingsOut(settings=_get_settings_dict(db))
