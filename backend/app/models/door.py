"""
Door model for FaceGate AI.
"""
from datetime import datetime
from typing import Any, List, Optional
import uuid
from sqlalchemy import (
    Boolean,
    DateTime,
    Integer,
    String,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.session import Base


class Door(Base):
    __tablename__ = "doors"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    door_code: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    location: Mapped[str] = mapped_column(String(255), nullable=False)
    door_type: Mapped[str] = mapped_column(String(50), default="entrance", nullable=False)  # entrance, server, office, emergency, exit
    status: Mapped[str] = mapped_column(String(50), default="Online", nullable=False)  # Online, Offline, Maintenance
    lock_status: Mapped[str] = mapped_column(String(50), default="Locked", nullable=False)  # Locked, Unlocked
    
    relay_pin: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    controller_ip: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    mqtt_topic: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    unlock_duration: Mapped[int] = mapped_column(Integer, default=5, nullable=False)  # Seconds to keep open

    last_activity: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    last_user_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, index=True)

    created_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    cameras: Mapped[List[Any]] = relationship("Camera", back_populates="door")
    access_logs: Mapped[List[Any]] = relationship("AccessLog", back_populates="door")
    access_rules: Mapped[List[Any]] = relationship("AccessRule", back_populates="door", cascade="all, delete-orphan")
    alerts: Mapped[List[Any]] = relationship("Alert", back_populates="door")

    def __repr__(self) -> str:
        return f"<Door(door_code='{self.door_code}', name='{self.name}', status='{self.status}')>"
