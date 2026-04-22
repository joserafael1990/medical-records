"""CFDI 4.0 schemas (request/response bodies)."""
from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import Optional

from pydantic import Field

from .base import BaseSchema


# ----------------------------------------------------------------------
# Issuer (perfil fiscal del médico)
# ----------------------------------------------------------------------


class IssuerBase(BaseSchema):
    rfc: str = Field(min_length=12, max_length=13)
    legal_name: str = Field(min_length=1, max_length=300)
    tax_regime: str = Field(min_length=3, max_length=3)
    postal_code: str = Field(min_length=5, max_length=5)
    invoice_series: Optional[str] = "CORTEX"


class IssuerCreate(IssuerBase):
    """Los CSDs y password se mandan en `POST /issuers/csd` (multipart), no aquí."""
    pass


class IssuerUpdate(BaseSchema):
    rfc: Optional[str] = Field(default=None, min_length=12, max_length=13)
    legal_name: Optional[str] = None
    tax_regime: Optional[str] = Field(default=None, min_length=3, max_length=3)
    postal_code: Optional[str] = Field(default=None, min_length=5, max_length=5)
    invoice_series: Optional[str] = None


class IssuerResponse(IssuerBase):
    id: int
    doctor_id: int
    is_active: bool
    has_csd: bool
    csd_expires_at: Optional[datetime] = None
    invoice_folio_counter: int
    created_at: datetime
    updated_at: datetime


# ----------------------------------------------------------------------
# Invoice
# ----------------------------------------------------------------------


class InvoiceCreate(BaseSchema):
    consultation_id: Optional[int] = None
    patient_id: Optional[int] = None

    # Receptor (si patient_id se da, hay merge con datos del paciente;
    # estos sobreescriben). Si no hay patient_id ni receptor_rfc → XAXX... público.
    receptor_rfc: Optional[str] = Field(default=None, min_length=12, max_length=13)
    receptor_name: Optional[str] = None
    receptor_postal_code: Optional[str] = Field(default=None, min_length=5, max_length=5)
    receptor_tax_regime: Optional[str] = Field(default=None, min_length=3, max_length=3)
    cfdi_use: Optional[str] = Field(default=None, min_length=3, max_length=3)

    # Importes (sin IVA — honorarios médicos son 0% IVA)
    subtotal: Decimal = Field(gt=0, max_digits=12, decimal_places=2)
    currency: str = "MXN"
    payment_form: str = Field(default="03", min_length=2, max_length=3)  # 03 = Transferencia
    payment_method: str = Field(default="PUE", min_length=3, max_length=3)

    # Concepto
    service_description: str = Field(min_length=1, max_length=1000)
    sat_product_code: str = Field(default="85121501", min_length=6, max_length=10)
    sat_unit_code: str = Field(default="E48", min_length=1, max_length=10)


class InvoiceCancel(BaseSchema):
    motive: str = Field(min_length=2, max_length=2)  # 01|02|03|04
    substitute_uuid: Optional[str] = None


class InvoiceResponse(BaseSchema):
    id: int
    issuer_id: int
    doctor_id: int
    patient_id: Optional[int]
    consultation_id: Optional[int]

    facturama_id: Optional[str]
    uuid_sat: Optional[str]
    serie: Optional[str]
    folio: Optional[str]

    receptor_rfc: str
    receptor_name: str
    receptor_postal_code: str
    receptor_tax_regime: str
    cfdi_use: str

    subtotal: Decimal
    total: Decimal
    currency: str
    payment_form: str
    payment_method: str

    service_description: str
    sat_product_code: str
    sat_unit_code: str

    pdf_url: Optional[str]
    xml_url: Optional[str]

    status: str
    cancellation_reason: Optional[str]
    cancellation_substitute_uuid: Optional[str]
    cancelled_at: Optional[datetime]
    error_message: Optional[str]

    created_at: datetime
    updated_at: datetime
