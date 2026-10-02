"""
Access logs API endpoints for FaceGate AI.
Provides real access history query with multiple filters, pagination, log details, and CSV export.
"""
import csv
from datetime import datetime, timedelta, timezone
import io
import math
import re
from typing import Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import not_, or_
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.access_log import AccessLog
from app.schemas.common import AccessLogListResponse, AccessLogOut

router = APIRouter()

TZ_VN = timezone(timedelta(hours=7))


def _parse_date_param(val: Optional[str], is_end: bool = False) -> Optional[datetime]:
    if not val:
        return None
    val = val.strip()
    # Try DD/MM/YYYY
    m_dmy = re.match(r"^(\d{1,2})/(\d{1,2})/(\d{4})$", val)
    if m_dmy:
        d, m, y = int(m_dmy.group(1)), int(m_dmy.group(2)), int(m_dmy.group(3))
        if is_end:
            return datetime(y, m, d, 23, 59, 59, 999999, tzinfo=TZ_VN)
        return datetime(y, m, d, 0, 0, 0, 0, tzinfo=TZ_VN)

    # Try YYYY-MM-DD
    m_ymd = re.match(r"^(\d{4})-(\d{1,2})-(\d{1,2})$", val)
    if m_ymd:
        y, m, d = int(m_ymd.group(1)), int(m_ymd.group(2)), int(m_ymd.group(3))
        if is_end:
            return datetime(y, m, d, 23, 59, 59, 999999, tzinfo=TZ_VN)
        return datetime(y, m, d, 0, 0, 0, 0, tzinfo=TZ_VN)

    # Try ISO
    try:
        clean_iso = val.replace("Z", "+00:00")
        dt = datetime.fromisoformat(clean_iso)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=TZ_VN)
        if is_end and dt.hour == 0 and dt.minute == 0 and dt.second == 0:
            dt = dt.replace(hour=23, minute=59, second=59, microsecond=999999)
        return dt
    except Exception:
        return None


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
    user_id: Optional[str] = Query(None, description="Filter by user ID, employee ID, or user name"),
    user_type: Optional[str] = Query(None, description="Filter user type: 'emp' (nhân viên) or 'unknown' (người lạ/khách)"),
    camera_id: Optional[str] = Query(None, description="Filter by camera ID or camera name"),
    door_id: Optional[str] = Query(None, description="Filter by door ID or door name"),
    result: Optional[str] = Query(None, description="Filter by result (GRANTED, DENIED, UNKNOWN, MANUAL_VERIFY)"),
    confidence_min: Optional[float] = Query(None, description="Minimum confidence percentage (0-100)"),
    confidence_max: Optional[float] = Query(None, description="Maximum confidence percentage (0-100)"),
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

    # 1. Từ khóa tìm kiếm chung
    if q and q.strip():
        search_str = f"%{q.strip()}%"
        query = query.filter(
            or_(
                AccessLog.user_name.ilike(search_str),
                AccessLog.employee_id.ilike(search_str),
                AccessLog.door_name.ilike(search_str),
                AccessLog.camera_name.ilike(search_str),
            )
        )

    # 2. Lọc Người dùng
    if user_id and user_id != "all":
        u_str = f"%{user_id.strip()}%"
        query = query.filter(
            or_(
                AccessLog.user_id == user_id.strip(),
                AccessLog.employee_id.ilike(u_str),
                AccessLog.user_name.ilike(u_str),
            )
        )

    if user_type and user_type != "all":
        u_t = user_type.lower().strip()
        if u_t in ("emp", "registered", "staff"):
            query = query.filter(
                AccessLog.is_unknown.is_(False),
                AccessLog.employee_id.isnot(None),
                AccessLog.employee_id != "--",
                not_(AccessLog.user_name.ilike("%Người lạ%")),
            )
        elif u_t in ("unknown", "guest", "stranger"):
            query = query.filter(
                or_(
                    AccessLog.is_unknown.is_(True),
                    AccessLog.employee_id == "--",
                    AccessLog.user_name.ilike("%Người lạ%"),
                    AccessLog.result == "UNKNOWN",
                )
            )

    # 3. Lọc Camera
    if camera_id and camera_id != "all":
        cam_str = camera_id.strip()
        query = query.filter(
            or_(
                AccessLog.camera_id == cam_str,
                AccessLog.camera_name == cam_str,
                AccessLog.camera_name.ilike(f"%{cam_str}%"),
            )
        )

    # 4. Lọc Cửa kiểm soát
    if door_id and door_id != "all":
        door_str = door_id.strip()
        query = query.filter(
            or_(
                AccessLog.door_id == door_str,
                AccessLog.door_name == door_str,
                AccessLog.door_name.ilike(f"%{door_str}%"),
            )
        )

    # 5. Lọc Trạng thái
    if result and result != "all":
        r_up = result.strip().upper()
        if r_up == "DENIED":
            query = query.filter(
                AccessLog.result.in_(["DENIED", "LIVENESS_FAILED", "UNAUTHORIZED"])
            )
        elif r_up == "UNKNOWN":
            query = query.filter(
                or_(
                    AccessLog.result == "UNKNOWN",
                    AccessLog.is_unknown.is_(True),
                    AccessLog.user_name.ilike("%Người lạ%"),
                )
            )
        elif r_up in ("MANUAL_VERIFY", "MANUAL VERIFY"):
            query = query.filter(
                AccessLog.result.in_(["MANUAL_VERIFY", "MANUAL VERIFY"])
            )
        else:
            query = query.filter(AccessLog.result == r_up)

    # 6. Lọc Độ tin cậy (Confidence)
    if confidence_min is not None:
        query = query.filter(AccessLog.confidence >= float(confidence_min))
    if confidence_max is not None:
        query = query.filter(AccessLog.confidence <= float(confidence_max))

    # 7. Lọc Thời gian từ ngày đến ngày
    d_from = _parse_date_param(date_from, is_end=False)
    if d_from:
        query = query.filter(AccessLog.timestamp >= d_from)

    d_to = _parse_date_param(date_to, is_end=True)
    if d_to:
        query = query.filter(AccessLog.timestamp <= d_to)

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
