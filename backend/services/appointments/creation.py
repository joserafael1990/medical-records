from sqlalchemy.orm import Session
from datetime import timedelta
import pytz
from database import Appointment, Person, Office
from services.appointments.validation import parse_appointment_date
from utils.datetime_utils import now_in_timezone

def create_appointment(db: Session, appointment_data: dict) -> Appointment:
    """Create a new appointment"""
    # Remove ID if present
    appointment_data.pop('id', None)
    appointment_data.pop('reason', None)
    
    # Get context
    doctor_id = appointment_data.get('doctor_id')
    doctor_timezone = 'America/Mexico_City'
    duration_minutes = 30
    
    if doctor_id:
        doctor = db.query(Person).filter(Person.id == doctor_id).first()
        if doctor:
            duration_minutes = doctor.appointment_duration or 30
            
            # Check office timezone
            office_id = appointment_data.get('office_id')
            if office_id:
                office = db.query(Office).filter(Office.id == office_id).first()
                if office:
                    doctor_timezone = office.timezone

    # Parse and process dates
    start_time = parse_appointment_date(
        appointment_data['appointment_date'], 
        doctor_timezone, 
        doctor_id
    )
    
    # Convert to UTC for calculation/storage logic
    start_time_utc = start_time.astimezone(pytz.utc)
    
    # Store in doctor's timezone (as naive) per DB requirement
    tz = pytz.timezone(doctor_timezone)
    start_time_for_storage = start_time_utc.astimezone(tz).replace(tzinfo=None)
    appointment_data['appointment_date'] = start_time_for_storage
    
    # Calculate end time
    end_time = start_time_utc + timedelta(minutes=duration_minutes)
    end_time_for_storage = end_time.astimezone(tz).replace(tzinfo=None)
    appointment_data['end_time'] = end_time_for_storage
    
    # Set timestamps
    now_utc = now_in_timezone(doctor_timezone).astimezone(pytz.utc)
    appointment_data['created_at'] = now_utc
    
    status_value = appointment_data.get('status') or 'por_confirmar'
    appointment_data['status'] = status_value
    if status_value == 'confirmada':
        appointment_data['confirmed_at'] = now_utc
        
    # Create record
    appointment = Appointment(**appointment_data)
    db.add(appointment)
    db.commit()
    db.refresh(appointment)
    return appointment
