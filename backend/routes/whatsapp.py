from fastapi import APIRouter, Depends, HTTPException, Header, Request
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
import locale
import pytz
import json
from datetime import datetime, timedelta
from typing import Optional

from database import Appointment, Person, Country, get_db, PrivacyConsent, PrivacyNotice, AppointmentReminder, MedicalRecord, ClinicalStudy
import os
from auth import get_user_from_token
from whatsapp_service import get_whatsapp_service
from services.office_helpers import build_office_address, resolve_maps_url, resolve_country_code
from logger import get_logger
from utils.datetime_utils import utc_now
from audit_service import audit_service


router = APIRouter(prefix="/api/whatsapp", tags=["whatsapp"])
api_logger = get_logger("medical_records.api")
security_logger = get_logger("medical_records.security")


def get_current_user(
    authorization: str = Header(None, alias="Authorization"),
    db: Session = Depends(get_db)
) -> Person:
    """Dependency para obtener el usuario actual desde el header Authorization Bearer."""
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = authorization.split(" ", 1)[1]
    user = get_user_from_token(db, token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    return user


def _mask_phone(phone: Optional[str]) -> str:
    """Return a masked version of the phone number for logging."""
    if not phone:
        return "N/A"
    trimmed = phone[-4:]
    masked_prefix = "*" * max(len(phone) - len(trimmed), 0)
    return f"{masked_prefix}{trimmed}"


@router.post("/appointment-reminder/{appointment_id}")
async def send_whatsapp_appointment_reminder(
    appointment_id: int,
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user)
):
    """Enviar recordatorio de cita por WhatsApp"""
    api_logger.debug("Sending WhatsApp reminder for appointment", appointment_id=appointment_id)

    try:
        # Get appointment (temporarily without doctor filter for testing)
        appointment = db.query(Appointment).filter(
            Appointment.id == appointment_id
        ).first()

        if not appointment:
            raise HTTPException(status_code=404, detail="Appointment not found")

        # Get patient
        patient = db.query(Person).filter(Person.id == appointment.patient_id).first()

        if not patient or not patient.primary_phone:
            raise HTTPException(status_code=400, detail="Patient phone number not found")

        # Get doctor information
        doctor = db.query(Person).filter(Person.id == appointment.doctor_id).first()
        if doctor:
            doctor_title = doctor.title or "Dr"  # Use doctor's title or default to "Dr"
            doctor_full_name = doctor.name
        else:
            doctor_title = "Dr"
            doctor_full_name = "Dr. Test"

        # Get patient full name
        patient_full_name = patient.name

        # Format appointment date and time separately
        try:
            locale.setlocale(locale.LC_TIME, 'es_ES.UTF-8')
        except Exception:
            try:
                locale.setlocale(locale.LC_TIME, 'es_MX.UTF-8')
            except Exception:
                pass  # Use default locale if Spanish not available

        # Convert appointment date to Mexico City timezone
        # IMPORTANT: Appointments are stored as naive datetime in CDMX timezone (not UTC)
        mexico_tz = pytz.timezone('America/Mexico_City')

        # Handle timezone conversion
        if appointment.appointment_date.tzinfo is None:
            # If naive datetime, assume it's already in CDMX timezone (as per storage convention)
            appointment_mexico = mexico_tz.localize(appointment.appointment_date)
        else:
            # If timezone aware, convert to CDMX timezone
            appointment_mexico = appointment.appointment_date.astimezone(mexico_tz)

        # Format in Mexico timezone
        appointment_date = appointment_mexico.strftime('%d de %B de %Y')
        appointment_time = appointment_mexico.strftime('%I:%M %p')

        # Get office information and appointment type
        appointment_type = "presencial"  # Default
        office_address = "Consultorio Médico"
        maps_url = None
        country_code = '52'

        if appointment.office_id:
            from database import Office
            office = db.query(Office).filter(Office.id == appointment.office_id).first()
            if office:
                office_address = build_office_address(office)
                maps_url = resolve_maps_url(office, office_address)
                country_code = resolve_country_code(office, default_code='52')
                if getattr(office, 'is_virtual', False) and getattr(office, 'virtual_url', None):
                    appointment_type = "online"
            else:
                security_logger.warning(
                    "Office not found, falling back to default country code",
                    appointment_id=appointment_id,
                    country_code=country_code
                )
        else:
            security_logger.info(
                "Appointment missing office_id, using default country code",
                appointment_id=appointment_id,
                country_code=country_code
            )

        security_logger.info(
            "Using country code for WhatsApp reminder",
            appointment_id=appointment_id,
            country_code=country_code
        )
        security_logger.info(
            "Patient phone before formatting",
            appointment_id=appointment_id,
            phone_mask=_mask_phone(patient.primary_phone)
        )

        # Send WhatsApp
        whatsapp = get_whatsapp_service()
        # Debug proveedor actual
        try:
            provider = (os.getenv('WHATSAPP_PROVIDER') or 'auto').lower()
            security_logger.debug(
                "WhatsApp provider configuration detected",
                appointment_id=appointment_id,
                provider=provider,
                twilio_account_sid_configured=bool(os.getenv('TWILIO_ACCOUNT_SID')),
                whatsapp_from_configured=bool(os.getenv('TWILIO_WHATSAPP_FROM'))
            )
        except Exception:
            pass
        result = whatsapp.send_appointment_reminder(
            patient_phone=patient.primary_phone,
            patient_full_name=patient_full_name,
            appointment_date=appointment_date,
            appointment_time=appointment_time,
            doctor_title=doctor_title,
            doctor_full_name=doctor_full_name,
            office_address=office_address,
            country_code=country_code,
            appointment_type=appointment_type,
            maps_url=maps_url,
            appointment_status=appointment.status,
            appointment_id=appointment.id
        )

        if result['success']:
            security_logger.info(
                "WhatsApp reminder sent successfully",
                appointment_id=appointment_id,
                patient_phone_mask=_mask_phone(patient.primary_phone)
            )
            
            # Actualizar appointment: marcar reminder_sent y reminder_sent_at
            appointment.reminder_sent = True
            appointment.reminder_sent_at = utc_now()
            db.commit()
            
            return {
                "message": "WhatsApp reminder sent successfully",
                "message_id": result.get('message_id') or result.get('message_sid'),
                "phone": patient.primary_phone
            }
        else:
            error_msg = result.get('error', 'Unknown error')
            security_logger.error(
                "Failed to send WhatsApp reminder",
                appointment_id=appointment_id,
                error=str(error_msg)
            )

            # Mapeo genérico de errores (proveedor-agnóstico)
            if ('24 hours' in str(error_msg).lower() or '24-hour' in str(error_msg).lower()):
                raise HTTPException(
                    status_code=400,
                    detail="No es posible enviar el mensaje: ventana de 24 horas expirada."
                )
            elif ('token_expired' in str(error_msg).lower() or 'token de acceso expirado' in str(error_msg).lower() or
                  'Session has expired' in str(error_msg)):
                raise HTTPException(
                    status_code=503,
                    detail="El token de acceso de Meta WhatsApp ha expirado. Por favor, renueva el token en la consola de Meta (https://developers.facebook.com/) y actualiza META_WHATSAPP_TOKEN en compose.yaml"
                )
            elif ('401' in str(error_msg) or 'unauthorized' in str(error_msg).lower() or 
                'invalid' in str(error_msg).lower() and 'token' in str(error_msg).lower() or
                'authentication' in str(error_msg).lower() or 
                'OAuthException' in str(error_msg) or 'error_subcode' in str(error_msg)):
                raise HTTPException(
                    status_code=503,
                    detail="Credenciales de WhatsApp inválidas o expiradas. Verifique la configuración del proveedor en compose.yaml. Si el token expiró, renuévalo en la consola de Meta."
                )
            elif ('template' in str(error_msg).lower() or 'approval' in str(error_msg).lower() or 'permission' in str(error_msg).lower()):
                raise HTTPException(
                    status_code=400,
                    detail="La cuenta no tiene permisos/plantillas aprobadas para enviar este mensaje."
                )
            elif 'not configured' in str(error_msg).lower():
                raise HTTPException(
                    status_code=503,
                    detail="Servicio de WhatsApp no configurado. Configure las credenciales del proveedor."
                )
            else:
                raise HTTPException(
                    status_code=500, 
                    detail=f"Failed to send WhatsApp: {error_msg}"
                )

    except HTTPException:
        raise
    except Exception as e:
        error_str = str(e)
        security_logger.error(
            "Unexpected error sending WhatsApp reminder",
            appointment_id=appointment_id,
            error=error_str
        )
        
        # Check if it's a token expiration error
        if 'token' in error_str.lower() and ('expired' in error_str.lower() or 'Session has expired' in error_str):
            raise HTTPException(
                status_code=503,
                detail="El token de acceso de Meta WhatsApp ha expirado. Por favor, renueva el token en la consola de Meta (https://developers.facebook.com/) y actualiza META_WHATSAPP_TOKEN en compose.yaml"
            )
        
        raise HTTPException(status_code=500, detail=f"Error sending WhatsApp: {error_str}")


async def emit_appointment_event(event_type: str, data: dict):
    """
    Emit an event to all connected clients
    Currently disabled/placeholder as SSE is disabled
    """
    pass


async def _find_appointment_by_whatsapp_message_id(whatsapp_message_id: str, db: Session) -> Optional[int]:
    """
    Buscar appointment_id usando el whatsapp_message_id del recordatorio
    Esto elimina completamente la ambigüedad cuando se usa template
    """
    try:
        reminder = db.query(AppointmentReminder).filter(
            AppointmentReminder.whatsapp_message_id == whatsapp_message_id
        ).first()
        
        if reminder and reminder.appointment_id:
            api_logger.info(
                "✅ Found appointment by WhatsApp message_id",
                extra={
                    "whatsapp_message_id": whatsapp_message_id,
                    "appointment_id": reminder.appointment_id,
                    "reminder_id": reminder.id
                }
            )
            return reminder.appointment_id
        
        api_logger.warning(
            "⚠️ No appointment found for WhatsApp message_id",
            extra={"whatsapp_message_id": whatsapp_message_id}
        )
        return None
    except Exception as e:
        api_logger.error(
            "❌ Error finding appointment by WhatsApp message_id",
            extra={"whatsapp_message_id": whatsapp_message_id},
            exc_info=True
        )
        return None


async def cancel_appointment_via_whatsapp(appointment_id: int, patient_phone: str, db: Session):
    """
    Cancelar una cita cuando el paciente responde vía WhatsApp
    """
    try:
        api_logger.info(
            "🔄 Canceling appointment via WhatsApp",
            extra={"appointment_id": appointment_id, "patient_phone": patient_phone}
        )
        
        # Buscar la cita
        appointment = db.query(Appointment).filter(
            Appointment.id == appointment_id
        ).first()
        
        if not appointment:
            api_logger.warning(
                "❌ Appointment not found when cancelling via WhatsApp",
                extra={"appointment_id": appointment_id}
            )
            return
        
        # Verificar que el teléfono corresponde al paciente
        patient = db.query(Person).filter(Person.id == appointment.patient_id).first()
        
        if not patient:
            api_logger.error(
                "❌ Patient not found for appointment when cancelling via WhatsApp",
                extra={"appointment_id": appointment_id}
            )
            return
        
        doctor_id = appointment.doctor_id
        
        # Cancelar la cita
        appointment.status = 'cancelled'
        appointment.cancelled_reason = 'Cancelada por el paciente vía WhatsApp'
        appointment.updated_at = utc_now()
        
        db.commit()
        db.refresh(appointment)
        
        # Sincronizar con Google Calendar si está configurado
        if doctor_id:
            try:
                from services.google_calendar_service import GoogleCalendarService
                GoogleCalendarService.delete_calendar_event(db, doctor_id, appointment_id)
            except Exception as e:
                # No fallar si Google Calendar no está configurado o hay error
                api_logger.warning("Error al sincronizar eliminación con Google Calendar (no crítico)", exc_info=True, extra={
                    "doctor_id": doctor_id,
                    "appointment_id": appointment_id
                })
        
        # Track WhatsApp cancellation in Amplitude
        try:
            from services.amplitude_service import AmplitudeService
            AmplitudeService.track_whatsapp_reminder_cancelled(
                appointment_id=appointment_id,
                patient_id=patient.id
            )
        except Exception as e:
            # Silently fail - Amplitude tracking is non-critical
            pass
        
        api_logger.info(
            "✅ Appointment cancelled successfully via WhatsApp",
            extra={"appointment_id": appointment_id}
        )
        
        # Emit SSE event to notify frontend
        try:
            await emit_appointment_event("appointment_cancelled", {
                "appointment_id": appointment_id,
                "patient_id": appointment.patient_id,
                "doctor_id": appointment.doctor_id,
                "status": appointment.status,
                "updated_at": appointment.updated_at.isoformat() if appointment.updated_at else None
            })
        except Exception as e:
            api_logger.warning("Failed to emit SSE event", extra={"error": str(e)})
        
    except Exception as e:
        db.rollback()
        api_logger.error(
            "❌ Error cancelling appointment via WhatsApp",
            extra={"appointment_id": appointment_id},
            exc_info=True
        )


async def confirm_appointment_via_whatsapp(appointment_id: Optional[int], patient_phone: str, db: Session):
    """
    Confirmar una cita cuando el paciente responde vía WhatsApp
    """
    try:
        api_logger.info(
            "✅ Confirming appointment via WhatsApp",
            extra={"appointment_id": appointment_id, "patient_phone": patient_phone}
        )
        
        whatsapp = get_whatsapp_service()
        normalized_from_phone = whatsapp._format_phone_number(patient_phone)
        
        appointment = None
        patient = None
        
        if appointment_id is not None:
            appointment = db.query(Appointment).filter(Appointment.id == appointment_id).first()
            if not appointment:
                api_logger.warning(
                    "❌ Appointment not found for confirmation via WhatsApp",
                    extra={"appointment_id": appointment_id}
                )
                return
            
            patient = db.query(Person).filter(Person.id == appointment.patient_id).first()
            if not patient:
                api_logger.error(
                    "❌ Patient not found for appointment confirmation",
                    extra={"appointment_id": appointment_id}
                )
                return
        else:
            # Buscar paciente por teléfono
            patients = db.query(Person).filter(
                Person.person_type == 'patient',
                Person.primary_phone.isnot(None)
            ).all()
            
            matching_patient = None
            for candidate in patients:
                normalized_candidate_phone = whatsapp._format_phone_number(candidate.primary_phone)
                
                alternate_candidate_phone = normalized_candidate_phone.replace("521", "52") if normalized_candidate_phone.startswith("521") else normalized_candidate_phone
                alternate_from_phone = normalized_from_phone.replace("521", "52") if normalized_from_phone.startswith("521") else normalized_from_phone
                
                if (normalized_candidate_phone == normalized_from_phone or
                    normalized_candidate_phone == alternate_from_phone or
                    alternate_candidate_phone == normalized_from_phone):
                    matching_patient = candidate
                    break
            
            if not matching_patient:
                api_logger.info(
                    "❌ No matching patient found for confirmation",
                    extra={"patient_phone": patient_phone}
                )
                return
            
            # Buscar la cita correcta
            now = utc_now()
            recent_threshold = now - timedelta(hours=2)
            
            appointment_with_recent_reminder = db.query(Appointment).join(
                AppointmentReminder
            ).options(
                joinedload(Appointment.reminders)
            ).filter(
                Appointment.patient_id == matching_patient.id,
                Appointment.status == 'por_confirmar',
                AppointmentReminder.sent == True,
                AppointmentReminder.sent_at >= recent_threshold
            ).order_by(
                AppointmentReminder.sent_at.desc()
            ).first()
            
            if appointment_with_recent_reminder:
                appointment = appointment_with_recent_reminder
                patient = matching_patient
            else:
                past_threshold = now - timedelta(days=1)
                future_threshold = now + timedelta(days=7)
                
                appointment = db.query(Appointment).filter(
                    Appointment.patient_id == matching_patient.id,
                    Appointment.status == 'por_confirmar',
                    Appointment.appointment_date >= past_threshold,
                    Appointment.appointment_date <= future_threshold
                ).order_by(
                    Appointment.appointment_date.asc()
                ).first()
                
                if appointment:
                    patient = matching_patient
                else:
                    return
        
        if appointment.status == 'cancelled':
            return
        
        if appointment.status == 'confirmada':
            return
        
        appointment.status = 'confirmada'
        appointment.updated_at = utc_now()
        appointment.cancelled_reason = None
        
        try:
            db.commit()
            db.refresh(appointment)
            
            if appointment.status != 'confirmada':
                appointment.status = 'confirmada'
                db.commit()
                db.refresh(appointment)
        except Exception as commit_error:
            db.rollback()
            raise
        
        # Emit SSE event
        try:
            await emit_appointment_event("appointment_confirmed", {
                "appointment_id": appointment.id,
                "patient_id": appointment.patient_id,
                "doctor_id": appointment.doctor_id,
                "status": appointment.status,
                "updated_at": appointment.updated_at.isoformat() if appointment.updated_at else None
            })
        except Exception as e:
            api_logger.warning("Failed to emit SSE event", extra={"error": str(e)})
        
        # Track in Amplitude
        try:
            from services.amplitude_service import AmplitudeService
            AmplitudeService.track_whatsapp_reminder_confirmed(
                appointment_id=appointment.id,
                patient_id=appointment.patient_id
            )
        except Exception as e:
            pass
            
    except Exception as e:
        db.rollback()
        api_logger.error(
            "❌ Error confirming appointment via WhatsApp",
            extra={"appointment_id": appointment_id},
            exc_info=True
        )


async def process_text_cancellation_request(text: str, patient_phone: str, db: Session):
    """
    Procesar solicitud de cancelación recibida como mensaje de texto
    """
    try:
        whatsapp = get_whatsapp_service()
        matching_patient = None
        
        patients_with_appointments = db.query(Person).join(
            Appointment, Person.id == Appointment.patient_id
        ).filter(
            Person.person_type == 'patient',
            Person.primary_phone.isnot(None),
            Appointment.status.in_(['confirmada', 'por_confirmar'])
        ).all()
        
        for p in patients_with_appointments:
            normalized_patient_phone = whatsapp._format_phone_number(p.primary_phone)
            normalized_from_phone = whatsapp._format_phone_number(patient_phone)
            
            if normalized_patient_phone == normalized_from_phone:
                matching_patient = p
                break
            
            if normalized_from_phone.startswith("521") and normalized_patient_phone.startswith("52"):
                alternative_whatsapp_phone = normalized_from_phone.replace("521", "52")
                if normalized_patient_phone == alternative_whatsapp_phone:
                    matching_patient = p
                    break
            
            if normalized_patient_phone.startswith("521") and normalized_from_phone.startswith("52"):
                alternative_patient_phone = normalized_patient_phone.replace("521", "52")
                if normalized_from_phone == alternative_patient_phone:
                    matching_patient = p
                    break
        
        if not matching_patient:
            all_patients = db.query(Person).filter(
                Person.person_type == 'patient',
                Person.primary_phone.isnot(None)
            ).all()
            
            for p in all_patients:
                normalized_patient_phone = whatsapp._format_phone_number(p.primary_phone)
                normalized_from_phone = whatsapp._format_phone_number(patient_phone)
                
                if normalized_patient_phone == normalized_from_phone:
                    matching_patient = p
                    break
                
                if normalized_from_phone.startswith("521") and normalized_patient_phone.startswith("52"):
                    alternative_whatsapp_phone = normalized_from_phone.replace("521", "52")
                    if normalized_patient_phone == alternative_whatsapp_phone:
                        matching_patient = p
                        break
                
                if normalized_patient_phone.startswith("521") and normalized_from_phone.startswith("52"):
                    alternative_patient_phone = normalized_patient_phone.replace("521", "52")
                    if normalized_from_phone == alternative_patient_phone:
                        matching_patient = p
                        break
        
        if not matching_patient:
            return
        
        now = utc_now()
        past_threshold = now - timedelta(days=1)
        future_threshold = now + timedelta(days=7)
        recent_threshold = now - timedelta(hours=2)
        
        appointment_with_recent_reminder = db.query(Appointment).join(
            AppointmentReminder
        ).options(
            joinedload(Appointment.reminders)
        ).filter(
            Appointment.patient_id == matching_patient.id,
            Appointment.status.in_(['confirmada', 'por_confirmar']),
            AppointmentReminder.sent == True,
            AppointmentReminder.sent_at >= recent_threshold
        ).order_by(
            AppointmentReminder.sent_at.desc()
        ).first()
        
        next_appointment = None
        if appointment_with_recent_reminder:
            next_appointment = appointment_with_recent_reminder
        else:
            next_appointment = db.query(Appointment).filter(
                Appointment.patient_id == matching_patient.id,
                Appointment.status == 'confirmada',
                Appointment.appointment_date >= past_threshold,
                Appointment.appointment_date <= future_threshold
            ).order_by(Appointment.appointment_date.asc()).first()
            
            if not next_appointment:
                next_appointment = db.query(Appointment).filter(
                    Appointment.patient_id == matching_patient.id,
                    Appointment.status != 'cancelled',
                    Appointment.appointment_date >= past_threshold,
                    Appointment.appointment_date <= future_threshold
                ).order_by(Appointment.appointment_date.asc()).first()
            
            if not next_appointment:
                recent_date = now - timedelta(days=7)
                next_appointment = db.query(Appointment).filter(
                    Appointment.patient_id == matching_patient.id,
                    Appointment.status != 'cancelled',
                    Appointment.appointment_date >= recent_date
                ).order_by(Appointment.appointment_date.desc()).first()
        
        if not next_appointment:
            return
        
        doctor_id = next_appointment.doctor_id
        
        next_appointment.status = 'cancelled'
        next_appointment.cancelled_reason = 'cancelled by patient'
        next_appointment.cancelled_at = utc_now()
        next_appointment.cancelled_by = matching_patient.id
        next_appointment.updated_at = utc_now()
        
        try:
            db.commit()
            db.refresh(next_appointment)
        except Exception as commit_error:
            db.rollback()
            raise commit_error
        
        if doctor_id:
            try:
                from services.google_calendar_service import GoogleCalendarService
                GoogleCalendarService.delete_calendar_event(db, doctor_id, next_appointment.id)
            except Exception as e:
                api_logger.warning("Error al sincronizar eliminación con Google Calendar (no crítico)", exc_info=True)
        
    except Exception as e:
        db.rollback()


@router.post("/webhook")
async def whatsapp_webhook(
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Webhook para recibir respuestas de WhatsApp (botones interactivos)
    """
    try:
        # Validate webhook signature from Meta
        import hmac
        import hashlib
        
        raw_body = await request.body()
        signature_header = request.headers.get("X-Hub-Signature-256", "")
        is_production = os.getenv("APP_ENV", "development").lower() == "production"
        
        if is_production and not signature_header:
            raise HTTPException(status_code=403, detail="Missing signature header")
        
        if signature_header:
            if not signature_header.startswith("sha256="):
                if is_production:
                    raise HTTPException(status_code=403, detail="Invalid signature format")
            else:
                received_signature = signature_header[7:]
                app_secret = os.getenv("META_WHATSAPP_APP_SECRET")
                if app_secret:
                    expected_signature = hmac.new(
                        app_secret.encode('utf-8'),
                        raw_body,
                        hashlib.sha256
                    ).hexdigest()
                    
                    if not hmac.compare_digest(received_signature, expected_signature):
                        raise HTTPException(status_code=403, detail="Invalid signature")
        
        body = json.loads(raw_body.decode('utf-8'))
        
        if 'entry' not in body:
            return {"status": "ignored"}
        
        processed_messages = 0
        for entry in body['entry']:
            for change in entry.get('changes', []):
                field = change.get('field')
                value = change.get('value', {})
                
                if field != 'messages':
                    continue
                
                messages = value.get('messages', [])
                
                for message in messages:
                    message_type = message.get('type')
                    from_phone = message.get('from')
                    timestamp = message.get('timestamp')
                    message_id = message.get('id')
                    
                    if message_type == 'interactive':
                        interactive_data = message.get('interactive', {})
                        button_reply = interactive_data.get('button_reply', {})
                        button_id = button_reply.get('id', '')
                        
                        parts = button_id.split('_')
                        
                        if len(parts) >= 3 and parts[0] == 'accept' and parts[1] == 'privacy':
                            consent_id = int(parts[2])
                            
                            consent = db.query(PrivacyConsent).filter(
                                PrivacyConsent.id == consent_id
                            ).first()
                            
                            if not consent:
                                continue
                            
                            patient = db.query(Person).filter(
                                Person.id == consent.patient_id
                            ).first()
                            
                            if not patient:
                                continue
                            
                            consent.consent_given = True
                            consent.consent_date = datetime.fromtimestamp(int(timestamp))
                            
                            db.commit()
                            db.refresh(consent)
                            
                            # Enviar confirmación
                            whatsapp = get_whatsapp_service()
                            doctor = db.query(Person).filter(Person.person_type == 'doctor').first()
                            
                            if doctor:
                                doctor_name = f"{doctor.title or 'Dr.'} {doctor.name}" if doctor.name else "Doctor"
                                patient_first_name = patient.name.split()[0] if patient.name else 'Paciente'
                                
                                whatsapp.send_text_message(
                                    to_phone=from_phone,
                                    message=f"✅ Gracias {patient_first_name}, tu consentimiento ha sido registrado correctamente.\n\n"
                                            f"Ahora {doctor_name} puede brindarte atención médica cumpliendo con la Ley de Protección de Datos."
                                )
                            
                            audit_service.log_action(
                                db=db,
                                action="PRIVACY_CONSENT_ACCEPTED",
                                user=None,
                                request=request,
                                operation_type="whatsapp_button_consent",
                                affected_patient_id=patient.id,
                                affected_patient_name=patient.name or "Paciente",
                                new_values={
                                    "button_id": button_id,
                                    "consent_id": consent_id,
                                    "method": "whatsapp_button"
                                },
                                security_level='INFO'
                            )
                            processed_messages += 1
                            
                        elif len(parts) >= 3 and parts[0] == 'cancel' and parts[1] == 'appointment':
                            appointment_id = int(parts[2])
                            await cancel_appointment_via_whatsapp(appointment_id, from_phone, db)
                            processed_messages += 1
                            
                        elif len(parts) >= 3 and parts[0] == 'confirm' and parts[1] == 'appointment':
                            appointment_id = int(parts[2])
                            await confirm_appointment_via_whatsapp(appointment_id, from_phone, db)
                            processed_messages += 1
                            
                    elif message_type == 'text':
                        text_body = message.get('text', {}).get('body', '').lower()
                        
                        if 'cancel' in text_body or 'cancelar' in text_body:
                            await process_text_cancellation_request(text_body, from_phone, db)
                            processed_messages += 1
                        elif 'confirm' in text_body or 'si' in text_body or 'sí' in text_body:
                            await confirm_appointment_via_whatsapp(None, from_phone, db)
                            processed_messages += 1
        
        return {"status": "ok", "processed_messages": processed_messages}
        
    except Exception as e:
        api_logger.error("❌ Error processing WhatsApp webhook", exc_info=True)
        return {"status": "error", "message": str(e)}


@router.get("/webhook")
async def whatsapp_webhook_verification(
    request: Request
):
    """
    Verificación del webhook de WhatsApp (requerido por Meta)
    """
    mode = request.query_params.get('hub.mode')
    token = request.query_params.get('hub.verify_token')
    challenge = request.query_params.get('hub.challenge')
    
    verify_token = os.getenv('META_WHATSAPP_VERIFY_TOKEN', 'mi_token_secreto_123')
    
    if mode == 'subscribe' and token == verify_token:
        api_logger.info("✅ WhatsApp webhook verified successfully")
        return int(challenge)
    
    api_logger.warning(
        "❌ WhatsApp webhook verification failed",
        extra={"mode": mode, "token": token}
    )
    return {"status": "error", "message": "Verification failed"}


@router.post("/study-results/{study_id}")
async def send_whatsapp_study_results_notification(
    study_id: int,
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user)
):
    """Notificar por WhatsApp que los resultados de un estudio están disponibles"""
    api_logger.info(
        "📱 Sending WhatsApp notification for study results",
        extra={"study_id": study_id, "doctor_id": current_user.id}
    )
    
    try:
        # Get study
        study = db.query(ClinicalStudy).filter(
            ClinicalStudy.id == study_id,
            ClinicalStudy.created_by == current_user.id
        ).first()
        
        if not study:
            raise HTTPException(status_code=404, detail="Study not found or no access")
        
        # Get patient
        patient = db.query(Person).filter(Person.id == study.patient_id).first()
        
        if not patient or not patient.primary_phone:
            raise HTTPException(status_code=400, detail="Patient phone number not found")
        
        # Generate secure link (placeholder - implement token system later)
        secure_link = f"http://localhost:3000/patient/studies/{study.id}"
        
        # Send WhatsApp
        whatsapp = get_whatsapp_service()
        # Get patient first name (first word of full name)
        patient_first_name = patient.name.split()[0] if patient.name else 'Paciente'
        
        result = whatsapp.send_lab_results_notification(
            patient_phone=patient.primary_phone,
            patient_name=patient_first_name,
            study_name=study.study_name,
            secure_link=secure_link
        )
        
        if result['success']:
            api_logger.info(
                "✅ WhatsApp notification sent successfully",
                extra={
                    "study_id": study.id,
                    "patient_id": patient.id,
                    "phone": patient.primary_phone
                }
            )
            return {
                "message": "WhatsApp notification sent successfully",
                "message_id": result.get('message_id'),
                "phone": patient.primary_phone
            }
        else:
            api_logger.error(
                "❌ Failed to send WhatsApp notification",
                extra={
                    "study_id": study.id,
                    "patient_id": patient.id,
                    "phone": patient.primary_phone,
                    "error": result.get('error')
                }
            )
            raise HTTPException(
                status_code=500,
                detail=f"Failed to send WhatsApp: {result.get('error')}"
            )
            
    except HTTPException:
        raise
    except Exception as e:
        api_logger.error(
            "❌ Error sending WhatsApp notification",
            extra={"study_id": study_id, "doctor_id": current_user.id},
            exc_info=True
        )
        raise HTTPException(status_code=500, detail=f"Error sending WhatsApp: {str(e)}")


@router.post("/test")
async def test_whatsapp_service(
    phone: str,
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user)
):
    """
    Endpoint de prueba para WhatsApp (agnóstico del proveedor)
    Envía un mensaje de prueba de texto simple
    """
    api_logger.info(
        "📱 Testing WhatsApp service",
        extra={"phone": phone, "doctor_id": current_user.id}
    )
    
    try:
        whatsapp = get_whatsapp_service()
        result = whatsapp.send_text_message(
            to_phone=phone,
            message='Mensaje de prueba desde el sistema de citas',
        )
        
        if result['success']:
            return {
                "message": "Test message sent successfully",
                "message_id": result.get('message_id') or result.get('message_sid'),
                "phone": phone,
                "note": "If you didn't receive the message, make sure your number is registered in Meta WhatsApp dashboard"
            }
        else:
            raise HTTPException(status_code=500, detail=f"Failed to send message: {result.get('error')}")
            
    except Exception as e:
        api_logger.error("❌ Error testing WhatsApp service", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))




