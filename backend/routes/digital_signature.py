"""
Firma electrónica simple para recetas y órdenes de estudios clínicos (Fase 1).

Endpoints:
  - GET  /api/doctor/signature-profile              perfil del firmante
  - PUT  /api/doctor/signature-profile              actualizar cédula/RFC/CURP
  - POST /api/prescriptions/{id}/sign               firmar receta
  - GET  /api/prescriptions/{id}/verify             verificar receta (auth)
  - POST /api/clinical-studies/{id}/sign            firmar orden de estudio
  - GET  /api/clinical-studies/{id}/verify          verificar orden (auth)
  - GET  /api/verify/{verification_uuid}            verificación PÚBLICA sin auth

La verificación pública expone solo metadatos del documento (nombre del médico,
cédula, fecha, tipo, medicamento/estudio). NO expone PHI del paciente ni
detalles clínicos — eso violaría LFPDPPP.
"""
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from database import (
    get_db,
    Person,
    ConsultationPrescription,
    ClinicalStudy,
    MedicalRecord,
    Document,
    PersonDocument,
)
from dependencies import get_current_user
from audit_service import audit_service
from logger import get_logger
from services import digital_signature as dsvc

api_logger = get_logger("cortex.signature")
router = APIRouter(prefix="/api", tags=["digital-signature"])

# Nombres de Document (catálogo) que representan cédula/identidad profesional.
# Coincide con la resolución legacy que ya usa auth.py:249-256; si agregas un
# sinónimo ahí, agrégalo aquí también.
_CEDULA_DOC_NAMES = (
    "Cédula Profesional",
    "Número de Registro Profesional",
    "Número de Colegiación",
    "Matrícula Nacional",
)
_CURP_DOC_NAMES = ("CURP",)
_RFC_DOC_NAMES = ("RFC",)


def _resolve_signing_identity(db: Session, person: Person) -> dict:
    """
    Resuelve cédula/RFC/CURP priorizando las columnas directas de `persons`
    (alimentadas por PUT /signature-profile) y haciendo fallback a
    `PersonDocument` legacy cuando las columnas están vacías.

    Así un médico que capturó su cédula hace un año en el flujo viejo
    (Documentos profesionales) puede firmar sin re-capturar nada.
    """
    cedula = (person.professional_license or "").strip() or None
    rfc = (person.rfc or "").strip() or None
    curp = (person.curp or "").strip() or None

    if cedula and curp and rfc:
        return {"professional_license": cedula, "rfc": rfc, "curp": curp}

    # Fallback: construir mapa {doc_name → value} desde PersonDocument activos.
    rows = (
        db.query(PersonDocument)
        .join(Document)
        .filter(
            PersonDocument.person_id == person.id,
            PersonDocument.is_active.is_(True),
        )
        .all()
    )
    doc_map: dict[str, str] = {}
    for row in rows:
        name = row.document.name if row.document else None
        if name and row.document_value:
            doc_map.setdefault(name, row.document_value.strip())

    if not cedula:
        for name in _CEDULA_DOC_NAMES:
            if name in doc_map:
                cedula = doc_map[name]
                break
    if not curp:
        for name in _CURP_DOC_NAMES:
            if name in doc_map:
                curp = doc_map[name]
                break
    if not rfc:
        for name in _RFC_DOC_NAMES:
            if name in doc_map:
                rfc = doc_map[name]
                break

    return {"professional_license": cedula, "rfc": rfc, "curp": curp}

# Aviso legal requerido en toda salida que contenga firma generada por CORTEX.
# La firma es electrónica SIMPLE (Art. 89-bis Código de Comercio), no avanzada.
# Evita que farmacias, laboratorios o pacientes asuman equivalencia con e.firma
# SAT o con documentos protegidos por Constancia NOM-151-SCFI-2016.
LEGAL_NOTICE = (
    "Las firmas electrónicas generadas por CORTEX corresponden al supuesto del "
    "Art. 89-bis del Código de Comercio (firma electrónica simple). Para "
    "documentos que requieran firma electrónica avanzada o conservación con "
    "NOM-151-SCFI-2016, consulte nuestros planes Premium."
)


def _utf8_json(content: dict) -> JSONResponse:
    """
    Force Content-Type: application/json; charset=utf-8 so non-browser
    clients (mobile QR scanners, older HTTP libs) don't interpret the UTF-8
    bytes as latin-1. Without the explicit charset, the legal_notice text
    (with ó, ú, é) renders as mojibake ("electrÃ³nicas") in some apps.
    """
    return JSONResponse(content=content, media_type="application/json; charset=utf-8")


# ---- Signer profile -----------------------------------------------------------

def _profile_payload(db: Session, user: Person) -> dict:
    ident = _resolve_signing_identity(db, user)
    cedula = ident["professional_license"]
    rfc = ident["rfc"]
    curp = ident["curp"]
    return {
        "professional_license": cedula,
        "rfc": rfc,
        "curp": curp,
        "cedula_valid": dsvc.validate_cedula_format(cedula),
        "rfc_valid": dsvc.validate_rfc_format(rfc),
        "curp_valid": dsvc.validate_curp_format(curp),
        "can_sign": dsvc.validate_cedula_format(cedula),
        # source: 'direct' si salió de persons.*, 'legacy_documents' si del fallback.
        # Útil para decidir si mostrar en UI el CTA "migrar a nuevo flujo".
        "source": "direct" if user.professional_license else "legacy_documents",
    }


@router.get("/doctor/signature-profile")
async def get_signature_profile(
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user),
):
    return _profile_payload(db, current_user)


@router.put("/doctor/signature-profile")
async def update_signature_profile(
    payload: dict,
    request: Request,
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user),
):
    if current_user.person_type != "doctor":
        raise HTTPException(status_code=403, detail="Sólo médicos pueden configurar firma")

    cedula = (payload.get("professional_license") or "").strip()
    rfc = (payload.get("rfc") or "").strip().upper()
    curp = (payload.get("curp") or "").strip().upper()

    if cedula and not dsvc.validate_cedula_format(cedula):
        raise HTTPException(status_code=400, detail="Cédula profesional inválida (6-10 dígitos)")
    if rfc and not dsvc.validate_rfc_format(rfc):
        raise HTTPException(status_code=400, detail="RFC inválido")
    if curp and not dsvc.validate_curp_format(curp):
        raise HTTPException(status_code=400, detail="CURP inválido")

    current_user.professional_license = cedula or None
    current_user.rfc = rfc or None
    current_user.curp = curp or None
    db.commit()
    db.refresh(current_user)

    audit_service.log_action(
        db=db,
        action="UPDATE",
        user=current_user,
        request=request,
        table_name="persons",
        record_id=current_user.id,
        operation_type="signature_profile_update",
    )
    return _profile_payload(db, current_user)


# ---- Helpers ------------------------------------------------------------------

def _require_signer_ready(db: Session, user: Person) -> str:
    """Devuelve la cédula efectiva (persons.* o PersonDocument fallback) o 400."""
    ident = _resolve_signing_identity(db, user)
    cedula = ident["professional_license"]
    if not dsvc.validate_cedula_format(cedula):
        raise HTTPException(
            status_code=400,
            detail="Registra tu cédula profesional antes de firmar documentos",
        )
    return cedula


def _apply_signature(obj, manifest: dict, user: Person) -> None:
    obj.digital_signature = manifest
    obj.signature_hash = manifest["signature_hash"]
    obj.verification_uuid = manifest["verification_uuid"]
    obj.signed_at = dsvc.now_cdmx()
    obj.signer_person_id = user.id


# ---- Prescription -------------------------------------------------------------

def _load_prescription(db: Session, prescription_id: int, user: Person) -> ConsultationPrescription:
    rx = (
        db.query(ConsultationPrescription)
        .filter(ConsultationPrescription.id == prescription_id)
        .first()
    )
    if not rx:
        raise HTTPException(status_code=404, detail="Receta no encontrada")
    consultation = (
        db.query(MedicalRecord)
        .filter(
            MedicalRecord.id == rx.consultation_id,
            MedicalRecord.doctor_id == user.id,
        )
        .first()
    )
    if not consultation:
        raise HTTPException(status_code=403, detail="No tienes acceso a esta receta")
    return rx


def _prescription_payload(db: Session, rx: ConsultationPrescription) -> dict:
    patient = None
    if rx.consultation_id:
        consultation = db.query(MedicalRecord).filter(MedicalRecord.id == rx.consultation_id).first()
        if consultation:
            patient = db.query(Person).filter(Person.id == consultation.patient_id).first()
    medication_name = rx.medication.name if rx.medication else ""
    return dsvc.build_prescription_payload(rx, medication_name, patient.name if patient else "")


@router.post("/prescriptions/{prescription_id}/sign")
async def sign_prescription(
    prescription_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user),
):
    cedula = _require_signer_ready(db, current_user)
    rx = _load_prescription(db, prescription_id, current_user)

    if rx.digital_signature:
        raise HTTPException(status_code=409, detail="La receta ya está firmada")

    payload = _prescription_payload(db, rx)
    manifest = dsvc.sign_payload(payload, current_user.id, cedula)
    _apply_signature(rx, manifest, current_user)
    db.commit()
    db.refresh(rx)

    consultation = db.query(MedicalRecord).filter(MedicalRecord.id == rx.consultation_id).first()
    audit_service.log_action(
        db=db,
        action="CREATE",
        user=current_user,
        request=request,
        table_name="consultation_prescriptions",
        record_id=rx.id,
        operation_type="signature_created",
        affected_patient_id=consultation.patient_id if consultation else None,
        metadata={
            "verification_uuid": manifest["verification_uuid"],
            "signature_hash": manifest["signature_hash"],
            "document_type": "prescription",
        },
    )
    api_logger.info(
        "✅ Prescription signed",
        extra={
            "prescription_id": rx.id,
            "doctor_id": current_user.id,
            "verification_uuid": manifest["verification_uuid"],
        },
    )
    return _utf8_json({
        "prescription_id": rx.id,
        "signed_at": manifest["signed_at"],
        "verification_uuid": manifest["verification_uuid"],
        "signature_hash": manifest["signature_hash"],
        "signer_cedula": manifest["signer_cedula"],
        "algorithm": manifest["algorithm"],
        "legal_notice": LEGAL_NOTICE,
    })


@router.get("/prescriptions/{prescription_id}/verify")
async def verify_prescription(
    prescription_id: int,
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user),
):
    rx = _load_prescription(db, prescription_id, current_user)
    if not rx.digital_signature:
        return {"signed": False}
    payload = _prescription_payload(db, rx)
    valid = dsvc.verify_payload(payload, rx.digital_signature)
    return {
        "signed": True,
        "valid": valid,
        "verification_uuid": rx.verification_uuid,
        "signature_hash": rx.signature_hash,
        "signed_at": rx.signed_at.isoformat() if rx.signed_at else None,
    }


# ---- Clinical study -----------------------------------------------------------

def _load_study(db: Session, study_id: int, user: Person) -> ClinicalStudy:
    study = (
        db.query(ClinicalStudy)
        .filter(
            ClinicalStudy.id == study_id,
            ClinicalStudy.created_by == user.id,
        )
        .first()
    )
    if not study:
        raise HTTPException(status_code=404, detail="Orden de estudio no encontrada")
    return study


def _study_payload(db: Session, study: ClinicalStudy) -> dict:
    patient = db.query(Person).filter(Person.id == study.patient_id).first() if study.patient_id else None
    return dsvc.build_study_payload(study, patient.name if patient else "")


@router.post("/clinical-studies/{study_id}/sign")
async def sign_clinical_study(
    study_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user),
):
    cedula = _require_signer_ready(db, current_user)
    study = _load_study(db, study_id, current_user)
    if study.digital_signature:
        raise HTTPException(status_code=409, detail="La orden ya está firmada")

    payload = _study_payload(db, study)
    manifest = dsvc.sign_payload(payload, current_user.id, cedula)
    _apply_signature(study, manifest, current_user)
    db.commit()
    db.refresh(study)

    audit_service.log_action(
        db=db,
        action="CREATE",
        user=current_user,
        request=request,
        table_name="clinical_studies",
        record_id=study.id,
        operation_type="signature_created",
        affected_patient_id=study.patient_id,
        metadata={
            "verification_uuid": manifest["verification_uuid"],
            "signature_hash": manifest["signature_hash"],
            "document_type": "clinical_study",
        },
    )
    api_logger.info(
        "✅ Clinical study signed",
        extra={
            "study_id": study.id,
            "doctor_id": current_user.id,
            "verification_uuid": manifest["verification_uuid"],
        },
    )
    return _utf8_json({
        "study_id": study.id,
        "signed_at": manifest["signed_at"],
        "verification_uuid": manifest["verification_uuid"],
        "signature_hash": manifest["signature_hash"],
        "signer_cedula": manifest["signer_cedula"],
        "algorithm": manifest["algorithm"],
        "legal_notice": LEGAL_NOTICE,
    })


@router.get("/clinical-studies/{study_id}/verify")
async def verify_clinical_study(
    study_id: int,
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user),
):
    study = _load_study(db, study_id, current_user)
    if not study.digital_signature:
        return {"signed": False}
    payload = _study_payload(db, study)
    valid = dsvc.verify_payload(payload, study.digital_signature)
    return {
        "signed": True,
        "valid": valid,
        "verification_uuid": study.verification_uuid,
        "signature_hash": study.signature_hash,
        "signed_at": study.signed_at.isoformat() if study.signed_at else None,
    }


# ---- Public verification (no auth) -------------------------------------------

@router.get("/verify/{verification_uuid}")
async def verify_public(verification_uuid: str, db: Session = Depends(get_db)):
    """
    Verificación pública por UUID. Expone sólo metadatos no sensibles:
    tipo de documento, nombre y cédula del médico, fecha, y nombre del
    medicamento o estudio. No expone paciente, diagnóstico ni instrucciones.
    """
    rx = (
        db.query(ConsultationPrescription)
        .filter(ConsultationPrescription.verification_uuid == verification_uuid)
        .first()
    )
    if rx:
        doctor = db.query(Person).filter(Person.id == rx.signer_person_id).first() if rx.signer_person_id else None
        # Prefer signer_cedula frozen in the manifest (immutable since signing);
        # fall back to live resolution via _resolve_signing_identity (handles
        # PersonDocument legacy). doctor.professional_license alone misses
        # doctors whose cédula lives in PersonDocument only.
        cedula = None
        if isinstance(rx.digital_signature, dict):
            cedula = rx.digital_signature.get("signer_cedula")
        if not cedula and doctor:
            cedula = _resolve_signing_identity(db, doctor).get("professional_license")
        payload = _prescription_payload(db, rx)
        valid = dsvc.verify_payload(payload, rx.digital_signature)
        return _utf8_json({
            "document_type": "prescription",
            "valid": valid,
            "doctor_name": doctor.full_name if doctor else None,
            "professional_license": cedula,
            "signed_at": rx.signed_at.isoformat() if rx.signed_at else None,
            "medication": rx.medication.name if rx.medication else None,
            "signature_hash": rx.signature_hash,
            "legal_notice": LEGAL_NOTICE,
        })

    study = (
        db.query(ClinicalStudy)
        .filter(ClinicalStudy.verification_uuid == verification_uuid)
        .first()
    )
    if study:
        doctor = db.query(Person).filter(Person.id == study.signer_person_id).first() if study.signer_person_id else None
        cedula = None
        if isinstance(study.digital_signature, dict):
            cedula = study.digital_signature.get("signer_cedula")
        if not cedula and doctor:
            cedula = _resolve_signing_identity(db, doctor).get("professional_license")
        payload = _study_payload(db, study)
        valid = dsvc.verify_payload(payload, study.digital_signature)
        return _utf8_json({
            "document_type": "clinical_study",
            "valid": valid,
            "doctor_name": doctor.full_name if doctor else None,
            "professional_license": cedula,
            "signed_at": study.signed_at.isoformat() if study.signed_at else None,
            "study_name": study.study_name,
            "signature_hash": study.signature_hash,
            "legal_notice": LEGAL_NOTICE,
        })

    raise HTTPException(status_code=404, detail="Documento no encontrado")
