"""Face embedding extraction endpoint."""
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


class EmbedRequest(BaseModel):
    image_base64: str
    check_liveness: bool = False
    bbox: Optional[list] = None  # [x1,y1,x2,y2] optional face crop hint


class EmbedResponse(BaseModel):
    embedding: List[float]       # 512D ArcFace embedding
    face_detected: bool
    liveness_passed: Optional[bool] = None
    liveness_score: Optional[float] = None
    det_score: Optional[float] = None


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
        raise HTTPException(status_code=400, detail=f"Invalid image: {e}")


@router.post("/extract", response_model=EmbedResponse)
async def extract_embedding(request: EmbedRequest):
    """Extract ArcFace 512D embedding from an image."""
    if not face_service.is_loaded:
        raise HTTPException(status_code=503, detail="Face detection models not loaded")

    img = decode_image(request.image_base64)
    faces = face_service.detect_faces(img)

    if not faces:
        return EmbedResponse(
            embedding=[],
            face_detected=False,
            liveness_passed=None,
            liveness_score=None,
            det_score=None,
        )

    # Pick highest-confidence face
    best = max(faces, key=lambda f: f["det_score"])
    emb = best["embedding"]

    liveness_passed = None
    liveness_score = None

    if request.check_liveness and liveness_service.is_loaded:
        bbox = best["bbox"] if request.bbox is None else request.bbox
        liveness_passed, liveness_score = liveness_service.check_liveness(img, bbox)

    return EmbedResponse(
        embedding=emb.tolist() if isinstance(emb, np.ndarray) else list(emb),
        face_detected=True,
        liveness_passed=liveness_passed,
        liveness_score=liveness_score,
        det_score=best["det_score"],
    )
