#!/usr/bin/env python3
"""
Migration script to add office_timezone field to persons table
"""

import os
import sys
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

def run_migration():
    """Run the timezone migration"""
    
    # Database connection parameters
    db_params = {
        'host': os.getenv('DB_HOST', 'localhost'),
        'port': os.getenv('DB_PORT', '5432'),
        'database': os.getenv('DB_NAME', 'medical_records'),
        'user': os.getenv('DB_USER', 'postgres'),
        'password': os.getenv('DB_PASSWORD', 'postgres')
    }
    
    try:
        print("🔧 Starting timezone migration...")
        
        # Connect to database
        conn = psycopg2.connect(**db_params)
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        cursor = conn.cursor()
        
        # Read migration SQL
        with open('migration_add_office_timezone.sql', 'r') as f:
            migration_sql = f.read()
        
        # Execute migration
        cursor.execute(migration_sql)
        
        print("✅ Migration completed successfully!")
        print("📝 Added office_timezone field to persons table")
        print("🌍 Default timezone set to America/Mexico_City")
        
        # Verify the migration
        cursor.execute("""
            SELECT column_name, data_type, column_default 
            FROM information_schema.columns 
            WHERE table_name = 'persons' AND column_name = 'office_timezone'
        """)
        
        result = cursor.fetchone()
        if result:
            print(f"✅ Verification: office_timezone field exists - {result}")
        else:
            print("❌ Verification failed: office_timezone field not found")
            
        cursor.close()
        conn.close()
        
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    run_migration()


