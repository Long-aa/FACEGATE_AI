"""
Reports and analytics API endpoints for FaceGate AI.
Provides real database aggregations for traffic charts, success/denied distributions, top visitors, and CSV export.
"""
import csv
from datetime import datetime, timedelta, timezone
import io
from typing import Any, List
from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.access_log import AccessLog
from app.models.user import User
from app.schemas.common import (
    DistributionData,
    ReportSummaryOut,
    TopUserItem,
    TrafficDataPoint,
)

router = APIRouter()


@router.get("/summary", response_model=ReportSummaryOut)
def get_report_summary(
    range_type: str = Query("today", description="today, 7days, or 30days"),
    db: Session = Depends(get_db),
) -> Any:
    """
    Get aggregated report metrics for the requested time range.
    """
    now = datetime.now(timezone.utc)
    if range_type == "30days":
        start_time = now - timedelta(days=30)
    elif range_type == "7days":
        start_time = now - timedelta(days=7)
    else:
        start_time = now.replace(hour=0, minute=0, second=0, microsecond=0)

    # Base query for the time range
    base_query = db.query(AccessLog).filter(AccessLog.timestamp >= start_time)
    total_access = base_query.count()

    # 1. Distribution (GRANTED, DENIED, UNKNOWN)
    granted_count = base_query.filter(AccessLog.result == "GRANTED").count()
    denied_count = base_query.filter(AccessLog.result == "DENIED").count()
    unknown_count = base_query.filter(AccessLog.result.in_(["UNKNOWN", "LOW CONF"])).count()

    granted_pct = round((granted_count / total_access) * 100, 1) if total_access > 0 else 0.0
    denied_pct = round((denied_count / total_access) * 100, 1) if total_access > 0 else 0.0
    unknown_pct = round((unknown_count / total_access) * 100, 1) if total_access > 0 else 0.0

    distribution = DistributionData(
        granted_count=granted_count,
        denied_count=denied_count,
        unknown_count=unknown_count,
        granted_pct=granted_pct,
        denied_pct=denied_pct,
        unknown_pct=unknown_pct,
    )

    # 2. Traffic data points
    traffic_points = []
    if range_type == "today":
        # Group by 2-hour intervals for today
        for h in range(6, 24, 2):
            h_start = start_time.replace(hour=h, minute=0, second=0)
            h_end = h_start + timedelta(hours=2)
            c = (
                db.query(AccessLog)
                .filter(AccessLog.timestamp >= h_start, AccessLog.timestamp < h_end)
                .count()
            )
            traffic_points.append(TrafficDataPoint(label=f"{h:02d}:00", value=c))
    elif range_type == "7days":
        # Group by day of week
        for d in range(6, -1, -1):
            day_date = (now - timedelta(days=d)).date()
            c = (
                db.query(AccessLog)
                .filter(func.date(AccessLog.timestamp) == day_date)
                .count()
            )
            label = (now - timedelta(days=d)).strftime("%a")
            traffic_points.append(TrafficDataPoint(label=label, value=c))
    else:
        # Group by 5-day intervals
        for d in range(25, -1, -5):
            d_start = now - timedelta(days=d + 5)
            d_end = now - timedelta(days=d)
            c = (
                db.query(AccessLog)
                .filter(AccessLog.timestamp >= d_start, AccessLog.timestamp < d_end)
                .count()
            )
            label = d_end.strftime("%d/%m")
            traffic_points.append(TrafficDataPoint(label=label, value=c))

    # 3. Top users
    top_user_rows = (
        db.query(
            AccessLog.employee_id,
            AccessLog.user_name,
            AccessLog.department,
            func.count(AccessLog.id).label("cnt"),
            func.max(AccessLog.timestamp).label("last_acc"),
        )
        .filter(AccessLog.employee_id.isnot(None))
        .group_by(AccessLog.employee_id, AccessLog.user_name, AccessLog.department)
        .order_by(func.count(AccessLog.id).desc())
        .limit(5)
        .all()
    )

    top_users = [
        TopUserItem(
            employee_id=r.employee_id or "",
            full_name=r.user_name or "",
            department=r.department or "",
            access_count=r.cnt,
            last_access=r.last_acc,
        )
        for r in top_user_rows
    ]

    # 4. By Door
    door_rows = (
        db.query(
            AccessLog.door_name,
            func.count(AccessLog.id).label("cnt"),
        )
        .filter(AccessLog.door_name.isnot(None))
        .group_by(AccessLog.door_name)
        .order_by(func.count(AccessLog.id).desc())
        .all()
    )
    by_door = [{"name": r.door_name, "count": r.cnt} for r in door_rows]

    # 5. By Camera
    cam_rows = (
        db.query(
            AccessLog.camera_name,
            func.count(AccessLog.id).label("cnt"),
        )
        .filter(AccessLog.camera_name.isnot(None))
        .group_by(AccessLog.camera_name)
        .order_by(func.count(AccessLog.id).desc())
        .all()
    )
    by_camera = [{"name": r.camera_name, "count": r.cnt} for r in cam_rows]

    return ReportSummaryOut(
        range=range_type,
        total_access=total_access,
        traffic=traffic_points,
        distribution=distribution,
        top_users=top_users,
        by_door=by_door,
        by_camera=by_camera,
    )


@router.get("/export")
def export_report_csv(
    range_type: str = Query("today"),
    db: Session = Depends(get_db),
) -> Response:
    """
    Export aggregated report summary to CSV.
    """
    summary = get_report_summary(range_type, db)

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["BÁO CÁO HOẠT ĐỘNG FACEGATE AI", f"Khoảng thời gian: {range_type}"])
    writer.writerow([])

    writer.writerow(["TỔNG HỢP"])
    writer.writerow(["Tổng lượt truy cập", summary.total_access])
    writer.writerow(["Cho phép (GRANTED)", summary.distribution.granted_count, f"{summary.distribution.granted_pct}%"])
    writer.writerow(["Từ chối (DENIED)", summary.distribution.denied_count, f"{summary.distribution.denied_pct}%"])
    writer.writerow(["Người lạ (UNKNOWN)", summary.distribution.unknown_count, f"{summary.distribution.unknown_pct}%"])
    writer.writerow([])

    writer.writerow(["TOP NGƯỜI DÙNG RA VÀO"])
    writer.writerow(["Mã Nhân Viên", "Họ Tên", "Phòng Ban", "Số Lần"])
    for u in summary.top_users:
        writer.writerow([u.employee_id, u.full_name, u.department, u.access_count])
    writer.writerow([])

    writer.writerow(["TRUY CẬP THEO CỬA"])
    writer.writerow(["Tên Cửa", "Số Lượt"])
    for d in summary.by_door:
        writer.writerow([d["name"], d["count"]])

    csv_data = output.getvalue()
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=report_{range_type}.csv"},
    )
