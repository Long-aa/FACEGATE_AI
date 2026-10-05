"""
Seed runner for FaceGate AI: updates and syncs database with MOCK_LOGS (Access Logs Test Matrix).
Inserts required Users, Cameras, Doors, and the 15 access log records into PostgreSQL.
"""
import sys
import io
from datetime import datetime, timezone, timedelta
from pathlib import Path

if hasattr(sys.stdout, "buffer"):
    try:
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
    except Exception:
        pass

# Ensure backend root is on sys.path
backend_path = Path(__file__).resolve().parent.parent.parent / "backend"
if str(backend_path) not in sys.path:
    sys.path.insert(0, str(backend_path))

from app.database.session import SessionLocal
from app.models.access_log import AccessLog
from app.models.camera import Camera
from app.models.door import Door
from app.models.user import User, Role
from app.core.security import get_password_hash

TZ_VN = timezone(timedelta(hours=7))

# ------------------------------------------------------------------------------
# 1. USERS TO SYNC
# ------------------------------------------------------------------------------
USERS_DATA = [
    {
        "employee_id": "EMP-2045",
        "full_name": "Nguyễn Văn An",
        "email": "an.nguyen@facegate.ai",
        "department": "Khối KT & R&D",
        "position": "Kỹ sư AI cao cấp",
        "role": "STAFF",
        "status": "ACTIVE",
    },
    {
        "employee_id": "EMP-2042",
        "full_name": "Trần Minh Đức",
        "email": "duc.tran@facegate.ai",
        "department": "Kế toán",
        "position": "Chuyên viên Kế toán",
        "role": "STAFF",
        "status": "ACTIVE",
    },
    {
        "employee_id": "EMP-2105",
        "full_name": "Lê Hoàng Nam",
        "email": "nam.le@facegate.ai",
        "department": "Kinh doanh",
        "position": "Chuyên viên Kinh doanh",
        "role": "STAFF",
        "status": "ACTIVE",
    },
    {
        "employee_id": "EMP-1988",
        "full_name": "Phạm Quang Huy",
        "email": "huy.pham@facegate.ai",
        "department": "Khối Vận hành",
        "position": "Trưởng ca Vận hành",
        "role": "STAFF",
        "status": "ACTIVE",
    },
    {
        "employee_id": "EMP-2197",
        "full_name": "Võ Quốc Bảo",
        "email": "bao.vo@facegate.ai",
        "department": "IT",
        "position": "Chuyên viên Quản trị Mạng",
        "role": "STAFF",
        "status": "ACTIVE",
    },
    {
        "employee_id": "EMP-2210",
        "full_name": "Nguyễn Thu Hà",
        "email": "ha.nguyen@facegate.ai",
        "department": "Nhân sự",
        "position": "Chuyên viên Nhân sự",
        "role": "STAFF",
        "status": "ACTIVE",
    },
]

# ------------------------------------------------------------------------------
# 2. CAMERAS & DOORS TO SYNC
# ------------------------------------------------------------------------------
CAMERAS_DATA = [
    ("CAM-01", "Cửa chính Lobby", "D-001", "Cửa chính Lobby", "entrance"),
    ("CAM-02", "Cửa ra chính", "D-002", "Cửa ra chính", "exit"),
    ("CAM-03", "Phòng Server B", "D-003", "Phòng Server B", "restricted"),
    ("CAM-04", "Sảnh phía Tây", "D-004", "Sảnh phía Tây", "hallway"),
    ("CAM-05", "Phòng Server Kỹ thuật", "D-010", "Phòng Server Kỹ thuật", "restricted"),
    ("CAM-06", "Phòng họp A", "D-006", "Phòng họp A", "internal"),
    ("CAM-07", "Cửa kho Thiết bị R&D", "D-012", "Cửa kho Thiết bị R&D", "restricted"),
    ("CAM-08", "Cửa phân tầng TM", "D-008", "Cửa phân tầng TM", "internal"),
    ("CAM-09", "Phòng Giám đốc", "D-013", "Phòng Giám đốc", "restricted"),
]

# ------------------------------------------------------------------------------
# 3. 15 MOCK ACCESS LOG RECORDS (Ngày 24/10/2023 & 23/10/2023)
# ------------------------------------------------------------------------------
MOCK_LOGS = [
    # Ngày 24/10/2023
    { "id": "1",  "hour": 10, "minute": 42, "second": 15, "date": (2023, 10, 24), "userName": "Nguyễn Văn An",   "userCode": "EMP-2045", "department": "Khối KT & R&D",  "camera": "Cửa chính Lobby",      "action": "Entry", "confidence": 98.5, "result": "Granted",       "unknown": False },
    { "id": "2",  "hour": 10, "minute": 38, "second": 2,  "date": (2023, 10, 24), "userName": "Trần Minh Đức",   "userCode": "EMP-2042", "department": "Kế toán",          "camera": "Phòng Server B",       "action": "Entry", "confidence": 72.1, "result": "Manual Verify", "unknown": False },
    { "id": "3",  "hour": 10, "minute": 15, "second": 45, "date": (2023, 10, 24), "userName": "Người lạ",        "userCode": "Chưa đăng ký", "department": "—",            "camera": "Sảnh phía Tây",        "action": "Entry", "confidence": 15.0, "result": "Denied",        "unknown": True },
    { "id": "4",  "hour": 9,  "minute": 55, "second": 10, "date": (2023, 10, 24), "userName": "Lê Hoàng Nam",    "userCode": "EMP-2105", "department": "Kinh doanh",       "camera": "Cửa ra chính",         "action": "Exit",  "confidence": 99.2, "result": "Granted",       "unknown": False },
    { "id": "5",  "hour": 9,  "minute": 30, "second": 44, "date": (2023, 10, 24), "userName": "Phạm Quang Huy",  "userCode": "EMP-1988", "department": "Khối Vận hành",    "camera": "Cửa chính Lobby",      "action": "Entry", "confidence": 97.8, "result": "Granted",       "unknown": False },
    { "id": "6",  "hour": 9,  "minute": 15, "second": 22, "date": (2023, 10, 24), "userName": "Võ Quốc Bảo",    "userCode": "EMP-2197", "department": "IT",               "camera": "Phòng họp A",          "action": "Entry", "confidence": 88.3, "result": "Granted",       "unknown": False },
    { "id": "7",  "hour": 8,  "minute": 54, "second": 3,  "date": (2023, 10, 24), "userName": "Nguyễn Thu Hà",   "userCode": "EMP-2210", "department": "Nhân sự",          "camera": "Cửa chính Lobby",      "action": "Entry", "confidence": 95.1, "result": "Granted",       "unknown": False },
    { "id": "8",  "hour": 8,  "minute": 33, "second": 18, "date": (2023, 10, 24), "userName": "Người lạ",        "userCode": "Chưa đăng ký", "department": "—",            "camera": "Cửa kho Thiết bị R&D", "action": "Entry", "confidence": 8.2,  "result": "Denied",        "unknown": True },
    { "id": "9",  "hour": 8,  "minute": 11, "second": 55, "date": (2023, 10, 24), "userName": "Trần Minh Đức",   "userCode": "EMP-2042", "department": "Kế toán",          "camera": "Cửa chính Lobby",      "action": "Entry", "confidence": 93.6, "result": "Granted",       "unknown": False },
    { "id": "10", "hour": 7,  "minute": 58, "second": 40, "date": (2023, 10, 24), "userName": "Nguyễn Văn An",   "userCode": "EMP-2045", "department": "Khối KT & R&D",  "camera": "Phòng Server Kỹ thuật", "action": "Entry", "confidence": 99.7, "result": "Granted",       "unknown": False },
    # Ngày 23/10/2023
    { "id": "11", "hour": 17, "minute": 45, "second": 12, "date": (2023, 10, 23), "userName": "Lê Hoàng Nam",    "userCode": "EMP-2105", "department": "Kinh doanh",       "camera": "Cửa chính Lobby",      "action": "Exit",  "confidence": 98.4, "result": "Granted",       "unknown": False },
    { "id": "12", "hour": 17, "minute": 30, "second": 5,  "date": (2023, 10, 23), "userName": "Phạm Quang Huy",  "userCode": "EMP-1988", "department": "Khối Vận hành",    "camera": "Cửa phân tầng TM",     "action": "Exit",  "confidence": 91.2, "result": "Granted",       "unknown": False },
    { "id": "13", "hour": 14, "minute": 22, "second": 16, "date": (2023, 10, 23), "userName": "Nguyễn Thu Hà",   "userCode": "EMP-2210", "department": "Nhân sự",          "camera": "Phòng Giám đốc",       "action": "Entry", "confidence": 0.0,  "result": "Denied",        "unknown": False },
    { "id": "14", "hour": 13, "minute": 10, "second": 44, "date": (2023, 10, 23), "userName": "Nguyễn Văn An",   "userCode": "EMP-2045", "department": "Khối KT & R&D",  "camera": "Cửa chính Lobby",      "action": "Exit",  "confidence": 99.1, "result": "Granted",       "unknown": False },
    { "id": "15", "hour": 11, "minute": 5,  "second": 30, "date": (2023, 10, 23), "userName": "Võ Quốc Bảo",    "userCode": "EMP-2197", "department": "IT",               "camera": "Phòng Server B",       "action": "Entry", "confidence": 67.4, "result": "Manual Verify", "unknown": False },
]


def sync_database():
    db = SessionLocal()
    print("=" * 70)
    print("BẮT ĐẦU CẬP NHẬT DỮ LIỆU CSDL (DATABASE / SEEDS)")
    print("=" * 70)

    try:
        # 1. Sync Doors & Cameras
        print("\n1. Đang đồng bộ hóa Thiết bị Cửa & Camera...")
        doors_dict = {}
        cameras_dict = {}

        for cam_code, cam_name, door_code, door_name, dtype in CAMERAS_DATA:
            door = db.query(Door).filter((Door.name == door_name) | (Door.door_code == door_code)).first()
            if not door:
                door = Door(
                    door_code=door_code,
                    name=door_name,
                    door_type=dtype,
                    location="Trụ sở chính",
                    lock_status="Locked",
                    unlock_duration=10,
                )
                db.add(door)
                db.flush()
                print(f"  + Tạo cửa mới: {door.name} ({door.door_code})")
            doors_dict[door_name] = door

            camera = db.query(Camera).filter((Camera.name == cam_name) | (Camera.camera_code == cam_code)).first()
            if not camera:
                camera = Camera(
                    camera_code=cam_code,
                    name=cam_name,
                    rtsp_url=f"rtsp://edge.facegate.internal:8554/{cam_code.lower()}",
                    location="Trụ sở chính",
                    status="ONLINE",
                    door_id=door.id,
                )
                db.add(camera)
                db.flush()
                print(f"  + Tạo camera mới: {camera.name} ({camera.camera_code})")
            cameras_dict[cam_name] = camera

        # 2. Sync Users
        print("\n2. Đang đồng bộ hóa Danh mục Nhân sự...")
        users_dict = {}
        for u_data in USERS_DATA:
            u = db.query(User).filter(User.employee_id == u_data["employee_id"]).first()
            if not u:
                u = User(
                    employee_id=u_data["employee_id"],
                    full_name=u_data["full_name"],
                    email=u_data["email"],
                    department=u_data["department"],
                    position=u_data["position"],
                    role=u_data["role"],
                    status=u_data["status"],
                    hashed_password=get_password_hash("Password@123"),
                )
                db.add(u)
                db.flush()
                print(f"  + Tạo nhân sự mới: {u.employee_id} - {u.full_name} ({u.department})")
            users_dict[u_data["employee_id"]] = u

        # 3. Sync Access Logs
        print("\n3. Đang đồng bộ hóa 15 bản ghi Access Logs (Test Matrix)...")
        inserted_count = 0
        updated_count = 0

        for item in MOCK_LOGS:
            y, m, d = item["date"]
            ts = datetime(y, m, d, item["hour"], item["minute"], item["second"], tzinfo=TZ_VN)

            u = users_dict.get(item["userCode"])
            cam = cameras_dict.get(item["camera"])
            door = doors_dict.get(item["camera"]) or (cam.door if cam else None)

            # Check if this exact log already exists (by user, camera, and timestamp)
            existing = db.query(AccessLog).filter(
                AccessLog.timestamp == ts,
                AccessLog.camera_name == item["camera"],
            ).first()

            res_val = item["result"]
            relay = "SUCCESS" if res_val.upper() in ("GRANTED",) else "BLOCKED"
            conf = float(item["confidence"])
            is_unk = item.get("unknown", False)

            if not existing:
                log = AccessLog(
                    timestamp=ts,
                    user_id=u.id if u else None,
                    employee_id=item["userCode"] if not is_unk else None,
                    user_name=item["userName"],
                    department=item["department"],
                    door_id=door.id if door else None,
                    door_name=door.name if door else item["camera"],
                    camera_id=cam.id if cam else None,
                    camera_name=item["camera"],
                    result=res_val,
                    confidence=conf,
                    cosine_score=round(conf / 100.0, 3) if conf > 0 else 0.0,
                    face_distance=round(max(0.0, 1.0 - (conf / 100.0)), 2),
                    liveness_passed=not is_unk,
                    liveness_score=0.98 if not is_unk else 0.45,
                    latency_ms=32,
                    ai_model="Dlib ResNet-34 (512D)",
                    is_unknown=is_unk,
                    relay_status=relay,
                    notes=f"Action: {item['action']}",
                )
                db.add(log)
                inserted_count += 1
            else:
                existing.user_name = item["userName"]
                existing.employee_id = item["userCode"] if not is_unk else None
                existing.department = item["department"]
                existing.result = res_val
                existing.confidence = conf
                existing.is_unknown = is_unk
                existing.notes = f"Action: {item['action']}"
                updated_count += 1

        db.commit()
        print(f"  ✓ Đã nạp thành công: {inserted_count} bản ghi mới, {updated_count} bản ghi đã được cập nhật!")
        print(f"  ✓ Tổng số bản ghi Access Logs trong CSDL hiện tại: {db.query(AccessLog).count()}")

        print("\n" + "=" * 70)
        print("HOÀN TẤT ĐỒNG BỘ CSDL THÀNH CÔNG 100%!")
        print("=" * 70)

    except Exception as e:
        db.rollback()
        print(f"Lỗi khi đồng bộ CSDL: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    sync_database()
