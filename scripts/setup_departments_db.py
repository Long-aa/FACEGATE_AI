# pyright: reportMissingImports=false
"""
Script to create the departments table in PostgreSQL and seed initial department records.
"""
import sys
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

# Add backend to sys.path
backend_path = Path(__file__).resolve().parent.parent / "backend"
if str(backend_path) not in sys.path:
    sys.path.insert(0, str(backend_path))

from app.database.session import SessionLocal, engine, Base
from app.models.department import Department

DEFAULT_DEPARTMENTS = [
    {
        "code": "RD",
        "name": "Khối Kỹ thuật & R&D",
        "description": "Nghiên cứu & phát triển mô hình AI, thuật toán thị giác máy tính và hệ thống nhúng.",
        "manager_name": "Nguyễn Văn An",
        "contact_email": "rd@aiaccess.corp",
        "contact_phone": "024.7300.8888",
        "location": "Tầng 4 - Khu Công nghệ cao",
        "access_level": "RESTRICTED",
        "allowed_doors": ["Cửa chính Lobby - Tầng 1", "Phòng Server Kỹ thuật", "Cửa phân tầng Thang máy"],
        "color": "#00A3FF",
        "status": "ACTIVE",
    },
    {
        "code": "OPS",
        "name": "Khối Vận hành & An ninh",
        "description": "Giám sát an ninh 24/7, vận hành hệ thống kiểm soát cửa và xử lý tình huống khẩn cấp.",
        "manager_name": "Trần Quốc Toản",
        "contact_email": "security@aiaccess.corp",
        "contact_phone": "024.7300.9999",
        "location": "Tầng 1 - Phòng Điều hành An ninh",
        "access_level": "HIGH_SECURITY",
        "allowed_doors": ["Cửa chính Lobby - Tầng 1", "Phòng Server Kỹ thuật", "Cửa phân tầng Thang máy", "Cửa kho Thiết bị R&D"],
        "color": "#F59E0B",
        "status": "ACTIVE",
    },
    {
        "code": "FIN",
        "name": "Kế toán & Tài chính",
        "description": "Quản trị dòng tiền, hạch toán kế toán và thanh quyết toán chế độ nhân sự.",
        "manager_name": "Lê Thị Thu",
        "contact_email": "finance@aiaccess.corp",
        "contact_phone": "024.7300.1111",
        "location": "Tầng 2 - Phòng 204",
        "access_level": "STANDARD",
        "allowed_doors": ["Cửa chính Lobby - Tầng 1", "Cửa phân tầng Thang máy"],
        "color": "#10B981",
        "status": "ACTIVE",
    },
    {
        "code": "SALES",
        "name": "Kinh doanh & Tiếp thị",
        "description": "Mở rộng thị trường, phát triển đối tác và tư vấn giải pháp kiểm soát ra vào AI.",
        "manager_name": "Phạm Hoàng Long",
        "contact_email": "sales@aiaccess.corp",
        "contact_phone": "024.7300.2222",
        "location": "Tầng 2 - Phòng 201",
        "access_level": "STANDARD",
        "allowed_doors": ["Cửa chính Lobby - Tầng 1", "Cửa phân tầng Thang máy"],
        "color": "#8B5CF6",
        "status": "ACTIVE",
    },
    {
        "code": "HR",
        "name": "Khối Nhân sự & Đào tạo",
        "description": "Tuyển dụng nhân tài, đào tạo nội bộ và phát hành thẻ số sinh trắc học nhân sự.",
        "manager_name": "Đặng Mai Lan",
        "contact_email": "hr@aiaccess.corp",
        "contact_phone": "024.7300.3333",
        "location": "Tầng 3 - Phòng 302",
        "access_level": "STANDARD",
        "allowed_doors": ["Cửa chính Lobby - Tầng 1", "Cửa phân tầng Thang máy"],
        "color": "#EC4899",
        "status": "ACTIVE",
    },
    {
        "code": "BOD",
        "name": "Ban Giám Đốc",
        "description": "Lãnh đạo chiến lược toàn diện và quản trị cấp cao của tập đoàn.",
        "manager_name": "Admin Quản Trị",
        "contact_email": "board@aiaccess.corp",
        "contact_phone": "024.7300.0001",
        "location": "Tầng 5 - Executive Suite",
        "access_level": "HIGH_SECURITY",
        "allowed_doors": ["Cửa chính Lobby - Tầng 1", "Phòng Server Kỹ thuật", "Cửa phân tầng Thang máy", "Cửa kho Thiết bị R&D"],
        "color": "#00D4AA",
        "status": "ACTIVE",
    },
]

def setup_departments():
    print("Creating departments table if not exists...")
    Base.metadata.create_all(bind=engine, tables=[Department.__table__])
    print("[OK] Table 'departments' ready.")

    db = SessionLocal()
    try:
        created_count = 0
        for data in DEFAULT_DEPARTMENTS:
            existing = db.query(Department).filter(
                (Department.code == data["code"]) | (Department.name == data["name"])
            ).first()
            if not existing:
                dept = Department(**data)
                db.add(dept)
                created_count += 1
                print(f"  + Seeded department: {data['code']} - {data['name']}")
            else:
                print(f"  ~ Department already exists: {data['code']} - {data['name']}")
        
        db.commit()
        print(f"[SUCCESS] Seeded {created_count} new departments. Total in DB: {db.query(Department).count()}")
    except Exception as e:
        db.rollback()
        print(f"[ERROR] Failed to seed departments: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    setup_departments()
