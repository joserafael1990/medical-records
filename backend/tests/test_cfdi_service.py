"""Unit tests for cfdi_service (mocked DB, no real SQL)."""
from __future__ import annotations

import os
import sys
from types import SimpleNamespace
from unittest.mock import MagicMock

BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

os.environ["MEDICAL_ENCRYPTION_KEY"] = "unit-test-cfdi-key-do-not-use-in-prod"

import pytest  # noqa: E402

from services.cfdi.cfdi_service import (  # noqa: E402
    DEFAULT_NOMINATIVE_USE,
    PUBLIC_CFDI_USE,
    PUBLIC_NAME,
    PUBLIC_RFC,
    PUBLIC_TAX_REGIME,
    next_folio,
    resolve_receptor,
)


def _issuer(**overrides):
    return SimpleNamespace(
        id=1,
        doctor_id=1,
        rfc=overrides.get("rfc", "XAXX010101000"),
        legal_name=overrides.get("legal_name", "Dr Test"),
        tax_regime=overrides.get("tax_regime", "612"),
        postal_code=overrides.get("postal_code", "06000"),
        invoice_series="CORTEX",
        invoice_folio_counter=0,
        is_active=True,
    )


def _patient(**overrides):
    return SimpleNamespace(
        id=overrides.get("id", 10),
        person_type="patient",
        name=overrides.get("name", "Juan Pérez"),
        rfc=overrides.get("rfc"),
        address_postal_code=overrides.get("address_postal_code"),
        tax_regime=overrides.get("tax_regime"),
        cfdi_default_use=overrides.get("cfdi_default_use"),
    )


def _db_returning(patient):
    db = MagicMock()
    db.query.return_value.filter.return_value.first.return_value = patient
    return db


# ------------------------------------------------------------------
# resolve_receptor
# ------------------------------------------------------------------


def test_collapses_to_public_when_patient_has_no_rfc():
    issuer = _issuer(postal_code="06000")
    db = _db_returning(_patient(rfc=None))

    r = resolve_receptor(
        db, issuer=issuer, patient_id=10,
        override_rfc=None, override_name=None,
        override_postal_code=None, override_tax_regime=None, override_cfdi_use=None,
    )
    assert r.rfc == PUBLIC_RFC
    assert r.name == PUBLIC_NAME
    assert r.tax_regime == PUBLIC_TAX_REGIME
    assert r.cfdi_use == PUBLIC_CFDI_USE
    assert r.postal_code == "06000"  # CP del emisor


def test_uses_patient_fiscal_data_when_complete():
    issuer = _issuer()
    db = _db_returning(
        _patient(
            rfc="peji900101abc",
            name="Juan Pérez",
            address_postal_code="64000",
            tax_regime="605",
            cfdi_default_use="G03",
        )
    )
    r = resolve_receptor(
        db, issuer=issuer, patient_id=10,
        override_rfc=None, override_name=None,
        override_postal_code=None, override_tax_regime=None, override_cfdi_use=None,
    )
    assert r.rfc == "PEJI900101ABC"
    assert r.name == "Juan Pérez"
    assert r.postal_code == "64000"
    assert r.tax_regime == "605"
    assert r.cfdi_use == "G03"


def test_patient_rfc_but_missing_fiscal_fields_uses_defaults():
    issuer = _issuer(postal_code="03100")
    db = _db_returning(_patient(rfc="PEJI900101ABC", name="Ana García"))

    r = resolve_receptor(
        db, issuer=issuer, patient_id=10,
        override_rfc=None, override_name=None,
        override_postal_code=None, override_tax_regime=None, override_cfdi_use=None,
    )
    assert r.rfc == "PEJI900101ABC"
    assert r.postal_code == "03100"  # cae al emisor
    assert r.tax_regime == PUBLIC_TAX_REGIME
    assert r.cfdi_use == DEFAULT_NOMINATIVE_USE


def test_overrides_beat_patient_data():
    issuer = _issuer()
    db = _db_returning(
        _patient(rfc="PEJI900101ABC", name="Ana", address_postal_code="64000")
    )
    r = resolve_receptor(
        db, issuer=issuer, patient_id=10,
        override_rfc="MMMM800101MM1",
        override_name="EMPRESA SA DE CV",
        override_postal_code="11000",
        override_tax_regime="601",
        override_cfdi_use="G03",
    )
    assert r.rfc == "MMMM800101MM1"
    assert r.name == "EMPRESA SA DE CV"
    assert r.postal_code == "11000"
    assert r.tax_regime == "601"
    assert r.cfdi_use == "G03"


def test_no_patient_returns_public():
    issuer = _issuer()
    db = MagicMock()
    r = resolve_receptor(
        db, issuer=issuer, patient_id=None,
        override_rfc=None, override_name=None,
        override_postal_code=None, override_tax_regime=None, override_cfdi_use=None,
    )
    assert r.rfc == PUBLIC_RFC
    assert r.cfdi_use == PUBLIC_CFDI_USE


def test_explicit_public_rfc_does_not_borrow_patient_name():
    """Si el cliente manda XAXX010101000 explícito, no usamos el name del paciente."""
    issuer = _issuer()
    db = _db_returning(_patient(rfc="ABCD900101XXX", name="Juan Pérez"))
    r = resolve_receptor(
        db, issuer=issuer, patient_id=10,
        override_rfc="XAXX010101000",
        override_name=None,
        override_postal_code=None, override_tax_regime=None, override_cfdi_use=None,
    )
    assert r.rfc == PUBLIC_RFC
    assert r.name == PUBLIC_NAME
    assert r.cfdi_use == PUBLIC_CFDI_USE


# ------------------------------------------------------------------
# next_folio
# ------------------------------------------------------------------


def test_next_folio_increments_in_memory_counter():
    issuer = _issuer()
    db = MagicMock()
    assert next_folio(db, issuer) == "1"
    assert next_folio(db, issuer) == "2"
    assert issuer.invoice_folio_counter == 2
    assert db.flush.call_count == 2
