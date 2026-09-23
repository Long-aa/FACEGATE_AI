"""
System settings API endpoints for FaceGate AI.
Provides persistence of all system parameters, thresholds, and configurations directly in PostgreSQL.
"""
from typing import Any, Dict
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.security import get_current_active_admin, get_current_user
from app.database.session import get_db
from app.models.audit import AuditLog
from app.models.setting import SystemSetting
from app.models.user import User
from app.schemas.common import SystemSettingsOut, SystemSettingsUpdate

router = APIRouter()


@router.get("", response_model=SystemSettingsOut)
def get_settings(db: Session = Depends(get_db)) -> Any:
    """
    Retrieve all system settings from database as a dictionary.
    """
    rows = db.query(SystemSetting).all()
    settings_dict = {}
    for r in rows:
        settings_dict[r.key] = r.value

    # Defaults if table was not fully seeded
    defaults = {
        "detection_threshold": 0.65,
        "min_face_size": 60,
        "max_face_size": 300,
        "ai_model": "MobileNet v3 (Fast)",
        "similarity_threshold": 0.82,
        "confidence_score": 0.90,
        "resolution": "1280 × 720 (720p)",
        "target_fps": 15,
        "tensor_rt": True,
        "auto_lock": True,
        "auto_lock_delay": 5,
        "multi_face_mode": "largest_face",
        "save_failed_photos": True,
        "alert_unknown_faces": True,
        "alert_low_confidence": True,
        "alert_camera_offline": True,
        "alert_held_door": True,
    }
    for k, v in defaults.items():
        if k not in settings_dict:
            settings_dict[k] = v

    return SystemSettingsOut(settings=settings_dict)


@router.put("", response_model=SystemSettingsOut)
def update_settings(
    payload: SystemSettingsUpdate,
    current_user: User = Depends(get_current_active_admin),
    db: Session = Depends(get_db),
) -> Any:
    """
    Update or create system settings in database.
    """
    for key, val in payload.settings.items():
        setting = db.query(SystemSetting).filter(SystemSetting.key == key).first()
        if not setting:
            setting = SystemSetting(
                key=key,
                value=val if isinstance(val, dict) else {"value": val},
                category="general",
            )
            db.add(setting)
        else:
            if isinstance(val, dict):
                setting.value = val
            else:
                setting.value = {"value": val}

    audit = AuditLog(
        action="SETTINGS_UPDATE",
        user_id=current_user.id,
        user_name=current_user.full_name,
        entity_type="settings",
        details={"updated_keys": list(payload.settings.keys())},
    )
    db.add(audit)
    db.commit()

    return get_settings(db)
