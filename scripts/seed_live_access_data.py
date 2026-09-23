"""
Seed live access logs and alerts up to today (2026-09-23)
Ensures that Dashboard, Access Logs, Reports, and Alerts display realistic, rich real-time data.
"""
import sys
from pathlib import Path
from datetime import datetime, timedelta, timezone

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

backend_path = Path(__file__).resolve().parent.parent / "backend"
if str(backend_path) not in sys.path:
    sys.path.insert(0, str(backend_path))

from app.database.session import SessionLocal
from app.models import AccessLog, Alert, Camera, Door, User

def seed():
    db = SessionLocal()
    try:
        users = db.query(User).all()
        doors = db.query(Door).all()
        cameras = db.query(Camera).all()

        # Update all cameras to Online by default
        for cam in cameras:
            cam.status = "Online"
            cam.fps = 30
            cam.latency = 14
        
        # Update all doors to Online and Locked
        for door in doors:
            door.status = "Online"
            door.lock_status = "Locked"

        db.commit()

        # Check existing logs count
        total_logs = db.query(AccessLog).count()
        print(f"Current AccessLog count: {total_logs}")

        # Current time reference: 2026-09-23 22:00:00+07:00
        vn_tz = timezone(timedelta(hours=7))
        base_today = datetime(2026, 9, 23, 0, 0, 0, tzinfo=vn_tz)

        # Update timestamps of the existing 60 access logs so they cover the last 7 days through today
        all_logs = db.query(AccessLog).order_by(AccessLog.log_number.asc()).all()
        if all_logs:
            # Spread logs across days: day -6 to today (day 0)
            for idx, log in enumerate(all_logs):
                # idx from 0 to 59
                # 0..9 -> day -6
                # 10..19 -> day -5
                # 20..29 -> day -4
                # 30..39 -> day -3
                # 40..47 -> day -2
                # 48..53 -> day -1
                # 54..59 -> day 0 (today)
                day_offset = -6 + (idx // 9)
                if day_offset > 0:
                    day_offset = 0
                
                # Hour in day (8am to 21pm)
                hour = 8 + (idx % 14)
                minute = (idx * 7) % 60
                second = (idx * 13) % 60
                
                log_time = base_today + timedelta(days=day_offset, hours=hour, minutes=minute, seconds=second)
                log.timestamp = log_time

        # Add 25 more access logs for TODAY (2026-09-23) so "today" views in Reports & Dashboard have rich hourly distribution
        today_hours = [7, 8, 8, 8, 9, 9, 10, 11, 12, 12, 13, 14, 14, 15, 15, 16, 17, 17, 18, 18, 19, 20, 21, 22, 23]
        results = [
            ("GRANTED", 98.4, False, False),
            ("GRANTED", 96.2, False, False),
            ("GRANTED", 99.1, False, False),
            ("DENIED", 44.5, False, False),
            ("GRANTED", 95.7, False, False),
            ("GRANTED", 97.3, False, False),
            ("UNKNOWN", 32.1, True, True),
            ("GRANTED", 94.8, False, False),
            ("GRANTED", 98.0, False, False),
            ("GRANTED", 96.5, False, False),
            ("DENIED", 41.2, False, False),
            ("GRANTED", 97.9, False, False),
            ("GRANTED", 98.8, False, False),
            ("GRANTED", 95.1, False, False),
            ("UNKNOWN", 28.4, True, False),
            ("GRANTED", 99.3, False, False),
            ("GRANTED", 97.0, False, False),
            ("GRANTED", 96.6, False, False),
            ("GRANTED", 98.2, False, False),
            ("DENIED", 39.8, False, False),
            ("GRANTED", 95.9, False, False),
            ("GRANTED", 97.4, False, False),
            ("GRANTED", 96.1, False, False),
            ("GRANTED", 94.2, False, False),
            ("GRANTED", 98.6, False, False),
        ]

        user_list = list(users)
        door_list = list(doors)
        cam_list = list(cameras)

        # Get max log number
        max_num = db.query(AccessLog.log_number).order_by(AccessLog.log_number.desc()).first()
        start_log_num = (max_num[0] + 1) if max_num else 1500

        for i, h in enumerate(today_hours):
            res_type, conf, is_unk, is_mask = results[i % len(results)]
            u = None if is_unk else user_list[i % len(user_list)]
            d = door_list[i % len(door_list)]
            c = cam_list[i % len(cam_list)]

            log_t = base_today + timedelta(hours=h, minutes=(i * 11) % 60, seconds=(i * 19) % 60)
            new_log = AccessLog(
                log_number=start_log_num + i,
                timestamp=log_t,
                user_id=u.id if u else None,
                employee_id=u.employee_id if u else ("--" if is_unk else "EMP-GUEST"),
                user_name=u.full_name if u else ("Người lạ (Unknown)" if is_unk else "Khách vãng lai"),
                department=u.department if u else ("Khách" if not is_unk else "Chưa xác định"),
                card_type="Smart Face ID v2" if u else "Không có thẻ",
                door_id=d.id,
                door_name=d.name,
                camera_id=c.id,
                camera_name=c.name,
                result=res_type,
                confidence=conf,
                cosine_score=round(conf / 100, 3),
                face_distance=round((100 - conf) / 100 * 0.5, 2),
                liveness_passed=(res_type == "GRANTED"),
                liveness_score=round(conf * 1.01, 1) if res_type == "GRANTED" else 45.0,
                latency_ms=16 + (i * 3) % 25,
                ai_model="Dlib ResNet-34 (512D)",
                relay_status="Mở tự động (Relay 01)" if res_type == "GRANTED" else "Khóa cưỡng bức (Không mở)",
                is_unknown=is_unk,
                is_masked=is_mask,
            )
            db.add(new_log)

        # Also update alerts timestamps up to today
        all_alerts = db.query(Alert).all()
        for idx, a in enumerate(all_alerts):
            day_offset = -4 + (idx % 5)
            h = 9 + (idx * 2) % 12
            a.timestamp = base_today + timedelta(days=day_offset, hours=h, minutes=(idx * 17) % 60)

        db.commit()
        print("Successfully updated access logs and alerts with live dates through today (2026-09-23)!")
        print(f"Total access logs now: {db.query(AccessLog).count()}")
        print(f"Today's access logs: {db.query(AccessLog).filter(AccessLog.timestamp >= base_today).count()}")

    except Exception as e:
        db.rollback()
        print(f"Error seeding data: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    seed()
