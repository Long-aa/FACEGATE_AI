"""
Security alert model for FaceGate AI.
"""
from datetime import datetime
from typing import Any, Optional
import uuid
from sqlalchemy import (
    DateTime,
    ForeignKey,
    String,
    Text,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.session import Base


class Alert(Base):
    __tablename__ = "alerts"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    alert_type: Mapped[str] = mapped_column(String(100), nullable=False, index=True)  # UNKNOWN_PERSON, LOW_CONFIDENCE, CAMERA_OFFLINE, DOOR_HELD_OPEN, SPOOF_ATTEMPT
    description: Mapped[str] = mapped_column(Text, nullable=False)
    location: Mapped[str] = mapped_column(String(255), nullable=False)

    camera_id: Mapped[Optional[str]] = mapped_column(
        String(36),
        ForeignKey("cameras.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    camera_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    door_id: Mapped[Optional[str]] = mapped_column(
        String(36),
        ForeignKey("doors.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    door_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    severity: Mapped[str] = mapped_column(String(50), default="WARNING", nullable=False, index=True)  # CRITICAL, WARNING, INFO
    status: Mapped[str] = mapped_column(String(50), default="UNRESOLVED", nullable=False, index=True)  # UNRESOLVED, INVESTIGATING, PENDING, RESOLVED
    timestamp: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True)

    snapshot_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    acknowledged_by: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    acknowledged_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    resolved_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    created_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    camera: Mapped[Optional[Any]] = relationship("Camera", back_populates="alerts")
    door: Mapped[Optional[Any]] = relationship("Door", back_populates="alerts")

    def __repr__(self) -> str:
        return f"<Alert(id='{self.id}', type='{self.alert_type}', severity='{self.severity}', status='{self.status}')>"
