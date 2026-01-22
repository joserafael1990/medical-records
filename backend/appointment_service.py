"""
Appointment Service - Gestión de citas médicas
Provides comprehensive appointment management functionality
Refactored to use modular services in backend/services/appointments/
"""
from sqlalchemy.orm import Session
from datetime import date, datetime
from typing import List, Optional, Dict

from database import Appointment
from services.appointments import creation, query, update, validation, reminders

# Re-export helper for compatibility
get_doctor_timezone = validation.get_doctor_timezone

class AppointmentService:
    """Service for managing medical appointments"""
    
    @staticmethod
    def _parse_appointment_date(start_time: str | datetime, doctor_timezone: str, doctor_id: Optional[int] = None) -> datetime:
        """Parse and localize appointment date"""
        return validation.parse_appointment_date(start_time, doctor_timezone, doctor_id)

    @staticmethod
    def create_appointment(db: Session, appointment_data: dict) -> Appointment:
        """Create a new appointment"""
        return creation.create_appointment(db, appointment_data)
    
    @staticmethod
    def get_appointments(
        db: Session, 
        skip: int = 0, 
        limit: int = 100,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        status: Optional[str] = None,
        patient_id: Optional[int] = None,
        doctor_id: Optional[int] = None,
        available_for_consultation: bool = False
    ) -> List[Appointment]:
        """Get appointments with filters"""
        return query.get_appointments(
            db, skip, limit, start_date, end_date, status, patient_id, doctor_id, available_for_consultation
        )
    
    @staticmethod
    def get_appointment_by_id(db: Session, appointment_id: str) -> Optional[Appointment]:
        """Get a specific appointment by ID"""
        return query.get_appointment_by_id(db, appointment_id)
    
    @staticmethod
    def _get_doctor_duration(db: Session, doctor_id: int) -> int:
        """Get doctor's appointment duration, with fallback"""
        return validation.get_doctor_duration(db, doctor_id)
    
    @staticmethod
    def update_appointment(db: Session, appointment_id: str, appointment_data: dict) -> Optional[Appointment]:
        """Update an existing appointment"""
        return update.update_appointment(db, appointment_id, appointment_data)
    
    @staticmethod
    def delete_appointment(db: Session, appointment_id: str) -> bool:
        """Delete (cancel) an appointment"""
        return update.delete_appointment(db, appointment_id)
    
    @staticmethod
    def get_appointments_by_date(db: Session, target_date: date) -> List[Appointment]:
        """Get all appointments for a specific date"""
        return query.get_appointments_by_date(db, target_date)
    
    @staticmethod
    def get_available_time_slots(
        db: Session, 
        target_date: date, 
        doctor_id: Optional[str] = None,
        slot_duration: int = 30
    ) -> List[Dict]:
        """Get available time slots for a specific date"""
        return query.get_available_time_slots(db, target_date, doctor_id, slot_duration)

    # ==============================
    # Auto reminder helpers
    # ==============================
    @staticmethod
    def get_reminder_send_time(appointment_dt: datetime, offset_minutes: int) -> datetime:
        """Compute when the auto reminder should be sent (appointment time minus offset)."""
        return reminders.get_reminder_send_time(appointment_dt, offset_minutes)

    @staticmethod
    def should_send_reminder(appointment) -> bool:
        """Return True if reminder should be sent now based on flags and timestamps."""
        return reminders.should_send_reminder(appointment)

    @staticmethod
    def mark_reminder_sent(db: Session, appointment_id: int) -> None:
        """Persist sent timestamp for auto reminder."""
        return reminders.mark_reminder_sent(db, appointment_id)

    @staticmethod
    def _atomic_mark_reminder_sent(db: Session, appointment_id: int) -> bool:
        """Atomically mark reminder as sent. Returns True if successful (i.e., wasn't already sent)."""
        return reminders.atomic_mark_reminder_sent(db, appointment_id)

    @staticmethod
    def _rollback_reminder_sent(db: Session, appointment_id: int) -> None:
        """Rollback reminder_sent flag if sending failed."""
        return reminders.rollback_reminder_sent(db, appointment_id)

    @staticmethod
    def send_appointment_reminder(db: Session, appointment_id: int) -> bool:
        """Send WhatsApp reminder using existing WhatsAppService. Returns True on success."""
        return reminders.send_appointment_reminder(db, appointment_id)

    @staticmethod
    def get_doctor_schedule(
        db: Session, 
        doctor_id: str, 
        start_date: date, 
        end_date: date
    ) -> Dict[str, List[Dict]]:
        """Get doctor's schedule for a date range"""
        return query.get_doctor_schedule(db, doctor_id, start_date, end_date)

    @staticmethod
    def get_appointment_stats(db: Session, doctor_id: Optional[str] = None) -> Dict:
        """Get appointment statistics"""
        return query.get_appointment_stats(db, doctor_id)
