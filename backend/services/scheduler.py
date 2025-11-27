"""
Background scheduler for automatic WhatsApp appointment reminders.
"""
import asyncio
from typing import Optional
from sqlalchemy.orm import joinedload
from sqlalchemy import func
from datetime import datetime

from database import SessionLocal, Appointment, AppointmentReminder
from appointment_service import AppointmentService, now_cdmx
from logger import get_logger


api_logger = get_logger("medical_records.api")


class AutoReminderScheduler:
    def __init__(self) -> None:
        self._task: Optional[asyncio.Task] = None

    async def _run_loop(self) -> None:
        await asyncio.sleep(5)
        while True:
            try:
                db = SessionLocal()
                
                # NEW: Query individual reminders instead of appointments
                # Get all enabled reminders that haven't been sent yet
                # Exclude cancelled appointments - no reminders should be sent for cancelled appointments
                # Exclude appointments that have already passed - no point in sending reminders for past appointments
                now = now_cdmx().replace(tzinfo=None)  # Get current time in CDMX (naive datetime for comparison)
                reminders = db.query(AppointmentReminder).join(Appointment).filter(
                    AppointmentReminder.enabled == True,
                    AppointmentReminder.sent == False,
                    Appointment.status.in_(['por_confirmar', 'confirmada']),  # Only allow reminders for pending and confirmed, exclude cancelled
                    Appointment.appointment_date > now  # Only include appointments that haven't passed yet
                ).options(
                    # Load appointment and related data needed for sending reminders
                    joinedload(AppointmentReminder.appointment).joinedload(Appointment.patient),
                    joinedload(AppointmentReminder.appointment).joinedload(Appointment.doctor),
                    joinedload(AppointmentReminder.appointment).joinedload(Appointment.office)
                ).all()
                
                # Check reminders (only log when actually sending)
                for reminder in reminders:
                    appointment = reminder.appointment
                    if not appointment:
                        api_logger.warning(
                            "⚠️ Reminder has no appointment",
                            extra={"reminder_id": reminder.id}
                        )
                        continue
                    
                    # Check reminder (only log when actually sending)
                    
                    if appointment and AppointmentService.should_send_reminder_by_id(reminder, appointment):
                        api_logger.info(
                            "📤 Sending reminder",
                            extra={
                                "reminder_id": reminder.id,
                                "appointment_id": appointment.id,
                                "reminder_number": reminder.reminder_number
                            }
                        )
                        success = AppointmentService.send_reminder_by_id(db, reminder.id)
                        if success:
                            api_logger.info(
                                "✅ Auto reminder sent",
                                extra={
                                    "reminder_id": reminder.id,
                                    "appointment_id": appointment.id,
                                    "reminder_number": reminder.reminder_number
                                }
                            )
                        else:
                            api_logger.warning(
                                "⚠️ Auto reminder failed",
                                extra={
                                    "reminder_id": reminder.id,
                                    "appointment_id": appointment.id
                                }
                            )
                
                # LEGACY: Also check old single-reminder system for backward compatibility
                # This can be removed after migration is complete
                # Exclude cancelled appointments - no reminders should be sent for cancelled appointments
                # Exclude appointments that have already passed - no point in sending reminders for past appointments
                legacy_candidates = db.query(Appointment).filter(
                    Appointment.auto_reminder_enabled == True,
                    Appointment.status.in_(['por_confirmar', 'confirmada']),  # Only allow reminders for pending and confirmed, exclude cancelled
                    Appointment.appointment_date > now  # Only include appointments that haven't passed yet
                ).all()
                for apt in legacy_candidates:
                    # Only process if no reminders exist (old system)
                    if not apt.reminders or len(apt.reminders) == 0:
                        if AppointmentService.should_send_reminder(apt):
                            success = AppointmentService.send_appointment_reminder(db, apt.id)
                            if success:
                                api_logger.info(
                                    "✅ Legacy auto reminder sent",
                                    extra={"appointment_id": apt.id}
                                )
                            else:
                                api_logger.warning(
                                    "⚠️ Legacy auto reminder failed",
                                    extra={"appointment_id": apt.id}
                                )
                
                db.close()
            except Exception as e:
                api_logger.error("⚠️ Auto reminder loop error", exc_info=True)
            await asyncio.sleep(60)

    def start(self) -> None:
        if self._task is None or self._task.done():
            self._task = asyncio.create_task(self._run_loop())

    def stop(self) -> None:
        if self._task and not self._task.done():
            self._task.cancel()
            self._task = None


_scheduler = AutoReminderScheduler()


def start_auto_reminder_scheduler(app=None) -> None:
    """Start the auto reminder loop and optionally store it in app.state."""
    _scheduler.start()
    if app is not None:
        setattr(app.state, "auto_reminder_scheduler", _scheduler)


def stop_auto_reminder_scheduler(app=None) -> None:
    """Stop the auto reminder loop if running."""
    _scheduler.stop()
    if app is not None and hasattr(app.state, "auto_reminder_scheduler"):
        setattr(app.state, "auto_reminder_scheduler", None)


