"""
IntakeService — core logic for pre-consultation questionnaires.

Responsibilities:
- create / rotate a tokenised response row for an appointment
- send the intake link via WhatsApp (reusing the provider abstraction)
- look up a response by token for the public endpoint, enforcing
  expiry rules (submitted / appointment completed / cancelled)
- accept an answers submission
"""

from __future__ import annotations

import os
import secrets
from datetime import datetime
from typing import Any, Dict, Optional, Tuple

from sqlalchemy.orm import Session

from database import Appointment, IntakeQuestionnaireResponse, Person
from logger import get_logger

api_logger = get_logger("medical_records.intake")


# The public URL where the patient will open the questionnaire.
# Falls back to localhost for dev; prod sets INTAKE_PUBLIC_BASE_URL.
def _public_base_url() -> str:
    return (
        os.getenv("INTAKE_PUBLIC_BASE_URL")
        or os.getenv("FRONTEND_BASE_URL")
        or "http://localhost:3000"
    )


# Appointment statuses that make an intake token invalid.
TERMINAL_STATUSES = {"completed", "cancelled", "canceled"}


class IntakeService:
    """Stateless service; DB + WhatsApp providers are injected at call sites."""

    def __init__(self, db: Session, whatsapp_service=None):
        self.db = db
        # Lazily resolved so tests can stub it.
        self._whatsapp_service = whatsapp_service

    # ------------------------------------------------------------------
    # Send
    # ------------------------------------------------------------------

    def send_intake(
        self,
        appointment_id: int,
        doctor: Person,
    ) -> Dict[str, Any]:
        """Create (or rotate) an intake row for the appointment and send the link.

        Returns a status dict: {sent: bool, response_id, token, error?}.
        """
        appointment = self._appointment_for_doctor(appointment_id, doctor)
        if appointment is None:
            return {"sent": False, "error": "appointment_not_found_or_unauthorized"}
        if appointment.status in TERMINAL_STATUSES:
            return {"sent": False, "error": "appointment_already_closed"}

        patient = self._patient(appointment.patient_id)
        if patient is None:
            return {"sent": False, "error": "patient_not_found"}
        phone = (patient.primary_phone or "").strip()
        if not phone:
            return {"sent": False, "error": "patient_missing_phone"}

        # Rotate or create the row. We keep the token stable on resend so
        # that a patient who receives two messages can still use either.
        response = (
            self.db.query(IntakeQuestionnaireResponse)
            .filter(IntakeQuestionnaireResponse.appointment_id == appointment_id)
            .first()
        )
        if response is None:
            response = IntakeQuestionnaireResponse(
                appointment_id=appointment_id,
                patient_id=patient.id,
                token=self._mint_token(),
            )
            self.db.add(response)
            self.db.flush()
        elif response.submitted_at is not None:
            return {
                "sent": False,
                "error": "already_submitted",
                "response_id": response.id,
            }
        else:
            response.sent_at = datetime.utcnow()

        link = f"{_public_base_url().rstrip('/')}/public/intake/{response.token}"
        body = self._compose_message(doctor, patient, link)

        wa = self._get_whatsapp()
        result = wa.send_text_message(to_phone=phone, message=body)
        if not result.get("success"):
            # Still keep the row — the doctor can retry with the same token.
            return {
                "sent": False,
                "error": "whatsapp_send_failed",
                "provider_error": result.get("error"),
                "response_id": response.id,
                "token": response.token,
            }
        response.whatsapp_message_id = result.get("message_id")
        self.db.commit()
        return {
            "sent": True,
            "response_id": response.id,
            "token": response.token,
            "message_id": result.get("message_id"),
        }

    # ------------------------------------------------------------------
    # Public load / submit
    # ------------------------------------------------------------------

    def load_for_patient(self, token: str) -> Tuple[Optional[Dict[str, Any]], Optional[str]]:
        """Load an intake by token for the patient-facing form.

        Returns (payload, error_code). `error_code` is one of:
        - "not_found"
        - "already_submitted"
        - "appointment_closed"
        """
        response = (
            self.db.query(IntakeQuestionnaireResponse)
            .filter(IntakeQuestionnaireResponse.token == token)
            .first()
        )
        if response is None:
            return None, "not_found"
        if response.submitted_at is not None:
            return None, "already_submitted"
        appointment = self._appointment_or_none(response.appointment_id)
        if appointment is None or appointment.status in TERMINAL_STATUSES:
            return None, "appointment_closed"

        patient = self._patient(response.patient_id)
        return (
            {
                "patient_first_name": (patient.name.split()[0] if patient and patient.name else ""),
                "appointment_date": (
                    appointment.appointment_date.isoformat()
                    if appointment.appointment_date
                    else None
                ),
            },
            None,
        )

    def submit(
        self,
        token: str,
        answers: Dict[str, Any],
    ) -> Tuple[bool, Optional[str]]:
        """Store submitted answers and mark the row as submitted.

        Returns (ok, error_code). error_code follows the same vocabulary
        as `load_for_patient`.
        """
        response = (
            self.db.query(IntakeQuestionnaireResponse)
            .filter(IntakeQuestionnaireResponse.token == token)
            .first()
        )
        if response is None:
            return False, "not_found"
        if response.submitted_at is not None:
            return False, "already_submitted"
        appointment = self._appointment_or_none(response.appointment_id)
        if appointment is None or appointment.status in TERMINAL_STATUSES:
            return False, "appointment_closed"

        response.answers = answers
        response.submitted_at = datetime.utcnow()
        self.db.commit()
        return True, None

    # ------------------------------------------------------------------
    # Doctor-side read
    # ------------------------------------------------------------------

    def get_for_appointment(
        self,
        appointment_id: int,
        doctor: Person,
    ) -> Optional[IntakeQuestionnaireResponse]:
        appointment = self._appointment_for_doctor(appointment_id, doctor)
        if appointment is None:
            return None
        return (
            self.db.query(IntakeQuestionnaireResponse)
            .filter(IntakeQuestionnaireResponse.appointment_id == appointment_id)
            .first()
        )

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _mint_token() -> str:
        return secrets.token_urlsafe(32)

    def _appointment_or_none(self, appointment_id: int) -> Optional[Appointment]:
        return (
            self.db.query(Appointment)
            .filter(Appointment.id == appointment_id)
            .first()
        )

    def _appointment_for_doctor(
        self,
        appointment_id: int,
        doctor: Person,
    ) -> Optional[Appointment]:
        appointment = self._appointment_or_none(appointment_id)
        if appointment is None:
            return None
        if doctor.person_type == "admin":
            return appointment
        if appointment.doctor_id != doctor.id:
            return None
        return appointment

    def _patient(self, patient_id: int) -> Optional[Person]:
        return (
            self.db.query(Person)
            .filter(Person.id == patient_id, Person.person_type == "patient")
            .first()
        )

    def _get_whatsapp(self):
        if self._whatsapp_service is None:
            from services.whatsapp.factory import get_whatsapp_service
            self._whatsapp_service = get_whatsapp_service()
        return self._whatsapp_service

    @staticmethod
    def _compose_message(doctor: Person, patient: Person, link: str) -> str:
        first_name = patient.name.split()[0] if patient.name else ""
        doctor_title = getattr(doctor, "title", None) or "Dr(a)."
        doctor_last = doctor.name.split()[0] if doctor.name else "tu doctor"
        return (
            f"Hola {first_name}, antes de tu consulta con {doctor_title} "
            f"{doctor_last}, por favor responde este cuestionario breve "
            f"(3-5 min). Tus respuestas ayudan a que la consulta sea más "
            f"efectiva.\n\n{link}\n\nEs confidencial y solo lo verá tu "
            f"doctor."
        )
