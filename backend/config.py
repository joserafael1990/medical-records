"""
Configuration module for CORTEX Medical System
Manages environment variables and application settings
"""
import os
import json
import secrets
from typing import List, Optional
from pydantic_settings import BaseSettings
from pydantic import field_validator, model_validator


def _env_bool(name: str, default: bool) -> bool:
    """Safely parse boolean environment variables."""
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


class Settings(BaseSettings):
    """
    Application settings with environment variable support
    """
    
    # Database Configuration
    DATABASE_URL: str = "postgresql://historias_user:historias_pass@postgres-db:5432/historias_clinicas"
    DB_HOST: str = "localhost"
    DB_PORT: int = 5433  # Puerto externo (Docker mapea 5433->5432 internamente)
    DB_NAME: str = "historias_clinicas"
    DB_USER: str = "historias_user"
    DB_PASSWORD: str = "historias_pass"
    
    # Application Configuration
    APP_ENV: str = "development"
    APP_VERSION: str = "1.0.0"
    APP_NAME: str = "CORTEX Backend API"
    SECRET_KEY: str = os.getenv("SECRET_KEY", "")
    JWT_SECRET_KEY: str = os.getenv("JWT_SECRET_KEY", "")
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440
    
    # Server Configuration
    HOST: str = "127.0.0.1"
    PORT: int = 8000
    RELOAD: bool = True
    LOG_LEVEL: str = "debug"
    
    # CORS Configuration
    # In production, CORS_ORIGINS must be set via environment variable
    # Format: comma-separated list, e.g., "https://sistema.cortexclinico.com"
    _cors_origins_env = os.getenv("CORS_ORIGINS")
    if _cors_origins_env:
        CORS_ORIGINS: List[str] = [origin.strip() for origin in _cors_origins_env.split(",")]
    else:
        # Default fallback
        if os.getenv("APP_ENV", "development").lower() == "development":
            CORS_ORIGINS: List[str] = ["http://localhost:3000"]
        else:
            # Production default
            CORS_ORIGINS: List[str] = ["https://sistema.cortexclinico.com"]
    CORS_ALLOW_CREDENTIALS: bool = True
    
    # Security
    ALLOWED_HOSTS: List[str] = ["localhost", "127.0.0.1"]
    
    # Timezone
    DEFAULT_TIMEZONE: str = "America/Mexico_City"
    
    # Feature Flags & Security
    ENABLE_DEBUG_LOGGING: bool = True
    ENABLE_REQUEST_LOGGING: bool = True
    ENABLE_ERROR_MONITORING: bool = False
    SECURITY_HEADERS_ENABLED: bool = _env_bool("SECURITY_HEADERS_ENABLED", True)
    CONTENT_SECURITY_POLICY: str = os.getenv(
        "CONTENT_SECURITY_POLICY",
        "default-src 'self'; img-src 'self' data:; font-src 'self' data:; "
        "style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; "
        "frame-ancestors 'none'; base-uri 'self'"
    )
    
    # Encryption Configuration
    # NOM-035-SSA3-2012 Compliance: Encryption of sensitive medical data
    ENABLE_ENCRYPTION: bool = _env_bool("ENABLE_ENCRYPTION", False)
    MEDICAL_ENCRYPTION_KEY: Optional[str] = os.getenv("MEDICAL_ENCRYPTION_KEY", None)
    
    # Rate limiting
    # Enabled by default in production, disabled in development to avoid issues with React double-invoke effects
    RATE_LIMIT_ENABLED: bool = _env_bool(
        "RATE_LIMIT_ENABLED",
        os.getenv("APP_ENV", "development").lower() == "production"
    )
    # In development, use much higher limits to accommodate React Strict Mode double-mounting
    # In production, use stricter limits for security
    _is_dev = os.getenv("APP_ENV", "development").lower() == "development"
    RATE_LIMIT_MAX_REQUESTS: int = int(os.getenv("RATE_LIMIT_MAX_REQUESTS", "1000" if _is_dev else "120"))
    RATE_LIMIT_WINDOW_SECONDS: int = int(os.getenv("RATE_LIMIT_WINDOW_SECONDS", "60"))
    
    # Email Configuration
    SMTP_HOST: Optional[str] = None
    SMTP_PORT: int = 587
    SMTP_USERNAME: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None
    EMAIL_FROM: str = "noreply@cortex-medical.com"
    
    # File Upload Configuration
    MAX_FILE_SIZE: int = 10485760  # 10MB
    UPLOAD_DIR: str = "uploads"
    
    @field_validator('CORS_ORIGINS', mode='before')
    @classmethod
    def parse_cors_origins(cls, v):
        """Parse CORS origins from JSON string if needed"""
        if isinstance(v, str):
            try:
                return json.loads(v)
            except json.JSONDecodeError:
                # If it's not valid JSON, treat as single origin
                return [v]
        return v
    
    @field_validator('ALLOWED_HOSTS', mode='before')
    @classmethod
    def parse_allowed_hosts(cls, v):
        """Parse allowed hosts from JSON string if needed"""
        if isinstance(v, str):
            try:
                return json.loads(v)
            except json.JSONDecodeError:
                # If it's not valid JSON, treat as single host
                return [v]
        return v
    
    @model_validator(mode="after")
    def _auto_generate_keys(self):
        """
        Automatically generate cryptographic keys if not provided.
        Keys are generated securely using secrets.token_urlsafe(64).
        """
        def is_empty_or_placeholder(value: Optional[str]) -> bool:
            return not value or value.strip() == "" or value.startswith("your-")

        # Always auto-generate if missing, regardless of environment
        if is_empty_or_placeholder(self.SECRET_KEY):
            object.__setattr__(self, "SECRET_KEY", secrets.token_urlsafe(64))
        
        if is_empty_or_placeholder(self.JWT_SECRET_KEY):
            object.__setattr__(self, "JWT_SECRET_KEY", secrets.token_urlsafe(64))

        return self

    @property
    def is_production(self) -> bool:
        """Check if environment is production"""
        return self.APP_ENV.lower() == "production"
    
    @property
    def is_development(self) -> bool:
        """Check if environment is development"""
        return self.APP_ENV.lower() == "development"
    
    @property
    def database_url_sync(self) -> str:
        """Get synchronous database URL"""
        return self.DATABASE_URL
    
    @property
    def database_url_async(self) -> str:
        """Get asynchronous database URL for async drivers"""
        return self.DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://")
    
    model_config = {
        "env_file": None,
        "case_sensitive": True,
        "extra": "ignore"  # Ignorar variables extra en lugar de fallar
    }


# Global settings instance
settings = Settings()

# Convenience exports
DATABASE_URL = settings.DATABASE_URL
SECRET_KEY = settings.SECRET_KEY
JWT_SECRET_KEY = settings.JWT_SECRET_KEY
CORS_ORIGINS = settings.CORS_ORIGINS
DEFAULT_TIMEZONE = settings.DEFAULT_TIMEZONE