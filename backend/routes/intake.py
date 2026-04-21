"""
Pre-consultation intake questionnaire HTTP routes.

Split into two surfaces:

- Doctor-scoped (require JWT):
    POST   /api/intake/send/{appointment_id}         — send link
    GET    /api/intake/appointment/{appointment_id}  — read response

- Public (no auth, token-scoped — patient lands here from WhatsApp):
    GET    /api/intake/public/{token}                — load form shape
    POST   /api/intake/public/{token}                — submit answers

The public surface is intentionally thin: it never reveals patient
PII beyond the first name already known to the patient themselves,
never echoes the doctor id, and never allows listing.
"""

from __future__ import annotations

from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from audit_service import audit_service
from database import Person, get_db
from dependencies import get_current_user
from logger import get_logger
from services.intake.questions import (
    INTAKE_QUESTIONS,
    SECTION_LABELS,
    SECTION_ORDER,
    validate_answers,
    visible_questions,
)
from services.intake.service import IntakeService

api_logger = get_logger("medical_records.intake_route")

router = APIRouter(prefix="/api/intake", tags=["intake"])


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------


class SendIntakeResponse(BaseModel):
    sent: bool
    response_id: Optional[int] = None
    message_id: Optional[str] = None
    error: Optional[str] = None


class PublicIntakePayload(BaseModel):
    questions: list
    section_labels: Dict[str, str]
    section_order: list
    patient_first_name: str
    appointment_date: Optional[str] = None


class SubmitIntakeRequest(BaseModel):
    answers: Dict[str, Any] = Field(default_factory=dict)


class SubmitIntakeResponse(BaseModel):
    submitted: bool


class AppointmentIntakeResponse(BaseModel):
    has_response: bool
    submitted: bool = False
    submitted_at: Optional[str] = None
    answers: Optional[Dict[str, Any]] = None
    questions: list
    section_labels: Dict[str, str] = Field(default_factory=lambda: dict(SECTION_LABELS))
    section_order: list = Field(default_factory=lambda: list(SECTION_ORDER))
    token: Optional[str] = None  # Doctor can re-share the link from the UI.


class IntakePreferencesResponse(BaseModel):
    excluded_ids: list
    questions: list  # Full catalog so the UI can render the checkbox list.
    section_labels: Dict[str, str]
    section_order: list


class IntakePreferencesUpdate(BaseModel):
    excluded_ids: list = Field(default_factory=list)


# ---------------------------------------------------------------------------
# Doctor-scoped endpoints
# ---------------------------------------------------------------------------


@router.post("/send/{appointment_id}", response_model=SendIntakeResponse)
async def send_intake(
    appointment_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user),
) -> SendIntakeResponse:
    if current_user.person_type not in ("doctor", "admin"):
        raise HTTPException(
            status_code=403, detail="Solo personal médico puede enviar cuestionarios."
        )
    service = IntakeService(db=db)
    result = service.send_intake(appointment_id=appointment_id, doctor=current_user)
    if result["sent"] is False and result.get("error") in (
        "appointment_not_found_or_unauthorized",
    ):
        raise HTTPException(status_code=404, detail=result["error"])
    _audit_best_effort(
        db,
        current_user,
        request,
        action="SEND",
        table_name="intake_questionnaire_responses",
        operation_type="intake_send",
        metadata={"appointment_id": appointment_id, **{k: v for k, v in result.items() if k != "token"}},
    )
    return SendIntakeResponse(
        sent=result["sent"],
        response_id=result.get("response_id"),
        message_id=result.get("message_id"),
        error=result.get("error"),
    )


@router.get("/appointment/{appointment_id}", response_model=AppointmentIntakeResponse)
async def get_intake_for_appointment(
    appointment_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user),
) -> AppointmentIntakeResponse:
    if current_user.person_type not in ("doctor", "admin"):
        raise HTTPException(status_code=403, detail="No autorizado.")
    service = IntakeService(db=db)
    excluded = service.get_doctor_excluded_ids(current_user)
    questions = visible_questions(excluded)
    response = service.get_for_appointment(
        appointment_id=appointment_id, doctor=current_user
    )
    if response is None:
        return AppointmentIntakeResponse(has_response=False, questions=questions)
    _audit_best_effort(
        db,
        current_user,
        request,
        action="READ",
        table_name="intake_questionnaire_responses",
        operation_type="intake_read",
        metadata={"appointment_id": appointment_id, "submitted": response.submitted_at is not None},
    )
    return AppointmentIntakeResponse(
        has_response=True,
        submitted=response.submitted_at is not None,
        submitted_at=response.submitted_at.isoformat() if response.submitted_at else None,
        answers=response.answers or None,
        questions=questions,
        token=response.token,
    )


# ---------------------------------------------------------------------------
# Doctor preferences endpoints
# ---------------------------------------------------------------------------


@router.get("/preferences", response_model=IntakePreferencesResponse)
async def get_intake_preferences(
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user),
) -> IntakePreferencesResponse:
    if current_user.person_type not in ("doctor", "admin"):
        raise HTTPException(status_code=403, detail="No autorizado.")
    service = IntakeService(db=db)
    excluded = service.get_doctor_excluded_ids(current_user)
    return IntakePreferencesResponse(
        excluded_ids=excluded,
        questions=INTAKE_QUESTIONS,
        section_labels=dict(SECTION_LABELS),
        section_order=list(SECTION_ORDER),
    )


@router.put("/preferences", response_model=IntakePreferencesResponse)
async def update_intake_preferences(
    payload: IntakePreferencesUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user),
) -> IntakePreferencesResponse:
    if current_user.person_type not in ("doctor", "admin"):
        raise HTTPException(status_code=403, detail="No autorizado.")
    service = IntakeService(db=db)
    ok, error, normalized = service.set_doctor_excluded_ids(
        doctor=current_user, excluded_ids=payload.excluded_ids
    )
    if not ok:
        raise HTTPException(status_code=400, detail=error or "invalid_preferences")
    _audit_best_effort(
        db,
        current_user,
        request,
        action="UPDATE",
        table_name="persons",
        operation_type="intake_preferences_update",
        metadata={"excluded_count": len(normalized)},
    )
    return IntakePreferencesResponse(
        excluded_ids=normalized,
        questions=INTAKE_QUESTIONS,
        section_labels=dict(SECTION_LABELS),
        section_order=list(SECTION_ORDER),
    )


# ---------------------------------------------------------------------------
# Public endpoints (no auth, token-scoped)
# ---------------------------------------------------------------------------


@router.get("/public/{token}", response_model=PublicIntakePayload)
async def load_public_intake(
    token: str,
    db: Session = Depends(get_db),
) -> PublicIntakePayload:
    service = IntakeService(db=db)
    payload, error = service.load_for_patient(token=token)
    if error == "not_found":
        raise HTTPException(status_code=404, detail="Cuestionario no encontrado.")
    if error in ("already_submitted", "appointment_closed"):
        # Use 410 Gone — the resource existed but is no longer available.
        raise HTTPException(status_code=410, detail=error)
    assert payload is not None
    excluded = payload.get("excluded_ids") or []
    return PublicIntakePayload(
        questions=visible_questions(excluded),
        section_labels=dict(SECTION_LABELS),
        section_order=list(SECTION_ORDER),
        patient_first_name=payload["patient_first_name"],
        appointment_date=payload.get("appointment_date"),
    )


@router.post("/public/{token}", response_model=SubmitIntakeResponse)
async def submit_public_intake(
    token: str,
    payload: SubmitIntakeRequest,
    db: Session = Depends(get_db),
) -> SubmitIntakeResponse:
    service = IntakeService(db=db)
    excluded = service.excluded_ids_by_token(token)
    ok_val, errors = validate_answers(payload.answers, excluded_ids=excluded)
    if not ok_val:
        raise HTTPException(status_code=422, detail={"errors": errors})
    ok, error = service.submit(token=token, answers=payload.answers)
    if error == "not_found":
        raise HTTPException(status_code=404, detail="Cuestionario no encontrado.")
    if error in ("already_submitted", "appointment_closed"):
        raise HTTPException(status_code=410, detail=error)
    return SubmitIntakeResponse(submitted=ok)


# ---------------------------------------------------------------------------
# Audit helper
# ---------------------------------------------------------------------------


def _audit_best_effort(
    db: Session,
    user: Person,
    request: Request,
    **kwargs,
) -> None:
    try:
        audit_service.log_action(
            db=db,
            user=user,
            request=request,
            security_level=kwargs.pop("security_level", "INFO"),
            **kwargs,
        )
    except Exception as audit_err:
        api_logger.warning("Intake audit log failed: %s", audit_err)
