"""
Migration script to add licenses table
"""

import psycopg2
import os
from pathlib import Path

def run_migration():
    conn = psycopg2.connect(
        host=os.getenv("DB_HOST", "localhost"),
        port=os.getenv("DB_PORT", "5432"),
        database=os.getenv("DB_NAME", "historias_clinicas"),
        user=os.getenv("DB_USER", "historias_user"),
        password=os.getenv("DB_PASSWORD", "historias_pass")
    )
    
    migration_file = Path(__file__).parent / "migration_add_licenses_table.sql"
    with open(migration_file, 'r') as f:
        sql = f.read()
    
    cur = conn.cursor()
    cur.execute(sql)
    conn.commit()
    cur.close()
    conn.close()
    print("✅ License table migration completed")

if __name__ == "__main__":
    run_migration()














