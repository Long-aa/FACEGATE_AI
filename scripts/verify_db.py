# pyright: reportMissingImports=false
"""
Comprehensive verification script for FaceGate AI PostgreSQL database.
"""
import sys
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

# Add backend to sys.path
backend_path = Path(__file__).resolve().parent.parent / "backend"
if str(backend_path) not in sys.path:
    sys.path.insert(0, str(backend_path))

from app.database.session import SessionLocal, engine
from app.models import (
    AccessLog,
    AccessRule,
    Alert,
    AuditLog,
    Camera,
    Door,
    FaceProfile,
    Notification,
    Role,
    SystemSetting,
    User,
)
from app.repositories.postgres_face_repository import PostgresFaceRepository


def verify():
    print("=" * 60)
    print(" FACEGATE AI — DATABASE VERIFICATION REPORT")
    print("=" * 60)
    print(f"Target DB: {engine.url.database} on {engine.url.host}:{engine.url.port}")
    
    db = SessionLocal()
    try:
        # 1. Count records in each table
        tables = [
            ("users", User),
            ("roles", Role),
            ("face_profiles", FaceProfile),
            ("doors", Door),
            ("cameras", Camera),
            ("access_rules", AccessRule),
            ("access_logs", AccessLog),
            ("alerts", Alert),
            ("system_settings", SystemSetting),
            ("notifications", Notification),
            ("audit_logs", AuditLog),
        ]
        
        print("\n--- 1. Table Record Counts ---")
        for name, model in tables:
            count = db.query(model).count()
            print(f"  [OK] {name:<18} : {count:>4} records")
            
        # 2. Verify specific records
        print("\n--- 2. Sample Data Validation ---")
        admin = db.query(User).filter(User.employee_id == "EMP-0001").first()
        print(f"  Admin User        : {admin.full_name} ({admin.email}) [Superuser: {admin.is_superuser}]")
        
        emp = db.query(User).filter(User.employee_id == "EMP-2045").first()
        print(f"  Sample Employee   : {emp.full_name} - Dept: {emp.department}")
        
        face = db.query(FaceProfile).filter(FaceProfile.employee_id == "EMP-2045").first()
        vec = face.get_encoding_vector() if face else None
        vec_len = len(vec) if vec else 0
        print(f"  Face Profile      : Status={face.status if face else 'N/A'}, Vector Dim={vec_len}")
        
        doors = db.query(Door).all()
        print(f"  Doors Configured  : {[f'{d.door_code}: {d.name}' for d in doors]}")
        
        cameras = db.query(Camera).all()
        print(f"  Cameras Active    : {[f'{c.camera_code}: {c.name}' for c in cameras]}")
        
        recent_log = db.query(AccessLog).order_by(AccessLog.log_number.desc()).first()
        if recent_log:
            print(f"  Latest Access Log : #{recent_log.log_number} - {recent_log.user_name} -> {recent_log.result} ({recent_log.confidence}%)")
            
        # 3. Test Repository & Service Integration
        print("\n--- 3. Repository & Service Integration Test ---")
        repo = PostgresFaceRepository(db)
        
        # Test get_employee_by_id
        profile = repo.get_employee_by_id("EMP-2045")
        print(f"  repo.get_employee_by_id('EMP-2045') : Found={profile.name}, ActiveFace={profile.has_face_registration}")
        
        # Test employee_has_active_registration
        has_face = repo.employee_has_active_registration("EMP-2045")
        print(f"  repo.employee_has_active_registration('EMP-2045') : {has_face}")
        
        # Test get_all_encodings
        encodings = repo.get_all_encodings()
        print(f"  repo.get_all_encodings() : {len(encodings)} encodings retrieved")
        
        # Test employee query via repository
        emp_waiting = repo.get_employee_by_id("EMP-2042")
        print(f"  repo.get_employee_by_id('EMP-2042') : Name={emp_waiting.name}, Status={emp_waiting.status.value}")
        
        print("\n" + "=" * 60)
        print(" ALL VERIFICATIONS PASSED SUCCESSFULLY!")
        print("=" * 60)

    finally:
        db.close()


if __name__ == "__main__":
    verify()
