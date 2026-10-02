import sys
from pathlib import Path
sys.stdout.reconfigure(encoding='utf-8')
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "backend"))

from app.database.session import SessionLocal
from app.models.user import User
from app.models.face import FaceProfile

db = SessionLocal()
try:
    users = db.query(User).all()
    print(f"Total users in DB: {len(users)}")
    for u in users:
        face = db.query(FaceProfile).filter(FaceProfile.employee_id == u.employee_id).first()
        has_f = bool(face and (face.encoding is not None or face.face_encoding_json is not None))
        print(f"[{u.employee_id}] {u.full_name} | Dept: {u.department} | Status: {u.status} | FaceEnrolled: {has_f}")
finally:
    db.close()
