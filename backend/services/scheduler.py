"""
Scheduler service for automatic WhatsApp appointment reminders.
Designed to be triggered by Google Cloud Scheduler or similar cron jobs.
"""
from typing import Dict, Any
from sqlalchemy.orm import joinedload
from datetime import datetime, timedelta, timezone

from database import SessionLocal, Appointment, AppointmentReminder
from services.appointment_service import AppointmentService
from services.consultation_service import now_cdmx
from logger import get_logger


api_logger = get_logger("medical_records.api")


def check_and_send_reminders(db: SessionLocal = None) -> Dict[str, Any]:
    """
    Checks for pending appointment reminders and sends them.
    This function is stateless and should be called periodically (e.g., every 5-10 minutes).
    """
    local_db = False
    if db is None:
        db = SessionLocal()
        local_db = True

    try:
        api_logger.info("🔄 Reminder check started", extra={"scheduler": "CloudScheduler"})
        
        # Get current time in CDMX (naive datetime for comparison)
        now = now_cdmx().replace(tzinfo=None)
        
        # 1. NEW SYSTEM: Check AppointmentReminder table
        reminders = db.query(AppointmentReminder).join(Appointment).filter(
            AppointmentReminder.enabled == True,
            AppointmentReminder.sent == False,
            Appointment.status.in_(['por_confirmar', 'confirmada']),  # Only allow reminders for pending and confirmed
            Appointment.appointment_date > now  # Only include appointments that haven't passed yet
        ).options(
            # Load appointment and related data needed for sending reminders
            joinedload(AppointmentReminder.appointment).joinedload(Appointment.patient),
            joinedload(AppointmentReminder.appointment).joinedload(Appointment.doctor),
            joinedload(AppointmentReminder.appointment).joinedload(Appointment.office)
        ).all()
        
        sent_count = 0
        failed_count = 0
        
        for reminder in reminders:
            appointment = reminder.appointment
            if not appointment:
                continue
            
            # Calculate when this reminder should be sent
            # ASSUMPTION: appointment_date is stored in UTC in the database (or naive UTC)
            
            # 1. Get current time in UTC
            now_utc = datetime.now(timezone.utc).replace(tzinfo=None)
            
            # 2. Treat appointment_date as UTC (if naive)
            appt_date = appointment.appointment_date
            if appt_date.tzinfo:
                 appt_date = appt_date.astimezone(timezone.utc).replace(tzinfo=None)
            
            # 3. Calculate send time in UTC
            send_time = appt_date - timedelta(minutes=reminder.offset_minutes)
            
            # 4. Check if we're in the send window (Send time passed, but not more than 6 hours ago)
            # This "Latch" logic ensures we don't miss it if the cron is slightly delayed
            window_end = send_time + timedelta(hours=6)
            
            should_send = send_time <= now_utc <= window_end
            
            if should_send:
                api_logger.info(
                    "📤 Sending reminder",
                    extra={
                        "reminder_id": reminder.id,
                        "appointment_id": appointment.id
                    }
                )
                success = AppointmentService.send_reminder_by_id(db, reminder.id)
                if success:
                    sent_count += 1
                    api_logger.info("✅ Auto reminder sent", extra={"reminder_id": reminder.id})
                else:
                    failed_count += 1
                    api_logger.warning("⚠️ Auto reminder failed", extra={"reminder_id": reminder.id})

        # 2. LEGACY SYSTEM: Check Appointment table directly
        # This can be removed after full migration
        legacy_candidates = db.query(Appointment).filter(
            Appointment.auto_reminder_enabled == True,
            Appointment.status.in_(['por_confirmar', 'confirmada']),
            Appointment.appointment_date > now
        ).all()
        
        legacy_sent = 0
        
        for apt in legacy_candidates:
            # Only process if no reminders exist (old system)
            if not apt.reminders or len(apt.reminders) == 0:
                if AppointmentService.should_send_reminder(apt):
                    success = AppointmentService.send_appointment_reminder(db, apt.id)
                    if success:
                        legacy_sent += 1
                        api_logger.info("✅ Legacy auto reminder sent", extra={"appointment_id": apt.id})

        result = {
            "status": "success",
            "timestamp": now.isoformat(),
            "reminders_found": len(reminders),
            "reminders_sent": sent_count,
            "reminders_failed": failed_count,
            "legacy_sent": legacy_sent
        }
        
        api_logger.info("🏁 Reminder check finished", extra=result)
        return result

    except Exception as e:
        api_logger.error(
            "⚠️ Reminder check error",
            extra={"error": str(e), "error_type": type(e).__name__},
            exc_info=True
        )
        raise e
    finally:
        if local_db:
            db.close()


