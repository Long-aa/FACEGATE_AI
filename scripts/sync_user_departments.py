# pyright: reportMissingImports=false
import sys
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

backend_path = Path(__file__).resolve().parent.parent / "backend"
if str(backend_path) not in sys.path:
    sys.path.insert(0, str(backend_path))

from app.database.session import SessionLocal
from app.models.user import User
from app.models.department import Department

db = SessionLocal()

print("--- CURRENT USERS IN DB ---")
users = db.query(User).all()
for u in users:
    print(f"ID: {u.employee_id} | Name: {u.full_name} | Department: '{u.department}'")

print("\n--- CURRENT DEPARTMENTS IN DB ---")
depts = db.query(Department).all()
for d in depts:
    print(f"Code: {d.code} | Name: '{d.name}'")

# Mapping rules to synchronize users to canonical department names
DEPT_CANONICAL_MAP = {
    "Kế toán": "Kế toán & Tài chính",
    "Kinh doanh": "Kinh doanh & Tiếp thị",
    "Nhân sự": "Khối Nhân sự & Đào tạo",
    "Ban Giám Đốc & IT": "Ban Giám Đốc",
    "Ban Giám Đốc": "Ban Giám Đốc",
    "Khối Vận hành": "Khối Vận hành & An ninh",
    "Khối Kỹ thuật & R&D": "Khối Kỹ thuật & R&D",
}

print("\n--- SYNCHRONIZING USERS TO CANONICAL DEPARTMENTS ---")
updated_count = 0
for u in users:
    if u.department in DEPT_CANONICAL_MAP:
        canonical = DEPT_CANONICAL_MAP[u.department]
        if u.department != canonical:
            print(f"Updating '{u.full_name}': '{u.department}' -> '{canonical}'")
            u.department = canonical
            updated_count += 1

db.commit()
print(f"[OK] Synchronized {updated_count} users to official department names.")

print("\n--- RE-CHECKING COUNTS ---")
for d in depts:
    count = db.query(User).filter(User.department == d.name).count()
    print(f"Department '{d.name}': {count} members")

db.close()
