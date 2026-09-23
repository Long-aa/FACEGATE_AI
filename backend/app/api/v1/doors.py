"""
Door access control endpoints for FaceGate AI.
Provides real door management, lock/unlock control with database state persistence and audit logging.
"""
from datetime import datetime, timezone
from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.security import get_current_active_admin, get_current_user
from app.database.session import get_db
from app.models.audit import AuditLog
from app.models.door import Door
from app.models.user import User
from app.schemas.common import (
    DoorActionResponse,
    DoorCreate,
    DoorOut,
    DoorUpdate,
)

router = APIRouter()


def _to_door_out(door: Door) -> DoorOut:
    return DoorOut(
        id=door.id,
        door_code=door.door_code,
        name=door.name,
        location=door.location,
        door_type=door.door_type,
        status=door.status,
        lock_status=door.lock_status,
        unlock_duration=door.unlock_duration,
        last_activity=door.last_activity,
        last_user_name=door.last_user_name,
        created_at=door.created_at,
    )


@router.get("", response_model=List[DoorOut])
def list_doors(
    q: Optional[str] = Query(None, description="Search by door name or code"),
    status: Optional[str] = Query(None, description="Filter by status"),
    db: Session = Depends(get_db),
) -> Any:
    """
    List all doors from database with real lock status.
    """
    query = db.query(Door)
    if q:
        search_str = f"%{q.strip()}%"
        query = query.filter((Door.name.ilike(search_str)) | (Door.door_code.ilike(search_str)))
    if status:
        query = query.filter(Door.status == status)

    doors = query.order_by(Door.door_code.asc()).all()
    return [_to_door_out(d) for d in doors]


@router.post("", response_model=DoorOut, status_code=status.HTTP_201_CREATED)
def create_door(
    payload: DoorCreate,
    current_user: User = Depends(get_current_active_admin),
    db: Session = Depends(get_db),
) -> Any:
    """
    Create a new access control door point.
    """
    if db.query(Door).filter(Door.door_code == payload.door_code).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Mã cửa '{payload.door_code}' đã tồn tại trong hệ thống.",
        )

    door = Door(
        door_code=payload.door_code,
        name=payload.name,
        location=payload.location,
        door_type=payload.door_type,
        unlock_duration=payload.unlock_duration,
        relay_pin=payload.relay_pin,
        controller_ip=payload.controller_ip,
        status="Online",
        lock_status="Locked",
    )
    db.add(door)
    db.flush()

    audit = AuditLog(
        action="DOOR_CREATE",
        user_id=current_user.id,
        user_name=current_user.full_name,
        entity_type="door",
        entity_id=door.id,
        details={"door_code": door.door_code, "name": door.name},
    )
    db.add(audit)
    db.commit()
    db.refresh(door)

    return _to_door_out(door)


@router.get("/{door_id}", response_model=DoorOut)
def get_door(
    door_id: str,
    db: Session = Depends(get_db),
) -> Any:
    """
    Get detailed information of a single door.
    """
    door = db.query(Door).filter((Door.id == door_id) | (Door.door_code == door_id)).first()
    if not door:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy cửa",
        )
    return _to_door_out(door)


@router.put("/{door_id}", response_model=DoorOut)
def update_door(
    door_id: str,
    payload: DoorUpdate,
    current_user: User = Depends(get_current_active_admin),
    db: Session = Depends(get_db),
) -> Any:
    """
    Update door configuration.
    """
    door = db.query(Door).filter((Door.id == door_id) | (Door.door_code == door_id)).first()
    if not door:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy cửa",
        )

    if payload.name is not None:
        door.name = payload.name
    if payload.location is not None:
        door.location = payload.location
    if payload.door_type is not None:
        door.door_type = payload.door_type
    if payload.status is not None:
        door.status = payload.status
    if payload.unlock_duration is not None:
        door.unlock_duration = payload.unlock_duration
    if payload.relay_pin is not None:
        door.relay_pin = payload.relay_pin
    if payload.controller_ip is not None:
        door.controller_ip = payload.controller_ip

    db.commit()
    db.refresh(door)
    return _to_door_out(door)


@router.delete("/{door_id}")
def delete_door(
    door_id: str,
    current_user: User = Depends(get_current_active_admin),
    db: Session = Depends(get_db),
) -> Any:
    """
    Delete a door from the database.
    """
    door = db.query(Door).filter((Door.id == door_id) | (Door.door_code == door_id)).first()
    if not door:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy cửa",
        )

    # Unlink any cameras referencing this door
    db.query(Camera).filter(Camera.door_id == door.id).update({Camera.door_id: None}, synchronize_session=False)

    audit = AuditLog(
        action="DOOR_DELETE",
        user_id=current_user.id,
        user_name=current_user.full_name,
        entity_type="door",
        entity_id=door.id,
        details={"door_code": door.door_code, "name": door.name},
    )
    db.add(audit)
    db.delete(door)
    db.commit()

    return {"success": True, "message": f"Đã xóa cửa {door.name}"}


@router.post("/{door_id}/unlock", response_model=DoorActionResponse)
def unlock_door(
    door_id: str,
    current_user: Optional[User] = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Any:
    """
    Remotely unlock a door. Updates door lock_status in database, logs to audit_logs,
    and returns auto-lock duration.
    """
    door = db.query(Door).filter((Door.id == door_id) | (Door.door_code == door_id)).first()
    if not door:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy cửa",
        )

    now = datetime.now(timezone.utc)
    door.lock_status = "Unlocked"
    door.last_activity = now
    user_name = current_user.full_name if current_user else "Admin"
    door.last_user_name = user_name

    audit = AuditLog(
        action="DOOR_UNLOCK_MANUAL",
        user_id=current_user.id if current_user else None,
        user_name=user_name,
        entity_type="door",
        entity_id=door.id,
        details={"door_code": door.door_code, "action": "UNLOCK", "duration": door.unlock_duration},
    )
    db.add(audit)
    db.commit()

    return DoorActionResponse(
        success=True,
        door_id=door.id,
        lock_status="Unlocked",
        message=f"Đã kích hoạt mở cửa '{door.name}' thành công (Tự khóa lại sau {door.unlock_duration}s).",
    )


@router.post("/{door_id}/lock", response_model=DoorActionResponse)
def lock_door(
    door_id: str,
    current_user: Optional[User] = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Any:
    """
    Remotely lock a door immediately.
    """
    door = db.query(Door).filter((Door.id == door_id) | (Door.door_code == door_id)).first()
    if not door:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy cửa",
        )

    now = datetime.now(timezone.utc)
    door.lock_status = "Locked"
    door.last_activity = now
    user_name = current_user.full_name if current_user else "Admin"

    audit = AuditLog(
        action="DOOR_LOCK_MANUAL",
        user_id=current_user.id if current_user else None,
        user_name=user_name,
        entity_type="door",
        entity_id=door.id,
        details={"door_code": door.door_code, "action": "LOCK"},
    )
    db.add(audit)
    db.commit()

    return DoorActionResponse(
        success=True,
        door_id=door.id,
        lock_status="Locked",
        message=f"Đã khóa cửa '{door.name}'.",
    )
