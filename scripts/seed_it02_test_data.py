import sys
from pathlib import Path
sys.stdout.reconfigure(encoding='utf-8')
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "backend"))

from app.database.session import SessionLocal
from app.models.user import User
from app.models.face import FaceProfile

db = SessionLocal()
try:
    # 1. Update EMP-2105 to BLOCKED
    u_2105 = db.query(User).filter(User.employee_id == "EMP-2105").first()
    if u_2105:
        u_2105.status = "BLOCKED"
        print("Updated EMP-2105 status to BLOCKED")
    else:
        u_2105 = User(
            employee_id="EMP-2105",
            full_name="Lê Hoàng Nam",
            department="Kinh doanh & Tiếp thị",
            position="Trưởng phòng Kinh doanh",
            status="BLOCKED"
        )
        db.add(u_2105)
        print("Created EMP-2105 with status BLOCKED")

    # 2. Update EMP-1988 to INACTIVE
    u_1988 = db.query(User).filter(User.employee_id == "EMP-1988").first()
    if u_1988:
        u_1988.status = "INACTIVE"
        print("Updated EMP-1988 status to INACTIVE")
    else:
        u_1988 = User(
            employee_id="EMP-1988",
            full_name="Phạm Quang Huy",
            department="Kế toán & Tài chính",
            position="Kế toán trưởng",
            status="INACTIVE"
        )
        db.add(u_1988)
        print("Created EMP-1988 with status INACTIVE")

    # 3. Ensure EMP-2210 exists as ACTIVE without face profile
    u_2210 = db.query(User).filter(User.employee_id == "EMP-2210").first()
    if not u_2210:
        u_2210 = User(
            employee_id="EMP-2210",
            full_name="Nguyễn Thu Hà",
            department="Phòng Quản trị Nhân sự",
            position="Chuyên viên Tuyển dụng",
            status="ACTIVE"
        )
        db.add(u_2210)
        print("Created EMP-2210 with status ACTIVE")
    else:
        u_2210.status = "ACTIVE"
        # delete any existing face profile so it is ready for fresh enrollment
        db.query(FaceProfile).filter(FaceProfile.employee_id == "EMP-2210").delete()
        print("Prepared EMP-2210: ACTIVE without FaceProfile")

    # 4. Ensure EMP-2048 exists as ACTIVE without face profile
    u_2048 = db.query(User).filter(User.employee_id == "EMP-2048").first()
    if not u_2048:
        u_2048 = User(
            employee_id="EMP-2048",
            full_name="Vũ Hải Đăng",
            department="Phòng Kinh doanh & Marketing",
            position="Trưởng nhóm Marketing",
            status="ACTIVE"
        )
        db.add(u_2048)
        print("Created EMP-2048 with status ACTIVE")
    else:
        u_2048.status = "ACTIVE"
        db.query(FaceProfile).filter(FaceProfile.employee_id == "EMP-2048").delete()
        print("Prepared EMP-2048: ACTIVE without FaceProfile")

    db.commit()
    print("Database seeding completed successfully!")
except Exception as e:
    db.rollback()
    print(f"Error seeding DB: {e}")
    raise
finally:
    db.close()
