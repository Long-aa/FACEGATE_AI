"""
Custom exceptions for FaceGate AI - Face Registration Flow.
Covers all exceptions referenced in FRM01 through FRM08 unit tests.
"""


# ──────────────────────────────────────────────────────────────
# Base Exception
# ──────────────────────────────────────────────────────────────

class FaceGateException(Exception):
    """Base exception for all FaceGate AI errors."""

    def __init__(self, message: str = "An error occurred"):
        self.message = message
        super().__init__(self.message)

    def __str__(self) -> str:
        return self.message


# ──────────────────────────────────────────────────────────────
# FRM01 - Employee Validation
# ──────────────────────────────────────────────────────────────

class ValidationError(FaceGateException):
    """Raised when input data fails validation checks."""

    def __init__(self, message: str = "Validation failed"):
        super().__init__(message)


class NotFoundException(FaceGateException):
    """Raised when a requested resource (e.g. employee) is not found."""

    def __init__(self, message: str = "Resource not found"):
        super().__init__(message)


class DuplicateRegistrationException(FaceGateException):
    """Raised when an employee already has an ACTIVE face registration."""

    def __init__(self, message: str = "Face data already registered"):
        super().__init__(message)


class EmployeeStatusException(FaceGateException):
    """Raised when an employee account is INACTIVE or BLOCKED."""

    def __init__(self, message: str = "Employee is inactive or blocked"):
        super().__init__(message)


# ──────────────────────────────────────────────────────────────
# FRM02 - Camera Initialisation
# ──────────────────────────────────────────────────────────────

class CameraInitializationException(FaceGateException):
    """Raised when the camera cannot be opened (invalid index or unavailable device)."""

    def __init__(self, message: str = "Cannot open camera"):
        super().__init__(message)


class PermissionException(FaceGateException):
    """Raised when camera access is denied due to insufficient permissions."""

    def __init__(self, message: str = "Camera permission denied"):
        super().__init__(message)


class FrameCaptureException(FaceGateException):
    """Raised when reading a frame from the camera fails or returns an empty frame."""

    def __init__(self, message: str = "Failed to read camera frame"):
        super().__init__(message)


class CameraConfigurationException(FaceGateException):
    """Raised when the camera frame resolution or configuration is invalid."""

    def __init__(self, message: str = "Invalid camera frame resolution"):
        super().__init__(message)


# ──────────────────────────────────────────────────────────────
# FRM03 - Face Sample Collection
# ──────────────────────────────────────────────────────────────

class FaceDetectionException(FaceGateException):
    """Raised when no face is detected or the bounding box is invalid."""

    def __init__(self, message: str = "No face detected"):
        super().__init__(message)


class MultipleFaceException(FaceGateException):
    """Raised when more than one face is detected in a frame."""

    def __init__(self, message: str = "Multiple faces detected"):
        super().__init__(message)


class FaceQualityException(FaceGateException):
    """Raised when the detected face does not meet quality requirements."""

    def __init__(self, message: str = "Face quality check failed"):
        super().__init__(message)


# ──────────────────────────────────────────────────────────────
# FRM04 - Face Pre-processing
# ──────────────────────────────────────────────────────────────

class PreprocessException(FaceGateException):
    """Raised when face image pre-processing fails for any reason."""

    def __init__(self, message: str = "Face image preprocessing failed"):
        super().__init__(message)


# ──────────────────────────────────────────────────────────────
# FRM05 - Face Encoding Generation
# ──────────────────────────────────────────────────────────────

class EncodingException(FaceGateException):
    """Raised when face encoding generation fails or returns an invalid result."""

    def __init__(self, message: str = "Cannot generate face encoding"):
        super().__init__(message)


# ──────────────────────────────────────────────────────────────
# FRM06 - Duplicate Face Check
# ──────────────────────────────────────────────────────────────

class DuplicateFaceException(FaceGateException):
    """Raised when an incoming encoding matches an already-registered face."""

    def __init__(self, message: str = "Face already registered"):
        super().__init__(message)


class DataIntegrityException(FaceGateException):
    """Raised when stored face encoding data is malformed or corrupt."""

    def __init__(self, message: str = "Stored encoding is invalid"):
        super().__init__(message)


# ──────────────────────────────────────────────────────────────
# FRM07 - Database Persistence
# ──────────────────────────────────────────────────────────────

class DatabaseConstraintException(FaceGateException):
    """Raised when a database unique / integrity constraint is violated."""

    def __init__(self, message: str = "Duplicate face registration"):
        super().__init__(message)


class DatabaseException(FaceGateException):
    """Raised when the database is unavailable or an unrecoverable DB error occurs."""

    def __init__(self, message: str = "Database unavailable"):
        super().__init__(message)


class TransactionException(FaceGateException):
    """Raised when a database transaction cannot be committed."""

    def __init__(self, message: str = "Transaction commit failed"):
        super().__init__(message)


# ──────────────────────────────────────────────────────────────
# FRM08 - Registration Orchestration
# ──────────────────────────────────────────────────────────────

class RegistrationException(FaceGateException):
    """Raised when the overall face-registration workflow fails at any stage."""

    def __init__(self, message: str = "Face registration failed"):
        super().__init__(message)


class CancellationException(FaceGateException):
    """Raised when the user explicitly cancels the registration process."""

    def __init__(self, message: str = "Registration cancelled"):
        super().__init__(message)
