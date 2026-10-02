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


def _validate_precheck_employee(employee_id: Optional[str], db: Session) -> dict:
    # 1. Format check: Empty or whitespace (IT02-01)
    if not employee_id or not employee_id.strip():
        return {
            "valid": False,
            "reason": "EMPTY_ID",
            "message": "Mã nhân viên không được để trống",
        }

    clean_id = employee_id.strip()

    # 2. Format check: Regex standard (IT02-02)
    if not re.match(r"^EMP-[A-Za-z0-9\-_]{2,26}$", clean_id) or "@" in clean_id:
        return {
            "valid": False,
            "reason": "FORMAT_INVALID",
            "message": "Định dạng mã nhân viên không hợp lệ",
        }

    # 3. Existence check in Database (IT02-03)
    user = db.query(User).filter(User.employee_id == clean_id).first()
    if not user:
        return {
            "valid": False,
            "reason": "USER_NOT_FOUND",
            "message": "Không tìm thấy nhân viên",
        }

    # 4. Active status check from Database (IT02-05)
    if user.status in ("LOCKED", "BLOCKED", "INACTIVE"):
        return {
            "valid": False,
            "reason": "ACCOUNT_LOCKED",
            "message": "Nhân viên đang ở trạng thái ngừng hoạt động/bị khóa",
            "employee_id": user.employee_id,
            "user_name": user.full_name,
            "full_name": user.full_name,
            "department": user.department or "Khối Vận hành",
            "position": user.position or "Nhân viên",
            "status": user.status,
            "face_enrolled": False,
        }

    # 5. Check existing face profile in Database (IT02-04)
    existing_profile = db.query(FaceProfile).filter(
        FaceProfile.employee_id == user.employee_id,
        FaceProfile.status == "ACTIVE",
    ).first()
    has_prior_face = bool(existing_profile and existing_profile.has_vector())
    if has_prior_face:
        return {
            "valid": False,
            "already_enrolled": True,
            "reason": "ALREADY_ENROLLED",
            "message": "Nhân viên đã đăng ký khuôn mặt trước đó",
            "id": user.id,
            "employee_id": user.employee_id,
            "user_name": user.full_name,
            "full_name": user.full_name,
            "department": user.department or "Khối Vận hành",
            "position": user.position or "Nhân viên",
            "role": user.role or user.position or "Nhân viên",
            "email": user.email,
            "phone": user.phone,
            "avatar_url": user.avatar_url,
            "status": user.status,
            "face_enrolled": True,
        }

    # 6. Employee is valid and ready for camera capture
    return {
        "valid": True,
        "already_enrolled": False,
        "message": f"Hồ sơ nhân viên '{user.full_name}' hợp lệ, sẵn sàng thu nạp dữ liệu khuôn mặt.",
        "id": user.id,
        "employee_id": user.employee_id,
        "user_name": user.full_name,
        "full_name": user.full_name,
        "department": user.department or "Khối Vận hành",
        "position": user.position or "Nhân viên",
        "role": user.role or user.position or "Nhân viên",
        "email": user.email,
        "phone": user.phone,
        "avatar_url": user.avatar_url,
        "status": user.status,
        "face_enrolled": False,
    }


@router.get("/pre-check")
def pre_check_enrollment_query(
    employee_id: Optional[str] = Query(None, description="Employee ID to pre-check"),
    db: Session = Depends(get_db),
) -> Any:
    """Pre-check employee via query parameter (supports empty strings for IT02-01)."""
    return _validate_precheck_employee(employee_id, db)


@router.get("/pre-check/{employee_id}")
def pre_check_enrollment(
    employee_id: str,
    db: Session = Depends(get_db),
) -> Any:
    """
    Step 3 Pre-condition verification before starting face enrollment:
    1. Employee ID format verification (IT02-01, IT02-02).
    2. Employee existence in database (IT02-03).
    3. Employee active status check (IT02-05).
    4. Prior Face ID registration detection (IT02-04).
    """
    return _validate_precheck_employee(employee_id, db)


class CameraCheckRequest(BaseModel):
    camera_index: Optional[int] = 0
    device_id: Optional[str] = None
    width: Optional[int] = 1280
    height: Optional[int] = 720
    is_opened: Optional[bool] = True
    permission_granted: Optional[bool] = True
    frame_empty: Optional[bool] = False


@router.post("/verify-camera")
def verify_camera_feed(payload: CameraCheckRequest) -> Any:
    """
    Validate camera device capabilities according to IT02-06 through IT02-10:
    - IT02-06: Chỉ số camera không hợp lệ
    - IT02-07: Camera không được mở
    - IT02-08: Không có quyền truy cập camera
    - IT02-09: Camera không đọc được hình ảnh
    - IT02-10: Độ phân giải camera không hợp lệ
    """
    # IT02-06: Camera index invalid
    if payload.camera_index is None or payload.camera_index < 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Chỉ số camera không hợp lệ",
        )

    # IT02-08: Permission denied
    if payload.permission_granted is False:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Không có quyền truy cập camera",
        )

    # IT02-07: Camera cannot open
    if payload.is_opened is False:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Không thể mở camera",
        )

    # IT02-09: Frame empty or cannot read
    if payload.frame_empty is True:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Không đọc được hình ảnh từ camera",
        )

    # IT02-10: Invalid resolution (< 640x480)
    w = payload.width or 0
    h = payload.height or 0
    if w < 640 or h < 480:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Độ phân giải hình ảnh camera không hợp lệ",
        )

    return {
        "success": True,
        "message": "Camera hoạt động bình thường và đáp ứng tiêu chuẩn",
        "resolution": f"{w}x{h}",
        "camera_index": payload.camera_index,
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
    Enforces IT02-01 through IT02-10 with DB transactional persistence.
    """
    # 1. IT02-01: Empty or whitespace employee_id
    if not payload.employee_id or not payload.employee_id.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mã nhân viên không được để trống",
        )

    clean_id = payload.employee_id.strip()

    # 2. IT02-02: Format check
    if not re.match(r"^EMP-[A-Za-z0-9\-_]{2,26}$", clean_id) or "@" in clean_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Định dạng mã nhân viên không hợp lệ",
        )

    # 3. IT02-03: Check User existence in DB
    user = db.query(User).filter(User.employee_id == clean_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy nhân viên",
        )

    # 4. IT02-05: Check User status in DB
    if user.status in ("LOCKED", "BLOCKED", "INACTIVE"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Nhân viên đang ở trạng thái ngừng hoạt động/bị khóa",
        )

    # 5. IT02-04: Check prior active face registration in DB
    existing_profile = db.query(FaceProfile).filter(
        FaceProfile.employee_id == clean_id,
        FaceProfile.status == "ACTIVE",
    ).first()
    if existing_profile and existing_profile.has_vector():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Nhân viên đã đăng ký khuôn mặt trước đó",
        )

    # 6. IT02-09: Frame & biometric vector validation
    if not payload.encoding_vector or len(payload.encoding_vector) < 16:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Không đọc được hình ảnh từ camera",
        )

    vector_mag = sum(abs(x) for x in payload.encoding_vector)
    if vector_mag < 0.001:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Không đọc được hình ảnh từ camera",
        )

    # 7. IT02-10: Resolution & Quality validation
    if payload.quality_score is not None and payload.quality_score < 0.5:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Độ phân giải hình ảnh camera không hợp lệ",
        )

    # 8. Duplicate Face Defense (Compare with other active users)
    DUPLICATE_SIMILARITY_THRESHOLD = 0.72
    other_profiles = db.query(FaceProfile).filter(
        FaceProfile.employee_id != clean_id,
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

    # 9. Transactional Profile Persistence
    profile = db.query(FaceProfile).filter(FaceProfile.employee_id == clean_id).first()
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

    if user.status in ("WAITING", "DRAFT", "PENDING"):
        user.status = "ACTIVE"

    if payload.master_photo_url and not user.avatar_url:
        user.avatar_url = payload.master_photo_url

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

    try:
        db.commit()
        db.refresh(profile)
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Lỗi lưu trữ dữ liệu vào CSDL. Thao tác đã được hủy (rollback).",
        )

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
