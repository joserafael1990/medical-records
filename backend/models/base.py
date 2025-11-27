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

# SQLAlchemy setup
engine = create_engine(DATABASE_URL, echo=False)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    """Dependency para obtener sesión de base de datos"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
