"""
User management endpoints for FaceGate AI.
Provides full CRUD, searching, filtering, status toggling, and access history directly from PostgreSQL.
"""
from datetime import datetime, timezone
import math
from typing import Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.core.security import get_current_active_admin, get_current_user, get_password_hash
from app.database.session import get_db
from app.models.access_log import AccessLog
from app.models.audit import AuditLog
from app.models.face import FaceProfile
from app.models.user import Role, User
from app.schemas.common import (
    AccessLogOut,
    UserCreate,
    UserListResponse,
    UserOut,
    UserStatusUpdate,
    UserUpdate,
)

router = APIRouter()


def _to_user_out(user: User) -> UserOut:
    has_face = bool(user.face_profile and user.face_profile.status == "ACTIVE")
    reg_date = user.created_at.strftime("%d/%m/%Y") if user.created_at else ""
    return UserOut(
        id=user.id,
        employee_id=user.employee_id,
        full_name=user.full_name,
        email=user.email,
        phone=user.phone,
        department=user.department,
        position=user.position,
        role=user.role,
        status=user.status,
        card_number=user.card_number,
        has_face_profile=has_face,
        face_status="ok" if has_face else "missing",
        registered_date=reg_date,
        created_at=user.created_at,
        updated_at=user.updated_at,
    )


@router.get("", response_model=UserListResponse)
def list_users(
    q: Optional[str] = Query(None, description="Search by name, employee ID, or email"),
    department: Optional[str] = Query(None, description="Filter by department"),
    status: Optional[str] = Query(None, description="Filter by status (ACTIVE, WAITING, DRAFT, LOCKED)"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
) -> Any:
    """
    List users with search, department/status filtering, and pagination.
    """
    query = db.query(User)

    if q:
        search_str = f"%{q.strip()}%"
        query = query.filter(
            or_(
                User.full_name.ilike(search_str),
                User.employee_id.ilike(search_str),
                User.email.ilike(search_str),
            )
        )

    if department:
        query = query.filter(
            or_(
                User.department == department,
                User.department.ilike(f"%{department.strip()}%"),
            )
        )

    if status:
        query = query.filter(User.status == status)

    total = query.count()
    users = (
        query.order_by(User.created_at.desc())
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )

    items = [_to_user_out(u) for u in users]
    total_pages = math.ceil(total / limit) if total > 0 else 1

    return UserListResponse(
        items=items,
        total=total,
        page=page,
        limit=limit,
        total_pages=total_pages,
    )


@router.post("", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def create_user(
    payload: UserCreate,
    current_user: User = Depends(get_current_active_admin),
    db: Session = Depends(get_db),
) -> Any:
    """
    Create a new user/employee in the database.
    """
    # Check duplicate employee_id
    if db.query(User).filter(User.employee_id == payload.employee_id).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Mã nhân viên '{payload.employee_id}' đã tồn tại trong hệ thống.",
        )

    # Check duplicate email
    if payload.email and db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Email '{payload.email}' đã được sử dụng.",
        )

    hashed_pw = get_password_hash(payload.password) if payload.password else get_password_hash("Password@123")

    user = User(
        employee_id=payload.employee_id,
        full_name=payload.full_name,
        email=payload.email,
        phone=payload.phone,
        department=payload.department,
        position=payload.position,
        role=payload.role,
        status=payload.status,
        card_number=payload.card_number,
        hashed_password=hashed_pw,
    )

    role_record = db.query(Role).filter(Role.code == payload.role).first()
    if role_record:
        user.roles.append(role_record)

    db.add(user)
    db.flush()

    audit = AuditLog(
        action="USER_CREATE",
        user_id=current_user.id,
        user_name=current_user.full_name,
        entity_type="user",
        entity_id=user.id,
        details={"employee_id": user.employee_id, "name": user.full_name},
    )
    db.add(audit)
    db.commit()
    db.refresh(user)

    return _to_user_out(user)


@router.get("/{user_id}", response_model=UserOut)
def get_user_detail(
    user_id: str,
    db: Session = Depends(get_db),
) -> Any:
    """
    Get detailed information of a single user.
    """
    user = db.query(User).filter((User.id == user_id) | (User.employee_id == user_id)).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy người dùng",
        )
    return _to_user_out(user)


@router.put("/{user_id}", response_model=UserOut)
def update_user(
    user_id: str,
    payload: UserUpdate,
    current_user: User = Depends(get_current_active_admin),
    db: Session = Depends(get_db),
) -> Any:
    """
    Update user information.
    """
    user = db.query(User).filter((User.id == user_id) | (User.employee_id == user_id)).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy người dùng",
        )

    if payload.full_name is not None:
        user.full_name = payload.full_name
    if payload.email is not None:
        user.email = payload.email
    if payload.phone is not None:
        user.phone = payload.phone
    if payload.department is not None:
        user.department = payload.department
    if payload.position is not None:
        user.position = payload.position
    if payload.role is not None:
        user.role = payload.role
    if payload.status is not None:
        user.status = payload.status
    if payload.card_number is not None:
        user.card_number = payload.card_number
    if payload.password:
        user.hashed_password = get_password_hash(payload.password)

    audit = AuditLog(
        action="USER_UPDATE",
        user_id=current_user.id,
        user_name=current_user.full_name,
        entity_type="user",
        entity_id=user.id,
        details={"updated_fields": list(payload.model_dump(exclude_unset=True).keys())},
    )
    db.add(audit)
    db.commit()
    db.refresh(user)

    return _to_user_out(user)


@router.put("/{user_id}/status", response_model=UserOut)
def update_user_status(
    user_id: str,
    payload: UserStatusUpdate,
    current_user: User = Depends(get_current_active_admin),
    db: Session = Depends(get_db),
) -> Any:
    """
    Update status of user (e.g. ACTIVE -> LOCKED, or LOCKED -> ACTIVE).
    """
    user = db.query(User).filter((User.id == user_id) | (User.employee_id == user_id)).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy người dùng",
        )

    old_status = user.status
    user.status = payload.status

    audit = AuditLog(
        action="USER_STATUS_CHANGE",
        user_id=current_user.id,
        user_name=current_user.full_name,
        entity_type="user",
        entity_id=user.id,
        details={"old_status": old_status, "new_status": payload.status},
    )
    db.add(audit)
    db.commit()
    db.refresh(user)

    return _to_user_out(user)


@router.delete("/{user_id}")
def delete_user(
    user_id: str,
    current_user: User = Depends(get_current_active_admin),
    db: Session = Depends(get_db),
) -> Any:
    """
    Delete a user from the database (cascades face profile and access rules).
    """
    user = db.query(User).filter((User.id == user_id) | (User.employee_id == user_id)).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy người dùng",
        )

    if user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Không thể xóa tài khoản Quản trị viên tối cao",
        )

    audit = AuditLog(
        action="USER_DELETE",
        user_id=current_user.id,
        user_name=current_user.full_name,
        entity_type="user",
        entity_id=user.id,
        details={"employee_id": user.employee_id, "name": user.full_name},
    )
    db.add(audit)
    db.delete(user)
    db.commit()

    return {"success": True, "message": f"Đã xóa người dùng {user.full_name}"}


@router.get("/{user_id}/access-history")
def get_user_access_history(
    user_id: str,
    limit: int = 10,
    db: Session = Depends(get_db),
) -> Any:
    """
    Get recent access history for a specific user from database.
    """
    user = db.query(User).filter((User.id == user_id) | (User.employee_id == user_id)).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy người dùng",
        )

    logs = (
        db.query(AccessLog)
        .filter((AccessLog.user_id == user.id) | (AccessLog.employee_id == user.employee_id))
        .order_by(AccessLog.timestamp.desc())
        .limit(limit)
        .all()
    )

    result = []
    for log in logs:
        ts = log.timestamp or datetime.now(timezone.utc)
        result.append({
            "location": log.door_name or "Cửa chính",
            "time": ts.strftime("%H:%M:%S"),
            "day": ts.strftime("%d/%m"),
            "type": "in" if log.result == "GRANTED" else "denied",
            "confidence": log.confidence,
        })
    return result
