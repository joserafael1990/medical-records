from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, CheckConstraint, UniqueConstraint
from sqlalchemy.orm import relationship
from .base import Base, utc_now

class AppointmentType(Base):
    __tablename__ = "appointment_types"
    
    id = Column(Integer, primary_key=True)
    name = Column(String(50), nullable=False, unique=True)  # "Presencial", "En línea"
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=utc_now)

class Appointment(Base):
    __tablename__ = "appointments"
    
    id = Column(Integer, primary_key=True)
    patient_id = Column(Integer, ForeignKey("persons.id"), nullable=False)
    doctor_id = Column(Integer, ForeignKey("persons.id"), nullable=False)
    
    # SCHEDULING
    appointment_date = Column(DateTime, nullable=False)
    end_time = Column(DateTime, nullable=False)
    
    # DETAILS
    appointment_type_id = Column(Integer, ForeignKey("appointment_types.id"), nullable=False)
    office_id = Column(Integer, ForeignKey("offices.id"), nullable=True)
    consultation_type = Column(String(50), default='Seguimiento')  # 'Primera vez' or 'Seguimiento'
    status = Column(String(20), default='por_confirmar')
    
    # ADMINISTRATIVE
    reminder_sent = Column(Boolean, default=False)
    reminder_sent_at = Column(DateTime)

    # AUTO REMINDER (WhatsApp)
    auto_reminder_enabled = Column(Boolean, default=False)
    auto_reminder_offset_minutes = Column(Integer, default=360)  # 6 hours
    
    # CANCELLATION
    cancelled_reason = Column(Text)
    cancelled_at = Column(DateTime)
    cancelled_by = Column(Integer, ForeignKey("persons.id"))
    
    # SYSTEM
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)
    
    # RELATIONSHIPS
    patient = relationship("Person", foreign_keys=[patient_id], back_populates="appointments_as_patient")
    doctor = relationship("Person", foreign_keys=[doctor_id], back_populates="appointments_as_doctor")
    office = relationship("Office", back_populates="appointments")
    appointment_type_rel = relationship("AppointmentType")
    reminders = relationship("AppointmentReminder", back_populates="appointment", cascade="all, delete-orphan")
    google_calendar_mapping = relationship("GoogleCalendarEventMapping", back_populates="appointment", uselist=False, cascade="all, delete-orphan")

class AppointmentReminder(Base):
    """
    Stores up to 3 automatic reminders per appointment.
    """
    __tablename__ = "appointment_reminders"
    
    id = Column(Integer, primary_key=True)
    appointment_id = Column(Integer, ForeignKey("appointments.id", ondelete="CASCADE"), nullable=False)
    reminder_number = Column(Integer, nullable=False)  # 1, 2, or 3
    offset_minutes = Column(Integer, nullable=False)  # Time before appointment in minutes
    enabled = Column(Boolean, default=True, nullable=False)
    sent = Column(Boolean, default=False, nullable=False)
    sent_at = Column(DateTime, nullable=True)
    whatsapp_message_id = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)
    
    # RELATIONSHIPS
    appointment = relationship("Appointment", back_populates="reminders")
    
    # Constraints
    __table_args__ = (
        CheckConstraint('reminder_number >= 1 AND reminder_number <= 3', name='check_reminder_number_range'),
        CheckConstraint('offset_minutes > 0', name='check_offset_minutes_positive'),
        UniqueConstraint('appointment_id', 'reminder_number', name='unique_appointment_reminder_number'),
    )

class GoogleCalendarEventMapping(Base):
    """
    Mapea citas del sistema con eventos de Google Calendar
    """
    __tablename__ = "google_calendar_event_mappings"
    
    id = Column(Integer, primary_key=True)
    appointment_id = Column(Integer, ForeignKey("appointments.id", ondelete="CASCADE"), nullable=False, unique=True)
    google_event_id = Column(String(255), nullable=False, unique=True)  # ID del evento en Google Calendar
    doctor_id = Column(Integer, ForeignKey("persons.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)
    
    # Relationships
    appointment = relationship("Appointment", back_populates="google_calendar_mapping")
    doctor = relationship("Person")
