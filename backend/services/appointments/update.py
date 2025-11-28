from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import Optional
from database import Appointment
from services.appointments.validation import get_doctor_duration
from utils.datetime_utils import to_utc_for_storage, utc_now

def update_appointment(db: Session, appointment_id: str, appointment_data: dict) -> Optional[Appointment]:
    """Update an existing appointment"""
    appointment = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if not appointment:
        return None
    
    appointment_data.pop('reason', None)
    
    # Handle datetime conversion for appointment_date
    if 'appointment_date' in appointment_data:
        if isinstance(appointment_data['appointment_date'], str):
            parsed_dt = datetime.fromisoformat(
                appointment_data['appointment_date'].replace('Z', '+00:00')
            )
            appointment_data['appointment_date'] = to_utc_for_storage(parsed_dt)
        
        # Recalculate end_time
        duration = get_doctor_duration(db, appointment.doctor_id)
        appointment_data['end_time'] = appointment_data['appointment_date'] + timedelta(minutes=duration)
    
    # Handle cancellation
    if appointment_data.get('status') == 'cancelled' and 'cancelled_reason' in appointment_data:
        appointment_data['cancelled_at'] = utc_now()
    
    # Update fields
    for key, value in appointment_data.items():
        if hasattr(appointment, key):
            setattr(appointment, key, value)
    
    appointment.updated_at = utc_now()
    db.commit()
    db.refresh(appointment)
    return appointment

def delete_appointment(db: Session, appointment_id: str) -> bool:
    """Delete (cancel) an appointment"""
    appointment = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if not appointment:
        return False
    
    now = utc_now()
    
    # Soft delete by setting status to cancelled
    appointment.status = "cancelled"
    appointment.cancelled_at = now
    appointment.updated_at = now
    db.commit()
    return True
