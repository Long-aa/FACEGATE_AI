"""
Face Profile management endpoints for FaceGate AI.
Handles face embedding retrieval, enrollment, and profile status updates.
"""
from datetime import datetime, timezone
import math
import re
from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.audit import AuditLog
from app.models.face import FaceProfile
from app.models.user import User
from app.websocket.manager import ws_manager

router = APIRouter()


def compute_cosine_similarity(vec_a: List[float], vec_b: List[float]) -> float:
    """Compute cosine similarity between two float biometric vectors."""
    if not vec_a or not vec_b:
        return 0.0
    min_len = min(len(vec_a), len(vec_b))
    if min_len == 0:
        return 0.0
    dot = sum(vec_a[i] * vec_b[i] for i in range(min_len))
    norm_a = math.sqrt(sum(vec_a[i] * vec_a[i] for i in range(min_len)))
    norm_b = math.sqrt(sum(vec_b[i] * vec_b[i] for i in range(min_len)))
    if norm_a == 0.0 or norm_b == 0.0:
        return 0.0
    return max(0.0, min(1.0, dot / (norm_a * norm_b)))


class FaceProfileOut(BaseModel):
    id: str
    employee_id: str
    user_name: Optional[str] = None
    department: Optional[str] = None
    status: str
    quality_score: Optional[float] = None
    samples_count: int
    has_vector: bool
    registered_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class FaceProfileDetailOut(FaceProfileOut):
    master_photo_url: Optional[str] = None
    encoding_vector: Optional[List[float]] = None


class EnrollFaceRequest(BaseModel):
    employee_id: str
    encoding_vector: List[float]
    quality_score: Optional[float] = 0.95
    samples_count: Optional[int] = 30
    master_photo_url: Optional[str] = None
    registered_by: Optional[str] = "Admin"
    notes: Optional[str] = None


@router.get("/pre-check/{employee_id}")
def pre_check_enrollment(
    employee_id: str,
    db: Session = Depends(get_db),
) -> Any:
    """
    Step 3 Pre-condition verification before starting face enrollment:
    1. Employee ID format verification.
    2. Employee existence in database.
    3. Employee active status check (not locked/inactive).
    4. Prior Face ID registration detection.
    """
    # 1. Format check
    if not re.match(r"^[A-Za-z0-9\-_]{3,30}$", employee_id.strip()):
        return {
            "valid": False,
            "reason": "FORMAT_INVALID",
            "message": f"Mã nhân viên '{employee_id}' không đúng định dạng (3-30 ký tự chữ, số, gạch ngang).",
        }

    # 2. Existence check
    user = db.query(User).filter(User.employee_id == employee_id.strip()).first()
    if not user:
        return {
            "valid": False,
            "reason": "USER_NOT_FOUND",
            "message": f"Không tìm thấy nhân viên với mã '{employee_id}' trong cơ sở dữ liệu.",
        }

    # 3. Active status check
    if user.status in ("LOCKED", "BLOCKED", "INACTIVE"):
        return {
            "valid": False,
            "reason": "ACCOUNT_LOCKED",
            "message": f"Tài khoản của nhân sự '{user.full_name}' đang ở trạng thái '{user.status}' (bị khóa). Không thể đăng ký Face ID!",
            "user_name": user.full_name,
        }

    # 4. Check existing face profile
    existing_profile = db.query(FaceProfile).filter(
        FaceProfile.employee_id == user.employee_id,
        FaceProfile.status == "ACTIVE",
    ).first()
    has_prior_face = bool(existing_profile and existing_profile.has_vector())

    return {
        "valid": True,
        "already_enrolled": has_prior_face,
        "message": (
            f"Nhân viên '{user.full_name}' đã có dữ liệu Face ID trước đó. Quá trình tiếp tục sẽ cập nhật lại mẫu đặc trưng."
            if has_prior_face
            else f"Hồ sơ nhân viên '{user.full_name}' hợp lệ, sẵn sàng thu nạp dữ liệu khuôn mặt."
        ),
        "employee_id": user.employee_id,
        "full_name": user.full_name,
        "department": user.department,
        "status": user.status,
    }


@router.get("", response_model=List[FaceProfileOut])
def list_face_profiles(
    status: Optional[str] = Query(None, description="Filter by status (ACTIVE, PENDING, FAILED)"),
    db: Session = Depends(get_db),
) -> Any:
    """
    List all registered face profiles from PostgreSQL.
    """
    query = db.query(FaceProfile)
    if status:
        query = query.filter(FaceProfile.status == status)

    profiles = query.order_by(FaceProfile.created_at.desc()).all()
    result = []
    for p in profiles:
        u = db.query(User).filter((User.id == p.user_id) | (User.employee_id == p.employee_id)).first()
        vec = p.get_encoding_vector()
        result.append(
            FaceProfileOut(
                id=p.id,
                employee_id=p.employee_id,
                user_name=u.full_name if u else None,
                department=u.department if u else None,
                status=p.status,
                quality_score=p.quality_score,
                samples_count=p.samples_count or 1,
                has_vector=bool(vec and len(vec) > 0),
                registered_at=p.registered_at,
            )
        )
    return result


@router.get("/{employee_id}", response_model=FaceProfileDetailOut)
def get_face_profile(
    employee_id: str,
    db: Session = Depends(get_db),
) -> Any:
    """
    Get single face profile by employee_id including biometric vector and master photo.
    """
    profile = db.query(FaceProfile).filter(FaceProfile.employee_id == employee_id).first()
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Không tìm thấy hồ sơ khuôn mặt cho mã nhân viên '{employee_id}'",
        )
    u = db.query(User).filter((User.id == profile.user_id) | (User.employee_id == profile.employee_id)).first()
    vec = profile.get_encoding_vector()
    return FaceProfileDetailOut(
        id=profile.id,
        employee_id=profile.employee_id,
        user_name=u.full_name if u else None,
        department=u.department if u else None,
        status=profile.status,
        quality_score=profile.quality_score,
        samples_count=profile.samples_count or 1,
        has_vector=bool(vec and len(vec) > 0),
        registered_at=profile.registered_at,
        master_photo_url=profile.master_photo_url,
        encoding_vector=vec,
    )


@router.post("/enroll", response_model=FaceProfileOut)
async def enroll_face_profile(
    payload: EnrollFaceRequest,
    db: Session = Depends(get_db),
) -> Any:
    """
    Register or update biometric face embedding vector for an employee.
    Enforces Step 5 (Encoding validation), Step 6 (Duplicate face defense),
    and Step 7 (Transactional profile persistence).
    """
    # 1. Check User existence and status
    user = db.query(User).filter(User.employee_id == payload.employee_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Không tìm thấy nhân viên với mã '{payload.employee_id}'",
        )

    if user.status in ("LOCKED", "BLOCKED", "INACTIVE"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Tài khoản '{user.full_name}' đang ở trạng thái '{user.status}' (bị khóa). Không thể nạp khuôn mặt.",
        )

    # 2. Validate biometric vector
    if not payload.encoding_vector or len(payload.encoding_vector) < 16:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Vector đặc trưng khuôn mặt không hợp lệ hoặc dữ liệu không đủ kích thước.",
        )

    # Check if vector is non-zero
    vector_mag = sum(abs(x) for x in payload.encoding_vector)
    if vector_mag < 0.001:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Vector đặc trưng khuôn mặt không chứa thông tin hợp lệ (tất cả giá trị bằng 0).",
        )

    # 3. STEP 6: Duplicate Face Defense
    # Compare incoming encoding with all OTHER active face profiles in DB
    DUPLICATE_SIMILARITY_THRESHOLD = 0.72  # >= 72% cosine similarity indicates identical face
    other_profiles = db.query(FaceProfile).filter(
        FaceProfile.employee_id != payload.employee_id,
        FaceProfile.status == "ACTIVE",
    ).all()

    for prof in other_profiles:
        other_vec = prof.get_encoding_vector()
        if other_vec and len(other_vec) > 0:
            sim = compute_cosine_similarity(payload.encoding_vector, other_vec)
            if sim >= DUPLICATE_SIMILARITY_THRESHOLD:
                other_user = db.query(User).filter(
                    (User.id == prof.user_id) | (User.employee_id == prof.employee_id)
                ).first()
                dup_name = other_user.full_name if other_user else prof.employee_id
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=(
                        f"Dữ liệu khuôn mặt bị trùng lặp với nhân sự '{dup_name}' "
                        f"(Mã NV: {prof.employee_id}, Độ tương đồng: {sim * 100:.1f}%). "
                        f"Hệ thống từ chối đăng ký để đảm bảo tính duy nhất của danh tính sinh trắc học!"
                    ),
                )

    # 4. STEP 7: Save Face Profile & Activate User Status
    profile = db.query(FaceProfile).filter(FaceProfile.employee_id == payload.employee_id).first()
    now = datetime.now(timezone.utc)

    if not profile:
        profile = FaceProfile(
            user_id=user.id,
            employee_id=user.employee_id,
            status="ACTIVE",
            quality_score=payload.quality_score or 0.98,
            samples_count=payload.samples_count or 30,
            master_photo_url=payload.master_photo_url,
            registered_by=payload.registered_by or "Admin",
            notes=payload.notes,
            registered_at=now,
        )
        profile.set_encoding_vector(payload.encoding_vector)
        db.add(profile)
    else:
        profile.set_encoding_vector(payload.encoding_vector)
        profile.status = "ACTIVE"
        profile.quality_score = payload.quality_score or profile.quality_score
        profile.samples_count = (profile.samples_count or 0) + (payload.samples_count or 30)
        if payload.master_photo_url:
            profile.master_photo_url = payload.master_photo_url
        profile.updated_at = now

    # Also activate user status
    if user.status in ("WAITING", "DRAFT", "PENDING"):
        user.status = "ACTIVE"

    if payload.master_photo_url and not user.avatar_url:
        user.avatar_url = payload.master_photo_url

    # Record Audit Log
    audit = AuditLog(
        action="FACE_ENROLL",
        user_id=user.id,
        user_name=user.full_name,
        entity_type="face_profile",
        entity_id=user.employee_id,
        details={
            "employee_id": user.employee_id,
            "name": user.full_name,
            "samples_count": payload.samples_count or 30,
            "quality_score": payload.quality_score or 0.98,
            "timestamp": now.isoformat(),
        },
    )
    db.add(audit)
    db.commit()
    db.refresh(profile)

    # Broadcast Real-time WebSocket Event
    try:
        await ws_manager.broadcast({
            "type": "FACE_REGISTERED",
            "data": {
                "user_id": user.id,
                "employee_id": user.employee_id,
                "user_name": user.full_name,
                "status": "ACTIVE",
                "registered_at": now.isoformat(),
            }
        })
    except Exception:
        pass

    return FaceProfileOut(
        id=profile.id,
        employee_id=profile.employee_id,
        user_name=user.full_name,
        department=user.department,
        status=profile.status,
        quality_score=profile.quality_score,
        samples_count=profile.samples_count,
        has_vector=True,
        registered_at=profile.registered_at,
    )


@router.delete("/{employee_id}")
def delete_face_profile(
    employee_id: str,
    db: Session = Depends(get_db),
) -> Any:
    """
    Delete face profile of an employee.
    """
    profile = db.query(FaceProfile).filter(FaceProfile.employee_id == employee_id).first()
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Không tìm thấy hồ sơ khuôn mặt cho mã '{employee_id}'",
        )

    db.delete(profile)
    db.commit()
    return {"success": True, "message": f"Đã xóa hồ sơ khuôn mặt của {employee_id}"}
