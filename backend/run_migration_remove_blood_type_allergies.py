#!/usr/bin/env python3
"""
Migration script to remove blood_type and allergies columns from persons table
This will also clear all patient data to avoid conflicts
"""

import psycopg2
import os
from pathlib import Path

def run_migration():
    """Run the migration to remove blood_type and allergies columns"""
    
    # Database connection parameters
    db_params = {
        'host': 'postgres-db',
        'port': 5432,
        'database': 'historias_clinicas',
        'user': 'historias_user',
        'password': 'historias_pass'
    }
    
    conn = None
    cursor = None
    try:
        # Connect to database
        print("🔗 Connecting to database...")
        conn = psycopg2.connect(**db_params)
        cursor = conn.cursor()
        
        # Read migration SQL file
        migration_file = Path(__file__).parent / 'migration_remove_blood_type_allergies.sql'
        with open(migration_file, 'r') as f:
            migration_sql = f.read()
        
        print("🗑️  Deleting all patient records...")
        print("🗑️  Removing blood_type and allergies columns...")
        
        # Execute migration
        cursor.execute(migration_sql)
        
        # Commit changes
        conn.commit()
        
        print("✅ Migration completed successfully!")
        print("✅ All patient data has been cleared")
        print("✅ blood_type and allergies columns removed")
        
        # Verify results
        cursor.execute("SELECT COUNT(*) FROM persons WHERE person_type = 'patient'")
        patient_count = cursor.fetchone()[0]
        print(f"📊 Remaining patients: {patient_count}")
        
        cursor.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'persons' 
            AND column_name IN ('blood_type', 'allergies')
        """)
        remaining_columns = cursor.fetchall()
        
        if remaining_columns:
            print(f"⚠️  Remaining columns: {[col[0] for col in remaining_columns]}")
        else:
            print("✅ blood_type and allergies columns successfully removed")
        
    except Exception as e:
        print(f"❌ Migration failed: {str(e)}")
        if conn:
            conn.rollback()
        raise
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()
        print("🔌 Database connection closed")

if __name__ == "__main__":
    run_migration()