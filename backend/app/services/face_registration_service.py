"""
Face Registration Service - FRM01 through FRM08.

Each public function maps directly to one FRM sheet in the unit-test spec
(Truong_Van_Long_20233089_Unit_Test.xlsx).
"""
from __future__ import annotations

import logging
import re
from datetime import datetime
from typing import Any, List, Optional

import numpy as np

from app.core.exceptions import (
    CameraConfigurationException,
    CameraInitializationException,
    CancellationException,
    DataIntegrityException,
    DatabaseConstraintException,
    DatabaseException,
    DuplicateFaceException,
    DuplicateRegistrationException,
    EmployeeStatusException,
    EncodingException,
    FaceDetectionException,
    FaceQualityException,
    FrameCaptureException,
    MultipleFaceException,
    NotFoundException,
    PermissionException,
    PreprocessException,
    RegistrationException,
    TransactionException,
    ValidationError,
)
from app.schemas.face_registration import (
    EmployeeProfile,
    EmployeeStatus,
    FaceRegistrationMetadata,
    RegistrationContext,
    RegistrationResponse,
    RegistrationStatus,
)

logger = logging.getLogger(__name__)

# Regex pattern for valid employee IDs: EMP-XXXX (letters/digits after dash)
_EMPLOYEE_ID_PATTERN = re.compile(r"^EMP-[A-Z0-9]{1,10}$")

# Minimum face dimension (pixels) accepted by the pipeline
_MIN_FACE_SIZE = 20

# Default similarity threshold for duplicate detection
_DEFAULT_THRESHOLD = 0.6

# Minimum camera frame resolution
_MIN_FRAME_WIDTH = 160
_MIN_FRAME_HEIGHT = 120


# ──────────────────────────────────────────────────────────────
# FRM01 – validate_employee_info
# ──────────────────────────────────────────────────────────────

def validate_employee_info(employee_id: Any, repository: Any = None) -> EmployeeProfile:
    """
    Validate employee information before starting face registration.

    FRM01 test cases:
      UTCID01 (N) : valid employee_id -> return EmployeeProfile
      UTCID02 (A) : employee_id is None/empty -> ValidationError
      UTCID03 (A) : employee_id is non-string / bad type -> ValidationError
      UTCID04 (A) : wrong format (e.g. plain digits) -> ValidationError
      UTCID05 (B) : employee not found in DB -> NotFoundException
      UTCID06 (B) : employee already has ACTIVE registration -> DuplicateRegistrationException
      UTCID07 (B) : employee status INACTIVE or BLOCKED -> EmployeeStatusException
    """
    # UTCID02 – None or empty
    if not employee_id:
        logger.warning("Employee ID is required")
        raise ValidationError("Employee ID is required")

    # UTCID03 – must be a string
    if not isinstance(employee_id, str):
        logger.warning("Employee ID is required")
        raise ValidationError("Employee ID is required")

    employee_id = employee_id.strip()

    if not employee_id:
        logger.warning("Employee ID is required")
        raise ValidationError("Employee ID is required")

    # UTCID04 – format check
    if not _EMPLOYEE_ID_PATTERN.match(employee_id):
        logger.warning("Invalid employee ID format")
        raise ValidationError("Invalid employee ID format")

    # Repository calls (mocked during unit tests)
    if repository is not None:
        profile: Optional[EmployeeProfile] = repository.get_employee_by_id(employee_id)

        # UTCID05 – not found
        if profile is None:
            logger.warning("Employee not found")
            raise NotFoundException("Employee not found")

        # UTCID06 – already has active face registration
        if repository.employee_has_active_registration(employee_id):
            logger.warning("Face data already registered")
            raise DuplicateRegistrationException("Face data already registered")

        # UTCID07 – inactive / blocked
        if profile.status in (EmployeeStatus.INACTIVE, EmployeeStatus.BLOCKED):
            logger.warning("Employee is inactive or blocked")
            raise EmployeeStatusException("Employee is inactive or blocked")

        logger.info("Employee information is valid")
        return profile

    # UTCID01 – no repository provided (simple validation only)
    logger.info("Employee information is valid")
    return EmployeeProfile(
        employee_id=employee_id,
        name="Unknown",
        status=EmployeeStatus.ACTIVE,
    )


# ──────────────────────────────────────────────────────────────
# FRM02 – open_camera
# ──────────────────────────────────────────────────────────────

def open_camera(camera_index: Any, cv2_module: Any = None):
    """
    Open the camera device for face-sample collection.

    FRM02 test cases:
      UTCID01 (N) : valid index + device available -> return capture object
      UTCID02 (A) : index is None / non-integer -> CameraInitializationException
      UTCID03 (B) : device unavailable (isOpened=False) -> CameraInitializationException
      UTCID04 (A) : permission denied (OSError) -> PermissionException
      UTCID05 (B) : read() returns False -> FrameCaptureException
      UTCID06 (A) : frame is None or empty -> FrameCaptureException
      UTCID07 (B) : frame resolution invalid -> CameraConfigurationException
    """
    import cv2 as _cv2

    if cv2_module is None:
        cv2_module = _cv2

    # UTCID02 – index validation
    if camera_index is None or not isinstance(camera_index, int):
        logger.warning("Invalid camera index")
        raise CameraInitializationException("Invalid camera index")

    # Open device
    try:
        cap = cv2_module.VideoCapture(camera_index)
    except PermissionError:
        logger.warning("Camera permission denied")
        raise PermissionException("Camera permission denied")
    except OSError as exc:
        if "permission" in str(exc).lower() or "access" in str(exc).lower():
            logger.warning("Camera permission denied")
            raise PermissionException("Camera permission denied")
        logger.warning("Cannot open camera")
        raise CameraInitializationException("Cannot open camera")

    # UTCID03 – device not opened
    if not cap.isOpened():
        logger.warning("Cannot open camera")
        raise CameraInitializationException("Cannot open camera")

    # UTCID04 – permission error raised by isOpened check via mock
    # (handled above via OSError branch)

    # Test-read one frame to verify capture quality
    ret, frame = cap.read()

    # UTCID05 – read() returns False
    if not ret:
        cap.release()
        logger.warning("Failed to read camera frame")
        raise FrameCaptureException("Failed to read camera frame")

    # UTCID06 – frame is None or empty array
    if frame is None or (hasattr(frame, "size") and frame.size == 0):
        cap.release()
        logger.warning("Captured frame is empty")
        raise FrameCaptureException("Captured frame is empty")

    # UTCID07 – resolution check
    if hasattr(frame, "shape") and len(frame.shape) >= 2:
        h, w = frame.shape[:2]
        if w < _MIN_FRAME_WIDTH or h < _MIN_FRAME_HEIGHT:
            cap.release()
            logger.warning("Invalid camera frame resolution")
            raise CameraConfigurationException("Invalid camera frame resolution")

    logger.info("Camera opened successfully")
    return cap


# ──────────────────────────────────────────────────────────────
# FRM03 – collect_face_samples
# ──────────────────────────────────────────────────────────────

def collect_face_samples(
    frame: Any,
    required_samples: int,
    face_detector: Any = None,
    current_samples: Optional[List[Any]] = None,
) -> dict:
    """
    Process a single camera frame and collect a valid face sample.

    FRM03 test cases:
      UTCID01 (N) : valid frame + exactly 1 face -> accept sample
      UTCID02 (A) : no face detected -> FaceDetectionException
      UTCID03 (A) : multiple faces -> MultipleFaceException
      UTCID04 (A) : invalid bounding box (negative/zero coords) -> FaceDetectionException
      UTCID05 (A) : face region too small -> FaceQualityException
      UTCID06 (B) : face region outside frame boundaries -> FaceQualityException
      UTCID07 (N) : required_samples already reached -> collection completed
      UTCID08 (B) : frame is None (camera stopped early) -> FrameCaptureException
      UTCID09 (A) : required_samples <= 0 -> ValidationError
    """
    # UTCID09 – invalid configuration
    if not isinstance(required_samples, int) or required_samples <= 0:
        logger.warning("Required sample count must be greater than zero")
        raise ValidationError("Required sample count must be greater than zero")

    # UTCID08 – camera stopped / null frame
    if frame is None:
        logger.warning("Insufficient face samples")
        raise FrameCaptureException("Insufficient face samples")

    if current_samples is None:
        current_samples = []

    # UTCID07 – already have enough samples
    if len(current_samples) >= required_samples:
        logger.info("Face samples collected successfully")
        return {"status": "completed", "samples": current_samples}

    # Detect faces in frame
    if face_detector is None:
        raise FaceDetectionException("No face detected")

    detections = face_detector.detect(frame)

    # UTCID02 – no face
    if detections is None or len(detections) == 0:
        logger.warning("No face detected")
        raise FaceDetectionException("No face detected")

    # UTCID03 – multiple faces
    if len(detections) > 1:
        logger.warning("Multiple faces detected")
        raise MultipleFaceException("Multiple faces detected")

    bbox = detections[0]

    # UTCID04 – invalid bounding box
    if (
        not isinstance(bbox, (list, tuple))
        or len(bbox) < 4
        or any(v < 0 for v in bbox[:4])
        or bbox[2] == 0
        or bbox[3] == 0
    ):
        logger.warning("Invalid face bounding box")
        raise FaceDetectionException("Invalid face bounding box")

    x, y, w, h = bbox[:4]

    # UTCID05 – face too small
    if w < _MIN_FACE_SIZE or h < _MIN_FACE_SIZE:
        logger.warning("Face is too small")
        raise FaceQualityException("Face is too small")

    # UTCID06 – face region outside frame
    if hasattr(frame, "shape"):
        fh, fw = frame.shape[:2]
        if x + w > fw or y + h > fh:
            logger.warning("Face region is outside frame")
            raise FaceQualityException("Face region is outside frame")

    # UTCID01 – good sample
    face_roi = frame[y : y + h, x : x + w] if hasattr(frame, "__getitem__") else bbox
    current_samples.append(face_roi)
    logger.info("Face detected")

    if len(current_samples) >= required_samples:
        logger.info("Face samples collected successfully")
        return {"status": "completed", "samples": current_samples}

    return {"status": "accepted", "samples": current_samples}


# ──────────────────────────────────────────────────────────────
# FRM04 – preprocess_face
# ──────────────────────────────────────────────────────────────

def preprocess_face(
    face_image: Any,
    target_size: tuple = (112, 112),
) -> np.ndarray:
    """
    Resize, normalise, and validate a face image for encoding.

    FRM04 test cases:
      UTCID01 (N) : valid face image -> return preprocessed ndarray
      UTCID02 (A) : image is None -> PreprocessException
      UTCID03 (A) : unsupported channel/format -> PreprocessException
      UTCID04 (A) : ROI is empty (zero pixels) -> PreprocessException
      UTCID05 (A) : invalid target dimension (0 or negative) -> PreprocessException
      UTCID06 (B) : image contains NaN or Inf values -> PreprocessException
      UTCID07 (B) : valid image at minimum supported size -> return preprocessed ndarray
    """
    # UTCID02 – None input
    if face_image is None:
        logger.warning("Input image is null")
        raise PreprocessException("Input image is null")

    # UTCID05 – target dimension check
    if (
        not isinstance(target_size, tuple)
        or len(target_size) < 2
        or target_size[0] <= 0
        or target_size[1] <= 0
    ):
        logger.warning("Invalid target dimensions")
        raise PreprocessException("Invalid target dimensions")

    img = np.asarray(face_image, dtype=np.float32)

    # UTCID04 – empty ROI
    if img.size == 0:
        logger.warning("Face ROI is empty")
        raise PreprocessException("Face ROI is empty")

    # UTCID03 – channel check (must be 2-D greyscale or 3-channel BGR/RGB)
    if img.ndim == 1 or (img.ndim == 3 and img.shape[2] not in (1, 3, 4)):
        logger.warning("Unsupported image format/channel")
        raise PreprocessException("Unsupported image format/channel")

    # UTCID06 – NaN / Inf
    if not np.isfinite(img).all():
        logger.warning("Image contains invalid values")
        raise PreprocessException("Image contains invalid values")

    # Resize to target
    import cv2
    if img.ndim == 3 and img.shape[2] == 4:
        img = img[:, :, :3]  # drop alpha

    resized = cv2.resize(img, (target_size[1], target_size[0]))

    # Normalise to [0, 1]
    if resized.max() > 1.0:
        resized = resized / 255.0

    logger.info("Face image preprocessed")
    return resized


# ──────────────────────────────────────────────────────────────
# FRM05 – generate_face_encoding
# ──────────────────────────────────────────────────────────────

def generate_face_encoding(
    face_image: Any,
    model: Any = None,
) -> List[float]:
    """
    Generate a 128-D face-encoding vector from a pre-processed image.

    FRM05 test cases:
      UTCID01 (N) : valid preprocessed face -> return List[float] (128-D)
      UTCID02 (A) : invalid / corrupted image -> EncodingException
      UTCID03 (A) : empty image array -> EncodingException
      UTCID04 (B) : model not loaded (None) -> EncodingException
      UTCID05 (B) : image at minimum required size -> return encoding
      UTCID06 (A) : model returns None encoding -> EncodingException
      UTCID07 (A) : image is None -> EncodingException
    """
    # UTCID07 – None input
    if face_image is None:
        logger.warning("Cannot generate face encoding")
        raise EncodingException("Cannot generate face encoding")

    # UTCID04 – model not available
    if model is None:
        logger.warning("Cannot generate face encoding")
        raise EncodingException("Cannot generate face encoding")

    img = np.asarray(face_image, dtype=np.float32)

    # UTCID03 – empty array
    if img.size == 0:
        logger.warning("Cannot generate face encoding")
        raise EncodingException("Cannot generate face encoding")

    # UTCID02 – invalid pixel values
    if not np.isfinite(img).all():
        logger.warning("Cannot generate face encoding")
        raise EncodingException("Cannot generate face encoding")

    try:
        encoding = model.encode(img)
    except Exception as exc:
        logger.warning("Cannot generate face encoding")
        raise EncodingException("Cannot generate face encoding") from exc

    # UTCID06 – model returned None
    if encoding is None:
        logger.warning("Cannot generate face encoding")
        raise EncodingException("Cannot generate face encoding")

    result = list(encoding)
    logger.info("Face encoding generated successfully")
    return result


# ──────────────────────────────────────────────────────────────
# FRM06 – check_duplicate_face
# ──────────────────────────────────────────────────────────────

def check_duplicate_face(
    new_encoding: Any,
    existing_encodings: Any,
    threshold: float = _DEFAULT_THRESHOLD,
) -> bool:
    """
    Return True if new_encoding is similar enough to any stored encoding.

    FRM06 test cases:
      UTCID01 (N) : no similar match -> return False
      UTCID02 (B) : similarity == threshold -> True (DuplicateFaceException)
      UTCID03 (N) : existing_encodings empty -> False
      UTCID04 (B) : similarity exactly at boundary -> True (DuplicateFaceException)
      UTCID05 (B) : stored encoding malformed -> DataIntegrityException
      UTCID06 (A) : new_encoding is None -> ValidationError
      UTCID07 (A) : threshold < 0 -> ValidationError
    """
    # UTCID06 – null new encoding
    if new_encoding is None:
        logger.warning("Encoding vector is null")
        raise ValidationError("Encoding vector is null")

    # UTCID07 – invalid threshold
    if not isinstance(threshold, (int, float)) or threshold < 0:
        logger.warning("Invalid duplicate threshold")
        raise ValidationError("Invalid duplicate threshold")

    # UTCID03 – nothing to compare
    if not existing_encodings:
        logger.info("No duplicate face found")
        return False

    new_vec = np.asarray(new_encoding, dtype=np.float64)

    for stored in existing_encodings:
        # UTCID05 – malformed stored encoding
        try:
            stored_vec = np.asarray(stored, dtype=np.float64)
            if stored_vec.ndim != 1 or stored_vec.size == 0:
                raise ValueError("empty or multi-dim")
            if not np.isfinite(stored_vec).all():
                raise ValueError("non-finite values")
        except (ValueError, TypeError) as exc:
            logger.warning("Stored encoding is invalid")
            raise DataIntegrityException("Stored encoding is invalid") from exc

        # Cosine similarity
        denom = np.linalg.norm(new_vec) * np.linalg.norm(stored_vec)
        if denom == 0:
            continue
        similarity = float(np.dot(new_vec, stored_vec) / denom)

        # UTCID02/04 – at or above threshold -> duplicate
        if similarity >= threshold:
            logger.warning("Face already registered")
            raise DuplicateFaceException("Face already registered")

    logger.info("No duplicate face found")
    return False


# ──────────────────────────────────────────────────────────────
# FRM07 – save_face_registration
# ──────────────────────────────────────────────────────────────

def save_face_registration(
    employee_id: Any,
    encoding: Any,
    metadata: Any,
    repository: Any = None,
) -> bool:
    """
    Persist a face registration record to the database.

    FRM07 test cases:
      UTCID01 (N) : valid inputs -> True (registration saved)
      UTCID02 (A) : employee_id is None -> ValidationError
      UTCID03 (A) : encoding is None -> ValidationError
      UTCID04 (B) : unique constraint violation -> DatabaseConstraintException
      UTCID05 (B) : database unavailable -> DatabaseException
      UTCID06 (B) : transaction commit failure -> TransactionException
      UTCID07 (A) : metadata missing timestamp/status -> ValidationError
      UTCID08 (N) : valid with all metadata -> True
    """
    # UTCID02 – missing employee_id
    if not employee_id:
        logger.warning("Employee ID is required")
        raise ValidationError("Employee ID is required")

    # UTCID03 – missing encoding
    if encoding is None:
        logger.warning("Face encoding is required")
        raise ValidationError("Face encoding is required")

    # UTCID07 – metadata validation
    if metadata is None:
        logger.warning("Required registration metadata is missing")
        raise ValidationError("Required registration metadata is missing")

    if isinstance(metadata, dict):
        if "registered_at" not in metadata or "status" not in metadata:
            logger.warning("Required registration metadata is missing")
            raise ValidationError("Required registration metadata is missing")
        meta_obj = FaceRegistrationMetadata(**metadata)
    elif isinstance(metadata, FaceRegistrationMetadata):
        meta_obj = metadata
    else:
        logger.warning("Required registration metadata is missing")
        raise ValidationError("Required registration metadata is missing")

    # Persist via repository (may raise DB exceptions)
    if repository is not None:
        repository.save_registration(employee_id, encoding, meta_obj)

    logger.info("Face registration saved")
    return True


# ──────────────────────────────────────────────────────────────
# FRM08 – complete_face_registration
# ──────────────────────────────────────────────────────────────

def complete_face_registration(
    context: Any,
    repository: Any = None,
) -> RegistrationResponse:
    """
    Orchestrate the final stage of face registration.

    FRM08 test cases:
      UTCID01 (N) : all stages successful -> RegistrationResponse(success=True)
      UTCID02 (A) : face_samples empty/incomplete -> RegistrationException
      UTCID03 (B) : encoding is None -> RegistrationException
      UTCID04 (B) : duplicate detected -> DuplicateFaceException
      UTCID05 (B) : save failed -> RegistrationException
      UTCID06 (A) : user cancelled -> CancellationException
      UTCID07 (N) : success response contains employee_id + status -> RegistrationResponse
      UTCID08 (A) : context is None -> ValidationError
    """
    # UTCID08 – null context
    if context is None:
        logger.warning("Registration context is invalid")
        raise ValidationError("Registration context is invalid")

    if not isinstance(context, (RegistrationContext, dict)):
        logger.warning("Registration context is invalid")
        raise ValidationError("Registration context is invalid")

    if isinstance(context, dict):
        try:
            context = RegistrationContext(**context)
        except Exception:
            logger.warning("Registration context is invalid")
            raise ValidationError("Registration context is invalid")

    # UTCID06 – user cancelled
    if context.cancelled:
        logger.info("Registration cancelled")
        raise CancellationException("Registration cancelled")

    # UTCID02 – incomplete face samples
    if not context.face_samples:
        logger.warning("Registration is incomplete")
        raise RegistrationException("Registration is incomplete")

    # UTCID03 – encoding not generated
    if context.encoding is None:
        logger.warning("Cannot generate face encoding")
        raise RegistrationException("Cannot generate face encoding")

    # UTCID04 – duplicate face (already raised by check_duplicate_face,
    #            but handle if repository signals it)
    if repository is not None:
        existing = repository.get_all_encodings()
        for stored in existing:
            try:
                stored_vec = np.asarray(stored, dtype=np.float64)
                new_vec = np.asarray(context.encoding, dtype=np.float64)
                denom = np.linalg.norm(new_vec) * np.linalg.norm(stored_vec)
                if denom > 0:
                    similarity = float(np.dot(new_vec, stored_vec) / denom)
                    if similarity >= _DEFAULT_THRESHOLD:
                        logger.warning("Face already registered")
                        raise DuplicateFaceException("Face already registered")
            except DuplicateFaceException:
                raise
            except Exception:
                pass

    # Build metadata if absent
    metadata = context.metadata or FaceRegistrationMetadata(
        registered_at=datetime.utcnow(),
        status=RegistrationStatus.ACTIVE,
    )

    # UTCID05 – save failure (repository raises DB exceptions)
    try:
        save_face_registration(
            employee_id=context.employee_id,
            encoding=context.encoding,
            metadata=metadata,
            repository=repository,
        )
    except (ValidationError, DatabaseConstraintException,
            DatabaseException, TransactionException) as exc:
        logger.warning("Cannot save face registration")
        raise RegistrationException("Cannot save face registration") from exc

    # UTCID01 / UTCID07 – success
    logger.info("Face registration completed successfully")
    return RegistrationResponse(
        success=True,
        employee_id=context.employee_id,
        status=RegistrationStatus.ACTIVE,
        message="Face registration completed successfully",
        registered_at=metadata.registered_at,
    )
