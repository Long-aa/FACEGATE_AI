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
    pass


@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup resources on shutdown."""
    pass
