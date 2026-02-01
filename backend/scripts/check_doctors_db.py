
import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from database import SessionLocal, Person
from sqlalchemy import func

def check_doctors():
    db = SessionLocal()
    try:
        print("--- Checking Persons Table ---")
        # Count by person_type
        counts = db.query(Person.person_type, func.count(Person.id)).group_by(Person.person_type).all()
        print("Counts by person_type:")
        for pt, count in counts:
            print(f"  {pt}: {count}")

        # List all doctors
        print("\n--- Listing Doctors ---")
        doctors = db.query(Person).filter(Person.person_type == 'doctor').all()
        print(f"Found {len(doctors)} doctors with person_type='doctor'")
        for d in doctors:
            print(f"  ID: {d.id}, Name: {d.name}, Active: {d.is_active}")

        # Check for case sensitivity issues
        print("\n--- Checking for 'Doctor' or other variations ---")
        others = db.query(Person).filter(Person.person_type.ilike('doctor')).all()
        print(f"Found {len(others)} doctors using case-insensitive search")
        
    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    check_doctors()
