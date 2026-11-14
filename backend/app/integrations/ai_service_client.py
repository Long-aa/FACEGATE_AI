"""
AI Service HTTP Client integration for FaceGate AI.
Provides asynchronous connection to the external AI Service (FastAPI / InsightFace / ONNX).
Supports face detection, 512D ArcFace embedding extraction, and anti-spoofing verification.
"""
import logging
from typing import Any, Dict, List, Optional, Tuple
import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)


class AIServiceClient:
    """Async HTTP Client for calling AI Service endpoints."""

    def __init__(self, base_url: Optional[str] = None, timeout: float = 5.0):
        self.base_url = (base_url or settings.AI_SERVICE_URL).rstrip("/")
        self.timeout = timeout

    async def check_health(self) -> Dict[str, Any]:
        """Check AI Service health status."""
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                res = await client.get(f"{self.base_url}/health")
                if res.status_code == 200:
                    return res.json()
                return {"status": "unhealthy", "code": res.status_code}
        except Exception as e:
            logger.debug(f"AI Service health check failed: {e}")
            return {"status": "unreachable", "error": str(e)}

    async def detect_faces(self, image_base64: str) -> Optional[List[Dict[str, Any]]]:
        """
        Detect faces in base64 image.
        Returns list of face dicts or None on failure.
        """
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                res = await client.post(
                    f"{self.base_url}/detection/detect",
                    json={"image_base64": image_base64},
                )
                if res.status_code == 200:
                    data = res.json()
                    return data.get("faces", [])
                logger.warning(f"AI Service detect failed: {res.status_code} {res.text}")
                return None
        except Exception as e:
            logger.warning(f"AI Service detect request error: {e}")
            return None

    async def extract_embedding(
        self,
        image_base64: str,
        check_liveness: bool = False,
        bbox: Optional[list] = None,
    ) -> Optional[Dict[str, Any]]:
        """
        Extract 512D ArcFace embedding.
        Returns dict with keys: embedding, face_detected, liveness_passed, etc.
        """
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                res = await client.post(
                    f"{self.base_url}/embedding/extract",
                    json={
                        "image_base64": image_base64,
                        "check_liveness": check_liveness,
                        "bbox": bbox,
                    },
                )
                if res.status_code == 200:
                    return res.json()
                logger.warning(f"AI Service extract failed: {res.status_code} {res.text}")
                return None
        except Exception as e:
            logger.warning(f"AI Service extract request error: {e}")
            return None

    async def run_pipeline(
        self,
        image_base64: str,
        check_liveness: bool = True,
        min_det_score: float = 0.5,
    ) -> Optional[Dict[str, Any]]:
        """
        Full recognition pipeline: SCRFD detect -> liveness -> 512D ArcFace embedding.
        Returns dict with: face_detected, face_count, embedding, liveness_passed, etc.
        """
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                res = await client.post(
                    f"{self.base_url}/recognition/pipeline",
                    json={
                        "image_base64": image_base64,
                        "check_liveness": check_liveness,
                        "min_det_score": min_det_score,
                    },
                )
                if res.status_code == 200:
                    return res.json()
                logger.warning(f"AI Service pipeline failed: {res.status_code} {res.text}")
                return None
        except Exception as e:
            logger.warning(f"AI Service pipeline request error: {e}")
            return None


# Global singleton instance
ai_client = AIServiceClient()

