"""
Reports and analytics API endpoints for FaceGate AI.
Provides real database aggregations for traffic charts, success/denied distributions, top visitors, and CSV export.
"""
import csv
from datetime import date as dt_date, datetime, timedelta, timezone
import io
from typing import Any, Dict, List, Optional, Tuple
from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.security import get_current_user
from app.database.session import get_db
from app.models.access_log import AccessLog
from app.models.user import User
from app.schemas.common import (
    AttendanceRecord,
    AttendanceReportOut,
    AttendanceSummary,
    DistributionData,
    ReportSummaryOut,
    TopUserItem,
    TrafficDataPoint,
)

router = APIRouter()


@router.get("/summary", response_model=ReportSummaryOut)
def get_report_summary(
    range_type: str = Query("today", description="today, 7days, or 30days"),
    current_user: User = Depends(get_current_user),
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
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Response:
    """
    Export aggregated report summary to CSV.
    """
    summary = get_report_summary(range_type, current_user, db)

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


# ── Time Attendance Engine & Export (Phase 4) ────────────────────────────────


def _compute_daily_attendance(
    db: Session,
    target_date: dt_date,
    department: Optional[str] = None,
    status_filter: Optional[str] = None,
) -> Tuple[AttendanceSummary, List[AttendanceRecord]]:
    """
    First-IN / Last-OUT attendance calculation per employee for target_date.
    """
    # Start and end of the day in UTC
    day_start = datetime(target_date.year, target_date.month, target_date.day, 0, 0, 0, tzinfo=timezone.utc)
    day_end = day_start + timedelta(days=1)

    # 1. Query all users
    user_query = db.query(User).filter(User.status == "ACTIVE")
    if department:
        user_query = user_query.filter(User.department.ilike(f"%{department.strip()}%"))
    users = user_query.order_by(User.employee_id.asc()).all()

    # 2. Query all GRANTED access logs for that day with employee_id
    logs = (
        db.query(AccessLog)
        .filter(
            AccessLog.timestamp >= day_start,
            AccessLog.timestamp < day_end,
            AccessLog.result == "GRANTED",
            AccessLog.employee_id.isnot(None),
        )
        .order_by(AccessLog.timestamp.asc())
        .all()
    )

    # Group logs by employee_id
    logs_by_emp: dict[str, list[AccessLog]] = {}
    for log in logs:
        emp_id = log.employee_id
        if emp_id not in logs_by_emp:
            logs_by_emp[emp_id] = []
        logs_by_emp[emp_id].append(log)

    records: List[AttendanceRecord] = []
    total_hours = 0.0
    present_count = 0
    on_time_count = 0
    late_count = 0

    date_str = target_date.strftime("%Y-%m-%d")

    for u in users:
        emp_logs = logs_by_emp.get(u.employee_id, [])
        if not emp_logs:
            if status_filter and status_filter.upper() not in ("ALL", "ABSENT"):
                continue
            records.append(
                AttendanceRecord(
                    employee_id=u.employee_id,
                    name=u.full_name,
                    department=u.department or "Chưa phân ban",
                    date=date_str,
                    check_in=None,
                    check_out=None,
                    first_door=None,
                    last_door=None,
                    working_hours=0.0,
                    status="ABSENT",
                    status_label="Vắng mặt",
                    late_minutes=0,
                    early_minutes=0,
                )
            )
            continue

        present_count += 1
        first_log = emp_logs[0]
        last_log = emp_logs[-1]

        # UTC to Vietnam (UTC+7)
        first_vn = first_log.timestamp + timedelta(hours=7) if first_log.timestamp else datetime.now(timezone.utc)
        last_vn = last_log.timestamp + timedelta(hours=7) if last_log.timestamp else datetime.now(timezone.utc)

        check_in_str = first_vn.strftime("%H:%M:%S")
        check_out_str = last_vn.strftime("%H:%M:%S") if len(emp_logs) > 1 else check_in_str

        # Working hours calculation
        if len(emp_logs) > 1 and last_log.timestamp and first_log.timestamp:
            diff_seconds = max(0, (last_log.timestamp - first_log.timestamp).total_seconds())
            hours = round(diff_seconds / 3600.0, 2)
        else:
            hours = 0.0

        total_hours += hours

        # Standard work hours: 08:30 (510 min) to 17:30 (1050 min)
        check_in_min = first_vn.hour * 60 + first_vn.minute
        check_out_min = last_vn.hour * 60 + last_vn.minute

        late_min = max(0, check_in_min - 510)
        early_min = max(0, 1050 - check_out_min) if len(emp_logs) > 1 and check_out_min < 1050 else 0

        if late_min > 0:
            late_count += 1
            att_status = "LATE"
            status_label = f"Đi muộn ({late_min}p)"
        elif len(emp_logs) == 1:
            on_time_count += 1
            att_status = "SINGLE_PUNCH"
            status_label = "Đang làm việc"
        elif early_min > 0 and hours < 7.5:
            att_status = "EARLY_LEAVE"
            status_label = f"Về sớm ({early_min}p)"
        elif hours >= 8.5:
            on_time_count += 1
            att_status = "OVERTIME"
            status_label = "Làm thêm giờ (OT)"
        else:
            on_time_count += 1
            att_status = "ON_TIME"
            status_label = "Đúng giờ"

        if status_filter and status_filter.upper() != "ALL" and att_status != status_filter.upper():
            continue

        records.append(
            AttendanceRecord(
                employee_id=u.employee_id,
                name=u.full_name,
                department=u.department or "Chưa phân ban",
                date=date_str,
                check_in=check_in_str,
                check_out=check_out_str,
                first_door=first_log.door_name,
                last_door=last_log.door_name,
                working_hours=hours,
                status=att_status,
                status_label=status_label,
                late_minutes=late_min,
                early_minutes=early_min,
            )
        )

    avg_hours = round(total_hours / max(1, present_count), 1) if present_count > 0 else 0.0

    summary = AttendanceSummary(
        total_employees=len(users),
        present_count=present_count,
        on_time_count=on_time_count,
        late_count=late_count,
        avg_working_hours=avg_hours,
    )

    return summary, records


@router.get("/attendance", response_model=AttendanceReportOut)
def get_daily_attendance(
    date: Optional[str] = Query(None, description="Target date YYYY-MM-DD (defaults to today)"),
    department: Optional[str] = Query(None, description="Filter by department"),
    status: Optional[str] = Query("ALL", description="Filter by status: ALL, ON_TIME, LATE, ABSENT, etc."),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Any:
    """
    Get daily First-IN / Last-OUT time attendance records from FaceGate access logs.
    """
    if date:
        try:
            target_date = datetime.strptime(date, "%Y-%m-%d").date()
        except ValueError:
            target_date = datetime.now(timezone.utc).date()
    else:
        target_date = datetime.now(timezone.utc).date()

    summary, records = _compute_daily_attendance(db, target_date, department, status)

    return AttendanceReportOut(
        date=target_date.strftime("%Y-%m-%d"),
        summary=summary,
        records=records,
    )


@router.get("/attendance/export")
def export_attendance_csv(
    date: Optional[str] = Query(None, description="Target date YYYY-MM-DD"),
    department: Optional[str] = Query(None),
    status: Optional[str] = Query("ALL"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Response:
    """
    Export First-IN / Last-OUT Attendance Report to CSV with UTF-8 BOM for Excel.
    """
    if date:
        try:
            target_date = datetime.strptime(date, "%Y-%m-%d").date()
        except ValueError:
            target_date = datetime.now(timezone.utc).date()
    else:
        target_date = datetime.now(timezone.utc).date()

    date_str = target_date.strftime("%Y-%m-%d")
    summary, records = _compute_daily_attendance(db, target_date, department, status)

    output = io.StringIO()
    writer = csv.writer(output)

    # Header info
    writer.writerow(["BẢNG CHẤM CÔNG NHẬN DIỆN KHUÔN MẶT - FACEGATE AI", f"Ngày: {date_str}"])
    writer.writerow([
        f"Tổng nhân viên: {summary.total_employees}",
        f"Có mặt: {summary.present_count}",
        f"Đúng giờ: {summary.on_time_count}",
        f"Đi muộn: {summary.late_count}",
        f"Giờ làm TB: {summary.avg_working_hours}h",
    ])
    writer.writerow([])

    # Table columns
    writer.writerow([
        "Mã Nhân Viên",
        "Họ và Tên",
        "Phòng Ban",
        "Ngày",
        "Giờ Vào (Check-In)",
        "Giờ Ra (Check-Out)",
        "Cửa Check-In",
        "Cửa Check-Out",
        "Tổng Giờ Làm (h)",
        "Trạng Thái",
        "Đi Muộn (phút)",
        "Về Sớm (phút)",
    ])

    for r in records:
        writer.writerow([
            r.employee_id,
            r.name,
            r.department,
            r.date,
            r.check_in or "--:--",
            r.check_out or "--:--",
            r.first_door or "--",
            r.last_door or "--",
            f"{r.working_hours:.2f}",
            r.status_label,
            r.late_minutes,
            r.early_minutes,
        ])

    # Prepend UTF-8 BOM for seamless Microsoft Excel rendering
    bom_csv = "\ufeff" + output.getvalue()

    return Response(
        content=bom_csv,
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f"attachment; filename=cham_cong_{date_str}.csv"},
    )
