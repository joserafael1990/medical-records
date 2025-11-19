# ============================================================================
# CONSULTATION SERVICE - Helper functions for consultation operations
# ============================================================================

from typing import Dict, List, Optional, Any
from sqlalchemy.orm import Session
from database import MedicalRecord, Person, VitalSign, ConsultationVitalSign, ConsultationPrescription, Medication, ClinicalStudy
from datetime import timedelta
from logger import get_logger

api_logger = get_logger("medical_records.api")

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
        "perinatal_history": consultation.perinatal_history,
        "personal_pathological_history": consultation.personal_pathological_history,
        "gynecological_and_obstetric_history": consultation.gynecological_and_obstetric_history,
        "personal_non_pathological_history": consultation.personal_non_pathological_history,
        "physical_examination": consultation.physical_examination,
        "primary_diagnosis": consultation.primary_diagnosis,
        "secondary_diagnoses": consultation.secondary_diagnoses,
        "treatment_plan": consultation.treatment_plan,
        "laboratory_results": consultation.laboratory_results,
        "notes": consultation.notes
    }
    
    try:
        return decrypt_fn(fields_to_decrypt, "consultation")
    except Exception as e:
        api_logger.warning("Could not decrypt consultation data", error=str(e))
        # Return original encrypted data if decryption fails
        return fields_to_decrypt


# ============================================================================
# FORMATTING HELPERS
# ============================================================================

def format_patient_name(decrypted_data: Dict[str, str]) -> str:
    """
    Format patient name from decrypted data
    
    Args:
        decrypted_data: Dictionary with name
        
    Returns:
        Formatted patient name
    """
    name = decrypted_data.get("name", "")
    
    return name.strip() or "Paciente No Identificado"


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
    return doctor.name


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
            "vital_sign_id": vs.vital_sign_id,
            "value": vs.value,
            "unit": vs.unit or "",
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
            "medication_name": rx.medication.name if rx.medication else "",  # Campo calculado desde medication.name
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
            "description": study.clinical_indication or "",  # Use clinical_indication instead of non-existent study_description
            "pdf_url": study.file_path,  # Corregido: file_path en lugar de pdf_path
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
        "patient_document_id": consultation.patient_document_id,
        "patient_document_value": consultation.patient_document_value,
        "patient_document_name": consultation.patient_document.name if consultation.patient_document else None,
        "chief_complaint": decrypted_consultation.get("chief_complaint", ""),
        "history_present_illness": decrypted_consultation.get("history_present_illness", ""),
        "family_history": decrypted_consultation.get("family_history", ""),
        "perinatal_history": decrypted_consultation.get("perinatal_history", ""),
        "gynecological_and_obstetric_history": decrypted_consultation.get("gynecological_and_obstetric_history", ""),
        "personal_pathological_history": decrypted_consultation.get("personal_pathological_history", ""),
        "personal_non_pathological_history": decrypted_consultation.get("personal_non_pathological_history", ""),
        "physical_examination": decrypted_consultation.get("physical_examination", ""),
        "primary_diagnosis": decrypted_consultation.get("primary_diagnosis", ""),
        "secondary_diagnoses": decrypted_consultation.get("secondary_diagnoses", ""),
        "treatment_plan": decrypted_consultation.get("treatment_plan", ""),
        "follow_up_instructions": decrypted_consultation.get("follow_up_instructions", ""),
        "therapeutic_plan": decrypted_consultation.get("treatment_plan", ""),  # Alias for compatibility
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
        # appointment_type_id and office_id columns don't exist in medical_records table - removed
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
        "treatment_plan": medical_record.treatment_plan,
        "follow_up_instructions": medical_record.follow_up_instructions,
        "patient_document_id": medical_record.patient_document_id,
        "patient_document_value": medical_record.patient_document_value
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
            api_logger.warning("Appointment not found or access denied", appointment_id=appointment_id)
            return False
    except Exception as e:
        api_logger.error("Error updating appointment status", appointment_id=appointment_id, error=str(e), exc_info=True)
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
        patient_name = patient.name
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
        "patient_document_id": medical_record.patient_document_id,
        "patient_document_value": medical_record.patient_document_value,
        "patient_document_name": medical_record.patient_document.name if medical_record.patient_document else None,
        "consultation_date": medical_record.consultation_date.isoformat(),
        "end_time": consultation_end_time.isoformat(),
        "chief_complaint": medical_record.chief_complaint,
        "history_present_illness": medical_record.history_present_illness,
        "family_history": medical_record.family_history,
        "perinatal_history": medical_record.perinatal_history,
        "gynecological_and_obstetric_history": medical_record.gynecological_and_obstetric_history,
        "personal_pathological_history": medical_record.personal_pathological_history,
        "personal_non_pathological_history": medical_record.personal_non_pathological_history,
        "physical_examination": medical_record.physical_examination,
        "primary_diagnosis": medical_record.primary_diagnosis,
        "secondary_diagnoses": medical_record.secondary_diagnoses,
        "treatment_plan": medical_record.treatment_plan,
        "follow_up_instructions": medical_record.follow_up_instructions,
        "therapeutic_plan": medical_record.treatment_plan,  # Alias for compatibility
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


# ============================================================================
# DIAGNOSIS CATALOG HELPERS - CIE-10 Compliance (Simple Validation)
# ============================================================================

def format_diagnosis_with_code(diagnosis_code: str, diagnosis_name: str) -> str:
    """
    Format diagnosis with CIE-10 code for storage
    Compliance: NOM-004-SSA3-2012 - Register diagnosis codes and descriptions from official catalog
    
    Args:
        diagnosis_code: CIE-10 code from catalog
        diagnosis_name: Diagnosis description/name from catalog
        
    Returns:
        Formatted string: "CIE-10: [código] - [descripción]"
    """
    if diagnosis_code and diagnosis_name:
        return f"CIE-10: {diagnosis_code} - {diagnosis_name}"
    elif diagnosis_name:
        return diagnosis_name
    else:
        return ""

def validate_diagnosis_from_catalog(
    db: Session,
    diagnosis_id: Optional[int] = None,
    diagnosis_code: Optional[str] = None
) -> Optional[Dict[str, Any]]:
    """
    Validate that diagnosis exists in CIE-10 catalog
    Compliance: NOM-004-SSA3-2012 - Validate diagnosis codes from official catalog
    
    Args:
        db: Database session
        diagnosis_id: Diagnosis catalog ID
        diagnosis_code: CIE-10 code
        
    Returns:
        Diagnosis dictionary with code and name if valid, None otherwise
    """
    try:
        from models.diagnosis import DiagnosisCatalog
        
        if diagnosis_id:
            diagnosis = db.query(DiagnosisCatalog).filter(
                DiagnosisCatalog.id == diagnosis_id,
                DiagnosisCatalog.is_active == True
            ).first()
        elif diagnosis_code:
            diagnosis = db.query(DiagnosisCatalog).filter(
                DiagnosisCatalog.code == diagnosis_code,
                DiagnosisCatalog.is_active == True
            ).first()
        else:
            return None
        
        if diagnosis:
            return {
                "id": diagnosis.id,
                "code": diagnosis.code,
                "name": diagnosis.name,
                "description": diagnosis.name  # Diagnosis.name contains the description
            }
        return None
    except Exception as e:
        api_logger.error("Error validating diagnosis", error=str(e), exc_info=True)
        return None

def format_diagnoses_from_catalog(
    db: Session,
    primary_diagnoses: Optional[List[Dict[str, Any]]] = None,
    secondary_diagnoses: Optional[List[Dict[str, Any]]] = None
) -> tuple[str, str]:
    """
    Format diagnoses from catalog for storage in text fields
    Compliance: NOM-004-SSA3-2012 - Register diagnosis codes and descriptions from official catalog
    
    Args:
        db: Database session
        primary_diagnoses: List of primary diagnosis objects from catalog
        secondary_diagnoses: List of secondary diagnosis objects from catalog
        
    Returns:
        Tuple of (primary_diagnosis_text, secondary_diagnoses_text)
    """
    primary_text = ""
    secondary_text = ""
    
    # Format primary diagnosis
    if primary_diagnoses and len(primary_diagnoses) > 0:
        primary = primary_diagnoses[0]  # Take first primary diagnosis
        diagnosis_id = primary.get("id")
        diagnosis_code = primary.get("code", "")
        diagnosis_name = primary.get("name", "")
        
        # Validate against catalog
        validated = validate_diagnosis_from_catalog(db, diagnosis_id, diagnosis_code)
        if validated:
            primary_text = format_diagnosis_with_code(validated["code"], validated["name"])
        elif diagnosis_code and diagnosis_name:
            # Use provided values if validation fails (fallback)
            primary_text = format_diagnosis_with_code(diagnosis_code, diagnosis_name)
        elif diagnosis_name:
            primary_text = diagnosis_name
    
    # Format secondary diagnoses
    if secondary_diagnoses and len(secondary_diagnoses) > 0:
        secondary_list = []
        for diagnosis in secondary_diagnoses:
            diagnosis_id = diagnosis.get("id")
            diagnosis_code = diagnosis.get("code", "")
            diagnosis_name = diagnosis.get("name", "")
            
            # Validate against catalog
            validated = validate_diagnosis_from_catalog(db, diagnosis_id, diagnosis_code)
            if validated:
                secondary_list.append(format_diagnosis_with_code(validated["code"], validated["name"]))
            elif diagnosis_code and diagnosis_name:
                # Use provided values if validation fails (fallback)
                secondary_list.append(format_diagnosis_with_code(diagnosis_code, diagnosis_name))
            elif diagnosis_name:
                secondary_list.append(diagnosis_name)
        
        secondary_text = "; ".join(secondary_list)
    
    return primary_text, secondary_text

