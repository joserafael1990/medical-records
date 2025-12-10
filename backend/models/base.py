from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime, timezone
import os

# Utility function to replace deprecated datetime.utcnow()
def utc_now():
    """Get current UTC datetime (replaces deprecated datetime.utcnow())"""
    return datetime.now(timezone.utc)

# Base para modelos
Base = declarative_base()

# Database URL from environment variable or default
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://historias_user:historias_pass@postgres-db:5432/historias_clinicas")

# SQLAlchemy setup with connection timeouts for Azure PostgreSQL
engine = create_engine(
    DATABASE_URL,
    echo=False,
    pool_pre_ping=True,  # Verify connections before using
    pool_recycle=300,    # Recycle connections every 5 minutes
    pool_size=5,         # Max 5 connections in pool
    max_overflow=10,     # Allow 10 additional connections
    connect_args={
        "connect_timeout": 10,  # 10 second connection timeout
        "options": "-c statement_timeout=30000"  # 30 second query timeout
    }
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    """Dependency para obtener sesión de base de datos"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
