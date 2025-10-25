#!/usr/bin/env python3
"""
Migration script to remove duplicate story fields from medical_records table.
This script removes the _story fields and keeps only the _history fields.
"""

import os
import sys
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

def get_database_connection():
    """Get database connection using environment variables"""
    try:
        # Try to get from environment variables first
        db_host = os.getenv('DB_HOST', 'localhost')
        db_port = os.getenv('DB_PORT', '5432')
        db_name = os.getenv('DB_NAME', 'historias_clinicas')
        db_user = os.getenv('DB_USER', 'historias_user')
        db_password = os.getenv('DB_PASSWORD', 'mysecretpassword')
        
        # Construct connection string
        conn_string = f"host={db_host} port={db_port} dbname={db_name} user={db_user} password={db_password}"
        
        print(f"🔗 Connecting to database: {db_host}:{db_port}/{db_name}")
        conn = psycopg2.connect(conn_string)
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        return conn
    except Exception as e:
        print(f"❌ Error connecting to database: {e}")
        return None

def check_columns_exist(cursor, table_name, columns):
    """Check if columns exist in the table"""
    cursor.execute("""
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = %s AND column_name = ANY(%s)
    """, (table_name, columns))
    
    existing_columns = [row[0] for row in cursor.fetchall()]
    return existing_columns

def migrate_data_if_needed(cursor):
    """Migrate data from _story fields to _history fields if needed"""
    print("🔄 Checking if data migration is needed...")
    
    # Check if _story fields have data that needs to be migrated
    cursor.execute("""
        SELECT COUNT(*) FROM medical_records 
        WHERE family_story IS NOT NULL 
           OR personal_pathological_story IS NOT NULL 
           OR personal_non_pathological_story IS NOT NULL
    """)
    
    story_records_count = cursor.fetchone()[0]
    
    if story_records_count > 0:
        print(f"📊 Found {story_records_count} records with _story data. Migrating to _history fields...")
        
        # Migrate data from _story to _history fields
        cursor.execute("""
            UPDATE medical_records 
            SET 
                family_history = COALESCE(family_story, family_history),
                personal_pathological_history = COALESCE(personal_pathological_story, personal_pathological_history),
                personal_non_pathological_history = COALESCE(personal_non_pathological_story, personal_non_pathological_history)
            WHERE family_story IS NOT NULL 
               OR personal_pathological_story IS NOT NULL 
               OR personal_non_pathological_story IS NOT NULL
        """)
        
        print("✅ Data migration completed successfully")
    else:
        print("ℹ️  No data found in _story fields. Skipping data migration.")

def remove_duplicate_columns(cursor):
    """Remove the duplicate _story columns from medical_records table"""
    print("🗑️  Removing duplicate _story columns...")
    
    # Columns to remove
    columns_to_remove = [
        'family_story',
        'personal_pathological_story', 
        'personal_non_pathological_story'
    ]
    
    # Check which columns exist
    existing_columns = check_columns_exist(cursor, 'medical_records', columns_to_remove)
    
    if not existing_columns:
        print("ℹ️  No duplicate _story columns found. Nothing to remove.")
        return
    
    print(f"📋 Found columns to remove: {existing_columns}")
    
    # Remove each column
    for column in existing_columns:
        try:
            cursor.execute(f"ALTER TABLE medical_records DROP COLUMN IF EXISTS {column}")
            print(f"✅ Removed column: {column}")
        except Exception as e:
            print(f"❌ Error removing column {column}: {e}")

def main():
    """Main migration function"""
    print("🚀 Starting migration: Remove duplicate story fields")
    print("=" * 60)
    
    # Get database connection
    conn = get_database_connection()
    if not conn:
        print("❌ Failed to connect to database. Exiting.")
        sys.exit(1)
    
    try:
        cursor = conn.cursor()
        
        # Check if medical_records table exists
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'medical_records'
            )
        """)
        
        if not cursor.fetchone()[0]:
            print("❌ medical_records table does not exist. Exiting.")
            sys.exit(1)
        
        print("✅ medical_records table found")
        
        # Migrate data if needed
        migrate_data_if_needed(cursor)
        
        # Remove duplicate columns
        remove_duplicate_columns(cursor)
        
        print("=" * 60)
        print("🎉 Migration completed successfully!")
        print("✅ Duplicate _story fields have been removed")
        print("✅ Only _history fields remain")
        
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        sys.exit(1)
    finally:
        if conn:
            conn.close()
            print("🔌 Database connection closed")

if __name__ == "__main__":
    main()
