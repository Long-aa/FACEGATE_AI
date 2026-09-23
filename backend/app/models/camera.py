"""
Camera model for FaceGate AI.
"""
import uuid
from sqlalchemy import (
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    func,
)
from sqlalchemy.orm import relationship

from app.database.session import Base


class Camera(Base):
    __tablename__ = "cameras"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    camera_code = Column(String(50), unique=True, nullable=False, index=True)
    name = Column(String(255), nullable=False, index=True)
    location = Column(String(255), nullable=False)
    camera_type = Column(String(50), default="entrance", nullable=False)  # entrance, parking, server
    status = Column(String(50), default="Online", nullable=False)  # Online, Offline
    
    rtsp_url = Column(String(500), nullable=True)
    ip_address = Column(String(100), nullable=True)
    port = Column(Integer, default=554, nullable=False)
    fps = Column(Integer, default=30, nullable=False)
    latency = Column(Integer, default=15, nullable=False)  # Latency in ms
    resolution = Column(String(50), default="1920x1080", nullable=False)
    res_label = Column(String(50), default="1080p", nullable=False)

    door_id = Column(
        String(36),
        ForeignKey("doors.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    door = relationship("Door", back_populates="cameras")
    access_logs = relationship("AccessLog", back_populates="camera")
    alerts = relationship("Alert", back_populates="camera")

    def __repr__(self) -> str:
        return f"<Camera(camera_code='{self.camera_code}', name='{self.name}', status='{self.status}')>"
