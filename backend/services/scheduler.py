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
        
        # #region agent log
        import json
        try:
            with open('/Users/rafaelgarcia/Documents/Software projects/medical-records-main/.cursor/debug.log', 'a') as f:
                f.write(json.dumps({"sessionId": "debug-session", "runId": "run1", "hypothesisId": "A", "location": "scheduler.py:32", "message": "Current time in CDMX", "data": {"now": str(now)}, "timestamp": int(datetime.now().timestamp() * 1000)}) + "\n")
        except: pass
        # #endregion
        
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
        
        # #region agent log
        try:
            with open('/Users/rafaelgarcia/Documents/Software projects/medical-records-main/.cursor/debug.log', 'a') as f:
                f.write(json.dumps({"sessionId": "debug-session", "runId": "run1", "hypothesisId": "A", "location": "scheduler.py:46", "message": "Reminders found from query", "data": {"reminders_count": len(reminders), "reminder_ids": [r.id for r in reminders]}, "timestamp": int(datetime.now().timestamp() * 1000)}) + "\n")
        except: pass
        # #endregion
        
        sent_count = 0
        failed_count = 0
        
        for reminder in reminders:
            appointment = reminder.appointment
            if not appointment:
                # #region agent log
                try:
                    with open('/Users/rafaelgarcia/Documents/Software projects/medical-records-main/.cursor/debug.log', 'a') as f:
                        f.write(json.dumps({"sessionId": "debug-session", "runId": "run1", "hypothesisId": "A", "location": "scheduler.py:52", "message": "Reminder has no appointment", "data": {"reminder_id": reminder.id}, "timestamp": int(datetime.now().timestamp() * 1000)}) + "\n")
                except: pass
                # #endregion
                continue
            
            # Calculate when this reminder should be sent
            # NOTE: appointment_date is stored as CDMX local time (naive datetime)
            # We compare using CDMX local time throughout
            
            # 1. Get current time in CDMX (naive for comparison)
            now_cdmx_naive = now_cdmx().replace(tzinfo=None)
            
            # 2. appointment_date is already in CDMX local time
            appt_date = appointment.appointment_date
            if appt_date.tzinfo:
                # If it has timezone info, convert to CDMX
                import pytz
                cdmx_tz = pytz.timezone('America/Mexico_City')
                appt_date = appt_date.astimezone(cdmx_tz).replace(tzinfo=None)
            
            # 3. Calculate send time in CDMX local time
            send_time = appt_date - timedelta(minutes=reminder.offset_minutes)
            
            # 4. Check if we're in the send window (Send time passed, but not more than 6 hours ago)
            # This "Latch" logic ensures we don't miss it if the cron is slightly delayed
            window_end = send_time + timedelta(hours=6)
            
            should_send = send_time <= now_cdmx_naive <= window_end
            
            # #region agent log
            try:
                with open('/Users/rafaelgarcia/Documents/Software projects/medical-records-main/.cursor/debug.log', 'a') as f:
                    f.write(json.dumps({"sessionId": "debug-session", "runId": "run1", "hypothesisId": "B", "location": "scheduler.py:77", "message": "Timing check for reminder", "data": {"reminder_id": reminder.id, "appointment_id": appointment.id, "appt_date": str(appt_date), "offset_minutes": reminder.offset_minutes, "send_time": str(send_time), "now_cdmx_naive": str(now_cdmx_naive), "window_end": str(window_end), "should_send": should_send, "send_time_passed": send_time <= now_cdmx_naive, "within_window": now_cdmx_naive <= window_end}, "timestamp": int(datetime.now().timestamp() * 1000)}) + "\n")
            except: pass
            # #endregion
            
            if should_send:
                # #region agent log
                try:
                    with open('/Users/rafaelgarcia/Documents/Software projects/medical-records-main/.cursor/debug.log', 'a') as f:
                        f.write(json.dumps({"sessionId": "debug-session", "runId": "run1", "hypothesisId": "C", "location": "scheduler.py:80", "message": "Calling send_reminder_by_id", "data": {"reminder_id": reminder.id, "appointment_id": appointment.id}, "timestamp": int(datetime.now().timestamp() * 1000)}) + "\n")
                except: pass
                # #endregion
                api_logger.info(
                    "📤 Sending reminder",
                    extra={
                        "reminder_id": reminder.id,
                        "appointment_id": appointment.id
                    }
                )
                success = AppointmentService.send_reminder_by_id(db, reminder.id)
                # #region agent log
                try:
                    with open('/Users/rafaelgarcia/Documents/Software projects/medical-records-main/.cursor/debug.log', 'a') as f:
                        f.write(json.dumps({"sessionId": "debug-session", "runId": "run1", "hypothesisId": "C", "location": "scheduler.py:88", "message": "send_reminder_by_id returned", "data": {"reminder_id": reminder.id, "success": success}, "timestamp": int(datetime.now().timestamp() * 1000)}) + "\n")
                except: pass
                # #endregion
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


