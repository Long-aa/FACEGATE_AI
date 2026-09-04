from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    # API
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "FaceGate AI"

    # Security
    SECRET_KEY: str = "change-this-secret-key-in-production"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Database
    DATABASE_URL: str = "postgresql://facegate:facegate@localhost:5432/facegate"

    # Redis
    REDIS_URL: str = "redis://localhost:6379"

    # AI Service
    AI_SERVICE_URL: str = "http://localhost:8001"

    # Device Service
    DEVICE_SERVICE_URL: str = "http://localhost:8002"

    # CORS
    ALLOWED_ORIGINS: List[str] = ["http://localhost:3000", "http://localhost:3001"]

    # Face Recognition
    FACE_RECOGNITION_THRESHOLD: float = 0.6
    MAX_FACE_ENROLLMENT: int = 10

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
