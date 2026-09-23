"""
Common Pydantic request and response schemas for FaceGate AI.
"""
from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


# ─────────────────────────────────────────────────────────────────────────────
# Auth Schemas
# ─────────────────────────────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    username_or_email: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: Dict[str, Any]
    expires_at: int


class UserProfileResponse(BaseModel):
    id: str
    employee_id: str
    full_name: str
    email: Optional[str]
    phone: Optional[str]
    department: Optional[str]
    position: Optional[str]
    role: str
    status: str
    is_superuser: bool
    avatar_url: Optional[str]
    has_face_registration: bool
    permissions: List[str] = []


# ─────────────────────────────────────────────────────────────────────────────
# User Schemas
# ─────────────────────────────────────────────────────────────────────────────

class UserCreate(BaseModel):
    employee_id: str = Field(..., min_length=2, max_length=50)
    full_name: str = Field(..., min_length=2, max_length=255)
    email: Optional[str] = None
    phone: Optional[str] = None
    department: Optional[str] = None
    position: Optional[str] = None
    role: str = "STAFF"
    status: str = "ACTIVE"
    password: Optional[str] = None
    card_number: Optional[str] = None
    access_areas: Optional[List[str]] = None


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    department: Optional[str] = None
    position: Optional[str] = None
    role: Optional[str] = None
    status: Optional[str] = None
    password: Optional[str] = None
    card_number: Optional[str] = None


class UserStatusUpdate(BaseModel):
    status: str  # ACTIVE, LOCKED, WAITING, DRAFT, INACTIVE


class UserOut(BaseModel):
    id: str
    employee_id: str
    full_name: str
    email: Optional[str]
    phone: Optional[str]
    department: Optional[str]
    position: Optional[str]
    role: str
    status: str
    card_number: Optional[str]
    has_face_profile: bool = False
    face_status: str = "missing"
    registered_date: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class UserListResponse(BaseModel):
    items: List[UserOut]
    total: int
    page: int
    limit: int
    total_pages: int


# ─────────────────────────────────────────────────────────────────────────────
# Door Schemas
# ─────────────────────────────────────────────────────────────────────────────

class DoorCreate(BaseModel):
    door_code: str = Field(..., min_length=2, max_length=50)
    name: str = Field(..., min_length=2, max_length=255)
    location: str
    door_type: str = "entrance"
    unlock_duration: int = 5
    relay_pin: Optional[int] = None
    controller_ip: Optional[str] = None


class DoorUpdate(BaseModel):
    name: Optional[str] = None
    location: Optional[str] = None
    door_type: Optional[str] = None
    status: Optional[str] = None
    unlock_duration: Optional[int] = None
    relay_pin: Optional[int] = None
    controller_ip: Optional[str] = None


class DoorOut(BaseModel):
    id: str
    door_code: str
    name: str
    location: str
    door_type: str
    status: str
    lock_status: str
    unlock_duration: int
    last_activity: Optional[datetime] = None
    last_user_name: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class DoorActionResponse(BaseModel):
    success: bool
    door_id: str
    lock_status: str
    message: str


# ─────────────────────────────────────────────────────────────────────────────
# Camera Schemas
# ─────────────────────────────────────────────────────────────────────────────

class CameraCreate(BaseModel):
    camera_code: str = Field(..., min_length=2, max_length=50)
    name: str = Field(..., min_length=2, max_length=255)
    location: str
    camera_type: str = "entrance"
    rtsp_url: Optional[str] = None
    ip_address: Optional[str] = None
    port: int = 554
    fps: int = 30
    resolution: str = "1920x1080"
    res_label: str = "1080p"
    door_id: Optional[str] = None


class CameraUpdate(BaseModel):
    name: Optional[str] = None
    location: Optional[str] = None
    camera_type: Optional[str] = None
    status: Optional[str] = None
    rtsp_url: Optional[str] = None
    ip_address: Optional[str] = None
    fps: Optional[int] = None
    resolution: Optional[str] = None
    door_id: Optional[str] = None


class CameraOut(BaseModel):
    id: str
    camera_code: str
    name: str
    location: str
    camera_type: str
    status: str
    rtsp_url: Optional[str]
    ip_address: Optional[str]
    fps: int
    latency: int
    resolution: str
    res_label: str
    door_id: Optional[str]
    door_name: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class CameraTestResponse(BaseModel):
    success: bool
    status: str
    latency_ms: int
    message: str


# ─────────────────────────────────────────────────────────────────────────────
# Access Log Schemas
# ─────────────────────────────────────────────────────────────────────────────

class AccessLogOut(BaseModel):
    id: str
    log_number: int
    timestamp: datetime
    time: str
    date: str
    full_timestamp: str
    user_id: Optional[str]
    employee_id: Optional[str]
    user_name: Optional[str]
    department: Optional[str]
    door_id: Optional[str]
    door_name: Optional[str]
    camera_id: Optional[str]
    camera_name: Optional[str]
    result: str  # GRANTED, DENIED, LOW CONF, UNKNOWN
    confidence: float
    cosine_score: Optional[float] = None
    face_distance: Optional[float] = None
    liveness_passed: Optional[bool] = None
    liveness_score: Optional[float] = None
    latency_ms: Optional[int] = None
    ai_model: Optional[str] = None
    relay_status: Optional[str] = None
    is_unknown: bool = False
    is_masked: bool = False

    class Config:
        from_attributes = True


class AccessLogListResponse(BaseModel):
    items: List[AccessLogOut]
    total: int
    page: int
    limit: int
    total_pages: int


# ─────────────────────────────────────────────────────────────────────────────
# Alert Schemas
# ─────────────────────────────────────────────────────────────────────────────

class AlertOut(BaseModel):
    id: str
    alert_type: str
    description: str
    location: str
    camera_id: Optional[str]
    camera_name: Optional[str]
    door_id: Optional[str]
    door_name: Optional[str]
    severity: str  # CRITICAL, WARNING, INFO
    status: str  # UNRESOLVED, INVESTIGATING, PENDING, RESOLVED
    timestamp: datetime
    time_str: str
    acknowledged_by: Optional[str] = None
    resolved_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class AlertListResponse(BaseModel):
    items: List[AlertOut]
    total: int
    unresolved_count: int
    critical_count: int
    warning_count: int
    info_count: int


# ─────────────────────────────────────────────────────────────────────────────
# Dashboard & Analytics Schemas
# ─────────────────────────────────────────────────────────────────────────────

class DashboardStatsOut(BaseModel):
    total_users: int
    today_entries: int
    success_recognitions: int
    denied_access: int
    active_cameras: int
    total_cameras: int
    unresolved_alerts: int
    total_alerts: int
    recognition_rate: float


class AiEngineStatusOut(BaseModel):
    model_name: str
    detector_name: str
    status: str
    latency_ms: Optional[int]
    processing_fps: Optional[int]
    avg_confidence: Optional[float]
    inference_load: Optional[int]
    frame_buffer_load: Optional[int]
    is_live_service_connected: bool


# ─────────────────────────────────────────────────────────────────────────────
# Report Schemas
# ─────────────────────────────────────────────────────────────────────────────

class TrafficDataPoint(BaseModel):
    label: str
    value: int


class DistributionData(BaseModel):
    granted_count: int
    denied_count: int
    unknown_count: int
    granted_pct: float
    denied_pct: float
    unknown_pct: float


class TopUserItem(BaseModel):
    employee_id: str
    full_name: str
    department: str
    access_count: int
    last_access: Optional[datetime]


class ReportSummaryOut(BaseModel):
    range: str
    total_access: int
    traffic: List[TrafficDataPoint]
    distribution: DistributionData
    top_users: List[TopUserItem]
    by_door: List[Dict[str, Any]]
    by_camera: List[Dict[str, Any]]


# ─────────────────────────────────────────────────────────────────────────────
# Settings Schemas
# ─────────────────────────────────────────────────────────────────────────────

class SystemSettingsOut(BaseModel):
    settings: Dict[str, Any]


class SystemSettingsUpdate(BaseModel):
    settings: Dict[str, Any]


# ─────────────────────────────────────────────────────────────────────────────
# Audit Log Schemas
# ─────────────────────────────────────────────────────────────────────────────

class AuditLogOut(BaseModel):
    id: str
    action: str
    user_id: Optional[str] = None
    user_name: Optional[str] = None
    entity_type: Optional[str] = None
    entity_id: Optional[str] = None
    details: Optional[Dict[str, Any]] = None
    ip_address: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class AuditLogListResponse(BaseModel):
    items: List[AuditLogOut]
    total: int
    page: int
    limit: int
    total_pages: int

