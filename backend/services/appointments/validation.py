from sqlalchemy.orm import Session
from datetime import datetime
from typing import Optional
import pytz
from database import Person, Office
from logger import get_logger

api_logger = get_logger("medical_records.api")

def get_doctor_timezone(db: Session, doctor_id: int) -> str:
    """Get doctor's office timezone from database"""
    # Use default timezone since office_timezone was moved to Office table
    # In a full implementation, this would query the offices table
    return 'America/Mexico_City'  # Default fallback

def get_doctor_duration(db: Session, doctor_id: int) -> int:
    """Get doctor's appointment duration, with fallback"""
    doctor = db.query(Person).filter(Person.id == doctor_id).first()
    return doctor.appointment_duration if doctor and doctor.appointment_duration else 30

def parse_appointment_date(start_time: str | datetime, doctor_timezone: str, doctor_id: Optional[int] = None) -> datetime:
    """Parse and localize appointment date"""
    if isinstance(start_time, str):
        if start_time.endswith('Z'):
            # Treat as UTC
            dt = datetime.fromisoformat(start_time.replace('Z', '+00:00'))
            api_logger.debug("📅 Parsed appointment_date as UTC", extra={"doctor_id": doctor_id, "parsed_value": dt.isoformat()})
            return dt
        elif '+' in start_time or start_time.count('-') > 2:
            # ISO with timezone
            dt = datetime.fromisoformat(start_time)
            api_logger.debug("📅 Parsed appointment_date with timezone info", extra={"doctor_id": doctor_id, "parsed_value": dt.isoformat()})
            return dt
        else:
            # Naive -> localize
            dt = datetime.fromisoformat(start_time)
            tz = pytz.timezone(doctor_timezone)
            dt = tz.localize(dt)
            api_logger.debug("📅 Localized naive appointment_date", extra={"doctor_id": doctor_id, "localized_value": dt.isoformat()})
            return dt
    return start_time
