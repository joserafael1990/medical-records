"""Integration tests for the /api/privacy/public-notice endpoint.

The endpoint has three branches that each represent a different legal
posture for CORTEX:

1. No `doctor` param → returns CORTEX's platform-privacy (Responsable = CORTEX
   for the doctor-user, no patient data involved).
2. `doctor=<slug>` with a complete doctor → returns the doctor's rendered
   privacy notice to their patients (Responsable = el médico).
3. `doctor=<slug>` with an incomplete doctor → 409, refusing to emit a
   legally-invalid notice that could expose CORTEX.

We stub the DB session so no live Postgres is required.
"""

from __future__ import annotations

import os
import sys
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

import pytest

BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

# Stub vertexai so main_clean_english imports cleanly in tests.
_vertexai_stub = MagicMock()
for _name in ("Content", "FunctionDeclaration", "GenerativeModel", "Part", "Tool"):
    setattr(_vertexai_stub, _name, MagicMock)
sys.modules.setdefault("vertexai", MagicMock())
sys.modules.setdefault("vertexai.generative_models", _vertexai_stub)

from starlette.testclient import TestClient  # noqa: E402

from main_clean_english import app  # noqa: E402
from database import get_db  # noqa: E402


def _fake_template():
    return SimpleNamespace(
        id=1,
        version="v1",
        title="Aviso de Privacidad del Médico al Paciente",
        content=(
            "Responsable: {{doctor_title}} {{doctor_name}} "
            "({{doctor_cedula}}) en {{doctor_legal_address}}. "
            "ARCO: {{doctor_arco_email}}. v={{notice_version}} {{effective_date}}"
        ),
        short_summary="",
        effective_date=SimpleNamespace(isoformat=lambda: "2026-04-22"),
        is_active=True,
    )


def _fake_platform_doc():
    return SimpleNamespace(
        id=100,
        doc_type="platform_privacy",
        version="v1",
        title="Aviso de Privacidad de la Plataforma CORTEX",
        content="Responsable: CORTEX — vigente {{effective_date}}",
        effective_date=SimpleNamespace(isoformat=lambda: "2026-04-22"),
        is_active=True,
    )


def _complete_doctor():
    return SimpleNamespace(
        id=7,
        title="Dra.",
        name="María Torres",
        person_code="DOC-7",
        person_type="doctor",
        is_active=True,
        professional_license="7654321",
        specialty_id=10,
        email="maria@x.com",
        arco_contact_email="arco@maria.com",
        legal_address="Av. Reforma 100, CDMX",
    )


def _incomplete_doctor():
    d = _complete_doctor()
    d.legal_address = None
    return d


@pytest.fixture
def client_with_db():
    """Provides a TestClient with a DB stub configurable per test."""
    stub_db = MagicMock()

    def _get_db_override():
        yield stub_db

    app.dependency_overrides[get_db] = _get_db_override
    try:
        yield TestClient(app), stub_db
    finally:
        app.dependency_overrides.pop(get_db, None)


def _configure_query(
    stub_db,
    *,
    doctor=None,
    template=None,
    platform=None,
    specialty_name="Medicina Interna",
    office=None,
    person_document=None,
):
    """Make stub_db.query(Model) return a query-chain that yields the right row
    depending on which model was requested."""

    def query_factory(model):
        name = getattr(model, "__name__", str(model))
        q = MagicMock()
        if name == "Person":
            q.filter.return_value.first.return_value = doctor
        elif name == "PrivacyNotice":
            q.filter.return_value.order_by.return_value.first.return_value = template
        elif name == "LegalDocument":
            q.filter.return_value.order_by.return_value.first.return_value = platform
        elif name == "Specialty":
            q.filter.return_value.first.return_value = SimpleNamespace(name=specialty_name)
        elif name == "Office":
            q.filter.return_value.order_by.return_value.first.return_value = office
        elif name == "PersonDocument":
            q.join.return_value.filter.return_value.order_by.return_value.first.return_value = person_document
        else:
            q.filter.return_value.first.return_value = None
            q.filter.return_value.order_by.return_value.first.return_value = None
        return q

    stub_db.query.side_effect = query_factory


def test_no_slug_returns_platform_privacy(client_with_db):
    client, db = client_with_db
    _configure_query(db, platform=_fake_platform_doc())

    resp = client.get("/api/privacy/public-notice")
    assert resp.status_code == 200
    body = resp.json()
    assert body["kind"] == "platform_privacy"
    assert body["title"] == "Aviso de Privacidad de la Plataforma CORTEX"
    assert "CORTEX" in body["content"]
    # Placeholder sustituido
    assert "{{effective_date}}" not in body["content"]


def test_slug_with_complete_doctor_returns_rendered_notice(client_with_db):
    client, db = client_with_db
    _configure_query(db, doctor=_complete_doctor(), template=_fake_template())

    resp = client.get("/api/privacy/public-notice?doctor=DOC-7")
    assert resp.status_code == 200
    body = resp.json()
    assert body["kind"] == "doctor_patient_notice"
    assert "Dra. María Torres" in body["content"]
    assert "7654321" in body["content"]
    assert "Av. Reforma 100" in body["content"]
    assert "arco@maria.com" in body["content"]
    assert "{{" not in body["content"]  # no placeholders sin sustituir
    assert len(body["content_hash"]) == 64  # SHA-256 hex


def test_slug_with_incomplete_doctor_and_no_office_returns_409(client_with_db):
    client, db = client_with_db
    _configure_query(
        db,
        doctor=_incomplete_doctor(),
        template=_fake_template(),
        office=None,
    )

    resp = client.get("/api/privacy/public-notice?doctor=DOC-7")
    assert resp.status_code == 409
    # El mensaje identifica el campo faltante para que el doctor lo complete
    assert "domicilio" in resp.json()["detail"].lower()


def test_slug_falls_back_to_office_address_when_legal_address_missing(client_with_db):
    """Un doctor sin legal_address explícito pero con un consultorio
    activo rinde el aviso usando la dirección del consultorio."""
    client, db = client_with_db
    office = SimpleNamespace(
        address="Insurgentes Sur 500",
        city="CDMX",
        postal_code="03200",
    )
    _configure_query(
        db,
        doctor=_incomplete_doctor(),
        template=_fake_template(),
        office=office,
    )

    resp = client.get("/api/privacy/public-notice?doctor=DOC-7")
    assert resp.status_code == 200
    body = resp.json()
    assert body["kind"] == "doctor_patient_notice"
    assert "Insurgentes Sur 500" in body["content"]
    assert "CDMX" in body["content"]


def test_unknown_slug_returns_404(client_with_db):
    client, db = client_with_db
    _configure_query(db, doctor=None, template=_fake_template())

    resp = client.get("/api/privacy/public-notice?doctor=NO-EXISTE")
    assert resp.status_code == 404
    assert "no encontrado" in resp.json()["detail"].lower()


def test_consent_state_includes_patient_first_name(client_with_db):
    """Con ?consent=<id>, el response debe incluir el primer nombre del
    paciente para que la UI muestre "Hola Juan, al marcar la casilla…".
    El apellido completo NO se expone en este endpoint sin auth.
    """
    client, db = client_with_db

    doctor = _complete_doctor()
    patient = SimpleNamespace(id=99, name="Juan Alberto García López")
    consent_row = SimpleNamespace(
        id=42,
        patient_id=99,
        doctor_id=7,
        consent_given=False,
        consent_date=None,
        rendered_content_hash="a" * 64,
    )

    # Primera query a Person (por person_code) → doctor
    # Segunda query a Person (por id) → patient (desde consent_state)
    # Una sola instancia de MagicMock para Person, compartida entre llamadas,
    # para que side_effect avance correctamente.
    person_q = MagicMock()
    person_q.filter.return_value.first.side_effect = [doctor, patient]

    def query_factory(model):
        name = getattr(model, "__name__", str(model))
        if name == "Person":
            return person_q
        q = MagicMock()
        if name == "PrivacyNotice":
            q.filter.return_value.order_by.return_value.first.return_value = _fake_template()
        elif name == "Specialty":
            q.filter.return_value.first.return_value = SimpleNamespace(name="Med Interna")
        elif name == "PrivacyConsent":
            q.filter.return_value.first.return_value = consent_row
        elif name == "Office":
            q.filter.return_value.order_by.return_value.first.return_value = None
        elif name == "PersonDocument":
            q.join.return_value.filter.return_value.order_by.return_value.first.return_value = None
        else:
            q.filter.return_value.first.return_value = None
            q.filter.return_value.order_by.return_value.first.return_value = None
        return q

    db.query.side_effect = query_factory

    resp = client.get("/api/privacy/public-notice?doctor=DOC-7&consent=42")
    assert resp.status_code == 200
    cs = resp.json().get("consent_state") or {}
    assert cs.get("id") == 42
    assert cs.get("already_accepted") is False
    assert cs.get("patient_first_name") == "Juan"
    # No exponer apellidos
    assert "García" not in str(cs.get("patient_first_name"))
