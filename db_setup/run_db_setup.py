import sys
import os
from sqlalchemy import text

# Add parent directory to path to import backend
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

try:
    from backend.models.base import engine
except ImportError:
    # Fallback if running from root
    sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '.')))
    from backend.models.base import engine

def run_sql_file(filename):
    print(f"Running {filename}...")
    with open(filename, 'r') as f:
        sql = f.read()
    
    with engine.connect() as connection:
        connection.execute(text(sql))
        connection.commit()
    print(f"Finished {filename}")

def main():
    print("Starting Database Setup...")
    
    # 1. Drop tables manually to ensure clean slate
    print("Dropping specific tables to fix schema mismatch...")
    with engine.connect() as connection:
        connection.execute(text("DROP TABLE IF EXISTS diagnosis_catalog CASCADE;"))
        connection.execute(text("DROP TABLE IF EXISTS persons CASCADE;"))
        connection.execute(text("DROP VIEW IF EXISTS diagnosis_search_view CASCADE;"))
        connection.commit()
    
    # 2. Run scripts in order
    base_dir = os.path.dirname(__file__)
    scripts = [
        "01_create_database_structure.sql",
        "02_clean_master_data.sql",
        "03_additional_functions.sql",
        "04_populate_master_data_FULL.sql"
    ]
    
    for script in scripts:
        path = os.path.join(base_dir, script)
        if os.path.exists(path):
            run_sql_file(path)
        else:
            print(f"Error: Could not find {path}")
            return

    print("✅ Done! Database setup complete.")
    
    # Verification
    with engine.connect() as connection:
        result = connection.execute(text("SELECT COUNT(*) FROM persons"))
        count = result.scalar()
        print(f"Persons count: {count}")
        
        result = connection.execute(text("SELECT COUNT(*) FROM diagnosis_catalog"))
        count = result.scalar()
        print(f"Diagnosis count: {count}")

if __name__ == "__main__":
    main()
