"""
Centralized Pydantic schemas export for FaceGate AI.
"""
from app.schemas.department import (
    DepartmentBase,
    DepartmentCreate,
    DepartmentUpdate,
    DepartmentOut,
    DepartmentListResponse,
)

DepartmentListOut = DepartmentListResponse
from app.schemas.face_registration import (
    EmployeeStatus,
    RegistrationStatus,
    EmployeeProfile,
    FaceRegistrationMetadata,
    RegistrationResponse,
)
from app.schemas.common import (
    LoginRequest,
    TokenResponse,
    UserProfileResponse,
    UserCreate,
    UserUpdate,
    UserStatusUpdate,
    UserOut,
    UserListResponse,
    SystemSettingsOut,
    SystemSettingsUpdate,
    AuditLogOut,
)

Token = TokenResponse

__all__ = [
    "DepartmentBase",
    "DepartmentCreate",
    "DepartmentUpdate",
    "DepartmentOut",
    "DepartmentListResponse",
    "DepartmentListOut",
    "EmployeeStatus",
    "RegistrationStatus",
    "EmployeeProfile",
    "FaceRegistrationMetadata",
    "RegistrationResponse",
    "LoginRequest",
    "TokenResponse",
    "Token",
    "UserProfileResponse",
    "UserCreate",
    "UserUpdate",
    "UserStatusUpdate",
    "UserOut",
    "UserListResponse",
    "SystemSettingsOut",
    "SystemSettingsUpdate",
    "AuditLogOut",
]
