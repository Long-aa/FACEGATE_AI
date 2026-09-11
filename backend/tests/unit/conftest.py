"""
Shared pytest fixtures for FRM01-FRM08 unit tests.
All external dependencies (DB, camera, AI model) are mocked.
"""
from __future__ import annotations

from datetime import datetime
from unittest.mock import MagicMock

import numpy as np
import pytest

from app.schemas.face_registration import (
    EmployeeProfile,
    EmployeeStatus,
    FaceRegistrationMetadata,
    RegistrationContext,
    RegistrationStatus,
)


# ──────────────────────────────────────────────────────────────
# Employee fixtures
# ──────────────────────────────────────────────────────────────

@pytest.fixture()
def valid_employee_profile():
    return EmployeeProfile(
        employee_id="EMP-0001",
        name="Nguyen Van A",
        department="IT",
        position="Engineer",
        status=EmployeeStatus.ACTIVE,
        has_face_registration=False,
    )


@pytest.fixture()
def inactive_employee_profile():
    return EmployeeProfile(
        employee_id="EMP-0002",
        name="Tran Thi B",
        status=EmployeeStatus.INACTIVE,
        has_face_registration=False,
    )


@pytest.fixture()
def blocked_employee_profile():
    return EmployeeProfile(
        employee_id="EMP-0003",
        name="Le Van C",
        status=EmployeeStatus.BLOCKED,
        has_face_registration=False,
    )


# ──────────────────────────────────────────────────────────────
# Repository mock
# ──────────────────────────────────────────────────────────────

@pytest.fixture()
def mock_repository(valid_employee_profile):
    repo = MagicMock()
    repo.get_employee_by_id.return_value = valid_employee_profile
    repo.employee_has_active_registration.return_value = False
    repo.get_all_encodings.return_value = []
    repo.save_registration.return_value = True
    return repo


# ──────────────────────────────────────────────────────────────
# Camera / CV fixtures
# ──────────────────────────────────────────────────────────────

@pytest.fixture()
def valid_frame():
    """480x640 BGR frame with valid content."""
    return np.zeros((480, 640, 3), dtype=np.uint8)


@pytest.fixture()
def small_valid_frame():
    """Minimum-resolution frame (160x120)."""
    return np.zeros((120, 160, 3), dtype=np.uint8)


@pytest.fixture()
def mock_cv2_success(valid_frame):
    """cv2 mock that simulates a healthy camera device."""
    cap = MagicMock()
    cap.isOpened.return_value = True
    cap.read.return_value = (True, valid_frame)
    cv2 = MagicMock()
    cv2.VideoCapture.return_value = cap
    return cv2


@pytest.fixture()
def mock_face_detector():
    """Face detector that finds exactly one valid face (80x80 at 10,10)."""
    detector = MagicMock()
    detector.detect.return_value = [(10, 10, 80, 80)]
    return detector


# ──────────────────────────────────────────────────────────────
# Encoding fixtures
# ──────────────────────────────────────────────────────────────

@pytest.fixture()
def valid_encoding():
    """128-D unit-length encoding vector."""
    vec = np.random.rand(128)
    return (vec / np.linalg.norm(vec)).tolist()


@pytest.fixture()
def different_encoding():
    """128-D encoding that is far from valid_encoding."""
    vec = np.ones(128) * -1.0
    return (vec / np.linalg.norm(vec)).tolist()


@pytest.fixture()
def mock_model(valid_encoding):
    """AI model mock that returns a valid encoding array."""
    model = MagicMock()
    model.encode.return_value = np.asarray(valid_encoding)
    return model


# ──────────────────────────────────────────────────────────────
# Registration fixtures
# ──────────────────────────────────────────────────────────────

@pytest.fixture()
def valid_metadata():
    return FaceRegistrationMetadata(
        registered_at=datetime(2026, 9, 4, 9, 0, 0),
        status=RegistrationStatus.ACTIVE,
    )


@pytest.fixture()
def valid_context(valid_encoding, valid_metadata):
    return RegistrationContext(
        employee_id="EMP-0001",
        face_samples=[np.zeros((112, 112, 3), dtype=np.uint8)],
        encoding=valid_encoding,
        metadata=valid_metadata,
        cancelled=False,
        stage="complete",
    )
