"""
Audit logs endpoints for FaceGate AI.
Provides complete history of system changes, administrative actions, access control events,
filtering, pagination, and CSV export.
"""
import csv
from datetime import datetime
import io
import math
from typing import Any, Optional
from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.audit import AuditLog
from app.schemas.common import AuditLogListResponse, AuditLogOut

router = APIRouter()


def _to_audit_out(item: AuditLog) -> AuditLogOut:
    return AuditLogOut(
        id=item.id,
        action=item.action,
        user_id=item.user_id,
        user_name=item.user_name or "Hệ thống",
        entity_type=item.entity_type,
        entity_id=item.entity_id,
        details=item.details,
        ip_address=item.ip_address or "127.0.0.1",
        created_at=item.created_at,
    )


@router.get("", response_model=AuditLogListResponse)
def list_audit_logs(
    q: Optional[str] = Query(None, description="Search keyword in action, user, or entity"),
    action: Optional[str] = Query(None, description="Filter by action code"),
    entity_type: Optional[str] = Query(None, description="Filter by entity type (user, camera, door, department, setting, auth)"),
    user_name: Optional[str] = Query(None, description="Filter by user name"),
    date_from: Optional[str] = Query(None, description="Filter from ISO date"),
    date_to: Optional[str] = Query(None, description="Filter to ISO date"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
) -> Any:
    """
    List all system audit logs with multiple filters and pagination.
    """
    query = db.query(AuditLog)

    if q and q.strip():
        search = f"%{q.strip()}%"
        query = query.filter(
            or_(
                AuditLog.action.ilike(search),
                AuditLog.user_name.ilike(search),
                AuditLog.entity_type.ilike(search),
                AuditLog.entity_id.ilike(search),
            )
        )

    if action and action != "ALL":
        query = query.filter(AuditLog.action == action)

    if entity_type and entity_type != "ALL":
        query = query.filter(AuditLog.entity_type == entity_type)

    if user_name:
        query = query.filter(AuditLog.user_name.ilike(f"%{user_name.strip()}%"))

    if date_from:
        try:
            d_from = datetime.fromisoformat(date_from)
            query = query.filter(AuditLog.created_at >= d_from)
        except Exception:
            pass

    if date_to:
        try:
            d_to = datetime.fromisoformat(date_to)
            query = query.filter(AuditLog.created_at <= d_to)
        except Exception:
            pass

    total = query.count()
    items = (
        query.order_by(AuditLog.created_at.desc())
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )

    total_pages = math.ceil(total / limit) if total > 0 else 1

    return AuditLogListResponse(
        items=[_to_audit_out(item) for item in items],
        total=total,
        page=page,
        limit=limit,
        total_pages=total_pages,
    )


@router.get("/export")
def export_audit_logs(
    action: Optional[str] = Query(None),
    entity_type: Optional[str] = Query(None),
    q: Optional[str] = Query(None),
    db: Session = Depends(get_db),
) -> Response:
    """
    Export audit activity logs to CSV format.
    """
    query = db.query(AuditLog)

    if q and q.strip():
        search = f"%{q.strip()}%"
        query = query.filter(
            or_(
                AuditLog.action.ilike(search),
                AuditLog.user_name.ilike(search),
                AuditLog.entity_type.ilike(search),
            )
        )
    if action and action != "ALL":
        query = query.filter(AuditLog.action == action)
    if entity_type and entity_type != "ALL":
        query = query.filter(AuditLog.entity_type == entity_type)

    logs = query.order_by(AuditLog.created_at.desc()).limit(1000).all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "ID",
        "Thoi_gian",
        "Nguoi_thuc_hien",
        "Hanh_dong",
        "Doi_tuong",
        "ID_Doi_tuong",
        "Dia_chi_IP",
        "Chi_tiet",
    ])

    for log in logs:
        ts = log.created_at.strftime("%Y-%m-%d %H:%M:%S") if log.created_at else ""
        writer.writerow([
            log.id,
            ts,
            log.user_name or "He thong",
            log.action,
            log.entity_type or "",
            log.entity_id or "",
            log.ip_address or "127.0.0.1",
            str(log.details) if log.details else "",
        ])

    csv_data = "\ufeff" + output.getvalue()
    filename = f"nhat_ky_he_thong_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"

    return Response(
        content=csv_data,
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
