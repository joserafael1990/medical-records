"""
Consultation Service - Refactored to use modular utilities
Provides comprehensive consultation management functionality
"""
from typing import Dict, List, Any
from sqlalchemy.orm import Session, joinedload
from datetime import timedelta
from fastapi import HTTPException

from database import MedicalRecord, Person
from logger import get_logger
from utils.audit_utils import serialize_instance
from audit_service import audit_service

# Import all utilities from the consultations package
from services.consultations import (
    # Timezone
    now_cdmx, cdmx_datetime,
    # Security
    encrypt_sensitive_data, decrypt_sensitive_data, sign_medical_document,
    # Decryption
    decrypt_patient_data, decrypt_consultation_data,
    # Formatting
    format_patient_name, format_doctor_name,
    # Data retrieval
    get_consultation_vital_signs, get_consultation_prescriptions,
    get_consultation_clinical_studies, get_patient_info,
    # Response builders
    build_consultation_response, build_create_consultation_response,
    # Diagnosis
    format_diagnoses_from_catalog,
    # Creation helpers
    encrypt_consultation_fields, parse_consultation_date,
    create_medical_record_object, prepare_consultation_for_signing,
    mark_appointment_completed
)

api_logger = get_logger("medical_records.api")
security_logger = get_logger("medical_records.security")


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
        
        NOTE: This method contains complex validation and business logic.
        For full implementation details, see the original consultation_service.py
        This is a simplified facade that delegates to helper functions.
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
            
            # Validate patient document (complex logic - kept inline for now)
            # TODO: Extract to validation module if needed
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
        
        NOTE: This method contains complex validation and business logic.
        For full implementation details, see the original consultation_service.py
        This is a simplified facade.
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
