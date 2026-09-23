"""
Repositories package for FaceGate AI.
"""
from app.repositories.face_repository import AbstractFaceRepository
from app.repositories.postgres_face_repository import PostgresFaceRepository

__all__ = ["AbstractFaceRepository", "PostgresFaceRepository"]
