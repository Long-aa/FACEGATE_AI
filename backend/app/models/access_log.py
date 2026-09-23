"""
Access log model for FaceGate AI.
"""
import uuid
from sqlalchemy import (
    BigInteger,
    Boolean,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    Sequence,
    String,
    Text,
    func,
)
from sqlalchemy.orm import relationship

from app.database.session import Base

log_number_seq = Sequence("access_log_number_seq", start=1000, increment=1)


class AccessLog(Base):
    __tablename__ = "access_logs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    log_number = Column(
        BigInteger,
        log_number_seq,
        server_default=log_number_seq.next_value(),
        index=True,
    )
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), index=True)

    user_id = Column(
        String(36),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    employee_id = Column(String(50), nullable=True, index=True)
    user_name = Column(String(255), nullable=True, index=True)
    department = Column(String(100), nullable=True)
    card_type = Column(String(100), nullable=True)

    door_id = Column(
        String(36),
        ForeignKey("doors.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    door_name = Column(String(255), nullable=True)

    camera_id = Column(
        String(36),
        ForeignKey("cameras.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    camera_name = Column(String(255), nullable=True)

    # Verification outcome: GRANTED, DENIED, LOW_CONF, UNKNOWN
    result = Column(String(50), nullable=False, index=True)
    confidence = Column(Float, default=0.0, nullable=False)
    cosine_score = Column(Float, nullable=True)
    face_distance = Column(Float, nullable=True)
    liveness_passed = Column(Boolean, nullable=True)
    liveness_score = Column(Float, nullable=True)
    latency_ms = Column(Integer, nullable=True)
    ai_model = Column(String(100), default="ArcFace r100 v1", nullable=True)

    live_photo_url = Column(Text, nullable=True)
    master_photo_url = Column(Text, nullable=True)

    is_unknown = Column(Boolean, default=False, nullable=False)
    is_masked = Column(Boolean, default=False, nullable=False)
    relay_status = Column(String(50), nullable=True)
    notes = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    user = relationship("User", back_populates="access_logs")
    door = relationship("Door", back_populates="access_logs")
    camera = relationship("Camera", back_populates="access_logs")

    def __repr__(self) -> str:
        return f"<AccessLog(id='{self.id}', log_number={self.log_number}, result='{self.result}', confidence={self.confidence})>"
