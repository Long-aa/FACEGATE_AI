from pathlib import Path
from typing import List, Optional
from urllib.parse import quote_plus
from pydantic_settings import BaseSettings, SettingsConfigDict

# Root of backend directory
BACKEND_DIR = Path(__file__).resolve().parent.parent.parent
ENV_FILE = BACKEND_DIR / ".env"


class Settings(BaseSettings):
    # API
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "FaceGate AI"
    DEBUG: bool = True

    # Security
    SECRET_KEY: str = "facegate-ai-super-secret-key-production-2026"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Database
    DB_HOST: str = "localhost"
    DB_PORT: int = 8000
    DB_NAME: str = "facegate_ai"
    DB_USER: str = "postgres"
    DB_PASSWORD: str = "Longdz19082005@"
    DATABASE_URL: Optional[str] = None

    # Redis
    REDIS_URL: str = "redis://localhost:6379"

    # AI Service
    AI_SERVICE_URL: str = "http://localhost:8001"

    # Device Service
    DEVICE_SERVICE_URL: str = "http://localhost:8002"

    # CORS
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
    ]

    # Face Recognition
    FACE_RECOGNITION_THRESHOLD: float = 0.6
    MAX_FACE_ENROLLMENT: int = 10

    model_config = SettingsConfigDict(
        env_file=str(ENV_FILE) if ENV_FILE.exists() else ".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    def get_database_url(self) -> str:
        """
        Return an RFC-compliant SQLAlchemy PostgreSQL connection string.
        Ensures password special characters like '@' are safely escaped.
        """
        if self.DATABASE_URL:
            return self.DATABASE_URL
        safe_password = quote_plus(self.DB_PASSWORD)
        return (
            f"postgresql://{self.DB_USER}:{safe_password}@"
            f"{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"
        )


settings = Settings()
