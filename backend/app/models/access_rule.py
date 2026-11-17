"""
Access rule model for FaceGate AI.
"""
from datetime import datetime
from typing import Any, Optional
import uuid
from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    String,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.session import Base


class AccessRule(Base):
    __tablename__ = "access_rules"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    door_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("doors.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id: Mapped[Optional[str]] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    department: Mapped[Optional[str]] = mapped_column(String(100), nullable=True, index=True)

    # Time window (HH:MM:SS format e.g. "08:00:00" to "18:00:00")
    start_time: Mapped[str] = mapped_column(String(8), default="00:00:00", nullable=False)
    end_time: Mapped[str] = mapped_column(String(8), default="23:59:59", nullable=False)
    # Days of week: 1=Mon, 7=Sun
    allowed_days: Mapped[Any] = mapped_column(JSONB, default=lambda: [1, 2, 3, 4, 5, 6, 7], nullable=False)

    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    created_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    door: Mapped[Optional[Any]] = relationship("Door", back_populates="access_rules")
    user: Mapped[Optional[Any]] = relationship("User", back_populates="access_rules")

    def __repr__(self) -> str:
        return f"<AccessRule(name='{self.name}', is_active={self.is_active})>"
