"""
Appointment Service - Gestión de citas médicas
Provides comprehensive appointment management functionality
"""
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, or_, desc, asc, func, update
from datetime import datetime, date, time, timedelta
from typing import List, Optional, Dict
import uuid
import pytz
import os

from database import Appointment, Person
from services.office_helpers import build_office_address, resolve_maps_url, resolve_country_code
from logger import get_logger
from utils.datetime_utils import (
    now_cdmx, 
    now_in_timezone, 
    to_utc_for_storage, 
    from_utc_to_timezone,
    SYSTEM_TIMEZONE
)

# Structured logger
api_logger = get_logger("medical_records.api")

def get_doctor_timezone(db: Session, doctor_id: int) -> str:
    """Get doctor's office timezone from database"""
    # Use default timezone since office_timezone was moved to Office table
    # In a full implementation, this would query the offices table
    return 'America/Mexico_City'  # Default fallback


class AppointmentService:
    """Service for managing medical appointments"""
    
    @staticmethod
    def _parse_appointment_date(start_time: str | datetime, doctor_timezone: str, doctor_id: Optional[int] = None) -> datetime:
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

    @staticmethod
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
                    from database import Office
                    office = db.query(Office).filter(Office.id == office_id).first()
                    if office:
                        doctor_timezone = office.timezone

        # Parse and process dates
        start_time = AppointmentService._parse_appointment_date(
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
        from sqlalchemy.orm import joinedload
        query = db.query(Appointment).options(
            joinedload(Appointment.patient),
            joinedload(Appointment.doctor)
        )
        
        # Date range filter
        if start_date:
            query = query.filter(func.date(Appointment.appointment_date) >= start_date)
        if end_date:
            query = query.filter(func.date(Appointment.appointment_date) <= end_date)
        
        # Status filter for available appointments (for consultation dropdown)
        if available_for_consultation:
            query = query.filter(Appointment.status.in_(['confirmada']))
        elif status == 'active':
            # Exclude cancelled appointments
            query = query.filter(Appointment.status != 'cancelled')
        elif status:
            normalized_status = status
            if status == 'confirmed':
                normalized_status = 'confirmada'
            elif status in ('scheduled', 'pending'):
                normalized_status = 'por_confirmar'
            query = query.filter(Appointment.status == normalized_status)
        
        # Patient filter
        if patient_id:
            query = query.filter(Appointment.patient_id == patient_id)
        
        # Doctor filter
        if doctor_id:
            query = query.filter(Appointment.doctor_id == doctor_id)
        
        # Filter by patients created by the current doctor (for privacy/security)
        # Only show appointments for patients created by the current doctor
        # Disabled for development
        # query = query.join(Person, Appointment.patient_id == Person.id).filter(
        #     Person.created_by == doctor_id
        # )
        
        # Order by appointment date
        return query.order_by(asc(Appointment.appointment_date)).offset(skip).limit(limit).all()
    
    @staticmethod
    def get_appointment_by_id(db: Session, appointment_id: str) -> Optional[Appointment]:
        """Get a specific appointment by ID"""
        return db.query(Appointment).filter(Appointment.id == appointment_id).first()
    
    @staticmethod
    def _get_doctor_duration(db: Session, doctor_id: int) -> int:
        """Get doctor's appointment duration, with fallback"""
        doctor = db.query(Person).filter(Person.id == doctor_id).first()
        return doctor.appointment_duration if doctor and doctor.appointment_duration else 30
    
    @staticmethod
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
            duration = AppointmentService._get_doctor_duration(db, appointment.doctor_id)
            appointment_data['end_time'] = appointment_data['appointment_date'] + timedelta(minutes=duration)
        
        # Handle cancellation
        if appointment_data.get('status') == 'cancelled' and 'cancelled_reason' in appointment_data:
            from utils.datetime_utils import utc_now
            appointment_data['cancelled_at'] = utc_now()
        
        # Update fields
        for key, value in appointment_data.items():
            if hasattr(appointment, key):
                setattr(appointment, key, value)
        
        from utils.datetime_utils import utc_now
        appointment.updated_at = utc_now()
        db.commit()
        db.refresh(appointment)
        return appointment
    
    @staticmethod
    def delete_appointment(db: Session, appointment_id: str) -> bool:
        """Delete (cancel) an appointment"""
        appointment = db.query(Appointment).filter(Appointment.id == appointment_id).first()
        if not appointment:
            return False
        
        from utils.datetime_utils import utc_now
        now = utc_now()
        
        # Soft delete by setting status to cancelled
        appointment.status = "cancelled"
        appointment.cancelled_at = now
        appointment.updated_at = now
        db.commit()
        return True
    
    @staticmethod
    def get_appointments_by_date(db: Session, target_date: date) -> List[Appointment]:
        """Get all appointments for a specific date"""
        return db.query(Appointment).filter(
            func.date(Appointment.appointment_date) == target_date
        ).order_by(asc(Appointment.appointment_date)).all()
    
    @staticmethod
    def get_available_time_slots(
        db: Session, 
        target_date: date, 
        doctor_id: Optional[str] = None,
        slot_duration: int = 30
    ) -> List[Dict]:
        """Get available time slots for a specific date"""
        # Default working hours: 8:00 AM to 6:00 PM
        start_hour = 8
        end_hour = 18
        
        # Generate all possible time slots
        slots = []
        current_time = datetime.combine(target_date, time(start_hour, 0))
        end_time = datetime.combine(target_date, time(end_hour, 0))
        
        while current_time < end_time:
            slots.append({
                "time": current_time.strftime("%H:%M"),
                "datetime": current_time,
                "available": True,
                "appointment_id": None,
                "patient_name": None
            })
            current_time += timedelta(minutes=slot_duration)
        
        # Get existing appointments for the date
        existing_appointments = AppointmentService.get_appointments_by_date(db, target_date)
        
        # Mark occupied slots
        for appointment in existing_appointments:
            if appointment.status in ['cancelled']:
                continue
                
            apt_start = appointment.appointment_date.time()
            apt_end = appointment.end_time.time() if appointment.end_time else None
            
            for slot in slots:
                slot_time = datetime.strptime(slot["time"], "%H:%M").time()
                
                # Check if slot overlaps with appointment
                if apt_end:
                    if apt_start <= slot_time < apt_end:
                        slot["available"] = False
                        slot["appointment_id"] = appointment.id
                        slot["patient_name"] = appointment.patient.full_name if appointment.patient else "Unknown"
                else:
                    # If no end time, assume default duration
                    apt_end_calculated = (datetime.combine(target_date, apt_start) + 
                                        timedelta(minutes=appointment.duration_minutes)).time()
                    if apt_start <= slot_time < apt_end_calculated:
                        slot["available"] = False
                        slot["appointment_id"] = appointment.id
                        slot["patient_name"] = appointment.patient.full_name if appointment.patient else "Unknown"
        
        return slots

    # ==============================
    # Auto reminder helpers
    # ==============================
    @staticmethod
    def get_reminder_send_time(appointment_dt: datetime, offset_minutes: int) -> datetime:
        """Compute when the auto reminder should be sent (appointment time minus offset)."""
        if offset_minutes is None:
            offset_minutes = 360
        return appointment_dt - timedelta(minutes=offset_minutes)

    @staticmethod
    def should_send_reminder(appointment) -> bool:
        """Return True if reminder should be sent now based on flags and timestamps."""
        try:
            if not getattr(appointment, 'auto_reminder_enabled', False):
                return False
            if getattr(appointment, 'status', None) != 'por_confirmar':
                return False
            # Check if reminder was already sent (avoid duplicates)
            if getattr(appointment, 'reminder_sent', False):
                # If reminder was already sent, don't send again
                return False
            # Use should_send_reminder logic to determine if reminder should be sent
            send_time = AppointmentService.get_reminder_send_time(
                appointment.appointment_date,
                getattr(appointment, 'auto_reminder_offset_minutes', 360)
            )
            # Estrictamente en la hora programada (tolerancia breve para el loop)
            now = now_cdmx().replace(tzinfo=None)
            window_end = send_time + timedelta(minutes=2)
            return send_time <= now <= window_end
        except Exception:
            return False

    @staticmethod
    def mark_reminder_sent(db: Session, appointment_id: int) -> None:
        """Persist sent timestamp for auto reminder."""
        try:
            apt = db.query(Appointment).filter(Appointment.id == appointment_id).first()
            if not apt:
                api_logger.warning(
                    "⚠️ Appointment not found when marking reminder sent",
                    extra={"appointment_id": appointment_id}
                )
                return
            # Update reminder_sent and reminder_sent_at fields
            apt.reminder_sent = True
            apt.reminder_sent_at = datetime.utcnow()
            db.commit()
            api_logger.info(
                "✅ Marked reminder as sent",
                extra={
                    "appointment_id": appointment_id,
                    "reminder_sent_at": apt.reminder_sent_at.isoformat() if apt.reminder_sent_at else None
                }
            )
        except Exception as e:
            api_logger.error(
                "❌ Error marking reminder as sent",
                extra={"appointment_id": appointment_id},
                exc_info=True
            )
            db.rollback()
            raise

    @staticmethod
    def send_appointment_reminder(db: Session, appointment_id: int) -> bool:
        """Send WhatsApp reminder using existing WhatsAppService. Returns True on success.
        
        Uses atomic update to prevent duplicate reminders: marks reminder_sent BEFORE sending
        to avoid race conditions when scheduler runs multiple times.
        """
        from whatsapp_service import get_whatsapp_service
        
        # Atomic update: mark reminder_sent BEFORE sending to prevent duplicates
        # This ensures that if two scheduler processes run simultaneously, only one will succeed
        try:
            result = db.execute(
                update(Appointment)
                .where(Appointment.id == appointment_id)
                .where(Appointment.reminder_sent == False)  # Only update if not already sent
                .values(
                    reminder_sent=True,
                    reminder_sent_at=datetime.utcnow()
                )
            )
            db.commit()
            
            # If no rows were updated, reminder was already sent by another process
            if result.rowcount == 0:
                api_logger.info(
                    "⚠️ Reminder already sent, skipping duplicate",
                    extra={"appointment_id": appointment_id}
                )
                return False
                
            api_logger.info(
                "✅ Marked reminder as sent (atomic update)",
                extra={"appointment_id": appointment_id}
            )
        except Exception as e:
            db.rollback()
            api_logger.error(
                "❌ Error marking reminder as sent (atomic update)",
                extra={"appointment_id": appointment_id},
                exc_info=True
            )
            return False
        
        # Now fetch the appointment and send the reminder
        apt = db.query(Appointment).options(
            joinedload(Appointment.patient),
            joinedload(Appointment.doctor),
            joinedload(Appointment.office),
            joinedload(Appointment.appointment_type_rel)
        ).filter(Appointment.id == appointment_id).first()
        if not apt:
            return False
        
        if apt.status != 'por_confirmar':
            api_logger.info(
                "⚠️ Appointment not eligible for reminder (status mismatch)",
                extra={"appointment_id": appointment_id, "status": apt.status}
            )
            db.execute(
                update(Appointment)
                .where(Appointment.id == appointment_id)
                .values(
                    reminder_sent=False,
                    reminder_sent_at=None
                )
            )
            db.commit()
            return False
        
        # Build parameters similarly to endpoint logic
        mexico_tz = pytz.timezone('America/Mexico_City')
        # Assume stored naive datetime is local CDMX
        local_dt = mexico_tz.localize(apt.appointment_date)
        appointment_date = local_dt.strftime('%d de %B de %Y')
        appointment_time = local_dt.strftime('%I:%M %p')
        appointment_type = "presencial"
        if apt.appointment_type_rel:
            appointment_type = "online" if apt.appointment_type_rel.name == "En línea" else "presencial"

        service = get_whatsapp_service()
        try:
            # Preparar dirección y URL usando helpers
            office_address_val = build_office_address(apt.office) if getattr(apt, 'office', None) else "mi consultorio en linea - No especificado"
            maps_url_val = resolve_maps_url(apt.office, office_address_val) if getattr(apt, 'office', None) else None
            country_code_val = resolve_country_code(apt.office) if getattr(apt, 'office', None) else '52'
            if getattr(apt, 'office', None) and getattr(apt.office, 'is_virtual', False) and getattr(apt.office, 'virtual_url', None):
                appointment_type = "online"

            resp = service.send_appointment_reminder(
                patient_phone=apt.patient.primary_phone if apt.patient else None,
                patient_full_name=apt.patient.full_name if apt.patient else "Paciente",
                appointment_date=appointment_date,
                appointment_time=appointment_time,
                doctor_title=(apt.doctor.title if apt.doctor else "Dr."),
                doctor_full_name=(apt.doctor.full_name if apt.doctor else "Médico"),
                office_address=office_address_val,
                country_code=country_code_val,
                appointment_type=appointment_type,
                maps_url=maps_url_val
            )
            if resp and resp.get('success'):
                api_logger.info(
                    "✅ Appointment reminder sent successfully",
                    extra={"appointment_id": appointment_id}
                )
                return True
            else:
                # If sending failed, rollback the reminder_sent flag
                api_logger.warning(
                    "⚠️ Reminder sending failed, rolling back flag",
                    extra={"appointment_id": appointment_id, "response": resp}
                )
                db.execute(
                    update(Appointment)
                    .where(Appointment.id == appointment_id)
                    .values(
                        reminder_sent=False,
                        reminder_sent_at=None
                    )
                )
                db.commit()
                return False
        except Exception as e:
            # If exception occurred, rollback the reminder_sent flag
            api_logger.error(
                "❌ Exception sending appointment reminder",
                extra={"appointment_id": appointment_id},
                exc_info=True
            )
            try:
                db.execute(
                    update(Appointment)
                    .where(Appointment.id == appointment_id)
                    .values(
                        reminder_sent=False,
                        reminder_sent_at=None
                    )
                )
                db.commit()
            except:
                db.rollback()
            return False
    
    @staticmethod
    def get_doctor_schedule(
        db: Session, 
        doctor_id: str, 
        start_date: date, 
        end_date: date
    ) -> Dict[str, List[Dict]]:
        """Get doctor's schedule for a date range"""
        schedule = {}
        current_date = start_date
        
        while current_date <= end_date:
            date_str = current_date.isoformat()
            schedule[date_str] = AppointmentService.get_available_time_slots(
                db, current_date, doctor_id
            )
            current_date += timedelta(days=1)
        
        return schedule
    
    @staticmethod
    def get_appointment_stats(db: Session, doctor_id: Optional[str] = None) -> Dict:
        """Get appointment statistics"""
        query = db.query(Appointment)
        
        if doctor_id:
            query = query.filter(Appointment.doctor_id == doctor_id)
        
        total = query.count()
        confirmed = query.filter(Appointment.status == "confirmada").count()
        completed = query.filter(Appointment.status == "completed").count()
        cancelled = query.filter(Appointment.status == "cancelled").count()
        pending = query.filter(Appointment.status == "por_confirmar").count()
        
        # Today's appointments
        today = date.today()
        today_appointments = query.filter(
            func.date(Appointment.appointment_date) == today
        ).count()
        
        # This week's appointments
        week_start = today - timedelta(days=today.weekday())
        week_end = week_start + timedelta(days=6)
        week_appointments = query.filter(
            and_(
                func.date(Appointment.appointment_date) >= week_start,
                func.date(Appointment.appointment_date) <= week_end
            )
        ).count()
        
        return {
            "total": total,
            "confirmed": confirmed,
            "completed": completed,
            "cancelled": cancelled,
            "pending": pending,
            "today": today_appointments,
            "this_week": week_appointments
        }







