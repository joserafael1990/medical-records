#!/usr/bin/env python3
"""
Script to create a doctor user for testing
"""

import sys
import os
from datetime import datetime
from sqlalchemy.orm import Session

# Add the backend directory to the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import Base, Person, Country, State, Specialty, engine
from auth import get_password_hash

def create_doctor_user():
    """Create a doctor user for testing"""
    
    # Create database session
    session = Session(engine)
    
    try:
        print("🚀 Creating doctor user...")
        
        # Check if doctor already exists
        existing_doctor = session.query(Person).filter(Person.email == "thiago@avant.com").first()
        if existing_doctor:
            print(f"✅ Doctor with email thiago@avant.com already exists!")
            return
        
        # Create doctor user
        doctor = Person(
            person_code="DOC001",
            email="thiago@avant.com",
            hashed_password=get_password_hash("Password123!"),
            first_name="Thiago",
            paternal_surname="Garcia",
            maternal_surname="Rodriguez",
            person_type="doctor",
            birth_date=datetime(1985, 1, 1).date(),
            gender="male",
            primary_phone="555-123-4567",
            professional_license="LIC123456",
            is_active=True,
            created_at=datetime.utcnow()
        )
        
        session.add(doctor)
        session.commit()
        
        print(f"✅ Doctor user created successfully!")
        print(f"   Email: thiago@avant.com")
        print(f"   Password: Password123!")
        print(f"   Name: {doctor.first_name} {doctor.paternal_surname}")
        
    except Exception as e:
        session.rollback()
        print(f"❌ Error creating doctor user: {e}")
    finally:
        session.close()

if __name__ == "__main__":
    create_doctor_user()
