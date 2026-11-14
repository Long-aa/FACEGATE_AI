"""Health check endpoint for AI Service."""
from fastapi import APIRouter
from app.services.face_service import face_service
from app.services.liveness_service import liveness_service

router = APIRouter()


@router.get("/health")
async def health_check():
    """Health and model status check."""
    return {
        "status": "healthy",
        "models_loaded": face_service.is_loaded,
        "liveness_loaded": liveness_service.is_loaded,
        "liveness_mode": "minifasnet" if (liveness_service.is_loaded and not liveness_service.using_fallback) else "texture_fallback",
        "version": "2.0.0",
    }
