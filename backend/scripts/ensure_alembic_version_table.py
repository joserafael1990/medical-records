#!/usr/bin/env python3
"""
Ensure alembic_version table exists before running migrations
This is critical for fresh databases where Alembic hasn't been initialized
"""
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from sqlalchemy import create_engine, text
from database import DATABASE_URL
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def ensure_alembic_version_table():
    """Create alembic_version table if it doesn't exist"""
    try:
        engine = create_engine(DATABASE_URL)
        with engine.connect() as conn:
            # Check if table exists
            result = conn.execute(text("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_name = 'alembic_version'
                )
            """))
            table_exists = result.scalar()
            
            if not table_exists:
                logger.info("Creating alembic_version table...")
                conn.execute(text("""
                    CREATE TABLE alembic_version (
                        version_num VARCHAR(32) NOT NULL,
                        CONSTRAINT alembic_version_pkc PRIMARY KEY (version_num)
                    )
                """))
                conn.commit()
                logger.info("✅ alembic_version table created")
            else:
                logger.info("✅ alembic_version table already exists")
        return True
    except Exception as e:
        logger.error(f"❌ Failed to ensure alembic_version table: {e}")
        return False

if __name__ == "__main__":
    success = ensure_alembic_version_table()
    sys.exit(0 if success else 1)

