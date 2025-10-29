"""
Configuration module for CORTEX Medical System
Manages environment variables and application settings
"""
import os
import json
from typing import List, Optional
from pydantic_settings import BaseSettings
from pydantic import validator


class Settings(BaseSettings):
    """
    Application settings with environment variable support
    """
    
    # Database Configuration
    DATABASE_URL: str = "postgresql://historias_user:historias_pass@postgres-db:5432/historias_clinicas"
    DB_HOST: str = "localhost"
    DB_PORT: int = 5432
    DB_NAME: str = "historias_clinicas"
    DB_USER: str = "historias_user"
    DB_PASSWORD: str = "historias_pass"
    
    # Application Configuration
    APP_ENV: str = "development"
    APP_VERSION: str = "1.0.0"
    APP_NAME: str = "CORTEX Backend API"
    SECRET_KEY: str = "your-secret-key-here-change-in-production"
    JWT_SECRET_KEY: str = "your-jwt-secret-key-here"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440
    
    # Server Configuration
    HOST: str = "127.0.0.1"
    PORT: int = 8000
    RELOAD: bool = True
    LOG_LEVEL: str = "debug"
    
    # CORS Configuration
    CORS_ORIGINS: List[str] = ["http://localhost:3000"]
    CORS_ALLOW_CREDENTIALS: bool = True
    
    # Security
    ALLOWED_HOSTS: List[str] = ["localhost", "127.0.0.1"]
    
    # Timezone
    DEFAULT_TIMEZONE: str = "America/Mexico_City"
    
    # Feature Flags
    ENABLE_DEBUG_LOGGING: bool = True
    ENABLE_REQUEST_LOGGING: bool = True
    ENABLE_ERROR_MONITORING: bool = False
    
    # Email Configuration
    SMTP_HOST: Optional[str] = None
    SMTP_PORT: int = 587
    SMTP_USERNAME: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None
    EMAIL_FROM: str = "noreply@cortex-medical.com"
    
    # File Upload Configuration
    MAX_FILE_SIZE: int = 10485760  # 10MB
    UPLOAD_DIR: str = "uploads"
    
    @validator('CORS_ORIGINS', pre=True)
    def parse_cors_origins(cls, v):
        """Parse CORS origins from JSON string if needed"""
        if isinstance(v, str):
            try:
                return json.loads(v)
            except json.JSONDecodeError:
                # If it's not valid JSON, treat as single origin
                return [v]
        return v
    
    @validator('ALLOWED_HOSTS', pre=True)
    def parse_allowed_hosts(cls, v):
        """Parse allowed hosts from JSON string if needed"""
        if isinstance(v, str):
            try:
                return json.loads(v)
            except json.JSONDecodeError:
                # If it's not valid JSON, treat as single host
                return [v]
        return v
    
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
        "env_file": ".env",
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