#!/usr/bin/env python3
"""
Script to activate all patients in the database
Sets is_active = True for all patients
"""

import sys
import os
from sqlalchemy.orm import Session

# Add the backend directory to the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import Base, Person
from sqlalchemy import create_engine, update
from config import DATABASE_URL

def activate_all_patients():
    """Set all patients to active status"""
    
    # Create database engine and session
    engine = create_engine(DATABASE_URL)
    Base.metadata.create_all(engine)
    session = Session(engine)
    
    try:
        print("🚀 Starting patient activation process...")
        
        # Get count of patients before update
        total_patients = session.query(Person).filter(Person.person_type == "patient").count()
        inactive_patients = session.query(Person).filter(
            Person.person_type == "patient",
            Person.is_active == False
        ).count()
        
        print(f"📊 Found {total_patients} total patients")
        print(f"📊 Found {inactive_patients} inactive patients")
        
        if inactive_patients == 0:
            print("✅ All patients are already active!")
            return
        
        # Update all patients to active status
        update_result = session.execute(
            update(Person)
            .where(Person.person_type == "patient")
            .values(is_active=True)
        )
        
        session.commit()
        
        # Verify the update
        remaining_inactive = session.query(Person).filter(
            Person.person_type == "patient",
            Person.is_active == False
        ).count()
        
        activated_count = inactive_patients - remaining_inactive
        
        print(f"✅ Successfully activated {activated_count} patients")
        print(f"✅ All {total_patients} patients are now active!")
        
        # Show sample of activated patients
        active_patients = session.query(Person).filter(
            Person.person_type == "patient",
            Person.is_active == True
        ).limit(5).all()
        
        print(f"\n📋 Sample of active patients:")
        for patient in active_patients:
            print(f"   - {patient.full_name} (ID: {patient.id}) - Status: {'✅ Active' if patient.is_active else '❌ Inactive'}")
        
        if total_patients > 5:
            print(f"   ... and {total_patients - 5} more patients")
        
    except Exception as e:
        session.rollback()
        print(f"❌ Error activating patients: {str(e)}")
        raise
    finally:
        session.close()

if __name__ == "__main__":
    activate_all_patients()



















