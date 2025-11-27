"""
Consultations management endpoints
Migrated from main_clean_english.py to improve code organization
"""

from fastapi import APIRouter, Depends, HTTPException, Request, Query
from sqlalchemy import or_, text
from sqlalchemy.orm import Session, joinedload
from typing import Optional
from datetime import datetime, timedelta
import pytz
import uuid
import traceback

from database import get_db, Person, MedicalRecord, ConsultationPrescription, Medication, PersonDocument, Document
from dependencies import get_current_user
from logger import get_logger
from audit_service import audit_service
import crud
import schemas
from utils.audit_utils import serialize_instance

# Import consultation service helpers
from consultation_service import (
    decrypt_patient_data,
    decrypt_consultation_data,
    format_patient_name,
    format_doctor_name,
    get_consultation_vital_signs as get_vital_signs_for_consultation,
    get_consultation_prescriptions as get_prescriptions_for_consultation,
    get_consultation_clinical_studies as get_clinical_studies_for_consultation,
    build_consultation_response,
    # Create consultation helpers
    encrypt_consultation_fields,
    parse_consultation_date,
    create_medical_record_object,
    prepare_consultation_for_signing,
    mark_appointment_completed,
    get_patient_info,
    build_create_consultation_response,
    # Diagnosis catalog helpers
    format_diagnoses_from_catalog
)
from services.document_folio_service import DocumentFolioService

# Import encryption and digital signature services
from encryption import get_encryption_service, MedicalDataEncryption
from digital_signature import get_digital_signature_service, get_medical_document_signer
from config import settings

api_logger = get_logger("medical_records.api")
security_logger = get_logger("medical_records.security")

# CDMX timezone configuration
SYSTEM_TIMEZONE = pytz.timezone('America/Mexico_City')

def now_cdmx():
    """Get current datetime in CDMX timezone"""
    return datetime.now(SYSTEM_TIMEZONE)

def cdmx_datetime(dt_string: str) -> datetime:
    """Parse datetime string and convert to CDMX timezone"""
    if isinstance(dt_string, str):
        # Parse the datetime string
        dt = datetime.fromisoformat(dt_string.replace('Z', ''))
        
        # If the datetime is naive (no timezone info), assume it's UTC
        if dt.tzinfo is None:
            # Assume it's UTC and convert to CDMX
            utc_tz = pytz.utc
            cdmx_tz = pytz.timezone('America/Mexico_City')
            utc_dt = utc_tz.localize(dt)
            result = utc_dt.astimezone(cdmx_tz)
        else:
            # If it already has timezone info, convert to CDMX
            cdmx_tz = pytz.timezone('America/Mexico_City')
            result = dt.astimezone(cdmx_tz)
        
        return result
    return dt_string

# Initialize encryption service
encryption_service = get_encryption_service()

# Initialize digital signature services
digital_signature_service = get_digital_signature_service()
medical_document_signer = get_medical_document_signer()

def encrypt_sensitive_data(data: dict, data_type: str = "patient") -> dict:
    """
    Encrypt sensitive fields in data based on type
    Compliance: NOM-035-SSA3-2012 - Encryption of sensitive medical data
    
    Args:
        data: Dictionary with data to encrypt
        data_type: Type of data ('patient', 'consultation', 'doctor')
        
    Returns:
        Dictionary with encrypted sensitive fields
    """
    if not data:
        return data
    
    # Check if encryption is enabled
    if not settings.ENABLE_ENCRYPTION:
        # Encryption disabled - no need to log this repeatedly
        return data
    
    try:
        # Get encryption service
        encryption_service = get_encryption_service()
        
        # Define sensitive fields based on data type
        sensitive_fields = []
        if data_type == "patient":
            sensitive_fields = ["curp", "primary_phone", "email", "home_address", "emergency_contact_name", "emergency_contact_phone"]
        elif data_type == "consultation":
            sensitive_fields = ["chief_complaint", "history_present_illness", "family_history", 
                               "personal_pathological_history", "personal_non_pathological_history",
                               "physical_examination", "primary_diagnosis", "secondary_diagnoses",
                               "treatment_plan", "follow_up_instructions", "prescribed_medications",
                               "notes", "laboratory_results"]
        elif data_type == "doctor":
            sensitive_fields = ["curp", "rfc", "primary_phone", "email", "office_address"]
        
        # Encrypt sensitive fields
        encrypted_data = data.copy()
        for field in sensitive_fields:
            if field in encrypted_data and encrypted_data[field]:
                try:
                    # Only encrypt if value is a string and not empty
                    if isinstance(encrypted_data[field], str) and encrypted_data[field].strip():
                        encrypted_data[field] = encryption_service.encrypt_sensitive_data(encrypted_data[field])
                        api_logger.debug(
                            f"🔐 Encrypted field: {field}",
                            extra={"data_type": data_type, "field": field}
                        )
                except Exception as e:
                    # If encryption fails, log error but don't break the flow
                    api_logger.error(
                        f"❌ Failed to encrypt field {field}",
                        extra={"data_type": data_type, "field": field, "error": str(e)}
                    )
                    # Keep original value if encryption fails
                    continue
        
        api_logger.debug(
            "🔐 Encryption completed",
            extra={"data_type": data_type, "fields_encrypted": len([f for f in sensitive_fields if f in encrypted_data])}
        )
        return encrypted_data
    
    except Exception as e:
        # If encryption service fails, log error and return data as-is
        api_logger.error(
            f"❌ Encryption service error - returning data as-is",
            extra={"data_type": data_type, "error": str(e)}
        )
        return data

def decrypt_sensitive_data(data: dict, data_type: str = "patient") -> dict:
    """
    Decrypt sensitive fields in data based on type
    Compliance: NOM-035-SSA3-2012 - Decryption of sensitive medical data
    
    Args:
        data: Dictionary with data to decrypt
        data_type: Type of data ('patient', 'consultation', 'doctor')
        
    Returns:
        Dictionary with decrypted sensitive fields
    """
    if not data:
        return data
    
    # Check if encryption is enabled
    if not settings.ENABLE_ENCRYPTION:
        # Encryption disabled - no need to log this repeatedly
        return data
    
    try:
        # Get encryption service
        encryption_service = get_encryption_service()
        
        # Define sensitive fields based on data type
        sensitive_fields = []
        if data_type == "patient":
            sensitive_fields = ["curp", "primary_phone", "email", "home_address", "emergency_contact_name", "emergency_contact_phone"]
        elif data_type == "consultation":
            sensitive_fields = ["chief_complaint", "history_present_illness", "family_history",
                               "personal_pathological_history", "personal_non_pathological_history",
                               "physical_examination", "primary_diagnosis", "secondary_diagnoses",
                               "treatment_plan", "follow_up_instructions", "prescribed_medications",
                               "notes", "laboratory_results"]
        elif data_type == "doctor":
            sensitive_fields = ["curp", "rfc", "primary_phone", "email", "office_address"]
        
        # Decrypt sensitive fields
        decrypted_data = data.copy()
        for field in sensitive_fields:
            if field in decrypted_data and decrypted_data[field]:
                try:
                    # Try to decrypt - the service will detect if data is encrypted or not
                    if isinstance(decrypted_data[field], str):
                        decrypted_data[field] = encryption_service.decrypt_sensitive_data(decrypted_data[field])
                        api_logger.debug(
                            f"🔓 Decrypted field: {field}",
                            extra={"data_type": data_type, "field": field}
                        )
                except Exception as e:
                    # If decryption fails, assume data is not encrypted and keep original value
                    api_logger.debug(
                        f"🔓 Field {field} not encrypted or decryption failed - keeping original",
                        extra={"data_type": data_type, "field": field, "error": str(e)}
                    )
                    # Keep original value if decryption fails (backward compatibility)
                    continue
        
        api_logger.debug(
            "🔓 Decryption completed",
            extra={"data_type": data_type}
        )
        return decrypted_data
    
    except Exception as e:
        # If decryption service fails, log error and return data as-is (backward compatibility)
        api_logger.error(
            f"❌ Decryption service error - returning data as-is",
            extra={"data_type": data_type, "error": str(e)}
        )
        return data

def sign_medical_document(document_data: dict, doctor_id: int, document_type: str = "consultation") -> dict:
    """Sign medical document with digital signature"""
    try:
        api_logger.info(
            "🔏 Signing medical document",
            extra={"doctor_id": doctor_id, "document_type": document_type}
        )
        
        # Add document metadata
        document_data["id"] = str(document_data.get("id", "unknown"))
        document_data["doctor_id"] = doctor_id
        document_data["date"] = document_data.get("consultation_date", now_cdmx().isoformat())
        
        # Generate a simple key pair for demonstration (in production, use real certificates)
        private_key, public_key = digital_signature_service.generate_key_pair()
        
        # Create a self-signed certificate for the doctor
        doctor_info = {
            "name": f"Doctor {doctor_id}",
            "curp": f"DOCTOR{doctor_id:06d}",
            "license": f"LIC{doctor_id:06d}"
        }
        
        certificate = digital_signature_service.create_self_signed_certificate(
            private_key, doctor_info, validity_days=365
        )
        
        # Sign the document
        if document_type == "consultation":
            signature_result = medical_document_signer.sign_consultation(
                document_data, private_key, certificate
            )
        else:
            # Generic document signing
            signature_result = medical_document_signer.sign_consultation(
                document_data, private_key, certificate
            )
        
        api_logger.info(
            "✅ Document signed successfully",
            extra={
                "doctor_id": doctor_id,
                "document_type": document_type,
                "signature_id": signature_result["signatures"][0]["signature_id"]
            }
        )
        return signature_result
        
    except Exception as e:
        api_logger.error(
            "⚠️ Failed to sign medical document",
            extra={"doctor_id": doctor_id, "document_type": document_type},
            exc_info=True
        )
        # Return a placeholder signature for demonstration
        return {
            "document_id": str(document_data.get("id", "unknown")),
            "document_type": document_type,
            "signatures": [{
                "signature_id": f"sig_{uuid.uuid4().hex[:8]}",
                "document_hash": "placeholder_hash",
                "signature_value": "placeholder_signature",
                "timestamp": now_cdmx().isoformat(),
                "signer_certificate": "placeholder_certificate",
                "algorithm": "SHA256withRSA",
                "status": "signed"
            }],
            "document_hash": "placeholder_document_hash",
            "creation_timestamp": now_cdmx().isoformat(),
            "last_signature_timestamp": now_cdmx().isoformat()
        }

router = APIRouter(prefix="/api", tags=["consultations"])


@router.get("/consultations")
async def get_consultations(
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user),
    skip: int = Query(0),
    limit: int = Query(100)
):
    """Get list of consultations (REFACTORED - uses consultation_service helpers)"""
    try:
        api_logger.debug("Fetching consultations from database", doctor_id=current_user.id, skip=skip, limit=limit)
        
        # Query medical records (consultations) from database
        consultations = db.query(MedicalRecord).options(
            joinedload(MedicalRecord.patient),
            joinedload(MedicalRecord.doctor)
        ).filter(
            MedicalRecord.doctor_id == current_user.id
        ).order_by(MedicalRecord.consultation_date.desc()).offset(skip).limit(limit).all()
        
        api_logger.debug("Found consultations in database", doctor_id=current_user.id, count=len(consultations))
        
        # Transform to API format using helper functions
        result = []
        for consultation in consultations:
            try:
                # Decrypt patient data
                decrypted_patient = decrypt_patient_data(consultation.patient, decrypt_sensitive_data) if consultation.patient else {}
                patient_name = format_patient_name(decrypted_patient) if consultation.patient else "Paciente No Identificado"
                
                # Decrypt consultation data
                decrypted_consultation = decrypt_consultation_data(consultation, decrypt_sensitive_data)
                
                # Get doctor name
                doctor_name = format_doctor_name(consultation.doctor)
                
                # Get related data (vital signs, prescriptions, clinical studies)
                # Wrap each in try-except to prevent one failure from blocking all consultations
                try:
                    vital_signs = get_vital_signs_for_consultation(db, consultation.id)
                except Exception as e:
                    api_logger.warning("Error getting vital signs for consultation", consultation_id=consultation.id, error=str(e))
                    vital_signs = []
                
                try:
                    prescriptions = get_prescriptions_for_consultation(db, consultation.id)
                except Exception as e:
                    api_logger.warning("Error getting prescriptions for consultation", consultation_id=consultation.id, error=str(e))
                    prescriptions = []
                
                try:
                    clinical_studies = get_clinical_studies_for_consultation(db, consultation.id)
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
                # Continue processing other consultations instead of failing completely
                continue
        
        api_logger.info("Returning consultations", doctor_id=current_user.id, count=len(result))
        return result
    except Exception as e:
        api_logger.error("Error in get_consultations", doctor_id=current_user.id, error=str(e), exc_info=True)
        # Return empty array instead of failing completely
        return []


@router.get("/consultations/{consultation_id}")
async def get_consultation(
    consultation_id: int,
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user)
):
    """Get specific consultation by ID"""
    try:
        api_logger.debug("Fetching consultation", consultation_id=consultation_id, doctor_id=current_user.id, user_type=current_user.person_type)
        
        # Query specific medical record
        consultation = db.query(MedicalRecord).options(
            joinedload(MedicalRecord.patient),
            joinedload(MedicalRecord.doctor)
        ).filter(
            MedicalRecord.id == consultation_id,
            MedicalRecord.doctor_id == current_user.id
        ).first()
        
        if not consultation:
            raise HTTPException(status_code=404, detail="Consultation not found")
        
        # Get patient name
        patient_name = "Paciente No Identificado"
        if consultation.patient:
            patient_name = consultation.patient.name or "Paciente No Identificado"
        
        # Get doctor name
        doctor_name = "Doctor"
        if consultation.doctor:
            doctor_name = consultation.doctor.name or "Doctor"
        
        # Calculate end_time assuming 30 minutes duration for consultations
        consultation_end_time = consultation.consultation_date + timedelta(minutes=30)

        # Decrypt consultation data with error handling
        try:
            decrypted_consultation_data = decrypt_sensitive_data({
            "chief_complaint": consultation.chief_complaint,
            "history_present_illness": consultation.history_present_illness,
            "family_history": consultation.family_history,
            "personal_pathological_history": consultation.personal_pathological_history,
            "personal_non_pathological_history": consultation.personal_non_pathological_history,
            "physical_examination": consultation.physical_examination,
            "primary_diagnosis": consultation.primary_diagnosis,
            "secondary_diagnoses": consultation.secondary_diagnoses,
            "prescribed_medications": consultation.prescribed_medications,
            "treatment_plan": consultation.treatment_plan,
            "follow_up_instructions": consultation.follow_up_instructions,
            "laboratory_results": consultation.laboratory_results,
            "notes": consultation.notes,
            "family_history": consultation.family_history,
            "perinatal_history": consultation.perinatal_history,
            "gynecological_and_obstetric_history": consultation.gynecological_and_obstetric_history,
            "personal_pathological_history": consultation.personal_pathological_history,
            "personal_non_pathological_history": consultation.personal_non_pathological_history
            }, "consultation")
        except Exception as e:
            api_logger.warning("Could not decrypt consultation data", consultation_id=consultation.id, error=str(e))
            # Use original encrypted data if decryption fails
            decrypted_consultation_data = {
                "chief_complaint": consultation.chief_complaint,
                "history_present_illness": consultation.history_present_illness,
                "family_history": consultation.family_history,
                "personal_pathological_history": consultation.personal_pathological_history,
                "personal_non_pathological_history": consultation.personal_non_pathological_history,
                "physical_examination": consultation.physical_examination,
                "primary_diagnosis": consultation.primary_diagnosis,
                "secondary_diagnoses": consultation.secondary_diagnoses,
                "prescribed_medications": consultation.prescribed_medications,
                "treatment_plan": consultation.treatment_plan,
                "follow_up_instructions": consultation.follow_up_instructions,
                "laboratory_results": consultation.laboratory_results,
                "notes": consultation.notes,
                "family_history": consultation.family_history,
                "perinatal_history": consultation.perinatal_history,
                "gynecological_and_obstetric_history": consultation.gynecological_and_obstetric_history,
                "personal_pathological_history": consultation.personal_pathological_history,
                "personal_non_pathological_history": consultation.personal_non_pathological_history
            }

        # Return complete consultation data
        result = {
            "id": consultation.id,
            "patient_id": consultation.patient_id,
            "patient_document_id": consultation.patient_document_id,
            "patient_document_value": consultation.patient_document_value,
            "patient_document_name": consultation.patient_document.name if consultation.patient_document else None,
            "consultation_date": consultation.consultation_date.isoformat(),
            "end_time": consultation_end_time.isoformat(),
            "chief_complaint": decrypted_consultation_data.get("chief_complaint", ""),
            "history_present_illness": decrypted_consultation_data.get("history_present_illness", ""),
            "family_history": decrypted_consultation_data.get("family_history", ""),
            "gynecological_and_obstetric_history": decrypted_consultation_data.get("gynecological_and_obstetric_history", ""),
            "personal_pathological_history": decrypted_consultation_data.get("personal_pathological_history", ""),
            "personal_non_pathological_history": decrypted_consultation_data.get("personal_non_pathological_history", ""),
            "physical_examination": decrypted_consultation_data.get("physical_examination", ""),
            "laboratory_results": consultation.laboratory_results or "",
            "primary_diagnosis": decrypted_consultation_data.get("primary_diagnosis", ""),
            "secondary_diagnoses": decrypted_consultation_data.get("secondary_diagnoses", ""),
            "prescribed_medications": decrypted_consultation_data.get("prescribed_medications", ""),
            "treatment_plan": decrypted_consultation_data.get("treatment_plan", ""),
            "follow_up_instructions": decrypted_consultation_data.get("follow_up_instructions", ""),
            "therapeutic_plan": decrypted_consultation_data.get("treatment_plan", ""),  # Alias for compatibility
            "laboratory_results": decrypted_consultation_data.get("laboratory_results", ""),
            "imaging_studies": decrypted_consultation_data.get("laboratory_results", ""),  # Alias for compatibility
            "notes": decrypted_consultation_data.get("notes", ""),
            "interconsultations": decrypted_consultation_data.get("notes", ""),
            "consultation_type": getattr(consultation, 'consultation_type', 'Seguimiento'),
            "family_history": decrypted_consultation_data.get("family_history", ""),
            "gynecological_and_obstetric_history": decrypted_consultation_data.get("gynecological_and_obstetric_history", ""),
            "personal_pathological_history": decrypted_consultation_data.get("personal_pathological_history", ""),
            "personal_non_pathological_history": decrypted_consultation_data.get("personal_non_pathological_history", ""),
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


@router.post("/consultations")
async def create_consultation(
    consultation_data: dict,  # NOTE: Proper schema pending consultations table implementation
    request: Request,
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user)
):
    """Create new consultation with encrypted sensitive medical data (REFACTORED)"""
    try:
        security_logger.info("Creating consultation with encryption", operation="create_consultation", 
                           doctor_id=current_user.id, patient_id=consultation_data.get("patient_id"))
        
        patient_id = consultation_data.get("patient_id")
        
        if not patient_id:
            raise HTTPException(
                status_code=400,
                detail="El paciente es obligatorio para crear la consulta"
            )
        
        # Determinar si es una consulta de primera vez
        consultation_type = consultation_data.get("consultation_type", "").strip()
        is_first_time = consultation_type and consultation_type.lower() in ['primera vez', 'primera_vez', 'primera']
        
        # Validar documento de identificación solo para consultas de primera vez
        patient_document_id_raw = consultation_data.get("patient_document_id")
        patient_document_value = (consultation_data.get("patient_document_value") or "").strip()
        
        if is_first_time:
            if not patient_document_id_raw or not patient_document_value:
                raise HTTPException(
                    status_code=400,
                    detail="El documento de identificación del paciente es obligatorio para consultas de primera vez"
                )
            
            try:
                patient_document_id = int(patient_document_id_raw)
            except (TypeError, ValueError):
                raise HTTPException(
                    status_code=400,
                    detail="El documento de identificación del paciente es inválido"
                )
            
            api_logger.debug(
                "🔍 Validating patient document for first-time consultation",
                extra={
                    "patient_id": patient_id,
                    "patient_document_id": patient_document_id_raw,
                    "patient_document_value": patient_document_value
                }
            )

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
                raise HTTPException(
                    status_code=400,
                    detail="El valor del documento no coincide con el registro del paciente"
                )
            
            # Normalizar valores para el resto del flujo
            consultation_data["patient_document_id"] = patient_document_id
            consultation_data["patient_document_value"] = patient_document.document_value
        else:
            # Para consultas de seguimiento, el documento es opcional
            # Si se proporciona, validarlo; si no, dejarlo como None
            if patient_document_id_raw and patient_document_value:
                try:
                    patient_document_id = int(patient_document_id_raw)
                    patient_document = db.query(PersonDocument).filter(
                        PersonDocument.person_id == patient_id,
                        PersonDocument.document_id == patient_document_id,
                        PersonDocument.is_active == True
                    ).first()
                    
                    if patient_document:
                        consultation_data["patient_document_id"] = patient_document_id
                        consultation_data["patient_document_value"] = patient_document.document_value
                    else:
                        # Si el documento no existe, no fallar, solo no incluirlo
                        consultation_data["patient_document_id"] = None
                        consultation_data["patient_document_value"] = None
                except (TypeError, ValueError):
                    # Si el documento es inválido, no fallar, solo no incluirlo
                    consultation_data["patient_document_id"] = None
                    consultation_data["patient_document_value"] = None
            else:
                consultation_data["patient_document_id"] = None
                consultation_data["patient_document_value"] = None
        api_logger.debug(
            "✅ Patient document validated for consultation",
            extra={
                "patient_id": patient_id,
                "patient_document_id": consultation_data.get("patient_document_id"),
                "patient_document_value": consultation_data.get("patient_document_value")
            }
        )
        
        # 🆕 0.5. Validate and format diagnoses from CIE-10 catalog if provided
        # Compliance: NOM-004-SSA3-2012 - Register diagnosis codes and descriptions from official catalog
        primary_diagnoses_from_catalog = consultation_data.get("primary_diagnoses", [])
        secondary_diagnoses_from_catalog = consultation_data.get("secondary_diagnoses_list", [])
        
        if primary_diagnoses_from_catalog or secondary_diagnoses_from_catalog:
            primary_formatted, secondary_formatted = format_diagnoses_from_catalog(
                db=db,
                primary_diagnoses=primary_diagnoses_from_catalog if primary_diagnoses_from_catalog else None,
                secondary_diagnoses=secondary_diagnoses_from_catalog if secondary_diagnoses_from_catalog else None
            )
            
            # Override text fields with formatted catalog diagnoses (code + description)
            if primary_formatted:
                consultation_data["primary_diagnosis"] = primary_formatted
            if secondary_formatted:
                consultation_data["secondary_diagnoses"] = secondary_formatted
            
            api_logger.debug(
                "🔍 Diagnoses validated and formatted from CIE-10 catalog",
                extra={
                    "primary_diagnosis": consultation_data.get("primary_diagnosis", ""),
                    "secondary_diagnoses": consultation_data.get("secondary_diagnoses", "")
                }
            )
        
        # 1. Encrypt sensitive consultation fields
        encrypted_consultation_data = encrypt_consultation_fields(consultation_data, encrypt_sensitive_data)
        api_logger.debug(
            "🧾 Consultation data prepared for persistence",
            extra={
                "patient_id": encrypted_consultation_data.get("patient_id"),
                "patient_document_id": encrypted_consultation_data.get("patient_document_id"),
                "patient_document_value": encrypted_consultation_data.get("patient_document_value")
            }
        )
        
        # 2. Parse consultation date
        consultation_date_str = encrypted_consultation_data.get("date", encrypted_consultation_data.get("consultation_date"))
        consultation_date = parse_consultation_date(consultation_date_str, now_cdmx, cdmx_datetime)
        
        # 3. Create MedicalRecord object
        new_medical_record = create_medical_record_object(
            encrypted_consultation_data,
            consultation_date,
            current_user.id
        )
        
        # 4. Save to database
        db.add(new_medical_record)
        db.commit()
        db.refresh(new_medical_record)

        persisted_snapshot = db.execute(
            text(
                "SELECT patient_document_id, patient_document_value "
                "FROM medical_records WHERE id = :record_id"
            ),
            {"record_id": new_medical_record.id}
        ).fetchone()
        api_logger.debug(
            "📄 Persisted medical record snapshot after creation",
            extra={
                "consultation_id": new_medical_record.id,
                "patient_document_id": persisted_snapshot.patient_document_id if persisted_snapshot else None,
                "patient_document_value": persisted_snapshot.patient_document_value if persisted_snapshot else None
            }
        )
        
        security_logger.info("Consultation created successfully", consultation_id=new_medical_record.id, 
                           doctor_id=current_user.id, patient_id=new_medical_record.patient_id, encrypted=True)
        
        # 5. Sign the consultation document
        consultation_for_signing = prepare_consultation_for_signing(new_medical_record)
        digital_signature = sign_medical_document(consultation_for_signing, current_user.id, "consultation")
        security_logger.info("Consultation digitally signed", consultation_id=new_medical_record.id, 
                           signature_id=digital_signature["signatures"][0]["signature_id"])
        
        # 6. Mark appointment as completed if applicable
        appointment_id = consultation_data.get("appointment_id")
        mark_appointment_completed(db, appointment_id, current_user.id)
        
        # 7. Get patient and doctor info
        patient_name, _ = get_patient_info(db, new_medical_record.patient_id)
        doctor_name = format_doctor_name(current_user)
        
        # 🆕 8. Registrar en auditoría
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
                "patient_document_id": patient_document_id,
                "patient_document_value": patient_document.document_value
            }
        )
        
        # 🆕 8.5. Enviar aviso de privacidad automáticamente si es primera consulta
        # Compliance: LFPDPPP - Consentimiento previo requerido para tratamiento de datos
        # is_first_time ya fue determinado anteriormente
        if is_first_time:
            try:
                import sys
                import os
                sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
                from privacy_service import send_privacy_notice_automatically
                privacy_result = await send_privacy_notice_automatically(
                    db=db,
                    patient_id=new_medical_record.patient_id,
                    doctor=current_user,
                    consultation_type=consultation_type
                )
                
                if privacy_result and privacy_result.get("success"):
                    api_logger.info(
                        "✅ Privacy notice sent automatically for first consultation",
                        extra={
                            "consultation_id": new_medical_record.id,
                            "patient_id": new_medical_record.patient_id,
                            "consent_id": privacy_result.get("consent_id")
                        }
                    )
                elif privacy_result and privacy_result.get("skipped"):
                    api_logger.debug(
                        f"ℹ️ Privacy notice auto-send skipped: {privacy_result.get('message')}",
                        extra={"patient_id": new_medical_record.patient_id}
                    )
            except Exception as e:
                # No fallar la creación de consulta si falla el envío de aviso
                api_logger.warning(
                    f"⚠️ Error sending privacy notice automatically (non-blocking): {str(e)}",
                    extra={"consultation_id": new_medical_record.id, "patient_id": new_medical_record.patient_id},
                    exc_info=True
                )
        
        # 9. Build response
        result = build_create_consultation_response(
            new_medical_record,
            patient_name,
            doctor_name,
            digital_signature
        )
        
        api_logger.info("Medical record created in database", consultation_id=new_medical_record.id, doctor_id=current_user.id)
        return result
        
    except HTTPException:
        raise  # Re-raise HTTP exceptions as-is
    except Exception as e:
        api_logger.error("Error in create_consultation", doctor_id=current_user.id, error=str(e), exc_info=True)
        # 🆕 Registrar error en auditoría
        audit_service.log_error(
            db=db,
            user=current_user,
            request=request,
            error_message=str(e),
            operation_type="consultation_create"
        )
        db.rollback()
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error creating consultation: {str(e)}")


@router.put("/consultations/{consultation_id}")
async def update_consultation(
    consultation_id: int,
    consultation_data: dict,  # NOTE: Proper schema pending consultations table implementation
    request: Request,
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user)
):
    """Update specific consultation by ID"""
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
        
        # Determinar si es una consulta de primera vez
        consultation_type = consultation_data.get("consultation_type", consultation.consultation_type or "").strip()
        is_first_time = consultation_type and consultation_type.lower() in ['primera vez', 'primera_vez', 'primera']
        
        # Normalize patient document data - solo requerido para consultas de primera vez
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
                raise HTTPException(
                    status_code=400,
                    detail="El documento de identificación del paciente es inválido"
                )
            
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
                raise HTTPException(
                    status_code=400,
                    detail="El valor del documento no coincide con el registro del paciente"
                )
            
            consultation.patient_document_id = patient_document_id
            consultation.patient_document_value = patient_document.document_value
        else:
            # Para consultas de seguimiento, el documento es opcional
            # Si se proporciona, validarlo; si no, mantener el valor existente o dejarlo como None
            if patient_document_id_raw and patient_document_value:
                try:
                    patient_document_id = int(patient_document_id_raw)
                    patient_document = db.query(PersonDocument).filter(
                        PersonDocument.person_id == target_patient_id,
                        PersonDocument.document_id == patient_document_id,
                        PersonDocument.is_active == True
                    ).first()
                    
                    if patient_document:
                        consultation.patient_document_id = patient_document_id
                        consultation.patient_document_value = patient_document.document_value
                    # Si el documento no existe, mantener el valor existente
                except (TypeError, ValueError):
                    # Si el documento es inválido, mantener el valor existente
                    pass
        
        # 🆕 Validate and format diagnoses from CIE-10 catalog if provided
        # Compliance: NOM-004-SSA3-2012 - Register diagnosis codes and descriptions from official catalog
        primary_diagnoses_from_catalog = consultation_data.get("primary_diagnoses", [])
        secondary_diagnoses_from_catalog = consultation_data.get("secondary_diagnoses_list", [])
        
        if primary_diagnoses_from_catalog or secondary_diagnoses_from_catalog:
            primary_formatted, secondary_formatted = format_diagnoses_from_catalog(
                db=db,
                primary_diagnoses=primary_diagnoses_from_catalog if primary_diagnoses_from_catalog else None,
                secondary_diagnoses=secondary_diagnoses_from_catalog if secondary_diagnoses_from_catalog else None
            )
            
            # Override text fields with formatted catalog diagnoses (code + description)
            if primary_formatted:
                consultation_data["primary_diagnosis"] = primary_formatted
            if secondary_formatted:
                consultation_data["secondary_diagnoses"] = secondary_formatted
            
            api_logger.debug(
                "🔍 Diagnoses validated and formatted from CIE-10 catalog (update)",
                extra={
                    "consultation_id": consultation_id,
                    "primary_diagnosis": consultation_data.get("primary_diagnosis", ""),
                    "secondary_diagnoses": consultation_data.get("secondary_diagnoses", "")
                }
            )
        
        # Parse consultation date if provided
        consultation_date = consultation.consultation_date
        consultation_date_str = consultation_data.get("date", consultation_data.get("consultation_date"))
        if consultation_date_str:
            # Parse ISO datetime string as CDMX time
            consultation_date_with_tz = cdmx_datetime(consultation_date_str)
            # Remove timezone info to store as naive datetime in CDMX time
            consultation_date = consultation_date_with_tz.replace(tzinfo=None)
        
        # Update fields
        consultation.patient_id = target_patient_id
        consultation.consultation_date = consultation_date
        consultation.chief_complaint = consultation_data.get("chief_complaint", consultation.chief_complaint)
        consultation.history_present_illness = consultation_data.get("history_present_illness", consultation.history_present_illness)
        consultation.family_history = consultation_data.get("family_history", consultation.family_history)
        consultation.personal_pathological_history = consultation_data.get("personal_pathological_history", consultation.personal_pathological_history)
        consultation.personal_non_pathological_history = consultation_data.get("personal_non_pathological_history", consultation.personal_non_pathological_history)
        consultation.physical_examination = consultation_data.get("physical_examination", consultation.physical_examination)
        consultation.laboratory_results = consultation_data.get("laboratory_results", consultation.laboratory_results)
        consultation.primary_diagnosis = consultation_data.get("primary_diagnosis", consultation.primary_diagnosis)
        consultation.secondary_diagnoses = consultation_data.get("secondary_diagnoses", consultation.secondary_diagnoses)
        consultation.prescribed_medications = consultation_data.get("prescribed_medications", consultation.prescribed_medications)
        consultation.treatment_plan = consultation_data.get("treatment_plan", consultation.treatment_plan)
        consultation.follow_up_instructions = consultation_data.get("follow_up_instructions", consultation.follow_up_instructions)
        consultation.notes = consultation_data.get("notes") or consultation_data.get("interconsultations") or consultation.notes
        consultation.consultation_type = consultation_data.get("consultation_type", consultation.consultation_type)
        # Update first-time consultation fields (using _history fields)
        consultation.family_history = consultation_data.get("family_history", consultation.family_history)
        consultation.perinatal_history = consultation_data.get("perinatal_history", consultation.perinatal_history)
        consultation.gynecological_and_obstetric_history = consultation_data.get(
            "gynecological_and_obstetric_history",
            consultation.gynecological_and_obstetric_history
        )
        consultation.personal_pathological_history = consultation_data.get("personal_pathological_history", consultation.personal_pathological_history)
        consultation.personal_non_pathological_history = consultation_data.get("personal_non_pathological_history", consultation.personal_non_pathological_history)
        
        # Save changes
        db.commit()
        db.refresh(consultation)

        persisted_snapshot = db.execute(
            text(
                "SELECT patient_document_id, patient_document_value "
                "FROM medical_records WHERE id = :record_id"
            ),
            {"record_id": consultation.id}
        ).fetchone()
        api_logger.debug(
            "📄 Persisted medical record snapshot after update",
            extra={
                "consultation_id": consultation.id,
                "patient_document_id": persisted_snapshot.patient_document_id if persisted_snapshot else None,
                "patient_document_value": persisted_snapshot.patient_document_value if persisted_snapshot else None
            }
        )

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
        
        # Get patient and doctor names for response
        patient_name = "Paciente No Identificado"
        if consultation.patient:
            patient_name = consultation.patient.name or "Paciente No Identificado"
        
        doctor_name = current_user.name or "Doctor"

        # Calculate end_time assuming 30 minutes duration for consultations
        consultation_end_time = consultation.consultation_date + timedelta(minutes=30)

        # Return updated consultation in API format
        result = {
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
        "treatment_plan": consultation.treatment_plan,
        "follow_up_instructions": consultation.follow_up_instructions,
            "therapeutic_plan": consultation.treatment_plan,  # Alias for compatibility
            "notes": consultation.notes,
            "interconsultations": consultation.notes,  # Map notes to interconsultations for frontend compatibility
            "consultation_type": consultation.consultation_type,
            "family_history": consultation.family_history,
            "personal_pathological_history": consultation.personal_pathological_history,
            "personal_non_pathological_history": consultation.personal_non_pathological_history,
            "created_by": consultation.created_by,
            "created_at": consultation.created_at.isoformat(),
            "updated_at": consultation.updated_at.isoformat(),
            "patient_name": patient_name,
            "doctor_name": doctor_name,
            "date": consultation.consultation_date.isoformat()
        }
        
        api_logger.info("Consultation updated successfully", consultation_id=consultation_id, doctor_id=current_user.id)
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        api_logger.error("Error in update_consultation", consultation_id=consultation_id, doctor_id=current_user.id, error=str(e), exc_info=True)
        audit_service.log_action(
            db=db,
            action="UPDATE",
            user=current_user,
            request=request,
            table_name="medical_records",
            record_id=consultation_id,
            old_values=original_data if 'original_data' in locals() else None,
            new_values=None,
            operation_type="consultation_update",
            affected_patient_id=getattr(consultation, "patient_id", None) if 'consultation' in locals() and consultation else None,
            affected_patient_name=getattr(consultation.patient, "name", None) if 'consultation' in locals() and consultation and consultation.patient else None,
            success=False,
            error_message=str(e),
        )
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


@router.delete("/consultations/{consultation_id}")
async def delete_consultation(
    consultation_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user)
):
    """Delete specific consultation by ID"""
    try:
        # Find the consultation
        consultation = db.query(MedicalRecord).filter(
            MedicalRecord.id == consultation_id,
            MedicalRecord.doctor_id == current_user.id
        ).first()
        
        if not consultation:
            raise HTTPException(status_code=404, detail="Consultation not found or access denied")
        
        original_data = serialize_instance(consultation)
        
        # For medical records, we typically don't delete but mark as inactive
        # However, for this implementation, we'll do a soft delete by updating notes
        consultation.notes = f"[DELETED] {consultation.notes or ''}"
        consultation.updated_at = now_cdmx()
        
        db.commit()
        db.refresh(consultation)

        updated_data = serialize_instance(consultation)

        audit_service.log_action(
            db=db,
            action="DELETE",
            user=current_user,
            request=request,
            table_name="medical_records",
            record_id=consultation_id,
            old_values=original_data,
            new_values=updated_data,
            operation_type="consultation_delete",
            affected_patient_id=consultation.patient_id,
            affected_patient_name=consultation.patient.name if consultation.patient else None,
        )
        
        return {
            "message": "Consultation deleted successfully",
            "consultation_id": consultation_id,
            "deleted_at": consultation.updated_at.isoformat()
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        api_logger.error("Error in delete_consultation", consultation_id=consultation_id, doctor_id=current_user.id, error=str(e), exc_info=True)
        audit_service.log_action(
            db=db,
            action="DELETE",
            user=current_user,
            request=request,
            table_name="medical_records",
            record_id=consultation_id,
            old_values=original_data if 'original_data' in locals() else None,
            new_values=None,
            operation_type="consultation_delete",
            success=False,
            error_message=str(e),
        )
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


@router.get("/medical-records")
async def get_medical_records(
    patient_id: Optional[int] = Query(None),
    doctor_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user)
):
    """Get medical records - all, by patient, or by doctor"""
    try:
        if patient_id:
            records = crud.get_medical_records_by_patient(db, patient_id)
        elif doctor_id:
            records = crud.get_medical_records_by_doctor(db, doctor_id)
        else:
            # Get all records for current doctor
            records = crud.get_medical_records_by_doctor(db, current_user.id)
        
        # Convert to schemas and return
        result = []
        for record in records:
            record_dict = schemas.MedicalRecord.model_validate(record).model_dump()
            result.append(record_dict)
            
        return {"data": result, "count": len(result)}
    except Exception as e:
        api_logger.error("Error in get_medical_records", doctor_id=current_user.id, error=str(e), exc_info=True)
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


@router.get("/medical-records/{record_id}")
async def get_medical_record(
    record_id: int,
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user)
):
    """Get specific medical record by ID"""
    try:
        record = crud.get_medical_record(db, record_id)
        if not record:
            raise HTTPException(status_code=404, detail="Medical record not found")
        
        # Check if user has access to this record
        if record.doctor_id != current_user.id:
            raise HTTPException(status_code=403, detail="Access denied to this medical record")
        
        return schemas.MedicalRecord.model_validate(record).model_dump()
    except HTTPException:
        raise
    except Exception as e:
        api_logger.error("Error in get_medical_record", record_id=record_id, doctor_id=current_user.id, error=str(e), exc_info=True)
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


@router.post("/medical-records")
async def create_medical_record(
    record_data: schemas.MedicalRecordCreate,
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user)
):
    """Create new medical record"""
    try:
        api_logger.debug("Received medical record data", doctor_id=current_user.id)
        
        # Verify patient exists
        patient = crud.get_person(db, record_data.patient_id)
        if not patient:
            raise HTTPException(status_code=404, detail="Patient not found")
        
        # Set doctor as current user
        record_data.doctor_id = current_user.id
        
        # Create the record
        new_record = crud.create_medical_record(db, record_data)
        
        return {
            "message": "Medical record created successfully",
            "data": schemas.MedicalRecord.model_validate(new_record).model_dump()
        }
    except HTTPException:
        raise
    except Exception as e:
        api_logger.error("Error in create_medical_record", doctor_id=current_user.id, error=str(e), exc_info=True)
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


@router.put("/medical-records/{record_id}")
async def update_medical_record(
    record_id: int,
    record_data: schemas.MedicalRecordUpdate,
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user)
):
    """Update specific medical record by ID"""
    try:
        # Check if record exists and user has access
        existing_record = crud.get_medical_record(db, record_id)
        if not existing_record:
            raise HTTPException(status_code=404, detail="Medical record not found")
        
        if existing_record.doctor_id != current_user.id:
            raise HTTPException(status_code=403, detail="Access denied to this medical record")
        
        # Update the record
        updated_record = crud.update_medical_record(db, record_id, record_data)
        
        return {
            "message": "Medical record updated successfully",
            "data": schemas.MedicalRecord.model_validate(updated_record).model_dump()
        }
    except HTTPException:
        raise
    except Exception as e:
        api_logger.error("Error in update_medical_record", record_id=record_id, doctor_id=current_user.id, error=str(e), exc_info=True)
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


@router.delete("/medical-records/{record_id}")
async def delete_medical_record(
    record_id: int,
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user)
):
    """Delete specific medical record by ID"""
    try:
        # Check if record exists and user has access
        existing_record = crud.get_medical_record(db, record_id)
        if not existing_record:
            raise HTTPException(status_code=404, detail="Medical record not found")
        
        if existing_record.doctor_id != current_user.id:
            raise HTTPException(status_code=403, detail="Access denied to this medical record")
        
        # Soft delete by setting a deleted flag or hard delete
        # For now, we'll do hard delete - in production consider soft delete
        db.delete(existing_record)
        db.commit()
        
        return {"message": "Medical record deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        api_logger.error("Error in delete_medical_record", record_id=record_id, doctor_id=current_user.id, error=str(e), exc_info=True)
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
# Folios de documentos (recetas y órdenes)
@router.get("/consultations/{consultation_id}/document-folio")
async def get_consultation_document_folio(
    consultation_id: int,
    document_type: str = Query(..., description="Tipo de documento: prescription | study_order"),
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user)
):
    """
    Obtener o generar un folio para la consulta según el tipo de documento.
    El folio es único por doctor, consulta y tipo de documento.
    """
    try:
        normalized_type = DocumentFolioService.normalize_document_type(document_type)
    except ValueError as exc:
        api_logger.warning(
            "Tipo de documento inválido para folio",
            extra={"document_type": document_type, "user_id": current_user.id}
        )
        raise HTTPException(status_code=400, detail=str(exc))

    try:
        consultation = db.query(MedicalRecord).filter(
            MedicalRecord.id == consultation_id,
            MedicalRecord.doctor_id == current_user.id
        ).first()

        if not consultation:
            api_logger.warning(
                "Consulta no encontrada o sin acceso para folio",
                extra={"consultation_id": consultation_id, "doctor_id": current_user.id}
            )
            raise HTTPException(status_code=404, detail="Consulta no encontrada o sin permiso")

        folio = DocumentFolioService.get_or_create_folio(
            db=db,
            doctor_id=consultation.doctor_id,
            consultation_id=consultation.id,
            document_type=normalized_type
        )

        return {
            "consultation_id": consultation.id,
            "doctor_id": consultation.doctor_id,
            "document_type": folio.document_type,
            "folio_number": folio.folio_number,
            "formatted_folio": folio.formatted_folio,
            "created_at": folio.created_at.isoformat() if folio.created_at else None
        }
    except HTTPException:
        raise
    except Exception as e:
        api_logger.error(
            "Error generando folio para consulta",
            extra={"consultation_id": consultation_id, "document_type": document_type, "error": str(e)}
        )
        raise HTTPException(status_code=500, detail="Error generando folio del documento")


# ============================================================================
# PRESCRIPTIONS ENDPOINTS
# ============================================================================

@router.get("/consultations/{consultation_id}/prescriptions")
async def get_consultation_prescriptions(
    consultation_id: int,
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user)
):
    """Get prescriptions for a specific consultation"""
    api_logger.info("Getting prescriptions for consultation", consultation_id=consultation_id, doctor_id=current_user.id)
    
    try:
        # Verify consultation exists and user has access
        consultation = db.query(MedicalRecord).filter(
            MedicalRecord.id == consultation_id,
            MedicalRecord.created_by == current_user.id
        ).first()
        
        if not consultation:
            api_logger.warning("Consultation not found or no access", consultation_id=consultation_id, doctor_id=current_user.id)
            return []

        # Get prescriptions for this consultation with medication relationship loaded
        prescriptions = (
            db.query(ConsultationPrescription)
            .options(joinedload(ConsultationPrescription.medication))
            .outerjoin(Medication, ConsultationPrescription.medication_id == Medication.id)
            .filter(
                ConsultationPrescription.consultation_id == consultation_id,
                or_(
                    Medication.created_by == current_user.id,
                    Medication.id.is_(None)
                )
            )
            .all()
        )
        
        api_logger.info("Found prescriptions", consultation_id=consultation_id, count=len(prescriptions))
        
        # Convert to response format
        prescriptions_data = []
        for prescription in prescriptions:
            # Handle case where medication might not exist (defensive programming)
            medication_name = prescription.medication.name if prescription.medication else "Medicamento no encontrado"
            
            prescription_data = {
                "id": prescription.id,
                "consultation_id": prescription.consultation_id,
                "medication_id": prescription.medication_id,
                "medication_name": medication_name,
                "dosage": prescription.dosage,
                "frequency": prescription.frequency,
                "duration": prescription.duration,
                "instructions": prescription.instructions,
                "quantity": prescription.quantity,
                "via_administracion": prescription.via_administracion,
                "created_at": prescription.created_at.isoformat() if prescription.created_at else None,
            }
            prescriptions_data.append(prescription_data)
        
        return prescriptions_data
        
    except Exception as e:
        api_logger.error("Error getting consultation prescriptions", consultation_id=consultation_id, error=str(e))
        raise HTTPException(status_code=500, detail="Error retrieving consultation prescriptions")

@router.post("/consultations/{consultation_id}/prescriptions")
async def create_consultation_prescription(
    consultation_id: int,
    prescription_data: dict,
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user)
):
    """Create a prescription for a consultation"""
    api_logger.info("Creating prescription for consultation", consultation_id=consultation_id, doctor_id=current_user.id)
    
    try:
        # Verify consultation exists and user has access
        consultation = db.query(MedicalRecord).filter(
            MedicalRecord.id == consultation_id,
            MedicalRecord.created_by == current_user.id
        ).first()
        
        if not consultation:
            raise HTTPException(status_code=404, detail="Consultation not found or no access")
        
        # Verify medication exists
        medication = (
            db.query(Medication)
            .filter(
                Medication.id == prescription_data.get('medication_id'),
                Medication.created_by == current_user.id
            )
            .first()
        )
        
        if not medication:
            raise HTTPException(status_code=404, detail="Medication not found")
        
        # Create new prescription
        new_prescription = ConsultationPrescription(
            consultation_id=consultation_id,
            medication_id=prescription_data.get('medication_id'),
            dosage=prescription_data.get('dosage'),
            frequency=prescription_data.get('frequency'),
            duration=prescription_data.get('duration'),
            instructions=prescription_data.get('instructions'),
            quantity=prescription_data.get('quantity'),
            via_administracion=prescription_data.get('via_administracion')
        )
        
        db.add(new_prescription)
        db.commit()
        db.refresh(new_prescription)
        
        response_data = {
            "id": new_prescription.id,
            "consultation_id": new_prescription.consultation_id,
            "medication_id": new_prescription.medication_id,
            "medication_name": medication.name,
            "dosage": new_prescription.dosage,
            "frequency": new_prescription.frequency,
            "duration": new_prescription.duration,
            "instructions": new_prescription.instructions,
            "quantity": new_prescription.quantity,
            "via_administracion": new_prescription.via_administracion,
            "created_at": new_prescription.created_at.isoformat() if new_prescription.created_at else None
        }
        
        api_logger.info("Prescription created successfully", prescription_id=new_prescription.id, consultation_id=consultation_id)
        return response_data
        
    except HTTPException:
        raise
    except Exception as e:
        api_logger.error("Error creating consultation prescription", consultation_id=consultation_id, error=str(e))
        db.rollback()
        raise HTTPException(status_code=500, detail="Error creating consultation prescription")

@router.put("/consultations/{consultation_id}/prescriptions/{prescription_id}")
async def update_consultation_prescription(
    consultation_id: int,
    prescription_id: int,
    prescription_data: dict,
    request: Request,
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user)
):
    """Update a prescription"""
    api_logger.info("Updating prescription", prescription_id=prescription_id, consultation_id=consultation_id, doctor_id=current_user.id)
    
    try:
        # Verify consultation exists and user has access
        consultation = db.query(MedicalRecord).filter(
            MedicalRecord.id == consultation_id,
            MedicalRecord.created_by == current_user.id
        ).first()
        
        if not consultation:
            raise HTTPException(status_code=404, detail="Consultation not found or no access")
        
        # Find the prescription to update
        prescription = db.query(ConsultationPrescription).filter(
            ConsultationPrescription.id == prescription_id,
            ConsultationPrescription.consultation_id == consultation_id
        ).first()
        
        if not prescription:
            raise HTTPException(status_code=404, detail="Prescription not found")
        
        original_data = serialize_instance(
            prescription,
            exclude={"created_at"},
        )
        
        # Update fields
        if 'dosage' in prescription_data:
            prescription.dosage = prescription_data['dosage']
        if 'frequency' in prescription_data:
            prescription.frequency = prescription_data['frequency']
        if 'duration' in prescription_data:
            prescription.duration = prescription_data['duration']
        if 'instructions' in prescription_data:
            prescription.instructions = prescription_data['instructions']
        if 'quantity' in prescription_data:
            prescription.quantity = prescription_data['quantity']
        if 'via_administracion' in prescription_data:
            prescription.via_administracion = prescription_data['via_administracion']
        
        db.commit()
        db.refresh(prescription)
        
        # Load medication relationship for response
        db.refresh(prescription, ['medication'])
        
        updated_data = serialize_instance(prescription)

        audit_service.log_action(
            db=db,
            action="UPDATE",
            user=current_user,
            request=request,
            table_name="consultation_prescriptions",
            record_id=prescription.id,
            old_values=original_data,
            new_values=updated_data,
            operation_type="prescription_update",
            affected_patient_id=consultation.patient_id,
            affected_patient_name=consultation.patient.name if consultation.patient else None,
            metadata={
                "consultation_id": consultation_id,
            },
        )
        
        response_data = {
            "id": prescription.id,
            "consultation_id": prescription.consultation_id,
            "medication_id": prescription.medication_id,
            "medication_name": prescription.medication.name if prescription.medication else "Medicamento no encontrado",
            "dosage": prescription.dosage,
            "frequency": prescription.frequency,
            "duration": prescription.duration,
            "instructions": prescription.instructions,
            "quantity": prescription.quantity,
            "via_administracion": prescription.via_administracion,
            "created_at": prescription.created_at.isoformat() if prescription.created_at else None
        }
        
        api_logger.info("Prescription updated successfully", prescription_id=prescription.id, consultation_id=consultation_id)
        return response_data
        
    except HTTPException:
        raise
    except Exception as e:
        api_logger.error("Error updating consultation prescription", prescription_id=prescription_id, error=str(e))
        db.rollback()
        audit_service.log_action(
            db=db,
            action="UPDATE",
            user=current_user,
            request=request,
            table_name="consultation_prescriptions",
            record_id=prescription_id,
            old_values=original_data if 'original_data' in locals() else None,
            new_values=None,
            operation_type="prescription_update",
            affected_patient_id=getattr(consultation, "patient_id", None) if 'consultation' in locals() and consultation else None,
            success=False,
            error_message=str(e),
            metadata={"consultation_id": consultation_id},
        )
        raise HTTPException(status_code=500, detail="Error updating consultation prescription")

@router.delete("/consultations/{consultation_id}/prescriptions/{prescription_id}")
async def delete_consultation_prescription(
    consultation_id: int,
    prescription_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user)
):
    """Delete a prescription from a consultation"""
    api_logger.info("Deleting prescription", prescription_id=prescription_id, consultation_id=consultation_id, doctor_id=current_user.id)
    
    try:
        # Verify consultation exists and user has access
        consultation = db.query(MedicalRecord).filter(
            MedicalRecord.id == consultation_id,
            MedicalRecord.created_by == current_user.id
        ).first()
        
        if not consultation:
            raise HTTPException(status_code=404, detail="Consultation not found or no access")
        
        # Find the prescription to delete
        prescription = db.query(ConsultationPrescription).filter(
            ConsultationPrescription.id == prescription_id,
            ConsultationPrescription.consultation_id == consultation_id
        ).first()
        
        if not prescription:
            raise HTTPException(status_code=404, detail="Prescription not found")
        
        original_data = serialize_instance(prescription)

        db.delete(prescription)
        db.commit()

        audit_service.log_action(
            db=db,
            action="DELETE",
            user=current_user,
            request=request,
            table_name="consultation_prescriptions",
            record_id=prescription_id,
            old_values=original_data,
            new_values=None,
            operation_type="prescription_delete",
            affected_patient_id=consultation.patient_id,
            affected_patient_name=consultation.patient.name if consultation.patient else None,
            metadata={"consultation_id": consultation_id},
        )
        
        api_logger.info("Prescription deleted successfully", prescription_id=prescription_id, consultation_id=consultation_id)
        return {"message": "Prescription deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        api_logger.error("Error deleting consultation prescription", prescription_id=prescription_id, error=str(e))
        db.rollback()
        audit_service.log_action(
            db=db,
            action="DELETE",
            user=current_user,
            request=request,
            table_name="consultation_prescriptions",
            record_id=prescription_id,
            old_values=original_data if 'original_data' in locals() else None,
            new_values=None,
            operation_type="prescription_delete",
            success=False,
            error_message=str(e),
            metadata={"consultation_id": consultation_id},
        )
        raise HTTPException(status_code=500, detail="Error deleting consultation prescription")

