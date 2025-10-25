#!/usr/bin/env python3
"""
Migration script to remove the foreign_birth_place column from the persons table.
This field is not being used and should be removed.
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import engine
from sqlalchemy import text

def remove_foreign_birth_place():
    """Remove the foreign_birth_place column from the persons table."""
    try:
        with engine.connect() as conn:
            # Check if the column exists
            result = conn.execute(text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'persons' 
                AND column_name = 'foreign_birth_place'
            """))
            
            if result.fetchone():
                print("🗑️  Removing foreign_birth_place column from persons table...")
                
                # Drop the column
                conn.execute(text("ALTER TABLE persons DROP COLUMN foreign_birth_place"))
                conn.commit()
                
                print("✅ foreign_birth_place column removed successfully!")
            else:
                print("ℹ️  foreign_birth_place column does not exist, skipping...")
                
    except Exception as e:
        print(f"❌ Error removing foreign_birth_place column: {e}")
        return False
    
    return True

if __name__ == "__main__":
    print("🚀 Starting migration: Remove foreign_birth_place column")
    success = remove_foreign_birth_place()
    
    if success:
        print("✅ Migration completed successfully!")
    else:
        print("❌ Migration failed!")
        sys.exit(1)


