"""
Background scheduler for automatic WhatsApp appointment reminders.
"""
import asyncio
from typing import Optional

from database import SessionLocal, Appointment
from appointment_service import AppointmentService


class AutoReminderScheduler:
    def __init__(self) -> None:
        self._task: Optional[asyncio.Task] = None

    async def _run_loop(self) -> None:
        await asyncio.sleep(5)
        while True:
            try:
                db = SessionLocal()
                candidates = db.query(Appointment).filter(
                    Appointment.auto_reminder_enabled == True,
                    # auto_reminder_sent_at field removed - always check if reminder should be sent
                    Appointment.status != 'cancelled'
                ).all()
                for apt in candidates:
                    if AppointmentService.should_send_reminder(apt):
                        success = AppointmentService.send_appointment_reminder(db, apt.id)
                        if success:
                            print(f"✅ Auto reminder sent for appointment {apt.id}")
                        else:
                            print(f"⚠️ Auto reminder failed for appointment {apt.id}")
                db.close()
            except Exception as e:
                print(f"⚠️ Auto reminder loop error: {e}")
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


