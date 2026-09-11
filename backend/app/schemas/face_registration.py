"""
Pydantic schemas for the Face Registration flow (FRM01-FRM08).
"""
from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any, List, Optional

from pydantic import BaseModel, Field


# ──────────────────────────────────────────────────────────────
# Enums
# ──────────────────────────────────────────────────────────────

class EmployeeStatus(str, Enum):
    ACTIVE = "ACTIVE"
    INACTIVE = "INACTIVE"
    BLOCKED = "BLOCKED"


class RegistrationStatus(str, Enum):
    PENDING = "PENDING"
    ACTIVE = "ACTIVE"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"


# ──────────────────────────────────────────────────────────────
# FRM01 – Employee
# ──────────────────────────────────────────────────────────────

class EmployeeProfile(BaseModel):
    """Validated employee profile returned by validate_employee_info()."""

    employee_id: str = Field(..., description="Unique employee identifier (e.g. EMP-0001)")
    name: str = Field(..., description="Full name of the employee")
    department: Optional[str] = Field(None, description="Department / team")
    position: Optional[str] = Field(None, description="Job title / position")
    status: EmployeeStatus = Field(default=EmployeeStatus.ACTIVE)
    has_face_registration: bool = Field(default=False)

    model_config = {"from_attributes": True}


# ──────────────────────────────────────────────────────────────
# FRM07 – Metadata & Persistence
# ──────────────────────────────────────────────────────────────

class FaceRegistrationMetadata(BaseModel):
    """Metadata accompanying a face registration record."""

    registered_at: datetime = Field(
        default_factory=datetime.utcnow,
        description="UTC timestamp of registration",
    )
    status: RegistrationStatus = Field(default=RegistrationStatus.ACTIVE)
    registered_by: Optional[str] = Field(None, description="Admin or system user")
    notes: Optional[str] = Field(None)


# ──────────────────────────────────────────────────────────────
# FRM08 – Registration Context & Response
# ──────────────────────────────────────────────────────────────

class RegistrationContext(BaseModel):
    """Shared context object passed through the registration pipeline."""

    employee_id: str
    face_samples: List[Any] = Field(default_factory=list)
    encoding: Optional[List[float]] = None
    metadata: Optional[FaceRegistrationMetadata] = None
    cancelled: bool = False
    stage: str = Field(default="init", description="Current pipeline stage")


class RegistrationResponse(BaseModel):
    """Final response returned by complete_face_registration()."""

    success: bool
    employee_id: str
    status: RegistrationStatus
    message: str
    registered_at: Optional[datetime] = None
