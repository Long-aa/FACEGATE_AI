"""
System audit log model for FaceGate AI.
"""
from datetime import datetime
from typing import Any, Optional
import uuid
from sqlalchemy import (
    DateTime,
    String,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.database.session import Base


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    action: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    user_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True, index=True)
    user_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    entity_type: Mapped[Optional[str]] = mapped_column(String(100), nullable=True, index=True)
    entity_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    details: Mapped[Any] = mapped_column(JSONB, nullable=True)
    ip_address: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)

    created_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True)

    def __repr__(self) -> str:
        return f"<AuditLog(action='{self.action}', entity_type='{self.entity_type}', id='{self.id}')>"
