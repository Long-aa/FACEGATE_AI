"""
Access logs API endpoints for FaceGate AI.
Provides real access history query with multiple filters, pagination, log details, and CSV export.
"""
import csv
from datetime import datetime, timezone
import io
import math
from typing import Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.access_log import AccessLog
from app.schemas.common import AccessLogListResponse, AccessLogOut

router = APIRouter()


def _to_log_out(log: AccessLog) -> AccessLogOut:
    ts = log.timestamp or datetime.now(timezone.utc)
    return AccessLogOut(
        id=log.id,
        log_number=log.log_number or 0,
        timestamp=ts,
        time=ts.strftime("%H:%M:%S"),
        date=ts.strftime("%d/%m/%Y"),
        full_timestamp=ts.strftime("%H:%M:%S.%f")[:-3] + " - " + ts.strftime("%d/%m/%Y"),
        user_id=log.user_id,
        employee_id=log.employee_id,
        user_name=log.user_name or "Người lạ (Unknown)",
        department=log.department or "Khách",
        door_id=log.door_id,
        door_name=log.door_name or "Cửa chính",
        camera_id=log.camera_id,
        camera_name=log.camera_name or "Camera",
        result=log.result,
        confidence=log.confidence,
        cosine_score=log.cosine_score,
        face_distance=log.face_distance,
        liveness_passed=log.liveness_passed,
        liveness_score=log.liveness_score,
        latency_ms=log.latency_ms,
        ai_model=log.ai_model,
        relay_status=log.relay_status,
        is_unknown=log.is_unknown,
        is_masked=log.is_masked,
    )


@router.get("", response_model=AccessLogListResponse)
def list_access_logs(
    q: Optional[str] = Query(None, description="Search user name or employee ID"),
    camera_id: Optional[str] = Query(None, description="Filter by camera ID"),
    door_id: Optional[str] = Query(None, description="Filter by door ID"),
    result: Optional[str] = Query(None, description="Filter by result (GRANTED, DENIED, UNKNOWN, LOW CONF)"),
    date_from: Optional[str] = Query(None, description="ISO or YYYY-MM-DD start date"),
    date_to: Optional[str] = Query(None, description="ISO or YYYY-MM-DD end date"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
) -> Any:
    """
    List access logs with comprehensive filters, search, and pagination.
    """
    query = db.query(AccessLog)

    if q:
        search_str = f"%{q.strip()}%"
        query = query.filter(
            or_(
                AccessLog.user_name.ilike(search_str),
                AccessLog.employee_id.ilike(search_str),
                AccessLog.door_name.ilike(search_str),
                AccessLog.camera_name.ilike(search_str),
            )
        )

    if camera_id:
        query = query.filter(
            or_(AccessLog.camera_id == camera_id, AccessLog.camera_name.ilike(f"%{camera_id}%"))
        )

    if door_id:
        query = query.filter(
            or_(AccessLog.door_id == door_id, AccessLog.door_name.ilike(f"%{door_id}%"))
        )

    if result:
        query = query.filter(AccessLog.result == result)

    if date_from:
        try:
            d_from = datetime.fromisoformat(date_from)
            query = query.filter(AccessLog.timestamp >= d_from)
        except Exception:
            pass

    if date_to:
        try:
            d_to = datetime.fromisoformat(date_to)
            query = query.filter(AccessLog.timestamp <= d_to)
        except Exception:
            pass

    total = query.count()
    logs = (
        query.order_by(AccessLog.timestamp.desc())
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )

    items = [_to_log_out(l) for l in logs]
    total_pages = math.ceil(total / limit) if total > 0 else 1

    return AccessLogListResponse(
        items=items,
        total=total,
        page=page,
        limit=limit,
        total_pages=total_pages,
    )


@router.get("/export")
def export_access_logs_csv(
    db: Session = Depends(get_db),
) -> Response:
    """
    Export all access logs to CSV format.
    """
    logs = db.query(AccessLog).order_by(AccessLog.timestamp.desc()).limit(1000).all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Mã Log",
        "Thời Gian",
        "Mã Nhân Viên",
        "Họ Và Tên",
        "Phòng Ban",
        "Cửa",
        "Camera",
        "Kết Quả",
        "Độ Tin Cậy (%)",
        "Độ Trễ (ms)",
        "Trạng Thái Rơ-le",
    ])

    for log in logs:
        ts = log.timestamp.strftime("%Y-%m-%d %H:%M:%S") if log.timestamp else ""
        writer.writerow([
            log.log_number,
            ts,
            log.employee_id or "N/A",
            log.user_name or "Người lạ",
            log.department or "N/A",
            log.door_name or "Cửa chính",
            log.camera_name or "Camera",
            log.result,
            log.confidence,
            log.latency_ms or "",
            log.relay_status or "",
        ])

    csv_data = output.getvalue()
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=access_logs_export.csv"},
    )


@router.get("/{log_id}", response_model=AccessLogOut)
def get_access_log_detail(
    log_id: str,
    db: Session = Depends(get_db),
) -> Any:
    """
    Get detailed audit record of a single access event.
    """
    log = db.query(AccessLog).filter((AccessLog.id == log_id) | (AccessLog.log_number == int(log_id) if log_id.isdigit() else False)).first()
    if not log:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy bản ghi lịch sử truy cập",
        )
    return _to_log_out(log)
