#!/usr/bin/env python3
"""
Migration script to create document_folios and document_folio_sequences tables.

This script creates the missing tables required for generating folio numbers
for prescriptions and study orders.

Usage:
    python run_migration_document_folios.py
"""

import os
import sys
from pathlib import Path

# Add parent directory to path to import backend modules
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import text
from database import engine, get_logger

logger = get_logger("medical_records.migration")


def run_migration():
    """Run the migration to create document_folios tables."""
    migration_file = Path(__file__).parent / "migration_add_document_folios.sql"
    
    if not migration_file.exists():
        logger.error(f"Migration file not found: {migration_file}")
        return False
    
    logger.info(f"Reading migration file: {migration_file}")
    with open(migration_file, 'r', encoding='utf-8') as f:
        sql_script = f.read()
    
    try:
        with engine.begin() as connection:
            # Execute the migration SQL
            logger.info("Executing migration SQL...")
            connection.execute(text(sql_script))
            logger.info("✅ Migration completed successfully")
            return True
    except Exception as e:
        logger.error(f"❌ Migration failed: {e}", exc_info=True)
        return False


if __name__ == "__main__":
    logger.info("🚀 Starting migration: document_folios tables")
    success = run_migration()
    sys.exit(0 if success else 1)

