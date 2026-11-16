"""
Notification endpoints for FaceGate AI.
Handles alerts, announcements, and user notifications.
"""
from typing import Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.security import get_current_user
from app.database.session import get_db
from app.models.notification import Notification
from app.models.user import User
from app.schemas.common import (
    NotificationCreate,
    NotificationListResponse,
    NotificationOut,
)

router = APIRouter()


@router.get("", response_model=NotificationListResponse)
def list_notifications(
    unread_only: bool = Query(False, description="Filter only unread notifications"),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Any:
    """
    List notifications relevant to the current user (broadcast + user-specific).
    """
    query = db.query(Notification).filter(
        (Notification.user_id == current_user.id) | (Notification.user_id.is_(None))
    )

    if unread_only:
        query = query.filter(Notification.is_read == False)

    total = query.count()
    unread_count = (
        db.query(Notification)
        .filter(
            ((Notification.user_id == current_user.id) | (Notification.user_id.is_(None))),
            Notification.is_read == False,
        )
        .count()
    )

    items = query.order_by(Notification.created_at.desc()).offset(offset).limit(limit).all()

    return NotificationListResponse(
        items=[NotificationOut.model_validate(n) for n in items],
        total=total,
        unread_count=unread_count,
    )


@router.post("", response_model=NotificationOut, status_code=status.HTTP_201_CREATED)
def create_notification(
    payload: NotificationCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Any:
    """
    Create a new system or user-specific notification.
    """
    item = Notification(
        title=payload.title,
        message=payload.message,
        type=payload.type,
        user_id=payload.user_id,
        is_read=False,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return NotificationOut.model_validate(item)


@router.post("/{notification_id}/read", response_model=NotificationOut)
def mark_notification_read(
    notification_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Any:
    """
    Mark a single notification as read.
    """
    item = db.query(Notification).filter(Notification.id == notification_id).first()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy thông báo")

    item.is_read = True
    db.commit()
    db.refresh(item)
    return NotificationOut.model_validate(item)


@router.post("/read-all", response_model=dict)
def mark_all_read(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Any:
    """
    Mark all notifications for the current user as read.
    """
    db.query(Notification).filter(
        (Notification.user_id == current_user.id) | (Notification.user_id.is_(None)),
        Notification.is_read == False,
    ).update({"is_read": True}, synchronize_session=False)
    db.commit()
    return {"success": True, "message": "Đã đánh dấu tất cả thông báo là đã đọc"}


@router.delete("/{notification_id}", response_model=dict)
def delete_notification(
    notification_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Any:
    """
    Delete a notification.
    """
    item = db.query(Notification).filter(Notification.id == notification_id).first()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy thông báo")

    db.delete(item)
    db.commit()
    return {"success": True, "message": "Đã xóa thông báo"}
