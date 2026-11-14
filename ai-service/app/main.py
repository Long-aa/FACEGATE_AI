from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import detection, recognition, embedding, health
from app.core.config import settings
from app.core.logging import setup_logging

setup_logging()

app = FastAPI(
    title="FaceGate AI Service",
    version="1.0.0",
    description="Face detection and recognition AI microservice",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, tags=["Health"])
app.include_router(detection.router, prefix="/detection", tags=["Detection"])
app.include_router(recognition.router, prefix="/recognition", tags=["Recognition"])
app.include_router(embedding.router, prefix="/embedding", tags=["Embedding"])


@app.on_event("startup")
async def startup_event():
    """Load AI models on startup."""
    import logging
    import os
    from app.services.face_service import face_service
    from app.services.liveness_service import liveness_service

    logger = logging.getLogger(__name__)
    os.makedirs(settings.MODELS_DIR, exist_ok=True)
    try:
        face_service.load_models(settings.MODELS_DIR)
        logger.info("Face detection/recognition models loaded successfully")
    except Exception as e:
        logger.error(f"Could not load face models: {e}")

    try:
        liveness_service.load_models(settings.MODELS_DIR)
        logger.info("Liveness detection service initialized")
    except Exception as e:
        logger.error(f"Could not load liveness models: {e}")


@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup resources on shutdown."""
    pass
