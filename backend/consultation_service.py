# ============================================================================
# CONSULTATION SERVICE - Helper functions for consultation operations
# ============================================================================

from typing import Dict, List, Optional, Any
from sqlalchemy.orm import Session
from database import MedicalRecord, Person, VitalSign, ConsultationVitalSign, ConsultationPrescription, Medication, ClinicalStudy
from datetime import timedelta

# ============================================================================
# DECRYPTION HELPERS
# ============================================================================

def decrypt_patient_data(patient: Person, decrypt_fn: callable) -> Dict[str, str]:
    """
    Decrypt patient sensitive data
    
    Args:
        patient: Patient object
        decrypt_fn: Decryption function
        
    Returns:
        Dictionary with decrypted patient data
    """
    try:
        return decrypt_fn({
            "first_name": patient.first_name,
            "paternal_surname": patient.paternal_surname,
            "maternal_surname": patient.maternal_surname
        }, "patient")
    except Exception as e:
        print(f"⚠️ Could not decrypt patient data: {str(e)}")
        # Fallback to original values if decryption fails
        return {
            "first_name": patient.first_name,
            "paternal_surname": patient.paternal_surname,
            "maternal_surname": patient.maternal_surname
        }


def decrypt_consultation_data(consultation: MedicalRecord, decrypt_fn: callable) -> Dict[str, str]:
    """
    Decrypt consultation sensitive data
    
    Args:
        consultation: MedicalRecord object
        decrypt_fn: Decryption function
        
    Returns:
        Dictionary with decrypted consultation data
    """
    fields_to_decrypt = {
        "chief_complaint": consultation.chief_complaint,
        "history_present_illness": consultation.history_present_illness,
        "family_history": consultation.family_history,
        "personal_pathological_history": consultation.personal_pathological_history,
        "personal_non_pathological_history": consultation.personal_non_pathological_history,
        "physical_examination": consultation.physical_examination,
        "primary_diagnosis": consultation.primary_diagnosis,
        "secondary_diagnoses": consultation.secondary_diagnoses,
        "treatment_plan": consultation.treatment_plan,
        "follow_up_instructions": consultation.follow_up_instructions,
        "prognosis": consultation.prognosis,
        "laboratory_results": consultation.laboratory_results,
        "notes": consultation.notes
    }
    
    try:
        return decrypt_fn(fields_to_decrypt, "consultation")
    except Exception as e:
        print(f"⚠️ Could not decrypt consultation data: {str(e)}")
        # Return original encrypted data if decryption fails
        return fields_to_decrypt


# ============================================================================
# FORMATTING HELPERS
# ============================================================================

def format_patient_name(decrypted_data: Dict[str, str]) -> str:
    """
    Format patient name from decrypted data
    
    Args:
        decrypted_data: Dictionary with first_name, paternal_surname, maternal_surname
        
    Returns:
        Formatted patient name
    """
    first_name = decrypted_data.get("first_name", "")
    paternal_surname = decrypted_data.get("paternal_surname", "")
    maternal_surname = decrypted_data.get("maternal_surname", "") or ""
    
    return f"{first_name} {paternal_surname} {maternal_surname}".strip() or "Paciente No Identificado"


def format_doctor_name(doctor: Optional[Person]) -> str:
    """
    Format doctor name
    
    Args:
        doctor: Doctor Person object
        
    Returns:
        Formatted doctor name
    """
    if not doctor:
        return "Doctor"
    return f"{doctor.first_name} {doctor.paternal_surname}".strip()


# ============================================================================
# DATA RETRIEVAL HELPERS
# ============================================================================

def get_consultation_vital_signs(db: Session, consultation_id: int) -> List[Dict[str, Any]]:
    """
    Get vital signs for a consultation
    
    Args:
        db: Database session
        consultation_id: Consultation ID
        
    Returns:
        List of vital signs dictionaries
    """
    vital_signs = db.query(ConsultationVitalSign).filter(
        ConsultationVitalSign.consultation_id == consultation_id
    ).all()
    
    return [
        {
            "id": vs.id,
            "systolic_pressure": vs.systolic_pressure,
            "diastolic_pressure": vs.diastolic_pressure,
            "heart_rate": vs.heart_rate,
            "respiratory_rate": vs.respiratory_rate,
            "temperature": vs.temperature,
            "oxygen_saturation": vs.oxygen_saturation,
            "weight": vs.weight,
            "height": vs.height,
            "bmi": vs.bmi,
            "created_at": vs.created_at.isoformat() if vs.created_at else None
        }
        for vs in vital_signs
    ]


def get_consultation_prescriptions(db: Session, consultation_id: int) -> List[Dict[str, Any]]:
    """
    Get prescriptions for a consultation
    
    Args:
        db: Database session
        consultation_id: Consultation ID
        
    Returns:
        List of prescriptions dictionaries
    """
    prescriptions = db.query(ConsultationPrescription).join(
        Medication, ConsultationPrescription.medication_id == Medication.id
    ).filter(
        ConsultationPrescription.consultation_id == consultation_id
    ).all()
    
    return [
        {
            "id": rx.id,
            "consultation_id": rx.consultation_id,
            "medication_id": rx.medication_id,
            "medication_name": rx.medication.name if rx.medication else "",
            "dosage": rx.dosage,
            "frequency": rx.frequency,
            "duration": rx.duration,
            "instructions": rx.instructions,
            "quantity": rx.quantity,
            "via_administracion": rx.via_administracion,
            "created_at": rx.created_at.isoformat() if rx.created_at else None
        }
        for rx in prescriptions
    ]


def get_consultation_clinical_studies(db: Session, consultation_id: int) -> List[Dict[str, Any]]:
    """
    Get clinical studies for a consultation
    
    Args:
        db: Database session
        consultation_id: Consultation ID
        
    Returns:
        List of clinical studies dictionaries
    """
    studies = db.query(ClinicalStudy).filter(
        ClinicalStudy.consultation_id == consultation_id
    ).order_by(ClinicalStudy.created_at.desc()).all()
    
    return [
        {
            "id": study.id,
            "study_name": study.study_name,
            "study_type": study.study_type,
            "description": study.description,
            "pdf_url": study.pdf_path,
            "created_at": study.created_at.isoformat() if study.created_at else None
        }
        for study in studies
    ]


# ============================================================================
# RESPONSE BUILDERS
# ============================================================================

def build_consultation_response(
    consultation: MedicalRecord,
    decrypted_consultation: Dict[str, str],
    patient_name: str,
    doctor_name: str,
    vital_signs: List[Dict[str, Any]],
    prescriptions: List[Dict[str, Any]],
    clinical_studies: List[Dict[str, Any]]
) -> Dict[str, Any]:
    """
    Build consultation response object
    
    Args:
        consultation: MedicalRecord object
        decrypted_consultation: Decrypted consultation data
        patient_name: Formatted patient name
        doctor_name: Formatted doctor name
        vital_signs: List of vital signs
        prescriptions: List of prescriptions
        clinical_studies: List of clinical studies
        
    Returns:
        Complete consultation response dictionary
    """
    consultation_date_iso = consultation.consultation_date.isoformat()
    consultation_end_time = consultation.consultation_date + timedelta(minutes=30)
    
    return {
        "id": consultation.id,
        "patient_id": consultation.patient_id,
        "consultation_date": consultation_date_iso,
        "end_time": consultation_end_time.isoformat(),
        "chief_complaint": decrypted_consultation.get("chief_complaint", ""),
        "history_present_illness": decrypted_consultation.get("history_present_illness", ""),
        "family_history": decrypted_consultation.get("family_history", ""),
        "personal_pathological_history": decrypted_consultation.get("personal_pathological_history", ""),
        "personal_non_pathological_history": decrypted_consultation.get("personal_non_pathological_history", ""),
        "physical_examination": decrypted_consultation.get("physical_examination", ""),
        "primary_diagnosis": decrypted_consultation.get("primary_diagnosis", ""),
        "secondary_diagnoses": decrypted_consultation.get("secondary_diagnoses", ""),
        "treatment_plan": decrypted_consultation.get("treatment_plan", ""),
        "therapeutic_plan": decrypted_consultation.get("treatment_plan", ""),  # Alias for compatibility
        "follow_up_instructions": decrypted_consultation.get("follow_up_instructions", ""),
        "prognosis": decrypted_consultation.get("prognosis", ""),
        "laboratory_results": decrypted_consultation.get("laboratory_results", ""),
        "notes": decrypted_consultation.get("notes", ""),
        "patient_name": patient_name,
        "doctor_name": doctor_name,
        "vital_signs": vital_signs,
        "prescribed_medications": prescriptions,
        "clinical_studies": clinical_studies
    }

