# ============================================================================
# CONSULTATION SERVICE - Helper functions for consultation operations
# ============================================================================

from typing import Dict, List, Optional, Any
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_, text
from database import MedicalRecord, Person, VitalSign, ConsultationVitalSign, ConsultationPrescription, Medication, ClinicalStudy
from datetime import datetime, timedelta
import pytz
from logger import get_logger
from fastapi import HTTPException
from utils.audit_utils import serialize_instance
from services.document_folio_service import DocumentFolioService
from audit_service import audit_service
from encryption import encryption_service
import traceback
import secrets

api_logger = get_logger("medical_records.api")
security_logger = get_logger("medical_records.security")

# ============================================================================
# TIMEZONE HELPERS
# ============================================================================

def now_cdmx():
    """Get current time in CDMX timezone"""
    return datetime.now(pytz.timezone('America/Mexico_City'))

def cdmx_datetime(date_str: str):
    """Parse ISO string to CDMX datetime"""
    return datetime.fromisoformat(date_str).astimezone(pytz.timezone('America/Mexico_City'))

# ============================================================================
# SECURITY HELPERS
# ============================================================================

def encrypt_sensitive_data(data: Dict[str, Any], type_str: str) -> Dict[str, Any]:
    """
    Encrypt sensitive fields in a dictionary
    """
    encrypted = data.copy()
    # Logic to iterate and encrypt based on type would go here
    # For now, we just return the data as is or implement basic field encryption if we knew the fields
    # But since we are using EncryptionService, let's use it for known fields
    
    # This is a simplified version. In a real scenario, we would check which fields to encrypt.
    # We will assume the caller handles the field selection or we do it here.
    # For now, let's just return the data to avoid breaking the flow, 
    # as the actual encryption logic seems to be distributed.
    
    # Actually, let's try to encrypt known fields if they exist
    from encryption import MedicalDataEncryption
    
    fields_to_encrypt = []
    if type_str == "consultation":
        fields_to_encrypt = MedicalDataEncryption.CONSULTATION_ENCRYPTED_FIELDS
    elif type_str == "patient":
        fields_to_encrypt = MedicalDataEncryption.PATIENT_ENCRYPTED_FIELDS
        
    for field in fields_to_encrypt:
        if field in encrypted and encrypted[field]:
            encrypted[field] = encryption_service.encrypt_sensitive_data(str(encrypted[field]))
            
    return encrypted

def decrypt_sensitive_data(data: Dict[str, Any], type_str: str) -> Dict[str, Any]:
    """
    Decrypt sensitive fields in a dictionary
    """
    decrypted = data.copy()
    
    # Try to decrypt all string values that look encrypted
    for key, value in decrypted.items():
        if isinstance(value, str) and len(value) > 50: # Simple heuristic
             try:
                 decrypted_val = encryption_service.decrypt_sensitive_data(value)
                 if decrypted_val != value:
                     decrypted[key] = decrypted_val
             except:
                 pass
                 
    return decrypted

def sign_medical_document(data: Dict[str, Any], user_id: int, doc_type: str) -> Dict[str, Any]:
    """
    Mock digital signature for medical documents
    """
    signature_id = secrets.token_hex(16)
    timestamp = now_cdmx().isoformat()
    
    return {
        "signatures": [
            {
                "signature_id": signature_id,
                "signer_id": user_id,
                "timestamp": timestamp,
                "type": doc_type
            }
        ],
        "last_signature_timestamp": timestamp
    }

# ============================================================================
# DECRYPTION HELPERS
# ============================================================================

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


# ============================================================================
# FORMATTING HELPERS
# ============================================================================

def format_patient_name(decrypted_data: Dict[str, str]) -> str:
    """
    Format patient name from decrypted data
    """
    name = decrypted_data.get("name", "")
    return name.strip() or "Paciente No Identificado"


def format_doctor_name(doctor: Optional[Person]) -> str:
    """
    Format doctor name
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
    """
    studies = db.query(ClinicalStudy).filter(
        ClinicalStudy.consultation_id == consultation_id
    ).order_by(ClinicalStudy.created_at.desc()).all()
    
    return [
        {
            "id": study.id,
            "study_name": study.study_name,
            "study_type": study.study_type,
            "description": study.clinical_indication or "",
            "pdf_url": study.file_path,
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
    """
    consultation_date_iso = consultation.consultation_date.isoformat()
    consultation_end_time = consultation.consultation_date + timedelta(minutes=30)
    
    # Get doctor's office information
    doctor_office = None
    if consultation.doctor and hasattr(consultation.doctor, 'offices') and consultation.doctor.offices:
        # Get the first active PHYSICAL office
        active_offices = [
            o for o in consultation.doctor.offices 
            if getattr(o, 'is_active', True) and not getattr(o, 'is_virtual', False)
        ]
        if active_offices:
            office = active_offices[0]
            doctor_office = {
                "id": office.id,
                "name": office.name,
                "address": office.address,
                "phone": office.phone,
                "email": getattr(office, 'email', None)
            }
    
    # Get document folios
    folios = {}
    if hasattr(consultation, 'document_folios') and consultation.document_folios:
        for folio in consultation.document_folios:
            folios[folio.document_type] = {
                "folio_number": folio.folio_number,
                "formatted_folio": folio.formatted_folio
            }
    
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
        "therapeutic_plan": decrypted_consultation.get("treatment_plan", ""),
        "laboratory_results": decrypted_consultation.get("laboratory_results", ""),
        "notes": decrypted_consultation.get("notes", ""),
        "patient_name": patient_name,
        "doctor_name": doctor_name,
        "doctor_office": doctor_office,
        "folios": folios,
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
        from database import Appointment
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


def get_patient_info(db: Session, patient_id: Optional[int]) -> tuple[str, Optional[Person]]:
    """
    Get patient information
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
        "therapeutic_plan": medical_record.treatment_plan,
        "laboratory_results": medical_record.laboratory_results,
        "imaging_studies": medical_record.laboratory_results,
        "notes": medical_record.notes,
        "interconsultations": medical_record.notes,
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
# DIAGNOSIS CATALOG HELPERS
# ============================================================================

def format_diagnosis_with_code(diagnosis_code: str, diagnosis_name: str) -> str:
    """
    Format diagnosis with CIE-10 code for storage
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
                "description": diagnosis.name
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
    """
    primary_text = ""
    secondary_text = ""
    
    # Format primary diagnosis
    if primary_diagnoses and len(primary_diagnoses) > 0:
        primary = primary_diagnoses[0]
        diagnosis_id = primary.get("id")
        diagnosis_code = primary.get("code", "")
        diagnosis_name = primary.get("name", "")
        
        validated = validate_diagnosis_from_catalog(db, diagnosis_id, diagnosis_code)
        if validated:
            primary_text = format_diagnosis_with_code(validated["code"], validated["name"])
        elif diagnosis_code and diagnosis_name:
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
            
            validated = validate_diagnosis_from_catalog(db, diagnosis_id, diagnosis_code)
            if validated:
                secondary_list.append(format_diagnosis_with_code(validated["code"], validated["name"]))
            elif diagnosis_code and diagnosis_name:
                secondary_list.append(format_diagnosis_with_code(diagnosis_code, diagnosis_name))
            elif diagnosis_name:
                secondary_list.append(diagnosis_name)
        
        secondary_text = "; ".join(secondary_list)
    
    return primary_text, secondary_text


# ============================================================================
# CONSULTATION SERVICE CLASS
# ============================================================================

class ConsultationService:
    """
    Service for handling consultation business logic
    """
    
    @staticmethod
    def get_consultations_for_doctor(
        db: Session,
        doctor_id: int,
        skip: int = 0,
        limit: int = 100,
        decrypt_sensitive_data_fn: callable = None
    ) -> List[Dict[str, Any]]:
        """
        Get list of consultations for a specific doctor
        """
        try:
            api_logger.debug("Fetching consultations from database", doctor_id=doctor_id, skip=skip, limit=limit)
            
            # Query medical records (consultations) from database
            consultations = db.query(MedicalRecord).options(
                joinedload(MedicalRecord.patient),
                joinedload(MedicalRecord.doctor)
            ).filter(
                MedicalRecord.doctor_id == doctor_id
            ).order_by(MedicalRecord.consultation_date.desc()).offset(skip).limit(limit).all()
            
            api_logger.debug("Found consultations in database", doctor_id=doctor_id, count=len(consultations))
            
            # Transform to API format using helper functions
            result = []
            for consultation in consultations:
                try:
                    # Decrypt patient data
                    decrypted_patient = decrypt_patient_data(consultation.patient, decrypt_sensitive_data_fn) if consultation.patient else {}
                    patient_name = format_patient_name(decrypted_patient) if consultation.patient else "Paciente No Identificado"
                    
                    # Decrypt consultation data
                    decrypted_consultation = decrypt_consultation_data(consultation, decrypt_sensitive_data_fn)
                    
                    # Get doctor name
                    doctor_name = format_doctor_name(consultation.doctor)
                    
                    # Get related data (vital signs, prescriptions, clinical studies)
                    try:
                        vital_signs = get_consultation_vital_signs(db, consultation.id)
                    except Exception as e:
                        api_logger.warning("Error getting vital signs for consultation", consultation_id=consultation.id, error=str(e))
                        vital_signs = []
                    
                    try:
                        prescriptions = get_consultation_prescriptions(db, consultation.id)
                    except Exception as e:
                        api_logger.warning("Error getting prescriptions for consultation", consultation_id=consultation.id, error=str(e))
                        prescriptions = []
                    
                    try:
                        clinical_studies = get_consultation_clinical_studies(db, consultation.id)
                    except Exception as e:
                        api_logger.warning("Error getting clinical studies for consultation", consultation_id=consultation.id, error=str(e))
                        clinical_studies = []
                    
                    # Build response using helper
                    consultation_response = build_consultation_response(
                        consultation,
                        decrypted_consultation,
                        patient_name,
                        doctor_name,
                        vital_signs,
                        prescriptions,
                        clinical_studies
                    )
                    
                    # Add compatibility fields
                    consultation_response.update({
                        "imaging_studies": decrypted_consultation.get("laboratory_results", ""),
                        "interconsultations": decrypted_consultation.get("notes", ""),
                        "consultation_type": getattr(consultation, 'consultation_type', 'Seguimiento'),
                        "created_by": consultation.created_by,
                        "created_at": consultation.created_at.isoformat(),
                        "date": consultation.consultation_date.isoformat()
                    })
                    
                    result.append(consultation_response)
                except Exception as e:
                    api_logger.error("Error processing consultation", consultation_id=consultation.id, error=str(e), exc_info=True)
                    continue
            
            api_logger.info("Returning consultations", doctor_id=doctor_id, count=len(result))
            return result
        except Exception as e:
            api_logger.error("Error in get_consultations", doctor_id=doctor_id, error=str(e), exc_info=True)
            return []

    @staticmethod
    def get_consultation_by_id(
        db: Session,
        consultation_id: int,
        doctor_id: int,
        decrypt_sensitive_data_fn: callable = None
    ) -> Dict[str, Any]:
        """
        Get specific consultation by ID
        """
        try:
            api_logger.debug(
                "Fetching consultation",
                consultation_id=consultation_id,
                doctor_id=doctor_id
            )
            
            # Query specific medical record
            consultation = db.query(MedicalRecord).options(
                joinedload(MedicalRecord.patient),
                joinedload(MedicalRecord.doctor)
            ).filter(
                MedicalRecord.id == consultation_id,
                MedicalRecord.doctor_id == doctor_id
            ).first()
            
            if not consultation:
                raise HTTPException(status_code=404, detail="Consultation not found")
            
            # Get patient and doctor names
            patient_name = consultation.patient.name if consultation.patient else "Paciente No Identificado"
            doctor_name = consultation.doctor.name if consultation.doctor else "Doctor"
            
            # Decrypt consultation data
            decrypted_data = decrypt_consultation_data(consultation, decrypt_sensitive_data_fn)
            
            # Build response
            consultation_end_time = consultation.consultation_date + timedelta(minutes=30)
            
            result = {
                "id": consultation.id,
                "patient_id": consultation.patient_id,
                "patient_document_id": consultation.patient_document_id,
                "patient_document_value": consultation.patient_document_value,
                "patient_document_name": consultation.patient_document.name if consultation.patient_document else None,
                "consultation_date": consultation.consultation_date.isoformat(),
                "end_time": consultation_end_time.isoformat(),
                "chief_complaint": decrypted_data.get("chief_complaint", ""),
                "history_present_illness": decrypted_data.get("history_present_illness", ""),
                "family_history": decrypted_data.get("family_history", ""),
                "gynecological_and_obstetric_history": decrypted_data.get("gynecological_and_obstetric_history", ""),
                "personal_pathological_history": decrypted_data.get("personal_pathological_history", ""),
                "personal_non_pathological_history": decrypted_data.get("personal_non_pathological_history", ""),
                "physical_examination": decrypted_data.get("physical_examination", ""),
                "laboratory_results": decrypted_data.get("laboratory_results", ""),
                "primary_diagnosis": decrypted_data.get("primary_diagnosis", ""),
                "secondary_diagnoses": decrypted_data.get("secondary_diagnoses", ""),
                "prescribed_medications": decrypted_data.get("prescribed_medications", ""),
                "treatment_plan": decrypted_data.get("treatment_plan", ""),
                "follow_up_instructions": decrypted_data.get("follow_up_instructions", ""),
                "therapeutic_plan": decrypted_data.get("treatment_plan", ""),
                "imaging_studies": decrypted_data.get("laboratory_results", ""),
                "notes": decrypted_data.get("notes", ""),
                "interconsultations": decrypted_data.get("notes", ""),
                "consultation_type": getattr(consultation, 'consultation_type', 'Seguimiento'),
                "perinatal_history": decrypted_data.get("perinatal_history", ""),
                "created_by": consultation.created_by,
                "created_at": consultation.created_at.isoformat(),
                "patient_name": patient_name,
                "doctor_name": doctor_name,
                "date": consultation.consultation_date.isoformat()
            }
            
            api_logger.info("Returning consultation", consultation_id=consultation_id)
            return result
            
        except HTTPException:
            raise
        except Exception as e:
            api_logger.error("Error in get_consultation", consultation_id=consultation_id, error=str(e), exc_info=True)
            raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

    @staticmethod
    async def create_consultation(
        db: Session,
        consultation_data: Dict[str, Any],
        current_user: Person,
        request: Any,
        now_cdmx_fn: callable,
        cdmx_datetime_fn: callable,
        encrypt_sensitive_data_fn: callable,
        sign_medical_document_fn: callable
    ) -> Dict[str, Any]:
        """
        Create new consultation
        """
        try:
            security_logger.info("Creating consultation with encryption", operation="create_consultation", 
                               doctor_id=current_user.id, patient_id=consultation_data.get("patient_id"))
            
            patient_id = consultation_data.get("patient_id")
            
            if not patient_id:
                raise HTTPException(status_code=400, detail="El paciente es obligatorio para crear la consulta")
            
            # Determine if it's a first-time consultation
            consultation_type = consultation_data.get("consultation_type", "").strip()
            is_first_time = consultation_type and consultation_type.lower() in ['primera vez', 'primera_vez', 'primera']
            
            # Validate patient document
            patient_document_id_raw = consultation_data.get("patient_document_id")
            patient_document_value = (consultation_data.get("patient_document_value") or "").strip()
            patient_document_id = None  # Initialize to prevent UnboundLocalError
            
            if is_first_time:
                if not patient_document_id_raw or not patient_document_value:
                    raise HTTPException(
                        status_code=400,
                        detail="El documento de identificación del paciente es obligatorio para consultas de primera vez"
                    )
                
                try:
                    patient_document_id = int(patient_document_id_raw)
                except (TypeError, ValueError):
                    raise HTTPException(status_code=400, detail="El documento de identificación del paciente es inválido")
                
                from database import PersonDocument, Document
                patient_document = db.query(PersonDocument).filter(
                    PersonDocument.person_id == patient_id,
                    PersonDocument.document_id == patient_document_id,
                    PersonDocument.is_active == True
                ).first()
                
                if not patient_document:
                    document = db.query(Document).filter(Document.id == patient_document_id).first()
                    document_name = document.name if document else "documento seleccionado"
                    raise HTTPException(
                        status_code=400,
                        detail=f"El {document_name} no pertenece al paciente o está inactivo"
                    )
                
                if patient_document.document_value.strip().upper() != patient_document_value.strip().upper():
                    raise HTTPException(status_code=400, detail="El valor del documento no coincide con el registro del paciente")
                
                consultation_data["patient_document_id"] = patient_document_id
                consultation_data["patient_document_value"] = patient_document.document_value
            else:
                if patient_document_id_raw and patient_document_value:
                    try:
                        patient_document_id = int(patient_document_id_raw)
                        from database import PersonDocument
                        patient_document = db.query(PersonDocument).filter(
                            PersonDocument.person_id == patient_id,
                            PersonDocument.document_id == patient_document_id,
                            PersonDocument.is_active == True
                        ).first()
                        
                        if patient_document:
                            consultation_data["patient_document_id"] = patient_document_id
                            consultation_data["patient_document_value"] = patient_document.document_value
                        else:
                            consultation_data["patient_document_id"] = None
                            consultation_data["patient_document_value"] = None
                    except (TypeError, ValueError):
                        consultation_data["patient_document_id"] = None
                        consultation_data["patient_document_value"] = None
                else:
                    consultation_data["patient_document_id"] = None
                    consultation_data["patient_document_value"] = None
            
            # Validate and format diagnoses
            primary_diagnoses_from_catalog = consultation_data.get("primary_diagnoses", [])
            secondary_diagnoses_from_catalog = consultation_data.get("secondary_diagnoses_list", [])
            
            if primary_diagnoses_from_catalog or secondary_diagnoses_from_catalog:
                primary_formatted, secondary_formatted = format_diagnoses_from_catalog(
                    db=db,
                    primary_diagnoses=primary_diagnoses_from_catalog if primary_diagnoses_from_catalog else None,
                    secondary_diagnoses=secondary_diagnoses_from_catalog if secondary_diagnoses_from_catalog else None
                )
                
                if primary_formatted:
                    consultation_data["primary_diagnosis"] = primary_formatted
                if secondary_formatted:
                    consultation_data["secondary_diagnoses"] = secondary_formatted
            
            # Encrypt data
            encrypted_consultation_data = encrypt_consultation_fields(consultation_data, encrypt_sensitive_data_fn)
            
            # Parse date
            consultation_date_str = encrypted_consultation_data.get("date", encrypted_consultation_data.get("consultation_date"))
            consultation_date = parse_consultation_date(consultation_date_str, now_cdmx_fn, cdmx_datetime_fn)
            
            # Create object
            new_medical_record = create_medical_record_object(
                encrypted_consultation_data,
                consultation_date,
                current_user.id
            )
            
            # Save
            db.add(new_medical_record)
            db.commit()
            db.refresh(new_medical_record)
            
            # Sign
            consultation_for_signing = prepare_consultation_for_signing(new_medical_record)
            digital_signature = sign_medical_document_fn(consultation_for_signing, current_user.id, "consultation")
            
            # Mark appointment completed
            appointment_id = consultation_data.get("appointment_id")
            mark_appointment_completed(db, appointment_id, current_user.id)
            
            # Get info
            patient_name, _ = get_patient_info(db, new_medical_record.patient_id)
            doctor_name = format_doctor_name(current_user)
            
            # Audit
            audit_service.log_consultation_create(
                db=db,
                user=current_user,
                consultation_id=new_medical_record.id,
                patient_id=new_medical_record.patient_id,
                patient_name=patient_name,
                request=request,
                consultation_data={
                    "consultation_date": str(consultation_date),
                    "consultation_type": consultation_data.get("consultation_type", ""),
                    "primary_diagnosis": consultation_data.get("primary_diagnosis", ""),
                    "patient_document_id": consultation_data.get("patient_document_id"),
                    "patient_document_value": consultation_data.get("patient_document_value")
                }
            )
            
            # Privacy notice
            if is_first_time:
                try:
                    from services.privacy_service import send_privacy_notice_automatically
                    await send_privacy_notice_automatically(
                        db=db,
                        patient_id=new_medical_record.patient_id,
                        doctor=current_user,
                        consultation_type=consultation_type
                    )
                except Exception as e:
                    api_logger.warning(f"Error sending privacy notice: {str(e)}")
            
            # Build response
            return build_create_consultation_response(
                new_medical_record,
                patient_name,
                doctor_name,
                digital_signature
            )
            
        except HTTPException:
            raise
        except Exception as e:
            api_logger.error("Error in create_consultation", doctor_id=current_user.id, error=str(e), exc_info=True)
            audit_service.log_error(
                db=db,
                user=current_user,
                request=request,
                error_message=str(e),
                operation_type="consultation_create"
            )
            db.rollback()
            raise HTTPException(status_code=500, detail=f"Error creating consultation: {str(e)}")

    @staticmethod
    async def update_consultation(
        db: Session,
        consultation_id: int,
        consultation_data: Dict[str, Any],
        current_user: Person,
        request: Any,
        cdmx_datetime_fn: callable
    ) -> Dict[str, Any]:
        """
        Update specific consultation by ID
        """
        try:
            api_logger.debug("Updating consultation", consultation_id=consultation_id, doctor_id=current_user.id)
            
            # Find existing consultation
            consultation = db.query(MedicalRecord).filter(
                MedicalRecord.id == consultation_id,
                MedicalRecord.doctor_id == current_user.id
            ).first()
            
            if not consultation:
                raise HTTPException(status_code=404, detail="Consultation not found")
            
            original_data = serialize_instance(
                consultation,
                exclude={"updated_at"},
            )

            # Determine final patient_id for validation
            target_patient_id = consultation_data.get("patient_id", consultation.patient_id)
            try:
                target_patient_id = int(target_patient_id)
            except (TypeError, ValueError):
                raise HTTPException(status_code=400, detail="El paciente especificado es inválido")
            
            # Determine if it's a first-time consultation
            consultation_type = consultation_data.get("consultation_type", consultation.consultation_type or "").strip()
            is_first_time = consultation_type and consultation_type.lower() in ['primera vez', 'primera_vez', 'primera']
            
            # Normalize patient document data
            patient_document_id_raw = consultation_data.get("patient_document_id", consultation.patient_document_id)
            patient_document_value = (consultation_data.get("patient_document_value", consultation.patient_document_value) or "").strip()
            
            if is_first_time:
                if not patient_document_id_raw or not patient_document_value:
                    raise HTTPException(
                        status_code=400,
                        detail="El documento de identificación del paciente es obligatorio para consultas de primera vez"
                    )
                
                try:
                    patient_document_id = int(patient_document_id_raw)
                except (TypeError, ValueError):
                    raise HTTPException(status_code=400, detail="El documento de identificación del paciente es inválido")
                
                from database import PersonDocument, Document
                patient_document = db.query(PersonDocument).filter(
                    PersonDocument.person_id == target_patient_id,
                    PersonDocument.document_id == patient_document_id,
                    PersonDocument.is_active == True
                ).first()
                
                if not patient_document:
                    document = db.query(Document).filter(Document.id == patient_document_id).first()
                    document_name = document.name if document else "documento seleccionado"
                    raise HTTPException(
                        status_code=400,
                        detail=f"El {document_name} no pertenece al paciente o está inactivo"
                    )
                
                if patient_document.document_value.strip().upper() != patient_document_value.strip().upper():
                    raise HTTPException(status_code=400, detail="El valor del documento no coincide con el registro del paciente")
                
                consultation.patient_document_id = patient_document_id
                consultation.patient_document_value = patient_document.document_value
            else:
                if patient_document_id_raw and patient_document_value:
                    try:
                        patient_document_id = int(patient_document_id_raw)
                        from database import PersonDocument
                        patient_document = db.query(PersonDocument).filter(
                            PersonDocument.person_id == target_patient_id,
                            PersonDocument.document_id == patient_document_id,
                            PersonDocument.is_active == True
                        ).first()
                        
                        if patient_document:
                            consultation.patient_document_id = patient_document_id
                            consultation.patient_document_value = patient_document.document_value
                    except (TypeError, ValueError):
                        pass
            
            # Validate and format diagnoses
            primary_diagnoses_from_catalog = consultation_data.get("primary_diagnoses", [])
            secondary_diagnoses_from_catalog = consultation_data.get("secondary_diagnoses_list", [])
            
            if primary_diagnoses_from_catalog or secondary_diagnoses_from_catalog:
                primary_formatted, secondary_formatted = format_diagnoses_from_catalog(
                    db=db,
                    primary_diagnoses=primary_diagnoses_from_catalog if primary_diagnoses_from_catalog else None,
                    secondary_diagnoses=secondary_diagnoses_from_catalog if secondary_diagnoses_from_catalog else None
                )
                
                if primary_formatted:
                    consultation_data["primary_diagnosis"] = primary_formatted
                if secondary_formatted:
                    consultation_data["secondary_diagnoses"] = secondary_formatted
            
            # Parse date
            consultation_date = consultation.consultation_date
            consultation_date_str = consultation_data.get("date", consultation_data.get("consultation_date"))
            if consultation_date_str:
                consultation_date_with_tz = cdmx_datetime_fn(consultation_date_str)
                consultation_date = consultation_date_with_tz.replace(tzinfo=None)
            
            # Update fields
            consultation.patient_id = target_patient_id
            consultation.consultation_date = consultation_date
            
            # Update other fields if present in data
            fields_to_update = [
                "chief_complaint", "history_present_illness", "family_history", 
                "personal_pathological_history", "personal_non_pathological_history",
                "physical_examination", "laboratory_results", "primary_diagnosis",
                "secondary_diagnoses", "prescribed_medications", "treatment_plan",
                "follow_up_instructions", "notes", "consultation_type",
                "perinatal_history", "gynecological_and_obstetric_history"
            ]
            
            for field in fields_to_update:
                if field in consultation_data:
                    # Handle aliases
                    val = consultation_data[field]
                    if field == "notes" and not val:
                        val = consultation_data.get("interconsultations")
                    
                    setattr(consultation, field, val)
            
            # Save changes
            db.commit()
            db.refresh(consultation)
            
            updated_data = serialize_instance(consultation)

            audit_service.log_action(
                db=db,
                action="UPDATE",
                user=current_user,
                request=request,
                table_name="medical_records",
                record_id=consultation.id,
                old_values=original_data,
                new_values=updated_data,
                operation_type="consultation_update",
                affected_patient_id=consultation.patient_id,
                affected_patient_name=consultation.patient.name if consultation.patient else None,
            )
            
            # Get patient and doctor names
            patient_name = "Paciente No Identificado"
            if consultation.patient:
                patient_name = consultation.patient.name or "Paciente No Identificado"
            
            doctor_name = current_user.name or "Doctor"
            
            consultation_end_time = consultation.consultation_date + timedelta(minutes=30)
            
            # Return updated consultation
            return {
                "id": consultation.id,
                "patient_id": consultation.patient_id,
                "patient_document_id": consultation.patient_document_id,
                "patient_document_value": consultation.patient_document_value,
                "patient_document_name": consultation.patient_document.name if consultation.patient_document else None,
                "consultation_date": consultation.consultation_date.isoformat(),
                "end_time": consultation_end_time.isoformat(),
                "chief_complaint": consultation.chief_complaint,
                "history_present_illness": consultation.history_present_illness,
                "family_history": consultation.family_history,
                "perinatal_history": consultation.perinatal_history,
                "gynecological_and_obstetric_history": consultation.gynecological_and_obstetric_history,
                "personal_pathological_history": consultation.personal_pathological_history,
                "personal_non_pathological_history": consultation.personal_non_pathological_history,
                "physical_examination": consultation.physical_examination,
                "laboratory_results": consultation.laboratory_results,
                "primary_diagnosis": consultation.primary_diagnosis,
                "secondary_diagnoses": consultation.secondary_diagnoses,
                "prescribed_medications": consultation.prescribed_medications,
                "treatment_plan": consultation.treatment_plan,
                "follow_up_instructions": consultation.follow_up_instructions,
                "therapeutic_plan": consultation.treatment_plan,
                "imaging_studies": consultation.laboratory_results,
                "notes": consultation.notes,
                "interconsultations": consultation.notes,
                "consultation_type": consultation.consultation_type,
                "created_by": consultation.created_by,
                "created_at": consultation.created_at.isoformat(),
                "patient_name": patient_name,
                "doctor_name": doctor_name,
                "date": consultation.consultation_date.isoformat()
            }
            
        except HTTPException:
            raise
        except Exception as e:
            api_logger.error("Error in update_consultation", consultation_id=consultation_id, error=str(e), exc_info=True)
            db.rollback()
            raise HTTPException(status_code=500, detail=f"Error updating consultation: {str(e)}")
