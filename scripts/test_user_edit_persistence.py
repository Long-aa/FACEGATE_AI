"""
E2E Integration Test for User Edit with Real PostgreSQL Persistence.
Validates:
1. Updating user info (full_name, department, position, phone, status, avatar_url, access_areas).
2. Verifying database state in users, access_rules, and audit_logs tables.
3. Rejecting invalid inputs (empty name, invalid email, duplicate email).
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
from app.models.access_rule import AccessRule
from app.models.audit import AuditLog
from app.models.door import Door
from app.models.user import User

BASE_URL = "http://127.0.0.1:8080/api/v1/users"


def test_user_edit_flow():
    db = SessionLocal()
    print("=" * 80)
    print("BAT DAU KIEM THU CHUC NANG CHINH SUA NGUOI DUNG VA LUU CSDL POSTGRESQL")
    print("=" * 80)

    # 1. Chon user de kiem thu: EMP-2048
    target_user = db.query(User).filter(User.employee_id == "EMP-2048").first()
    assert target_user is not None, "EMP-2048 khong ton tai trong CSDL"
    user_id = target_user.id
    print(f"\n1. Tim thay user muc tieu: {target_user.full_name} ({target_user.employee_id}) - ID: {user_id}")

    # 2. Thuc hien cap nhat day du cac truong du lieu qua API PUT /api/v1/users/{user_id}
    update_data = {
        "full_name": "Vũ Hải Đăng - Đã Cập Nhật",
        "department": "Khối Kỹ thuật & R&D",
        "position": "Kỹ sư Trưởng DevSecOps",
        "email": "dang.vu.updated@aiaccess.corp",
        "phone": "0988 999 888",
        "status": "ACTIVE",
        "avatar_url": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400",
        "access_areas": ["Cửa chính Lobby", "Phòng Server Kỹ thuật", "Cửa kho Thiết bị R&D"],
    }

    print("\n2. Gui yeu cau cap nhat toi Backend API:")
    for k, v in update_data.items():
        print(f"   - {k}: {v}")

    res = httpx.put(f"{BASE_URL}/{user_id}", json=update_data)
    assert res.status_code == 200, f"Update failed: {res.text}"
    res_data = res.json()
    print(f"=> API phan hoi thanh cong 200 OK: Ten moi = '{res_data['full_name']}'")

    # 3. Kiem tra truc tiep trong PostgreSQL xem du lieu da duoc luu hay chua
    db.expire_all()
    user_in_db = db.query(User).filter(User.id == user_id).first()
    assert user_in_db.full_name == "Vũ Hải Đăng - Đã Cập Nhật"
    assert user_in_db.position == "Kỹ sư Trưởng DevSecOps"
    assert user_in_db.email == "dang.vu.updated@aiaccess.corp"
    assert user_in_db.phone == "0988 999 888"
    assert user_in_db.status == "ACTIVE"
    assert user_in_db.avatar_url == "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400"
    print("\n3. XAC MINH CSDL POSTGRESQL (Bang 'users'):")
    print(f"   [PASS] full_name   : {user_in_db.full_name}")
    print(f"   [PASS] position    : {user_in_db.position}")
    print(f"   [PASS] email       : {user_in_db.email}")
    print(f"   [PASS] phone       : {user_in_db.phone}")
    print(f"   [PASS] status      : {user_in_db.status}")
    print(f"   [PASS] avatar_url  : {user_in_db.avatar_url}")
    print(f"   [PASS] updated_at  : {user_in_db.updated_at}")

    # 4. Kiem tra bang 'access_rules' trong CSDL
    rules = db.query(AccessRule).filter(AccessRule.user_id == user_id).all()
    door_names_in_db = [r.door.name for r in rules if r.door]
    print(f"\n4. XAC MINH PHAN QUYEN CUA RA VAO (Bang 'access_rules'):")
    print(f"   Danh sach quyen trong CSDL: {door_names_in_db}")
    for area in ["Cửa chính Lobby", "Phòng Server Kỹ thuật", "Cửa kho Thiết bị R&D"]:
        assert area in door_names_in_db, f"Thieu quyen '{area}' trong access_rules"
        print(f"   [PASS] Quyen '{area}' da duoc luu lien ket khoa ngoai voi door_id tuong ung.")

    # 5. Kiem tra nhat ky he thong 'audit_logs'
    audit = db.query(AuditLog).filter(AuditLog.entity_id == user_id, AuditLog.action == "USER_UPDATE").order_by(AuditLog.created_at.desc()).first()
    assert audit is not None, "Khong tim thay AuditLog cho thao tac USER_UPDATE"
    print(f"\n5. XAC MINH NHAT KY AUDIT LOG (Bang 'audit_logs'):")
    print(f"   [PASS] Action: {audit.action} | Time: {audit.created_at} | Fields: {audit.details.get('updated_fields')}")

    # 6. Kiem tra bat ngoai le khi du lieu khong hop le
    print("\n6. KIEM TRA XU LY NGOAI LE (VALIDATION DEFENSE):")
    # 6.1. Ten rong
    res_empty_name = httpx.put(f"{BASE_URL}/{user_id}", json={"full_name": "  "})
    assert res_empty_name.status_code == 400
    print(f"   [PASS] Tu choi ho ten rong: {res_empty_name.json()['detail']}")

    # 6.2. Email sai dinh dang
    res_bad_email = httpx.put(f"{BASE_URL}/{user_id}", json={"email": "not-an-email"})
    assert res_bad_email.status_code == 400
    print(f"   [PASS] Tu choi email sai dinh dang: {res_bad_email.json()['detail']}")

    # 6.3. Email trung lap voi user khac (EMP-0001)
    admin_user = db.query(User).filter(User.employee_id == "EMP-0001").first()
    if admin_user and admin_user.email:
        res_dup_email = httpx.put(f"{BASE_URL}/{user_id}", json={"email": admin_user.email})
        assert res_dup_email.status_code == 400
        print(f"   [PASS] Tu choi email trung lap voi user khac: {res_dup_email.json()['detail']}")

    # 7. Kiem tra thao tac GO ANH (Remove Avatar) va luu CSDL
    print("\n7. KIEM TRA THAO TAC GO ANH (REMOVE AVATAR) VA LUU CSDL POSTGRESQL:")
    res_remove_avatar = httpx.put(f"{BASE_URL}/{user_id}", json={"avatar_url": None})
    assert res_remove_avatar.status_code == 200, f"Remove avatar failed: {res_remove_avatar.text}"
    assert res_remove_avatar.json().get("avatar_url") is None, "avatar_url van con ton tai sau khi go anh!"

    db.expire_all()
    user_after_remove = db.query(User).filter(User.id == user_id).first()
    assert user_after_remove.avatar_url is None, "PostgreSQL users.avatar_url chua duoc set ve NULL!"
    if user_after_remove.face_profile:
        assert user_after_remove.face_profile.master_photo_url is None, "PostgreSQL face_profiles.master_photo_url chua duoc set ve NULL!"
    print(f"   [PASS] API phan hoi avatar_url = None sau khi go anh.")
    print(f"   [PASS] CSDL PostgreSQL users.avatar_url da duoc luu la NULL thanh cong.")
    if user_after_remove.face_profile:
        print(f"   [PASS] CSDL PostgreSQL face_profiles.master_photo_url da dong bo thanh NULL thanh cong.")

    db.close()
    print("\n" + "=" * 80)
    print("HOAN TAT: CHUC NANG CHINH SUA NGUOI DUNG VA LUU CSDL HOAT DONG CHINH XAC 100%!")
    print("=" * 80)
    return True


if __name__ == "__main__":
    success = test_user_edit_flow()
    sys.exit(0 if success else 1)
