"""
Department model for FaceGate AI.
"""
from datetime import datetime
from typing import Any, Optional
import uuid
from sqlalchemy import DateTime, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.database.session import Base


class Department(Base):
    __tablename__ = "departments"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    code: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    manager_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    contact_email: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    contact_phone: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    location: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    access_level: Mapped[str] = mapped_column(String(50), default="STANDARD", nullable=False)  # STANDARD, RESTRICTED, HIGH_SECURITY
    allowed_doors: Mapped[Any] = mapped_column(JSONB, default=list, nullable=False)
    color: Mapped[str] = mapped_column(String(30), default="#00D4AA", nullable=False)
    status: Mapped[str] = mapped_column(String(30), default="ACTIVE", nullable=False)  # ACTIVE, INACTIVE

    created_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    def __repr__(self) -> str:
        return f"<Department(code='{self.code}', name='{self.name}', status='{self.status}')>"
