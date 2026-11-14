"""Full recognition pipeline endpoint (detect + liveness + embed)."""
import base64
import logging
import numpy as np
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
import cv2

from app.services.face_service import face_service
from app.services.liveness_service import liveness_service

router = APIRouter()
logger = logging.getLogger(__name__)


class PipelineRequest(BaseModel):
    image_base64: str
    check_liveness: bool = True
    min_det_score: float = 0.5


class PipelineResponse(BaseModel):
    face_detected: bool
    face_count: int
    embedding: List[float]       # 512D ArcFace, empty if no face
    det_score: float
    liveness_passed: bool
    liveness_score: float
    model: str


def decode_image(image_base64: str) -> np.ndarray:
    try:
        if "," in image_base64:
            image_base64 = image_base64.split(",", 1)[1]
        img_bytes = base64.b64decode(image_base64)
        img_array = np.frombuffer(img_bytes, dtype=np.uint8)
        img = cv2.imdecode(img_array, cv2.IMREAD_COLOR)
        if img is None:
            raise ValueError("Could not decode image")
        return img
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Image decode error: {e}")


@router.post("/pipeline", response_model=PipelineResponse)
async def recognition_pipeline(request: PipelineRequest):
    """
    Full AI pipeline: SCRFD detection -> liveness check -> ArcFace embedding.
    Returns 512D embedding ready for pgvector cosine similarity search.
    """
    if not face_service.is_loaded:
        raise HTTPException(status_code=503, detail="AI models not loaded")

    img = decode_image(request.image_base64)
    faces = face_service.detect_faces(img)

    # Filter by detection threshold
    faces = [f for f in faces if f["det_score"] >= request.min_det_score]

    if not faces:
        return PipelineResponse(
            face_detected=False,
            face_count=0,
            embedding=[],
            det_score=0.0,
            liveness_passed=False,
            liveness_score=0.0,
            model="buffalo_l",
        )

    face_count = len(faces)
    best = max(faces, key=lambda f: f["det_score"])
    emb = best["embedding"]

    # Liveness check
    liveness_passed = True
    liveness_score = 1.0
    if request.check_liveness and liveness_service.is_loaded:
        liveness_passed, liveness_score = liveness_service.check_liveness(img, best["bbox"])

    if isinstance(emb, np.ndarray):
        norm = np.linalg.norm(emb)
        if norm > 0:
            emb = emb / norm
        emb_list = emb.tolist()
    else:
        emb_list = list(emb)

    return PipelineResponse(
        face_detected=True,
        face_count=face_count,
        embedding=emb_list,
        det_score=float(best["det_score"]),
        liveness_passed=liveness_passed,
        liveness_score=float(liveness_score),
        model="buffalo_l",
    )
