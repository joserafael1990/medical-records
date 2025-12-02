#!/usr/bin/env python3
"""
Script to check current clinical studies and diagnoses in localhost database
"""
import os
import sys
from sqlalchemy import create_engine, text

# Add backend to path
sys.path.insert(0, '/Users/rafaelgarcia/Documents/Software projects/medical-records-main/backend')

# Import database URL
from config import settings

def check_database():
    """Check clinical studies and diagnoses in database"""
    
    # Use localhost connection
    db_url = os.getenv('DATABASE_URL', settings.DATABASE_URL)
    # Replace postgres-db with localhost for local connection
    db_url = db_url.replace('postgres-db', 'localhost')
    
    print(f"🔌 Connecting to: {db_url.replace(db_url.split('@')[0].split('//')[1], '***')}")
    
    try:
        engine = create_engine(db_url)
        
        with engine.connect() as conn:
            print("\n" + "="*80)
            print("📊 CLINICAL STUDIES (study_catalog)")
            print("="*80)
            
            # Get clinical studies
            result = conn.execute(text("""
                SELECT id, name, category_id, is_active, created_by 
                FROM study_catalog 
                ORDER BY id
            """))
            
            studies = result.fetchall()
            if studies:
                print(f"\nTotal: {len(studies)} studies\n")
                for study in studies:
                    print(f"  {study[0]:3d}. {study[1][:70]:<70} (cat:{study[2]}, active:{study[3]}, by:{study[4]})")
            else:
                print("\n❌ No clinical studies found in database")
            
            print("\n" + "="*80)
            print("🏥 DIAGNOSES (diagnosis_catalog)")
            print("="*80)
            
            # Get diagnoses
            result = conn.execute(text("""
                SELECT id, code, name, is_active, created_by 
                FROM diagnosis_catalog 
                ORDER BY id
            """))
            
            diagnoses = result.fetchall()
            if diagnoses:
                print(f"\nTotal: {len(diagnoses)} diagnoses\n")
                for diag in diagnoses:
                    print(f"  {diag[0]:3d}. {diag[1]:<8} {diag[2][:60]:<60} (active:{diag[3]}, by:{diag[4]})")
            else:
                print("\n❌ No diagnoses found in database")
            
            print("\n" + "="*80)
            
    except Exception as e:
        print(f"\n❌ Error connecting to database: {e}")
        print("\n💡 Make sure your database is running:")
        print("   docker-compose up -d postgres-db")
        return False
    
    return True

if __name__ == "__main__":
    check_database()
