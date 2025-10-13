#!/usr/bin/env python3
"""
Script to insert countries and states data
"""

import psycopg2
from pathlib import Path

def run_insertion():
    """Run the insertion of countries and states data"""
    
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
        
        # Read SQL file
        sql_file = Path(__file__).parent / 'insert_countries_states.sql'
        with open(sql_file, 'r', encoding='utf-8') as f:
            sql_content = f.read()
        
        print("🌍 Inserting countries...")
        print("🏛️  Inserting states for Hispanic American countries...")
        print("📝 Adding 'Otro' state for non-Hispanic countries...")
        
        # Execute SQL
        cursor.execute(sql_content)
        
        # Commit changes
        conn.commit()
        
        print("✅ Data insertion completed successfully!")
        
        # Verify results
        cursor.execute("SELECT COUNT(*) FROM countries WHERE active = true")
        countries_count = cursor.fetchone()[0]
        print(f"📊 Countries inserted: {countries_count}")
        
        cursor.execute("SELECT COUNT(*) FROM states WHERE active = true")
        states_count = cursor.fetchone()[0]
        print(f"📊 States inserted: {states_count}")
        
        # Show some examples
        cursor.execute("""
            SELECT c.name, COUNT(s.id) as state_count 
            FROM countries c 
            LEFT JOIN states s ON c.id = s.country_id AND s.active = true
            WHERE c.active = true 
            GROUP BY c.id, c.name 
            ORDER BY c.name 
            LIMIT 10
        """)
        
        print("\n📋 Sample countries and their states:")
        for row in cursor.fetchall():
            print(f"  {row[0]}: {row[1]} states")
        
    except Exception as e:
        print(f"❌ Insertion failed: {str(e)}")
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
    run_insertion()
