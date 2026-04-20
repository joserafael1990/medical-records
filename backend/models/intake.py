"""
Pre-consultation intake questionnaire model.

One row per (appointment, patient) — a doctor sends a link via
WhatsApp before the consultation, the patient fills it in, and the
answers are attached to the upcoming appointment so the doctor has
context before the visit.

v1 keeps the questionnaire hardcoded (8 questions, see
`agents/intake/questions.py`). Answers are stored as JSONB so we
don't need a separate `answers` table yet — adding structured answers
is a v2 migration once the question set stabilises.
"""

from sqlalchemy import (
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship

from .base import Base, utc_now


class IntakeQuestionnaireResponse(Base):
    """Pre-consultation questionnaire sent to patient, stored when submitted."""

    __tablename__ = "intake_questionnaire_responses"

    id = Column(Integer, primary_key=True)
    appointment_id = Column(
        Integer,
        ForeignKey("appointments.id", ondelete="CASCADE"),
        nullable=False,
    )
    patient_id = Column(Integer, ForeignKey("persons.id"), nullable=False)
    # Tokenised, bearer-less URL handed to the patient via WhatsApp.
    token = Column(String(64), nullable=False, unique=True, index=True)
    sent_at = Column(DateTime, default=utc_now, nullable=False)
    submitted_at = Column(DateTime, nullable=True)
    # JSONB map: {"q1": "...", "q2": "3-7 days", ...}
    answers = Column(JSONB, nullable=True)

    # Whatsapp message id returned by the provider on send (best-effort).
    whatsapp_message_id = Column(String(255), nullable=True)

    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)

    appointment = relationship("Appointment")
    patient = relationship("Person", foreign_keys=[patient_id])

    __table_args__ = (
        # One active intake per appointment. If the doctor re-sends we
        # update the existing row rather than create a second one.
        UniqueConstraint("appointment_id", name="uq_intake_response_per_appointment"),
    )
