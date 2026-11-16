"""
Role and permission management endpoints for FaceGate AI.
"""
from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import get_current_active_admin, get_current_user
from app.database.session import get_db
from app.models.audit import AuditLog
from app.models.user import Role, User, user_roles
from app.schemas.common import RoleOut, RoleUpdatePermissions

router = APIRouter()

AVAILABLE_PERMISSIONS = [
    {"category": "Dashboard", "key": "dashboard:view", "name": "Xem Dashboard & Thống kê"},
    {"category": "Users", "key": "users:view", "name": "Xem danh sách người dùng"},
    {"category": "Users", "key": "users:create", "name": "Tạo mới người dùng"},
    {"category": "Users", "key": "users:edit", "name": "Chỉnh sửa người dùng"},
    {"category": "Users", "key": "users:delete", "name": "Xóa người dùng"},
    {"category": "Face", "key": "face:enroll", "name": "Đăng ký & nạp khuôn mặt"},
    {"category": "Doors", "key": "doors:view", "name": "Xem trạng thái cửa"},
    {"category": "Doors", "key": "doors:control", "name": "Điều khiển Khóa / Mở cửa từ xa"},
    {"category": "Doors", "key": "doors:emergency", "name": "Kích hoạt Chế độ Khẩn cấp (Sơ tán / Phong tỏa)"},
    {"category": "Cameras", "key": "cameras:view", "name": "Xem luồng camera trực tiếp"},
    {"category": "Cameras", "key": "cameras:manage", "name": "Cấu hình camera & RTSP"},
    {"category": "Access Rules", "key": "access_rules:manage", "name": "Quản lý quy tắc phân quyền theo giờ"},
    {"category": "Reports", "key": "reports:view", "name": "Xem báo cáo chấm công & lưu lượng"},
    {"category": "Reports", "key": "reports:export", "name": "Xuất báo cáo Excel / CSV"},
    {"category": "Settings", "key": "settings:view", "name": "Xem cấu hình hệ thống"},
    {"category": "Settings", "key": "settings:edit", "name": "Chỉnh sửa cấu hình & Tham số AI"},
    {"category": "Audit", "key": "audit:view", "name": "Xem nhật ký kiểm toán (Audit Logs)"},
]


@router.get("/permissions/available", response_model=List[dict])
def get_available_permissions(
    current_user: User = Depends(get_current_user),
) -> Any:
    """
    Get full list of system permission keys available for role assignment.
    """
    return AVAILABLE_PERMISSIONS


@router.get("", response_model=List[RoleOut])
def list_roles(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Any:
    """
    List all defined system roles and assigned users count.
    """
    roles = db.query(Role).all()
    res = []
    for r in roles:
        # Count users assigned to this role
        cnt = db.query(user_roles).filter(user_roles.c.role_id == r.id).count()
        # Fallback count if users have string user.role
        if cnt == 0:
            cnt = db.query(User).filter(User.role == r.code, User.is_deleted == False).count()

        res.append(
            RoleOut(
                id=r.id,
                code=r.code,
                name=r.name,
                description=r.description,
                permissions=r.permissions if isinstance(r.permissions, list) else [],
                user_count=cnt,
                created_at=r.created_at,
            )
        )
    return res


@router.get("/{code}", response_model=RoleOut)
def get_role_detail(
    code: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Any:
    """
    Get details of a specific role by its code (ADMIN, OPERATOR, STAFF, SECURITY).
    """
    role = db.query(Role).filter(Role.code == code.upper()).first()
    if not role:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy vai trò")

    cnt = db.query(user_roles).filter(user_roles.c.role_id == role.id).count()
    if cnt == 0:
        cnt = db.query(User).filter(User.role == role.code, User.is_deleted == False).count()

    return RoleOut(
        id=role.id,
        code=role.code,
        name=role.name,
        description=role.description,
        permissions=role.permissions if isinstance(role.permissions, list) else [],
        user_count=cnt,
        created_at=role.created_at,
    )


@router.put("/{code}/permissions", response_model=RoleOut)
def update_role_permissions(
    code: str,
    payload: RoleUpdatePermissions,
    current_user: User = Depends(get_current_active_admin),
    db: Session = Depends(get_db),
) -> Any:
    """
    Update permission list for a role. Requires ADMIN role.
    """
    role = db.query(Role).filter(Role.code == code.upper()).first()
    if not role:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy vai trò")

    role.permissions = payload.permissions

    audit = AuditLog(
        action="ROLE_PERMISSIONS_UPDATE",
        user_id=current_user.id,
        user_name=current_user.full_name,
        entity_type="role",
        entity_id=role.id,
        details={"code": role.code, "permissions_count": len(payload.permissions)},
    )
    db.add(audit)
    db.commit()
    db.refresh(role)

    cnt = db.query(user_roles).filter(user_roles.c.role_id == role.id).count()
    return RoleOut(
        id=role.id,
        code=role.code,
        name=role.name,
        description=role.description,
        permissions=role.permissions,
        user_count=cnt,
        created_at=role.created_at,
    )
