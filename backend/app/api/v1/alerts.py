"""
Security alerts API endpoints for FaceGate AI.
Provides real alert monitoring, severity/status filtering, badge count calculation, and resolution actions.
"""
from datetime import datetime, timezone
from typing import Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.security import get_current_user
from app.database.session import get_db
from app.models.alert import Alert
from app.models.audit import AuditLog
from app.models.user import User
from app.schemas.common import AlertListResponse, AlertOut

router = APIRouter()


def _to_alert_out(alert: Alert) -> AlertOut:
    ts = alert.timestamp or datetime.now(timezone.utc)
    return AlertOut(
        id=alert.id,
        alert_type=alert.alert_type,
        description=alert.description,
        location=alert.location,
        camera_id=alert.camera_id,
        camera_name=alert.camera_name,
        door_id=alert.door_id,
        door_name=alert.door_name,
        severity=alert.severity,
        status=alert.status,
        timestamp=ts,
        time_str=ts.strftime("%H:%M %p"),
        acknowledged_by=alert.acknowledged_by,
        resolved_at=alert.resolved_at,
    )


@router.get("", response_model=AlertListResponse)
def list_alerts(
    severity: Optional[str] = Query(None, description="CRITICAL, WARNING, INFO"),
    status: Optional[str] = Query(None, description="UNRESOLVED, INVESTIGATING, PENDING, RESOLVED"),
    time_range: Optional[str] = Query(None, description="24h, 7d, all"),
    limit: Optional[int] = Query(None, description="Max alerts to return"),
    db: Session = Depends(get_db),
) -> Any:
    """
    List security alerts with severity/status filtering and aggregate counters.
    """
    query = db.query(Alert)

    if severity:
        query = query.filter(Alert.severity == severity)
    if status:
        query = query.filter(Alert.status == status)

    query = query.order_by(Alert.timestamp.desc())
    if limit:
        query = query.limit(limit)

    alerts = query.all()

    # Aggregate counts across all alerts in DB
    total = db.query(Alert).count()
    unresolved_count = db.query(Alert).filter(Alert.status == "UNRESOLVED").count()
    critical_count = db.query(Alert).filter(Alert.severity == "CRITICAL").count()
    warning_count = db.query(Alert).filter(Alert.severity == "WARNING").count()
    info_count = db.query(Alert).filter(Alert.severity == "INFO").count()

    return AlertListResponse(
        items=[_to_alert_out(a) for a in alerts],
        total=total,
        unresolved_count=unresolved_count,
        critical_count=critical_count,
        warning_count=warning_count,
        info_count=info_count,
    )


@router.get("/unresolved-count")
def get_unresolved_alerts_count(db: Session = Depends(get_db)) -> Any:
    """
    Get the exact count of unresolved alerts in the database for the Sidebar badge.
    """
    count = db.query(Alert).filter(Alert.status == "UNRESOLVED").count()
    return {"count": count}


@router.put("/{alert_id}/resolve", response_model=AlertOut)
def resolve_alert(
    alert_id: str,
    current_user: Optional[User] = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Any:
    """
    Mark a security alert as RESOLVED.
    """
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy cảnh báo",
        )

    now = datetime.now(timezone.utc)
    alert.status = "RESOLVED"
    alert.resolved_at = now
    user_name = current_user.full_name if current_user else "Admin"
    alert.acknowledged_by = user_name

    audit = AuditLog(
        action="ALERT_RESOLVE",
        user_id=current_user.id if current_user else None,
        user_name=user_name,
        entity_type="alert",
        entity_id=alert.id,
        details={"alert_type": alert.alert_type, "severity": alert.severity},
    )
    db.add(audit)
    db.commit()
    db.refresh(alert)

    return _to_alert_out(alert)


@router.put("/acknowledge-all")
def acknowledge_all_alerts(
    current_user: Optional[User] = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Any:
    """
    Acknowledge all unresolved alerts in the database.
    """
    now = datetime.now(timezone.utc)
    user_name = current_user.full_name if current_user else "Admin"

    unresolved_alerts = db.query(Alert).filter(Alert.status == "UNRESOLVED").all()
    count = len(unresolved_alerts)

    for alert in unresolved_alerts:
        alert.status = "INVESTIGATING"
        alert.acknowledged_by = user_name
        alert.acknowledged_at = now

    audit = AuditLog(
        action="ALERT_ACKNOWLEDGE_ALL",
        user_id=current_user.id if current_user else None,
        user_name=user_name,
        entity_type="alert",
        details={"count": count},
    )
    db.add(audit)
    db.commit()

    return {"success": True, "acknowledged_count": count}


@router.delete("/{alert_id}")
def delete_alert(
    alert_id: str,
    db: Session = Depends(get_db),
) -> Any:
    """
    Delete an alert record.
    """
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy cảnh báo",
        )
    db.delete(alert)
    db.commit()
    return {"success": True, "message": "Đã xóa cảnh báo"}
