"""Face detection endpoint."""
import base64
import logging
import numpy as np
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
import cv2

from app.services.face_service import face_service

router = APIRouter()
logger = logging.getLogger(__name__)


class DetectRequest(BaseModel):
    image_base64: str  # base64-encoded image bytes


class FaceBox(BaseModel):
    bbox: list        # [x1, y1, x2, y2]
    kps: Optional[list] = None  # 5 keypoints
    det_score: float


class DetectResponse(BaseModel):
    face_count: int
    faces: List[FaceBox]


def decode_image(image_base64: str) -> np.ndarray:
    """Decode base64 image to BGR numpy array."""
    try:
        # Strip header if data URL format
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


@router.post("/detect", response_model=DetectResponse)
async def detect_faces(request: DetectRequest):
    """Detect faces in an image using SCRFD."""
    if not face_service.is_loaded:
        raise HTTPException(status_code=503, detail="Face detection models not loaded")

    img = decode_image(request.image_base64)
    faces = face_service.detect_faces(img)

    return DetectResponse(
        face_count=len(faces),
        faces=[
            FaceBox(
                bbox=f["bbox"],
                kps=f["kps"],
                det_score=f["det_score"],
            )
            for f in faces
        ],
    )
