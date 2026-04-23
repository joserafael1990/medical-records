"""CFDI 4.0 invoicing routes (Facturama multi-emisor).

Endpoints:
  - GET    /api/cfdi/issuer                  perfil fiscal del médico actual
  - POST   /api/cfdi/issuer                  crear perfil fiscal
  - PUT    /api/cfdi/issuer                  actualizar perfil fiscal
  - POST   /api/cfdi/issuer/csd              subir CSDs (multipart)
  - DELETE /api/cfdi/issuer/csd              borrar CSDs (desactivar facturación)
  - GET    /api/cfdi/invoices                listar facturas del médico actual
  - POST   /api/cfdi/invoices                emitir factura
  - GET    /api/cfdi/invoices/{id}           detalle
  - POST   /api/cfdi/invoices/{id}/cancel    cancelar
  - GET    /api/cfdi/invoices/{id}/pdf       descargar PDF (base64)
  - GET    /api/cfdi/invoices/{id}/xml       descargar XML (base64)
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile
from sqlalchemy.orm import Session

from database import CfdiIssuer, CfdiInvoice, Person, get_db
from dependencies import get_current_user
from audit_service import audit_service
from logger import get_logger
from schemas.cfdi import (
    IssuerCreate,
    IssuerUpdate,
    InvoiceCancel,
    InvoiceCreate,
)
from services.cfdi import (
    CsdVault,
    FacturamaClient,
    FacturamaConfigError,
    FacturamaError,
)
from services.cfdi.cfdi_service import (
    cancel_invoice,
    emit_invoice,
    find_consultation_for_doctor,
    issuer_to_response,
    resolve_receptor,
)

api_logger = get_logger("cortex.cfdi")
router = APIRouter(prefix="/api/cfdi", tags=["cfdi"])

# Aviso legal reutilizable. Mismo patrón que LEGAL_NOTICE en digital_signature.py.
# Documenta que CORTEX no asesora fiscalmente — mitiga que un médico alegue
# "el sistema me dijo que usara X régimen o clave SAT".
CFDI_LEGAL_NOTICE = (
    "CORTEX emite CFDIs conforme a los datos capturados y los transmite al SAT "
    "a través de Facturama (PAC autorizado). No sustituye asesoría contable ni "
    "fiscal. El emisor es responsable de régimen fiscal, claves SAT, uso CFDI y "
    "obligaciones accesorias (ISR, DIOT, declaraciones). CORTEX no declara "
    "impuestos ni asume la responsabilidad fiscal de los comprobantes emitidos."
)


def _require_doctor(user: Person) -> None:
    if user.person_type != "doctor":
        raise HTTPException(status_code=403, detail="Sólo médicos pueden facturar")


def _get_issuer(db: Session, doctor_id: int) -> Optional[CfdiIssuer]:
    return db.query(CfdiIssuer).filter(CfdiIssuer.doctor_id == doctor_id).first()


def _get_invoice_for_doctor(
    db: Session, *, invoice_id: int, doctor_id: int
) -> CfdiInvoice:
    invoice = (
        db.query(CfdiInvoice)
        .filter(CfdiInvoice.id == invoice_id, CfdiInvoice.doctor_id == doctor_id)
        .first()
    )
    if not invoice:
        raise HTTPException(status_code=404, detail="Factura no encontrada")
    return invoice


# ======================================================================
# Issuer (perfil fiscal del médico)
# ======================================================================


@router.get("/issuer")
async def get_my_issuer(
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user),
):
    _require_doctor(current_user)
    issuer = _get_issuer(db, current_user.id)
    if not issuer:
        return None
    return issuer_to_response(issuer)


@router.post("/issuer", status_code=201)
async def create_my_issuer(
    payload: IssuerCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user),
):
    _require_doctor(current_user)
    if _get_issuer(db, current_user.id):
        raise HTTPException(status_code=409, detail="Ya tienes un perfil fiscal configurado")

    issuer = CfdiIssuer(
        doctor_id=current_user.id,
        rfc=payload.rfc.upper(),
        legal_name=payload.legal_name,
        tax_regime=payload.tax_regime,
        postal_code=payload.postal_code,
        invoice_series=payload.invoice_series or "CORTEX",
        is_active=False,  # se activa al subir CSDs
    )
    db.add(issuer)
    db.commit()
    db.refresh(issuer)

    audit_service.log_action(
        db=db,
        action="CREATE",
        user=current_user,
        request=request,
        table_name="cfdi_issuers",
        record_id=issuer.id,
        operation_type="cfdi_issuer_create",
        new_values={"rfc": issuer.rfc, "legal_name": issuer.legal_name},
    )
    return issuer_to_response(issuer)


@router.put("/issuer")
async def update_my_issuer(
    payload: IssuerUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user),
):
    _require_doctor(current_user)
    issuer = _get_issuer(db, current_user.id)
    if not issuer:
        raise HTTPException(status_code=404, detail="Perfil fiscal no encontrado")

    before = {
        "rfc": issuer.rfc,
        "legal_name": issuer.legal_name,
        "tax_regime": issuer.tax_regime,
        "postal_code": issuer.postal_code,
        "invoice_series": issuer.invoice_series,
    }
    if payload.rfc:
        issuer.rfc = payload.rfc.upper()
    if payload.legal_name:
        issuer.legal_name = payload.legal_name
    if payload.tax_regime:
        issuer.tax_regime = payload.tax_regime
    if payload.postal_code:
        issuer.postal_code = payload.postal_code
    if payload.invoice_series:
        issuer.invoice_series = payload.invoice_series

    db.commit()
    db.refresh(issuer)

    audit_service.log_action(
        db=db,
        action="UPDATE",
        user=current_user,
        request=request,
        table_name="cfdi_issuers",
        record_id=issuer.id,
        operation_type="cfdi_issuer_update",
        old_values=before,
        new_values={
            "rfc": issuer.rfc,
            "legal_name": issuer.legal_name,
            "tax_regime": issuer.tax_regime,
            "postal_code": issuer.postal_code,
            "invoice_series": issuer.invoice_series,
        },
    )
    return issuer_to_response(issuer)


@router.post("/issuer/csd")
async def upload_csd(
    request: Request,
    cer_file: UploadFile = File(...),
    key_file: UploadFile = File(...),
    password: str = Form(...),
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user),
):
    _require_doctor(current_user)
    issuer = _get_issuer(db, current_user.id)
    if not issuer:
        raise HTTPException(
            status_code=400,
            detail="Crea primero tu perfil fiscal (POST /api/cfdi/issuer)",
        )

    cer_bytes = await cer_file.read()
    key_bytes = await key_file.read()
    if not cer_bytes or not key_bytes:
        raise HTTPException(status_code=400, detail="Archivos .cer y .key son requeridos")
    if not password:
        raise HTTPException(status_code=400, detail="Password es requerido")

    # Cifrar y persistir
    vault = CsdVault()
    issuer.csd_cer_encrypted = vault.encrypt_binary(cer_bytes)
    issuer.csd_key_encrypted = vault.encrypt_binary(key_bytes)
    issuer.csd_password_encrypted = vault.encrypt_password(password)

    # Registrar CSD en Facturama (el RFC es la identidad del emisor,
    # no hay "crear emisor" aparte). Si ya existe, actualizamos con PUT.
    try:
        client = FacturamaClient()
        import base64
        cer_b64 = base64.b64encode(cer_bytes).decode("ascii")
        key_b64 = base64.b64encode(key_bytes).decode("ascii")
        try:
            client.upload_csd(
                rfc=issuer.rfc,
                cer_base64=cer_b64,
                key_base64=key_b64,
                password=password,
            )
        except FacturamaError as e:
            # Si el RFC ya tenía CSD, Facturama devuelve 409/400 al POST;
            # intentamos PUT para actualizarlo.
            if e.status_code in (400, 409):
                client.update_csd(
                    rfc=issuer.rfc,
                    cer_base64=cer_b64,
                    key_base64=key_b64,
                    password=password,
                )
            else:
                raise
        # El "customer_id" conceptual es el RFC en multi-emisor.
        issuer.facturama_customer_id = issuer.rfc
    except (FacturamaError, FacturamaConfigError) as e:
        api_logger.error(f"Facturama CSD registration failed: {e}")
        db.rollback()
        raise HTTPException(
            status_code=502,
            detail=f"No se pudo registrar CSD en Facturama: {e}",
        )

    issuer.is_active = True
    db.commit()
    db.refresh(issuer)

    audit_service.log_action(
        db=db,
        action="UPDATE",
        user=current_user,
        request=request,
        table_name="cfdi_issuers",
        record_id=issuer.id,
        operation_type="cfdi_csd_upload",
        new_values={"has_csd": True},
        security_level="WARNING",
    )
    return issuer_to_response(issuer)


@router.delete("/issuer/csd")
async def delete_csd(
    request: Request,
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user),
):
    _require_doctor(current_user)
    issuer = _get_issuer(db, current_user.id)
    if not issuer:
        raise HTTPException(status_code=404, detail="Perfil fiscal no encontrado")

    # Borrar en Facturama primero (si existe)
    if issuer.facturama_customer_id:
        try:
            FacturamaClient().delete_csd(issuer.rfc)
        except (FacturamaError, FacturamaConfigError) as e:
            api_logger.warning(f"Facturama delete_csd returned error (continuing): {e}")

    issuer.csd_cer_encrypted = None
    issuer.csd_key_encrypted = None
    issuer.csd_password_encrypted = None
    issuer.csd_expires_at = None
    issuer.facturama_customer_id = None
    issuer.is_active = False
    db.commit()
    db.refresh(issuer)

    audit_service.log_action(
        db=db,
        action="DELETE",
        user=current_user,
        request=request,
        table_name="cfdi_issuers",
        record_id=issuer.id,
        operation_type="cfdi_csd_delete",
        security_level="WARNING",
    )
    return issuer_to_response(issuer)


# ======================================================================
# Invoices
# ======================================================================


@router.get("/invoices")
async def list_invoices(
    limit: int = 50,
    offset: int = 0,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user),
):
    _require_doctor(current_user)
    q = db.query(CfdiInvoice).filter(CfdiInvoice.doctor_id == current_user.id)
    if status:
        q = q.filter(CfdiInvoice.status == status)
    q = q.order_by(CfdiInvoice.created_at.desc()).limit(min(limit, 200)).offset(offset)
    return [_invoice_to_dict(inv) for inv in q.all()]


@router.get("/invoices/{invoice_id}")
async def get_invoice(
    invoice_id: int,
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user),
):
    _require_doctor(current_user)
    invoice = _get_invoice_for_doctor(db, invoice_id=invoice_id, doctor_id=current_user.id)
    return _invoice_to_dict(invoice)


@router.post("/invoices", status_code=201)
async def create_invoice(
    payload: InvoiceCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user),
):
    _require_doctor(current_user)
    issuer = _get_issuer(db, current_user.id)
    if not issuer or not issuer.is_active:
        raise HTTPException(
            status_code=400,
            detail="Configura tu perfil fiscal y sube tus CSDs antes de facturar",
        )

    # Validar consulta (si viene)
    consultation_id = payload.consultation_id
    patient_id = payload.patient_id
    if consultation_id:
        consultation = find_consultation_for_doctor(
            db, consultation_id=consultation_id, doctor_id=current_user.id
        )
        if not consultation:
            raise HTTPException(status_code=404, detail="Consulta no encontrada")
        patient_id = patient_id or consultation.patient_id

    receptor = resolve_receptor(
        db,
        issuer=issuer,
        patient_id=patient_id,
        override_rfc=payload.receptor_rfc,
        override_name=payload.receptor_name,
        override_postal_code=payload.receptor_postal_code,
        override_tax_regime=payload.receptor_tax_regime,
        override_cfdi_use=payload.cfdi_use,
    )

    try:
        client = FacturamaClient()
        invoice = emit_invoice(
            db,
            doctor=current_user,
            issuer=issuer,
            receptor=receptor,
            subtotal=payload.subtotal,
            currency=payload.currency,
            payment_form=payload.payment_form,
            payment_method=payload.payment_method,
            service_description=payload.service_description,
            sat_product_code=payload.sat_product_code,
            sat_unit_code=payload.sat_unit_code,
            consultation_id=consultation_id,
            patient_id=patient_id,
            client=client,
        )
    except FacturamaConfigError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except FacturamaError as e:
        raise HTTPException(
            status_code=502, detail=f"Error emitiendo CFDI: {e}"
        )

    audit_service.log_action(
        db=db,
        action="CREATE",
        user=current_user,
        request=request,
        table_name="cfdi_invoices",
        record_id=invoice.id,
        operation_type="cfdi_invoice_emit",
        affected_patient_id=patient_id,
        new_values={
            "uuid_sat": invoice.uuid_sat,
            "total": float(invoice.total),
            "receptor_rfc": invoice.receptor_rfc,
        },
        security_level="WARNING",
    )
    return _invoice_to_dict(invoice)


@router.post("/invoices/{invoice_id}/cancel")
async def cancel_invoice_endpoint(
    invoice_id: int,
    payload: InvoiceCancel,
    request: Request,
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user),
):
    _require_doctor(current_user)
    invoice = _get_invoice_for_doctor(db, invoice_id=invoice_id, doctor_id=current_user.id)

    if payload.motive == "01" and not payload.substitute_uuid:
        raise HTTPException(
            status_code=400,
            detail="Motivo 01 requiere UUID del CFDI que sustituye",
        )
    if payload.motive not in ("01", "02", "03", "04"):
        raise HTTPException(status_code=400, detail="Motivo inválido (01-04)")

    try:
        client = FacturamaClient()
        invoice = cancel_invoice(
            db,
            invoice=invoice,
            motive=payload.motive,
            substitute_uuid=payload.substitute_uuid,
            client=client,
        )
    except (FacturamaError, FacturamaConfigError) as e:
        raise HTTPException(status_code=502, detail=f"Error cancelando: {e}")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    audit_service.log_action(
        db=db,
        action="UPDATE",
        user=current_user,
        request=request,
        table_name="cfdi_invoices",
        record_id=invoice.id,
        operation_type="cfdi_invoice_cancel",
        new_values={"status": "cancelled", "motive": payload.motive},
        security_level="WARNING",
    )
    return _invoice_to_dict(invoice)


@router.get("/invoices/{invoice_id}/pdf")
async def download_invoice_pdf(
    invoice_id: int,
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user),
):
    _require_doctor(current_user)
    invoice = _get_invoice_for_doctor(db, invoice_id=invoice_id, doctor_id=current_user.id)
    if not invoice.facturama_id:
        raise HTTPException(status_code=400, detail="Factura sin ID de Facturama")
    try:
        client = FacturamaClient()
        b64 = client.get_cfdi_pdf_base64(invoice.facturama_id)
    except (FacturamaError, FacturamaConfigError) as e:
        raise HTTPException(status_code=502, detail=str(e))
    return {"filename": f"{invoice.serie}-{invoice.folio}.pdf", "base64": b64}


@router.get("/invoices/{invoice_id}/xml")
async def download_invoice_xml(
    invoice_id: int,
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user),
):
    _require_doctor(current_user)
    invoice = _get_invoice_for_doctor(db, invoice_id=invoice_id, doctor_id=current_user.id)
    if not invoice.facturama_id:
        raise HTTPException(status_code=400, detail="Factura sin ID de Facturama")
    try:
        client = FacturamaClient()
        b64 = client.get_cfdi_xml_base64(invoice.facturama_id)
    except (FacturamaError, FacturamaConfigError) as e:
        raise HTTPException(status_code=502, detail=str(e))
    return {"filename": f"{invoice.serie}-{invoice.folio}.xml", "base64": b64}


# ----------------------------------------------------------------------


def _invoice_to_dict(inv: CfdiInvoice) -> dict:
    return {
        "id": inv.id,
        "issuer_id": inv.issuer_id,
        "doctor_id": inv.doctor_id,
        "patient_id": inv.patient_id,
        "consultation_id": inv.consultation_id,
        "facturama_id": inv.facturama_id,
        "uuid_sat": inv.uuid_sat,
        "serie": inv.serie,
        "folio": inv.folio,
        "receptor_rfc": inv.receptor_rfc,
        "receptor_name": inv.receptor_name,
        "receptor_postal_code": inv.receptor_postal_code,
        "receptor_tax_regime": inv.receptor_tax_regime,
        "cfdi_use": inv.cfdi_use,
        "subtotal": float(inv.subtotal) if inv.subtotal is not None else None,
        "total": float(inv.total) if inv.total is not None else None,
        "currency": inv.currency,
        "payment_form": inv.payment_form,
        "payment_method": inv.payment_method,
        "service_description": inv.service_description,
        "sat_product_code": inv.sat_product_code,
        "sat_unit_code": inv.sat_unit_code,
        "pdf_url": inv.pdf_url,
        "xml_url": inv.xml_url,
        "status": inv.status,
        "cancellation_reason": inv.cancellation_reason,
        "cancellation_substitute_uuid": inv.cancellation_substitute_uuid,
        "cancelled_at": inv.cancelled_at.isoformat() if inv.cancelled_at else None,
        "error_message": inv.error_message,
        "created_at": inv.created_at.isoformat() if inv.created_at else None,
        "updated_at": inv.updated_at.isoformat() if inv.updated_at else None,
    }
