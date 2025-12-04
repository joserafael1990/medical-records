#!/usr/bin/env python3
"""
Migration script to add time_blocks column to schedule_templates table
"""
import psycopg2
import os
from pathlib import Path

def run_migration():
    """Run the migration to add time_blocks column"""
    try:
        conn = psycopg2.connect(
            host=os.getenv("DB_HOST", "localhost"),
            port=os.getenv("DB_PORT", "5432"),
            database=os.getenv("DB_NAME", "historias_clinicas"),
            user=os.getenv("DB_USER", "historias_user"),
            password=os.getenv("DB_PASSWORD", "historias_pass")
        )
        
        migration_file = Path(__file__).parent / "migration_add_time_blocks_to_schedule.sql"
        with open(migration_file, 'r') as f:
            sql = f.read()
        
        cur = conn.cursor()
        cur.execute(sql)
        conn.commit()
        cur.close()
        conn.close()
        print("✅ Migration completed: time_blocks column added to schedule_templates")
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        raise

if __name__ == "__main__":
    run_migration()














