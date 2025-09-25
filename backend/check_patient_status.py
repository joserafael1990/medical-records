#!/usr/bin/env python3
"""
Script to check the status of all patients in the database
"""

import sys
import os
from sqlalchemy.orm import Session

# Add the backend directory to the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import Base, Person
from sqlalchemy import create_engine
from config import DATABASE_URL

def check_patient_status():
    """Check and display the status of all patients"""
    
    # Create database engine and session
    engine = create_engine(DATABASE_URL)
    Base.metadata.create_all(engine)
    session = Session(engine)
    
    try:
        print("🔍 Checking patient status...")
        
        # Get all patients
        all_patients = session.query(Person).filter(Person.person_type == "patient").all()
        active_patients = session.query(Person).filter(
            Person.person_type == "patient",
            Person.is_active == True
        ).all()
        inactive_patients = session.query(Person).filter(
            Person.person_type == "patient", 
            Person.is_active == False
        ).all()
        
        print(f"\n📊 PATIENT STATUS SUMMARY:")
        print(f"   Total patients: {len(all_patients)}")
        print(f"   Active patients: {len(active_patients)} ✅")
        print(f"   Inactive patients: {len(inactive_patients)} ❌")
        
        print(f"\n📋 ALL PATIENTS LIST:")
        print(f"{'ID':<4} {'Name':<30} {'Email':<35} {'Status':<10}")
        print("-" * 85)
        
        for patient in all_patients:
            status_icon = "✅ Active" if patient.is_active else "❌ Inactive"
            email = patient.email or "No email"
            print(f"{patient.id:<4} {patient.full_name:<30} {email:<35} {status_icon}")
        
        if len(active_patients) == len(all_patients):
            print(f"\n🎉 EXCELLENT! All {len(all_patients)} patients are ACTIVE and ready for medical records!")
        else:
            print(f"\n⚠️  Warning: {len(inactive_patients)} patients are inactive")
        
    except Exception as e:
        print(f"❌ Error checking patient status: {str(e)}")
        raise
    finally:
        session.close()

if __name__ == "__main__":
    check_patient_status()












