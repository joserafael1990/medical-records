"""Unit tests for services.privacy_template.

Exercises the renderer in isolation. The important contracts:

1. A doctor with all legal fields gets a hydrated notice.
2. A doctor missing any of {name, cédula, legal_address, arco_contact_email}
   raises MissingDoctorLegalDataError — never a silently-invalid notice.
3. The `content_hash` is deterministic across calls with the same inputs,
   so a consent's `rendered_content_hash` proves exactly what was accepted.
"""

from __future__ import annotations

import os
import sys
from types import SimpleNamespace
from unittest.mock import MagicMock

import pytest

BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from services.privacy_template import (  # noqa: E402
    MissingDoctorLegalDataError,
    render_active_notice,
)


def _template() -> SimpleNamespace:
    return SimpleNamespace(
        id=42,
        version="v1",
        title="Aviso de Privacidad del Médico al Paciente",
        content=(
            "Responsable: {{doctor_title}} {{doctor_name}}\n"
            "Cédula: {{doctor_cedula}}\n"
            "Especialidad: {{doctor_specialty}}\n"
            "Domicilio: {{doctor_legal_address}}\n"
            "ARCO: {{doctor_arco_email}}\n"
            "Versión: {{notice_version}} — {{effective_date}}"
        ),
        short_summary="{{doctor_title}} {{doctor_name}} es Responsable.",
        effective_date=SimpleNamespace(isoformat=lambda: "2026-04-22"),
        is_active=True,
    )


def _doctor(**overrides) -> SimpleNamespace:
    d = SimpleNamespace(
        id=1,
        title="Dr.",
        name="Juan Pérez",
        professional_license="1234567",
        specialty_id=10,
        email="juan@x.com",
        arco_contact_email="arco@x.com",
        legal_address="Av. Test 1, CDMX",
    )
    for k, v in overrides.items():
        setattr(d, k, v)
    return d


def _db_with(
    template,
    specialty_name: str = "Medicina Interna",
    office=None,
    person_document=None,
) -> MagicMock:
    """Fabrica una sesión SQLAlchemy que devuelve la plantilla, la
    especialidad, (opcionalmente) el primer consultorio y (opcionalmente)
    el person_document de cédula profesional."""
    db = MagicMock()
    privacy_query = MagicMock()
    privacy_query.filter.return_value.order_by.return_value.first.return_value = template

    specialty_query = MagicMock()
    specialty_query.filter.return_value.first.return_value = SimpleNamespace(name=specialty_name)

    office_query = MagicMock()
    office_query.filter.return_value.order_by.return_value.first.return_value = office

    person_doc_query = MagicMock()
    person_doc_query.join.return_value.filter.return_value.order_by.return_value.first.return_value = person_document

    def side_effect(model):
        name = model.__name__
        if name == "PrivacyNotice":
            return privacy_query
        if name == "Specialty":
            return specialty_query
        if name == "Office":
            return office_query
        if name == "PersonDocument":
            return person_doc_query
        raise AssertionError(f"Unexpected query on {model!r}")

    db.query.side_effect = side_effect
    return db


def test_renders_with_all_fields_present():
    db = _db_with(_template())
    rendered = render_active_notice(db, _doctor())

    assert rendered.notice_id == 42
    assert rendered.version == "v1"
    assert "Dr. Juan Pérez" in rendered.content
    assert "1234567" in rendered.content
    assert "Medicina Interna" in rendered.content
    assert "Av. Test 1, CDMX" in rendered.content
    assert "arco@x.com" in rendered.content
    assert "2026-04-22" in rendered.content
    assert "{{" not in rendered.content  # no dejó placeholders sin sustituir
    assert rendered.title.endswith("Dr. Juan Pérez")


def test_hash_is_deterministic():
    db1 = _db_with(_template())
    db2 = _db_with(_template())
    h1 = render_active_notice(db1, _doctor()).content_hash
    h2 = render_active_notice(db2, _doctor()).content_hash
    assert h1 == h2
    assert len(h1) == 64  # SHA-256 hex


def test_hash_differs_when_doctor_data_differs():
    db = _db_with(_template())
    h1 = render_active_notice(db, _doctor(legal_address="Dirección A")).content_hash

    db2 = _db_with(_template())
    h2 = render_active_notice(db2, _doctor(legal_address="Dirección B")).content_hash
    assert h1 != h2


@pytest.mark.parametrize(
    "missing_field,override",
    [
        ("name", {"name": None}),
        ("arco_email", {"arco_contact_email": None, "email": None}),
    ],
)
def test_raises_when_required_fields_missing(missing_field, override):
    db = _db_with(_template())
    with pytest.raises(MissingDoctorLegalDataError):
        render_active_notice(db, _doctor(**override))


def test_raises_when_no_cedula_anywhere():
    """Sin cédula en persons.professional_license Y sin person_document → bloquear."""
    db = _db_with(_template(), person_document=None)
    with pytest.raises(MissingDoctorLegalDataError):
        render_active_notice(db, _doctor(professional_license=None))


def test_falls_back_to_person_document_cedula():
    """QuickRegisterView guarda la cédula en person_documents, no en el
    campo denormalizado de persons. El renderer debe encontrarla ahí."""
    pd = SimpleNamespace(document_value="9999888", is_active=True)
    db = _db_with(_template(), person_document=pd)
    rendered = render_active_notice(db, _doctor(professional_license=None))
    assert "9999888" in rendered.content


def test_explicit_cedula_wins_over_person_document():
    pd = SimpleNamespace(document_value="NO-DEBE-USARSE", is_active=True)
    db = _db_with(_template(), person_document=pd)
    rendered = render_active_notice(db, _doctor(professional_license="1234567"))
    assert "1234567" in rendered.content
    assert "NO-DEBE-USARSE" not in rendered.content


def test_falls_back_to_office_address_when_legal_address_missing():
    """Si legal_address está vacío, usar la dirección del primer
    consultorio activo del doctor (address + city + postal_code).
    """
    office = SimpleNamespace(
        address="Av. Consultorio 99",
        city="Guadalajara",
        postal_code="44100",
    )
    db = _db_with(_template(), office=office)
    rendered = render_active_notice(db, _doctor(legal_address=""))
    assert "Av. Consultorio 99" in rendered.content
    assert "Guadalajara" in rendered.content
    assert "44100" in rendered.content


def test_raises_when_no_legal_address_and_no_office():
    """Sin legal_address explícito Y sin consultorio → bloquear."""
    db = _db_with(_template(), office=None)
    with pytest.raises(MissingDoctorLegalDataError):
        render_active_notice(db, _doctor(legal_address=""))


def test_explicit_legal_address_wins_over_office():
    """El override explícito en persons.legal_address tiene prioridad
    sobre la dirección del consultorio."""
    office = SimpleNamespace(
        address="Consultorio que NO debe usarse",
        city="Mty",
        postal_code="64000",
    )
    db = _db_with(_template(), office=office)
    rendered = render_active_notice(
        db, _doctor(legal_address="Domicilio legal explícito CDMX")
    )
    assert "Domicilio legal explícito CDMX" in rendered.content
    assert "Consultorio que NO debe usarse" not in rendered.content


def test_falls_back_to_primary_email_for_arco_when_arco_email_missing():
    db = _db_with(_template())
    rendered = render_active_notice(
        db, _doctor(arco_contact_email=None, email="backup@x.com")
    )
    assert "backup@x.com" in rendered.content


def test_raises_when_no_active_template():
    db = MagicMock()
    db.query.return_value.filter.return_value.order_by.return_value.first.return_value = None
    with pytest.raises(LookupError):
        render_active_notice(db, _doctor())


def test_missing_specialty_falls_back_without_raising():
    """specialty_id=None → placeholder legible, sin excepción."""
    db = _db_with(_template())
    rendered = render_active_notice(db, _doctor(specialty_id=None))
    assert "(sin especialidad registrada)" in rendered.content
