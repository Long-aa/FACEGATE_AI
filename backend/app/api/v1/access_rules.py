"""
Access rules management endpoints for FaceGate AI.
Allows defining time-based and department-based access control policies per door.
"""
from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.security import get_current_active_admin, get_current_user
from app.database.session import get_db
from app.models.access_rule import AccessRule
from app.models.audit import AuditLog
from app.models.door import Door
from app.models.user import User
from app.schemas.common import (
    AccessRuleCreate,
    AccessRuleOut,
    AccessRuleUpdate,
)

router = APIRouter()


def _to_rule_out(rule: AccessRule) -> AccessRuleOut:
    return AccessRuleOut(
        id=rule.id,
        name=rule.name,
        description=rule.description,
        door_id=rule.door_id,
        door_name=rule.door.name if rule.door else None,
        user_id=rule.user_id,
        user_name=rule.user.full_name if rule.user else None,
        department=rule.department,
        start_time=rule.start_time,
        end_time=rule.end_time,
        allowed_days=rule.allowed_days if isinstance(rule.allowed_days, list) else [1, 2, 3, 4, 5, 6, 7],
        is_active=rule.is_active,
        created_at=rule.created_at,
        updated_at=rule.updated_at,
    )


@router.get("", response_model=List[AccessRuleOut])
def list_access_rules(
    door_id: Optional[str] = Query(None, description="Filter by door ID"),
    department: Optional[str] = Query(None, description="Filter by department"),
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Any:
    """
    List all access rules with optional filters.
    """
    query = db.query(AccessRule)
    if door_id:
        query = query.filter(AccessRule.door_id == door_id)
    if department:
        query = query.filter(AccessRule.department.ilike(f"%{department.strip()}%"))
    if is_active is not None:
        query = query.filter(AccessRule.is_active == is_active)

    rules = query.order_by(AccessRule.created_at.desc()).all()
    return [_to_rule_out(r) for r in rules]


@router.post("", response_model=AccessRuleOut, status_code=status.HTTP_201_CREATED)
def create_access_rule(
    payload: AccessRuleCreate,
    current_user: User = Depends(get_current_active_admin),
    db: Session = Depends(get_db),
) -> Any:
    """
    Create a new access rule for a door. Requires ADMIN role.
    """
    # Verify door exists
    door = db.query(Door).filter(Door.id == payload.door_id).first()
    if not door:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Cửa với ID '{payload.door_id}' không tồn tại",
        )

    # Verify user exists if specified
    if payload.user_id:
        user = db.query(User).filter(User.id == payload.user_id).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Nhân viên với ID '{payload.user_id}' không tồn tại",
            )

    rule = AccessRule(
        name=payload.name,
        description=payload.description,
        door_id=payload.door_id,
        user_id=payload.user_id,
        department=payload.department,
        start_time=payload.start_time,
        end_time=payload.end_time,
        allowed_days=payload.allowed_days,
        is_active=payload.is_active,
    )
    db.add(rule)

    audit = AuditLog(
        action="ACCESS_RULE_CREATE",
        user_id=current_user.id,
        user_name=current_user.full_name,
        entity_type="access_rule",
        entity_id=rule.id,
        details={"name": rule.name, "door_id": rule.door_id, "department": rule.department},
    )
    db.add(audit)
    db.commit()
    db.refresh(rule)

    return _to_rule_out(rule)


@router.get("/{rule_id}", response_model=AccessRuleOut)
def get_access_rule(
    rule_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Any:
    """
    Get detailed information of a single access rule.
    """
    rule = db.query(AccessRule).filter(AccessRule.id == rule_id).first()
    if not rule:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy quy tắc truy cập")
    return _to_rule_out(rule)


@router.put("/{rule_id}", response_model=AccessRuleOut)
def update_access_rule(
    rule_id: str,
    payload: AccessRuleUpdate,
    current_user: User = Depends(get_current_active_admin),
    db: Session = Depends(get_db),
) -> Any:
    """
    Update an access rule. Requires ADMIN role.
    """
    rule = db.query(AccessRule).filter(AccessRule.id == rule_id).first()
    if not rule:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy quy tắc truy cập")

    if payload.name is not None:
        rule.name = payload.name
    if payload.description is not None:
        rule.description = payload.description
    if payload.door_id is not None:
        rule.door_id = payload.door_id
    if payload.user_id is not None:
        rule.user_id = payload.user_id
    if payload.department is not None:
        rule.department = payload.department
    if payload.start_time is not None:
        rule.start_time = payload.start_time
    if payload.end_time is not None:
        rule.end_time = payload.end_time
    if payload.allowed_days is not None:
        rule.allowed_days = payload.allowed_days
    if payload.is_active is not None:
        rule.is_active = payload.is_active

    audit = AuditLog(
        action="ACCESS_RULE_UPDATE",
        user_id=current_user.id,
        user_name=current_user.full_name,
        entity_type="access_rule",
        entity_id=rule.id,
        details={"name": rule.name, "is_active": rule.is_active},
    )
    db.add(audit)
    db.commit()
    db.refresh(rule)

    return _to_rule_out(rule)


@router.delete("/{rule_id}")
def delete_access_rule(
    rule_id: str,
    current_user: User = Depends(get_current_active_admin),
    db: Session = Depends(get_db),
) -> Any:
    """
    Delete an access rule. Requires ADMIN role.
    """
    rule = db.query(AccessRule).filter(AccessRule.id == rule_id).first()
    if not rule:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy quy tắc truy cập")

    rule_name = rule.name
    db.delete(rule)

    audit = AuditLog(
        action="ACCESS_RULE_DELETE",
        user_id=current_user.id,
        user_name=current_user.full_name,
        entity_type="access_rule",
        entity_id=rule_id,
        details={"name": rule_name},
    )
    db.add(audit)
    db.commit()

    return {"success": True, "message": f"Đã xóa quy tắc truy cập '{rule_name}'"}
