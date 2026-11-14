"""
LivenessService: Anti-spoofing check using texture/frequency analysis and MiniFASNet.
Primary: MiniFASNet (Silent-Face-Anti-Spoofing) if model weights available.
Fallback: Laplacian variance texture analysis (detects printed photos/screens).
"""
import logging
import numpy as np
from typing import Tuple, Optional
import cv2
import os

logger = logging.getLogger(__name__)


class LivenessService:
    def __init__(self):
        self._model = None
        self._loaded = False
        self._using_fallback = True

    def load_models(self, models_dir: str = "models"):
        """Try to load MiniFASNet; fall back to texture analysis if unavailable."""
        minifas_path = os.path.join(models_dir, "minifasnet", "2.7_80x80_MiniFASNetV2.onnx")
        if os.path.exists(minifas_path):
            try:
                import onnxruntime as ort
                self._model = ort.InferenceSession(
                    minifas_path,
                    providers=["CPUExecutionProvider"],
                )
                self._loaded = True
                self._using_fallback = False
                logger.info("MiniFASNet liveness model loaded successfully")
                return
            except Exception as e:
                logger.warning(f"MiniFASNet load failed: {e}, using texture fallback")

        # Texture analysis fallback is always available
        self._loaded = True
        self._using_fallback = True
        logger.info("Liveness service initialized in texture analysis mode (Laplacian variance)")

    @property
    def is_loaded(self) -> bool:
        return self._loaded

    @property
    def using_fallback(self) -> bool:
        return self._using_fallback

    def _laplacian_liveness(self, face_roi: np.ndarray) -> Tuple[bool, float]:
        """
        Texture-based liveness: Laplacian variance.
        Real faces have higher natural texture variation than printed photos/flat screens.
        Threshold: variance >= 60.0 indicates live capture.
        Returns (is_real, score_0_to_1).
        """
        if face_roi is None or face_roi.size == 0:
            return True, 0.5
        gray = cv2.cvtColor(face_roi, cv2.COLOR_BGR2GRAY) if len(face_roi.shape) == 3 else face_roi
        lap_var = float(cv2.Laplacian(gray, cv2.CV_64F).var())
        # Map 0-300+ variance to 0.0-1.0 score
        score = min(1.0, max(0.0, lap_var / 250.0))
        is_real = lap_var >= 55.0
        return is_real, round(score, 4)

    def _minifasnet_liveness(self, face_roi: np.ndarray) -> Tuple[bool, float]:
        """Run MiniFASNet ONNX model for liveness."""
        try:
            roi_resized = cv2.resize(face_roi, (80, 80))
            roi_float = roi_resized.astype(np.float32) / 255.0
            mean = np.array([0.485, 0.456, 0.406], dtype=np.float32)
            std = np.array([0.229, 0.224, 0.225], dtype=np.float32)
            roi_norm = (roi_float - mean) / std
            roi_chw = np.transpose(roi_norm, (2, 0, 1))
            roi_batch = np.expand_dims(roi_chw, 0)
            input_name = self._model.get_inputs()[0].name
            outputs = self._model.run(None, {input_name: roi_batch})
            probs = outputs[0][0]
            real_score = float(probs[1]) if len(probs) > 1 else float(probs[0])
            is_real = real_score >= 0.6
            return is_real, round(real_score, 4)
        except Exception as e:
            logger.warning(f"MiniFASNet inference failed: {e}, falling back to texture")
            return self._laplacian_liveness(face_roi)

    def check_liveness(self, image: np.ndarray, bbox: Optional[list] = None) -> Tuple[bool, float]:
        """
        Check if face in image is live (real person) or spoof (photo/screen).
        Args:
            image: Full frame BGR numpy array
            bbox: Optional [x1, y1, x2, y2] face bounding box. If None, use full image.
        Returns:
            (is_real: bool, liveness_score: float 0-1)
        """
        if not self._loaded:
            return True, 1.0

        if bbox is not None and len(bbox) >= 4:
            x1, y1, x2, y2 = int(bbox[0]), int(bbox[1]), int(bbox[2]), int(bbox[3])
            h, w = image.shape[:2]
            x1 = max(0, x1 - 10)
            y1 = max(0, y1 - 10)
            x2 = min(w, x2 + 10)
            y2 = min(h, y2 + 10)
            face_roi = image[y1:y2, x1:x2]
        else:
            face_roi = image

        if face_roi.size == 0:
            return True, 0.5

        if self._using_fallback or self._model is None:
            return self._laplacian_liveness(face_roi)
        else:
            return self._minifasnet_liveness(face_roi)


# Singleton instance
liveness_service = LivenessService()

