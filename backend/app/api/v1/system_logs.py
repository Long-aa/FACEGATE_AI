"""
System logs and health diagnostics endpoints for FaceGate AI.
Aggregates operational logs, runtime errors, and service health metrics.
"""
from datetime import datetime, timezone
import os
import platform
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.security import get_current_active_admin
from app.database.session import get_db
from app.models.alert import Alert
from app.models.audit import AuditLog
from app.models.user import User
from app.websocket.manager import ws_manager

router = APIRouter()


@router.get("", response_model=Dict[str, Any])
def get_system_logs(
    level: Optional[str] = Query(None, description="INFO, WARN, ERROR"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_active_admin),
    db: Session = Depends(get_db),
) -> Any:
    """
    Get aggregated system operational logs from audit trail and critical alerts.
    """
    # 1. Fetch recent audit logs as operational log stream
    audit_query = db.query(AuditLog)
    if level == "ERROR":
        audit_query = audit_query.filter(AuditLog.action.ilike("%FAIL%") | AuditLog.action.ilike("%DENIED%"))
    elif level == "WARN":
        audit_query = audit_query.filter(AuditLog.action.ilike("%WARN%") | AuditLog.action.ilike("%ALERT%"))

    total = audit_query.count()
    audits = audit_query.order_by(AuditLog.created_at.desc()).offset(offset).limit(limit).all()

    entries = []
    for a in audits:
        log_level = "INFO"
        if "FAIL" in a.action or "ERROR" in a.action or "DENIED" in a.action:
            log_level = "ERROR"
        elif "WARN" in a.action or "ALERT" in a.action:
            log_level = "WARN"

        entries.append(
            {
                "id": a.id,
                "timestamp": a.created_at.isoformat() if a.created_at else None,
                "level": log_level,
                "component": a.entity_type or "SYSTEM",
                "action": a.action,
                "message": f"[{a.action}] Thao tác bởi {a.user_name or 'Hệ thống'} trên {a.entity_type or 'chung'}",
                "details": a.details,
                "ip_address": a.ip_address,
            }
        )

    return {
        "items": entries,
        "total": total,
        "limit": limit,
        "offset": offset,
    }


@router.get("/diagnostics", response_model=Dict[str, Any])
def get_system_diagnostics(
    current_user: User = Depends(get_current_active_admin),
    db: Session = Depends(get_db),
) -> Any:
    """
    Get system diagnostics: active websocket clients, alert counts, and platform info.
    """
    total_audits = db.query(AuditLog).count()
    active_alerts = db.query(Alert).filter(Alert.status == "ACTIVE").count()

    return {
        "status": "healthy",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "platform": {
            "os": platform.system(),
            "release": platform.release(),
            "architecture": platform.machine(),
            "python_version": platform.python_version(),
        },
        "services": {
            "database": "CONNECTED",
            "websocket_active_connections": len(ws_manager.active_connections),
        },
        "metrics": {
            "total_audit_events": total_audits,
            "active_unresolved_alerts": active_alerts,
        },
    }
