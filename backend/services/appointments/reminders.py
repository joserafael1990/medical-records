from sqlalchemy.orm import Session
from sqlalchemy import update
from datetime import datetime, timedelta
from utils.datetime_utils import now_cdmx, utc_now
from database import Appointment
from logger import get_logger

api_logger = get_logger("medical_records.api")

def get_reminder_send_time(appointment_dt: datetime, offset_minutes: int) -> datetime:
    """Compute when the auto reminder should be sent (appointment time minus offset)."""
    if offset_minutes is None:
        offset_minutes = 360
    return appointment_dt - timedelta(minutes=offset_minutes)

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
        send_time = get_reminder_send_time(
            appointment.appointment_date,
            getattr(appointment, 'auto_reminder_offset_minutes', 360)
        )
        # Estrictamente en la hora programada (tolerancia breve para el loop)
        now = now_cdmx().replace(tzinfo=None)
        window_end = send_time + timedelta(hours=6)
        return send_time <= now <= window_end
    except Exception:
        return False

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
        
        apt.reminder_sent = True
        apt.reminder_sent_at = utc_now()
        db.commit()
        
        api_logger.info(
            "✅ Marked reminder as sent",
            extra={
                "appointment_id": appointment_id,
                "reminder_sent_at": apt.reminder_sent_at.isoformat() if apt.reminder_sent_at else None
            }
        )
    except Exception:
        api_logger.error(
            "❌ Error marking reminder as sent",
            extra={"appointment_id": appointment_id},
            exc_info=True
        )
        db.rollback()
        raise

def atomic_mark_reminder_sent(db: Session, appointment_id: int) -> bool:
    """Atomically mark reminder as sent. Returns True if successful (i.e., wasn't already sent)."""
    try:
        result = db.execute(
            update(Appointment)
            .where(Appointment.id == appointment_id)
            .where(Appointment.reminder_sent == False)
            .values(
                reminder_sent=True,
                reminder_sent_at=utc_now()
            )
        )
        db.commit()
        
        if result.rowcount == 0:
            api_logger.info(
                "⚠️ Reminder already sent, skipping duplicate",
                extra={"appointment_id": appointment_id}
            )
            return False
            
        api_logger.info(
            "✅ Atomic reminder mark successful",
            extra={"appointment_id": appointment_id}
        )
        return True
        
    except Exception:
        api_logger.error(
            "❌ Error atomically marking reminder as sent",
            extra={"appointment_id": appointment_id},
            exc_info=True
        )
        db.rollback()
        return False

def rollback_reminder_sent(db: Session, appointment_id: int) -> None:
    """Rollback reminder_sent flag if sending failed."""
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
    except Exception:
        db.rollback()

def send_appointment_reminder(db: Session, appointment_id: int) -> bool:
    """Send WhatsApp reminder using existing WhatsAppService. Returns True on success.
    
    Uses atomic update to prevent duplicate reminders: marks reminder_sent BEFORE sending
    to avoid race conditions when scheduler runs multiple times.
    """
    from sqlalchemy.orm import joinedload
    import pytz
    from services.office_helpers import build_office_address, resolve_maps_url, resolve_country_code
    from whatsapp_service import get_whatsapp_service
    
    # Atomic update: mark reminder_sent BEFORE sending to prevent duplicates
    if not atomic_mark_reminder_sent(db, appointment_id):
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
        rollback_reminder_sent(db, appointment_id)
        return False
    
    # Build WhatsApp message parameters
    mexico_tz = pytz.timezone('America/Mexico_City')
    local_dt = mexico_tz.localize(apt.appointment_date)
    appointment_date = local_dt.strftime('%d de %B de %Y')
    appointment_time = local_dt.strftime('%I:%M %p')
    
    # Determine appointment type
    appointment_type = "presencial"
    if apt.appointment_type_rel:
        appointment_type = "online" if apt.appointment_type_rel.name == "En línea" else "presencial"
    
    if apt.office and apt.office.is_virtual and apt.office.virtual_url:
        appointment_type = "online"

    # Prepare office details
    office_address_val = build_office_address(apt.office) if apt.office else "mi consultorio en linea - No especificado"
    maps_url_val = resolve_maps_url(apt.office, office_address_val) if apt.office else None
    country_code_val = resolve_country_code(apt.office) if apt.office else '52'

    service = get_whatsapp_service()
    try:
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
            api_logger.warning(
                "⚠️ Reminder sending failed, rolling back flag",
                extra={"appointment_id": appointment_id, "response": resp}
            )
            rollback_reminder_sent(db, appointment_id)
            return False
    except Exception:
        api_logger.error(
            "❌ Exception sending appointment reminder",
            extra={"appointment_id": appointment_id},
            exc_info=True
        )
        rollback_reminder_sent(db, appointment_id)
        return False

