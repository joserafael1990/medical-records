"""
Tests for the WhatsApp bot's `create_patient_from_chat` helper.

The key behavioural guarantee is that when a doctor_id is threaded in
from the bot's session state, the new patient is stamped as created-by
that doctor — otherwise the patient becomes invisible on the doctor's
dashboard (which filters by `Person.created_by`).
"""

from __future__ import annotations

from types import SimpleNamespace
from unittest.mock import MagicMock

from services.whatsapp_handlers import gemini_helpers


def _make_db(monkeypatch, generated_code: str = "PAT-000123"):
    """Build a mock DB that records the Person added, and stub code gen."""
    monkeypatch.setattr(
        gemini_helpers, "generate_person_code", lambda _db, _pt: generated_code
    )
    added = []

    db = MagicMock()

    def fake_add(obj):
        added.append(obj)

    def fake_refresh(obj):
        # Simulate the DB setting an id once committed.
        if not hasattr(obj, "id") or getattr(obj, "id") is None:
            obj.id = 42

    db.add.side_effect = fake_add
    db.refresh.side_effect = fake_refresh
    return db, added


def test_create_patient_from_chat_without_doctor_keeps_legacy_behavior(monkeypatch):
    db, added = _make_db(monkeypatch)

    out = gemini_helpers.create_patient_from_chat(
        db=db,
        name="Juan",
        phone="+525550001111",
    )

    assert out["id"] == 42
    assert added[0].name == "Juan"
    assert added[0].primary_phone == "+525550001111"
    assert added[0].person_type == "patient"
    # Legacy behaviour — unowned patient when caller did not supply a doctor.
    assert added[0].created_by is None


def test_create_patient_from_chat_stamps_created_by_when_doctor_known(monkeypatch):
    db, added = _make_db(monkeypatch)

    out = gemini_helpers.create_patient_from_chat(
        db=db,
        name="Ana Pérez",
        phone="+525550002222",
        created_by_doctor_id=7,
    )

    assert out["name"] == "Ana Pérez"
    assert added[0].created_by == 7


def test_create_patient_from_chat_accepts_single_word_name(monkeypatch):
    """The legacy helper never validated name format. Keep it that way —
    the relaxed schema validator already accepts single-word names for the
    rest of the system, so the WhatsApp bot stays consistent."""
    db, added = _make_db(monkeypatch)

    out = gemini_helpers.create_patient_from_chat(
        db=db,
        name="María",
        phone="+525550003333",
    )

    assert out["id"] == 42
    assert added[0].name == "María"


def test_create_patient_from_chat_parses_birth_date(monkeypatch):
    db, added = _make_db(monkeypatch)

    gemini_helpers.create_patient_from_chat(
        db=db,
        name="Juan",
        phone="+525550001111",
        birth_date="1990-05-15",
    )

    assert added[0].birth_date.isoformat() == "1990-05-15"


def test_create_patient_from_chat_handles_invalid_birth_date(monkeypatch):
    db, added = _make_db(monkeypatch)

    # Must not raise — invalid dates are logged and skipped.
    gemini_helpers.create_patient_from_chat(
        db=db,
        name="Juan",
        phone="+525550001111",
        birth_date="not-a-date",
    )

    assert added[0].birth_date is None


def test_create_patient_from_chat_rolls_back_on_commit_failure(monkeypatch):
    db, _ = _make_db(monkeypatch)
    db.commit.side_effect = RuntimeError("DB down")

    import pytest

    with pytest.raises(RuntimeError):
        gemini_helpers.create_patient_from_chat(
            db=db,
            name="Juan",
            phone="+525550001111",
        )

    db.rollback.assert_called_once()
