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


# ============================================================================
# CREATE CONSULTATION HELPERS
# ============================================================================

def encrypt_consultation_fields(consultation_data: Dict[str, Any], encrypt_fn: callable) -> Dict[str, Any]:
    """
    Encrypt consultation sensitive fields
    
    Args:
        consultation_data: Raw consultation data
        encrypt_fn: Encryption function
        
    Returns:
        Dictionary with encrypted consultation data
    """
    return encrypt_fn(consultation_data, "consultation")


def parse_consultation_date(date_str: Optional[str], now_fn: callable, cdmx_fn: callable):
    """
    Parse consultation date from string to datetime
    
    Args:
        date_str: ISO datetime string
        now_fn: Function to get current datetime
        cdmx_fn: Function to parse datetime in CDMX timezone
        
    Returns:
        Datetime object (naive, in CDMX time)
    """
    if date_str:
        # Parse ISO datetime string as CDMX time
        consultation_date_with_tz = cdmx_fn(date_str)
        # Remove timezone info to store as naive datetime in CDMX time
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
    
    Args:
        encrypted_data: Encrypted consultation data
        consultation_date: Parsed consultation date
        doctor_id: ID of the doctor
        
    Returns:
        MedicalRecord object (not saved to DB yet)
    """
    return MedicalRecord(
        patient_id=encrypted_data.get("patient_id"),
        doctor_id=doctor_id,
        consultation_date=consultation_date,
        chief_complaint=encrypted_data.get("chief_complaint", ""),
        history_present_illness=encrypted_data.get("history_present_illness", ""),
        family_history=encrypted_data.get("family_history", ""),
        personal_pathological_history=encrypted_data.get("personal_pathological_history", ""),
        personal_non_pathological_history=encrypted_data.get("personal_non_pathological_history", ""),
        physical_examination=encrypted_data.get("physical_examination", ""),
        laboratory_results=encrypted_data.get("laboratory_results", ""),
        primary_diagnosis=encrypted_data.get("primary_diagnosis", ""),
        prescribed_medications=encrypted_data.get("prescribed_medications", ""),
        treatment_plan=encrypted_data.get("treatment_plan", ""),
        follow_up_instructions=encrypted_data.get("follow_up_instructions", ""),
        prognosis=encrypted_data.get("prognosis", ""),
        secondary_diagnoses=encrypted_data.get("secondary_diagnoses", ""),
        notes=encrypted_data.get("notes") or encrypted_data.get("interconsultations", ""),
        consultation_type=encrypted_data.get("consultation_type", "Seguimiento"),
        created_by=doctor_id
    )


def prepare_consultation_for_signing(medical_record: MedicalRecord) -> Dict[str, Any]:
    """
    Prepare consultation data for digital signing
    
    Args:
        medical_record: MedicalRecord object
        
    Returns:
        Dictionary with consultation data for signing
    """
    return {
        "id": medical_record.id,
        "patient_id": medical_record.patient_id,
        "doctor_id": medical_record.doctor_id,
        "consultation_date": medical_record.consultation_date.isoformat(),
        "chief_complaint": medical_record.chief_complaint,
        "primary_diagnosis": medical_record.primary_diagnosis,
        "treatment_plan": medical_record.treatment_plan
    }


def mark_appointment_completed(db: Session, appointment_id: Optional[int], doctor_id: int) -> bool:
    """
    Mark appointment as completed
    
    Args:
        db: Database session
        appointment_id: Appointment ID
        doctor_id: Doctor ID (for security check)
        
    Returns:
        True if marked successfully, False otherwise
    """
    if not appointment_id:
        return False
    
    try:
        from database import Appointment
        appointment = db.query(Appointment).filter(Appointment.id == appointment_id).first()
        if appointment and appointment.doctor_id == doctor_id:
            appointment.status = 'completed'
            db.commit()
            print(f"✅ Appointment {appointment_id} marked as completed")
            return True
        else:
            print(f"⚠️ Appointment {appointment_id} not found or access denied")
            return False
    except Exception as e:
        print(f"❌ Error updating appointment status: {str(e)}")
        return False


def get_patient_info(db: Session, patient_id: Optional[int]) -> tuple[str, Optional[Person]]:
    """
    Get patient information
    
    Args:
        db: Database session
        patient_id: Patient ID
        
    Returns:
        Tuple of (patient_name, patient_object)
    """
    if not patient_id:
        return "Paciente No Identificado", None
    
    patient = db.query(Person).filter(
        Person.id == patient_id,
        Person.person_type == "patient"
    ).first()
    
    if patient:
        patient_name = f"{patient.first_name} {patient.paternal_surname} {patient.maternal_surname or ''}".strip()
        return patient_name, patient
    
    return "Paciente No Identificado", None


def build_create_consultation_response(
    medical_record: MedicalRecord,
    patient_name: str,
    doctor_name: str,
    digital_signature: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Build response for create consultation
    
    Args:
        medical_record: Created MedicalRecord object
        patient_name: Formatted patient name
        doctor_name: Formatted doctor name
        digital_signature: Digital signature data
        
    Returns:
        Complete response dictionary
    """
    consultation_end_time = medical_record.consultation_date + timedelta(minutes=30)
    
    return {
        "id": medical_record.id,
        "patient_id": medical_record.patient_id,
        "consultation_date": medical_record.consultation_date.isoformat(),
        "end_time": consultation_end_time.isoformat(),
        "chief_complaint": medical_record.chief_complaint,
        "history_present_illness": medical_record.history_present_illness,
        "family_history": medical_record.family_history,
        "personal_pathological_history": medical_record.personal_pathological_history,
        "personal_non_pathological_history": medical_record.personal_non_pathological_history,
        "physical_examination": medical_record.physical_examination,
        "primary_diagnosis": medical_record.primary_diagnosis,
        "secondary_diagnoses": medical_record.secondary_diagnoses,
        "treatment_plan": medical_record.treatment_plan,
        "therapeutic_plan": medical_record.treatment_plan,  # Alias for compatibility
        "follow_up_instructions": medical_record.follow_up_instructions,
        "prognosis": medical_record.prognosis,
        "laboratory_results": medical_record.laboratory_results,
        "imaging_studies": medical_record.laboratory_results,  # Alias for compatibility
        "notes": medical_record.notes,
        "interconsultations": medical_record.notes,  # Alias for compatibility
        "consultation_type": medical_record.consultation_type,
        "created_by": medical_record.created_by,
        "created_at": medical_record.created_at.isoformat(),
        "patient_name": patient_name,
        "doctor_name": doctor_name,
        "date": medical_record.consultation_date.isoformat(),
        "digital_signature": digital_signature,
        "security_features": {
            "encrypted": True,
            "digitally_signed": True,
            "signature_id": digital_signature["signatures"][0]["signature_id"],
            "signature_timestamp": digital_signature["last_signature_timestamp"]
        }
    }

