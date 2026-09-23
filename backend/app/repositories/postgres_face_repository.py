"""
Concrete PostgreSQL implementation of AbstractFaceRepository for FaceGate AI.
"""
from __future__ import annotations

import logging
from typing import List, Optional

from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session

from app.core.exceptions import (
    DatabaseConstraintException,
    DatabaseException,
    TransactionException,
)
from app.models.face import FaceProfile
from app.models.user import User
from app.repositories.face_repository import AbstractFaceRepository
from app.schemas.face_registration import (
    EmployeeProfile,
    EmployeeStatus,
    FaceRegistrationMetadata,
    RegistrationStatus,
)

logger = logging.getLogger(__name__)


class PostgresFaceRepository(AbstractFaceRepository):
    """
    PostgreSQL-backed repository for face registration and employee queries.
    """

    def __init__(self, db: Session):
        self.db = db

    def get_employee_by_id(self, employee_id: str) -> Optional[EmployeeProfile]:
        """Return EmployeeProfile if found in users table, else None."""
        try:
            user = (
                self.db.query(User)
                .filter(User.employee_id == employee_id)
                .first()
            )
            if not user:
                return None

            has_face = (
                self.db.query(FaceProfile)
                .filter(
                    FaceProfile.employee_id == employee_id,
                    FaceProfile.status == RegistrationStatus.ACTIVE.value,
                )
                .first()
                is not None
            )

            # Map status string to EmployeeStatus enum
            status_str = user.status.upper() if user.status else "ACTIVE"
            if status_str in EmployeeStatus.__members__:
                status_enum = EmployeeStatus[status_str]
            elif status_str in ("LOCKED", "BLOCKED"):
                status_enum = EmployeeStatus.BLOCKED
            else:
                status_enum = EmployeeStatus.INACTIVE

            return EmployeeProfile(
                employee_id=user.employee_id,
                name=user.full_name,
                department=user.department,
                position=user.position,
                status=status_enum,
                has_face_registration=has_face,
            )
        except SQLAlchemyError as exc:
            logger.error(f"Database error in get_employee_by_id: {exc}")
            raise DatabaseException(f"Database error: {exc}") from exc

    def employee_has_active_registration(self, employee_id: str) -> bool:
        """Return True if the employee already has an ACTIVE face profile."""
        try:
            profile = (
                self.db.query(FaceProfile)
                .filter(
                    FaceProfile.employee_id == employee_id,
                    FaceProfile.status == RegistrationStatus.ACTIVE.value,
                )
                .first()
            )
            return profile is not None
        except SQLAlchemyError as exc:
            logger.error(f"Database error in employee_has_active_registration: {exc}")
            raise DatabaseException(f"Database error: {exc}") from exc

    def get_all_encodings(self) -> List[List[float]]:
        """Return all active face encodings as lists of floats."""
        try:
            profiles = (
                self.db.query(FaceProfile)
                .filter(FaceProfile.status == RegistrationStatus.ACTIVE.value)
                .all()
            )
            encodings: List[List[float]] = []
            for p in profiles:
                vec = p.get_encoding_vector()
                if vec:
                    encodings.append(vec)
            return encodings
        except SQLAlchemyError as exc:
            logger.error(f"Database error in get_all_encodings: {exc}")
            raise DatabaseException(f"Database error: {exc}") from exc

    def save_registration(
        self,
        employee_id: str,
        encoding: List[float],
        metadata: FaceRegistrationMetadata,
    ) -> bool:
        """
        Persist or update face registration in face_profiles table.
        """
        try:
            user = (
                self.db.query(User)
                .filter(User.employee_id == employee_id)
                .first()
            )
            user_id = user.id if user else None

            profile = (
                self.db.query(FaceProfile)
                .filter(FaceProfile.employee_id == employee_id)
                .first()
            )

            status_val = (
                metadata.status.value
                if hasattr(metadata.status, "value")
                else str(metadata.status)
            )

            if profile:
                profile.user_id = user_id
                profile.set_encoding_vector(encoding)
                profile.status = status_val
                profile.registered_at = metadata.registered_at
                profile.registered_by = metadata.registered_by
                profile.notes = metadata.notes
            else:
                profile = FaceProfile(
                    user_id=user_id,
                    employee_id=employee_id,
                    status=status_val,
                    registered_at=metadata.registered_at,
                    registered_by=metadata.registered_by,
                    notes=metadata.notes,
                )
                profile.set_encoding_vector(encoding)
                self.db.add(profile)

            self.db.commit()
            return True
        except IntegrityError as exc:
            self.db.rollback()
            logger.error(f"Integrity error in save_registration: {exc}")
            raise DatabaseConstraintException(f"Database constraint violated: {exc}") from exc
        except SQLAlchemyError as exc:
            self.db.rollback()
            logger.error(f"Transaction error in save_registration: {exc}")
            raise TransactionException(f"Transaction failed: {exc}") from exc

    def delete_registration(self, employee_id: str) -> None:
        """Remove face registration for rollback or deletion."""
        try:
            self.db.query(FaceProfile).filter(
                FaceProfile.employee_id == employee_id
            ).delete()
            self.db.commit()
        except SQLAlchemyError as exc:
            self.db.rollback()
            logger.error(f"Database error in delete_registration: {exc}")
            raise DatabaseException(f"Delete failed: {exc}") from exc
