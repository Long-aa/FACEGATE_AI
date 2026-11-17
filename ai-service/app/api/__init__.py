"""
FastAPI endpoints for AI Microservice (Detection, Embedding, Liveness, Recognition).
"""
from app.api.detection import router as detection_router
from app.api.embedding import router as embedding_router
from app.api.health import router as health_router
from app.api.recognition import router as recognition_router

__all__ = [
    "detection_router",
    "embedding_router",
    "health_router",
    "recognition_router",
]
