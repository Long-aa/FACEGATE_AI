"""
Door model for FaceGate AI.
"""
import uuid
from sqlalchemy import (
    Column,
    DateTime,
    Integer,
    String,
    func,
)
from sqlalchemy.orm import relationship

from app.database.session import Base


class Door(Base):
    __tablename__ = "doors"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    door_code = Column(String(50), unique=True, nullable=False, index=True)
    name = Column(String(255), nullable=False, index=True)
    location = Column(String(255), nullable=False)
    door_type = Column(String(50), default="entrance", nullable=False)  # entrance, server, office, emergency, exit
    status = Column(String(50), default="Online", nullable=False)  # Online, Offline, Maintenance
    lock_status = Column(String(50), default="Locked", nullable=False)  # Locked, Unlocked
    
    relay_pin = Column(Integer, nullable=True)
    controller_ip = Column(String(100), nullable=True)
    mqtt_topic = Column(String(255), nullable=True)
    unlock_duration = Column(Integer, default=5, nullable=False)  # Seconds to keep open

    last_activity = Column(DateTime(timezone=True), nullable=True)
    last_user_name = Column(String(255), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    cameras = relationship("Camera", back_populates="door")
    access_logs = relationship("AccessLog", back_populates="door")
    access_rules = relationship("AccessRule", back_populates="door", cascade="all, delete-orphan")
    alerts = relationship("Alert", back_populates="door")

    def __repr__(self) -> str:
        return f"<Door(door_code='{self.door_code}', name='{self.name}', status='{self.status}')>"
