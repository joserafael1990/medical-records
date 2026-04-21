"""
Unit tests for `services.intake.service.IntakeService` and the
hardcoded questionnaire validator.

DB is mocked — we only verify the service's logic (token minting,
status checks, WhatsApp dispatch, exclusion behaviour). Alembic
migrations are validated by applying them in the Docker smoke test.
"""

from __future__ import annotations

from datetime import datetime
from types import SimpleNamespace
from unittest.mock import MagicMock

import pytest

from services.intake.questions import (
    INTAKE_QUESTIONS,
    SECTION_LABELS,
    SECTION_ORDER,
    all_question_ids,
    validate_answers,
    visible_questions,
)
from services.intake.service import IntakeService


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _doctor(id: int = 1, person_type: str = "doctor", excluded=None):
    return SimpleNamespace(
        id=id,
        person_type=person_type,
        name="Dr Test",
        title="Dr.",
        intake_excluded_questions=list(excluded) if excluded else [],
    )


def _patient(id: int = 10, phone: str = "5551234567", name: str = "Juan Pérez"):
    return SimpleNamespace(
        id=id,
        person_type="patient",
        name=name,
        primary_phone=phone,
    )


def _appointment(id: int = 100, patient_id: int = 10, doctor_id: int = 1, status: str = "confirmada"):
    return SimpleNamespace(
        id=id,
        patient_id=patient_id,
        doctor_id=doctor_id,
        status=status,
        appointment_date=datetime(2026, 4, 20, 10, 0),
    )


def _chain(*, first=None):
    q = MagicMock()
    q.filter.return_value = q
    q.first.return_value = first
    return q


def _mock_db(*results):
    db = MagicMock()
    db.query.side_effect = list(results)
    return db


def _ok_whatsapp():
    return MagicMock(
        send_text_message=MagicMock(return_value={"success": True, "message_id": "wamid.ABC"})
    )


def _failing_whatsapp(err: str = "rate_limited"):
    return MagicMock(
        send_text_message=MagicMock(return_value={"success": False, "error": err})
    )


def _valid_full_answers():
    """All 14 questions answered validly."""
    return {
        "q1_chief_complaint": "Dolor torácico desde ayer",
        "q2_symptoms": "Dolor opresivo irradiado hace 2 días",
        "q3_pain_scale": 6,
        "q4_allergies": False,
        "q5_chronic_conditions": True,
        "q5_chronic_conditions_detail": "Hipertensión desde 2020",
        "q6_current_meds": True,
        "q6_current_meds_detail": "Losartán 50mg diario",
        "q7_surgeries": False,
        "q8_smoking": "no",
        "q9_alcohol": "occasional",
        "q10_exercise": "light",
    }


# ---------------------------------------------------------------------------
# Question catalog
# ---------------------------------------------------------------------------


def test_hardcoded_questions_have_stable_ids():
    ids = [q["id"] for q in INTAKE_QUESTIONS]
    assert len(ids) == len(set(ids)), "question ids must be unique"
    assert len(ids) == 14


def test_every_question_has_a_known_section():
    for q in INTAKE_QUESTIONS:
        assert q["section"] in SECTION_LABELS, f"unknown section on {q['id']}"
        assert q["section"] in SECTION_ORDER


def test_visible_questions_filters_excluded_ids():
    out = visible_questions(["q14_additional", "q11_family_history"])
    ids = {q["id"] for q in out}
    assert "q14_additional" not in ids
    assert "q11_family_history" not in ids
    assert "q1_chief_complaint" in ids
    assert len(out) == 12


def test_visible_questions_ignores_unknown_ids():
    out = visible_questions(["totally_bogus_id"])
    assert len(out) == 14


def test_all_question_ids_matches_catalog():
    assert all_question_ids() == {q["id"] for q in INTAKE_QUESTIONS}


# ---------------------------------------------------------------------------
# Validator
# ---------------------------------------------------------------------------


def test_validate_answers_happy_path():
    ok, errors = validate_answers(_valid_full_answers())
    assert ok, errors
    assert errors == []


def test_validate_answers_missing_required_chief_complaint():
    answers = _valid_full_answers()
    answers["q1_chief_complaint"] = ""
    ok, errors = validate_answers(answers)
    assert not ok
    assert any("motivo principal" in e.lower() for e in errors)


def test_validate_answers_select_rejects_unknown_option():
    answers = _valid_full_answers()
    answers["q8_smoking"] = "sometimes"
    ok, errors = validate_answers(answers)
    assert not ok
    assert any("q8_smoking" in e for e in errors)


def test_validate_answers_scale_must_be_in_range():
    answers = _valid_full_answers()
    answers["q3_pain_scale"] = 15
    ok, errors = validate_answers(answers)
    assert not ok
    assert any("q3_pain_scale" in e for e in errors)


def test_validate_answers_yes_no_requires_followup_when_yes():
    answers = _valid_full_answers()
    answers["q7_surgeries"] = True
    # Missing q7_surgeries_detail
    ok, errors = validate_answers(answers)
    assert not ok
    assert any("cirug" in e.lower() or "hospital" in e.lower() for e in errors)


def test_validate_answers_followup_when_no_is_not_required():
    answers = _valid_full_answers()
    # q4_allergies is False → q4_allergies_detail not required
    assert answers["q4_allergies"] is False
    ok, errors = validate_answers(answers)
    assert ok, errors


def test_validate_answers_skips_required_when_excluded():
    # Doctor excluded the current-meds question; even if unanswered it's OK.
    answers = _valid_full_answers()
    del answers["q6_current_meds"]
    del answers["q6_current_meds_detail"]
    ok, errors = validate_answers(answers, excluded_ids=["q6_current_meds"])
    assert ok, errors


def test_validate_answers_still_catches_type_errors_on_included_questions():
    answers = _valid_full_answers()
    answers["q3_pain_scale"] = "not a number"
    ok, errors = validate_answers(answers, excluded_ids=["q6_current_meds"])
    assert not ok
    assert any("q3_pain_scale" in e for e in errors)


# ---------------------------------------------------------------------------
# send_intake
# ---------------------------------------------------------------------------


def test_send_intake_creates_row_and_sends_whatsapp():
    appointment = _appointment()
    patient = _patient()
    db = _mock_db(
        _chain(first=appointment),       # appointment lookup
        _chain(first=patient),           # patient lookup
        _chain(first=None),              # no existing response row
    )
    wa = _ok_whatsapp()
    service = IntakeService(db=db, whatsapp_service=wa)

    result = service.send_intake(appointment_id=100, doctor=_doctor())

    assert result["sent"] is True
    assert result["token"]
    assert result["message_id"] == "wamid.ABC"
    wa.send_text_message.assert_called_once()
    args, kwargs = wa.send_text_message.call_args
    assert kwargs["to_phone"] == "5551234567"
    assert "http" in kwargs["message"]  # link present
    db.add.assert_called()
    db.commit.assert_called()


def test_send_intake_rejects_closed_appointment():
    appointment = _appointment(status="completed")
    db = _mock_db(_chain(first=appointment))
    service = IntakeService(db=db, whatsapp_service=_ok_whatsapp())

    result = service.send_intake(appointment_id=100, doctor=_doctor())

    assert result == {"sent": False, "error": "appointment_already_closed"}


def test_send_intake_rejects_when_doctor_is_not_owner():
    appointment = _appointment(doctor_id=999)  # someone else
    db = _mock_db(_chain(first=appointment))
    service = IntakeService(db=db, whatsapp_service=_ok_whatsapp())

    result = service.send_intake(appointment_id=100, doctor=_doctor(id=1))

    assert result["sent"] is False
    assert "unauthorized" in result["error"]


def test_send_intake_refuses_patient_without_phone():
    appointment = _appointment()
    patient_no_phone = _patient(phone="")
    db = _mock_db(
        _chain(first=appointment),
        _chain(first=patient_no_phone),
    )
    service = IntakeService(db=db, whatsapp_service=_ok_whatsapp())

    result = service.send_intake(appointment_id=100, doctor=_doctor())

    assert result == {"sent": False, "error": "patient_missing_phone"}


def test_send_intake_handles_whatsapp_failure_without_losing_row():
    appointment = _appointment()
    patient = _patient()
    db = _mock_db(
        _chain(first=appointment),
        _chain(first=patient),
        _chain(first=None),
    )
    wa = _failing_whatsapp(err="provider_down")
    service = IntakeService(db=db, whatsapp_service=wa)

    result = service.send_intake(appointment_id=100, doctor=_doctor())

    assert result["sent"] is False
    assert result["error"] == "whatsapp_send_failed"
    assert result["provider_error"] == "provider_down"
    # Row was created but not committed successfully — token is returned
    # so the doctor can retry with the same row.
    assert result["token"]


def test_send_intake_rejects_already_submitted():
    appointment = _appointment()
    patient = _patient()
    existing = SimpleNamespace(
        id=5,
        appointment_id=100,
        submitted_at=datetime(2026, 4, 19),
        token="tok-abc",
    )
    db = _mock_db(
        _chain(first=appointment),
        _chain(first=patient),
        _chain(first=existing),
    )
    service = IntakeService(db=db, whatsapp_service=_ok_whatsapp())

    result = service.send_intake(appointment_id=100, doctor=_doctor())

    assert result["sent"] is False
    assert result["error"] == "already_submitted"


# ---------------------------------------------------------------------------
# load_for_patient
# ---------------------------------------------------------------------------


def test_load_for_patient_happy_path():
    response = SimpleNamespace(
        id=1, appointment_id=100, patient_id=10, token="tok", submitted_at=None
    )
    appointment = _appointment()
    patient = _patient()
    doctor = _doctor(excluded=["q14_additional"])
    db = _mock_db(
        _chain(first=response),
        _chain(first=appointment),
        _chain(first=patient),
        _chain(first=doctor),
    )
    service = IntakeService(db=db)

    payload, err = service.load_for_patient(token="tok")

    assert err is None
    assert payload["patient_first_name"] == "Juan"
    assert payload["appointment_date"]
    assert payload["excluded_ids"] == ["q14_additional"]


def test_load_for_patient_returns_empty_excluded_when_doctor_has_none():
    response = SimpleNamespace(
        id=1, appointment_id=100, patient_id=10, token="tok", submitted_at=None
    )
    appointment = _appointment()
    patient = _patient()
    doctor = _doctor()  # defaults to []
    db = _mock_db(
        _chain(first=response),
        _chain(first=appointment),
        _chain(first=patient),
        _chain(first=doctor),
    )
    service = IntakeService(db=db)

    payload, err = service.load_for_patient(token="tok")

    assert err is None
    assert payload["excluded_ids"] == []


def test_load_for_patient_not_found():
    db = _mock_db(_chain(first=None))
    service = IntakeService(db=db)

    payload, err = service.load_for_patient(token="bogus")

    assert payload is None
    assert err == "not_found"


def test_load_for_patient_already_submitted():
    response = SimpleNamespace(
        id=1, appointment_id=100, patient_id=10, token="tok",
        submitted_at=datetime(2026, 4, 19),
    )
    db = _mock_db(_chain(first=response))
    service = IntakeService(db=db)

    payload, err = service.load_for_patient(token="tok")

    assert payload is None
    assert err == "already_submitted"


def test_load_for_patient_appointment_closed():
    response = SimpleNamespace(
        id=1, appointment_id=100, patient_id=10, token="tok", submitted_at=None
    )
    db = _mock_db(
        _chain(first=response),
        _chain(first=_appointment(status="completed")),
    )
    service = IntakeService(db=db)

    payload, err = service.load_for_patient(token="tok")

    assert payload is None
    assert err == "appointment_closed"


# ---------------------------------------------------------------------------
# submit
# ---------------------------------------------------------------------------


def test_submit_stores_answers_and_marks_submitted():
    response = SimpleNamespace(
        id=1, appointment_id=100, patient_id=10, token="tok",
        submitted_at=None, answers=None,
    )
    db = _mock_db(
        _chain(first=response),
        _chain(first=_appointment()),
    )
    service = IntakeService(db=db)

    ok, err = service.submit(token="tok", answers={"q1_chief_complaint": "x"})

    assert ok is True
    assert err is None
    assert response.answers == {"q1_chief_complaint": "x"}
    assert response.submitted_at is not None
    db.commit.assert_called()


def test_submit_rejects_second_submission():
    response = SimpleNamespace(
        id=1, appointment_id=100, patient_id=10, token="tok",
        submitted_at=datetime(2026, 4, 19), answers={"foo": "bar"},
    )
    db = _mock_db(_chain(first=response))
    service = IntakeService(db=db)

    ok, err = service.submit(token="tok", answers={"foo": "x"})

    assert not ok
    assert err == "already_submitted"


def test_submit_rejects_closed_appointment():
    response = SimpleNamespace(
        id=1, appointment_id=100, patient_id=10, token="tok",
        submitted_at=None, answers=None,
    )
    db = _mock_db(
        _chain(first=response),
        _chain(first=_appointment(status="cancelled")),
    )
    service = IntakeService(db=db)

    ok, err = service.submit(token="tok", answers={})

    assert not ok
    assert err == "appointment_closed"


# ---------------------------------------------------------------------------
# get_for_appointment (doctor read)
# ---------------------------------------------------------------------------


def test_get_for_appointment_returns_response_for_owner_doctor():
    appointment = _appointment()
    response = SimpleNamespace(id=1, appointment_id=100)
    db = _mock_db(
        _chain(first=appointment),
        _chain(first=response),
    )
    service = IntakeService(db=db)

    out = service.get_for_appointment(appointment_id=100, doctor=_doctor())

    assert out is response


def test_get_for_appointment_denies_other_doctor():
    appointment = _appointment(doctor_id=999)
    db = _mock_db(_chain(first=appointment))
    service = IntakeService(db=db)

    out = service.get_for_appointment(appointment_id=100, doctor=_doctor(id=1))

    assert out is None


# ---------------------------------------------------------------------------
# Doctor preferences (exclusions)
# ---------------------------------------------------------------------------


def test_get_doctor_excluded_ids_defaults_to_empty():
    doctor = _doctor()
    service = IntakeService(db=MagicMock())
    assert service.get_doctor_excluded_ids(doctor) == []


def test_get_doctor_excluded_ids_returns_stored_list():
    doctor = _doctor(excluded=["q12_gyn_pregnancies", "q13_gyn_lmp"])
    service = IntakeService(db=MagicMock())
    assert service.get_doctor_excluded_ids(doctor) == [
        "q12_gyn_pregnancies",
        "q13_gyn_lmp",
    ]


def test_set_doctor_excluded_ids_filters_unknown_and_dedupes():
    doctor = _doctor()
    db = MagicMock()
    service = IntakeService(db=db)

    ok, err, normalized = service.set_doctor_excluded_ids(
        doctor,
        ["q14_additional", "bogus_id", "q14_additional", "q11_family_history"],
    )

    assert ok is True
    assert err is None
    assert normalized == ["q14_additional", "q11_family_history"]
    assert doctor.intake_excluded_questions == [
        "q14_additional",
        "q11_family_history",
    ]
    db.commit.assert_called()


def test_set_doctor_excluded_ids_accepts_empty_list():
    doctor = _doctor(excluded=["q14_additional"])
    db = MagicMock()
    service = IntakeService(db=db)

    ok, err, normalized = service.set_doctor_excluded_ids(doctor, [])

    assert ok is True
    assert err is None
    assert normalized == []
    assert doctor.intake_excluded_questions == []


def test_excluded_ids_for_appointment_pulls_from_doctor():
    appointment = _appointment()
    doctor = _doctor(excluded=["q11_family_history"])
    db = _mock_db(
        _chain(first=appointment),
        _chain(first=doctor),
    )
    service = IntakeService(db=db)

    assert service.excluded_ids_for_appointment(100) == ["q11_family_history"]


def test_excluded_ids_for_appointment_handles_missing_appointment():
    db = _mock_db(_chain(first=None))
    service = IntakeService(db=db)
    assert service.excluded_ids_for_appointment(9999) == []


def test_excluded_ids_by_token_traverses_response_to_doctor():
    response = SimpleNamespace(id=1, appointment_id=100, patient_id=10, token="tok")
    appointment = _appointment()
    doctor = _doctor(excluded=["q14_additional"])
    db = _mock_db(
        _chain(first=response),     # response lookup by token
        _chain(first=appointment),  # appointment lookup
        _chain(first=doctor),       # doctor lookup
    )
    service = IntakeService(db=db)

    assert service.excluded_ids_by_token("tok") == ["q14_additional"]


def test_excluded_ids_by_token_returns_empty_for_unknown_token():
    db = _mock_db(_chain(first=None))
    service = IntakeService(db=db)
    assert service.excluded_ids_by_token("bogus") == []
