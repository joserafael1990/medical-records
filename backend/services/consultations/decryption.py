"""
Data decryption helpers for consultation service
"""
from typing import Dict
from database import Person, MedicalRecord
from logger import get_logger

api_logger = get_logger("medical_records.api")

def decrypt_patient_data(patient: Person, decrypt_fn: callable) -> Dict[str, str]:
    """
    Decrypt patient sensitive data
    """
    try:
        return decrypt_fn({
            "name": patient.name
        }, "patient")
    except Exception as e:
        api_logger.warning("Could not decrypt patient data", error=str(e))
        # Fallback to original values if decryption fails
        return {
            "name": patient.name
        }


def decrypt_consultation_data(consultation: MedicalRecord, decrypt_fn: callable) -> Dict[str, str]:
    """
    Decrypt consultation sensitive data
    """
    fields_to_decrypt = {
        "chief_complaint": consultation.chief_complaint,
        "history_present_illness": consultation.history_present_illness,
        "family_history": consultation.family_history,
        "perinatal_history": consultation.perinatal_history,
        "personal_pathological_history": consultation.personal_pathological_history,
        "gynecological_and_obstetric_history": consultation.gynecological_and_obstetric_history,
        "personal_non_pathological_history": consultation.personal_non_pathological_history,
        "physical_examination": consultation.physical_examination,
        "primary_diagnosis": consultation.primary_diagnosis,
        "secondary_diagnoses": consultation.secondary_diagnoses,
        "treatment_plan": consultation.treatment_plan,
        "follow_up_instructions": consultation.follow_up_instructions,
        "laboratory_results": consultation.laboratory_results,
        "notes": consultation.notes
    }
    
    try:
        return decrypt_fn(fields_to_decrypt, "consultation")
    except Exception as e:
        api_logger.warning("Could not decrypt consultation data", error=str(e))
        # Return original encrypted data if decryption fails
        return fields_to_decrypt
