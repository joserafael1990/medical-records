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
os.environ['TZ'] = 'America/Mexico_City'

from database import Appointment, Person, AppointmentReminder

# Office helpers (maps URL, address, country code)
# En algunos entornos de Docker en macOS se ha visto un OSError "Resource deadlock avoided"
# al intentar leer módulos adicionales durante el arranque. Para evitar que eso
# tumbe todo el backend, envolvemos el import en un try/except y usamos stubs seguros.
try:
    from services.office_helpers import (
        build_office_address,
        resolve_maps_url,
        resolve_country_code,
    )
except Exception:
    # Fallbacks muy simples; solo afectan mensajes de WhatsApp, no la lógica crítica.
    def build_office_address(office) -> str:
        return "Consultorio Médico"

    def resolve_maps_url(office, fallback_address: Optional[str]) -> Optional[str]:
        return None

    def resolve_country_code(office, default_code: str = "52") -> str:
        return default_code
from logger import get_logger
# Structured logger
api_logger = get_logger("medical_records.api")

# Global CDMX Timezone configuration 
SYSTEM_TIMEZONE = pytz.timezone('America/Mexico_City')

def now_cdmx() -> datetime:
    """Get current datetime in CDMX timezone"""
    return datetime.now(SYSTEM_TIMEZONE)

def get_doctor_timezone(db: Session, doctor_id: int) -> str:
    """Get doctor's office timezone from database"""
    # Use default timezone since office_timezone was moved to Office table
    # In a full implementation, this would query the offices table
    return 'America/Mexico_City'  # Default fallback

def now_in_timezone(timezone_str: str = 'America/Mexico_City') -> datetime:
    """Get current datetime in specified timezone"""
    tz = pytz.timezone(timezone_str)
    return datetime.now(tz)

def to_utc_for_storage(dt: datetime, doctor_timezone: str = 'America/Mexico_City') -> datetime:
    """Convert datetime to UTC for database storage"""
    if dt.tzinfo is None:
        # Assume doctor timezone if naive
        tz = pytz.timezone(doctor_timezone)
        dt = tz.localize(dt)
    return dt.astimezone(pytz.utc)

def from_utc_to_timezone(dt: datetime, doctor_timezone: str = 'America/Mexico_City') -> datetime:
    """Convert UTC datetime to doctor's timezone"""
    if dt.tzinfo is None:
        # Assume UTC if naive
        dt = pytz.utc.localize(dt)
    tz = pytz.timezone(doctor_timezone)
    return dt.astimezone(tz)


class AppointmentService:
    """Service for managing medical appointments"""
    
    @staticmethod
    def create_appointment(db: Session, appointment_data: dict) -> Appointment:
        """Create a new appointment"""
        # Remove ID from appointment_data - let PostgreSQL auto-generate it
        if 'id' in appointment_data:
            del appointment_data['id']

        # Remove reason if provided (kept for backward compatibility)
        appointment_data.pop('reason', None)
        
        # Get doctor's timezone and appointment duration
        doctor_id = appointment_data.get('doctor_id')
        doctor_timezone = 'America/Mexico_City'  # Default fallback
        duration_minutes = 30  # Default fallback
        
        if doctor_id:
            doctor = db.query(Person).filter(Person.id == doctor_id).first()
            if doctor:
                # Use default timezone since office_timezone was moved to Office table
                doctor_timezone = 'America/Mexico_City'  # Default timezone
                duration_minutes = doctor.appointment_duration if doctor.appointment_duration else 30
                
                # If appointment has office_id, get timezone from office
                office_id = appointment_data.get('office_id')
                if office_id:
                    from database import Office
                    office = db.query(Office).filter(Office.id == office_id).first()
                    if office:
                        doctor_timezone = office.timezone
        
        # Calculate end_time based on appointment_date and doctor's appointment_duration
        start_time = appointment_data['appointment_date']
        
        api_logger.debug(
            "🔍 Appointment creation payload received",
            extra={
                "doctor_id": doctor_id,
                "appointment_date_raw": start_time,
                "appointment_date_type": str(type(start_time)),
                "doctor_timezone": doctor_timezone
            }
        )
        
        if isinstance(start_time, str):
            # Parse the datetime string - frontend now sends ISO strings with timezone
            if start_time.endswith('Z'):
                # If it ends with Z, treat it as UTC
                start_time = datetime.fromisoformat(start_time.replace('Z', '+00:00'))
                api_logger.debug(
                    "📅 Parsed appointment_date as UTC",
                    extra={"doctor_id": doctor_id, "parsed_value": start_time.isoformat()}
                )
            elif '+' in start_time or start_time.count('-') > 2:
                # If it has timezone info, parse it directly
                start_time = datetime.fromisoformat(start_time)
                api_logger.debug(
                    "📅 Parsed appointment_date with timezone info",
                    extra={"doctor_id": doctor_id, "parsed_value": start_time.isoformat()}
                )
            else:
                # Fallback: parse as naive datetime and localize to doctor's timezone
                start_time = datetime.fromisoformat(start_time)
                tz = pytz.timezone(doctor_timezone)
                start_time = tz.localize(start_time)
                api_logger.debug(
                    "📅 Localized naive appointment_date to doctor timezone",
                    extra={"doctor_id": doctor_id, "localized_value": start_time.isoformat(), "timezone": doctor_timezone}
                )

        # Convert to UTC for storage
        start_time_utc = start_time.astimezone(pytz.utc)
        api_logger.debug(
            "📅 Converted appointment_date to UTC for storage",
            extra={"doctor_id": doctor_id, "utc_value": start_time_utc.isoformat()}
        )
        
        # Since the database uses 'timestamp without time zone', we need to store
        # the datetime in the doctor's timezone, not UTC
        # Convert back to doctor's timezone for storage
        tz = pytz.timezone(doctor_timezone)
        start_time_for_storage = start_time_utc.astimezone(tz).replace(tzinfo=None)
        api_logger.debug(
            "📅 Final datetime for storage (naive doctor timezone)",
            extra={"doctor_id": doctor_id, "local_value": start_time_for_storage.isoformat()}
        )
        
        appointment_data['appointment_date'] = start_time_for_storage

        end_time = start_time_utc + timedelta(minutes=duration_minutes)
        end_time_for_storage = end_time.astimezone(tz).replace(tzinfo=None)
        appointment_data['end_time'] = end_time_for_storage
        api_logger.debug(
            "📅 Calculated end_time for storage",
            extra={"doctor_id": doctor_id, "end_time": end_time_for_storage.isoformat()}
        )
        
        # Set created_at in UTC
        appointment_data['created_at'] = now_in_timezone(doctor_timezone).astimezone(pytz.utc)
        
        # Ensure status defaults to 'por_confirmar' and handle confirmation timestamp
        status_value = appointment_data.get('status') or 'por_confirmar'
        appointment_data['status'] = status_value
        # Note: Appointment model doesn't have confirmed_at field
        # Status change to 'confirmada' is handled by the status field itself
        
        # Remove any invalid fields that don't exist in the Appointment model
        # Note: patient and doctor names are available through relationships, not stored fields
        # Remove 'reminders' field - it's a relationship, not a direct field, and will be created separately
        appointment_data.pop('reminders', None)
        
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
            joinedload(Appointment.doctor),
            joinedload(Appointment.reminders)
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
    def update_appointment(db: Session, appointment_id: str, appointment_data: dict) -> Optional[Appointment]:
        """Update an existing appointment"""
        appointment = db.query(Appointment).filter(Appointment.id == appointment_id).first()
        if not appointment:
            return None
        
        appointment_data.pop('reason', None)
        
        # Handle datetime conversion for appointment_date
        if 'appointment_date' in appointment_data and isinstance(appointment_data['appointment_date'], str):
            appointment_data['appointment_date'] = datetime.fromisoformat(
                appointment_data['appointment_date'].replace('Z', '+00:00')
            )
            # Convert to UTC for storage
            appointment_data['appointment_date'] = to_utc_for_storage(appointment_data['appointment_date'])
        
        # Recalculate end_time if appointment_date changed (duration comes from doctor's profile)
        if 'appointment_date' in appointment_data:
            start_time = appointment_data['appointment_date']
            # Get doctor's appointment_duration from persons table
            doctor = db.query(Person).filter(Person.id == appointment.doctor_id).first()
            if doctor and doctor.appointment_duration:
                duration = doctor.appointment_duration
            else:
                duration = 30  # Default fallback
            appointment_data['end_time'] = start_time + timedelta(minutes=duration)
        
        # Handle cancellation
        if appointment_data.get('status') == 'cancelled' and 'cancelled_reason' in appointment_data:
            appointment_data['cancelled_at'] = now_cdmx().astimezone(pytz.utc)
        
        # Update fields
        for key, value in appointment_data.items():
            if hasattr(appointment, key):
                setattr(appointment, key, value)
        
        appointment.updated_at = now_cdmx().astimezone(pytz.utc)
        db.commit()
        db.refresh(appointment)
        return appointment
    
    @staticmethod
    def delete_appointment(db: Session, appointment_id: str) -> bool:
        """Delete (cancel) an appointment"""
        appointment = db.query(Appointment).filter(Appointment.id == appointment_id).first()
        if not appointment:
            return False
        
        # Soft delete by setting status to cancelled
        appointment.status = "cancelled"
        appointment.cancelled_at = datetime.utcnow()
        appointment.updated_at = datetime.utcnow()
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
    # Auto reminder helpers (NEW: Multiple reminders system)
    # ==============================
    @staticmethod
    def get_reminder_send_time(appointment_dt: datetime, offset_minutes: int) -> datetime:
        """Compute when the auto reminder should be sent (appointment time minus offset)."""
        if offset_minutes is None:
            offset_minutes = 360
        return appointment_dt - timedelta(minutes=offset_minutes)

    @staticmethod
    def should_send_reminder(appointment) -> bool:
        """Return True if reminder should be sent now based on flags and timestamps.
        
        DEPRECATED: This method works with the old single-reminder system.
        Use should_send_reminder_by_id() for the new multiple reminders system.
        """
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
    def should_send_reminder_by_id(reminder: AppointmentReminder, appointment: Appointment) -> bool:
        """Return True if a specific reminder should be sent now.
        
        Args:
            reminder: AppointmentReminder object to check
            appointment: Associated Appointment object
            
        Returns:
            True if reminder should be sent now, False otherwise
        """
        try:
            # Check if reminder is enabled
            if not reminder.enabled:
                return False
            
            # Check if reminder was already sent
            if reminder.sent:
                return False
            
            # Check if appointment is in correct status
            if appointment.status != 'por_confirmar':
                return False
            
            # Calculate when reminder should be sent
            send_time = AppointmentService.get_reminder_send_time(
                appointment.appointment_date,
                reminder.offset_minutes
            )
            
            # Check if current time is within the send window (5 minute tolerance before, 2 minutes after)
            now = now_cdmx().replace(tzinfo=None)
            window_start = send_time - timedelta(minutes=5)  # Allow 5 minutes early
            window_end = send_time + timedelta(minutes=2)  # Allow 2 minutes late
            should_send = window_start <= now <= window_end
            
            # Log for debugging
            if not should_send:
                api_logger.debug(
                    "⏰ Reminder not ready to send",
                    extra={
                        "reminder_id": reminder.id,
                        "appointment_id": appointment.id,
                        "send_time": send_time.isoformat(),
                        "now": now.isoformat(),
                        "window_start": window_start.isoformat(),
                        "window_end": window_end.isoformat(),
                        "offset_minutes": reminder.offset_minutes
                    }
                )
            
            return should_send
        except Exception as e:
            api_logger.error(
                "❌ Error checking if reminder should be sent",
                extra={"reminder_id": reminder.id, "appointment_id": appointment.id},
                exc_info=True
            )
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
    def send_reminder_by_id(db: Session, reminder_id: int) -> bool:
        """Send a specific reminder by its ID. Returns True on success.
        
        Uses atomic update to prevent duplicate reminders.
        
        Args:
            db: Database session
            reminder_id: ID of the AppointmentReminder to send
            
        Returns:
            True if reminder was sent successfully, False otherwise
        """
        from whatsapp_service import get_whatsapp_service
        
        # Fetch reminder with appointment and related data
        reminder = db.query(AppointmentReminder).options(
            joinedload(AppointmentReminder.appointment).joinedload(Appointment.patient),
            joinedload(AppointmentReminder.appointment).joinedload(Appointment.doctor),
            joinedload(AppointmentReminder.appointment).joinedload(Appointment.office),
            joinedload(AppointmentReminder.appointment).joinedload(Appointment.appointment_type_rel)
        ).filter(AppointmentReminder.id == reminder_id).first()
        
        if not reminder:
            api_logger.warning(
                "⚠️ Reminder not found",
                extra={"reminder_id": reminder_id}
            )
            return False
        
        appointment = reminder.appointment
        if not appointment:
            api_logger.warning(
                "⚠️ Appointment not found for reminder",
                extra={"reminder_id": reminder_id}
            )
            return False
        
        # Atomic update: mark reminder as sent BEFORE sending to prevent duplicates
        try:
            result = db.execute(
                update(AppointmentReminder)
                .where(AppointmentReminder.id == reminder_id)
                .where(AppointmentReminder.sent == False)
                .values(
                    sent=True,
                    sent_at=datetime.utcnow()
                )
            )
            db.commit()
            
            if result.rowcount == 0:
                api_logger.info(
                    "⚠️ Reminder already sent, skipping duplicate",
                    extra={"reminder_id": reminder_id}
                )
                return False
                
            api_logger.info(
                "✅ Marked reminder as sent (atomic update)",
                extra={"reminder_id": reminder_id, "appointment_id": appointment.id}
            )
        except Exception as e:
            db.rollback()
            api_logger.error(
                "❌ Error marking reminder as sent (atomic update)",
                extra={"reminder_id": reminder_id},
                exc_info=True
            )
            return False
        
        # Check appointment status - allow reminders for both 'por_confirmar' and 'confirmada'
        # Only skip if appointment is cancelled
        if appointment.status == 'cancelled':
            api_logger.info(
                "⚠️ Appointment is cancelled, skipping reminder",
                extra={"reminder_id": reminder_id, "appointment_id": appointment.id, "status": appointment.status}
            )
            # Rollback the sent flag
            db.execute(
                update(AppointmentReminder)
                .where(AppointmentReminder.id == reminder_id)
                .values(
                    sent=False,
                    sent_at=None
                )
            )
            db.commit()
            return False
        
        # Build parameters for WhatsApp message
        mexico_tz = pytz.timezone('America/Mexico_City')
        local_dt = mexico_tz.localize(appointment.appointment_date)
        appointment_date = local_dt.strftime('%d de %B de %Y')
        appointment_time = local_dt.strftime('%I:%M %p')
        appointment_type = "presencial"
        if appointment.appointment_type_rel:
            appointment_type = "online" if appointment.appointment_type_rel.name == "En línea" else "presencial"
        
        service = get_whatsapp_service()
        try:
            office_address_val = build_office_address(appointment.office) if getattr(appointment, 'office', None) else "mi consultorio en linea - No especificado"
            maps_url_val = resolve_maps_url(appointment.office, office_address_val) if getattr(appointment, 'office', None) else None
            country_code_val = resolve_country_code(appointment.office) if getattr(appointment, 'office', None) else '52'
            if getattr(appointment, 'office', None) and getattr(appointment.office, 'is_virtual', False) and getattr(appointment.office, 'virtual_url', None):
                appointment_type = "online"
            
            resp = service.send_appointment_reminder(
                patient_phone=appointment.patient.primary_phone if appointment.patient else None,
                patient_full_name=appointment.patient.full_name if appointment.patient else "Paciente",
                appointment_date=appointment_date,
                appointment_time=appointment_time,
                doctor_title=(appointment.doctor.title if appointment.doctor else "Dr."),
                doctor_full_name=(appointment.doctor.full_name if appointment.doctor else "Médico"),
                office_address=office_address_val,
                country_code=country_code_val,
                appointment_type=appointment_type,
                maps_url=maps_url_val,
                appointment_status=appointment.status,
                appointment_id=appointment.id
            )
            
            # Log the response for debugging
            api_logger.info(
                "📱 WhatsApp send_appointment_reminder response",
                extra={
                    "reminder_id": reminder_id,
                    "appointment_id": appointment.id,
                    "success": resp.get('success') if resp else False,
                    "error": resp.get('error') if resp else None,
                    "message_id": resp.get('message_id') if resp else None
                }
            )
            
            if resp and resp.get('success'):
                api_logger.info(
                    "✅ Reminder sent successfully",
                    extra={"reminder_id": reminder_id, "appointment_id": appointment.id, "reminder_number": reminder.reminder_number}
                )
                return True
            else:
                # Rollback the sent flag if sending failed
                api_logger.warning(
                    "⚠️ Reminder sending failed, rolling back flag",
                    extra={"reminder_id": reminder_id, "response": resp}
                )
                db.execute(
                    update(AppointmentReminder)
                    .where(AppointmentReminder.id == reminder_id)
                    .values(
                        sent=False,
                        sent_at=None
                    )
                )
                db.commit()
                return False
        except Exception as e:
            api_logger.error(
                "❌ Exception sending reminder",
                extra={"reminder_id": reminder_id},
                exc_info=True
            )
            # Rollback the sent flag
            try:
                db.execute(
                    update(AppointmentReminder)
                    .where(AppointmentReminder.id == reminder_id)
                    .values(
                        sent=False,
                        sent_at=None
                    )
                )
                db.commit()
            except:
                db.rollback()
            return False

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
        
        # Check appointment status - allow reminders for both 'por_confirmar' and 'confirmada'
        # Only skip if appointment is cancelled
        if apt.status == 'cancelled':
            api_logger.info(
                "⚠️ Appointment is cancelled, skipping reminder",
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
                maps_url=maps_url_val,
                appointment_status=apt.status,
                appointment_id=apt.id
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







