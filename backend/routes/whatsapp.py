from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session
import locale
import pytz

from database import Appointment, Person, Country, get_db
from auth import get_user_from_token
from whatsapp_service import get_whatsapp_service
from services.office_helpers import build_office_address, resolve_maps_url, resolve_country_code


router = APIRouter(prefix="/api/whatsapp", tags=["whatsapp"])


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


@router.post("/appointment-reminder/{appointment_id}")
async def send_whatsapp_appointment_reminder(
    appointment_id: int,
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user)
):
    """Enviar recordatorio de cita por WhatsApp"""
    print(f"📱 Sending WhatsApp reminder for appointment: {appointment_id}")

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
            doctor_full_name = f"{doctor.first_name} {doctor.paternal_surname}"
            if doctor.maternal_surname:
                doctor_full_name += f" {doctor.maternal_surname}"
        else:
            doctor_title = "Dr"
            doctor_full_name = "Dr. Test"

        # Get patient full name
        patient_full_name = f"{patient.first_name} {patient.paternal_surname}"
        if patient.maternal_surname:
            patient_full_name += f" {patient.maternal_surname}"

        # Format appointment date and time separately
        try:
            locale.setlocale(locale.LC_TIME, 'es_ES.UTF-8')
        except Exception:
            try:
                locale.setlocale(locale.LC_TIME, 'es_MX.UTF-8')
            except Exception:
                pass  # Use default locale if Spanish not available

        # Convert UTC time to Mexico City timezone
        utc_tz = pytz.UTC
        mexico_tz = pytz.timezone('America/Mexico_City')

        # Convert appointment date from UTC to Mexico timezone
        if appointment.appointment_date.tzinfo is None:
            # If naive datetime, assume it's UTC
            appointment_utc = utc_tz.localize(appointment.appointment_date)
        else:
            # If already timezone aware, convert to UTC first
            appointment_utc = appointment.appointment_date.astimezone(utc_tz)

        # Convert to Mexico timezone
        appointment_mexico = appointment_utc.astimezone(mexico_tz)

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
                print(f"🌍 Office not found, using default country code: {country_code}")
        else:
            print(f"🌍 No office_id in appointment, using default country code: {country_code}")

        print(f"📞 Using country code: +{country_code} for WhatsApp")
        print(f"📞 Patient phone before formatting: {patient.primary_phone}")

        # Send WhatsApp
        whatsapp = get_whatsapp_service()
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
            maps_url=maps_url
        )

        if result['success']:
            print(f"✅ WhatsApp sent successfully to {patient.primary_phone}")
            return {
                "message": "WhatsApp reminder sent successfully",
                "message_id": result.get('message_id'),
                "phone": patient.primary_phone
            }
        else:
            error_msg = result.get('error', 'Unknown error')
            print(f"❌ Failed to send WhatsApp: {error_msg}")

            # Check for specific WhatsApp errors
            if ('more than 24 hours' in str(error_msg).lower() or 
                '24 hours have passed' in str(error_msg).lower() or
                're-engagement message' in str(error_msg).lower()):
                raise HTTPException(
                    status_code=400,
                    detail="Message failed to send because more than 24 hours have passed since the customer last replied to this number."
                )
            elif ('401' in str(error_msg) or 'Unauthorized' in str(error_msg) or 
                'credentials invalid' in str(error_msg).lower() or 
                'credentials expired' in str(error_msg).lower()):
                raise HTTPException(
                    status_code=503,
                    detail="WhatsApp service not configured. Please contact administrator to set up WhatsApp credentials."
                )
            elif 'not configured' in str(error_msg).lower():
                raise HTTPException(
                    status_code=503,
                    detail="WhatsApp service not configured. Please contact administrator to set up WhatsApp credentials."
                )
            else:
                raise HTTPException(
                    status_code=500, 
                    detail=f"Failed to send WhatsApp: {error_msg}"
                )

    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error sending WhatsApp reminder: {e}")
        raise HTTPException(status_code=500, detail=f"Error sending WhatsApp: {str(e)}")


