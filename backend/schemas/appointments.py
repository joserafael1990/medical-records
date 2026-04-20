"""Appointment and reminder schemas."""
from datetime import datetime
from decimal import Decimal
from typing import List, Optional

from .base import BaseSchema
from .persons import Person


class AppointmentReminderBase(BaseSchema):
    reminder_number: int  # 1, 2, or 3
    offset_minutes: int  # Time before appointment in minutes
    enabled: bool = True


class AppointmentReminderCreate(AppointmentReminderBase):
    pass


class AppointmentReminderUpdate(BaseSchema):
    reminder_number: Optional[int] = None
    offset_minutes: Optional[int] = None
    enabled: Optional[bool] = None


class AppointmentReminder(AppointmentReminderBase):
    id: int
    appointment_id: int
    sent: bool = False
    sent_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime


class AppointmentBase(BaseSchema):
    patient_id: int
    doctor_id: int
    appointment_date: str  # ISO string with timezone
    end_time: Optional[str] = None  # Calculated automatically by backend
    appointment_type_id: int
    office_id: Optional[int] = None
    consultation_type: str = 'Seguimiento'  # 'Primera vez' or 'Seguimiento'
    status: str = 'por_confirmar'
    reason: Optional[str] = None
    # Auto WhatsApp reminder (deprecated - use reminders array instead)
    auto_reminder_enabled: bool = False
    auto_reminder_offset_minutes: Optional[int] = 360  # 6 hours by default
    # New multiple reminders system
    reminders: Optional[List[AppointmentReminderCreate]] = None  # Up to 3 reminders


class AppointmentCreate(AppointmentBase):
    pass


class AppointmentUpdate(BaseSchema):
    patient_id: Optional[int] = None
    appointment_date: Optional[str] = None
    end_time: Optional[str] = None
    appointment_type_id: Optional[int] = None
    office_id: Optional[int] = None
    consultation_type: Optional[str] = None
    status: Optional[str] = None
    preparation_instructions: Optional[str] = None
    estimated_cost: Optional[Decimal] = None
    insurance_covered: Optional[bool] = None
    cancelled_reason: Optional[str] = None
    # Auto WhatsApp reminder (deprecated - use reminders array instead)
    auto_reminder_enabled: Optional[bool] = None
    auto_reminder_offset_minutes: Optional[int] = None
    # New multiple reminders system
    reminders: Optional[List[AppointmentReminderCreate]] = None  # Up to 3 reminders


class Appointment(AppointmentBase):
    id: int
    confirmation_required: bool = False
    reminder_sent: bool = False  # Deprecated - check reminders array instead
    reminder_sent_at: Optional[datetime] = None  # Deprecated
    cancelled_reason: Optional[str] = None
    cancelled_at: Optional[datetime] = None
    cancelled_by: Optional[int] = None
    created_at: datetime
    updated_at: datetime

    # Relationships
    patient: Optional[Person] = None
    doctor: Optional[Person] = None
    reminders: Optional[List[AppointmentReminder]] = None  # Up to 3 reminders

    @classmethod
    def model_validate(cls, obj, **kwargs):
        """Override to ensure appointment_date includes timezone when loading from DB"""
        import pytz
        from datetime import datetime as dt

        # If obj is a database model instance with appointment_date
        if hasattr(obj, 'appointment_date') and isinstance(obj.appointment_date, dt):
            cdmx_tz = pytz.timezone('America/Mexico_City')

            # If the datetime is naive, assume it's in CDMX time
            if obj.appointment_date.tzinfo is None:
                localized = cdmx_tz.localize(obj.appointment_date)
                # Store as ISO string with timezone
                obj.appointment_date = localized.isoformat()
            elif obj.appointment_date.tzinfo != cdmx_tz:
                # If it has different timezone, convert to CDMX
                localized = obj.appointment_date.astimezone(cdmx_tz)
                obj.appointment_date = localized.isoformat()

        return super().model_validate(obj, **kwargs)
