"""
Centralized API v1 router for FaceGate AI.
Aggregates all sub-routers under clean REST endpoints.
"""
from fastapi import APIRouter

from app.api.v1.access_logs import router as access_logs_router
from app.api.v1.access_rules import router as access_rules_router
from app.api.v1.alerts import router as alerts_router
from app.api.v1.audit import router as audit_router
from app.api.v1.auth import router as auth_router
from app.api.v1.cameras import router as cameras_router
from app.api.v1.dashboard import router as dashboard_router
from app.api.v1.departments import router as departments_router
from app.api.v1.doors import router as doors_router
from app.api.v1.faces import router as faces_router
from app.api.v1.notifications import router as notifications_router
from app.api.v1.recognition import router as recognition_router
from app.api.v1.reports import router as reports_router
from app.api.v1.roles import router as roles_router
from app.api.v1.settings import router as settings_router
from app.api.v1.system_logs import router as system_logs_router
from app.api.v1.users import router as users_router

api_router = APIRouter()

api_router.include_router(dashboard_router, prefix="/dashboard", tags=["Dashboard"])
api_router.include_router(auth_router, prefix="/auth", tags=["Authentication"])
api_router.include_router(users_router, prefix="/users", tags=["Users"])
api_router.include_router(departments_router, prefix="/departments", tags=["Departments"])
api_router.include_router(roles_router, prefix="/roles", tags=["Roles"])
api_router.include_router(faces_router, prefix="/faces", tags=["Face Profiles"])
api_router.include_router(recognition_router, prefix="/recognition", tags=["Recognition"])
api_router.include_router(cameras_router, prefix="/cameras", tags=["Cameras"])
api_router.include_router(doors_router, prefix="/doors", tags=["Doors"])
api_router.include_router(access_rules_router, prefix="/access-rules", tags=["Access Rules"])
api_router.include_router(access_logs_router, prefix="/access-logs", tags=["Access Logs"])
api_router.include_router(alerts_router, prefix="/alerts", tags=["Alerts"])
api_router.include_router(reports_router, prefix="/reports", tags=["Reports"])
api_router.include_router(notifications_router, prefix="/notifications", tags=["Notifications"])
api_router.include_router(audit_router, prefix="/audit", tags=["Audit"])
api_router.include_router(system_logs_router, prefix="/system-logs", tags=["System Logs"])
api_router.include_router(settings_router, prefix="/settings", tags=["Settings"])
