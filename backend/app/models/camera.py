"""
Camera model for FaceGate AI.
"""
from datetime import datetime
from typing import Any, List, Optional
import uuid
from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    Integer,
    String,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.session import Base


class Camera(Base):
    __tablename__ = "cameras"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    camera_code: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    location: Mapped[str] = mapped_column(String(255), nullable=False)
    camera_type: Mapped[str] = mapped_column(String(50), default="entrance", nullable=False)  # entrance, parking, server
    status: Mapped[str] = mapped_column(String(50), default="Online", nullable=False)  # Online, Offline
    
    rtsp_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    ip_address: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    port: Mapped[int] = mapped_column(Integer, default=554, nullable=False)
    fps: Mapped[int] = mapped_column(Integer, default=30, nullable=False)
    latency: Mapped[int] = mapped_column(Integer, default=15, nullable=False)  # Latency in ms
    resolution: Mapped[str] = mapped_column(String(50), default="1920x1080", nullable=False)
    res_label: Mapped[str] = mapped_column(String(50), default="1080p", nullable=False)

    door_id: Mapped[Optional[str]] = mapped_column(
        String(36),
        ForeignKey("doors.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, index=True)

    created_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    door: Mapped[Optional[Any]] = relationship("Door", back_populates="cameras")
    access_logs: Mapped[List[Any]] = relationship("AccessLog", back_populates="camera")
    alerts: Mapped[List[Any]] = relationship("Alert", back_populates="camera")

    def __repr__(self) -> str:
        return f"<Camera(camera_code='{self.camera_code}', name='{self.name}', status='{self.status}')>"
