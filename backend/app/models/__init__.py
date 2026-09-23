"""
Centralized models export for FaceGate AI.
"""
from app.models.access_log import AccessLog
from app.models.access_rule import AccessRule
from app.models.alert import Alert
from app.models.audit import AuditLog
from app.models.camera import Camera
from app.models.door import Door
from app.models.face import FaceProfile
from app.models.notification import Notification
from app.models.setting import SystemSetting
from app.models.user import Role, User, user_roles
from app.models.department import Department

__all__ = [
    "User",
    "Role",
    "user_roles",
    "Department",
    "FaceProfile",
    "Door",
    "Camera",
    "AccessRule",
    "AccessLog",
    "Alert",
    "SystemSetting",
    "Notification",
    "AuditLog",
]
