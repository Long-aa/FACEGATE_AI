from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    # API
    PROJECT_NAME: str = "FaceGate AI Service"
    API_HOST: str = "0.0.0.0"
    API_PORT: int = 8001
    DEBUG: bool = False

    # Redis
    REDIS_URL: str = "redis://localhost:6379"

    # Face Detection Model
    DETECTION_MODEL: str = "retinaface_r50_v1"
    RECOGNITION_MODEL: str = "arcface_r100_v1"
    DETECTION_THRESHOLD: float = 0.5
    RECOGNITION_THRESHOLD: float = 0.6

    # Model paths
    MODELS_DIR: str = "models"
    DATA_DIR: str = "data"
    KNOWN_FACES_DIR: str = "data/known_faces"
    UNKNOWN_FACES_DIR: str = "data/unknown_faces"

    # Processing
    MAX_IMAGE_SIZE: int = 1920
    EMBEDDING_DIMENSION: int = 512
    BATCH_SIZE: int = 16

    # CORS
    ALLOWED_ORIGINS: List[str] = ["http://localhost:3000", "http://localhost:8000"]

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
