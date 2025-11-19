from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session
import locale
import pytz
from typing import Optional

from database import Appointment, Person, Country, get_db
import os
from auth import get_user_from_token
from whatsapp_service import get_whatsapp_service
from services.office_helpers import build_office_address, resolve_maps_url, resolve_country_code
from logger import get_logger


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
            from datetime import datetime
            appointment.reminder_sent = True
            appointment.reminder_sent_at = datetime.utcnow()
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


