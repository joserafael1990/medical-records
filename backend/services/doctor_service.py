from sqlalchemy.orm import Session, joinedload
from fastapi import HTTPException, status
from typing import Dict, Any, List, Optional
import traceback

from database import Person, Specialty, DocumentType, Document, PersonDocument, State, Country
from logger import get_logger
from services import avatar_service
import crud
import schemas
from utils.document_validators import (
    validate_curp_conditional,
    validate_professional_license_conditional,
    format_documents_for_validation
)

api_logger = get_logger("api")

class DoctorService:
    
    @staticmethod
    def get_doctor_profile(db: Session, doctor_id: int) -> Dict[str, Any]:
        """Get complete profile of a doctor."""
        # Load the user with relationships
        user_with_relations = db.query(Person).options(
            joinedload(Person.offices)
        ).filter(Person.id == doctor_id).first()
        
        if not user_with_relations:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Doctor profile not found"
            )
        
        # Get specialty name
        specialty_name = None
        if user_with_relations.specialty_id:
            specialty = db.query(Specialty).filter(Specialty.id == user_with_relations.specialty_id).first()
            specialty_name = specialty.name if specialty else None
        
        # Get professional documents
        professional_type = db.query(DocumentType).filter(DocumentType.name == 'Profesional').first()
        professional_documents = []
        professional_license = None
        if professional_type:
            professional_docs = db.query(PersonDocument).join(Document).filter(
                PersonDocument.person_id == user_with_relations.id,
                PersonDocument.is_active == True,
                Document.document_type_id == professional_type.id
            ).all()
            professional_documents = [{"document_id": doc.document_id, "document_name": doc.document.name, "document_value": doc.document_value} for doc in professional_docs]
            for doc in professional_documents:
                if doc["document_name"] in ["Cédula Profesional", "Número de Colegiación", "Matrícula Nacional"]:
                    professional_license = doc["document_value"]
                    break
        
        # Get personal documents
        personal_type = db.query(DocumentType).filter(DocumentType.name == 'Personal').first()
        personal_documents = {}
        curp = None
        rfc = None
        if personal_type:
            personal_docs = db.query(PersonDocument).join(Document).filter(
                PersonDocument.person_id == user_with_relations.id,
                PersonDocument.is_active == True,
                Document.document_type_id == personal_type.id
            ).all()
            personal_documents = {doc.document.name: doc.document_value for doc in personal_docs}
            curp = personal_documents.get("CURP", None)
            rfc = personal_documents.get("RFC", None)
        
        # Load office states and countries
        offices_with_details = []
        for office in user_with_relations.offices:
            state_name = None
            country_name = None
            if office.state_id:
                state = db.query(State).filter(State.id == office.state_id).first()
                if state:
                    state_name = state.name
                    if state.country_id:
                        country = db.query(Country).filter(Country.id == state.country_id).first()
                        if country:
                            country_name = country.name
            
            offices_with_details.append({
                "id": office.id,
                "name": office.name,
                "address": office.address,
                "city": office.city,
                "state_id": office.state_id,
                "state_name": state_name,
                "country_name": country_name,
                "postal_code": office.postal_code,
                "phone": office.phone,
                "timezone": office.timezone,
                "maps_url": office.maps_url,
                "is_active": office.is_active
            })
        
        avatar_payload = avatar_service.get_current_avatar_payload(user_with_relations)

        return {
            "id": user_with_relations.id,
            "person_code": user_with_relations.person_code,
            "person_type": user_with_relations.person_type,
            "title": user_with_relations.title,
            "name": user_with_relations.name,
            "full_name": user_with_relations.full_name,
            "email": user_with_relations.email,
            "primary_phone": user_with_relations.primary_phone,
            "birth_date": user_with_relations.birth_date,
            "gender": user_with_relations.gender,
            "civil_status": user_with_relations.civil_status,
            "curp": curp,
            "rfc": rfc,
            "birth_city": user_with_relations.birth_city,
            "birth_state_id": user_with_relations.birth_state_id,
            "home_address": user_with_relations.home_address,
            "address_city": user_with_relations.address_city,
            "address_state_id": user_with_relations.address_state_id,
            "address_state_name": user_with_relations.address_state.name if user_with_relations.address_state else None,
            "address_country_name": user_with_relations.address_state.country.name if user_with_relations.address_state and user_with_relations.address_state.country else None,
            "address_postal_code": user_with_relations.address_postal_code,
            "offices": offices_with_details,
            "office_phone": None,
            "office_timezone": None,
            "appointment_duration": user_with_relations.appointment_duration,
            "professional_license": professional_license,
            "professional_documents": professional_documents,
            "personal_documents": personal_documents,
            "specialty_id": user_with_relations.specialty_id,
            "specialty_name": specialty_name,
            "specialty_license": None,
            "university": user_with_relations.university,
            "graduation_year": user_with_relations.graduation_year,
            "subspecialty": None,
            "digital_signature": None,
            "professional_seal": None,
            "emergency_contact_name": user_with_relations.emergency_contact_name,
            "emergency_contact_phone": user_with_relations.emergency_contact_phone,
            "emergency_contact_relationship": user_with_relations.emergency_contact_relationship,
            "is_active": user_with_relations.is_active,
            "created_at": user_with_relations.created_at,
            "updated_at": user_with_relations.updated_at,
            "avatar_type": user_with_relations.avatar_type or "initials",
            "avatar_template_key": user_with_relations.avatar_template_key,
            "avatar_file_path": user_with_relations.avatar_file_path,
            "avatar_url": avatar_payload.get("avatar_url"),
            "avatar": avatar_payload
        }

    @staticmethod
    def create_doctor(db: Session, doctor_data: schemas.DoctorCreate):
        """Create new doctor."""
        try:
            documents_payload = getattr(doctor_data, 'documents', []) or []
            formatted_documents = format_documents_for_validation(documents_payload)
            is_valid_curp, curp_error = validate_curp_conditional(formatted_documents)
            if not is_valid_curp:
                raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=curp_error)
            is_valid_license, license_error = validate_professional_license_conditional(formatted_documents)
            if not is_valid_license:
                raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=license_error)
            return crud.create_doctor_safe(db, doctor_data)
        except Exception as e:
            raise HTTPException(status_code=400, detail=str(e))

    @classmethod
    def update_doctor_profile(
        cls, 
        db: Session, 
        doctor_id: int, 
        raw_json: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Update doctor profile handling complex document logic."""
        api_logger.info(f"🔄 Updating doctor profile for user {doctor_id}")
        
        # Extract documents from raw JSON
        raw_professional_docs = raw_json.get('professional_documents', [])
        raw_personal_docs = raw_json.get('personal_documents', [])
        
        # Parse Pydantic model
        doctor_data_dict = raw_json.copy()
        doctor_data_dict.pop('professional_documents', None)
        doctor_data_dict.pop('personal_documents', None)
        
        try:
            doctor_data = schemas.DoctorUpdate(**doctor_data_dict)
        except Exception as e:
            api_logger.error(f"❌ Error parsing DoctorUpdate schema: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Invalid data format: {str(e)}"
            )
        
        # Consolidate documents
        all_docs = []
        
        # 1. Legacy documents
        if hasattr(doctor_data, 'documents') and doctor_data.documents:
            all_docs.extend(doctor_data.documents)
        
        # 2. Professional documents (Raw JSON priority)
        if raw_professional_docs:
            if isinstance(raw_professional_docs, list):
                doc = raw_professional_docs[0] # Take first
                if isinstance(doc, dict) and doc.get('document_id'):
                    all_docs.append(schemas.PersonDocumentCreate(
                        document_id=doc['document_id'],
                        document_value=doc.get('document_value', '') or ''
                    ))
            elif isinstance(raw_professional_docs, dict) and raw_professional_docs.get('document_id'):
                all_docs.append(schemas.PersonDocumentCreate(
                    document_id=raw_professional_docs['document_id'],
                    document_value=raw_professional_docs.get('document_value', '') or ''
                ))
        elif doctor_data.professional_documents:
             all_docs.extend(doctor_data.professional_documents)

        # 3. Personal documents (Raw JSON priority)
        if raw_personal_docs:
            if isinstance(raw_personal_docs, list):
                doc = raw_personal_docs[0] # Take first
                if isinstance(doc, dict) and doc.get('document_id'):
                    all_docs.append(schemas.PersonDocumentCreate(
                        document_id=doc['document_id'],
                        document_value=doc.get('document_value', '') or ''
                    ))
            elif isinstance(raw_personal_docs, dict) and raw_personal_docs.get('document_id'):
                all_docs.append(schemas.PersonDocumentCreate(
                    document_id=raw_personal_docs['document_id'],
                    document_value=raw_personal_docs.get('document_value', '') or ''
                ))
        elif doctor_data.personal_documents:
             if isinstance(doctor_data.personal_documents, list) and len(doctor_data.personal_documents) > 0:
                 all_docs.append(doctor_data.personal_documents[0])
             else:
                 all_docs.extend(doctor_data.personal_documents)
        
        # Filter valid docs
        valid_docs = [doc for doc in all_docs if doc and ((hasattr(doc, 'document_id') and doc.document_id) or (isinstance(doc, dict) and doc.get('document_id')))]
        
        # Validate documents
        if valid_docs:
            formatted_docs = format_documents_for_validation(valid_docs)
            is_valid_curp, curp_error = validate_curp_conditional(formatted_docs)
            if not is_valid_curp:
                raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=curp_error)
            is_valid_license, license_error = validate_professional_license_conditional(formatted_docs)
            if not is_valid_license:
                raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=license_error)

        # Handle specialty
        doctor_data_dict = doctor_data.dict(exclude_unset=True)
        if 'specialty' in raw_json and raw_json.get('specialty'):
             specialty_name = raw_json['specialty']
             specialty_obj = db.query(Specialty).filter(Specialty.name == specialty_name, Specialty.is_active == True).first()
             if specialty_obj:
                 doctor_data.specialty_id = specialty_obj.id
        
        # Update profile
        try:
            updated_doctor = crud.update_doctor_profile(db, doctor_id, doctor_data)
            if not updated_doctor:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Doctor profile not found")
        except Exception as e:
            db.rollback()
            raise HTTPException(status_code=500, detail=f"Error updating profile: {str(e)}")
            
        # Save documents
        if valid_docs:
            try:
                professional_type = db.query(DocumentType).filter(DocumentType.name == 'Profesional').first()
                personal_type = db.query(DocumentType).filter(DocumentType.name == 'Personal').first()
                
                # Separate docs
                professional_docs = []
                personal_docs = []
                
                for doc in valid_docs:
                    doc_id = doc.document_id if hasattr(doc, 'document_id') else doc.get('document_id')
                    if doc_id:
                        document_obj = db.query(Document).filter(Document.id == doc_id).first()
                        if document_obj:
                            if professional_type and document_obj.document_type_id == professional_type.id:
                                professional_docs.append(doc)
                            elif personal_type and document_obj.document_type_id == personal_type.id:
                                personal_docs.append(doc)
                
                # Process docs (max 1 per type)
                docs_to_process = []
                if professional_docs: docs_to_process.append(professional_docs[0])
                if personal_docs:
                    docs_to_process.append(personal_docs[0])
                    # Deactivate old personal docs
                    if personal_type:
                        existing_personal = db.query(PersonDocument).join(Document).filter(
                            PersonDocument.person_id == doctor_id,
                            Document.document_type_id == personal_type.id,
                            PersonDocument.is_active == True
                        ).all()
                        for existing_doc in existing_personal:
                             doc_id_to_save = personal_docs[0].document_id if hasattr(personal_docs[0], 'document_id') else personal_docs[0].get('document_id')
                             if existing_doc.document_id != doc_id_to_save:
                                 existing_doc.is_active = False
                
                # Upsert
                for doc in docs_to_process:
                    doc_id = doc.document_id if hasattr(doc, 'document_id') else doc.get('document_id')
                    doc_value = doc.document_value if hasattr(doc, 'document_value') else doc.get('document_value')
                    if doc_id:
                        crud.upsert_person_document(
                            db=db,
                            person_id=doctor_id,
                            document_id=doc_id,
                            document_value=str(doc_value) if doc_value else '',
                            check_uniqueness=True
                        )
                db.commit()
            except Exception as e:
                db.rollback()
                raise HTTPException(status_code=500, detail=f"Error saving documents: {str(e)}")
        
        # Return updated profile
        return cls.get_doctor_profile(db, doctor_id)
