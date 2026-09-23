"""
Department model for FaceGate AI.
"""
import uuid
from sqlalchemy import Column, DateTime, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB

from app.database.session import Base


class Department(Base):
    __tablename__ = "departments"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    code = Column(String(50), unique=True, nullable=False, index=True)
    name = Column(String(100), unique=True, nullable=False, index=True)
    description = Column(Text, nullable=True)
    manager_name = Column(String(100), nullable=True)
    contact_email = Column(String(100), nullable=True)
    contact_phone = Column(String(50), nullable=True)
    location = Column(String(100), nullable=True)
    access_level = Column(String(50), default="STANDARD", nullable=False)  # STANDARD, RESTRICTED, HIGH_SECURITY
    allowed_doors = Column(JSONB, default=list, nullable=False)
    color = Column(String(30), default="#00D4AA", nullable=False)
    status = Column(String(30), default="ACTIVE", nullable=False)  # ACTIVE, INACTIVE

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    def __repr__(self) -> str:
        return f"<Department(code='{self.code}', name='{self.name}', status='{self.status}')>"
