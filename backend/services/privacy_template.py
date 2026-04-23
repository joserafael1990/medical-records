"""Render per-doctor privacy notice from a shared template.

Business rule: la plantilla del aviso de privacidad paciente-médico vive
una sola vez en `privacy_notices` (versión global). Cuando un médico la
emite a su paciente, el contenido se *renderiza* inyectando los datos
del médico como Responsable. Esto permite:

1. Un solo texto legal mantenido centralmente.
2. Cada médico aparece como Responsable con sus datos propios.
3. Actualizar la plantilla (v2) no invalida consents v1 — cada consent
   guarda hash del texto exacto aceptado.
"""

from __future__ import annotations

import hashlib
from dataclasses import dataclass
from typing import Optional

from sqlalchemy.orm import Session

from database import (
    Document,
    Office,
    Person,
    PersonDocument,
    PrivacyNotice,
    Specialty,
)


class MissingDoctorLegalDataError(ValueError):
    """El médico no tiene los campos obligatorios para emitir un aviso válido.

    Lanzado en lugar de rellenar con placeholders: un aviso sin domicilio
    del Responsable o sin medio ARCO no cumple LFPDPPP Art. 16 y nos deja
    expuestos. Preferimos bloquear el envío a enviar uno inválido.
    """


@dataclass
class RenderedNotice:
    notice_id: int
    version: str
    title: str
    content: str
    short_summary: str
    effective_date: str
    content_hash: str


def _require(value: Optional[str], field: str) -> str:
    if not value or not str(value).strip():
        raise MissingDoctorLegalDataError(
            f"El médico no tiene capturado el campo '{field}' requerido para emitir el aviso de privacidad."
        )
    return str(value).strip()


def _compose_office_address(office: Office) -> str:
    """Compone un domicilio legible desde los campos del Office."""
    parts = [
        (office.address or "").strip(),
        (office.city or "").strip(),
        (office.postal_code or "").strip(),
    ]
    return ", ".join(p for p in parts if p)


def _resolve_cedula(db: Session, doctor: Person) -> str:
    """Fallback en cascada:
      1. `persons.professional_license`.
      2. `person_documents` con `documents.name='Cédula Profesional'`
         (el flujo de registro QuickRegisterView la guarda aquí, no en
         el campo denormalizado de `persons`).
    """
    explicit = (doctor.professional_license or "").strip()
    if explicit:
        return explicit

    row = (
        db.query(PersonDocument)
        .join(Document, Document.id == PersonDocument.document_id)
        .filter(
            PersonDocument.person_id == doctor.id,
            PersonDocument.is_active.is_(True),
            Document.name == "Cédula Profesional",
        )
        .order_by(PersonDocument.id.asc())
        .first()
    )
    if row and (row.document_value or "").strip():
        return row.document_value.strip()

    raise MissingDoctorLegalDataError(
        "El médico no tiene capturada su cédula profesional (NOM-024-SSA3-2012)."
    )


def _resolve_legal_address(db: Session, doctor: Person) -> str:
    """Fallback en cascada:
      1. `persons.legal_address` (override explícito del doctor).
      2. Primer consultorio activo del doctor (address + city + postal_code).

    Sin ninguna fuente válida → MissingDoctorLegalDataError.
    """
    explicit = (doctor.legal_address or "").strip()
    if explicit:
        return explicit

    office = (
        db.query(Office)
        .filter(Office.doctor_id == doctor.id, Office.is_active.is_(True))
        .order_by(Office.id.asc())
        .first()
    )
    if office:
        composed = _compose_office_address(office)
        if composed:
            return composed

    raise MissingDoctorLegalDataError(
        "El médico no tiene capturado el domicilio legal (LFPDPPP Art. 16 fracc. I). "
        "Configure `legal_address` en el perfil o registre un consultorio activo con dirección."
    )


def _doctor_context(db: Session, doctor: Person) -> dict:
    specialty_name = ""
    if doctor.specialty_id:
        spec = db.query(Specialty).filter(Specialty.id == doctor.specialty_id).first()
        specialty_name = spec.name if spec else ""

    # Fallback en cascada para el email ARCO:
    #   arco_contact_email (override) → email de login.
    # Sin ninguno el paciente no puede ejercer ARCO — abortar.
    arco_email = (doctor.arco_contact_email or doctor.email or "").strip()

    return {
        "doctor_title": (doctor.title or "Dr.").strip(),
        "doctor_name": _require(doctor.name, "nombre completo"),
        "doctor_cedula": _resolve_cedula(db, doctor),
        "doctor_specialty": specialty_name or "(sin especialidad registrada)",
        "doctor_legal_address": _resolve_legal_address(db, doctor),
        "doctor_arco_email": _require(arco_email, "email de contacto ARCO"),
    }


def _substitute(text: str, ctx: dict, version: str, effective_date: str) -> str:
    """Sustitución de placeholders estilo mustache sin engine externo."""
    result = text
    all_vars = {**ctx, "notice_version": version, "effective_date": effective_date}
    for key, value in all_vars.items():
        result = result.replace("{{" + key + "}}", value)
    return result


def render_active_notice(db: Session, doctor: Person) -> RenderedNotice:
    """Renderiza el aviso activo para este doctor.

    Lanza MissingDoctorLegalDataError si faltan campos legales del doctor.
    Lanza LookupError si no hay plantilla activa en BD.
    """
    notice = (
        db.query(PrivacyNotice)
        .filter(PrivacyNotice.is_active.is_(True))
        .order_by(PrivacyNotice.effective_date.desc())
        .first()
    )
    if notice is None:
        raise LookupError("No hay plantilla de aviso de privacidad activa en la base de datos.")

    ctx = _doctor_context(db, doctor)
    effective_date = notice.effective_date.isoformat() if notice.effective_date else ""

    rendered_content = _substitute(notice.content, ctx, notice.version, effective_date)
    rendered_summary = _substitute(notice.short_summary or "", ctx, notice.version, effective_date)
    rendered_title = f"{notice.title} — {ctx['doctor_title']} {ctx['doctor_name']}"

    content_hash = hashlib.sha256(rendered_content.encode("utf-8")).hexdigest()

    return RenderedNotice(
        notice_id=notice.id,
        version=notice.version,
        title=rendered_title,
        content=rendered_content,
        short_summary=rendered_summary,
        effective_date=effective_date,
        content_hash=content_hash,
    )
