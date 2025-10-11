#!/usr/bin/env python3
"""
Initialize database with tables and basic data
"""

import os
import sys

from database import Base, engine, Country, State, Specialty, EmergencyRelationship
from sqlalchemy.orm import sessionmaker

def create_tables():
    """Create all database tables"""
    print("🔧 Creating database tables...")
    Base.metadata.create_all(bind=engine)
    print("✅ Tables created successfully")

def insert_basic_data():
    """Insert basic catalog data"""
    print("📊 Inserting basic catalog data...")
    
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()
    
    try:
        # Check if data already exists
        if db.query(Country).count() > 0:
            print("⚠️ Basic data already exists, skipping...")
            return
        
        # Insert countries
        mexico = Country(name="México", active=True)
        usa = Country(name="Estados Unidos", active=True)
        db.add(mexico)
        db.add(usa)
        db.commit()  # Commit countries first to get their IDs
        
        # Insert states
        cdmx = State(name="Ciudad de México", country_id=1, active=True)
        jalisco = State(name="Jalisco", country_id=1, active=True)
        california = State(name="California", country_id=2, active=True)
        db.add(cdmx)
        db.add(jalisco)
        db.add(california)
        
        # Insert specialties
        specialties_data = [
            "Medicina General",
            "Cardiología",
            "Dermatología",
            "Ginecología",
            "Pediatría",
            "Neurología",
            "Oftalmología",
            "Ortopedia",
            "Psiquiatría",
            "Radiología"
        ]
        
        for specialty_name in specialties_data:
            specialty = Specialty(name=specialty_name, active=True)
            db.add(specialty)
        
        # Insert emergency relationships
        relationships_data = [
            ("PAD", "Padre"),
            ("MAD", "Madre"),
            ("HIJ", "Hijo"),
            ("HIJA", "Hija"),
            ("ESP", "Esposo"),
            ("ESPA", "Esposa"),
            ("HER", "Hermano"),
            ("HERA", "Hermana"),
            ("ABU", "Abuelo"),
            ("ABUA", "Abuela"),
            ("TIO", "Tío"),
            ("TIA", "Tía"),
            ("PRI", "Primo"),
            ("PRIA", "Prima"),
            ("AMI", "Amigo"),
            ("AMIA", "Amiga"),
            ("OTR", "Otro")
        ]
        
        for code, relationship_name in relationships_data:
            relationship = EmergencyRelationship(code=code, name=relationship_name, active=True)
            db.add(relationship)
        
        db.commit()
        print("✅ Basic catalog data inserted successfully")
        
    except Exception as e:
        print(f"❌ Error inserting data: {str(e)}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    print("🏥 Medical Records System - Database Initialization")
    print("=" * 60)
    
    try:
        create_tables()
        insert_basic_data()
        print("\n🎉 Database initialization completed successfully!")
    except Exception as e:
        print(f"\n❌ Database initialization failed: {str(e)}")
        sys.exit(1)
