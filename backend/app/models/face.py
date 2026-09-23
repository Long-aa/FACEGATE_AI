"""
Face profile and embedding model for FaceGate AI.
"""
import uuid
from typing import List, Optional
from sqlalchemy import (
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import ARRAY, JSONB
from sqlalchemy.orm import relationship

from app.database.session import Base


class FaceProfile(Base):
    __tablename__ = "face_profiles"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=True,
        unique=True,
        index=True,
    )
    employee_id = Column(String(50), nullable=False, unique=True, index=True)
    
    # Store embedding vector in native PostgreSQL float array and JSONB
    encoding = Column(ARRAY(Float), nullable=True)
    face_encoding_json = Column(JSONB, nullable=True)

    status = Column(String(50), default="ACTIVE", nullable=False, index=True)  # PENDING, ACTIVE, FAILED, CANCELLED
    quality_score = Column(Float, nullable=True)
    samples_count = Column(Integer, default=1, nullable=False)
    master_photo_url = Column(String(500), nullable=True)

    registered_at = Column(DateTime(timezone=True), server_default=func.now())
    registered_by = Column(String(100), nullable=True)
    notes = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    user = relationship("User", back_populates="face_profile")

    def get_encoding_vector(self) -> Optional[List[float]]:
        """Return the vector as a Python list of floats."""
        if self.encoding is not None:
            return [float(x) for x in self.encoding]
        if self.face_encoding_json is not None and isinstance(self.face_encoding_json, list):
            return [float(x) for x in self.face_encoding_json]
        return None

    def set_encoding_vector(self, vec: List[float]):
        """Set the vector in both ARRAY and JSONB representation."""
        self.encoding = [float(x) for x in vec]
        self.face_encoding_json = [float(x) for x in vec]

    def __repr__(self) -> str:
        return f"<FaceProfile(employee_id='{self.employee_id}', status='{self.status}')>"
