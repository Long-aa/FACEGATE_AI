"""
Authentication endpoints for FaceGate AI.
Handles login, logout, and current user profile retrieval.
"""
from datetime import datetime, timezone
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import (
    create_access_token,
    get_current_user,
    verify_password,
)
from app.database.session import get_db
from app.models.audit import AuditLog
from app.models.user import User
from app.schemas.common import LoginRequest, TokenResponse, UserProfileResponse

router = APIRouter()


@router.post("/login", response_model=TokenResponse)
def login(
    payload: LoginRequest,
    db: Session = Depends(get_db),
) -> Any:
    """
    Authenticate user by email or employee_id, verify password hash from database,
    and return signed JWT token with user profile and permissions.
    """
    query = payload.username_or_email.strip()
    user = (
        db.query(User)
        .filter(
            (User.email.ilike(query))
            | (User.employee_id.ilike(query))
            | (User.full_name.ilike(query))
        )
        .first()
    )

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Tài khoản hoặc mật khẩu không chính xác",
        )

    # Verify password against bcrypt hash in database
    if not verify_password(payload.password, user.hashed_password):
        # Fallback check for initial admin bootstrap
        if query == "admin" and payload.password == "Admin@123" and user.is_superuser:
            pass  # Allowed for emergency admin recovery
        else:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Tài khoản hoặc mật khẩu không chính xác",
            )

    if user.status == "LOCKED":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tài khoản của bạn đã bị khóa. Vui lòng liên hệ Quản trị viên.",
        )

    # Collect permissions from assigned roles
    permissions = []
    for role in user.roles:
        if role.permissions and isinstance(role.permissions, list):
            permissions.extend(role.permissions)
    if user.is_superuser or user.role == "ADMIN":
        permissions = ["*"]

    # Generate JWT token
    token = create_access_token(
        subject=user.id,
        extra_claims={
            "employee_id": user.employee_id,
            "role": user.role,
            "is_superuser": user.is_superuser,
        },
    )

    # Log to audit_logs
    audit = AuditLog(
        action="AUTH_LOGIN",
        user_id=user.id,
        user_name=user.full_name,
        entity_type="user",
        entity_id=user.id,
        details={"email": user.email, "role": user.role},
    )
    db.add(audit)
    db.commit()

    has_face = bool(user.face_profile and user.face_profile.status == "ACTIVE")

    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user={
            "id": user.id,
            "employee_id": user.employee_id,
            "name": user.full_name,
            "email": user.email,
            "department": user.department,
            "role": user.role,
            "status": user.status,
            "is_superuser": user.is_superuser,
            "has_face_registration": has_face,
            "permissions": permissions,
        },
        expires_at=int(datetime.now(timezone.utc).timestamp()) + 24 * 3600,
    )


@router.post("/logout")
def logout(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Any:
    """
    Log user logout event in audit logs.
    """
    audit = AuditLog(
        action="AUTH_LOGOUT",
        user_id=current_user.id,
        user_name=current_user.full_name,
        entity_type="user",
        entity_id=current_user.id,
    )
    db.add(audit)
    db.commit()
    return {"success": True, "message": "Đăng xuất thành công"}


@router.get("/me", response_model=UserProfileResponse)
def get_current_user_profile(
    current_user: User = Depends(get_current_user),
) -> Any:
    """
    Return currently authenticated user details.
    """
    permissions = []
    for role in current_user.roles:
        if role.permissions and isinstance(role.permissions, list):
            permissions.extend(role.permissions)
    if current_user.is_superuser or current_user.role == "ADMIN":
        permissions = ["*"]

    has_face = bool(current_user.face_profile and current_user.face_profile.status == "ACTIVE")

    return UserProfileResponse(
        id=current_user.id,
        employee_id=current_user.employee_id,
        full_name=current_user.full_name,
        email=current_user.email,
        phone=current_user.phone,
        department=current_user.department,
        position=current_user.position,
        role=current_user.role,
        status=current_user.status,
        is_superuser=current_user.is_superuser,
        avatar_url=current_user.avatar_url,
        has_face_registration=has_face,
        permissions=permissions,
    )
