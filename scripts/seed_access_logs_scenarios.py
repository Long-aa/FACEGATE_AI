"""
Script to seed exact data for Access Logs test scenarios into FaceGate AI database.
Date: 20/09/2026
Total records: 10
- Granted: 7
- Denied: 2 (both "Người lạ")
- Manual Verify: 1 (Trần Minh Đức - Phòng Server B)
- Cameras:
  * Cửa chính Lobby: 4 records (all Granted, including Trương Văn Long)
  * Cửa ra chính: 4 records (3 Granted, 1 Denied)
  * Phòng Server B: 1 record (Trần Minh Đức - Manual Verify)
  * Sảnh phía Tây: 1 record (Người lạ - Denied)
  * Thang máy VIP: 0 records
  * Bãi đỗ xe: 0 records
"""
import sys
import os
from pathlib import Path
from datetime import datetime, timezone

# Ensure backend root is on sys.path
backend_path = Path(__file__).resolve().parent.parent / "backend"
sys.path.insert(0, str(backend_path))

from app.database.session import SessionLocal
from app.models.camera import Camera
from app.models.door import Door
from app.models.user import User
from app.models.access_log import AccessLog
from app.core.security import get_password_hash


def seed_scenario_data():
    db = SessionLocal()
    print("=" * 70)
    print("BẮT ĐẦU CẬP NHẬT CSDL CHO 20 KỊCH BẢN KIỂM THỬ ACCESS LOGS")
    print("=" * 70)

    try:
        # ── 1. DOORS ──────────────────────────────────────────────────────────
        doors_to_seed = [
            {"door_code": "D-001", "name": "Cửa chính Lobby", "location": "Tầng 1 - Sảnh chính", "door_type": "entrance"},
            {"door_code": "D-002", "name": "Cửa ra chính", "location": "Tầng 1 - Cửa ra", "door_type": "exit"},
            {"door_code": "D-003", "name": "Phòng Server B", "location": "Tầng hầm B1 - Khu kỹ thuật", "door_type": "server"},
            {"door_code": "D-004", "name": "Sảnh phía Tây", "location": "Tầng 1 - Cánh Tây", "door_type": "entrance"},
            {"door_code": "D-005", "name": "Thang máy VIP", "location": "Sảnh thang máy Tầng 1", "door_type": "elevator"},
            {"door_code": "D-006", "name": "Bãi đỗ xe", "location": "Bãi đỗ xe ngoài trời", "door_type": "parking"},
        ]

        door_map = {}
        for d_info in doors_to_seed:
            door = db.query(Door).filter(Door.door_code == d_info["door_code"]).first()
            if not door:
                door = Door(
                    door_code=d_info["door_code"],
                    name=d_info["name"],
                    location=d_info["location"],
                    door_type=d_info["door_type"],
                    status="Online",
                    lock_status="Locked",
                    relay_pin=18,
                    unlock_duration=5,
                )
                db.add(door)
                db.flush()
            else:
                door.name = d_info["name"]
                door.location = d_info["location"]
                door.door_type = d_info["door_type"]
                db.flush()
            door_map[d_info["name"]] = door

        print(f"  ✓ Đã đồng bộ {len(door_map)} Cửa kiểm soát.")

        # ── 2. CAMERAS ────────────────────────────────────────────────────────
        cameras_to_seed = [
            {"camera_code": "CAM-01", "name": "Cửa chính Lobby", "door_name": "Cửa chính Lobby", "location": "Sảnh chính Tầng 1"},
            {"camera_code": "CAM-02", "name": "Cửa ra chính", "door_name": "Cửa ra chính", "location": "Cửa ra sảnh chính"},
            {"camera_code": "CAM-03", "name": "Phòng Server B", "door_name": "Phòng Server B", "location": "Phòng Server Tầng hầm B1"},
            {"camera_code": "CAM-04", "name": "Sảnh phía Tây", "door_name": "Sảnh phía Tây", "location": "Sảnh cánh Tây Tầng 1"},
            {"camera_code": "CAM-05", "name": "Thang máy VIP", "door_name": "Thang máy VIP", "location": "Khu vực Thang máy VIP"},
            {"camera_code": "CAM-06", "name": "Bãi đỗ xe", "door_name": "Bãi đỗ xe", "location": "Bãi đỗ xe ngoài trời"},
        ]

        camera_map = {}
        for c_info in cameras_to_seed:
            cam = db.query(Camera).filter(Camera.camera_code == c_info["camera_code"]).first()
            door = door_map.get(c_info["door_name"])
            if not cam:
                cam = Camera(
                    camera_code=c_info["camera_code"],
                    name=c_info["name"],
                    location=c_info["location"],
                    camera_type="entrance",
                    status="Online",
                    fps=30,
                    latency=15,
                    resolution="1920×1080",
                    res_label="1080p",
                    door_id=door.id if door else None,
                )
                db.add(cam)
                db.flush()
            else:
                cam.name = c_info["name"]
                cam.location = c_info["location"]
                if door:
                    cam.door_id = door.id
                db.flush()
            camera_map[c_info["name"]] = cam

        print(f"  ✓ Đã đồng bộ {len(camera_map)} Camera theo hệ thống.")

        # ── 3. USERS ──────────────────────────────────────────────────────────
        users_to_seed = [
            {
                "employee_id": "EMP-2023",
                "full_name": "Trương Văn Long",
                "email": "long.truong@facegate.ai",
                "department": "Khối Kỹ thuật & R&D AI",
                "position": "Kỹ sư AI cao cấp",
                "role": "STAFF",
                "status": "ACTIVE",
            },
            {
                "employee_id": "EMP-2042",
                "full_name": "Trần Minh Đức",
                "email": "duc.tran@aiaccess.corp",
                "department": "Phòng Kế toán & Tài chính",
                "position": "Chuyên viên Kế toán",
                "role": "STAFF",
                "status": "WAITING",
            },
            {
                "employee_id": "EMP-2045",
                "full_name": "Nguyễn Văn An",
                "email": "an.nguyen@aiaccess.corp",
                "department": "Khối Kỹ thuật & R&D AI",
                "position": "Kỹ sư AI cao cấp",
                "role": "STAFF",
                "status": "ACTIVE",
            },
            {
                "employee_id": "EMP-2105",
                "full_name": "Lê Hoàng Nam",
                "email": "nam.le@aiaccess.corp",
                "department": "Ban An ninh & Giám sát",
                "position": "Đội trưởng An ninh",
                "role": "STAFF",
                "status": "ACTIVE",
            },
            {
                "employee_id": "EMP-1988",
                "full_name": "Phạm Quang Huy",
                "email": "huy.pham@aiaccess.corp",
                "department": "Khối Vận hành",
                "position": "Kỹ thuật viên Vận hành",
                "role": "STAFF",
                "status": "ACTIVE",
            },
            {
                "employee_id": "EMP-2210",
                "full_name": "Nguyễn Thu Hà",
                "email": "ha.nguyen@aiaccess.corp",
                "department": "Phòng Quản trị Nhân sự",
                "position": "Trưởng phòng Nhân sự",
                "role": "STAFF",
                "status": "ACTIVE",
            },
            {
                "employee_id": "EMP-0001",
                "full_name": "Admin Quản Trị",
                "email": "admin@facegate.ai",
                "department": "Ban Giám Đốc & IT",
                "position": "Giám đốc CNTT",
                "role": "ADMIN",
                "status": "ACTIVE",
            },
            {
                "employee_id": "EMP-2048",
                "full_name": "Vũ Hải Đăng",
                "email": "dang.vu@aiaccess.corp",
                "department": "Phòng Kinh doanh & Marketing",
                "position": "Chuyên viên Kinh doanh",
                "role": "STAFF",
                "status": "ACTIVE",
            },
        ]

        user_map = {}
        for u_info in users_to_seed:
            user = db.query(User).filter(User.employee_id == u_info["employee_id"]).first()
            if not user:
                user = User(
                    employee_id=u_info["employee_id"],
                    full_name=u_info["full_name"],
                    email=u_info["email"],
                    department=u_info["department"],
                    position=u_info["position"],
                    role=u_info["role"],
                    status=u_info["status"],
                    hashed_password=get_password_hash("Password@123"),
                )
                db.add(user)
                db.flush()
            else:
                user.full_name = u_info["full_name"]
                user.department = u_info["department"]
                db.flush()
            user_map[u_info["employee_id"]] = user

        print(f"  ✓ Đã đồng bộ {len(user_map)} Người dùng / Nhân viên.")

        # ── 4. ACCESS LOGS (EXACTLY 10 RECORDS ON 20/09/2026) ─────────────────
        deleted_count = db.query(AccessLog).filter(
            AccessLog.timestamp >= datetime(2026, 9, 20, 0, 0, 0, tzinfo=timezone.utc),
            AccessLog.timestamp <= datetime(2026, 9, 20, 23, 59, 59, tzinfo=timezone.utc),
        ).delete()
        if deleted_count:
            print(f"  ✓ Đã xóa {deleted_count} bản ghi cũ ngày 20/09/2026.")

        # Also delete 13/09/2026 logs to ensure 0 records
        db.query(AccessLog).filter(
            AccessLog.timestamp >= datetime(2026, 9, 13, 0, 0, 0, tzinfo=timezone.utc),
            AccessLog.timestamp <= datetime(2026, 9, 13, 23, 59, 59, tzinfo=timezone.utc),
        ).delete()

        # 10 scenario records
        target_logs = [
            # 1. Trương Văn Long - Cửa chính Lobby - GRANTED
            {
                "timestamp": datetime(2026, 9, 20, 10, 45, 22, tzinfo=timezone.utc),
                "user": user_map["EMP-2023"],
                "camera": camera_map["Cửa chính Lobby"],
                "door": door_map["Cửa chính Lobby"],
                "result": "GRANTED",
                "confidence": 98.5,
                "cosine_score": 0.985,
                "face_distance": 0.12,
                "is_unknown": False,
                "latency_ms": 32,
                "relay_status": "Mở tự động (Relay 01)",
            },
            # 2. Nguyễn Văn An - Cửa chính Lobby - GRANTED
            {
                "timestamp": datetime(2026, 9, 20, 10, 42, 15, tzinfo=timezone.utc),
                "user": user_map["EMP-2045"],
                "camera": camera_map["Cửa chính Lobby"],
                "door": door_map["Cửa chính Lobby"],
                "result": "GRANTED",
                "confidence": 96.8,
                "cosine_score": 0.968,
                "face_distance": 0.18,
                "is_unknown": False,
                "latency_ms": 40,
                "relay_status": "Mở tự động (Relay 01)",
            },
            # 3. Lê Hoàng Nam - Cửa chính Lobby - GRANTED
            {
                "timestamp": datetime(2026, 9, 20, 10, 35, 19, tzinfo=timezone.utc),
                "user": user_map["EMP-2105"],
                "camera": camera_map["Cửa chính Lobby"],
                "door": door_map["Cửa chính Lobby"],
                "result": "GRANTED",
                "confidence": 97.4,
                "cosine_score": 0.974,
                "face_distance": 0.15,
                "is_unknown": False,
                "latency_ms": 35,
                "relay_status": "Mở tự động (Relay 01)",
            },
            # 4. Phạm Quang Huy - Cửa chính Lobby - GRANTED
            {
                "timestamp": datetime(2026, 9, 20, 10, 31, 44, tzinfo=timezone.utc),
                "user": user_map["EMP-1988"],
                "camera": camera_map["Cửa chính Lobby"],
                "door": door_map["Cửa chính Lobby"],
                "result": "GRANTED",
                "confidence": 95.2,
                "cosine_score": 0.952,
                "face_distance": 0.21,
                "is_unknown": False,
                "latency_ms": 38,
                "relay_status": "Mở tự động (Relay 01)",
            },
            # 5. Trần Minh Đức - Phòng Server B - MANUAL_VERIFY
            {
                "timestamp": datetime(2026, 9, 20, 10, 25, 30, tzinfo=timezone.utc),
                "user": user_map["EMP-2042"],
                "camera": camera_map["Phòng Server B"],
                "door": door_map["Phòng Server B"],
                "result": "MANUAL_VERIFY",
                "confidence": 68.5,
                "cosine_score": 0.685,
                "face_distance": 0.35,
                "is_unknown": False,
                "latency_ms": 55,
                "relay_status": "Chờ xác thực thủ công",
            },
            # 6. Người lạ - Sảnh phía Tây - DENIED
            {
                "timestamp": datetime(2026, 9, 20, 10, 18, 5, tzinfo=timezone.utc),
                "user_name": "Người lạ",
                "employee_id": "--",
                "department": "Khách chưa đăng ký",
                "camera": camera_map["Sảnh phía Tây"],
                "door": door_map["Sảnh phía Tây"],
                "result": "DENIED",
                "confidence": 42.1,
                "cosine_score": 0.421,
                "face_distance": 0.72,
                "is_unknown": True,
                "latency_ms": 45,
                "relay_status": "Khóa cưỡng bức (Không mở)",
            },
            # 7. Người lạ - Cửa ra chính - DENIED
            {
                "timestamp": datetime(2026, 9, 20, 10, 12, 40, tzinfo=timezone.utc),
                "user_name": "Người lạ",
                "employee_id": "--",
                "department": "Khách chưa đăng ký",
                "camera": camera_map["Cửa ra chính"],
                "door": door_map["Cửa ra chính"],
                "result": "DENIED",
                "confidence": 38.4,
                "cosine_score": 0.384,
                "face_distance": 0.78,
                "is_unknown": True,
                "latency_ms": 48,
                "relay_status": "Khóa cưỡng bức (Không mở)",
            },
            # 8. Nguyễn Thu Hà - Cửa ra chính - GRANTED
            {
                "timestamp": datetime(2026, 9, 20, 10, 5, 12, tzinfo=timezone.utc),
                "user": user_map["EMP-2210"],
                "camera": camera_map["Cửa ra chính"],
                "door": door_map["Cửa ra chính"],
                "result": "GRANTED",
                "confidence": 96.2,
                "cosine_score": 0.962,
                "face_distance": 0.17,
                "is_unknown": False,
                "latency_ms": 36,
                "relay_status": "Mở tự động (Relay 02)",
            },
            # 9. Admin Quản Trị - Cửa ra chính - GRANTED
            {
                "timestamp": datetime(2026, 9, 20, 9, 55, 0, tzinfo=timezone.utc),
                "user": user_map["EMP-0001"],
                "camera": camera_map["Cửa ra chính"],
                "door": door_map["Cửa ra chính"],
                "result": "GRANTED",
                "confidence": 99.1,
                "cosine_score": 0.991,
                "face_distance": 0.10,
                "is_unknown": False,
                "latency_ms": 30,
                "relay_status": "Mở tự động (Relay 02)",
            },
            # 10. Vũ Hải Đăng - Cửa ra chính - GRANTED
            {
                "timestamp": datetime(2026, 9, 20, 9, 40, 18, tzinfo=timezone.utc),
                "user": user_map["EMP-2048"],
                "camera": camera_map["Cửa ra chính"],
                "door": door_map["Cửa ra chính"],
                "result": "GRANTED",
                "confidence": 94.6,
                "cosine_score": 0.946,
                "face_distance": 0.22,
                "is_unknown": False,
                "latency_ms": 39,
                "relay_status": "Mở tự động (Relay 02)",
            },
        ]

        log_num = 2001
        for item in target_logs:
            user = item.get("user")
            camera = item["camera"]
            door = item["door"]

            log = AccessLog(
                log_number=log_num,
                timestamp=item["timestamp"],
                user_id=user.id if user else None,
                employee_id=user.employee_id if user else item.get("employee_id", "--"),
                user_name=user.full_name if user else item.get("user_name", "Người lạ"),
                department=user.department if user else item.get("department", "Không xác định"),
                door_id=door.id,
                door_name=door.name,
                camera_id=camera.id,
                camera_name=camera.name,
                result=item["result"],
                confidence=item["confidence"],
                cosine_score=item["cosine_score"],
                face_distance=item["face_distance"],
                liveness_passed=True,
                liveness_score=98.5 if item["result"] == "GRANTED" else 42.0,
                latency_ms=item["latency_ms"],
                ai_model="Dlib ResNet-34 (512D)",
                relay_status=item["relay_status"],
                is_unknown=item["is_unknown"],
            )
            db.add(log)
            log_num += 1

        db.commit()
        print("  ✓ Đã nạp thành công chính xác 10 bản ghi nhật ký ngày 20/09/2026 vào CSDL:")
        print("    - 7 GRANTED (Trương Văn Long, Nguyễn Văn An, Lê Hoàng Nam, Phạm Quang Huy, Nguyễn Thu Hà, Admin Quản Trị, Vũ Hải Đăng)")
        print("    - 2 DENIED (2 Người lạ tại Sảnh phía Tây và Cửa ra chính)")
        print("    - 1 MANUAL_VERIFY (Trần Minh Đức tại Phòng Server B)")
        print("    - Cửa chính Lobby: đúng 4 bản ghi")
        print("    - Cửa ra chính: đúng 4 bản ghi")
        print("    - Phòng Server B: đúng 1 bản ghi")
        print("    - Sảnh phía Tây: đúng 1 bản ghi")
        print("    - Thang máy VIP & Bãi đỗ xe: 0 bản ghi")
        print("    - Ngày 13/09/2026: 0 bản ghi")
        print("=" * 70)
        print("HOÀN TẤT SEED CSDL THÀNH CÔNG 100%!")
        print("=" * 70)

    except Exception as e:
        db.rollback()
        print(f"LỖI SEED CSDL: {e}")
        raise e
    finally:
        db.close()


if __name__ == "__main__":
    seed_scenario_data()
