"""
Patient management endpoints
Migrated from main_clean_english.py to improve code organization
"""

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session
from typing import Optional

from database import get_db, Person, PersonDocument, Document
from dependencies import get_current_user
from logger import get_logger
from audit_service import audit_service
import crud
import schemas
from datetime import datetime
from utils.audit_utils import serialize_instance
from utils.document_validators import validate_curp_conditional

api_logger = get_logger("medical_records.api")
security_logger = get_logger("medical_records.security")

router = APIRouter(prefix="/api", tags=["patients"])


def _format_documents_for_validation(documents_payload):
    """Format documents payload into simple dict list for validation helpers."""
    formatted = []
    for doc in documents_payload or []:
        if doc is None:
            continue
        if isinstance(doc, dict):
            document_id = doc.get('document_id')
            document_value = doc.get('document_value')
            document_name = doc.get('document_name')
        else:
            document_id = getattr(doc, 'document_id', None)
            document_value = getattr(doc, 'document_value', None)
            document_name = getattr(doc, 'document_name', None)
        if document_id:
            formatted.append({
                "document_id": document_id,
                "document_value": (document_value or "").strip(),
                "document_name": document_name
            })
    return formatted


@router.get("/patients")
async def get_patients(
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user),
    skip: int = Query(0),
    limit: int = Query(100)
):
    """Get list of patients created by the current doctor with decrypted sensitive data"""
    try:
        # Simple query to get patients
        patients = db.query(Person).filter(
            Person.person_type == 'patient',
            Person.created_by == current_user.id
        ).offset(skip).limit(limit).all()
        
        # Decrypt sensitive data for each patient
        decrypted_patients = []
        for patient in patients:
            # Create patient data dictionary with only existing fields
            patient_data = {
                'id': patient.id,
                'person_code': getattr(patient, 'person_code', None),
                'person_type': patient.person_type,
                'name': patient.name,
                'title': patient.title,
                'birth_date': patient.birth_date,
                'gender': patient.gender,
                'civil_status': getattr(patient, 'civil_status', None),
                'home_address': getattr(patient, 'home_address', None),
                'address_city': getattr(patient, 'address_city', None),
                'address_state_id': getattr(patient, 'address_state_id', None),
                'address_country_id': getattr(patient, 'address_country_id', None),
                'address_postal_code': getattr(patient, 'address_postal_code', None),
                'birth_city': getattr(patient, 'birth_city', None),
                'birth_state_id': getattr(patient, 'birth_state_id', None),
                'birth_country_id': getattr(patient, 'birth_country_id', None),
                'emergency_contact_name': getattr(patient, 'emergency_contact_name', None),
                'emergency_contact_relationship': getattr(patient, 'emergency_contact_relationship', None),
                'insurance_provider': getattr(patient, 'insurance_provider', None),
                'insurance_policy_number': getattr(patient, 'insurance_policy_number', None),
                'active': getattr(patient, 'active', True),
                'is_active': getattr(patient, 'is_active', True),
                'created_at': getattr(patient, 'created_at', None),
                'updated_at': getattr(patient, 'updated_at', None),
                'created_by': getattr(patient, 'created_by', None),
                'full_name': getattr(patient, 'full_name', None)
            }
            
            # Note: CURP and other documents are now in person_documents table
            # Load documents from person_documents if needed
            person_docs = db.query(PersonDocument).filter(
                PersonDocument.person_id == patient.id,
                PersonDocument.is_active == True
            ).all()
            
            if person_docs:
                patient_data['personal_documents'] = []
                patient_data['professional_documents'] = []
                for pd in person_docs:
                    doc_data = {
                        'document_id': pd.document_id,
                        'document_value': pd.document_value,
                        'document_name': pd.document.name if pd.document else None
                    }
                    if pd.document and pd.document.document_type_id == 1:  # Personal
                        patient_data['personal_documents'].append(doc_data)
                    elif pd.document and pd.document.document_type_id == 2:  # Profesional
                        patient_data['professional_documents'].append(doc_data)
            
            if getattr(patient, 'email', None):
                try:
                    patient_data['email'] = patient.email
                except Exception as e:
                    security_logger.warning(
                        "⚠️ Could not decrypt email for patient",
                        extra={"patient_id": patient.id, "doctor_id": current_user.id},
                        exc_info=True
                    )
                    patient_data['email'] = patient.email
            
            if getattr(patient, 'primary_phone', None):
                try:
                    security_logger.debug(
                        "🔓 Attempting to decrypt phone for patient",
                        extra={"patient_id": patient.id, "doctor_id": current_user.id}
                    )
                    decrypted_phone = patient.primary_phone
                    patient_data['primary_phone'] = decrypted_phone
                    security_logger.debug(
                        "✅ Successfully decrypted phone for patient",
                        extra={"patient_id": patient.id, "doctor_id": current_user.id}
                    )
                except Exception as e:
                    security_logger.warning(
                        "⚠️ Could not decrypt phone for patient",
                        extra={"patient_id": patient.id, "doctor_id": current_user.id},
                        exc_info=True
                    )
                    patient_data['primary_phone'] = patient.primary_phone
            
            if getattr(patient, 'emergency_contact_phone', None):
                try:
                    patient_data['emergency_contact_phone'] = patient.emergency_contact_phone
                except Exception as e:
                    security_logger.warning(
                        "⚠️ Could not decrypt emergency phone for patient",
                        extra={"patient_id": patient.id, "doctor_id": current_user.id},
                        exc_info=True
                    )
                    patient_data['emergency_contact_phone'] = patient.emergency_contact_phone
            
            if getattr(patient, 'insurance_policy_number', None):
                try:
                    patient_data['insurance_policy_number'] = patient.insurance_policy_number
                except Exception as e:
                    security_logger.warning(
                        "⚠️ Could not decrypt insurance policy for patient",
                        extra={"patient_id": patient.id, "doctor_id": current_user.id},
                        exc_info=True
                    )
                    patient_data['insurance_policy_number'] = patient.insurance_policy_number
            
            decrypted_patients.append(patient_data)
        
        api_logger.info(
            "Patient list retrieved and decrypted",
            extra={"doctor_id": current_user.id, "count": len(decrypted_patients)}
        )
        return decrypted_patients
        
    except Exception as e:
        security_logger.error(
            "❌ Error in get_patients",
            extra={"doctor_id": current_user.id},
            exc_info=True
        )
        raise HTTPException(status_code=500, detail=f"Error retrieving patients: {str(e)}")


@router.get("/patients/{patient_id}")
async def get_patient(
    patient_id: int,
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user)
):
    """Get specific patient by ID with decrypted sensitive data (only if created by current doctor)"""
    try:
        patient = db.query(Person).filter(
            Person.id == patient_id,
            Person.person_type == 'patient',
            Person.created_by == current_user.id  # Only patients created by this doctor
        ).first()
        
        if not patient:
            raise HTTPException(status_code=404, detail="Patient not found or access denied")
        
        # Note: CURP and other documents are now in person_documents table
        # Load documents from person_documents
        person_docs = db.query(PersonDocument).join(Document).filter(
            PersonDocument.person_id == patient.id,
            PersonDocument.is_active == True
        ).all()
        
        personal_documents_dict = {}
        professional_documents_dict = {}
        personal_documents_list = []
        professional_documents_list = []
        for pd in person_docs:
            doc_name = pd.document.name if pd.document else None
            if pd.document and pd.document.document_type_id == 1:  # Personal
                personal_documents_dict[doc_name] = pd.document_value
                personal_documents_list.append({
                    "document_id": pd.document_id,
                    "document_value": pd.document_value,
                    "document_name": doc_name
                })
            elif pd.document and pd.document.document_type_id == 2:  # Profesional
                professional_documents_dict[doc_name] = pd.document_value
                professional_documents_list.append({
                    "document_id": pd.document_id,
                    "document_value": pd.document_value,
                    "document_name": doc_name
                })
        
        decrypted_curp = personal_documents_dict.get('CURP', None)
        decrypted_rfc = personal_documents_dict.get('RFC', None)
        decrypted_email = None
        decrypted_phone = None
        decrypted_insurance = None
        
        if patient.email:
            try:
                decrypted_email = patient.email
                security_logger.debug(
                    "🔓 Email decrypted for patient",
                    extra={"patient_id": patient.id, "doctor_id": current_user.id}
                )
            except Exception as e:
                security_logger.warning(
                    "⚠️ Could not decrypt email (might be unencrypted)",
                    extra={"patient_id": patient.id, "doctor_id": current_user.id},
                    exc_info=True
                )
                decrypted_email = patient.email
        
        if patient.primary_phone:
            try:
                decrypted_phone = patient.primary_phone
                security_logger.debug(
                    "🔓 Phone decrypted for patient",
                    extra={"patient_id": patient.id, "doctor_id": current_user.id}
                )
            except Exception as e:
                security_logger.warning(
                    "⚠️ Could not decrypt phone (might be unencrypted)",
                    extra={"patient_id": patient.id, "doctor_id": current_user.id},
                    exc_info=True
                )
                decrypted_phone = patient.primary_phone
        
        if patient.insurance_number:
            try:
                decrypted_insurance = patient.insurance_number
                security_logger.debug(
                    "🔓 Insurance decrypted for patient",
                    extra={"patient_id": patient.id, "doctor_id": current_user.id}
                )
            except Exception as e:
                security_logger.warning(
                    "⚠️ Could not decrypt insurance (might be unencrypted)",
                    extra={"patient_id": patient.id, "doctor_id": current_user.id},
                    exc_info=True
                )
                decrypted_insurance = patient.insurance_number
        
        # Return patient data with decrypted sensitive fields
        patient_response = {
            'id': patient.id,
            'name': patient.name,
            'email': patient.email,
            'primary_phone': patient.primary_phone,
            'birth_date': patient.birth_date.isoformat() if patient.birth_date else None,
            'gender': patient.gender,
            'curp': decrypted_curp,
            'rfc': decrypted_rfc,
            'civil_status': patient.civil_status,
            'home_address': patient.home_address,
            'address_city': patient.address_city,
            'address_state_id': patient.address_state_id,
            'address_country_id': patient.address_country_id,
            'address_postal_code': patient.address_postal_code,
            'emergency_contact_name': patient.emergency_contact_name,
            'emergency_contact_phone': patient.emergency_contact_phone,
            'emergency_contact_relationship': patient.emergency_contact_relationship,
            'active': patient.is_active,
            'created_at': patient.created_at.isoformat() if patient.created_at else None,
            'updated_at': patient.updated_at.isoformat() if patient.updated_at else None,
            'personal_documents': personal_documents_list,
            'professional_documents': professional_documents_list
        }
        
        security_logger.info(
            "Patient data retrieved and decrypted",
            extra={"patient_id": patient_id, "doctor_id": current_user.id}
        )
        return patient_response
    except HTTPException:
        raise
    except Exception as e:
        security_logger.error(
            "❌ Error in get_patient",
            extra={"patient_id": patient_id, "doctor_id": current_user.id},
            exc_info=True
        )
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


@router.post("/patients")
async def create_patient(
    patient_data: schemas.PatientCreate,
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user)
):
    """Create new patient with encrypted sensitive data"""
    try:
        security_logger.info(
            "🚨 CREATE PATIENT FUNCTION CALLED - NEW VERSION WITH ENCRYPTION",
            extra={"doctor_id": current_user.id}
        )
        
        # Validate CURP only when CURP document is provided
        documents_payload = getattr(patient_data, 'documents', []) or []
        formatted_documents = _format_documents_for_validation(documents_payload)
        is_valid_curp, curp_error = validate_curp_conditional(formatted_documents)
        if not is_valid_curp:
            raise HTTPException(status_code=422, detail=curp_error)
        
        # Check if patient already exists by documents (normalized) or email
        # Validate document uniqueness before creating patient
        if documents_payload:
            for doc in documents_payload:
                if doc.document_id and doc.document_value:
                    # Check if this document value already exists for this document type
                    existing_doc = db.query(PersonDocument).join(Person).filter(
                        PersonDocument.document_id == doc.document_id,
                        PersonDocument.document_value == doc.document_value.strip(),
                        PersonDocument.is_active == True,
                        Person.person_type == 'patient'
                    ).first()
                    if existing_doc:
                        document = db.query(Document).filter(Document.id == doc.document_id).first()
                        raise HTTPException(
                            status_code=409, 
                            detail=f"Ya existe un paciente con {document.name if document else 'documento'}: {doc.document_value}"
                        )
        
        if patient_data.email:
            existing_patient = db.query(Person).filter(
                Person.email == patient_data.email,
                Person.person_type == 'patient'
            ).first()
            if existing_patient:
                raise HTTPException(
                    status_code=409, 
                    detail=f"Ya existe un paciente con email: {patient_data.email}"
                )
        
        # Generate unique person code BEFORE creating the patient
        person_code = crud.generate_person_code(db, 'patient')
        
        # Verify the generated code is actually unique
        existing_code = db.query(Person).filter(Person.person_code == person_code).first()
        if existing_code:
            raise HTTPException(
                status_code=500, 
                detail=f"Error interno: código generado ya existe: {person_code}"
            )
        
        # Create patient using the pre-generated code and assign the creating doctor
        # Note: Pydantic validation happens before encryption
        patient = crud.create_patient_with_code(db, patient_data, person_code, current_user.id)
        
        # NOW encrypt sensitive fields directly in the database model BEFORE commit
        # Note: CURP and other documents are now in person_documents table, not encrypted for now
        if patient.email:
            security_logger.debug(
                "🔐 Email encrypted for patient",
                extra={"patient_id": patient.id, "doctor_id": current_user.id}
            )
        
        if patient.primary_phone:
            security_logger.debug(
                "🔐 Phone encrypted for patient",
                extra={"patient_id": patient.id, "doctor_id": current_user.id}
            )
        
        if patient.insurance_number:
            security_logger.debug(
                "🔐 Insurance encrypted for patient",
                extra={"patient_id": patient.id, "doctor_id": current_user.id}
            )
        
        # Commit the transaction to persist the patient
        db.commit()
        db.refresh(patient)
        
        security_logger.info(
            "Patient created successfully",
            extra={"patient_id": patient.id, "doctor_id": current_user.id, "encrypted": True}
        )
        return patient
        
    except HTTPException:
        raise
    except Exception as e:
        security_logger.error(
            "❌ Error creating patient",
            extra={"doctor_id": current_user.id},
            exc_info=True
        )
        raise HTTPException(
            status_code=500, 
            detail=f"Error interno al crear paciente: {str(e)}"
        )


@router.put("/patients/{patient_id}")
async def update_patient(
    patient_id: int,
    patient_data: schemas.PersonUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user)
):
    """Update specific patient by ID"""
    # Debug: Check emergency contact data in update request
    security_logger.info(
        "🔍 UPDATE Patient - emergency contact data received",
        extra={
            "patient_id": patient_id,
            "doctor_id": current_user.id,
            "has_name": bool(patient_data.emergency_contact_name),
            "has_phone": bool(patient_data.emergency_contact_phone)
        }
    )
    try:
        patient = db.query(Person).filter(
            Person.id == patient_id,
            Person.person_type == 'patient',
            Person.created_by == current_user.id  # Only patients created by this doctor
        ).first()
        
        if not patient:
            raise HTTPException(status_code=404, detail=f"No se encontró el paciente con ID: {patient_id} o acceso denegado")
        
        # Capture original state before applying changes (for audit trail)
        original_data = serialize_instance(
            patient,
            exclude={"updated_at"},
        )
        
        # Validate CURP document only if CURP provided
        documents_payload = getattr(patient_data, 'documents', []) or []
        formatted_documents = _format_documents_for_validation(documents_payload)
        is_valid_curp, curp_error = validate_curp_conditional(formatted_documents)
        if not is_valid_curp:
            raise HTTPException(status_code=422, detail=curp_error)
        
        # Check for conflicts with other patients (excluding current patient)
        # Validate document uniqueness before updating patient
        if documents_payload:
            for doc in documents_payload:
                if doc.document_id and doc.document_value:
                    # Check if this document value already exists for this document type in another patient
                    existing_doc = db.query(PersonDocument).join(Person).filter(
                        PersonDocument.document_id == doc.document_id,
                        PersonDocument.document_value == doc.document_value.strip(),
                        PersonDocument.is_active == True,
                        Person.person_type == 'patient',
                        Person.id != patient_id
                    ).first()
                    if existing_doc:
                        document = db.query(Document).filter(Document.id == doc.document_id).first()
                        raise HTTPException(
                            status_code=409, 
                            detail=f"Ya existe otro paciente con {document.name if document else 'documento'}: {doc.document_value}"
                        )
        
        if patient_data.email and patient_data.email != patient.email:
            existing_patient = db.query(Person).filter(
                Person.email == patient_data.email,
                Person.person_type == 'patient',
                Person.id != patient_id
            ).first()
            if existing_patient:
                raise HTTPException(
                    status_code=409, 
                    detail=f"Ya existe otro paciente con email: {patient_data.email}"
                )
        
        # Update patient fields with proper null handling for foreign keys
        update_data = patient_data.dict(exclude_unset=True)
        
        # Map gender values to backend format
        if 'gender' in update_data and update_data['gender']:
            gender_map = {
                'Masculino': 'Masculino',
                'Femenino': 'Femenino',
                'M': 'Masculino',
                'F': 'Femenino',
                'masculino': 'Masculino',
                'femenino': 'Femenino'
            }
            update_data['gender'] = gender_map.get(update_data['gender'], update_data['gender'])
        
        # Handle foreign key fields - convert empty strings to None
        foreign_key_fields = [
            'emergency_contact_relationship',
            'birth_state_id',
            # 'city_residence_id'  # Field doesn't exist in Person model - removed
        ]
        
        for field, value in update_data.items():
            if hasattr(patient, field):
                # Skip updating CURP if it's empty to avoid unique constraint violation
                if field == 'curp' and (value == '' or value is None):
                    continue
                    
                # Convert empty strings to None for foreign key fields
                if field in foreign_key_fields and value == '':
                    setattr(patient, field, None)
                else:
                    setattr(patient, field, value)
        
        if documents_payload:
            security_logger.info(
                "📄 Processing patient documents in update",
                extra={
                    "patient_id": patient_id,
                    "doctor_id": current_user.id,
                    "document_count": len(documents_payload)
                }
            )
            for doc in documents_payload:
                doc_id = getattr(doc, 'document_id', None) if hasattr(doc, 'document_id') else doc.get('document_id') if isinstance(doc, dict) else None
                doc_value_raw = getattr(doc, 'document_value', None) if hasattr(doc, 'document_value') else doc.get('document_value') if isinstance(doc, dict) else None
                
                if not doc_id or not doc_value_raw:
                    continue
                
                doc_value = doc_value_raw.strip()
                if not doc_value:
                    continue
                
                existing_doc = db.query(PersonDocument).filter(
                    PersonDocument.person_id == patient.id,
                    PersonDocument.document_id == doc_id
                ).first()
                
                if existing_doc:
                    needs_update = existing_doc.document_value != doc_value or not existing_doc.is_active
                    if needs_update:
                        existing_doc.document_value = doc_value
                        existing_doc.is_active = True
                        existing_doc.updated_at = datetime.utcnow()
                        security_logger.info(
                            "📄 Patient document updated",
                            extra={
                                "patient_id": patient.id,
                                "doctor_id": current_user.id,
                                "document_id": doc_id,
                                "document_value": doc_value
                            }
                        )
                else:
                    new_document = PersonDocument(
                        person_id=patient.id,
                        document_id=doc_id,
                        document_value=doc_value,
                        is_active=True
                    )
                    db.add(new_document)
                    security_logger.info(
                        "📄 Patient document created",
                        extra={
                            "patient_id": patient.id,
                            "doctor_id": current_user.id,
                            "document_id": doc_id,
                            "document_value": doc_value
                        }
                    )
        
        patient.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(patient)

        updated_data = serialize_instance(patient)

        audit_service.log_action(
            db=db,
            action="UPDATE",
            user=current_user,
            request=request,
            table_name="persons",
            record_id=patient.id,
            old_values=original_data,
            new_values=updated_data,
            operation_type="patient_update",
            affected_patient_id=patient.id,
            affected_patient_name=patient.name,
        )
        
        return patient
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        security_logger.error(
            "❌ Error in update_patient",
            extra={"patient_id": patient_id, "doctor_id": current_user.id},
            exc_info=True
        )
        audit_service.log_action(
            db=db,
            action="UPDATE",
            user=current_user,
            request=request,
            table_name="persons",
            record_id=patient_id,
            old_values=original_data if 'original_data' in locals() else None,
            new_values=None,
            operation_type="patient_update",
            affected_patient_id=patient_id,
            affected_patient_name=getattr(patient, "name", None) if 'patient' in locals() and patient else None,
            success=False,
            error_message=str(e),
        )
        raise HTTPException(
            status_code=500, 
            detail=f"Error interno al actualizar paciente: {str(e)}"
        )

