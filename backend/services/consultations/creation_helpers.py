"""
Helper functions for creating consultations
"""
from typing import Dict, Any, Optional
from datetime import datetime
from sqlalchemy.orm import Session
from database import MedicalRecord, Appointment
from logger import get_logger

api_logger = get_logger("medical_records.api")

def encrypt_consultation_fields(consultation_data: Dict[str, Any], encrypt_fn: callable) -> Dict[str, Any]:
    """
    Encrypt consultation sensitive fields
    """
    return encrypt_fn(consultation_data, "consultation")


def parse_consultation_date(date_str: Optional[str], now_fn: callable, cdmx_fn: callable):
    """
    Parse consultation date from string to datetime
    """
    if date_str:
        consultation_date_with_tz = cdmx_fn(date_str)
        return consultation_date_with_tz.replace(tzinfo=None)
    else:
        return now_fn().replace(tzinfo=None)


def create_medical_record_object(
    encrypted_data: Dict[str, Any],
    consultation_date,
    doctor_id: int
) -> MedicalRecord:
    """
    Create MedicalRecord object from encrypted data
    """
    return MedicalRecord(
        patient_id=encrypted_data.get("patient_id"),
        doctor_id=doctor_id,
        consultation_date=consultation_date,
        patient_document_id=encrypted_data.get("patient_document_id"),
        patient_document_value=encrypted_data.get("patient_document_value"),
        chief_complaint=encrypted_data.get("chief_complaint", ""),
        history_present_illness=encrypted_data.get("history_present_illness", ""),
        family_history=encrypted_data.get("family_history", ""),
        perinatal_history=encrypted_data.get("perinatal_history", ""),
        gynecological_and_obstetric_history=encrypted_data.get("gynecological_and_obstetric_history", ""),
        personal_pathological_history=encrypted_data.get("personal_pathological_history", ""),
        personal_non_pathological_history=encrypted_data.get("personal_non_pathological_history", ""),
        physical_examination=encrypted_data.get("physical_examination", ""),
        laboratory_results=encrypted_data.get("laboratory_results", ""),
        primary_diagnosis=encrypted_data.get("primary_diagnosis", ""),
        prescribed_medications=encrypted_data.get("prescribed_medications", ""),
        treatment_plan=encrypted_data.get("treatment_plan", ""),
        follow_up_instructions=encrypted_data.get("follow_up_instructions", ""),
        secondary_diagnoses=encrypted_data.get("secondary_diagnoses", ""),
        notes=encrypted_data.get("notes") or encrypted_data.get("interconsultations", ""),
        consultation_type=encrypted_data.get("consultation_type", "Seguimiento"),
        created_by=doctor_id
    )


def prepare_consultation_for_signing(medical_record: MedicalRecord) -> Dict[str, Any]:
    """
    Prepare consultation data for digital signing
    """
    return {
        "id": medical_record.id,
        "patient_id": medical_record.patient_id,
        "doctor_id": medical_record.doctor_id,
        "consultation_date": medical_record.consultation_date.isoformat(),
        "chief_complaint": medical_record.chief_complaint,
        "primary_diagnosis": medical_record.primary_diagnosis,
        "treatment_plan": medical_record.treatment_plan,
        "follow_up_instructions": medical_record.follow_up_instructions,
        "patient_document_id": medical_record.patient_document_id,
        "patient_document_value": medical_record.patient_document_value
    }


def mark_appointment_completed(db: Session, appointment_id: Optional[int], doctor_id: int) -> bool:
    """
    Mark appointment as completed
    """
    if not appointment_id:
        return False
    
    try:
        appointment = db.query(Appointment).filter(Appointment.id == appointment_id).first()
        if appointment and appointment.doctor_id == doctor_id:
            appointment.status = 'completed'
            db.commit()
            return True
        else:
            api_logger.warning("Appointment not found or access denied", appointment_id=appointment_id)
            return False
    except Exception as e:
        api_logger.error("Error updating appointment status", appointment_id=appointment_id, error=str(e), exc_info=True)
        return False
