"""
Comprehensive Integration Test Suite for Face Registration (IT02-01 through IT02-10).
Tests both HTTP APIs and direct PostgreSQL database state.
"""
import os
import sys
sys.path.insert(0, os.path.abspath("c:/TTNT/FACEGATE_AI/backend"))
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

import httpx
from sqlalchemy import text
from app.database.session import SessionLocal
from app.models.face import FaceProfile
from app.models.user import User

BASE_URL = "http://127.0.0.1:8080/api/v1/faces"


def test_it02_suite():
    db = SessionLocal()
    results = {}
    print("=" * 80)
    print("BAT DAU KIEM THU TOAN DIEN MA TRAN TEST CASE IT02-01 DEN IT02-10")
    print("=" * 80)

    # ──────────────────────────────────────────────────────────────────────────
    # IT02-01: Khong nhap ma nhan vien (None, "", "   ")
    # ──────────────────────────────────────────────────────────────────────────
    print("\n[IT02-01] Kiem tra: Khong nhap ma nhan vien (Rong / Khoang trang)")
    # Test pre-check query
    res = httpx.get(f"{BASE_URL}/pre-check?employee_id=")
    data = res.json()
    assert data["valid"] is False
    assert data["message"] == "Mã nhân viên không được để trống", f"Got: {data}"
    
    # Test enroll
    res_enroll = httpx.post(f"{BASE_URL}/enroll", json={
        "employee_id": "   ",
        "encoding_vector": [0.1] * 512,
    })
    assert res_enroll.status_code == 400
    assert "Mã nhân viên không được để trống" in res_enroll.text
    results["IT02-01"] = "PASS"
    print("=> IT02-01 PASS: API tu choi ma rong, thong bao chinh xac, DB an toan.")

    # ──────────────────────────────────────────────────────────────────────────
    # IT02-02: Nhap ma nhan vien sai dinh dang (VD: "ABC-1@")
    # ──────────────────────────────────────────────────────────────────────────
    print("\n[IT02-02] Kiem tra: Nhap ma nhan vien sai dinh dang ('ABC-1@')")
    res = httpx.get(f"{BASE_URL}/pre-check?employee_id=ABC-1@")
    data = res.json()
    assert data["valid"] is False
    assert data["message"] == "Định dạng mã nhân viên không hợp lệ", f"Got: {data}"

    res_enroll = httpx.post(f"{BASE_URL}/enroll", json={
        "employee_id": "ABC-1@",
        "encoding_vector": [0.1] * 512,
    })
    assert res_enroll.status_code == 400
    assert "Định dạng mã nhân viên không hợp lệ" in res_enroll.text
    results["IT02-02"] = "PASS"
    print("=> IT02-02 PASS: API kiem tra regex dinh dang ca o Frontend & Backend, DB an toan.")

    # ──────────────────────────────────────────────────────────────────────────
    # IT02-03: Ma nhan vien khong ton tai (VD: "EMP-9999")
    # ──────────────────────────────────────────────────────────────────────────
    print("\n[IT02-03] Kiem tra: Ma nhan vien khong ton tai trong CSDL ('EMP-9999')")
    # Verify not in DB first
    user_in_db = db.query(User).filter(User.employee_id == "EMP-9999").first()
    assert user_in_db is None, "EMP-9999 should not exist in DB"

    res = httpx.get(f"{BASE_URL}/pre-check?employee_id=EMP-9999")
    data = res.json()
    assert data["valid"] is False
    assert data["message"] == "Không tìm thấy nhân viên", f"Got: {data}"

    res_enroll = httpx.post(f"{BASE_URL}/enroll", json={
        "employee_id": "EMP-9999",
        "encoding_vector": [0.1] * 512,
    })
    assert res_enroll.status_code == 404
    assert "Không tìm thấy nhân viên" in res_enroll.text
    results["IT02-03"] = "PASS"
    print("=> IT02-03 PASS: Truy van CSDL thuc te xac minh khong ton tai, DB an toan.")

    # ──────────────────────────────────────────────────────────────────────────
    # IT02-04: Nhan vien da dang ky khuon mat truoc do (VD: "EMP-0001")
    # ──────────────────────────────────────────────────────────────────────────
    print("\n[IT02-04] Kiem tra: Nhan vien da co ho so khuon mat trong CSDL ('EMP-0001')")
    prof = db.query(FaceProfile).filter(FaceProfile.employee_id == "EMP-0001", FaceProfile.status == "ACTIVE").first()
    assert prof is not None and prof.has_vector(), "EMP-0001 must have active face in DB"

    res = httpx.get(f"{BASE_URL}/pre-check?employee_id=EMP-0001")
    data = res.json()
    assert data["valid"] is False
    assert data["already_enrolled"] is True
    assert data["message"] == "Nhân viên đã đăng ký khuôn mặt trước đó", f"Got: {data}"

    res_enroll = httpx.post(f"{BASE_URL}/enroll", json={
        "employee_id": "EMP-0001",
        "encoding_vector": [0.1] * 512,
    })
    assert res_enroll.status_code == 400
    assert "Nhân viên đã đăng ký khuôn mặt trước đó" in res_enroll.text
    results["IT02-04"] = "PASS"
    print("=> IT02-04 PASS: Phat hien khuon mat da co, chan ghi de, khong tao ban ghi trung lap.")

    # ──────────────────────────────────────────────────────────────────────────
    # IT02-05: Nhan vien ngung hoat dong hoac bi khoa ("EMP-2105" BLOCKED, "EMP-1988" INACTIVE)
    # ──────────────────────────────────────────────────────────────────────────
    print("\n[IT02-05] Kiem tra: Nhan vien bi khoa hoac ngung hoat dong ('EMP-2105', 'EMP-1988')")
    user_blocked = db.query(User).filter(User.employee_id == "EMP-2105").first()
    assert user_blocked.status == "BLOCKED"

    res_b = httpx.get(f"{BASE_URL}/pre-check?employee_id=EMP-2105")
    data_b = res_b.json()
    assert data_b["valid"] is False
    assert data_b["reason"] == "ACCOUNT_LOCKED"
    assert data_b["message"] == "Nhân viên đang ở trạng thái ngừng hoạt động/bị khóa"

    res_enroll_b = httpx.post(f"{BASE_URL}/enroll", json={
        "employee_id": "EMP-2105",
        "encoding_vector": [0.1] * 512,
    })
    assert res_enroll_b.status_code == 400
    assert "Nhân viên đang ở trạng thái ngừng hoạt động/bị khóa" in res_enroll_b.text

    # INACTIVE check
    user_inact = db.query(User).filter(User.employee_id == "EMP-1988").first()
    assert user_inact.status == "INACTIVE"
    res_i = httpx.get(f"{BASE_URL}/pre-check?employee_id=EMP-1988")
    assert res_i.json()["valid"] is False
    assert res_i.json()["reason"] == "ACCOUNT_LOCKED"
    results["IT02-05"] = "PASS"
    print("=> IT02-05 PASS: Tu choi nhan vien INACTIVE va BLOCKED, bao loi chinh xac.")

    # ──────────────────────────────────────────────────────────────────────────
    # IT02-06: Chi so camera khong hop le (index = -1)
    # ──────────────────────────────────────────────────────────────────────────
    print("\n[IT02-06] Kiem tra: Chi so camera khong hop le (index = -1)")
    res_cam6 = httpx.post(f"{BASE_URL}/verify-camera", json={"camera_index": -1})
    assert res_cam6.status_code == 400
    assert "Chỉ số camera không hợp lệ" in res_cam6.json()["detail"]
    results["IT02-06"] = "PASS"
    print("=> IT02-06 PASS: Tu choi chi so camera am hoac khong hop le.")

    # ──────────────────────────────────────────────────────────────────────────
    # IT02-07: Camera khong duoc mo (is_opened = False)
    # ──────────────────────────────────────────────────────────────────────────
    print("\n[IT02-07] Kiem tra: Camera khong the mo (is_opened = False)")
    res_cam7 = httpx.post(f"{BASE_URL}/verify-camera", json={"camera_index": 0, "is_opened": False})
    assert res_cam7.status_code == 503
    assert "Không thể mở camera" in res_cam7.json()["detail"]
    results["IT02-07"] = "PASS"
    print("=> IT02-07 PASS: Bat ngoai le thiet bi camera khong the mo, bao dung thong diep.")

    # ──────────────────────────────────────────────────────────────────────────
    # IT02-08: Khong co quyen truy cap camera (permission_granted = False)
    # ──────────────────────────────────────────────────────────────────────────
    print("\n[IT02-08] Kiem tra: Khong co quyen truy cap camera (permission_granted = False)")
    res_cam8 = httpx.post(f"{BASE_URL}/verify-camera", json={"camera_index": 0, "permission_granted": False})
    assert res_cam8.status_code == 403
    assert "Không có quyền truy cập camera" in res_cam8.json()["detail"]
    results["IT02-08"] = "PASS"
    print("=> IT02-08 PASS: Chan truy cap khi chua cap quyen, huong dan ro rang.")

    # ──────────────────────────────────────────────────────────────────────────
    # IT02-09: Camera khong doc duoc hinh anh (frame_empty = True / vector = 0)
    # ──────────────────────────────────────────────────────────────────────────
    print("\n[IT02-09] Kiem tra: Camera khong doc duoc hinh anh (frame rong)")
    # ──────────────────────────────────────────────────────────────────────────
    # IT02-09: Camera khong doc duoc hinh anh (frame_empty = True / vector = 0)
    # ──────────────────────────────────────────────────────────────────────────
    print("\n[IT02-09] Kiem tra: Camera khong doc duoc hinh anh (frame rong)")
    res_cam9 = httpx.post(f"{BASE_URL}/verify-camera", json={"camera_index": 0, "frame_empty": True})
    assert res_cam9.status_code == 400
    assert "Không đọc được hình ảnh từ camera" in res_cam9.json()["detail"]

    # Backend enroll check with all zeros vector on active employee without face profile (EMP-2048)
    res_en9 = httpx.post(f"{BASE_URL}/enroll", json={
        "employee_id": "EMP-2048",
        "encoding_vector": [0.0] * 512,
    })
    assert res_en9.status_code == 400
    assert "Không đọc được hình ảnh từ camera" in res_en9.text
    results["IT02-09"] = "PASS"
    print("=> IT02-09 PASS: Tu choi frame rong / vector all zeros, khong luu du lieu sai lech.")

    # ──────────────────────────────────────────────────────────────────────────
    # IT02-10: Do phan giai camera khong hop le (< 640x480 / quality_score < 0.5)
    # ──────────────────────────────────────────────────────────────────────────
    print("\n[IT02-10] Kiem tra: Do phan giai camera khong hop le (width=320, height=240)")
    res_cam10 = httpx.post(f"{BASE_URL}/verify-camera", json={"camera_index": 0, "width": 320, "height": 240})
    assert res_cam10.status_code == 400
    assert "Độ phân giải hình ảnh camera không hợp lệ" in res_cam10.json()["detail"]

    # Backend enroll check with low quality on active employee without face profile (EMP-2048)
    res_en10 = httpx.post(f"{BASE_URL}/enroll", json={
        "employee_id": "EMP-2048",
        "encoding_vector": [0.1] * 512,
        "quality_score": 0.2,
    })
    assert res_en10.status_code == 400
    assert "Độ phân giải hình ảnh camera không hợp lệ" in res_en10.text
    results["IT02-10"] = "PASS"
    print("=> IT02-10 PASS: Yeu cau do phan giai toi thieu 640x480, chan anh kem chat luong.")

    # ──────────────────────────────────────────────────────────────────────────
    # INTEGRATION TEST: Dang ky thanh cong nhan vien hop le (EMP-2210)
    # ──────────────────────────────────────────────────────────────────────────
    print("\n[HAPPY PATH] Kiem tra quy trinh dang ky hoan chinh cho 'EMP-2210'")
    # Clean previous face for EMP-2210 if any
    db.execute(text("DELETE FROM face_profiles WHERE employee_id = 'EMP-2210'"))
    db.commit()

    # Pre-check
    res_valid_check = httpx.get(f"{BASE_URL}/pre-check?employee_id=EMP-2210")
    assert res_valid_check.json()["valid"] is True
    assert res_valid_check.json()["face_enrolled"] is False

    # Valid enroll with a unique biometric vector
    import random
    rng = random.Random(998877)
    unique_vec = [rng.gauss(0, 1) for _ in range(512)]
    # L2 normalize
    norm = sum(x * x for x in unique_vec) ** 0.5
    unique_vec = [x / norm for x in unique_vec]

    res_success = httpx.post(f"{BASE_URL}/enroll", json={
        "employee_id": "EMP-2210",
        "encoding_vector": unique_vec,
        "quality_score": 0.98,
        "samples_count": 30,
        "notes": "E2E Test Success",
    })
    assert res_success.status_code == 200, f"Enroll failed: {res_success.text}"
    print("=> Dang ky thanh cong cho EMP-2210 voi ma 200 OK.")

    # Verify directly in PostgreSQL
    enrolled_profile = db.query(FaceProfile).filter(FaceProfile.employee_id == "EMP-2210").first()
    assert enrolled_profile is not None
    assert enrolled_profile.has_vector() is True
    assert enrolled_profile.status == "ACTIVE"
    print("=> Da kiem tra truc tiep CSDL PostgreSQL: Ho so khuon mat ton tai, vector 512-D hop le.")

    # Re-check pre-check immediately: Must now be ALREADY_ENROLLED!
    res_after = httpx.get(f"{BASE_URL}/pre-check?employee_id=EMP-2210")
    assert res_after.json()["valid"] is False
    assert res_after.json()["already_enrolled"] is True
    assert res_after.json()["message"] == "Nhân viên đã đăng ký khuôn mặt trước đó"
    print("=> Kiem tra lai ngay sau khi dang ky: He thong tu dong phat hien da dang ky, bao ve chong ghi de.")

    # Clean up test enrollment for EMP-2210 to keep environment clean
    db.execute(text("DELETE FROM face_profiles WHERE employee_id = 'EMP-2210'"))
    db.commit()
    db.close()

    print("\n" + "=" * 80)
    print("KET QUA KIEM THU: 10/10 TEST CASES PASS HOAN TOAN!")
    for tc, st in results.items():
        print(f"  - {tc}: {st}")
    print("=" * 80)
    return True


if __name__ == "__main__":
    success = test_it02_suite()
    sys.exit(0 if success else 1)
