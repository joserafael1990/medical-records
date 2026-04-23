"""Integration tests for the web-form consent flow:

  POST /api/privacy/generate-link    (auth) → doctor crea pending + URL
  POST /api/privacy/accept-public    (no auth) → paciente flip via URL

Este flujo desacopla el canal (SMS/email/QR/WhatsApp-manual) de la
captura del consentimiento. No depende de la aprobación de un template
en Meta. Las propiedades que hay que garantizar:

  - accept-public es idempotente (dos clicks = 1 acceptance, no 2).
  - accept-public rechaza hash mismatch (409) para evitar replay con
    contenido stale tras actualizar la plantilla.
  - accept-public captura IP del servidor, nunca del cliente payload.
  - generate-link reutiliza el consent pendiente si ya existe con el
    mismo hash (no duplica).
"""

from __future__ import annotations

import os
import sys
from datetime import datetime
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

import pytest

BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

_vertexai_stub = MagicMock()
for _name in ("Content", "FunctionDeclaration", "GenerativeModel", "Part", "Tool"):
    setattr(_vertexai_stub, _name, MagicMock)
sys.modules.setdefault("vertexai", MagicMock())
sys.modules.setdefault("vertexai.generative_models", _vertexai_stub)

from starlette.testclient import TestClient  # noqa: E402

from main_clean_english import app  # noqa: E402
from database import get_db  # noqa: E402
from dependencies import get_current_user  # noqa: E402


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

HASH_A = "a" * 64  # SHA-256 simulado
HASH_B = "b" * 64


def _doctor():
    return SimpleNamespace(
        id=7,
        person_code="DOC-7",
        person_type="doctor",
        is_active=True,
        name="Dra. Test",
        title="Dra.",
        professional_license="1234567",
        specialty_id=1,
        email="doc@x.com",
        arco_contact_email="arco@x.com",
        legal_address="Av. X",
    )


@pytest.fixture
def client_with_fakes():
    stub_db = MagicMock()

    def _get_db_override():
        yield stub_db

    app.dependency_overrides[get_db] = _get_db_override
    app.dependency_overrides[get_current_user] = lambda: _doctor()
    try:
        yield TestClient(app), stub_db
    finally:
        app.dependency_overrides.pop(get_db, None)
        app.dependency_overrides.pop(get_current_user, None)


# ---------------------------------------------------------------------------
# generate-link
# ---------------------------------------------------------------------------

def test_generate_link_returns_url_and_reuses_pending(client_with_fakes):
    client, db = client_with_fakes

    patient = SimpleNamespace(id=42, person_type="patient", created_by=7, name="Juan")

    # No hay consent aceptado previo; sí hay un pending con mismo hash → reusar.
    existing_pending = SimpleNamespace(
        id=99,
        consent_given=False,
        rendered_content_hash=HASH_A,
    )

    fake_rendered = SimpleNamespace(
        notice_id=1, version="v1",
        title="X", content="c", short_summary="s",
        effective_date="2026-04-22", content_hash=HASH_A,
    )

    # Singleton mock para PrivacyConsent: la ruta hace 2 queries contra
    # esa tabla (accepted + pending). side_effect en .first() solo funciona
    # si ambas queries comparten el mismo objeto mock.
    consent_q = MagicMock()
    consent_q.filter.return_value.order_by.return_value.first.side_effect = [None, existing_pending]

    def query_factory(model):
        name = model.__name__
        if name == "PrivacyConsent":
            return consent_q
        q = MagicMock()
        if name == "Person":
            q.filter.return_value.first.return_value = patient
        elif name == "MedicalRecord":
            q.filter.return_value.first.return_value = None
        else:
            q.filter.return_value.first.return_value = None
            q.filter.return_value.order_by.return_value.first.return_value = None
        return q

    db.query.side_effect = query_factory

    with patch("routes.privacy.render_active_notice", return_value=fake_rendered), \
         patch("routes.privacy.audit_service.log_action"):
        resp = client.post("/api/privacy/generate-link", json={"patient_id": 42})

    assert resp.status_code == 200
    body = resp.json()
    assert body["success"] is True
    assert body["consent_id"] == 99  # reutilizó el pending, no creó otro
    assert body["content_hash"] == HASH_A
    assert "doctor=DOC-7" in body["url"]
    assert "consent=99" in body["url"]


def test_generate_link_short_circuits_when_already_accepted(client_with_fakes):
    client, db = client_with_fakes

    patient = SimpleNamespace(id=42, person_type="patient", created_by=7, name="Juan")
    accepted_consent = SimpleNamespace(
        id=55,
        consent_given=True,
        consent_date=datetime(2026, 4, 20, 12, 0, 0),
    )

    def query_factory(model):
        q = MagicMock()
        name = model.__name__
        if name == "Person":
            q.filter.return_value.first.return_value = patient
        elif name == "MedicalRecord":
            q.filter.return_value.first.return_value = None
        elif name == "PrivacyConsent":
            q.filter.return_value.order_by.return_value.first.return_value = accepted_consent
        else:
            q.filter.return_value.first.return_value = None
        return q

    db.query.side_effect = query_factory

    resp = client.post("/api/privacy/generate-link", json={"patient_id": 42})
    body = resp.json()
    assert resp.status_code == 200
    assert body["already_accepted"] is True
    assert body["consent_id"] == 55


def test_generate_link_rejects_patient_not_owned(client_with_fakes):
    client, db = client_with_fakes

    # Paciente existe pero created_by != doctor actual, y sin consulta.
    patient = SimpleNamespace(id=42, person_type="patient", created_by=999, name="Juan")

    def query_factory(model):
        q = MagicMock()
        name = model.__name__
        if name == "Person":
            q.filter.return_value.first.return_value = patient
        elif name == "MedicalRecord":
            q.filter.return_value.first.return_value = None
        else:
            q.filter.return_value.first.return_value = None
            q.filter.return_value.order_by.return_value.first.return_value = None
        return q

    db.query.side_effect = query_factory

    resp = client.post("/api/privacy/generate-link", json={"patient_id": 42})
    assert resp.status_code == 403


# ---------------------------------------------------------------------------
# accept-public
# ---------------------------------------------------------------------------

def _consent(**overrides):
    c = SimpleNamespace(
        id=99,
        patient_id=42,
        doctor_id=7,
        notice_id=1,
        consent_given=False,
        consent_date=None,
        rendered_content_hash=HASH_A,
        ip_address=None,
        user_agent=None,
    )
    for k, v in overrides.items():
        setattr(c, k, v)
    return c


def test_accept_public_flips_consent_and_captures_ip(client_with_fakes):
    client, db = client_with_fakes
    app.dependency_overrides.pop(get_current_user, None)  # endpoint no auth

    consent = _consent()
    patient = SimpleNamespace(id=42, name="Pedro")

    def query_factory(model):
        q = MagicMock()
        name = model.__name__
        if name == "PrivacyConsent":
            q.filter.return_value.first.return_value = consent
        elif name == "Person":
            q.filter.return_value.first.return_value = patient
        else:
            q.filter.return_value.first.return_value = None
        return q

    db.query.side_effect = query_factory

    with patch("routes.privacy.audit_service.log_action") as audit:
        resp = client.post(
            "/api/privacy/accept-public",
            json={"consent_id": 99, "content_hash": HASH_A},
            headers={"x-forwarded-for": "203.0.113.9"},
        )

    body = resp.json()
    assert resp.status_code == 200
    assert body["success"] is True
    assert body["already_accepted"] is False
    assert consent.consent_given is True
    assert consent.ip_address == "203.0.113.9"
    assert consent.consent_date is not None
    audit.assert_called_once()  # auditado
    # Verificar que el audit captura el método correcto
    kwargs = audit.call_args.kwargs
    assert kwargs["operation_type"] == "web_form_consent"
    assert kwargs["new_values"]["method"] == "web_form"
    assert kwargs["new_values"]["doctor_id"] == 7


def test_accept_public_is_idempotent(client_with_fakes):
    client, _ = client_with_fakes
    app.dependency_overrides.pop(get_current_user, None)

    already_accepted = _consent(
        consent_given=True,
        consent_date=datetime(2026, 4, 20),
    )

    db = MagicMock()
    def _get_db():
        yield db
    app.dependency_overrides[get_db] = _get_db

    db.query.return_value.filter.return_value.first.return_value = already_accepted

    resp = client.post(
        "/api/privacy/accept-public",
        json={"consent_id": 99, "content_hash": HASH_A},
    )
    body = resp.json()
    assert resp.status_code == 200
    assert body["already_accepted"] is True
    # No se debió llamar db.commit — consent ya aceptado
    assert db.commit.call_count == 0


def test_accept_public_rejects_hash_mismatch(client_with_fakes):
    client, db = client_with_fakes
    app.dependency_overrides.pop(get_current_user, None)

    # El consent tiene HASH_A, el cliente envía HASH_B.
    consent = _consent(rendered_content_hash=HASH_A)
    db.query.return_value.filter.return_value.first.return_value = consent

    resp = client.post(
        "/api/privacy/accept-public",
        json={"consent_id": 99, "content_hash": HASH_B},
    )
    assert resp.status_code == 409
    assert "vigente" in resp.json()["detail"].lower()
    # Consent NO se flipeó
    assert consent.consent_given is False


def test_accept_public_returns_404_for_unknown_consent(client_with_fakes):
    client, db = client_with_fakes
    app.dependency_overrides.pop(get_current_user, None)

    db.query.return_value.filter.return_value.first.return_value = None

    resp = client.post(
        "/api/privacy/accept-public",
        json={"consent_id": 12345, "content_hash": HASH_A},
    )
    assert resp.status_code == 404
