"""
Abstract repository interface for face registration DB operations.
Concrete implementations are injected at runtime; unit tests use mocks.
"""
from __future__ import annotations

from abc import ABC, abstractmethod
from typing import List, Optional

from app.schemas.face_registration import EmployeeProfile, FaceRegistrationMetadata


class AbstractFaceRepository(ABC):
    """Defines the contract that any face-registration repository must fulfil."""

    # ── Employee queries ──────────────────────────────────────

    @abstractmethod
    def get_employee_by_id(self, employee_id: str) -> Optional[EmployeeProfile]:
        """Return the employee profile or None if not found."""

    @abstractmethod
    def employee_has_active_registration(self, employee_id: str) -> bool:
        """Return True if the employee already has an ACTIVE face registration."""

    # ── Encoding queries ──────────────────────────────────────

    @abstractmethod
    def get_all_encodings(self) -> List[List[float]]:
        """Return all stored face encodings for duplicate-check purposes."""

    # ── Persistence ───────────────────────────────────────────

    @abstractmethod
    def save_registration(
        self,
        employee_id: str,
        encoding: List[float],
        metadata: FaceRegistrationMetadata,
    ) -> bool:
        """
        Persist the face registration record.

        Returns True on success.
        May raise DatabaseConstraintException, DatabaseException, or
        TransactionException depending on the failure mode.
        """

    @abstractmethod
    def delete_registration(self, employee_id: str) -> None:
        """Remove all registration data for the given employee (used in rollback)."""
