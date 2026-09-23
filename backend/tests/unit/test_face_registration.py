"""
Unit tests for Face Registration Service (FRM01 through FRM08).
Conforms to the unit-test specification in Truong_Van_Long_20233089_Unit_Test.xlsx.
"""
from datetime import datetime
from unittest.mock import MagicMock
import numpy as np
import pytest

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
    RegistrationStatus,
)
from app.services.face_registration_service import (
    validate_employee_info,
    open_camera,
    collect_face_samples,
    preprocess_face,
    generate_face_encoding,
    check_duplicate_face,
    save_face_registration,
    complete_face_registration,
)


# ==============================================================================
# FRM01 – validate_employee_info
# ==============================================================================

class TestFRM01ValidateEmployeeInfo:
    def test_utcid01_normal_valid_employee_id(self, mock_repository, valid_employee_profile):
        """UTCID01 (N): valid employee_id -> return EmployeeProfile"""
        res = validate_employee_info("EMP-0001", repository=mock_repository)
        assert res.employee_id == "EMP-0001"
        assert res.status == EmployeeStatus.ACTIVE

    def test_utcid02_abnormal_empty_or_none_id(self, mock_repository):
        """UTCID02 (A): employee_id is None/empty -> ValidationError"""
        with pytest.raises(ValidationError):
            validate_employee_info("", repository=mock_repository)
        with pytest.raises(ValidationError):
            validate_employee_info(None, repository=mock_repository)

    def test_utcid03_abnormal_invalid_type(self, mock_repository):
        """UTCID03 (A): employee_id is non-string -> ValidationError"""
        with pytest.raises(ValidationError):
            validate_employee_info(12345, repository=mock_repository)

    def test_utcid04_abnormal_wrong_format(self, mock_repository):
        """UTCID04 (A): wrong format (plain digits, invalid prefix) -> ValidationError"""
        with pytest.raises(ValidationError):
            validate_employee_info("0001", repository=mock_repository)
        with pytest.raises(ValidationError):
            validate_employee_info("NV-12345", repository=mock_repository)

    def test_utcid05_boundary_employee_not_found(self):
        """UTCID05 (B): employee not found in DB -> NotFoundException"""
        repo = MagicMock()
        repo.get_employee_by_id.return_value = None
        with pytest.raises(NotFoundException):
            validate_employee_info("EMP-9999", repository=repo)

    def test_utcid06_boundary_already_registered(self, valid_employee_profile):
        """UTCID06 (B): employee already has ACTIVE registration -> DuplicateRegistrationException"""
        repo = MagicMock()
        repo.get_employee_by_id.return_value = valid_employee_profile
        repo.employee_has_active_registration.return_value = True
        with pytest.raises(DuplicateRegistrationException):
            validate_employee_info("EMP-0001", repository=repo)

    def test_utcid07_boundary_employee_inactive_or_blocked(self, inactive_employee_profile, blocked_employee_profile):
        """UTCID07 (B): employee status INACTIVE or BLOCKED -> EmployeeStatusException"""
        repo = MagicMock()
        repo.get_employee_by_id.return_value = inactive_employee_profile
        repo.employee_has_active_registration.return_value = False
        with pytest.raises(EmployeeStatusException):
            validate_employee_info("EMP-0002", repository=repo)

        repo.get_employee_by_id.return_value = blocked_employee_profile
        with pytest.raises(EmployeeStatusException):
            validate_employee_info("EMP-0003", repository=repo)


# ==============================================================================
# FRM02 – open_camera
# ==============================================================================

class TestFRM02OpenCamera:
    def test_utcid01_normal_valid_device(self, mock_cv2_success):
        """UTCID01 (N): valid index + device available -> return capture object"""
        cap = open_camera(0, cv2_module=mock_cv2_success)
        assert cap.isOpened() is True

    def test_utcid02_abnormal_invalid_camera_index(self, mock_cv2_success):
        """UTCID02 (A): index is None / non-integer -> CameraInitializationException"""
        with pytest.raises(CameraInitializationException):
            open_camera(None, cv2_module=mock_cv2_success)
        with pytest.raises(CameraInitializationException):
            open_camera("0", cv2_module=mock_cv2_success)

    def test_utcid03_boundary_device_unavailable(self):
        """UTCID03 (B): device unavailable (isOpened=False) -> CameraInitializationException"""
        cv2_mock = MagicMock()
        cap_mock = MagicMock()
        cap_mock.isOpened.return_value = False
        cv2_mock.VideoCapture.return_value = cap_mock
        with pytest.raises(CameraInitializationException):
            open_camera(0, cv2_module=cv2_mock)

    def test_utcid04_abnormal_permission_denied(self):
        """UTCID04 (A): permission denied (OSError) -> PermissionException"""
        cv2_mock = MagicMock()
        cv2_mock.VideoCapture.side_effect = PermissionError("Camera permission denied")
        with pytest.raises(PermissionException):
            open_camera(0, cv2_module=cv2_mock)

    def test_utcid05_boundary_read_returns_false(self):
        """UTCID05 (B): read() returns False -> FrameCaptureException"""
        cv2_mock = MagicMock()
        cap_mock = MagicMock()
        cap_mock.isOpened.return_value = True
        cap_mock.read.return_value = (False, None)
        cv2_mock.VideoCapture.return_value = cap_mock
        with pytest.raises(FrameCaptureException):
            open_camera(0, cv2_module=cv2_mock)

    def test_utcid06_abnormal_frame_empty(self):
        """UTCID06 (A): frame is empty -> FrameCaptureException"""
        cv2_mock = MagicMock()
        cap_mock = MagicMock()
        cap_mock.isOpened.return_value = True
        cap_mock.read.return_value = (True, np.array([]))
        cv2_mock.VideoCapture.return_value = cap_mock
        with pytest.raises(FrameCaptureException):
            open_camera(0, cv2_module=cv2_mock)

    def test_utcid07_boundary_resolution_too_small(self):
        """UTCID07 (B): frame resolution invalid (< 160x120) -> CameraConfigurationException"""
        cv2_mock = MagicMock()
        cap_mock = MagicMock()
        cap_mock.isOpened.return_value = True
        cap_mock.read.return_value = (True, np.zeros((100, 100, 3), dtype=np.uint8))
        cv2_mock.VideoCapture.return_value = cap_mock
        with pytest.raises(CameraConfigurationException):
            open_camera(0, cv2_module=cv2_mock)


# ==============================================================================
# FRM03 – collect_face_samples
# ==============================================================================

class TestFRM03CollectFaceSamples:
    def test_utcid01_normal_valid_frame(self, valid_frame, mock_face_detector):
        """UTCID01 (N): valid frame + exactly 1 face -> accept sample"""
        res = collect_face_samples(valid_frame, required_samples=5, face_detector=mock_face_detector)
        assert res["status"] == "accepted"
        assert len(res["samples"]) == 1

    def test_utcid02_abnormal_no_face(self, valid_frame):
        """UTCID02 (A): no face detected -> FaceDetectionException"""
        detector = MagicMock()
        detector.detect.return_value = []
        with pytest.raises(FaceDetectionException):
            collect_face_samples(valid_frame, required_samples=5, face_detector=detector)

    def test_utcid03_abnormal_multiple_faces(self, valid_frame):
        """UTCID03 (A): multiple faces -> MultipleFaceException"""
        detector = MagicMock()
        detector.detect.return_value = [(10, 10, 80, 80), (100, 100, 80, 80)]
        with pytest.raises(MultipleFaceException):
            collect_face_samples(valid_frame, required_samples=5, face_detector=detector)

    def test_utcid04_abnormal_invalid_bbox(self, valid_frame):
        """UTCID04 (A): invalid bounding box -> FaceDetectionException"""
        detector = MagicMock()
        detector.detect.return_value = [(-10, 10, 80, 80)]
        with pytest.raises(FaceDetectionException):
            collect_face_samples(valid_frame, required_samples=5, face_detector=detector)

    def test_utcid05_abnormal_face_too_small(self, valid_frame):
        """UTCID05 (A): face region too small (< 20px) -> FaceQualityException"""
        detector = MagicMock()
        detector.detect.return_value = [(10, 10, 15, 15)]
        with pytest.raises(FaceQualityException):
            collect_face_samples(valid_frame, required_samples=5, face_detector=detector)

    def test_utcid06_boundary_face_outside_frame(self, valid_frame):
        """UTCID06 (B): face region outside frame boundaries -> FaceQualityException"""
        detector = MagicMock()
        detector.detect.return_value = [(600, 450, 100, 100)]
        with pytest.raises(FaceQualityException):
            collect_face_samples(valid_frame, required_samples=5, face_detector=detector)

    def test_utcid07_normal_required_samples_reached(self, valid_frame, mock_face_detector):
        """UTCID07 (N): required_samples already reached -> collection completed"""
        existing = [np.zeros((80, 80, 3))] * 5
        res = collect_face_samples(valid_frame, required_samples=5, face_detector=mock_face_detector, current_samples=existing)
        assert res["status"] == "completed"

    def test_utcid08_boundary_frame_is_none(self, mock_face_detector):
        """UTCID08 (B): frame is None -> FrameCaptureException"""
        with pytest.raises(FrameCaptureException):
            collect_face_samples(None, required_samples=5, face_detector=mock_face_detector)

    def test_utcid09_abnormal_required_samples_invalid(self, valid_frame, mock_face_detector):
        """UTCID09 (A): required_samples <= 0 -> ValidationError"""
        with pytest.raises(ValidationError):
            collect_face_samples(valid_frame, required_samples=0, face_detector=mock_face_detector)


# ==============================================================================
# FRM04 – preprocess_face
# ==============================================================================

class TestFRM04PreprocessFace:
    def test_utcid01_normal_valid_face_image(self):
        """UTCID01 (N): valid face image -> return preprocessed ndarray"""
        img = np.ones((80, 80, 3), dtype=np.uint8) * 200
        res = preprocess_face(img, target_size=(112, 112))
        assert res.shape == (112, 112, 3)
        assert res.max() <= 1.0

    def test_utcid02_abnormal_image_is_none(self):
        """UTCID02 (A): image is None -> PreprocessException"""
        with pytest.raises(PreprocessException):
            preprocess_face(None)

    def test_utcid03_abnormal_unsupported_format(self):
        """UTCID03 (A): unsupported channel/format (e.g. 1-D array) -> PreprocessException"""
        with pytest.raises(PreprocessException):
            preprocess_face(np.array([1, 2, 3]))

    def test_utcid04_abnormal_empty_roi(self):
        """UTCID04 (A): ROI is empty (zero pixels) -> PreprocessException"""
        with pytest.raises(PreprocessException):
            preprocess_face(np.zeros((0, 0, 3)))

    def test_utcid05_abnormal_invalid_target_size(self):
        """UTCID05 (A): invalid target dimension -> PreprocessException"""
        img = np.ones((80, 80, 3), dtype=np.uint8)
        with pytest.raises(PreprocessException):
            preprocess_face(img, target_size=(0, 112))

    def test_utcid06_boundary_image_nan_or_inf(self):
        """UTCID06 (B): image contains NaN or Inf -> PreprocessException"""
        img = np.ones((80, 80, 3), dtype=np.float32)
        img[10, 10, 0] = np.nan
        with pytest.raises(PreprocessException):
            preprocess_face(img)

    def test_utcid07_boundary_minimum_supported_size(self):
        """UTCID07 (B): valid image at minimum supported size -> return preprocessed ndarray"""
        img = np.ones((20, 20, 3), dtype=np.uint8) * 150
        res = preprocess_face(img, target_size=(112, 112))
        assert res.shape == (112, 112, 3)


# ==============================================================================
# FRM05 – generate_face_encoding
# ==============================================================================

class TestFRM05GenerateFaceEncoding:
    def test_utcid01_normal_valid_preprocessed_face(self, mock_model):
        """UTCID01 (N): valid preprocessed face -> return List[float] (128-D)"""
        img = np.ones((112, 112, 3), dtype=np.float32)
        enc = generate_face_encoding(img, model=mock_model)
        assert len(enc) == 128
        assert isinstance(enc, list)

    def test_utcid02_abnormal_corrupted_image(self, mock_model):
        """UTCID02 (A): corrupted image (NaN) -> EncodingException"""
        img = np.ones((112, 112, 3), dtype=np.float32)
        img[0, 0, 0] = np.nan
        with pytest.raises(EncodingException):
            generate_face_encoding(img, model=mock_model)

    def test_utcid03_abnormal_empty_image(self, mock_model):
        """UTCID03 (A): empty image array -> EncodingException"""
        with pytest.raises(EncodingException):
            generate_face_encoding(np.array([]), model=mock_model)

    def test_utcid04_boundary_model_not_loaded(self):
        """UTCID04 (B): model not loaded (None) -> EncodingException"""
        img = np.ones((112, 112, 3), dtype=np.float32)
        with pytest.raises(EncodingException):
            generate_face_encoding(img, model=None)

    def test_utcid05_boundary_minimum_required_size(self, mock_model):
        """UTCID05 (B): image at minimum required size -> return encoding"""
        img = np.ones((20, 20, 3), dtype=np.float32)
        enc = generate_face_encoding(img, model=mock_model)
        assert len(enc) == 128

    def test_utcid06_abnormal_model_returns_none(self):
        """UTCID06 (A): model returns None encoding -> EncodingException"""
        img = np.ones((112, 112, 3), dtype=np.float32)
        bad_model = MagicMock()
        bad_model.encode.return_value = None
        with pytest.raises(EncodingException):
            generate_face_encoding(img, model=bad_model)

    def test_utcid07_abnormal_image_is_none(self, mock_model):
        """UTCID07 (A): image is None -> EncodingException"""
        with pytest.raises(EncodingException):
            generate_face_encoding(None, model=mock_model)


# ==============================================================================
# FRM06 – check_duplicate_face
# ==============================================================================

class TestFRM06CheckDuplicateFace:
    def test_utcid01_normal_no_duplicate(self, valid_encoding, different_encoding):
        """UTCID01 (N): no similar match -> return False"""
        assert check_duplicate_face(valid_encoding, [different_encoding], threshold=0.6) is False

    def test_utcid02_boundary_similarity_equals_threshold(self, valid_encoding):
        """UTCID02 (B): similarity >= threshold -> DuplicateFaceException"""
        with pytest.raises(DuplicateFaceException):
            check_duplicate_face(valid_encoding, [valid_encoding], threshold=0.6)

    def test_utcid03_normal_empty_existing_encodings(self, valid_encoding):
        """UTCID03 (N): existing_encodings empty -> False"""
        assert check_duplicate_face(valid_encoding, [], threshold=0.6) is False

    def test_utcid04_boundary_similarity_at_boundary(self, valid_encoding):
        """UTCID04 (B): similarity at threshold boundary -> DuplicateFaceException"""
        with pytest.raises(DuplicateFaceException):
            check_duplicate_face(valid_encoding, [valid_encoding], threshold=1.0)

    def test_utcid05_boundary_stored_encoding_malformed(self, valid_encoding):
        """UTCID05 (B): stored encoding malformed -> DataIntegrityException"""
        bad_stored = ["invalid_vector"]
        with pytest.raises(DataIntegrityException):
            check_duplicate_face(valid_encoding, bad_stored)

    def test_utcid06_abnormal_new_encoding_is_none(self, valid_encoding):
        """UTCID06 (A): new_encoding is None -> ValidationError"""
        with pytest.raises(ValidationError):
            check_duplicate_face(None, [valid_encoding])

    def test_utcid07_abnormal_threshold_negative(self, valid_encoding):
        """UTCID07 (A): threshold < 0 -> ValidationError"""
        with pytest.raises(ValidationError):
            check_duplicate_face(valid_encoding, [valid_encoding], threshold=-0.1)


# ==============================================================================
# FRM07 – save_face_registration
# ==============================================================================

class TestFRM07SaveFaceRegistration:
    def test_utcid01_normal_valid_inputs(self, valid_encoding, valid_metadata, mock_repository):
        """UTCID01 (N): valid inputs -> True"""
        assert save_face_registration("EMP-0001", valid_encoding, valid_metadata, repository=mock_repository) is True

    def test_utcid02_abnormal_missing_employee_id(self, valid_encoding, valid_metadata):
        """UTCID02 (A): employee_id is None -> ValidationError"""
        with pytest.raises(ValidationError):
            save_face_registration(None, valid_encoding, valid_metadata)

    def test_utcid03_abnormal_missing_encoding(self, valid_metadata):
        """UTCID03 (A): encoding is None -> ValidationError"""
        with pytest.raises(ValidationError):
            save_face_registration("EMP-0001", None, valid_metadata)

    def test_utcid04_boundary_unique_constraint_violation(self, valid_encoding, valid_metadata):
        """UTCID04 (B): unique constraint violation -> DatabaseConstraintException"""
        repo = MagicMock()
        repo.save_registration.side_effect = DatabaseConstraintException("Unique constraint failed")
        with pytest.raises(DatabaseConstraintException):
            save_face_registration("EMP-0001", valid_encoding, valid_metadata, repository=repo)

    def test_utcid05_boundary_database_unavailable(self, valid_encoding, valid_metadata):
        """UTCID05 (B): database unavailable -> DatabaseException"""
        repo = MagicMock()
        repo.save_registration.side_effect = DatabaseException("Database connection error")
        with pytest.raises(DatabaseException):
            save_face_registration("EMP-0001", valid_encoding, valid_metadata, repository=repo)

    def test_utcid06_boundary_transaction_failure(self, valid_encoding, valid_metadata):
        """UTCID06 (B): transaction commit failure -> TransactionException"""
        repo = MagicMock()
        repo.save_registration.side_effect = TransactionException("Commit error")
        with pytest.raises(TransactionException):
            save_face_registration("EMP-0001", valid_encoding, valid_metadata, repository=repo)

    def test_utcid07_abnormal_metadata_missing_fields(self, valid_encoding):
        """UTCID07 (A): metadata missing required fields -> ValidationError"""
        with pytest.raises(ValidationError):
            save_face_registration("EMP-0001", valid_encoding, {"foo": "bar"})

    def test_utcid08_normal_valid_with_dict_metadata(self, valid_encoding, mock_repository):
        """UTCID08 (N): valid with dictionary metadata -> True"""
        meta_dict = {"registered_at": datetime.utcnow(), "status": RegistrationStatus.ACTIVE}
        assert save_face_registration("EMP-0001", valid_encoding, meta_dict, repository=mock_repository) is True


# ==============================================================================
# FRM08 – complete_face_registration
# ==============================================================================

class TestFRM08CompleteFaceRegistration:
    def test_utcid01_normal_all_stages_successful(self, valid_context, mock_repository):
        """UTCID01 (N): all stages successful -> RegistrationResponse(success=True)"""
        res = complete_face_registration(valid_context, repository=mock_repository)
        assert res.success is True
        assert res.employee_id == "EMP-0001"
        assert res.status == RegistrationStatus.ACTIVE

    def test_utcid02_abnormal_incomplete_samples(self, valid_context, mock_repository):
        """UTCID02 (A): face_samples empty -> RegistrationException"""
        valid_context.face_samples = []
        with pytest.raises(RegistrationException):
            complete_face_registration(valid_context, repository=mock_repository)

    def test_utcid03_boundary_encoding_is_none(self, valid_context, mock_repository):
        """UTCID03 (B): encoding is None -> RegistrationException"""
        valid_context.encoding = None
        with pytest.raises(RegistrationException):
            complete_face_registration(valid_context, repository=mock_repository)

    def test_utcid04_boundary_duplicate_detected(self, valid_context, valid_encoding):
        """UTCID04 (B): duplicate detected -> DuplicateFaceException"""
        repo = MagicMock()
        repo.get_all_encodings.return_value = [valid_encoding]
        with pytest.raises(DuplicateFaceException):
            complete_face_registration(valid_context, repository=repo)

    def test_utcid05_boundary_save_failed(self, valid_context):
        """UTCID05 (B): save failed -> RegistrationException"""
        repo = MagicMock()
        repo.get_all_encodings.return_value = []
        repo.save_registration.side_effect = DatabaseException("DB error")
        with pytest.raises(RegistrationException):
            complete_face_registration(valid_context, repository=repo)

    def test_utcid06_abnormal_user_cancelled(self, valid_context, mock_repository):
        """UTCID06 (A): user cancelled -> CancellationException"""
        valid_context.cancelled = True
        with pytest.raises(CancellationException):
            complete_face_registration(valid_context, repository=mock_repository)

    def test_utcid07_normal_response_contains_expected_fields(self, valid_context, mock_repository):
        """UTCID07 (N): success response contains employee_id, status, registered_at"""
        res = complete_face_registration(valid_context, repository=mock_repository)
        assert res.employee_id == "EMP-0001"
        assert res.status == RegistrationStatus.ACTIVE
        assert res.registered_at is not None

    def test_utcid08_abnormal_context_is_none(self, mock_repository):
        """UTCID08 (A): context is None -> ValidationError"""
        with pytest.raises(ValidationError):
            complete_face_registration(None, repository=mock_repository)
