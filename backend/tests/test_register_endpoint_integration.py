"""
POST /api/auth/register integration tests.

Exercises the full FastAPI route with a mocked DB so we assert the
*end-to-end* behavior a doctor sees when hitting the quick-register flow
from the browser — not just schema-level parsing.

Why this file exists
--------------------
On 2026-04-22 production users reported "Se requiere al menos un documento
personal" on QuickRegisterView even though that view only asks for cédula
profesional. Root cause: the DoctorCreate schema was missing
`quick_registration` and `privacy_consent`, so Pydantic v2's default
extra='ignore' silently dropped them and the route fell into full-mode
validation. These tests lock the contract so a future schema regression
surfaces as a red test instead of a broken sign-up form.
"""

from __future__ import annotations

import os
import sys
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

import pytest
from starlette.testclient import TestClient

BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

# vertexai stubs mirror conftest.py so importing the FastAPI app doesn't
# fail on the Gemini optional dependency when running this file standalone.
sys.modules.setdefault("vertexai", MagicMock())
_vertexai_stub = MagicMock()
for _name in ("Content", "FunctionDeclaration", "GenerativeModel", "Part", "Tool"):
    setattr(_vertexai_stub, _name, MagicMock)
sys.modules.setdefault("vertexai.generative_models", _vertexai_stub)

from main_clean_english import app  # noqa: E402
from database import get_db  # noqa: E402


# The exact body QuickRegisterView.tsx POSTs. Kept verbatim so changes on
# either side must be reconciled.
FRONTEND_QUICK_REGISTER_BODY = {
    "email": "dra.jaqueline+{sfx}@yahoo.com.mx",
    "password": "Passw0rd!",
    "name": "Dra. Jaqueline García",
    "specialty_id": 12,
    "documents": [{"document_id": 13, "document_value": "12345678"}],
    "title": "Dr.",
    "gender": "",
    "birth_date": None,
    "primary_phone": "",
    "university": "",
    "graduation_year": None,
    "office_name": "",
    "office_address": "",
    "office_city": "",
    "office_state_id": None,
    "office_phone": "",
    "office_maps_url": "",
    "appointment_duration": None,
    "schedule_data": {},
    "created_by": "Dra. Jaqueline García",
    "quick_registration": True,
    "privacy_consent": {
        "accepted": True,
        "accepted_at": "2026-04-22T20:00:00+00:00",
        "notice_version": "v1",
        "user_agent": "Mozilla/5.0 (test)",
        "timezone": "America/Mexico_City",
    },
}


def _document_type_stub(name: str, id_: int) -> SimpleNamespace:
    return SimpleNamespace(id=id_, name=name)


def _document_stub(id_: int, name: str) -> SimpleNamespace:
    return SimpleNamespace(id=id_, name=name)


class _RegisterMockDb:
    """Mock DB that returns the minimum fixtures /api/auth/register touches.

    Only models used by the register route matter:
    - Person (for duplicate email lookup)
    - DocumentType (Personal / Profesional lookups, alternating by call order)
    - PersonDocument (duplicate value lookup)
    - Document (name lookup for the duplicate error message)
    - PrivacyNotice (active notice fetch)

    DocumentType is resolved positionally: the register route always queries
    'Personal' first and 'Profesional' second, so a counter is all we need.
    """

    def __init__(self, existing_email: str | None = None) -> None:
        self.existing_email = existing_email
        self.added = []
        self.begin = MagicMock()
        self.commit = MagicMock()
        self.rollback = MagicMock()
        self.flush = MagicMock()
        self.refresh = MagicMock()
        self.close = MagicMock()
        self._doc_type_calls = 0

    def add(self, obj):
        self.added.append(obj)

    def execute(self, *_, **__):  # schedule_data path
        return MagicMock(fetchone=lambda: None)

    def query(self, model):
        return _Q(self, model)


class _Q:
    def __init__(self, db: _RegisterMockDb, model) -> None:
        self.db = db
        self.model = model

    def filter(self, *_args, **_kwargs):
        return self

    def join(self, *_args, **_kwargs):
        return self

    def order_by(self, *_args, **_kwargs):
        return self

    def first(self):
        from database import DocumentType, Person, PersonDocument, Document

        try:
            from models.system import PrivacyNotice
        except Exception:  # pragma: no cover
            PrivacyNotice = None  # type: ignore[assignment]

        if self.model is Person:
            if self.db.existing_email is None:
                return None
            return SimpleNamespace(
                id=99, email=self.db.existing_email, person_type="doctor"
            )

        if self.model is DocumentType:
            self.db._doc_type_calls += 1
            if self.db._doc_type_calls == 1:
                return _document_type_stub("Personal", 1)
            return _document_type_stub("Profesional", 2)

        if self.model is PersonDocument:
            return None  # no duplicate

        if self.model is Document:
            return _document_stub(13, "Cédula Profesional")

        if PrivacyNotice is not None and self.model is PrivacyNotice:
            return SimpleNamespace(id=1, version="v1", is_active=True)

        return None

    def all(self):
        return []


@pytest.fixture()
def register_client():
    """Plain TestClient — get_current_user stays untouched because register
    is public. We only override get_db so we never hit Postgres."""
    db = _RegisterMockDb()
    app.dependency_overrides[get_db] = lambda: db
    with TestClient(app, raise_server_exceptions=False) as c:
        c._mock_db = db  # type: ignore[attr-defined]
        yield c
    app.dependency_overrides.clear()


@pytest.fixture()
def register_client_existing_email():
    db = _RegisterMockDb(existing_email="dra.jaqueline+dup@yahoo.com.mx")
    app.dependency_overrides[get_db] = lambda: db
    with TestClient(app, raise_server_exceptions=False) as c:
        c._mock_db = db  # type: ignore[attr-defined]
        yield c
    app.dependency_overrides.clear()


def _patches(doctor_id: int = 42):
    """Patch crud helpers the route calls after validation passes.

    We keep the real DB query path (so Pydantic → HTTPException mapping
    stays honest) but short-circuit create_doctor_safe/login_user because
    they don't matter for the validation contract we are locking.
    """
    doctor_stub = SimpleNamespace(
        id=doctor_id,
        email=None,  # set per-test
        name="Dra. Jaqueline García",
        title="Dr.",
        person_code="DOC001",
        person_type="doctor",
        full_name="Dra. Jaqueline García",
    )

    def _fake_get_documents_by_type(_db, document_type_id):
        # type 1 = Personal (no docs), type 2 = Profesional (cédula 13)
        if document_type_id == 2:
            return [_document_stub(13, "Cédula Profesional")]
        return []

    def _fake_login_user(_db, email, _password):
        return {
            "access_token": "fake.jwt.token",
            "token_type": "bearer",
            "user": {
                "id": doctor_id,
                "email": email,
                "name": "Dra. Jaqueline García",
                "person_type": "doctor",
                "title": "Dr.",
                "first_name": "Jaqueline",
                "paternal_surname": "García",
                "maternal_surname": "",
            },
        }

    return (
        patch("routes.auth.crud.create_doctor_safe", return_value=doctor_stub),
        patch("routes.auth.crud.get_documents_by_type", side_effect=_fake_get_documents_by_type),
        patch("routes.auth.auth.login_user", side_effect=_fake_login_user),
    )


def _post_register(client: TestClient, suffix: str, **overrides):
    body = dict(FRONTEND_QUICK_REGISTER_BODY)
    body["email"] = body["email"].format(sfx=suffix)
    body.update(overrides)
    return client.post("/api/auth/register", json=body)


# ---------------------------------------------------------------------------
# The prod bug: QuickRegisterView's exact payload used to return 400
# "Se requiere al menos un documento personal". It must now succeed.
# ---------------------------------------------------------------------------

def test_quick_register_with_cedula_only_succeeds(register_client):
    p1, p2, p3 = _patches()
    with p1, p2, p3:
        resp = _post_register(register_client, "happy")

    assert resp.status_code == 200, (
        f"Quick register must succeed with only cédula + consent, got "
        f"{resp.status_code}: {resp.text}"
    )
    data = resp.json()
    assert data.get("success") is True
    assert "access_token" in data


def test_quick_register_never_asks_for_personal_document(register_client):
    """Direct regression for the user's screenshot error string.

    Before the fix the body would come back with this exact Spanish string
    because the schema silently dropped quick_registration. We pin it so a
    future regression fails loud instead of rejecting real sign-ups.
    """
    p1, p2, p3 = _patches()
    with p1, p2, p3:
        resp = _post_register(register_client, "noperson")

    assert resp.status_code != 400 or (
        "documento personal" not in resp.text.lower()
    ), f"Personal-doc error resurfaced on quick register: {resp.text}"


# ---------------------------------------------------------------------------
# Backend validation still enforces the rules the UI relies on.
# ---------------------------------------------------------------------------

def test_quick_register_rejects_missing_consent(register_client):
    p1, p2, p3 = _patches()
    with p1, p2, p3:
        # privacy_consent is a Pydantic sub-model with accepted: bool
        # required; omitting it at the schema level surfaces as a 422
        # (validation error) rather than a 400 business rule.
        body = dict(FRONTEND_QUICK_REGISTER_BODY)
        body["email"] = body["email"].format(sfx="noconsent")
        body.pop("privacy_consent", None)
        resp = register_client.post("/api/auth/register", json=body)

    # When consent is None the route raises 400 with a user-facing message.
    # Pydantic allows privacy_consent to default to None, so the 400 path
    # is what we actually exercise.
    assert resp.status_code in (400, 422)
    assert "privacidad" in resp.text.lower() or "consent" in resp.text.lower() or "lfpdppp" in resp.text.lower()


def test_quick_register_rejects_unaccepted_consent(register_client):
    p1, p2, p3 = _patches()
    with p1, p2, p3:
        resp = _post_register(
            register_client,
            "unaccepted",
            privacy_consent={"accepted": False},
        )

    assert resp.status_code == 422, (
        f"Unaccepted consent must fail validation (LFPDPPP Art. 16), got {resp.status_code}"
    )


def test_quick_register_rejects_invalid_cedula_format(register_client):
    p1, p2, p3 = _patches()
    with p1, p2, p3:
        resp = _post_register(
            register_client,
            "badcedula",
            documents=[{"document_id": 13, "document_value": "12"}],  # too short
        )

    assert resp.status_code == 400
    assert "cédula" in resp.text.lower() or "cedula" in resp.text.lower()


def test_quick_register_rejects_duplicate_email(register_client_existing_email):
    p1, p2, p3 = _patches()
    with p1, p2, p3:
        body = dict(FRONTEND_QUICK_REGISTER_BODY)
        body["email"] = "dra.jaqueline+dup@yahoo.com.mx"
        resp = register_client_existing_email.post("/api/auth/register", json=body)

    assert resp.status_code == 400
    assert "email" in resp.text.lower()


# ---------------------------------------------------------------------------
# Full mode still requires a personal document — we didn't accidentally
# loosen validation for the non-quick path.
# ---------------------------------------------------------------------------

def test_full_register_still_requires_personal_document(register_client):
    p1, p2, p3 = _patches()
    with p1, p2, p3:
        resp = _post_register(
            register_client,
            "fullmode",
            quick_registration=False,
            # Still only the cédula, like the quick payload.
        )

    assert resp.status_code == 400
    assert "documento personal" in resp.text.lower()
