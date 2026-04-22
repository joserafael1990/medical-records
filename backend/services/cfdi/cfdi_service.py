"""Business logic CFDI: resolución de receptor, folio, emisión y cancelación.

Separado de routes/cfdi.py para que sea unit-testeable sin FastAPI.
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from decimal import Decimal
from typing import Optional

from sqlalchemy.orm import Session

from database import CfdiIssuer, CfdiInvoice, MedicalRecord, Person

from .facturama_client import FacturamaClient, FacturamaError

# RFC genérico "Público en General" — CFDI 4.0 exige receptor completo
PUBLIC_RFC = "XAXX010101000"
PUBLIC_NAME = "PUBLICO EN GENERAL"
PUBLIC_TAX_REGIME = "616"  # Sin obligaciones fiscales
PUBLIC_CFDI_USE = "S01"    # Sin efectos fiscales

# Uso CFDI por defecto cuando el paciente sí tiene RFC
DEFAULT_NOMINATIVE_USE = "D01"  # Honorarios médicos, dentales y gastos hospitalarios

# Clave SAT para servicios médicos generales
DEFAULT_SAT_PRODUCT = "85121501"


@dataclass(frozen=True)
class ReceptorData:
    rfc: str
    name: str
    postal_code: str
    tax_regime: str
    cfdi_use: str


def resolve_receptor(
    db: Session,
    *,
    issuer: CfdiIssuer,
    patient_id: Optional[int],
    override_rfc: Optional[str],
    override_name: Optional[str],
    override_postal_code: Optional[str],
    override_tax_regime: Optional[str],
    override_cfdi_use: Optional[str],
) -> ReceptorData:
    """Combina datos del paciente + overrides + defaults públicos.

    Prioridad por campo: override > paciente > público genérico.
    Si no hay patient_id y no hay override_rfc → fallback total a XAXX.
    """
    patient: Optional[Person] = None
    if patient_id is not None:
        patient = db.query(Person).filter(Person.id == patient_id).first()

    def pick(override, patient_value, public):
        for v in (override, patient_value, public):
            if v:
                return v
        return public

    # Si no hay RFC real disponible, todo el receptor colapsa al público.
    real_rfc = (override_rfc or (patient.rfc if patient else None) or "").strip().upper()
    if not real_rfc or real_rfc == PUBLIC_RFC:
        return ReceptorData(
            rfc=PUBLIC_RFC,
            name=PUBLIC_NAME,
            # Público en general: CP de expedición = CP del emisor
            postal_code=override_postal_code or issuer.postal_code,
            tax_regime=PUBLIC_TAX_REGIME,
            cfdi_use=PUBLIC_CFDI_USE,
        )

    return ReceptorData(
        rfc=real_rfc,
        name=pick(
            override_name,
            patient.name if patient else None,
            PUBLIC_NAME,
        ),
        postal_code=pick(
            override_postal_code,
            patient.address_postal_code if patient else None,
            issuer.postal_code,
        ),
        tax_regime=pick(
            override_tax_regime,
            patient.tax_regime if patient else None,
            PUBLIC_TAX_REGIME,
        ),
        cfdi_use=pick(
            override_cfdi_use,
            patient.cfdi_default_use if patient else None,
            DEFAULT_NOMINATIVE_USE,
        ),
    )


def next_folio(db: Session, issuer: CfdiIssuer) -> str:
    """Incrementa y persiste el contador. Llamar dentro de una transacción activa."""
    issuer.invoice_folio_counter = (issuer.invoice_folio_counter or 0) + 1
    db.flush()
    return str(issuer.invoice_folio_counter)


def emit_invoice(
    db: Session,
    *,
    doctor: Person,
    issuer: CfdiIssuer,
    receptor: ReceptorData,
    subtotal: Decimal,
    currency: str,
    payment_form: str,
    payment_method: str,
    service_description: str,
    sat_product_code: str,
    sat_unit_code: str,
    consultation_id: Optional[int],
    patient_id: Optional[int],
    client: FacturamaClient,
) -> CfdiInvoice:
    """Emite CFDI en Facturama y persiste `cfdi_invoices`.

    Honorarios médicos = 0% IVA (Art. 15 LIVA). Total == Subtotal.
    """
    total = subtotal
    folio = next_folio(db, issuer)

    payload = FacturamaClient.build_cfdi_payload(
        issuer_rfc=issuer.rfc,
        issuer_name=issuer.legal_name,
        issuer_tax_regime=issuer.tax_regime,
        issuer_postal_code=issuer.postal_code,
        receptor_rfc=receptor.rfc,
        receptor_name=receptor.name,
        receptor_postal_code=receptor.postal_code,
        receptor_tax_regime=receptor.tax_regime,
        cfdi_use=receptor.cfdi_use,
        payment_form=payment_form,
        payment_method=payment_method,
        currency=currency,
        serie=issuer.invoice_series or "CORTEX",
        folio=folio,
        sat_product_code=sat_product_code,
        sat_unit_code=sat_unit_code,
        service_description=service_description,
        subtotal=float(subtotal),
        total=float(total),
    )

    invoice = CfdiInvoice(
        issuer_id=issuer.id,
        doctor_id=doctor.id,
        patient_id=patient_id,
        consultation_id=consultation_id,
        serie=issuer.invoice_series or "CORTEX",
        folio=folio,
        receptor_rfc=receptor.rfc,
        receptor_name=receptor.name,
        receptor_postal_code=receptor.postal_code,
        receptor_tax_regime=receptor.tax_regime,
        cfdi_use=receptor.cfdi_use,
        subtotal=subtotal,
        total=total,
        currency=currency,
        payment_form=payment_form,
        payment_method=payment_method,
        service_description=service_description,
        sat_product_code=sat_product_code,
        sat_unit_code=sat_unit_code,
        status="issued",
    )

    try:
        response = client.issue_cfdi(payload)
    except FacturamaError as e:
        invoice.status = "error"
        invoice.error_message = str(e)[:1000]
        db.add(invoice)
        db.commit()
        raise

    invoice.facturama_id = response.get("Id") or response.get("id")
    # Facturama retorna el UUID SAT en TaxStamp.Uuid (a veces también en raíz).
    tax_stamp = response.get("TaxStamp") or {}
    invoice.uuid_sat = (
        tax_stamp.get("Uuid") if isinstance(tax_stamp, dict) else None
    ) or response.get("Uuid") or response.get("UUID")
    # Facturama no devuelve URLs directas; los PDF/XML se obtienen on-demand
    # via `/Cfdi/{format}/issuedLite/{id}`. Dejamos nulos aquí.
    invoice.pdf_url = None
    invoice.xml_url = None

    db.add(invoice)
    db.commit()
    db.refresh(invoice)
    return invoice


def cancel_invoice(
    db: Session,
    *,
    invoice: CfdiInvoice,
    motive: str,
    substitute_uuid: Optional[str],
    client: FacturamaClient,
) -> CfdiInvoice:
    if invoice.status == "cancelled":
        return invoice
    if not invoice.facturama_id:
        raise ValueError("Invoice has no Facturama ID — cannot cancel remote record")

    client.cancel_cfdi(
        invoice.facturama_id, motive=motive, substitute_uuid=substitute_uuid
    )
    invoice.status = "cancelled"
    invoice.cancellation_reason = motive
    invoice.cancellation_substitute_uuid = substitute_uuid
    invoice.cancelled_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(invoice)
    return invoice


def issuer_to_response(issuer: CfdiIssuer) -> dict:
    return {
        "id": issuer.id,
        "doctor_id": issuer.doctor_id,
        "rfc": issuer.rfc,
        "legal_name": issuer.legal_name,
        "tax_regime": issuer.tax_regime,
        "postal_code": issuer.postal_code,
        "invoice_series": issuer.invoice_series,
        "invoice_folio_counter": issuer.invoice_folio_counter or 0,
        "is_active": bool(issuer.is_active),
        "has_csd": bool(
            issuer.csd_cer_encrypted
            and issuer.csd_key_encrypted
            and issuer.csd_password_encrypted
        ),
        "csd_expires_at": issuer.csd_expires_at,
        "created_at": issuer.created_at,
        "updated_at": issuer.updated_at,
    }


# Validaciones de consulta
def find_consultation_for_doctor(
    db: Session, *, consultation_id: int, doctor_id: int
) -> Optional[MedicalRecord]:
    return (
        db.query(MedicalRecord)
        .filter(
            MedicalRecord.id == consultation_id,
            MedicalRecord.doctor_id == doctor_id,
        )
        .first()
    )
