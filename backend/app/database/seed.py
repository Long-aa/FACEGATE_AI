"""
Seed initial realistic data for FaceGate AI.
Matches frontend UI specifications and functional workflows.
"""
import sys
from datetime import datetime, timedelta
from pathlib import Path
import random

# Ensure backend root is on sys.path
backend_path = Path(__file__).resolve().parent.parent.parent
if str(backend_path) not in sys.path:
    sys.path.insert(0, str(backend_path))

from app.database.session import SessionLocal
from app.models.access_log import AccessLog
from app.models.access_rule import AccessRule
from app.models.alert import Alert
from app.models.camera import Camera
from app.models.door import Door
from app.models.face import FaceProfile
from app.models.notification import Notification
from app.models.setting import SystemSetting
from app.models.user import Role, User
from app.core.security import get_password_hash


def generate_mock_vector(dim: int = 128) -> list:
    """Generate normalized mock face embedding vector."""
    vec = [random.uniform(-1.0, 1.0) for _ in range(dim)]
    norm = sum(x**2 for x in vec) ** 0.5
    return [round(x / norm, 6) for x in vec] if norm > 0 else vec


def seed_data():
    db = SessionLocal()
    print("Starting database seeding...")

    try:
        # ── 1. Roles ──────────────────────────────────────────────
        roles_data = [
            {
                "code": "ADMIN",
                "name": "Quản trị viên tối cao",
                "description": "Toàn quyền quản trị hệ thống FaceGate AI",
                "permissions": ["*"],
            },
            {
                "code": "OPERATOR",
                "name": "Vận hành hệ thống",
                "description": "Giám sát camera, điều khiển cửa và xử lý cảnh báo",
                "permissions": [
                    "users:read",
                    "doors:control",
                    "cameras:view",
                    "alerts:manage",
                    "access_logs:read",
                ],
            },
            {
                "code": "SECURITY",
                "name": "Nhân viên an ninh",
                "description": "Trực phòng bảo vệ, theo dõi nhật ký và sự cố ra vào",
                "permissions": [
                    "doors:view",
                    "cameras:view",
                    "alerts:read",
                    "access_logs:read",
                ],
            },
            {
                "code": "STAFF",
                "name": "Nhân viên tiêu chuẩn",
                "description": "Nhân viên văn phòng đăng ký ra vào cửa",
                "permissions": ["profile:read"],
            },
        ]

        roles_dict = {}
        for r_info in roles_data:
            role = db.query(Role).filter(Role.code == r_info["code"]).first()
            if not role:
                role = Role(
                    code=r_info["code"],
                    name=r_info["name"],
                    description=r_info["description"],
                    permissions=r_info["permissions"],
                )
                db.add(role)
                db.flush()
            roles_dict[r_info["code"]] = role

        print(f"Roles seeded: {len(roles_dict)}")

        # ── 2. Users / Employees ──────────────────────────────────
        admin_hashed_pw = get_password_hash("Admin@123")
        staff_hashed_pw = get_password_hash("Password@123")

        users_data = [
            {
                "employee_id": "EMP-0001",
                "full_name": "Admin Quản Trị",
                "email": "admin@facegate.ai",
                "phone": "0900 000 001",
                "department": "Ban Giám Đốc & IT",
                "position": "Giám đốc CNTT / SysAdmin",
                "role": "ADMIN",
                "status": "ACTIVE",
                "is_superuser": True,
                "hashed_password": admin_hashed_pw,
            },
            {
                "employee_id": "EMP-2045",
                "full_name": "Nguyễn Văn An",
                "email": "an.nguyen@aiaccess.corp",
                "phone": "0988 234 567",
                "department": "Khối Kỹ thuật & R&D",
                "position": "Kỹ sư AI / Lập trình viên cao cấp",
                "role": "STAFF",
                "status": "ACTIVE",
                "card_number": "CARD-9921",
                "hashed_password": staff_hashed_pw,
            },
            {
                "employee_id": "EMP-2042",
                "full_name": "Trần Minh Đức",
                "email": "duc.tran@aiaccess.corp",
                "phone": "0912 345 678",
                "department": "Kế toán",
                "position": "Chuyên viên Kế toán",
                "role": "STAFF",
                "status": "WAITING",
                "card_number": "CARD-8812",
                "hashed_password": staff_hashed_pw,
            },
            {
                "employee_id": "EMP-2105",
                "full_name": "Lê Hoàng Nam",
                "email": "nam.le@aiaccess.corp",
                "phone": "0977 456 789",
                "department": "Kinh doanh",
                "position": "Trưởng nhóm Sales",
                "role": "STAFF",
                "status": "ACTIVE",
                "card_number": "CARD-7733",
                "hashed_password": staff_hashed_pw,
            },
            {
                "employee_id": "EMP-1988",
                "full_name": "Phạm Quang Huy",
                "email": "huy.pham@aiaccess.corp",
                "phone": "0966 567 890",
                "department": "Khối Vận hành",
                "position": "Kỹ thuật viên Vận hành",
                "role": "STAFF",
                "status": "ACTIVE",
                "card_number": "CARD-6644",
                "hashed_password": staff_hashed_pw,
            },
            {
                "employee_id": "EMP-2210",
                "full_name": "Nguyễn Thu Hà",
                "email": "ha.nguyen@aiaccess.corp",
                "phone": "0955 678 901",
                "department": "Nhân sự",
                "position": "Chuyên viên tuyển dụng",
                "role": "STAFF",
                "status": "DRAFT",
                "card_number": "CARD-5511",
                "hashed_password": staff_hashed_pw,
            },
        ]

        users_dict = {}
        for u_info in users_data:
            user = db.query(User).filter(User.employee_id == u_info["employee_id"]).first()
            if not user:
                user = User(
                    employee_id=u_info["employee_id"],
                    full_name=u_info["full_name"],
                    email=u_info["email"],
                    phone=u_info["phone"],
                    department=u_info["department"],
                    position=u_info["position"],
                    role=u_info["role"],
                    status=u_info["status"],
                    is_superuser=u_info.get("is_superuser", False),
                    card_number=u_info.get("card_number"),
                    hashed_password=u_info["hashed_password"],
                )
                user.roles.append(roles_dict[u_info["role"]])
                db.add(user)
                db.flush()
            else:
                if not user.hashed_password:
                    user.hashed_password = u_info["hashed_password"]
                    db.flush()
            users_dict[u_info["employee_id"]] = user

        print(f"Users seeded/verified: {len(users_dict)}")

        # ── 3. Face Profiles ──────────────────────────────────────
        enrolled_employees = ["EMP-0001", "EMP-2045", "EMP-2105", "EMP-1988"]
        for emp_id in enrolled_employees:
            user = users_dict.get(emp_id)
            if user:
                face = db.query(FaceProfile).filter(FaceProfile.employee_id == emp_id).first()
                if not face:
                    vec = generate_mock_vector(128)
                    face = FaceProfile(
                        user_id=user.id,
                        employee_id=emp_id,
                        status="ACTIVE",
                        quality_score=0.98,
                        samples_count=3,
                        master_photo_url=f"/photos/{emp_id.lower()}_master.jpg",
                        registered_at=datetime.utcnow() - timedelta(days=30),
                        registered_by="EMP-0001",
                        notes="Đăng ký nhận diện hoàn tất tại phòng HR",
                    )
                    face.set_encoding_vector(vec)
                    db.add(face)

        print(f"Face profiles seeded for active employees.")

        # ── 4. Doors ──────────────────────────────────────────────
        doors_data = [
            {
                "door_code": "D-001",
                "name": "Cửa chính Lobby",
                "location": "Tầng 1 - Sảnh chính",
                "door_type": "entrance",
                "status": "Online",
                "lock_status": "Unlocked",
                "relay_pin": 18,
                "unlock_duration": 5,
                "last_user_name": "Nguyễn Văn An",
            },
            {
                "door_code": "D-002",
                "name": "Phòng Server Kỹ thuật",
                "location": "Tầng hầm B1 - Khu kỹ thuật",
                "door_type": "server",
                "status": "Online",
                "lock_status": "Locked",
                "relay_pin": 19,
                "unlock_duration": 4,
                "last_user_name": "Admin Quản Trị",
            },
            {
                "door_code": "D-003",
                "name": "Phòng họp A",
                "location": "Tầng 3 - Khu văn phòng",
                "door_type": "office",
                "status": "Online",
                "lock_status": "Unlocked",
                "relay_pin": 21,
                "unlock_duration": 5,
                "last_user_name": "Lê Hoàng Nam",
            },
            {
                "door_code": "D-004",
                "name": "Lối thoát hiểm",
                "location": "Tầng trệt - Cửa sau",
                "door_type": "emergency",
                "status": "Offline",
                "lock_status": "Locked",
                "relay_pin": 22,
                "unlock_duration": 10,
                "last_user_name": "System",
            },
        ]

        doors_dict = {}
        for d_info in doors_data:
            door = db.query(Door).filter(Door.door_code == d_info["door_code"]).first()
            if not door:
                door = Door(
                    door_code=d_info["door_code"],
                    name=d_info["name"],
                    location=d_info["location"],
                    door_type=d_info["door_type"],
                    status=d_info["status"],
                    lock_status=d_info["lock_status"],
                    relay_pin=d_info["relay_pin"],
                    unlock_duration=d_info["unlock_duration"],
                    last_activity=datetime.utcnow() - timedelta(minutes=random.randint(2, 120)),
                    last_user_name=d_info["last_user_name"],
                )
                db.add(door)
                db.flush()
            doors_dict[d_info["door_code"]] = door

        print(f"Doors seeded: {len(doors_dict)}")

        # ── 5. Cameras ────────────────────────────────────────────
        cameras_data = [
            {
                "camera_code": "CAM-01",
                "name": "Cửa chính - Cam 01",
                "location": "Sảnh chính Tầng 1",
                "camera_type": "entrance",
                "status": "Online",
                "fps": 30,
                "latency": 12,
                "resolution": "1920×1080",
                "res_label": "1080p",
                "door_code": "D-001",
                "rtsp_url": "rtsp://admin:pass@192.168.1.101:554/stream1",
            },
            {
                "camera_code": "CAM-02",
                "name": "Hầm B1",
                "location": "Tầng hầm đỗ xe B1",
                "camera_type": "parking",
                "status": "Online",
                "fps": 24,
                "latency": 45,
                "resolution": "1280×720",
                "res_label": "720p",
                "door_code": None,
                "rtsp_url": "rtsp://admin:pass@192.168.1.102:554/stream1",
            },
            {
                "camera_code": "CAM-03",
                "name": "Phòng Server",
                "location": "Phòng Server Kỹ thuật",
                "camera_type": "server",
                "status": "Offline",
                "fps": 0,
                "latency": 0,
                "resolution": "Unknown",
                "res_label": "--",
                "door_code": "D-002",
                "rtsp_url": "rtsp://admin:pass@192.168.1.103:554/stream1",
            },
            {
                "camera_code": "CAM-04",
                "name": "Lối vào phụ",
                "location": "Cửa cánh Đông Tầng 1",
                "camera_type": "entrance",
                "status": "Online",
                "fps": 30,
                "latency": 18,
                "resolution": "1920×1080",
                "res_label": "1080p",
                "door_code": "D-001",
                "rtsp_url": "rtsp://admin:pass@192.168.1.104:554/stream1",
            },
            {
                "camera_code": "CAM-05",
                "name": "Bãi đỗ xe",
                "location": "Bãi đỗ xe ngoài trời",
                "camera_type": "parking",
                "status": "Online",
                "fps": 15,
                "latency": 60,
                "resolution": "1280×720",
                "res_label": "720p",
                "door_code": None,
                "rtsp_url": "rtsp://admin:pass@192.168.1.105:554/stream1",
            },
            {
                "camera_code": "CAM-06",
                "name": "Phòng họp B",
                "location": "Tầng 3 - Cụm phòng họp",
                "camera_type": "server",
                "status": "Offline",
                "fps": 0,
                "latency": 0,
                "resolution": "Unknown",
                "res_label": "--",
                "door_code": "D-003",
                "rtsp_url": "rtsp://admin:pass@192.168.1.106:554/stream1",
            },
        ]

        cameras_dict = {}
        for c_info in cameras_data:
            cam = db.query(Camera).filter(Camera.camera_code == c_info["camera_code"]).first()
            door_id = doors_dict[c_info["door_code"]].id if c_info.get("door_code") in doors_dict else None
            if not cam:
                cam = Camera(
                    camera_code=c_info["camera_code"],
                    name=c_info["name"],
                    location=c_info["location"],
                    camera_type=c_info["camera_type"],
                    status=c_info["status"],
                    fps=c_info["fps"],
                    latency=c_info["latency"],
                    resolution=c_info["resolution"],
                    res_label=c_info["res_label"],
                    door_id=door_id,
                    rtsp_url=c_info["rtsp_url"],
                )
                db.add(cam)
                db.flush()
            cameras_dict[c_info["camera_code"]] = cam

        print(f"Cameras seeded: {len(cameras_dict)}")

        # ── 6. Access Rules ───────────────────────────────────────
        rules_data = [
            {
                "name": "Toàn thể nhân viên — Cửa chính",
                "description": "Nhân viên chính thức được phép ra vào sảnh chính các ngày làm việc",
                "door_id": doors_dict["D-001"].id,
                "department": None,
                "user_id": None,
                "start_time": "06:30:00",
                "end_time": "21:00:00",
                "allowed_days": [1, 2, 3, 4, 5, 6],
            },
            {
                "name": "Kỹ thuật R&D — Phòng Server 24/7",
                "description": "Thành viên Khối Kỹ thuật có quyền truy cập phòng máy chủ mọi lúc",
                "door_id": doors_dict["D-002"].id,
                "department": "Khối Kỹ thuật & R&D",
                "user_id": None,
                "start_time": "00:00:00",
                "end_time": "23:59:59",
                "allowed_days": [1, 2, 3, 4, 5, 6, 7],
            },
            {
                "name": "Admin IT — Toàn quyền truy cập mọi khu vực",
                "description": "Admin quản trị có quyền mở mọi cửa 24/7",
                "door_id": doors_dict["D-002"].id,
                "department": None,
                "user_id": users_dict["EMP-0001"].id,
                "start_time": "00:00:00",
                "end_time": "23:59:59",
                "allowed_days": [1, 2, 3, 4, 5, 6, 7],
            },
        ]

        for r_info in rules_data:
            rule = db.query(AccessRule).filter(AccessRule.name == r_info["name"]).first()
            if not rule:
                rule = AccessRule(
                    name=r_info["name"],
                    description=r_info["description"],
                    door_id=r_info["door_id"],
                    department=r_info["department"],
                    user_id=r_info["user_id"],
                    start_time=r_info["start_time"],
                    end_time=r_info["end_time"],
                    allowed_days=r_info["allowed_days"],
                    is_active=True,
                )
                db.add(rule)

        print("Access rules seeded.")

        # ── 7. Access Logs (Expanded to 45 realistic logs) ────────
        existing_logs = db.query(AccessLog).count()
        if existing_logs < 20:
            now = datetime.utcnow()
            active_users = [users_dict["EMP-2045"], users_dict["EMP-2105"], users_dict["EMP-1988"], users_dict["EMP-0001"]]
            cams = [cameras_dict["CAM-01"], cameras_dict["CAM-02"], cameras_dict["CAM-04"]]
            doors = [doors_dict["D-001"], doors_dict["D-002"], doors_dict["D-003"]]

            # Today logs
            sample_logs = [
                (now - timedelta(minutes=15), users_dict["EMP-2045"], doors_dict["D-001"], cameras_dict["CAM-01"], "GRANTED", 96.8, 0.968, 0.25, True, 42, False, None),
                (now - timedelta(minutes=45), users_dict["EMP-2105"], doors_dict["D-001"], cameras_dict["CAM-01"], "GRANTED", 98.4, 0.984, 0.18, True, 38, False, None),
                (now - timedelta(hours=1, minutes=10), None, doors_dict["D-001"], cameras_dict["CAM-04"], "UNKNOWN", 35.2, 0.352, 0.85, True, 50, True, "Khuôn mặt người lạ"),
                (now - timedelta(hours=1, minutes=45), users_dict["EMP-1988"], doors_dict["D-002"], cameras_dict["CAM-01"], "GRANTED", 97.1, 0.971, 0.22, True, 45, False, None),
                (now - timedelta(hours=2, minutes=20), users_dict["EMP-2042"], doors_dict["D-002"], cameras_dict["CAM-04"], "DENIED", 62.0, 0.620, 0.61, True, 46, False, "Không đủ thẩm quyền"),
                (now - timedelta(hours=3), users_dict["EMP-0001"], doors_dict["D-001"], cameras_dict["CAM-01"], "GRANTED", 99.2, 0.992, 0.12, True, 35, False, None),
                (now - timedelta(hours=3, minutes=35), users_dict["EMP-2045"], doors_dict["D-003"], cameras_dict["CAM-04"], "GRANTED", 95.5, 0.955, 0.28, True, 40, False, None),
                (now - timedelta(hours=4, minutes=15), None, doors_dict["D-001"], cameras_dict["CAM-01"], "UNKNOWN", 41.3, 0.413, 0.79, False, 52, True, "Chưa xác định danh tính"),
                (now - timedelta(hours=5), users_dict["EMP-2105"], doors_dict["D-001"], cameras_dict["CAM-04"], "GRANTED", 96.1, 0.961, 0.24, True, 39, False, None),
                (now - timedelta(hours=5, minutes=40), users_dict["EMP-1988"], doors_dict["D-001"], cameras_dict["CAM-01"], "GRANTED", 98.0, 0.980, 0.19, True, 36, False, None),
            ]

            # Logs for past 5 days (hourly distribution for charts)
            base_log_num = 1200
            for day_offset in range(1, 6):
                for hour in [8, 9, 10, 11, 12, 14, 15, 16, 17]:
                    log_time = (now - timedelta(days=day_offset)).replace(hour=hour, minute=random.randint(5, 55))
                    u = random.choice(active_users + [None])
                    d = random.choice(doors)
                    c = random.choice(cams)
                    if u is None:
                        res = "UNKNOWN"
                        conf = round(random.uniform(30.0, 48.0), 1)
                        is_unk = True
                        note = "Người không xác định"
                    elif u.status == "WAITING":
                        res = "DENIED"
                        conf = round(random.uniform(55.0, 68.0), 1)
                        is_unk = False
                        note = "Chưa nạp khuôn mặt"
                    else:
                        res = "GRANTED" if random.random() > 0.1 else "DENIED"
                        conf = round(random.uniform(92.0, 99.5), 1) if res == "GRANTED" else round(random.uniform(60.0, 75.0), 1)
                        is_unk = False
                        note = None

                    base_log_num += 1
                    sample_logs.append((
                        log_time, u, d, c, res, conf,
                        round(conf / 100, 3), round(1.0 - (conf / 100), 2),
                        True, random.randint(32, 55), is_unk, note
                    ))

            for idx, (t, u, d, c, res, conf, cos_s, f_dist, liv, lat, unk, note) in enumerate(sample_logs):
                log = AccessLog(
                    log_number=1300 + idx,
                    timestamp=t,
                    user_id=u.id if u else None,
                    employee_id=u.employee_id if u else None,
                    user_name=u.full_name if u else "Người lạ (Unknown)",
                    department=u.department if u else "Khách vãng lai",
                    card_type=u.card_number if u else None,
                    door_id=d.id if d else None,
                    door_name=d.name if d else None,
                    camera_id=c.id if c else None,
                    camera_name=c.name if c else None,
                    result=res,
                    confidence=conf,
                    cosine_score=cos_s,
                    face_distance=f_dist,
                    liveness_passed=liv,
                    liveness_score=0.98 if liv else 0.5,
                    latency_ms=lat,
                    ai_model="ArcFace r100 v1",
                    is_unknown=unk,
                    notes=note,
                    relay_status="SUCCESS" if res == "GRANTED" else "BLOCKED",
                )
                db.add(log)

            print(f"Access logs seeded ({len(sample_logs)} total).")

        # ── 8. Alerts (8-10 realistic alerts) ────────────────────
        existing_alerts = db.query(Alert).count()
        if existing_alerts < 6:
            now = datetime.utcnow()
            alerts_data = [
                {
                    "alert_type": "Người không xác định",
                    "description": "Phát hiện người lạ đứng trước cửa chính không có trong hệ thống",
                    "location": "Main Entrance",
                    "camera_name": "CAM-01",
                    "door_name": "Cửa chính Lobby",
                    "severity": "CRITICAL",
                    "status": "UNRESOLVED",
                    "timestamp": now - timedelta(minutes=18),
                },
                {
                    "alert_type": "Độ tin cậy thấp",
                    "description": "Độ tương đồng khuôn mặt 62% (Ngưỡng yêu cầu: 85%)",
                    "location": "Server Room Hall",
                    "camera_name": "CAM-03",
                    "door_name": "Phòng Server",
                    "severity": "WARNING",
                    "status": "INVESTIGATING",
                    "timestamp": now - timedelta(minutes=45),
                },
                {
                    "alert_type": "Camera Offline",
                    "description": "Mất kết nối luồng RTSP tới Camera Phòng Server",
                    "location": "Server Room",
                    "camera_name": "CAM-03",
                    "door_name": "Phòng Server",
                    "severity": "WARNING",
                    "status": "UNRESOLVED",
                    "timestamp": now - timedelta(hours=1, minutes=20),
                },
                {
                    "alert_type": "Người không xác định",
                    "description": "Phát hiện đối tượng chưa đăng ký tại Lối vào phụ",
                    "location": "Cửa cánh Đông",
                    "camera_name": "CAM-04",
                    "door_name": "Cửa chính Lobby",
                    "severity": "CRITICAL",
                    "status": "UNRESOLVED",
                    "timestamp": now - timedelta(hours=2),
                },
                {
                    "alert_type": "Cửa bị mở bất thường",
                    "description": "Cửa phòng Server mở quá thời gian quy định (> 60 giây)",
                    "location": "Server Room",
                    "camera_name": "CAM-03",
                    "door_name": "Phòng Server",
                    "severity": "INFO",
                    "status": "RESOLVED",
                    "timestamp": now - timedelta(hours=3),
                },
                {
                    "alert_type": "Truy cập bị từ chối liên tiếp",
                    "description": "Nhân viên EMP-2042 cố gắng quẹt thẻ/nhận diện 3 lần không thành công",
                    "location": "Phòng Server",
                    "camera_name": "CAM-03",
                    "door_name": "Phòng Server",
                    "severity": "WARNING",
                    "status": "RESOLVED",
                    "timestamp": now - timedelta(hours=4),
                },
                {
                    "alert_type": "Camera Offline",
                    "description": "Camera Phòng họp B ngắt kết nối định kỳ bảo trì",
                    "location": "Phòng họp B",
                    "camera_name": "CAM-06",
                    "door_name": "Phòng họp A",
                    "severity": "INFO",
                    "status": "RESOLVED",
                    "timestamp": now - timedelta(hours=6),
                },
            ]

            for a_info in alerts_data:
                alert = Alert(
                    alert_type=a_info["alert_type"],
                    description=a_info["description"],
                    location=a_info["location"],
                    camera_name=a_info["camera_name"],
                    door_name=a_info["door_name"],
                    severity=a_info["severity"],
                    status=a_info["status"],
                    timestamp=a_info["timestamp"],
                )
                db.add(alert)

            print(f"Alerts seeded ({len(alerts_data)} alerts).")

        # ── 9. System Settings ────────────────────────────────────
        settings_defaults = [
            ("recognition_threshold", {"value": 0.85, "min": 0.40, "max": 0.99, "step": 0.01}, "Ngưỡng tin cậy nhận diện khuôn mặt", "recognition"),
            ("liveness_detection", {"enabled": True, "threshold": 0.80}, "Chống giả mạo ảnh/video 2D Liveness Detection", "security"),
            ("anti_spoofing_threshold", {"value": 0.85}, "Ngưỡng phát hiện giả mạo Anti-Spoofing", "security"),
            ("door_unlock_duration", {"seconds": 5}, "Thời gian mở khóa relay khi nhận diện thành công (giây)", "device"),
            ("auto_lock_delay", {"seconds": 3}, "Độ trễ tự động khóa lại sau khi cửa đóng", "device"),
            ("multi_face_mode", {"mode": "largest_face", "options": ["largest_face", "closest_face", "reject_multi"]}, "Chế độ xử lý nhiều khuôn mặt trong 1 khung hình", "recognition"),
            ("save_failed_photos", {"enabled": True}, "Lưu ảnh chụp các trường hợp nhận diện thất bại để đối soát", "security"),
            ("camera_fps", {"fps": 30}, "Tốc độ xử lý khung hình camera mặc định", "device"),
            ("alert_unknown_faces", {"enabled": True}, "Phát cảnh báo khi phát hiện người lạ", "notification"),
            ("alert_low_confidence", {"enabled": True}, "Cảnh báo khi độ tin cậy thấp dưới ngưỡng", "notification"),
            ("alert_camera_offline", {"enabled": True}, "Cảnh báo ngay khi camera mất tín hiệu", "notification"),
            ("alert_held_door", {"enabled": True}, "Cảnh báo khi cửa bị giữ mở quá 30 giây", "notification"),
            ("webhook_url", {"url": "https://api.facegate.internal/hooks/events"}, "Webhook gửi sự kiện bảo mật", "notification"),
            ("telegram_alerts", {"enabled": False, "bot_token": "", "chat_id": ""}, "Thông báo cảnh báo qua Telegram Bot", "notification"),
        ]

        for key, val, desc, cat in settings_defaults:
            setting = db.query(SystemSetting).filter(SystemSetting.key == key).first()
            if not setting:
                setting = SystemSetting(
                    key=key,
                    value=val,
                    description=desc,
                    category=cat,
                )
                db.add(setting)

        print("System settings seeded.")

        # ── 10. Notifications ─────────────────────────────────────
        existing_notifs = db.query(Notification).count()
        if existing_notifs == 0:
            notifs = [
                Notification(
                    title="Khởi tạo hệ thống thành công",
                    message="Hệ thống FaceGate AI đã kết nối thành công tới máy chủ PostgreSQL (port 8000).",
                    type="success",
                    user_id=users_dict["EMP-0001"].id,
                ),
                Notification(
                    title="Camera Offline",
                    message="Camera CAM-03 tại Phòng Server bị mất tín hiệu kết nối.",
                    type="warning",
                    user_id=users_dict["EMP-0001"].id,
                ),
            ]
            db.add_all(notifs)
            print("Notifications seeded.")

        # Commit all changes
        db.commit()
        print("Database seeding completed successfully!")

    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_data()
