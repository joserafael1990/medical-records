from sqlalchemy.orm import Session
from fastapi import HTTPException, Request
from typing import List, Optional, Dict, Any
from datetime import datetime

from database import Person, PersonDocument, Document
from logger import get_logger
from audit_service import audit_service
import crud
import schemas
from utils.audit_utils import serialize_instance
from utils.datetime_utils import utc_now
from utils.document_validators import validate_curp_conditional

api_logger = get_logger("medical_records.api")
security_logger = get_logger("medical_records.security")

class PatientService:
    
    @staticmethod
    def _format_documents_for_validation(documents_payload: List[Any]) -> List[Dict]:
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

    @staticmethod
    def _decrypt_patient_fields(patient: Person, doctor_id: int) -> Dict[str, Any]:
        """Decrypt sensitive patient fields safely."""
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
            'active': getattr(patient, 'active', True),
            'is_active': getattr(patient, 'is_active', True),
            'created_at': getattr(patient, 'created_at', None),
            'updated_at': getattr(patient, 'updated_at', None),
            'created_by': getattr(patient, 'created_by', None),
            'full_name': getattr(patient, 'full_name', None)
        }

        # Decrypt fields with error handling
        sensitive_fields = [
            ('email', 'email'),
            ('primary_phone', 'primary_phone'),
            ('emergency_contact_phone', 'emergency_contact_phone'),
            ('insurance_number', 'insurance_policy_number') # Map model field to dict key
        ]

        for model_field, dict_key in sensitive_fields:
            value = getattr(patient, model_field, None)
            if value:
                try:
                    patient_data[dict_key] = value
                except Exception:
                    security_logger.warning(
                        f"⚠️ Could not decrypt {model_field} for patient",
                        extra={"patient_id": patient.id, "doctor_id": doctor_id},
                        exc_info=True
                    )
                    patient_data[dict_key] = value
            else:
                patient_data[dict_key] = None

        return patient_data

    @classmethod
    def get_patients(cls, db: Session, doctor_id: int, skip: int = 0, limit: int = 100) -> List[Dict[str, Any]]:
        """Get list of patients created by the current doctor with decrypted sensitive data."""
        try:
            patients = db.query(Person).filter(
                Person.person_type == 'patient',
                Person.created_by == doctor_id
            ).offset(skip).limit(limit).all()
            
            decrypted_patients = []
            for patient in patients:
                patient_data = cls._decrypt_patient_fields(patient, doctor_id)
                
                # Load documents
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
                
                decrypted_patients.append(patient_data)
            
            api_logger.info(
                "Patient list retrieved and decrypted",
                extra={"doctor_id": doctor_id, "count": len(decrypted_patients)}
            )
            return decrypted_patients
            
        except Exception as e:
            security_logger.error(
                "❌ Error in get_patients",
                extra={"doctor_id": doctor_id},
                exc_info=True
            )
            raise HTTPException(status_code=500, detail=f"Error retrieving patients: {str(e)}")

    @classmethod
    def get_patient(cls, db: Session, patient_id: int, doctor_id: int) -> Dict[str, Any]:
        """Get specific patient by ID with decrypted sensitive data."""
        try:
            patient = db.query(Person).filter(
                Person.id == patient_id,
                Person.person_type == 'patient',
                Person.created_by == doctor_id
            ).first()
            
            if not patient:
                raise HTTPException(status_code=404, detail="Patient not found or access denied")
            
            # Load documents
            person_docs = db.query(PersonDocument).join(Document).filter(
                PersonDocument.person_id == patient.id,
                PersonDocument.is_active == True
            ).all()
            
            personal_documents_list = []
            professional_documents_list = []
            personal_documents_dict = {}
            
            for pd in person_docs:
                doc_name = pd.document.name if pd.document else None
                doc_data = {
                    "document_id": pd.document_id,
                    "document_value": pd.document_value,
                    "document_name": doc_name
                }
                
                if pd.document and pd.document.document_type_id == 1:  # Personal
                    personal_documents_dict[doc_name] = pd.document_value
                    personal_documents_list.append(doc_data)
                elif pd.document and pd.document.document_type_id == 2:  # Profesional
                    professional_documents_list.append(doc_data)
            
            # Decrypt fields
            decrypted_data = cls._decrypt_patient_fields(patient, doctor_id)
            
            # Construct response
            patient_response = {
                **decrypted_data,
                'curp': personal_documents_dict.get('CURP'),
                'rfc': personal_documents_dict.get('RFC'),
                'personal_documents': personal_documents_list,
                'professional_documents': professional_documents_list
            }
            
            security_logger.info(
                "Patient data retrieved and decrypted",
                extra={"patient_id": patient_id, "doctor_id": doctor_id}
            )
            return patient_response
            
        except HTTPException:
            raise
        except Exception as e:
            security_logger.error(
                "❌ Error in get_patient",
                extra={"patient_id": patient_id, "doctor_id": doctor_id},
                exc_info=True
            )
            raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

    @classmethod
    def create_patient(cls, db: Session, patient_data: schemas.PatientCreate, doctor_id: int) -> Person:
        """Create new patient with encrypted sensitive data."""
        try:
            security_logger.info(
                "🚨 CREATE PATIENT SERVICE CALLED",
                extra={"doctor_id": doctor_id}
            )
            
            # Validate CURP
            documents_payload = getattr(patient_data, 'documents', []) or []
            formatted_documents = cls._format_documents_for_validation(documents_payload)
            is_valid_curp, curp_error = validate_curp_conditional(formatted_documents)
            if not is_valid_curp:
                raise HTTPException(status_code=422, detail=curp_error)
            
            # Check document uniqueness
            if documents_payload:
                for doc in documents_payload:
                    if doc.document_id and doc.document_value:
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
            
            # Check email uniqueness
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
            
            # Generate person code
            person_code = crud.generate_person_code(db, 'patient')
            
            # Create patient
            patient = crud.create_patient_with_code(db, patient_data, person_code, doctor_id)
            
            # Commit
            db.commit()
            db.refresh(patient)
            
            security_logger.info(
                "Patient created successfully",
                extra={"patient_id": patient.id, "doctor_id": doctor_id}
            )
            return patient
            
        except HTTPException:
            raise
        except Exception as e:
            security_logger.error(
                "❌ Error creating patient",
                extra={"doctor_id": doctor_id},
                exc_info=True
            )
            raise HTTPException(status_code=500, detail=f"Error interno al crear paciente: {str(e)}")

    @classmethod
    def update_patient(
        cls, 
        db: Session, 
        patient_id: int, 
        patient_data: schemas.PersonUpdate, 
        doctor_id: int,
        request: Request
    ) -> Person:
        """Update specific patient by ID."""
        try:
            patient = db.query(Person).filter(
                Person.id == patient_id,
                Person.person_type == 'patient',
                Person.created_by == doctor_id
            ).first()
            
            if not patient:
                raise HTTPException(status_code=404, detail=f"No se encontró el paciente con ID: {patient_id} o acceso denegado")
            
            # Capture original state
            original_data = serialize_instance(patient, exclude={"updated_at"})
            
            # Validate CURP
            documents_payload = getattr(patient_data, 'documents', []) or []
            formatted_documents = cls._format_documents_for_validation(documents_payload)
            is_valid_curp, curp_error = validate_curp_conditional(formatted_documents)
            if not is_valid_curp:
                raise HTTPException(status_code=422, detail=curp_error)
            
            # Check document uniqueness (excluding current patient)
            if documents_payload:
                for doc in documents_payload:
                    if doc.document_id and doc.document_value:
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
            
            # Check email uniqueness
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
            
            # Update fields
            update_data = patient_data.dict(exclude_unset=True)
            
            # Map gender
            if 'gender' in update_data and update_data['gender']:
                gender_map = {
                    'Masculino': 'Masculino', 'Femenino': 'Femenino',
                    'M': 'Masculino', 'F': 'Femenino',
                    'masculino': 'Masculino', 'femenino': 'Femenino'
                }
                update_data['gender'] = gender_map.get(update_data['gender'], update_data['gender'])
            
            # Handle foreign keys
            foreign_key_fields = [
                'emergency_contact_relationship', 'birth_state_id', 'birth_country_id',
                'address_state_id', 'address_country_id'
            ]
            
            for field, value in update_data.items():
                if hasattr(patient, field):
                    if field == 'curp' and (value == '' or value is None):
                        continue
                    if field in foreign_key_fields and value == '':
                        setattr(patient, field, None)
                    else:
                        setattr(patient, field, value)
            
            # Handle documents
            if documents_payload:
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
                        if existing_doc.document_value != doc_value or not existing_doc.is_active:
                            existing_doc.document_value = doc_value
                            existing_doc.is_active = True
                            existing_doc.updated_at = utc_now()
                    else:
                        new_document = PersonDocument(
                            person_id=patient.id,
                            document_id=doc_id,
                            document_value=doc_value,
                            is_active=True
                        )
                        db.add(new_document)
            
            patient.updated_at = utc_now()
            db.commit()
            db.refresh(patient)
            
            # Audit log
            updated_data = serialize_instance(patient)
            audit_service.log_action(
                db=db,
                action="UPDATE",
                user=db.query(Person).get(doctor_id), # Get user object for audit
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
                extra={"patient_id": patient_id, "doctor_id": doctor_id},
                exc_info=True
            )
            raise HTTPException(status_code=500, detail=f"Error interno al actualizar paciente: {str(e)}")
