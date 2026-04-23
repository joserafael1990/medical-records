"""
Privacy and ARCO endpoints
Migrated from main_clean_english.py to improve code organization
"""

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from sqlalchemy import text
from pydantic import BaseModel
from datetime import datetime
from typing import Optional
import uuid
import os

from database import (
    get_db, Person, PrivacyNotice, PrivacyConsent, ARCORequest,
    MedicalRecord, ClinicalStudy, ConsultationPrescription,
    ConsultationVitalSign, PersonDocument,
    LegalDocument,
)
from utils.datetime_utils import utc_now
from dependencies import get_current_user
from logger import get_logger
from audit_service import audit_service
from services.arco_export_service import (
    ARCOExportBundle,
    build_zip as arco_build_zip,
    serialize_clinical_study,
    serialize_consultation,
    serialize_patient,
    serialize_prescription,
    serialize_privacy_consent,
    serialize_vital_sign,
)
from services.privacy_template import (
    MissingDoctorLegalDataError,
    render_active_notice,
)

api_logger = get_logger("api")

router = APIRouter(prefix="/api", tags=["privacy"])


class SendPrivacyNoticeRequest(BaseModel):
    patient_id: int
    method: str = "whatsapp_button"


class GenerateConsentLinkRequest(BaseModel):
    patient_id: int


class AcceptPublicConsentRequest(BaseModel):
    consent_id: int
    # SHA-256 del aviso que se le mostró al paciente. El backend exige que
    # coincida con `PrivacyConsent.rendered_content_hash` para bloquear dos
    # ataques: (a) reemitir con texto stale tras actualizar la plantilla;
    # (b) aceptar un consent que pertenece a otro flujo.
    content_hash: str


@router.get("/privacy/active-notice")
async def get_active_privacy_notice(
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user),
):
    """Retorna el aviso de privacidad RENDERIZADO con los datos del doctor
    autenticado. Útil para previsualización antes de enviarlo a un paciente.

    Si el médico no tiene los campos legales completos (domicilio, email
    ARCO, cédula), devuelve 400 con la lista de campos faltantes en vez
    de renderizar con placeholders.
    """
    try:
        rendered = render_active_notice(db, current_user)
        return {
            "id": rendered.notice_id,
            "version": rendered.version,
            "title": rendered.title,
            "content": rendered.content,
            "short_summary": rendered.short_summary,
            "effective_date": rendered.effective_date,
            "content_hash": rendered.content_hash,
        }
    except MissingDoctorLegalDataError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except LookupError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/privacy/send-whatsapp-notice")
async def send_whatsapp_privacy_notice(
    request_data: SendPrivacyNoticeRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user)
):
    """
    Envía aviso de privacidad al paciente vía WhatsApp con botón interactivo
    """
    try:
        # Verificar que el paciente existe
        patient = db.query(Person).filter(
            Person.id == request_data.patient_id,
            Person.person_type == 'patient'
        ).first()
        
        if not patient:
            raise HTTPException(status_code=404, detail="Paciente no encontrado")
        
        # Verificar que el doctor tiene relación con este paciente
        # Permitir si:
        # 1. El paciente fue creado por este doctor (created_by)
        # 2. O existe una consulta entre el doctor y el paciente
        # 3. O el usuario es admin
        has_consultation = db.query(MedicalRecord).filter(
            MedicalRecord.patient_id == request_data.patient_id,
            MedicalRecord.doctor_id == current_user.id
        ).first() is not None
        
        is_patient_creator = patient.created_by == current_user.id
        
        if not has_consultation and not is_patient_creator and current_user.person_type != 'admin':
            raise HTTPException(
                status_code=403,
                detail="No tienes permiso para enviar avisos a este paciente"
            )
        
        # Verificar que el paciente tiene teléfono
        if not patient.primary_phone:
            raise HTTPException(
                status_code=400,
                detail="El paciente no tiene teléfono registrado"
            )
        
        # Desencriptar el teléfono del paciente si está encriptado
        from encryption import EncryptionService
        encryption_service = EncryptionService()
        try:
            patient_phone_decrypted = encryption_service.decrypt_sensitive_data(patient.primary_phone)
            api_logger.debug(f"Phone decrypted: {patient_phone_decrypted[:15]}...")
        except Exception as e:
            # Si falla la desencriptación, usar el número tal cual (puede no estar encriptado)
            api_logger.warning(f"Could not decrypt phone, using as-is: {str(e)}")
            patient_phone_decrypted = patient.primary_phone
        
        # Log del número que se va a usar
        api_logger.info(f"📞 Sending WhatsApp to patient phone: {patient_phone_decrypted}")
        
        # Verificar si ya tiene un consentimiento aceptado CON ESTE MÉDICO.
        # Scope por doctor: el consent del paciente con el Dr. A no aplica
        # al Dr. B (son Responsables distintos bajo LFPDPPP).
        existing_consent = db.query(PrivacyConsent).filter(
            PrivacyConsent.patient_id == request_data.patient_id,
            PrivacyConsent.doctor_id == current_user.id,
            PrivacyConsent.consent_given == True,
        ).order_by(PrivacyConsent.created_at.desc()).first()

        if existing_consent:
                return {
                    "success": False,
                    "message": "El paciente ya aceptó el aviso de privacidad con este médico",
                    "consent_id": existing_consent.id,
                    "accepted_at": existing_consent.consent_date.isoformat() if existing_consent.consent_date else None
                }

        # Renderizar aviso con datos del doctor actual como Responsable.
        # Si faltan campos legales del doctor, abortar con 400 en vez de
        # emitir un aviso inválido que nos exponga.
        try:
            rendered = render_active_notice(db, current_user)
        except MissingDoctorLegalDataError as e:
            raise HTTPException(status_code=400, detail=str(e))
        except LookupError as e:
            raise HTTPException(status_code=404, detail=str(e))

        # URL del aviso de privacidad público, con slug del doctor para
        # que el paciente vea el aviso con los datos del Responsable real.
        privacy_url = f"https://sistema.cortexclinico.com/privacy?doctor={current_user.person_code}"

        consent = PrivacyConsent(
            patient_id=request_data.patient_id,
            doctor_id=current_user.id,
            notice_id=rendered.notice_id,
            consent_given=False,  # Pendiente hasta que el paciente responda
            consent_date=utc_now(),
            rendered_content_hash=rendered.content_hash,
        )

        db.add(consent)
        db.commit()
        db.refresh(consent)
        
        # Enviar por WhatsApp con botón interactivo
        from whatsapp_service import get_whatsapp_service
        whatsapp = get_whatsapp_service()
        
        # Construir nombre del doctor con título separado para el template
        doctor_title = current_user.title or 'Dr.'
        doctor_full_name = current_user.name or 'Médico'
        doctor_name = f"{doctor_title} {doctor_full_name}"
        
        # Get patient first name (first word of full name)
        patient_first_name = patient.name.split()[0] if patient.name else 'Paciente'
        
        result = whatsapp.send_interactive_privacy_notice(
            patient_name=patient_first_name,
            patient_phone=patient_phone_decrypted,
            doctor_name=doctor_name,
            doctor_title=doctor_title,  # Título separado para el template
            doctor_full_name=doctor_full_name,  # Nombre completo sin título
            privacy_notice_url=privacy_url,
            consent_id=consent.id
        )
        
        api_logger.debug(f"WhatsApp result: {result}")
        
        if not result.get('success'):
            error_msg = result.get('error', 'Error desconocido')
            api_logger.warning(f"WhatsApp send failed: {error_msg}")
            
            # Si falla el envío, eliminar el consentimiento
            db.delete(consent)
            db.commit()
            
            # Detectar tipo de error y devolver código HTTP apropiado
            error_lower = str(error_msg).lower()
            if 'not configured' in error_lower or 'not configured' in error_msg:
                api_logger.info("Detected WhatsApp not configured error, returning 503")
                raise HTTPException(
                    status_code=503,
                    detail="Servicio de WhatsApp no configurado. Por favor, contacta al administrador del sistema para configurar las credenciales."
                )
            elif 'could not find a channel' in error_lower or 'channel_not_found' in error_lower or '63007' in error_msg:
                api_logger.warning("Detected WhatsApp channel not found error, returning 503")
                raise HTTPException(
                    status_code=503,
                    detail="El número de WhatsApp no está configurado en el Sandbox de Twilio. Por favor, conecta tu número de WhatsApp al Sandbox desde la consola de Twilio (Console > Messaging > WhatsApp Sandbox)."
                )
            else:
                api_logger.error(f"WhatsApp error (not configuration): {error_msg}")
                raise HTTPException(
                    status_code=500,
                    detail=f"Error al enviar WhatsApp: {error_msg}"
                )
        
        # Actualizar con message_id
        # WhatsApp message tracking removed - simplified schema
        db.commit()
        
        # Registrar en auditoría
        audit_service.log_action(
            db=db,
            action="PRIVACY_NOTICE_SENT",
            user=current_user,
            request=request,
            operation_type="send_privacy_notice_whatsapp",
            affected_patient_id=request_data.patient_id,
            affected_patient_name=patient.name or "Paciente",
            new_values={
                "method": "whatsapp_button",
                "phone": patient.primary_phone,
                "message_id": result.get('message_id'),
                "consent_id": consent.id
            },
            security_level='INFO'
        )
        
        return {
            "success": True,
            "message": "Aviso de privacidad enviado por WhatsApp con botón interactivo",
            "message_id": result.get('message_id'),
            "phone": patient.primary_phone,
            "consent_id": consent.id,
            "privacy_url": privacy_url
        }
        
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        error_traceback = traceback.format_exc()
        api_logger.error("Error sending privacy notice", error=str(e), exc_info=True)
        api_logger.error(f"Error sending privacy notice: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Error al enviar aviso de privacidad: {str(e)}"
        )


# ---------------------------------------------------------------------------
# Web-form acceptance flow — alternativa a WhatsApp.
# ---------------------------------------------------------------------------
# Motivación: el botón interactivo de WhatsApp depende de (a) aprobación
# del template en Meta, y (b) ventana de conversación de 24h. En producción
# hoy ambas son frágiles, lo que bloquea el consentimiento para pacientes
# nuevos. El flujo de aceptación web desacopla el canal (SMS, email, QR,
# WhatsApp manual) de la captura del consentimiento.
#
# Flujo:
#   1. Doctor llama POST /api/privacy/generate-link {patient_id}
#      → crea PrivacyConsent pendiente y retorna URL compartible.
#   2. Doctor comparte la URL por el canal que prefiera.
#   3. Paciente abre la página, lee el aviso renderizado, toca "Acepto".
#   4. Frontend llama POST /api/privacy/accept-public {consent_id, content_hash}.
#   5. Backend valida hash y flip consent_given=True.
# ---------------------------------------------------------------------------

@router.post("/privacy/generate-link")
async def generate_consent_link(
    request_data: GenerateConsentLinkRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user),
):
    """Crea un consent pendiente y retorna la URL pública compartible.

    Scope por doctor: el consent se ancla al médico autenticado. Si el
    paciente ya aceptó CON ESTE MÉDICO, retorna el consent existente en
    vez de duplicar (idempotente).
    """
    # Verificar paciente + acceso del doctor (mismo patrón que send-whatsapp)
    patient = db.query(Person).filter(
        Person.id == request_data.patient_id,
        Person.person_type == 'patient',
    ).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Paciente no encontrado")

    has_consultation = db.query(MedicalRecord).filter(
        MedicalRecord.patient_id == request_data.patient_id,
        MedicalRecord.doctor_id == current_user.id,
    ).first() is not None
    is_creator = patient.created_by == current_user.id
    if not has_consultation and not is_creator and current_user.person_type != 'admin':
        raise HTTPException(status_code=403, detail="No tiene acceso a este paciente")

    # ¿Consent ya aceptado con este doctor? idempotente
    existing_accepted = db.query(PrivacyConsent).filter(
        PrivacyConsent.patient_id == request_data.patient_id,
        PrivacyConsent.doctor_id == current_user.id,
        PrivacyConsent.consent_given.is_(True),
    ).order_by(PrivacyConsent.created_at.desc()).first()
    if existing_accepted:
        return {
            "success": False,
            "already_accepted": True,
            "message": "El paciente ya aceptó el aviso con este médico",
            "consent_id": existing_accepted.id,
            "accepted_at": existing_accepted.consent_date.isoformat() if existing_accepted.consent_date else None,
        }

    # Renderizar para capturar el hash del contenido que se le mostrará.
    try:
        rendered = render_active_notice(db, current_user)
    except MissingDoctorLegalDataError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except LookupError as e:
        raise HTTPException(status_code=404, detail=str(e))

    # ¿Hay consent pendiente previo con este mismo hash? reutilizarlo.
    pending = db.query(PrivacyConsent).filter(
        PrivacyConsent.patient_id == request_data.patient_id,
        PrivacyConsent.doctor_id == current_user.id,
        PrivacyConsent.consent_given.is_(False),
        PrivacyConsent.rendered_content_hash == rendered.content_hash,
    ).order_by(PrivacyConsent.created_at.desc()).first()

    if pending:
        consent = pending
    else:
        consent = PrivacyConsent(
            patient_id=request_data.patient_id,
            doctor_id=current_user.id,
            notice_id=rendered.notice_id,
            consent_given=False,
            consent_date=utc_now(),
            rendered_content_hash=rendered.content_hash,
        )
        db.add(consent)
        db.commit()
        db.refresh(consent)

    # La URL pública incluye doctor_slug (para que la página renderice el
    # aviso correcto) y consent_id (para que el botón Acepto sepa qué
    # consent flipear).
    # cortexclinico.com sirve la landing comercial; el app (con la página
    # pública del aviso) vive en sistema.cortexclinico.com. Sobrescribir vía
    # PUBLIC_FRONTEND_URL si el dominio del app cambia.
    base_url = os.getenv("PUBLIC_FRONTEND_URL", "https://sistema.cortexclinico.com")
    public_url = (
        f"{base_url}/privacy"
        f"?doctor={current_user.person_code}"
        f"&consent={consent.id}"
    )

    audit_service.log_action(
        db=db,
        action="PRIVACY_CONSENT_LINK_GENERATED",
        user=current_user,
        request=request,
        operation_type="generate_privacy_link",
        affected_patient_id=request_data.patient_id,
        affected_patient_name=patient.name or "Paciente",
        new_values={
            "consent_id": consent.id,
            "rendered_content_hash": rendered.content_hash,
        },
        security_level='INFO',
    )

    return {
        "success": True,
        "consent_id": consent.id,
        "url": public_url,
        "content_hash": rendered.content_hash,
    }


@router.post("/privacy/accept-public")
async def accept_public_consent(
    request_data: AcceptPublicConsentRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    """Aceptación del aviso desde la página pública, sin autenticación.

    Seguridad / evidencia legal:
      - El consent ya existe (el doctor lo creó vía generate-link),
        anclado a un patient_id y doctor_id específicos — no creamos
        pacientes desde endpoint público.
      - El hash del contenido debe coincidir con el que se le mostró:
        bloquea aceptar una versión distinta a la presentada.
      - Capturamos IP + user-agent del *servidor* (no del cliente) para
        valor probatorio.
      - Idempotente: si ya está aceptado, retorna OK sin re-marcar.
    """
    consent = db.query(PrivacyConsent).filter(
        PrivacyConsent.id == request_data.consent_id
    ).first()
    if not consent:
        raise HTTPException(status_code=404, detail="Consent no encontrado")

    # Validar hash — bloquea replay con contenido obsoleto.
    if consent.rendered_content_hash != request_data.content_hash:
        api_logger.warning(
            "Rechazo accept-public por hash mismatch",
            consent_id=consent.id,
            expected=consent.rendered_content_hash,
            got=request_data.content_hash,
        )
        raise HTTPException(
            status_code=409,
            detail="El aviso mostrado ya no es la versión vigente. Recarga la página.",
        )

    # Idempotencia: si ya está aceptado, responder OK sin cambios.
    if consent.consent_given:
        return {
            "success": True,
            "already_accepted": True,
            "consent_id": consent.id,
            "accepted_at": consent.consent_date.isoformat() if consent.consent_date else None,
        }

    # Capturar IP real (proxy/LB) + user-agent del servidor
    forwarded = request.headers.get('x-forwarded-for') if request and request.headers else None
    ip = (forwarded.split(',')[0].strip() if forwarded else (request.client.host if request and request.client else None))
    user_agent = request.headers.get('user-agent') if request and request.headers else None

    consent.consent_given = True
    consent.consent_date = utc_now()
    consent.ip_address = ip
    consent.user_agent = user_agent
    db.commit()
    db.refresh(consent)

    # Audit log CRÍTICO para defensa ante IFAI.
    patient = db.query(Person).filter(Person.id == consent.patient_id).first()
    audit_service.log_action(
        db=db,
        action="PRIVACY_CONSENT_ACCEPTED",
        user=None,  # paciente, no usuario del sistema
        request=request,
        operation_type="web_form_consent",
        affected_patient_id=consent.patient_id,
        affected_patient_name=(patient.name if patient else None) or "Paciente",
        new_values={
            "consent_id": consent.id,
            "doctor_id": consent.doctor_id,
            "rendered_content_hash": consent.rendered_content_hash,
            "method": "web_form",
            "ip": ip,
        },
        security_level='INFO',
    )

    return {
        "success": True,
        "already_accepted": False,
        "consent_id": consent.id,
        "accepted_at": consent.consent_date.isoformat() if consent.consent_date else None,
    }


@router.get("/privacy/consent-status/{patient_id}")
async def get_patient_consent_status(
    patient_id: int,
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user)
):
    """
    Obtiene el estado del consentimiento de privacidad de un paciente
    Permite acceso si el paciente existe (no requiere consulta previa para pacientes nuevos)
    """
    try:
        api_logger.debug(
            f"🔍 Getting consent status for patient {patient_id}",
            extra={"patient_id": patient_id, "doctor_id": current_user.id if current_user else None}
        )
        
        # Verificar que el paciente existe
        patient = db.query(Person).filter(
            Person.id == patient_id,
            Person.person_type == 'patient'
        ).first()
        
        if not patient:
            api_logger.warning(
                f"⚠️ Patient {patient_id} not found",
                extra={"patient_id": patient_id, "doctor_id": current_user.id if current_user else None}
            )
            raise HTTPException(status_code=404, detail="Paciente no encontrado")
        
        # Para doctores, permitir acceso sin requerir consulta previa
        # Esto permite crear consultas nuevas para pacientes nuevos
        if current_user.person_type == 'doctor':
            # Verificar que el paciente existe y está activo (acceso básico)
            # No requerir consulta previa para permitir creación de consultas nuevas
            if not patient.is_active:
                api_logger.warning(
                    f"⚠️ Patient {patient_id} is not active",
                    extra={"patient_id": patient_id, "doctor_id": current_user.id}
                )
                raise HTTPException(status_code=403, detail="El paciente no está activo")
        else:
            # Solo doctores pueden acceder
            api_logger.warning(
                f"⚠️ Non-doctor user trying to access consent status",
                extra={"patient_id": patient_id, "user_id": current_user.id, "user_type": current_user.person_type}
            )
            raise HTTPException(status_code=403, detail="Solo doctores pueden acceder al estado de consentimiento")
        
        # Buscar consentimiento más reciente con el doctor autenticado.
        # Scope por doctor_id: cada médico es Responsable independiente.
        consent = db.query(PrivacyConsent).filter(
            PrivacyConsent.patient_id == patient_id,
            PrivacyConsent.doctor_id == current_user.id,
        ).order_by(PrivacyConsent.created_at.desc()).first()
        
        if not consent:
            api_logger.debug(
                f"ℹ️ No consent found for patient {patient_id}",
                extra={"patient_id": patient_id, "doctor_id": current_user.id}
            )
            return {
                "has_consent": False,
                "status": "none",
                "message": "No se ha enviado aviso de privacidad a este paciente"
            }
        
        has_consent = consent.consent_given == True
        
        # Obtener información del aviso de privacidad
        privacy_notice = None
        if consent.notice_id:
            privacy_notice = db.query(PrivacyNotice).filter(
                PrivacyNotice.id == consent.notice_id
            ).first()
        
        # Convertir fecha a timezone CDMX
        import pytz
        cdmx_tz = pytz.timezone('America/Mexico_City')
        consent_date_cdmx = None
        if consent.consent_date:
            # Si la fecha no tiene timezone, asumir UTC y convertir a CDMX
            if consent.consent_date.tzinfo is None:
                consent_date_utc = pytz.utc.localize(consent.consent_date)
            else:
                consent_date_utc = consent.consent_date
            consent_date_cdmx = consent_date_utc.astimezone(cdmx_tz)
        
        api_logger.debug(
            f"✅ Consent status retrieved for patient {patient_id}",
            extra={"patient_id": patient_id, "has_consent": has_consent, "doctor_id": current_user.id}
        )
        
        # Determinar el método basado en cómo se envió (si fue por WhatsApp, el método es 'whatsapp_button')
        # Por defecto, si no hay información específica, asumimos WhatsApp ya que es el método principal
        consent_method = 'whatsapp_button'  # Default, ya que el sistema principal usa WhatsApp
        
        # URL del aviso de privacidad
        privacy_notice_url = 'https://sistema.cortexclinico.com/privacy'
        
        return {
            "has_consent": has_consent,
            "status": "accepted" if consent.consent_given else "pending",
            "consent": {
                "id": consent.id,
                "patient_id": consent.patient_id,
                "notice_id": consent.notice_id,
                "consent_given": consent.consent_given,
                "consent_date": consent_date_cdmx.isoformat() if consent_date_cdmx else None,
                "ip_address": consent.ip_address,
                "user_agent": consent.user_agent,
                "created_at": consent.created_at.isoformat() if consent.created_at else None,
                # Campos adicionales para el frontend
                "consent_method": consent_method,
                "privacy_notice_version": privacy_notice_url,
                "is_revoked": not consent.consent_given,  # Para compatibilidad con frontend
                "consent_status": "accepted" if consent.consent_given else "pending"
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        api_logger.error(
            f"❌ Error getting consent status for patient {patient_id}",
            extra={"patient_id": patient_id, "error": str(e)},
            exc_info=True
        )
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/privacy/revoke")
async def revoke_consent(
    request: Request,
    data: dict,
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user)
):
    """
    Revocar consentimiento de privacidad de un paciente
    """
    try:
        patient_id = data.get('patient_id')
        revocation_reason = data.get('revocation_reason', 'Revocado por el médico')
        
        # Verificar acceso
        if current_user.person_type == 'doctor':
            # Obtener el paciente para verificar created_by
            patient = db.query(Person).filter(
                Person.id == patient_id,
                Person.person_type == 'patient'
            ).first()
            
            if not patient:
                raise HTTPException(status_code=404, detail="Paciente no encontrado")
            
            # Permitir si:
            # 1. El paciente fue creado por este doctor (created_by)
            # 2. O existe una consulta entre el doctor y el paciente
            # 3. O el usuario es admin
            has_consultation = db.query(MedicalRecord).filter(
                MedicalRecord.patient_id == patient_id,
                MedicalRecord.doctor_id == current_user.id
            ).first() is not None
            
            is_patient_creator = patient.created_by == current_user.id
            
            if not has_consultation and not is_patient_creator:
                raise HTTPException(status_code=403, detail="No tiene acceso a este paciente")
        
        # Buscar consentimiento más reciente del médico actual con este paciente.
        # Scope por doctor_id: cada médico solo puede revocar sus propios consents.
        consent = db.query(PrivacyConsent).filter(
            PrivacyConsent.patient_id == patient_id,
            PrivacyConsent.doctor_id == current_user.id,
        ).order_by(PrivacyConsent.created_at.desc()).first()
        
        if not consent:
            raise HTTPException(status_code=404, detail="No se encontró consentimiento para este paciente")
        
        # Si ya está revocado (consent_given = False), no hacer nada
        if not consent.consent_given:
            raise HTTPException(status_code=400, detail="El consentimiento ya está revocado")
        
        # Revocar: Set consent_given to False
        # Usar timezone CDMX para la fecha
        import pytz
        cdmx_tz = pytz.timezone('America/Mexico_City')
        consent.consent_given = False
        consent.consent_date = datetime.now(cdmx_tz)
        
        db.commit()
        
        # Registrar en audit log
        audit_service.log_action(
            db=db,
            action='privacy_consent_revoked',
            user=current_user,
            request=request,
            table_name='privacy_consents',
            record_id=consent.id,
            new_values={'revocation_reason': revocation_reason, 'consent_given': False},
            operation_type='privacy_consent_revoke',
            affected_patient_id=patient_id,
            affected_patient_name=patient.name or "Paciente",
            security_level='WARNING',
            change_reason=revocation_reason
        )
        
        api_logger.info(
            f"✅ Consent revoked for patient {patient_id}",
            consent_id=consent.id,
            doctor_id=current_user.id
        )
        
        return {
            "success": True,
            "message": "Consentimiento revocado exitosamente",
            "consent_id": consent.id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        api_logger.error(f"Error revoking consent: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/privacy/arco-request")
async def create_arco_request(
    request: Request,
    data: dict,
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user)
):
    """
    Crear solicitud ARCO (Acceso, Rectificación, Cancelación, Oposición)
    """
    try:
        patient_id = data.get('patient_id')
        request_type = data.get('request_type')  # 'access', 'rectification', 'cancellation', 'opposition'
        description = data.get('description', '')
        contact_email = data.get('contact_email')
        contact_phone = data.get('contact_phone')
        
        if not patient_id or not request_type:
            raise HTTPException(status_code=400, detail="patient_id y request_type son requeridos")
        
        if request_type not in ['access', 'rectification', 'cancellation', 'opposition']:
            raise HTTPException(status_code=400, detail="request_type inválido")
        
        # Verificar acceso
        if current_user.person_type == 'doctor':
            # Obtener el paciente para verificar created_by
            patient = db.query(Person).filter(
                Person.id == patient_id,
                Person.person_type == 'patient'
            ).first()
            
            if not patient:
                raise HTTPException(status_code=404, detail="Paciente no encontrado")
            
            # Permitir si:
            # 1. El paciente fue creado por este doctor (created_by)
            # 2. O existe una consulta entre el doctor y el paciente
            # 3. O el usuario es admin
            has_consultation = db.query(MedicalRecord).filter(
                MedicalRecord.patient_id == patient_id,
                MedicalRecord.doctor_id == current_user.id
            ).first() is not None
            
            is_patient_creator = patient.created_by == current_user.id
            
            if not has_consultation and not is_patient_creator:
                raise HTTPException(status_code=403, detail="No tiene acceso a este paciente")
        
        # Crear solicitud ARCO scoped al doctor actual (Responsable).
        arco_request = ARCORequest(
            patient_id=patient_id,
            doctor_id=current_user.id,
            request_type=request_type,
            description=description,
            status='pending',
            processed_by=current_user.id,
            created_at=utc_now()
        )
        
        db.add(arco_request)
        db.commit()
        db.refresh(arco_request)
        
        # Registrar en audit log
        audit_service.log_action(
            db=db,
            action='arco_request_created',
            user=current_user,
            request=request,
            table_name='arco_requests',
            record_id=arco_request.id,
            new_values={'request_type': request_type, 'patient_id': patient_id},
            operation_type='arco_request_create',
            affected_patient_id=patient_id,
            security_level='INFO'
        )
        
        api_logger.info(
            f"✅ ARCO request created: {request_type}",
            request_id=arco_request.id,
            patient_id=patient_id,
            doctor_id=current_user.id
        )
        
        return {
            "success": True,
            "message": f"Solicitud ARCO ({request_type}) creada exitosamente",
            "arco_request": {
                "id": arco_request.id,
                "patient_id": arco_request.patient_id,
                "request_type": arco_request.request_type,
                "description": arco_request.description,
                "status": arco_request.status,
                "requested_at": arco_request.created_at.isoformat() if arco_request.created_at else None,
                "created_at": arco_request.created_at.isoformat()
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        api_logger.error(f"Error creating ARCO request: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/privacy/arco-requests/{patient_id}")
async def get_arco_requests(
    patient_id: int,
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user)
):
    """
    Obtener todas las solicitudes ARCO de un paciente
    """
    try:
        # Verificar acceso
        if current_user.person_type == 'doctor':
            # Obtener el paciente para verificar created_by
            patient = db.query(Person).filter(
                Person.id == patient_id,
                Person.person_type == 'patient'
            ).first()
            
            if not patient:
                raise HTTPException(status_code=404, detail="Paciente no encontrado")
            
            # Permitir si:
            # 1. El paciente fue creado por este doctor (created_by)
            # 2. O existe una consulta entre el doctor y el paciente
            # 3. O el usuario es admin
            has_consultation = db.query(MedicalRecord).filter(
                MedicalRecord.patient_id == patient_id,
                MedicalRecord.doctor_id == current_user.id
            ).first() is not None
            
            is_patient_creator = patient.created_by == current_user.id
            
            if not has_consultation and not is_patient_creator:
                raise HTTPException(status_code=403, detail="No tiene acceso a este paciente")
        
        # Obtener solicitudes ARCO del doctor actual con este paciente.
        # Scope por doctor_id: cada médico responde sus propios ARCOs.
        arco_requests = db.query(ARCORequest).filter(
            ARCORequest.patient_id == patient_id,
            ARCORequest.doctor_id == current_user.id,
        ).order_by(ARCORequest.created_at.desc()).all()
        
        return {
            "arco_requests": [
                {
                    "id": req.id,
                    "patient_id": req.patient_id,
                    "request_type": req.request_type,
                    "description": getattr(req, 'description', None),  # En BD es "description", no "request_description"
                    "status": req.status,
                    "contact_email": getattr(req, 'contact_email', None),  # Field may not exist in model
                    "contact_phone": getattr(req, 'contact_phone', None),  # Field may not exist in model
                    "requested_at": req.created_at.isoformat() if req.created_at else None,  # Usar created_at ya que request_date no existe
                    "resolved_at": req.processed_at.isoformat() if req.processed_at else None,  # En BD es "processed_at"
                    "resolution_notes": getattr(req, 'response', None),  # En BD es "response", no "response_description"
                    "created_at": req.created_at.isoformat(),
                    "updated_at": req.created_at.isoformat() if req.created_at else None  # No hay updated_at en BD
                }
                for req in arco_requests
            ]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        api_logger.error(f"Error getting ARCO requests: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/privacy/arco-request/{request_id}")
async def update_arco_request(
    request_id: int,
    request: Request,
    data: dict,
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user)
):
    """
    Actualizar estado de una solicitud ARCO
    """
    try:
        status = data.get('status')  # 'in_progress', 'resolved', 'rejected'
        resolution_notes = data.get('resolution_notes')
        
        if not status:
            raise HTTPException(status_code=400, detail="status es requerido")
        
        if status not in ['pending', 'in_progress', 'resolved', 'rejected']:
            raise HTTPException(status_code=400, detail="status inválido")
        
        # Obtener solicitud ARCO del doctor actual.
        # Scope por doctor_id: un médico solo puede actualizar los ARCO
        # de sus propios pacientes (no ver/modificar los de otros doctores).
        arco_request = db.query(ARCORequest).filter(
            ARCORequest.id == request_id,
            ARCORequest.doctor_id == current_user.id,
        ).first()

        if not arco_request:
            raise HTTPException(status_code=404, detail="Solicitud ARCO no encontrada")
        
        # Verificar acceso
        if current_user.person_type == 'doctor':
            # Obtener el paciente para verificar created_by
            patient = db.query(Person).filter(
                Person.id == arco_request.patient_id,
                Person.person_type == 'patient'
            ).first()
            
            if not patient:
                raise HTTPException(status_code=404, detail="Paciente no encontrado")
            
            # Permitir si:
            # 1. El paciente fue creado por este doctor (created_by)
            # 2. O existe una consulta entre el doctor y el paciente
            # 3. O el usuario es admin
            has_consultation = db.query(MedicalRecord).filter(
                MedicalRecord.patient_id == arco_request.patient_id,
                MedicalRecord.doctor_id == current_user.id
            ).first() is not None
            
            is_patient_creator = patient.created_by == current_user.id
            
            if not has_consultation and not is_patient_creator:
                raise HTTPException(status_code=403, detail="No tiene acceso a este paciente")
        
        # Actualizar
        old_status = arco_request.status
        arco_request.status = status
        if resolution_notes:
            arco_request.response = resolution_notes  # En BD es "response"
        if status == 'completed':  # Model uses 'completed', not 'resolved'
            arco_request.processed_at = utc_now()  # En BD es "processed_at"
        
        db.commit()
        
        # Registrar en audit log
        audit_service.log_action(
            db=db,
            action='arco_request_updated',
            user=current_user,
            request=request,
            table_name='arco_requests',
            record_id=arco_request.id,
            old_values={'status': old_status},
            new_values={'status': status, 'resolution_notes': resolution_notes} if resolution_notes else {'status': status},
            operation_type='arco_request_update',
            affected_patient_id=arco_request.patient_id,
            security_level='INFO'
        )
        
        api_logger.info(
            f"✅ ARCO request updated: {old_status} → {status}",
            request_id=request_id,
            doctor_id=current_user.id
        )
        
        return {
            "success": True,
            "message": "Solicitud ARCO actualizada exitosamente",
            "arco_request": {
                "id": arco_request.id,
                "status": arco_request.status,
                "resolution_notes": arco_request.response,  # En BD es "response"
                "resolved_at": arco_request.processed_at.isoformat() if arco_request.processed_at else None,  # En BD es "processed_at"
                "updated_at": arco_request.created_at.isoformat() if arco_request.created_at else None  # No hay updated_at en BD
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        api_logger.error(f"Error updating ARCO request: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


def _decrypt_safe(ciphertext: str) -> str:
    """Lazy import so the export endpoint doesn't pull the whole consultation
    service on module load (which in turn pulls encryption keys)."""
    from services.consultation_service import decrypt_sensitive_data
    return decrypt_sensitive_data(ciphertext)


@router.post("/privacy/arco/export/{patient_id}")
async def export_patient_arco(
    patient_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user),
):
    """Export all PHI for a patient as a ZIP (LFPDPPP Art. 15 — derecho de acceso).

    Authorization: the calling doctor must own the patient (`created_by`) or
    have at least one consultation with them. Admins bypass ownership. Every
    export is logged at CRITICAL severity in the audit trail.
    """
    from fastapi.responses import Response

    # Fetch patient
    patient = db.query(Person).filter(
        Person.id == patient_id,
        Person.person_type == 'patient',
    ).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Paciente no encontrado")

    # Ownership check (mirrors create_arco_request)
    if current_user.person_type == 'doctor':
        has_consultation = db.query(MedicalRecord).filter(
            MedicalRecord.patient_id == patient_id,
            MedicalRecord.doctor_id == current_user.id,
        ).first() is not None
        is_creator = patient.created_by == current_user.id
        if not has_consultation and not is_creator:
            raise HTTPException(status_code=403, detail="No tiene acceso a este paciente")
    elif current_user.person_type not in ('doctor', 'admin'):
        raise HTTPException(status_code=403, detail="Solo doctores o administradores pueden ejecutar exportaciones ARCO")

    # Gather PHI
    documents = db.query(PersonDocument).filter(
        PersonDocument.person_id == patient_id,
        PersonDocument.is_active.is_(True),
    ).all()
    consultations = db.query(MedicalRecord).filter(
        MedicalRecord.patient_id == patient_id,
    ).order_by(MedicalRecord.consultation_date.asc()).all()
    consultation_ids = [c.id for c in consultations]
    prescriptions = []
    clinical_studies = []
    vital_signs = []
    if consultation_ids:
        prescriptions = db.query(ConsultationPrescription).filter(
            ConsultationPrescription.consultation_id.in_(consultation_ids),
        ).all()
        clinical_studies = db.query(ClinicalStudy).filter(
            ClinicalStudy.consultation_id.in_(consultation_ids),
        ).all()
        vital_signs = db.query(ConsultationVitalSign).filter(
            ConsultationVitalSign.consultation_id.in_(consultation_ids),
        ).all()
    # Studies can exist without a consultation (patient-level) — include those too.
    orphan_studies = db.query(ClinicalStudy).filter(
        ClinicalStudy.patient_id == patient_id,
        ClinicalStudy.consultation_id.is_(None),
    ).all()
    consents = db.query(PrivacyConsent).filter(
        PrivacyConsent.patient_id == patient_id,
    ).order_by(PrivacyConsent.consent_date.asc()).all()

    bundle = ARCOExportBundle(
        patient=serialize_patient(patient, documents),
        consultations=[serialize_consultation(c, decrypt_fn=_decrypt_safe) for c in consultations],
        prescriptions=[serialize_prescription(rx) for rx in prescriptions],
        clinical_studies=[serialize_clinical_study(s) for s in (clinical_studies + orphan_studies)],
        vital_signs=[serialize_vital_sign(vs) for vs in vital_signs],
        privacy_consents=[serialize_privacy_consent(c) for c in consents],
        generated_by_doctor_id=current_user.id,
    )
    payload = arco_build_zip(bundle)

    # CRITICAL audit — bulk PHI export is the highest-sensitivity operation.
    try:
        audit_service.log_arco_export(
            db=db,
            user=current_user,
            patient_id=patient_id,
            patient_name=patient.name,
            request=request,
            counts=bundle.counts(),
        )
    except Exception as audit_err:
        api_logger.error(
            "CRITICAL: failed to audit ARCO export — aborting to preserve traceability",
            extra={"patient_id": patient_id, "doctor_id": current_user.id, "error": str(audit_err)},
        )
        raise HTTPException(
            status_code=500,
            detail="No fue posible registrar la exportación en la bitácora de auditoría. Intenta nuevamente.",
        )

    filename = f"arco-export-patient-{patient_id}-{datetime.utcnow().strftime('%Y%m%d-%H%M%SZ')}.zip"
    return Response(
        content=payload,
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/privacy/public-notice")
async def get_public_privacy_notice(
    doctor: Optional[str] = None,
    consent: Optional[int] = None,
    db: Session = Depends(get_db),
):
    """
    Aviso de privacidad público (sin autenticación).

    Modos:
      - `?doctor=<person_code>` — renderiza el aviso del médico específico.
      - `?doctor=<person_code>&consent=<id>` — además incluye el estado
        del consent (ya aceptado / pendiente) para que la UI decida si
        mostrar el botón "Acepto" o la confirmación.
      - sin parámetros — retorna el **Aviso de Privacidad de la Plataforma
        CORTEX**, que cubre a CORTEX como Responsable del usuario-médico.

    Nunca retorna la plantilla sin hidratar.
    """
    try:
        if doctor:
            doctor_person = db.query(Person).filter(
                Person.person_code == doctor,
                Person.person_type == 'doctor',
                Person.is_active.is_(True),
            ).first()
            if not doctor_person:
                raise HTTPException(status_code=404, detail="Médico no encontrado")

            try:
                rendered = render_active_notice(db, doctor_person)
            except MissingDoctorLegalDataError as e:
                raise HTTPException(status_code=409, detail=str(e))
            except LookupError as e:
                raise HTTPException(status_code=404, detail=str(e))

            response_body = {
                "kind": "doctor_patient_notice",
                "id": rendered.notice_id,
                "version": rendered.version,
                "title": rendered.title,
                "content": rendered.content,
                "short_summary": rendered.short_summary,
                "effective_date": rendered.effective_date,
                "content_hash": rendered.content_hash,
                "doctor_slug": doctor,
            }

            if consent is not None:
                consent_row = db.query(PrivacyConsent).filter(
                    PrivacyConsent.id == consent,
                    PrivacyConsent.doctor_id == doctor_person.id,
                ).first()
                if consent_row:
                    # El frontend usa esto para decidir si mostrar
                    # el botón "Acepto" o el estado "Ya aceptaste".
                    # NO exponemos patient_id ni otros datos PHI.
                    response_body["consent_state"] = {
                        "id": consent_row.id,
                        "already_accepted": bool(consent_row.consent_given),
                        "accepted_at": (
                            consent_row.consent_date.isoformat()
                            if consent_row.consent_given and consent_row.consent_date
                            else None
                        ),
                        # Si el hash del consent no coincide con lo que
                        # estamos mostrando ahora, la página debe avisar.
                        "hash_matches": consent_row.rendered_content_hash == rendered.content_hash,
                    }
                else:
                    response_body["consent_state"] = {"id": consent, "not_found": True}

            return response_body

        # Sin slug: aviso de CORTEX (la plataforma) al usuario-médico.
        platform_doc = (
            db.query(LegalDocument)
            .filter(
                LegalDocument.doc_type == 'platform_privacy',
                LegalDocument.is_active.is_(True),
            )
            .order_by(LegalDocument.effective_date.desc())
            .first()
        )
        if not platform_doc:
            raise HTTPException(status_code=404, detail="No hay aviso de privacidad de la plataforma activo")

        return {
            "kind": "platform_privacy",
            "id": platform_doc.id,
            "version": platform_doc.version,
            "title": platform_doc.title,
            "content": platform_doc.content.replace(
                "{{effective_date}}", platform_doc.effective_date.isoformat()
            ),
            "short_summary": None,
            "effective_date": platform_doc.effective_date.isoformat(),
            "is_active": platform_doc.is_active,
        }

    except HTTPException:
        raise
    except Exception as e:
        api_logger.error(f"Error getting public privacy notice: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

