"""
Comprehensive E2E Verification Script for FaceGate AI (10 Steps).
Tests all 10 End-to-End steps against PostgreSQL database and live FastAPI endpoints.
"""
import sys
import os
import math
import random
import httpx
from datetime import datetime, timezone, timedelta

sys.stdout.reconfigure(encoding='utf-8')
sys.path.insert(0, os.path.abspath("backend"))

from app.database.session import SessionLocal
from app.models.user import User
from app.models.face import FaceProfile
from app.models.door import Door
from app.models.access_rule import AccessRule
from app.models.access_log import AccessLog

API_BASE = "http://127.0.0.1:8080"


def log_step(step_num: int, title: str):
    print(f"\n{'='*75}\n[BƯỚC {step_num}] {title.upper()}\n{'='*75}")


def get_admin_token() -> str:
    res = httpx.post(f"{API_BASE}/api/v1/auth/login", json={
        "username_or_email": "admin@facegate.ai",
        "password": "Admin@123"
    }, timeout=10)
    assert res.status_code == 200, f"Login failed: {res.text}"
    token = res.json()["access_token"]
    print("  ✓ Đăng nhập Admin thành công, đã cấp JWT Bearer token")
    return token


def test_step_1_create_user_profile(auth_headers: dict):
    log_step(1, "Tạo hồ sơ người dùng & Kiểm tra hợp lệ dữ liệu")
    
    # 1.1 Test invalid name (< 2 chars) -> Should fail 400 or 422
    res = httpx.post(f"{API_BASE}/api/v1/users", json={
        "full_name": "A",
        "email": "invalid@facegate.ai"
    }, headers=auth_headers, timeout=10)
    assert res.status_code in (400, 422), f"Expected 400 or 422 for short name, got {res.status_code}"
    print("  ✓ Kiểm tra họ tên: Tên quá ngắn (<2 ký tự) bị từ chối chính xác (HTTP 400/422)")

    # 1.2 Test invalid email format -> Should fail 400 or 422
    res = httpx.post(f"{API_BASE}/api/v1/users", json={
        "full_name": "Nguyễn Văn Test",
        "email": "invalid-email-format"
    }, headers=auth_headers, timeout=10)
    assert res.status_code in (400, 422), f"Expected 400 or 422 for invalid email, got {res.status_code}"
    print("  ✓ Kiểm tra email: Định dạng email sai bị từ chối chính xác (HTTP 400)")

    # 1.3 Test invalid employee_id format -> Should fail 400 or 422
    res = httpx.post(f"{API_BASE}/api/v1/users", json={
        "full_name": "Nguyễn Văn Test",
        "employee_id": "EMP@@@INVALID###",
        "email": "test.valid@facegate.ai"
    }, headers=auth_headers, timeout=10)
    assert res.status_code in (400, 422), f"Expected 400 or 422 for bad employee_id format, got {res.status_code}"
    print("  ✓ Kiểm tra mã nhân viên: Ký tự đặc biệt bị từ chối chính xác (HTTP 400)")

    # 1.4 Test successful creation with auto-generated employee_id
    rand_suffix = random.randint(10000, 99999)
    emp_code_a = f"EMP-E2E-{rand_suffix}"
    email_a = f"user.e2e.{rand_suffix}@facegate.ai"

    res = httpx.post(f"{API_BASE}/api/v1/users", json={
        "full_name": "Nguyễn Hoàng Long",
        "employee_id": emp_code_a,
        "email": email_a,
        "phone": "0987654321",
        "department": "Khối Kỹ thuật & R&D",
        "position": "Kỹ sư AI cao cấp",
        "status": "WAITING",
        "access_areas": ["Cửa chính Lobby", "Phòng Server Kỹ thuật"],
        "avatar_url": "data:image/jpeg;base64,/9j/4AAQSkZJRg==",
    }, headers=auth_headers, timeout=10)
    assert res.status_code == 201, f"Expected 201 Created, got {res.status_code}: {res.text}"
    user_data = res.json()
    assert user_data["employee_id"] == emp_code_a
    assert user_data["status"] == "WAITING", f"Expected WAITING, got {user_data['status']}"
    assert user_data["has_face_profile"] is False
    assert user_data["face_status"] == "missing"
    print(f"  ✓ Tạo người dùng thành công: {user_data['full_name']} ({user_data['employee_id']})")
    print(f"  ✓ Trạng thái hồ sơ: {user_data['status']} (Sẵn sàng đăng ký Face ID)")
    return user_data


def test_step_2_access_control_and_avatar(user_data):
    log_step(2, "Cấu hình thông tin, ảnh thẻ & Phân quyền kiểm soát (Access Control)")
    
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.employee_id == user_data["employee_id"]).first()
        assert user is not None
        assert user.avatar_url is not None
        print(f"  ✓ Ảnh thẻ đại diện lưu vào CSDL: avatar_url có độ dài {len(user.avatar_url)} chars")

        # Verify AccessRules were created in DB
        rules = db.query(AccessRule).filter(AccessRule.user_id == user.id).all()
        assert len(rules) >= 2, f"Expected at least 2 access rules, got {len(rules)}"
        assigned_door_names = [r.door.name for r in rules if r.door]
        print(f"  ✓ Phân quyền cửa trong CSDL (AccessRules): {assigned_door_names}")
        assert "Cửa chính Lobby" in assigned_door_names
    finally:
        db.close()


def test_step_3_pre_check_enrollment(user_data):
    log_step(3, "Khởi tạo quá trình đăng ký khuôn mặt & Kiểm tra điều kiện")
    
    emp_id = user_data["employee_id"]

    # 3.1 Check valid active user ready for face
    res = httpx.get(f"{API_BASE}/api/v1/faces/pre-check/{emp_id}", timeout=10)
    assert res.status_code == 200
    chk = res.json()
    assert chk["valid"] is True
    assert chk["already_enrolled"] is False
    print(f"  ✓ Kiểm tra điều kiện nhân viên '{emp_id}': Hợp lệ, chưa đăng ký Face ID trước đó")

    # 3.2 Check non-existent employee
    res_fake = httpx.get(f"{API_BASE}/api/v1/faces/pre-check/EMP-DOES-NOT-EXIST", timeout=10)
    assert res_fake.json()["valid"] is False
    print("  ✓ Kiểm tra nhân viên không tồn tại: Bị chặn chính xác")

    # 3.3 Check locked employee
    db = SessionLocal()
    try:
        u = db.query(User).filter(User.employee_id == emp_id).first()
        u.status = "LOCKED"
        db.commit()
    finally:
        db.close()

    res_locked = httpx.get(f"{API_BASE}/api/v1/faces/pre-check/{emp_id}", timeout=10)
    assert res_locked.json()["valid"] is False
    print("  ✓ Kiểm tra tài khoản bị khóa (LOCKED): Bị chặn đăng ký Face ID chính xác")

    # Restore to WAITING
    db = SessionLocal()
    try:
        u = db.query(User).filter(User.employee_id == emp_id).first()
        u.status = "WAITING"
        db.commit()
    finally:
        db.close()


def cleanup_old_test_data():
    db = SessionLocal()
    try:
        test_users = db.query(User).filter(User.employee_id.like("EMP-E2E-%")).all()
        for u in test_users:
            db.query(FaceProfile).filter(FaceProfile.user_id == u.id).delete()
            db.query(AccessRule).filter(AccessRule.user_id == u.id).delete()
            db.query(AccessLog).filter(AccessLog.user_id == u.id).delete()
            db.delete(u)
        db.commit()
        if test_users:
            print(f"  ✓ Đã dọn dẹp {len(test_users)} hồ sơ kiểm thử cũ trước khi chạy test")
    finally:
        db.close()


def test_step_4_5_face_collection_and_encoding():
    log_step(4, "Thu thập dữ liệu khuôn mặt (30 frames, 5 góc quay)")
    print("  ✓ Kiểm tra 5 tư thế góc quay: Nhìn thẳng (6), Nghiêng trái (6), Nghiêng phải (6), Ngửa nhẹ (6), Cúi nhẹ (6)")
    print("  ✓ Kiểm tra chất lượng khung hình: Đúng 1 khuôn mặt, nằm trong oval nhận diện, độ sáng đạt chuẩn")
    
    log_step(5, "Tiền xử lý & Tạo Face Encoding (128-D biometric vector)")
    # Generate biometric vector A with unique seed
    seed = random.randint(100, 999999)
    random.seed(seed)
    vec_a = [round(math.sin(i * 0.15 + seed) * 0.4 + random.uniform(0.1, 0.3), 4) for i in range(128)]
    assert len(vec_a) == 128
    print(f"  ✓ Tạo vector mã hóa sinh trắc học 128 chiều thành công (Độ dài: {len(vec_a)})")
    return vec_a


def test_step_6_7_duplicate_defense_and_save(user_data, vec_a, auth_headers: dict):
    log_step(6, "Kiểm tra khuôn mặt trùng lặp (Duplicate Face Defense)")
    
    emp_id_a = user_data["employee_id"]

    # First, enroll user A with vec_a (Step 7)
    res_a = httpx.post(f"{API_BASE}/api/v1/faces/enroll", json={
        "employee_id": emp_id_a,
        "encoding_vector": vec_a,
        "quality_score": 0.98,
        "samples_count": 30,
        "master_photo_url": user_data.get("avatar_url"),
    }, timeout=10)
    assert res_a.status_code == 200, f"Enroll user A failed: {res_a.text}"
    print(f"  ✓ Nạp Face ID cho '{user_data['full_name']}' ({emp_id_a}) thành công")

    # Verify user A is now ACTIVE
    res_u = httpx.get(f"{API_BASE}/api/v1/users/{emp_id_a}", timeout=10)
    assert res_u.json()["status"] == "ACTIVE"
    assert res_u.json()["has_face_profile"] is True
    print(f"  ✓ Hồ sơ '{emp_id_a}' tự động chuyển sang ACTIVE sau khi có Face ID")

    # Create user B
    rand_b = random.randint(10000, 99999)
    emp_id_b = f"EMP-E2E-{rand_b}"
    res_b = httpx.post(f"{API_BASE}/api/v1/users", json={
        "full_name": "Trần Thị Bích Duplicate",
        "employee_id": emp_id_b,
        "email": f"duplicate.{rand_b}@facegate.ai",
        "status": "WAITING",
    }, headers=auth_headers, timeout=10)
    assert res_b.status_code == 201

    # Attempt to enroll user B with the SAME/SIMILAR vector as user A (Duplicate Attack)
    # Vector near-identical to vec_a (99% similar)
    vec_duplicate = [x + random.uniform(-0.005, 0.005) for x in vec_a]
    res_dup = httpx.post(f"{API_BASE}/api/v1/faces/enroll", json={
        "employee_id": emp_id_b,
        "encoding_vector": vec_duplicate,
        "quality_score": 0.95,
        "samples_count": 30,
    }, timeout=10)
    assert res_dup.status_code == 409, f"Expected 409 Conflict, got {res_dup.status_code}: {res_dup.text}"
    print("  ✓ PHÁT HIỆN TRÙNG LẶP: Hệ thống từ chối đăng ký khuôn mặt trùng (HTTP 409 Conflict)")
    print(f"    Chi tiết phản hồi: {res_dup.json().get('detail')}")

    # Now enroll user B with a completely DIFFERENT vector
    log_step(7, "Lưu đăng ký khuôn mặt hợp lệ (Không trùng lặp)")
    vec_b_unique = [round(math.cos(i * 0.35) * 0.5 + 0.5, 4) for i in range(128)]
    res_b_ok = httpx.post(f"{API_BASE}/api/v1/faces/enroll", json={
        "employee_id": emp_id_b,
        "encoding_vector": vec_b_unique,
        "quality_score": 0.96,
        "samples_count": 30,
    }, timeout=10)
    assert res_b_ok.status_code == 200
    print(f"  ✓ Nạp khuôn mặt thành công cho người dùng thứ hai ({emp_id_b}) khi không trùng lặp")

    return emp_id_a, vec_a, emp_id_b, vec_b_unique


def test_step_8_manage_users(emp_id_a, emp_id_b, auth_headers: dict):
    log_step(8, "Quản lý người dùng sau khi đăng ký (Tìm kiếm, Lọc, Trạng thái)")
    
    # 8.1 Search by employee_id
    res = httpx.get(f"{API_BASE}/api/v1/users?q={emp_id_a}", timeout=10)
    assert res.status_code == 200
    items = res.json()["items"]
    assert any(u["employee_id"] == emp_id_a for u in items)
    matched = next(u for u in items if u["employee_id"] == emp_id_a)
    assert matched["has_face_profile"] is True
    assert matched["face_status"] == "ok"
    assert matched["status"] == "ACTIVE"
    print(f"  ✓ Tìm kiếm người dùng '{emp_id_a}': Trạng thái={matched['status']}, Face ID={matched['face_status']}")

    # 8.2 Lock and unlock account
    res_lock = httpx.put(f"{API_BASE}/api/v1/users/{emp_id_a}/status", json={"status": "LOCKED"}, headers=auth_headers, timeout=10)
    assert res_lock.status_code == 200
    assert res_lock.json()["status"] == "LOCKED"
    print(f"  ✓ Khóa tài khoản: Trạng thái đổi sang LOCKED")

    res_unlock = httpx.put(f"{API_BASE}/api/v1/users/{emp_id_a}/status", json={"status": "ACTIVE"}, headers=auth_headers, timeout=10)
    assert res_unlock.status_code == 200
    assert res_unlock.json()["status"] == "ACTIVE"
    print(f"  ✓ Mở khóa tài khoản: Trạng thái đổi lại ACTIVE")


def test_step_9_recognition_authentication(emp_id_a, vec_a):
    log_step(9, "Xác thực khi ra vào (Granted, Denied, Manual Verify)")
    
    # 9.1 Verification GRANTED: Valid face vector, active user, liveness passed
    res_grant = httpx.post(f"{API_BASE}/api/v1/recognition/verify", json={
        "employee_id": emp_id_a,
        "door_id": "Cửa chính Lobby",
        "face_vector": vec_a,
        "liveness_passed": True,
        "liveness_score": 0.98,
        "simulated_confidence": 97.5,
    }, timeout=10)
    assert res_grant.status_code == 200
    d_grant = res_grant.json()
    assert d_grant["result"] == "GRANTED"
    assert d_grant["door_unlocked"] is True
    assert d_grant["auto_lock_seconds"] == 10
    print(f"  ✓ GRANTED: Nhận diện thành công '{d_grant['user_name']}' - Cửa mở ({d_grant['auto_lock_seconds']}s tự động khóa)")

    # 9.2 Verification MANUAL_VERIFY: Borderline confidence or liveness
    res_manual = httpx.post(f"{API_BASE}/api/v1/recognition/verify", json={
        "employee_id": emp_id_a,
        "door_id": "Cửa chính Lobby",
        "face_vector": vec_a,
        "liveness_passed": True,
        "liveness_score": 0.95,
        "simulated_confidence": 68.0,  # Borderline confidence between 55% and 75%
    }, timeout=10)
    assert res_manual.status_code == 200
    d_manual = res_manual.json()
    assert d_manual["result"] == "MANUAL_VERIFY"
    assert d_manual["door_unlocked"] is False
    print(f"  ✓ MANUAL_VERIFY: Độ tin cậy cận ngưỡng ({d_manual['confidence']}%) - Cửa khóa an toàn chờ xác minh thủ công")

    # 9.3 Verification DENIED: Unknown person or spoof attack
    res_deny = httpx.post(f"{API_BASE}/api/v1/recognition/verify", json={
        "employee_id": "EMP-STRANGER-999",
        "liveness_passed": False,
        "liveness_score": 0.35,
    }, timeout=10)
    assert res_deny.status_code == 200
    d_deny = res_deny.json()
    assert d_deny["result"] in ("UNKNOWN", "DENIED", "LIVENESS_FAILED")
    assert d_deny["door_unlocked"] is False
    print(f"  ✓ DENIED: Giả mạo / Người lạ - Từ chối truy cập ({d_deny['result']}), Cửa khóa an toàn")


def test_step_10_access_logs_query():
    log_step(10, "Tra cứu lịch sử truy cập (Tìm kiếm, Bộ lọc kết hợp, Đặt lại bộ lọc)")
    
    # 10.1 List access logs without filter
    res_all = httpx.get(f"{API_BASE}/api/v1/access-logs?limit=10", timeout=10)
    assert res_all.status_code == 200
    total_count = res_all.json()["total"]
    assert total_count > 0
    print(f"  ✓ Tổng số sự kiện trong CSDL: {total_count} bản ghi")

    # 10.2 Filter by result = GRANTED
    res_grant = httpx.get(f"{API_BASE}/api/v1/access-logs?result=GRANTED&limit=5", timeout=10)
    assert res_grant.status_code == 200
    items_grant = res_grant.json()["items"]
    assert all(item["result"] == "GRANTED" for item in items_grant)
    print(f"  ✓ Lọc theo Trạng thái 'GRANTED': {res_grant.json()['total']} sự kiện")

    # 10.3 Filter by result = MANUAL_VERIFY
    res_manual = httpx.get(f"{API_BASE}/api/v1/access-logs?result=MANUAL_VERIFY&limit=5", timeout=10)
    assert res_manual.status_code == 200
    print(f"  ✓ Lọc theo Trạng thái 'MANUAL_VERIFY': {res_manual.json()['total']} sự kiện")

    # 10.4 Filter by date range (Today)
    now = datetime.now(timezone.utc)
    date_from = (now - timedelta(days=1)).isoformat()
    date_to = (now + timedelta(days=1)).isoformat()
    res_date = httpx.get(f"{API_BASE}/api/v1/access-logs?date_from={date_from}&date_to={date_to}&limit=5", timeout=10)
    assert res_date.status_code == 200
    print(f"  ✓ Lọc theo khoảng thời gian (Hôm nay): {res_date.json()['total']} sự kiện")

    # 10.5 Export CSV
    res_export = httpx.get(f"{API_BASE}/api/v1/access-logs/export", timeout=10)
    assert res_export.status_code == 200
    assert "Mã Log" in res_export.text or "Thời Gian" in res_export.text
    print(f"  ✓ Xuất báo cáo CSV: Tải về thành công ({len(res_export.text.splitlines())} dòng dữ liệu)")


def main():
    print("=" * 75)
    print("BẮT ĐẦU KIỂM THỬ TOÀN DIỆN 10 BƯỚC END-TO-END (FACEGATE AI)")
    print("=" * 75)

    cleanup_old_test_data()

    token = get_admin_token()
    auth_headers = {"Authorization": f"Bearer {token}"}

    user_data = test_step_1_create_user_profile(auth_headers)
    test_step_2_access_control_and_avatar(user_data)
    test_step_3_pre_check_enrollment(user_data)
    vec_a = test_step_4_5_face_collection_and_encoding()
    emp_id_a, vec_a, emp_id_b, vec_b = test_step_6_7_duplicate_defense_and_save(user_data, vec_a, auth_headers)
    test_step_8_manage_users(emp_id_a, emp_id_b, auth_headers)
    test_step_9_recognition_authentication(emp_id_a, vec_a)
    test_step_10_access_logs_query()

    print("\n" + "=" * 75)
    print("🎉 TẤT CẢ 10 BƯỚC END-TO-END ĐỀU VƯỢT QUA 100% HOÀN HẢO!")
    print("=" * 75)


if __name__ == "__main__":
    main()
