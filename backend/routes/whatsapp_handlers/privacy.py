"""
Privacy consent handling for WhatsApp integration
"""
from datetime import datetime
from sqlalchemy.orm import Session
from database import PrivacyConsent, Person
from whatsapp_service import get_whatsapp_service
from audit_service import audit_service
from logger import get_logger

api_logger = get_logger("medical_records.api")

async def process_privacy_consent(consent_id: int, from_phone: str, timestamp: str, db: Session, request=None) -> bool:
    """
    Process privacy consent acceptance via WhatsApp button
    """
    try:
        consent = db.query(PrivacyConsent).filter(
            PrivacyConsent.id == consent_id
        ).first()
        
        if not consent:
            return False
        
        patient = db.query(Person).filter(
            Person.id == consent.patient_id
        ).first()
        
        if not patient:
            return False
        
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
                "button_id": f"accept_privacy_{consent_id}",
                "consent_id": consent_id,
                "method": "whatsapp_button"
            },
            security_level='INFO'
        )
        return True
        
    except Exception as e:
        api_logger.error("Error processing privacy consent", exc_info=True)
        return False
