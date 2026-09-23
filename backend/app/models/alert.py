"""
Security alert model for FaceGate AI.
"""
import uuid
from sqlalchemy import (
    Column,
    DateTime,
    ForeignKey,
    String,
    Text,
    func,
)
from sqlalchemy.orm import relationship

from app.database.session import Base


class Alert(Base):
    __tablename__ = "alerts"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    alert_type = Column(String(100), nullable=False, index=True)  # UNKNOWN_PERSON, LOW_CONFIDENCE, CAMERA_OFFLINE, DOOR_HELD_OPEN, SPOOF_ATTEMPT
    description = Column(Text, nullable=False)
    location = Column(String(255), nullable=False)

    camera_id = Column(
        String(36),
        ForeignKey("cameras.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    camera_name = Column(String(255), nullable=True)

    door_id = Column(
        String(36),
        ForeignKey("doors.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    door_name = Column(String(255), nullable=True)

    severity = Column(String(50), default="WARNING", nullable=False, index=True)  # CRITICAL, WARNING, INFO
    status = Column(String(50), default="UNRESOLVED", nullable=False, index=True)  # UNRESOLVED, INVESTIGATING, PENDING, RESOLVED
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), index=True)

    snapshot_url = Column(Text, nullable=True)
    acknowledged_by = Column(String(100), nullable=True)
    acknowledged_at = Column(DateTime(timezone=True), nullable=True)
    resolved_at = Column(DateTime(timezone=True), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    camera = relationship("Camera", back_populates="alerts")
    door = relationship("Door", back_populates="alerts")

    def __repr__(self) -> str:
        return f"<Alert(id='{self.id}', type='{self.alert_type}', severity='{self.severity}', status='{self.status}')>"
