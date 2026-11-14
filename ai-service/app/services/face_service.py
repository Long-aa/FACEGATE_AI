"""
FaceService: InsightFace SCRFD detection + ArcFace embedding extraction.
Uses insightface.app.FaceAnalysis with model 'buffalo_l' (SCRFD + ArcFace 512D).
Singleton pattern — loaded once at startup.
"""
import logging
import numpy as np
from typing import List, Optional, Dict, Any
import os

logger = logging.getLogger(__name__)


class FaceService:
    def __init__(self):
        self._app = None
        self._loaded = False

    def load_models(self, models_dir: str = "models"):
        """Load InsightFace models. Downloads automatically if not cached."""
        try:
            import insightface
            from insightface.app import FaceAnalysis

            os.makedirs(models_dir, exist_ok=True)
            # Use buffalo_l: SCRFD-10G (det) + ArcFace-R100 (rec)
            self._app = FaceAnalysis(
                name="buffalo_l",
                root=models_dir,
                providers=["CPUExecutionProvider"],
            )
            self._app.prepare(ctx_id=-1, det_size=(640, 640))
            self._loaded = True
            logger.info("InsightFace buffalo_l models loaded successfully")
        except Exception as e:
            logger.warning(f"Could not load InsightFace models: {e}. AI service running in fallback mode.")
            self._loaded = False

    @property
    def is_loaded(self) -> bool:
        return self._loaded

    def detect_faces(self, image: np.ndarray) -> List[Dict[str, Any]]:
        """
        Detect faces in an image.
        Returns list of dicts with keys: bbox, kps, det_score, embedding (512D ndarray).
        """
        if not self._loaded or self._app is None:
            raise RuntimeError("InsightFace models not loaded")
        faces = self._app.get(image)
        result = []
        for face in faces:
            emb = face.embedding
            if emb is not None:
                norm = np.linalg.norm(emb)
                if norm > 0:
                    emb = emb / norm
            result.append({
                "bbox": face.bbox.tolist(),
                "kps": face.kps.tolist() if face.kps is not None else None,
                "det_score": float(face.det_score) if face.det_score is not None else 0.0,
                "embedding": emb,
            })
        return result

    def extract_embedding(self, image: np.ndarray) -> Optional[np.ndarray]:
        """
        Extract ArcFace 512D embedding from an image.
        Finds the largest/most-confident face and returns its embedding.
        Returns None if no face detected.
        """
        faces = self.detect_faces(image)
        if not faces:
            return None
        best = max(faces, key=lambda f: f["det_score"])
        return best["embedding"]

    def get_face_count(self, image: np.ndarray) -> int:
        """Return number of faces detected in image."""
        faces = self.detect_faces(image)
        return len(faces)


# Singleton instance
face_service = FaceService()

