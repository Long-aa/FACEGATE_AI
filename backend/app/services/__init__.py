"""
Business domain services and workflow managers for FaceGate AI.
"""
from app.services.virtual_door_service import VirtualDoorManager, virtual_door_manager
from app.services.face_registration_service import (
    validate_employee_info,
    open_camera,
    collect_face_samples,
    preprocess_face,
    generate_face_encoding,
    check_duplicate_face,
    save_face_registration,
    complete_face_registration,
)

__all__ = [
    "VirtualDoorManager",
    "virtual_door_manager",
    "validate_employee_info",
    "open_camera",
    "collect_face_samples",
    "preprocess_face",
    "generate_face_encoding",
    "check_duplicate_face",
    "save_face_registration",
    "complete_face_registration",
]
