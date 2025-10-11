#!/usr/bin/env python3
"""
Add test appointment data including cancelled appointments
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import pytz
from database import get_db, engine, Person, Appointment

# CDMX timezone
CDMX_TZ = pytz.timezone('America/Mexico_City')

def create_test_appointments():
    """Create test appointments including cancelled ones"""
    
    # Create database session
    db = Session(engine)
    
    try:
        # Get existing users (patients and doctors)
        patients = db.query(Person).filter(Person.person_type == 'patient').limit(5).all()
        doctors = db.query(Person).filter(Person.person_type == 'doctor').limit(2).all()
        
        if not patients:
            print("❌ No patients found. Please create patients first.")
            return
            
        if not doctors:
            print("❌ No doctors found. Please create doctors first.")
            return
            
        doctor = doctors[0]  # Use first doctor
        print(f"👨‍⚕️ Using doctor: {doctor.first_name} {doctor.paternal_surname}")
        
        # Create test appointments for today and nearby dates
        base_date = datetime.now(CDMX_TZ).replace(hour=14, minute=0, second=0, microsecond=0)
        
        test_appointments = [
            {
                "patient": patients[0],
                "date": base_date + timedelta(hours=0, minutes=12),  # 2:12 PM
                "duration": 60,
                "type": "consultation",
                "reason": "Evaluación trastorno bipolar",
                "status": "confirmed",
                "notes": "Ajuste de estabilizadores del ánimo"
            },
            {
                "patient": patients[1] if len(patients) > 1 else patients[0],
                "date": base_date + timedelta(hours=2, minutes=5),  # 4:05 PM
                "duration": 30,
                "type": "consultation", 
                "reason": "sadsa",
                "status": "confirmed",
                "notes": ""
            },
            {
                "patient": patients[2] if len(patients) > 2 else patients[0],
                "date": base_date + timedelta(hours=2, minutes=50),  # 4:50 PM
                "duration": 30,
                "type": "consultation",
                "reason": "lola",
                "status": "confirmed",
                "notes": ""
            },
            {
                "patient": patients[3] if len(patients) > 3 else patients[0],
                "date": base_date + timedelta(hours=3, minutes=25),  # 5:25 PM
                "duration": 40,
                "type": "consultation",
                "reason": "asdasdwqw",
                "status": "confirmed",
                "notes": "Cita editadas con relaciones"
            },
            {
                "patient": patients[4] if len(patients) > 4 else patients[0],
                "date": base_date + timedelta(hours=1),  # 3:00 PM
                "duration": 30,
                "type": "consultation",
                "reason": "Paciente canceló por emergencia familiar",
                "status": "cancelled",
                "notes": "Reagendar para próxima semana",
                "cancelled_reason": "Emergencia familiar - paciente tuvo que viajar urgentemente",
                "cancelled_at": datetime.now(CDMX_TZ) - timedelta(hours=2)
            }
        ]
        
        created_count = 0
        
        for apt_data in test_appointments:
            # Convert CDMX time to UTC for database storage
            utc_date = apt_data["date"].astimezone(pytz.utc)
            end_time = utc_date + timedelta(minutes=apt_data["duration"])
            
            # Check if appointment already exists
            existing = db.query(Appointment).filter(
                Appointment.patient_id == apt_data["patient"].id,
                Appointment.doctor_id == doctor.id,
                Appointment.appointment_date == utc_date
            ).first()
            
            if existing:
                print(f"⏭️  Appointment already exists for {apt_data['patient'].first_name} at {apt_data['date']}")
                continue
            
            # Create appointment
            appointment = Appointment(
                patient_id=apt_data["patient"].id,
                doctor_id=doctor.id,
                appointment_date=utc_date,
                end_time=end_time,
                appointment_type=apt_data["type"],
                reason=apt_data["reason"],
                notes=apt_data["notes"],
                status=apt_data["status"],
                priority="normal",
                confirmation_required=False,
                insurance_covered=False,
                created_at=datetime.utcnow(),
                created_by=doctor.id
            )
            
            # Add cancellation details if cancelled
            if apt_data["status"] == "cancelled":
                appointment.cancelled_reason = apt_data["cancelled_reason"]
                appointment.cancelled_at = apt_data["cancelled_at"].astimezone(pytz.utc)
                appointment.cancelled_by = doctor.id
            
            db.add(appointment)
            created_count += 1
            
            print(f"✅ Created {apt_data['status']} appointment for {apt_data['patient'].first_name} at {apt_data['date'].strftime('%H:%M')}")
        
        db.commit()
        print(f"\n🎉 Successfully created {created_count} test appointments!")
        
        # Show summary
        total_appointments = db.query(Appointment).filter(Appointment.doctor_id == doctor.id).count()
        cancelled_appointments = db.query(Appointment).filter(
            Appointment.doctor_id == doctor.id,
            Appointment.status == 'cancelled'
        ).count()
        
        print(f"📊 Total appointments for doctor: {total_appointments}")
        print(f"📊 Cancelled appointments: {cancelled_appointments}")
        
    except Exception as e:
        print(f"❌ Error creating test appointments: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    print("🚀 Creating test appointments...")
    create_test_appointments()

