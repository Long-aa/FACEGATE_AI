"""
Face Profile management endpoints for FaceGate AI.
Handles face embedding retrieval, enrollment, and profile status updates.
"""
from datetime import datetime, timezone
from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.face import FaceProfile
from app.models.user import User

router = APIRouter()


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
    samples_count: Optional[int] = 5
    master_photo_url: Optional[str] = None
    registered_by: Optional[str] = "Admin"
    notes: Optional[str] = None


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
def enroll_face_profile(
    payload: EnrollFaceRequest,
    db: Session = Depends(get_db),
) -> Any:
    """
    Register or update biometric face embedding vector for an employee.
    Automatically activates user status if pending or waiting.
    """
    user = db.query(User).filter(User.employee_id == payload.employee_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Không tìm thấy nhân viên với mã '{payload.employee_id}'",
        )

    profile = db.query(FaceProfile).filter(FaceProfile.employee_id == payload.employee_id).first()
    now = datetime.now(timezone.utc)

    if not profile:
        profile = FaceProfile(
            user_id=user.id,
            employee_id=user.employee_id,
            status="ACTIVE",
            quality_score=payload.quality_score,
            samples_count=payload.samples_count or 5,
            master_photo_url=payload.master_photo_url,
            registered_by=payload.registered_by,
            notes=payload.notes,
            registered_at=now,
        )
        profile.set_encoding_vector(payload.encoding_vector)
        db.add(profile)
    else:
        profile.set_encoding_vector(payload.encoding_vector)
        profile.status = "ACTIVE"
        profile.quality_score = payload.quality_score
        profile.samples_count = (profile.samples_count or 0) + (payload.samples_count or 1)
        profile.updated_at = now

    # Also activate user status
    if user.status in ("WAITING", "DRAFT", "PENDING"):
        user.status = "ACTIVE"

    db.commit()
    db.refresh(profile)

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
