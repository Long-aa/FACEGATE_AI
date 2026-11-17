"""
Face profile and embedding model for FaceGate AI.
"""
from datetime import datetime
import uuid
from typing import Any, List, Optional
from sqlalchemy import (
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import ARRAY, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

try:
    from pgvector.sqlalchemy import Vector  # type: ignore[import-untyped, import-not-found]
    PGVECTOR_AVAILABLE = True
except (ImportError, ModuleNotFoundError):
    from sqlalchemy.types import UserDefinedType

    class Vector(UserDefinedType):  # type: ignore
        """Fallback UserDefinedType when pgvector package is not installed."""
        def __init__(self, dim: Optional[int] = None):
            self.dim = dim

        def get_col_spec(self, **kw: Any) -> str:
            return f"vector({self.dim})" if self.dim else "vector"

    PGVECTOR_AVAILABLE = False

from app.database.session import Base


class FaceProfile(Base):
    __tablename__ = "face_profiles"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[Optional[str]] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=True,
        unique=True,
        index=True,
    )
    employee_id: Mapped[str] = mapped_column(String(50), nullable=False, unique=True, index=True)
    
    # Store embedding vector in native PostgreSQL float array and JSONB
    encoding: Mapped[Any] = mapped_column(ARRAY(Float), nullable=True)
    face_encoding_json: Mapped[Any] = mapped_column(JSONB, nullable=True)

    # pgvector 512-D ArcFace embedding (Phase 2)
    embedding: Mapped[Any] = mapped_column(Vector(512), nullable=True)

    status: Mapped[str] = mapped_column(String(50), default="ACTIVE", nullable=False, index=True)  # PENDING, ACTIVE, FAILED, CANCELLED
    quality_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    samples_count: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    master_photo_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    registered_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), server_default=func.now())
    registered_by: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    created_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    user: Mapped[Optional[Any]] = relationship("User", back_populates="face_profile")

    def get_encoding_vector(self) -> Optional[List[float]]:
        """Return the vector as a Python list of floats."""
        if self.encoding is not None:
            return [float(x) for x in self.encoding]
        if self.face_encoding_json is not None and isinstance(self.face_encoding_json, list):
            return [float(x) for x in self.face_encoding_json]
        return None

    def has_vector(self) -> bool:
        """Return True if profile has valid encoding vector."""
        vec = self.get_encoding_vector()
        return bool(vec and len(vec) > 0)

    def set_encoding_vector(self, vec: List[float]):
        """Set the vector in both ARRAY and JSONB representation."""
        self.encoding = [float(x) for x in vec]
        self.face_encoding_json = [float(x) for x in vec]
        if len(vec) == 512:
            self.embedding = [float(x) for x in vec]

    def get_embedding_512(self) -> Optional[List[float]]:
        """Return 512D ArcFace embedding vector if available."""
        if self.embedding is not None:
            if hasattr(self.embedding, "tolist"):
                return self.embedding.tolist()
            if isinstance(self.embedding, (list, tuple)):
                return [float(x) for x in self.embedding]
        return None

    def set_embedding_512(self, vec: List[float]):
        """Set 512D ArcFace embedding vector for pgvector."""
        if vec and len(vec) == 512:
            self.embedding = [float(x) for x in vec]

    def __repr__(self) -> str:
        return f"<FaceProfile(employee_id='{self.employee_id}', status='{self.status}')>"
