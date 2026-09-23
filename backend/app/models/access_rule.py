"""
Access rule model for FaceGate AI.
"""
import uuid
from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    String,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship

from app.database.session import Base


class AccessRule(Base):
    __tablename__ = "access_rules"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)

    door_id = Column(
        String(36),
        ForeignKey("doors.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id = Column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    department = Column(String(100), nullable=True, index=True)

    # Time window (HH:MM:SS format e.g. "08:00:00" to "18:00:00")
    start_time = Column(String(8), default="00:00:00", nullable=False)
    end_time = Column(String(8), default="23:59:59", nullable=False)
    # Days of week: 1=Mon, 7=Sun
    allowed_days = Column(JSONB, default=lambda: [1, 2, 3, 4, 5, 6, 7], nullable=False)

    is_active = Column(Boolean, default=True, nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    door = relationship("Door", back_populates="access_rules")
    user = relationship("User", back_populates="access_rules")

    def __repr__(self) -> str:
        return f"<AccessRule(name='{self.name}', is_active={self.is_active})>"
