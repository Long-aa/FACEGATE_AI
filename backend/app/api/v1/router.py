from fastapi import APIRouter
from app.api.v1 import auth, users, roles, faces, recognition, cameras, doors
from app.api.v1 import access_rules, access_logs, alerts, reports, notifications
from app.api.v1 import audit, system_logs, settings

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(users.router, prefix="/users", tags=["Users"])
api_router.include_router(roles.router, prefix="/roles", tags=["Roles"])
api_router.include_router(faces.router, prefix="/faces", tags=["Face Profiles"])
api_router.include_router(recognition.router, prefix="/recognition", tags=["Recognition"])
api_router.include_router(cameras.router, prefix="/cameras", tags=["Cameras"])
api_router.include_router(doors.router, prefix="/doors", tags=["Doors"])
api_router.include_router(access_rules.router, prefix="/access-rules", tags=["Access Rules"])
api_router.include_router(access_logs.router, prefix="/access-logs", tags=["Access Logs"])
api_router.include_router(alerts.router, prefix="/alerts", tags=["Alerts"])
api_router.include_router(reports.router, prefix="/reports", tags=["Reports"])
api_router.include_router(notifications.router, prefix="/notifications", tags=["Notifications"])
api_router.include_router(audit.router, prefix="/audit", tags=["Audit"])
api_router.include_router(system_logs.router, prefix="/system-logs", tags=["System Logs"])
api_router.include_router(settings.router, prefix="/settings", tags=["Settings"])
