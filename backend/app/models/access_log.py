"""
Access log model for FaceGate AI.
"""
from datetime import datetime
from typing import Any, Optional
import uuid
from sqlalchemy import (
    BigInteger,
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    Sequence,
    String,
    Text,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.session import Base

log_number_seq = Sequence("access_log_number_seq", start=1000, increment=1)


class AccessLog(Base):
    __tablename__ = "access_logs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    log_number: Mapped[Optional[int]] = mapped_column(
        BigInteger,
        log_number_seq,
        server_default=log_number_seq.next_value(),
        index=True,
    )
    timestamp: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True)

    user_id: Mapped[Optional[str]] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    employee_id: Mapped[Optional[str]] = mapped_column(String(50), nullable=True, index=True)
    user_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True, index=True)
    department: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    card_type: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    door_id: Mapped[Optional[str]] = mapped_column(
        String(36),
        ForeignKey("doors.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    door_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    camera_id: Mapped[Optional[str]] = mapped_column(
        String(36),
        ForeignKey("cameras.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    camera_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    # Verification outcome: GRANTED, DENIED, LOW_CONF, UNKNOWN
    result: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    confidence: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    cosine_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    face_distance: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    liveness_passed: Mapped[Optional[bool]] = mapped_column(Boolean, nullable=True)
    liveness_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    latency_ms: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    ai_model: Mapped[Optional[str]] = mapped_column(String(100), default="ArcFace r100 v1", nullable=True)

    live_photo_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    master_photo_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    is_unknown: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_masked: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    relay_status: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    created_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    user: Mapped[Optional[Any]] = relationship("User", back_populates="access_logs")
    door: Mapped[Optional[Any]] = relationship("Door", back_populates="access_logs")
    camera: Mapped[Optional[Any]] = relationship("Camera", back_populates="access_logs")

    def __repr__(self) -> str:
        return f"<AccessLog(id='{self.id}', log_number={self.log_number}, result='{self.result}', confidence={self.confidence})>"
