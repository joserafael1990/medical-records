"""
Migration: Add phone_code to countries table
Adds international dialing code to each country (e.g., +52 for Mexico, +58 for Venezuela)
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from database import engine

def upgrade():
    """Add phone_code column to countries table"""
    with engine.connect() as connection:
        # Check if column already exists
        check_column = text("""
            SELECT EXISTS (
                SELECT 1 
                FROM information_schema.columns 
                WHERE table_name = 'countries' 
                AND column_name = 'phone_code'
            );
        """)
        
        column_exists = connection.execute(check_column).scalar()
        
        if not column_exists:
            print("📞 Adding phone_code column to countries table...")
            
            # Add phone_code column
            connection.execute(text("""
                ALTER TABLE countries 
                ADD COLUMN phone_code VARCHAR(5);
            """))
            
            print("✅ phone_code column added successfully")
            
            # Update with common phone codes
            print("📞 Updating phone codes for countries...")
            
            # Common Latin American countries
            phone_codes = {
                'México': '+52',
                'Mexico': '+52',
                'Venezuela': '+58',
                'Argentina': '+54',
                'Colombia': '+57',
                'Chile': '+56',
                'Perú': '+51',
                'Peru': '+51',
                'Ecuador': '+593',
                'Bolivia': '+591',
                'Paraguay': '+595',
                'Uruguay': '+598',
                'Costa Rica': '+506',
                'Panamá': '+507',
                'Panama': '+507',
                'Guatemala': '+502',
                'Honduras': '+504',
                'El Salvador': '+503',
                'Nicaragua': '+505',
                'República Dominicana': '+1',
                'Cuba': '+53',
                'Puerto Rico': '+1',
                'España': '+34',
                'Estados Unidos': '+1',
                'United States': '+1',
                'Canadá': '+1',
                'Canada': '+1',
                'Brasil': '+55',
                'Brazil': '+55',
            }
            
            for country_name, code in phone_codes.items():
                connection.execute(
                    text(f"UPDATE countries SET phone_code = :code WHERE name = :name"),
                    {"code": code, "name": country_name}
                )
            
            connection.commit()
            print("✅ Phone codes updated successfully")
        else:
            print("⚠️  phone_code column already exists, skipping migration")

def downgrade():
    """Remove phone_code column from countries table"""
    with engine.connect() as connection:
        print("🔄 Removing phone_code column from countries table...")
        connection.execute(text("ALTER TABLE countries DROP COLUMN IF EXISTS phone_code;"))
        connection.commit()
        print("✅ phone_code column removed successfully")

if __name__ == "__main__":
    print("🚀 Starting migration: Add phone_code to countries")
    upgrade()
    print("✅ Migration completed successfully!")

