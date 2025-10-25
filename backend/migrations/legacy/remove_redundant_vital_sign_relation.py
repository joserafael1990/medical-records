#!/usr/bin/env python3
"""
Migration script to remove redundant vital_sign_id column from medical_records table.

This migration removes the unused vital_sign_id column and its foreign key constraint
from the medical_records table, since the proper relationship is handled through
the consultation_vital_signs junction table.

The vital_sign_id column was never used (0 records have values) and creates
confusion in the data model by suggesting a 1:1 relationship when the actual
relationship should be N:M through consultation_vital_signs.
"""

import os
import sys
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

def get_database_connection():
    """Get database connection using environment variables."""
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

def check_vital_sign_id_usage(conn):
    """Check if vital_sign_id column has any data."""
    try:
        cursor = conn.cursor()
        
        # Check if column exists
        cursor.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'medical_records' 
            AND column_name = 'vital_sign_id';
        """)
        
        if not cursor.fetchone():
            print("✅ Column vital_sign_id does not exist in medical_records table")
            return False
        
        # Check if any records have vital_sign_id values
        cursor.execute("""
            SELECT COUNT(*) as total_records, 
                   COUNT(vital_sign_id) as records_with_vital_sign_id
            FROM medical_records;
        """)
        
        result = cursor.fetchone()
        total_records, records_with_vital_sign_id = result
        
        print(f"📊 Medical records analysis:")
        print(f"   - Total records: {total_records}")
        print(f"   - Records with vital_sign_id: {records_with_vital_sign_id}")
        
        if records_with_vital_sign_id > 0:
            print(f"⚠️  WARNING: {records_with_vital_sign_id} records have vital_sign_id values!")
            print("   This migration will remove those values. Proceed with caution.")
            return True
        else:
            print("✅ No records have vital_sign_id values. Safe to remove column.")
            return False
            
    except Exception as e:
        print(f"❌ Error checking vital_sign_id usage: {e}")
        return False

def remove_vital_sign_id_column(conn):
    """Remove the vital_sign_id column and its foreign key constraint."""
    try:
        cursor = conn.cursor()
        
        print("🔧 Starting migration to remove redundant vital_sign_id column...")
        
        # Step 1: Drop the foreign key constraint
        print("1️⃣ Dropping foreign key constraint 'fk_vital_sign'...")
        cursor.execute("""
            ALTER TABLE medical_records 
            DROP CONSTRAINT IF EXISTS fk_vital_sign;
        """)
        print("   ✅ Foreign key constraint dropped")
        
        # Step 2: Drop the vital_sign_id column
        print("2️⃣ Dropping vital_sign_id column...")
        cursor.execute("""
            ALTER TABLE medical_records 
            DROP COLUMN IF EXISTS vital_sign_id;
        """)
        print("   ✅ Column vital_sign_id dropped")
        
        # Step 3: Verify the column is gone
        print("3️⃣ Verifying column removal...")
        cursor.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'medical_records' 
            AND column_name = 'vital_sign_id';
        """)
        
        if cursor.fetchone():
            print("   ❌ Column still exists!")
            return False
        else:
            print("   ✅ Column successfully removed")
        
        # Step 4: Verify consultation_vital_signs still works
        print("4️⃣ Verifying consultation_vital_signs table integrity...")
        cursor.execute("""
            SELECT COUNT(*) 
            FROM consultation_vital_signs;
        """)
        
        count = cursor.fetchone()[0]
        print(f"   ✅ consultation_vital_signs table has {count} records")
        
        print("🎉 Migration completed successfully!")
        return True
        
    except Exception as e:
        print(f"❌ Error during migration: {e}")
        return False

def main():
    """Main migration function."""
    print("🚀 Starting migration: Remove redundant vital_sign_id relation")
    print("=" * 60)
    
    # Connect to database
    conn = get_database_connection()
    if not conn:
        print("❌ Failed to connect to database. Exiting.")
        sys.exit(1)
    
    try:
        # Check current state
        has_data = check_vital_sign_id_usage(conn)
        
        if has_data:
            response = input("\n⚠️  Records with vital_sign_id found. Continue anyway? (y/N): ")
            if response.lower() != 'y':
                print("❌ Migration cancelled by user")
                return False
        
        # Perform migration
        success = remove_vital_sign_id_column(conn)
        
        if success:
            print("\n✅ Migration completed successfully!")
            print("📋 Summary:")
            print("   - Removed vital_sign_id column from medical_records")
            print("   - Removed fk_vital_sign foreign key constraint")
            print("   - consultation_vital_signs table remains intact")
            print("   - Proper N:M relationship preserved")
        else:
            print("\n❌ Migration failed!")
            return False
            
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return False
    finally:
        conn.close()
        print("🔌 Database connection closed")

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
