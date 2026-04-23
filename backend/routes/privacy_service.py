"""
Privacy service for automatic privacy notice sending
Compliance: LFPDPPP
"""

from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime
import uuid
import logging

from database import Person, MedicalRecord, PrivacyNotice, PrivacyConsent
from utils.datetime_utils import utc_now
from whatsapp_service import get_whatsapp_service
from encryption import EncryptionService
from logger import get_logger
from services.privacy_template import (
    MissingDoctorLegalDataError,
    render_active_notice,
)

api_logger = get_logger("api")
security_logger = get_logger("security")


def check_if_first_consultation(db: Session, patient_id: int, doctor_id: int, current_consultation_id: int) -> bool:
    """
    Check if this is the patient's first consultation with this doctor
    Excludes the current consultation being created
    
    Args:
        db: Database session
        patient_id: Patient ID
        doctor_id: Doctor ID
        current_consultation_id: ID of the consultation being created (to exclude from count)
        
    Returns:
        True if this is the first consultation, False otherwise
    """
    try:
        # Count consultations BEFORE the current one
        previous_count = db.query(MedicalRecord).filter(
            MedicalRecord.patient_id == patient_id,
            MedicalRecord.doctor_id == doctor_id,
            MedicalRecord.id != current_consultation_id  # Exclude current consultation
        ).count()
        
        is_first = previous_count == 0
        api_logger.debug(
            f"🔍 First consultation check: patient_id={patient_id}, doctor_id={doctor_id}, previous_count={previous_count}, is_first={is_first}"
        )
        return is_first
        
    except Exception as e:
        api_logger.error(f"Error checking first consultation: {str(e)}", exc_info=True)
        # En caso de error, asumir que NO es primera vez para no enviar múltiples avisos
        return False


def check_if_has_consent(db: Session, patient_id: int, doctor_id: int) -> bool:
    """
    Check if patient has an accepted privacy consent WITH THIS DOCTOR.

    Scope por doctor: cada médico es Responsable independiente bajo
    LFPDPPP. El consent con el Dr. A no cuenta para el Dr. B.
    """
    try:
        existing_consent = db.query(PrivacyConsent).filter(
            PrivacyConsent.patient_id == patient_id,
            PrivacyConsent.doctor_id == doctor_id,
            PrivacyConsent.consent_given == True,
        ).order_by(PrivacyConsent.created_at.desc()).first()

        return existing_consent is not None

    except Exception as e:
        api_logger.error(f"Error checking consent: {str(e)}", exc_info=True)
        return False


def check_if_first_appointment(db: Session, patient_id: int, doctor_id: int, current_appointment_id: int = None) -> bool:
    """
    Check if this is the patient's first appointment with this doctor
    Excludes the current appointment being created if provided
    Excludes cancelled appointments (so patients can rebook first-time if previous was cancelled)
    
    Args:
        db: Database session
        patient_id: Patient ID
        doctor_id: Doctor ID
        current_appointment_id: ID of the appointment being created (to exclude from count)
        
    Returns:
        True if this is the first appointment, False otherwise
    """
    try:
        from database import Appointment
        
        query = db.query(Appointment).filter(
            Appointment.patient_id == patient_id,
            Appointment.doctor_id == doctor_id,
            Appointment.status != 'cancelled'  # Exclude cancelled appointments
        )
        
        if current_appointment_id:
            query = query.filter(Appointment.id != current_appointment_id)
        
        previous_count = query.count()
        is_first = previous_count == 0
        
        api_logger.debug(
            f"🔍 First appointment check: patient_id={patient_id}, doctor_id={doctor_id}, previous_count={previous_count}, is_first={is_first}"
        )
        return is_first
        
    except Exception as e:
        api_logger.error(f"Error checking first appointment: {str(e)}", exc_info=True)
        return False


async def send_privacy_notice_automatically(
    db: Session,
    patient_id: int,
    doctor: Person,
    consultation_type: Optional[str] = None,
    is_first_appointment: Optional[bool] = None
) -> Optional[dict]:
    """
    Send privacy notice automatically via WhatsApp for first-time consultations/appointments
    Only sends if:
    1. It's a first-time consultation/appointment (consultation_type == 'Primera vez' OR first with this doctor)
    2. Patient has a phone number
    3. Patient doesn't already have accepted consent
    
    Args:
        db: Database session
        patient_id: Patient ID
        doctor: Doctor Person object
        consultation_type: Type of consultation ('Primera vez' or 'Seguimiento')
        is_first_appointment: Optional flag to indicate if this is first appointment (if None, will check)
        
    Returns:
        Result dictionary with success status, or None if conditions not met
    """
    try:
        # Check if it's first-time: either by consultation_type or by checking previous appointments
        is_first_time_type = consultation_type and consultation_type.lower() in ['primera vez', 'primera_vez', 'primera']
        
        # If is_first_appointment not provided, check automatically
        if is_first_appointment is None:
            is_first_appointment = check_if_first_appointment(db, patient_id, doctor.id)
        
        # Only send for first-time consultations/appointments
        if not is_first_time_type and not is_first_appointment:
            api_logger.debug(f"🔍 Skipping privacy notice: consultation_type='{consultation_type}', is_first_appointment={is_first_appointment}")
            return None
        
        # Check if patient already has consent with THIS doctor
        if check_if_has_consent(db, patient_id, doctor.id):
            api_logger.debug(f"✅ Patient {patient_id} already has privacy consent with doctor {doctor.id}, skipping auto-send")
            return {
                "success": False,
                "message": "Patient already has privacy consent with this doctor",
                "skipped": True
            }
        
        # Get patient
        patient = db.query(Person).filter(
            Person.id == patient_id,
            Person.person_type == 'patient'
        ).first()
        
        if not patient:
            api_logger.warning(f"⚠️ Patient {patient_id} not found for privacy notice")
            return None
        
        # Check if patient has phone
        if not patient.primary_phone:
            api_logger.debug(f"⚠️ Patient {patient_id} has no phone number, skipping privacy notice")
            return {
                "success": False,
                "message": "Patient has no phone number",
                "skipped": True
            }
        
        # Decrypt phone if encrypted
        encryption_service = EncryptionService()
        try:
            patient_phone_decrypted = encryption_service.decrypt_sensitive_data(patient.primary_phone)
        except Exception:
            patient_phone_decrypted = patient.primary_phone
        
        # Renderizar aviso con los datos del doctor como Responsable.
        # Si faltan campos legales (domicilio, email ARCO, cédula) NO
        # emitir — mejor no mandar aviso que mandar uno inválido que
        # exponga a CORTEX.
        try:
            rendered = render_active_notice(db, doctor)
        except MissingDoctorLegalDataError as e:
            api_logger.warning(
                f"⚠️ Doctor {doctor.id} incomplete legal profile, skipping auto-send: {e}"
            )
            return {
                "success": False,
                "message": f"Perfil legal del médico incompleto: {e}",
                "skipped": True,
            }
        except LookupError as e:
            api_logger.warning(f"⚠️ {e}")
            return None

        # URL del aviso con slug del doctor para que el paciente vea el
        # aviso del médico específico renderizado.
        privacy_url = f"https://cortexclinico.com/privacy?doctor={doctor.person_code}"

        consent = PrivacyConsent(
            patient_id=patient_id,
            doctor_id=doctor.id,
            notice_id=rendered.notice_id,
            consent_given=False,  # Pending until patient accepts
            consent_date=utc_now(),
            rendered_content_hash=rendered.content_hash,
        )
        
        db.add(consent)
        db.commit()
        db.refresh(consent)
        
        # Send via WhatsApp
        whatsapp = get_whatsapp_service()
        doctor_title = doctor.title or 'Dr.'
        doctor_full_name = doctor.name or 'Médico'
        doctor_name = f"{doctor_title} {doctor_full_name}"
        patient_first_name = patient.name.split()[0] if patient.name else 'Paciente'
        
        result = whatsapp.send_interactive_privacy_notice(
            patient_name=patient_first_name,
            patient_phone=patient_phone_decrypted,
            doctor_name=doctor_name,
            doctor_title=doctor_title,
            doctor_full_name=doctor_full_name,
            privacy_notice_url=privacy_url,
            consent_id=consent.id
        )
        
        if not result.get('success'):
            # If WhatsApp send fails, delete consent record
            db.delete(consent)
            db.commit()
            
            api_logger.warning(f"⚠️ Failed to send privacy notice automatically: {result.get('error')}")
            return {
                "success": False,
                "message": f"WhatsApp send failed: {result.get('error')}",
                "skipped": False
            }
        
        # Update consent with WhatsApp message info
        db.commit()
        
        security_logger.info(
            "🔐 Privacy notice sent automatically for first consultation",
            extra={
                "patient_id": patient_id,
                "doctor_id": doctor.id,
                "consent_id": consent.id,
                "message_id": result.get('message_id')
            }
        )
        
        return {
            "success": True,
            "message": "Privacy notice sent automatically via WhatsApp",
            "consent_id": consent.id,
            "message_id": result.get('message_id'),
            "privacy_url": privacy_url
        }
        
    except Exception as e:
        api_logger.error(f"❌ Error sending privacy notice automatically: {str(e)}", exc_info=True)
        # Don't raise exception - this is a background operation
        return {
            "success": False,
            "message": f"Error: {str(e)}",
            "skipped": False
        }

