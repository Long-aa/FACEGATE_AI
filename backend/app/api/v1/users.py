"""
User management endpoints for FaceGate AI.
Provides full CRUD, searching, filtering, status toggling, and access history directly from PostgreSQL.
"""
from datetime import datetime, timezone
import math
import re
from typing import Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.core.security import get_current_active_admin, get_current_user, get_password_hash
from app.database.session import get_db
from app.models.access_log import AccessLog
from app.models.access_rule import AccessRule
from app.models.audit import AuditLog
from app.models.door import Door
from app.models.face import FaceProfile
from app.models.user import Role, User
from app.websocket.manager import ws_manager
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
    access_areas = []
    if user.access_rules:
        access_areas = [r.door.name for r in user.access_rules if r.door and r.is_active]
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
        avatar_url=user.avatar_url or (user.face_profile.master_photo_url if user.face_profile else None),
        access_areas=access_areas,
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
async def create_user(
    payload: UserCreate,
    current_user: User = Depends(get_current_active_admin),
    db: Session = Depends(get_db),
) -> Any:
    """
    Create a new user/employee in the database following E2E Step 1 & Step 2.
    """
    # 1. Validate full_name
    if not payload.full_name or len(payload.full_name.strip()) < 2:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Họ và tên người dùng phải có ít nhất 2 ký tự.",
        )

    # 2. Check / Generate employee_id according to rules
    employee_id = payload.employee_id.strip() if payload.employee_id else None
    if not employee_id:
        # Auto generate EMP-XXXX with no collision
        max_num = 1000
        existing_emp_ids = db.query(User.employee_id).filter(User.employee_id.like("EMP-%")).all()
        for (eid,) in existing_emp_ids:
            m = re.match(r"^EMP-(\d+)$", eid)
            if m:
                num = int(m.group(1))
                if num > max_num:
                    max_num = num
        employee_id = f"EMP-{max_num + 1:04d}"
    else:
        # Validate format
        if not re.match(r"^[A-Za-z0-9\-_]{3,30}$", employee_id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Mã nhân viên '{employee_id}' không đúng định dạng quy chuẩn (3-30 ký tự gồm chữ cái, số, gạch nối hoặc gạch dưới).",
            )
        # Check duplicate employee_id
        if db.query(User).filter(User.employee_id == employee_id).first():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Mã nhân viên '{employee_id}' đã tồn tại trong hệ thống.",
            )

    # 3. Check / Validate email
    email = payload.email.strip() if payload.email else None
    if email:
        email_pattern = r"^[\w\.\+\-]+@[\w\-]+\.[a-zA-Z]{2,}$"
        if not re.match(email_pattern, email):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Email '{email}' không đúng định dạng.",
            )
        if db.query(User).filter(User.email == email).first():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Email '{email}' đã được sử dụng bởi người dùng khác.",
            )

    # 4. Check phone if provided
    phone = payload.phone.strip() if payload.phone else None
    if phone:
        if not re.match(r"^\+?[0-9\s\.\-]{8,20}$", phone):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Số điện thoại '{phone}' không hợp lệ.",
            )

    hashed_pw = get_password_hash(payload.password) if payload.password else get_password_hash("Password@123")

    # Ready for Face ID -> default WAITING if not specified
    user_status = payload.status if payload.status in ("ACTIVE", "WAITING", "DRAFT", "LOCKED") else "WAITING"

    user = User(
        employee_id=employee_id,
        full_name=payload.full_name.strip(),
        email=email,
        phone=phone,
        department=payload.department.strip() if payload.department else "Khối Kỹ thuật & R&D",
        position=payload.position.strip() if payload.position else "Nhân viên",
        role=payload.role or "STAFF",
        status=user_status,
        card_number=payload.card_number,
        avatar_url=payload.avatar_url,
        hashed_password=hashed_pw,
    )

    role_record = db.query(Role).filter(Role.code == (payload.role or "STAFF")).first()
    if role_record:
        user.roles.append(role_record)

    db.add(user)
    db.flush()

    # Step 2: Access Control Mapping - create AccessRule for each assigned door
    if payload.access_areas and len(payload.access_areas) > 0:
        all_doors = db.query(Door).all()
        for area_name in payload.access_areas:
            matched_door = next((d for d in all_doors if d.name == area_name or d.id == area_name or d.door_code == area_name), None)
            if matched_door:
                rule = AccessRule(
                    name=f"Quyền {matched_door.name} - {user.full_name}",
                    user_id=user.id,
                    door_id=matched_door.id,
                    start_time="00:00:00",
                    end_time="23:59:59",
                    allowed_days=[1, 2, 3, 4, 5, 6, 7],
                    is_active=True,
                )
                db.add(rule)

    audit = AuditLog(
        action="USER_CREATE",
        user_id=current_user.id,
        user_name=current_user.full_name,
        entity_type="user",
        entity_id=user.id,
        details={
            "employee_id": user.employee_id,
            "name": user.full_name,
            "status": user.status,
            "has_avatar": bool(user.avatar_url),
            "access_areas": payload.access_areas or [],
        },
    )
    db.add(audit)
    db.commit()
    db.refresh(user)

    # Real-time WebSocket Broadcast
    try:
        await ws_manager.broadcast({
            "type": "USER_CREATED",
            "data": {
                "id": user.id,
                "employee_id": user.employee_id,
                "full_name": user.full_name,
                "status": user.status,
            }
        })
    except Exception:
        pass

    return _to_user_out(user)


@router.get("/next-employee-id")
def get_next_employee_id(db: Session = Depends(get_db)) -> Any:
    """
    Generate next available employee ID in format EMP-xxxx (read-only auto ID).
    """
    max_num = 1000
    existing_emp_ids = db.query(User.employee_id).filter(User.employee_id.like("EMP-%")).all()
    for (eid,) in existing_emp_ids:
        m = re.match(r"^EMP-(\d+)$", eid)
        if m:
            num = int(m.group(1))
            if num > max_num:
                max_num = num
    next_id = f"EMP-{max_num + 1:04d}"
    return {"employee_id": next_id, "locked": True, "format": "EMP-xxxx"}


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
async def update_user(
    user_id: str,
    payload: UserUpdate,
    current_user: User = Depends(get_current_active_admin),
    db: Session = Depends(get_db),
) -> Any:
    """
    Update user information, access areas, and avatar.
    """
    user = db.query(User).filter((User.id == user_id) | (User.employee_id == user_id)).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy người dùng",
        )

    if "full_name" in payload.model_fields_set and payload.full_name is not None:
        cleaned_name = payload.full_name.strip()
        if len(cleaned_name) < 2:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Họ và tên người dùng phải có ít nhất 2 ký tự.",
            )
        user.full_name = cleaned_name

    if "email" in payload.model_fields_set:
        email = payload.email.strip() if payload.email and payload.email.strip() else None
        if email:
            email_pattern = r"^[\w\.\+\-]+@[\w\-]+\.[a-zA-Z]{2,}$"
            if not re.match(email_pattern, email):
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Email '{email}' không đúng định dạng.")
            dup = db.query(User).filter(User.email == email, User.id != user.id).first()
            if dup:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Email '{email}' đã được sử dụng.")
        user.email = email

    if "phone" in payload.model_fields_set:
        user.phone = payload.phone.strip() if payload.phone and payload.phone.strip() else None

    if "department" in payload.model_fields_set:
        user.department = payload.department.strip() if payload.department and payload.department.strip() else None

    if "position" in payload.model_fields_set:
        user.position = payload.position.strip() if payload.position and payload.position.strip() else None

    if "role" in payload.model_fields_set and payload.role is not None:
        user.role = payload.role

    if "status" in payload.model_fields_set and payload.status is not None:
        valid_statuses = ("ACTIVE", "WAITING", "DRAFT", "LOCKED", "INACTIVE", "BLOCKED")
        if payload.status in valid_statuses:
            user.status = payload.status

    if "card_number" in payload.model_fields_set:
        user.card_number = payload.card_number.strip() if payload.card_number and payload.card_number.strip() else None

    if "avatar_url" in payload.model_fields_set:
        cleaned_avatar = payload.avatar_url.strip() if payload.avatar_url and payload.avatar_url.strip() else None
        user.avatar_url = cleaned_avatar
        if user.face_profile:
            user.face_profile.master_photo_url = cleaned_avatar

    if payload.password:
        user.hashed_password = get_password_hash(payload.password)

    # Sync access areas into access_rules
    if payload.access_areas is not None:
        db.query(AccessRule).filter(AccessRule.user_id == user.id).delete(synchronize_session=False)
        all_doors = db.query(Door).all()
        for area_name in payload.access_areas:
            name_clean = area_name.strip()
            matched_door = next((d for d in all_doors if d.name.strip().lower() == name_clean.lower() or d.id == name_clean or d.door_code.strip().lower() == name_clean.lower()), None)
            if not matched_door:
                # Auto-register new door if not exists
                door_code = f"D-{len(all_doors) + 1:03d}"
                matched_door = Door(
                    door_code=door_code,
                    name=name_clean,
                    location="Khu vực tòa nhà",
                    door_type="entrance",
                    status="Online",
                    lock_status="Locked",
                )
                db.add(matched_door)
                db.flush()
                all_doors.append(matched_door)

            rule = AccessRule(
                name=f"Quyền {matched_door.name} - {user.full_name}",
                user_id=user.id,
                door_id=matched_door.id,
                start_time="00:00:00",
                end_time="23:59:59",
                allowed_days=[1, 2, 3, 4, 5, 6, 7],
                is_active=True,
            )
            db.add(rule)

    user.updated_at = datetime.now(timezone.utc)

    audit = AuditLog(
        action="USER_UPDATE",
        user_id=current_user.id,
        user_name=current_user.full_name,
        entity_type="user",
        entity_id=user.id,
        details={"updated_fields": list(payload.model_dump(exclude_unset=True).keys())},
    )
    db.add(audit)

    try:
        db.commit()
        db.refresh(user)
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi khi lưu thông tin người dùng vào CSDL: {str(e)}",
        )

    try:
        await ws_manager.broadcast({
            "type": "USER_UPDATED",
            "data": {
                "id": user.id,
                "employee_id": user.employee_id,
                "full_name": user.full_name,
                "status": user.status,
            }
        })
    except Exception:
        pass

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
async def delete_user(
    user_id: str,
    current_user: User = Depends(get_current_active_admin),
    db: Session = Depends(get_db),
) -> Any:
    """
    Delete a user from PostgreSQL database:
    1. Check authorization and prevent deletion of root admin (EMP-0001, is_superuser).
    2. Explicitly remove associated FaceProfile biometric records.
    3. Remove user-specific AccessRules.
    4. Disconnect user_id on AccessLogs to maintain security audit history.
    5. Write AuditLog entry.
    6. Delete User entity.
    7. Broadcast real-time WebSocket event USER_DELETED.
    """
    user = db.query(User).filter((User.id == user_id) | (User.employee_id == user_id)).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy người dùng",
        )

    if user.is_superuser or user.employee_id == "EMP-0001":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Không thể xóa tài khoản Quản trị viên tối cao (EMP-0001) của hệ thống",
        )

    user_full_name = user.full_name
    employee_code = user.employee_id
    user_uuid = user.id

    # 1. Clean up biometric FaceProfile
    db.query(FaceProfile).filter(
        (FaceProfile.user_id == user_uuid) | (FaceProfile.employee_id == employee_code)
    ).delete(synchronize_session=False)

    # 2. Clean up AccessRules
    db.query(AccessRule).filter(
        AccessRule.user_id == user_uuid
    ).delete(synchronize_session=False)

    # 3. Disconnect user_id on AccessLogs to maintain history without foreign key conflicts
    db.query(AccessLog).filter(
        (AccessLog.user_id == user_uuid) | (AccessLog.employee_id == employee_code)
    ).update({"user_id": None}, synchronize_session=False)

    # 4. Record Audit Log
    audit = AuditLog(
        action="USER_DELETE",
        user_id=current_user.id,
        user_name=current_user.full_name,
        entity_type="user",
        entity_id=user_uuid,
        details={
            "employee_id": employee_code,
            "name": user_full_name,
            "deleted_by": current_user.full_name,
            "deleted_at": datetime.now(timezone.utc).isoformat(),
        },
    )
    db.add(audit)

    # 5. Delete User
    db.delete(user)
    db.commit()

    # 6. Broadcast Real-time WebSocket Event
    try:
        await ws_manager.broadcast({
            "type": "USER_DELETED",
            "data": {
                "user_id": user_uuid,
                "employee_id": employee_code,
                "full_name": user_full_name,
            }
        })
    except Exception:
        pass

    return {
        "success": True,
        "message": f"Đã xóa vĩnh viễn người dùng '{user_full_name}' ({employee_code}) cùng dữ liệu khuôn mặt và phân quyền liên quan.",
        "user_id": user_uuid,
        "employee_id": employee_code,
    }


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
