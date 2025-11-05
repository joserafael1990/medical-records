"""
Doctor profile management endpoints
Migrated from main_clean_english.py to improve code organization
"""

from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session, joinedload

from database import get_db, Person, Specialty, DocumentType, Document, PersonDocument, State, Country
from dependencies import get_current_user
from logger import get_logger
import crud
import schemas

api_logger = get_logger("api")

router = APIRouter(prefix="/api", tags=["doctors"])


@router.get("/doctors/me/profile")
async def get_my_profile(
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user)
):
    """Get complete profile of current authenticated doctor"""
    if current_user.person_type != 'doctor':
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only doctors can access this endpoint"
        )
    
    # Load the user with relationships to get state and country names
    print(f"🔍 [AUTH/ME] Loading user with ID: {current_user.id}")
    user_with_relations = db.query(Person).options(
        joinedload(Person.offices)
    ).filter(Person.id == current_user.id).first()
    
    if user_with_relations:
        print(f"🔍 [AUTH/ME] User found: {user_with_relations.full_name}")
        print(f"🔍 [AUTH/ME] Offices count: {len(user_with_relations.offices) if user_with_relations.offices else 0}")
        if user_with_relations.offices:
            for office in user_with_relations.offices:
                print(f"🔍 [AUTH/ME] Office: {office.name}, State ID: {office.state_id}, Country ID: {office.country_id}")
    else:
        print(f"🔍 [AUTH/ME] User not found for ID: {current_user.id}")
    
    if not user_with_relations:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Doctor profile not found"
        )
    
    # Get specialty name from medical_specialties table
    specialty_name = None
    if user_with_relations.specialty_id:
        specialty = db.query(Specialty).filter(Specialty.id == user_with_relations.specialty_id).first()
        specialty_name = specialty.name if specialty else None
    
    # Get professional documents from person_documents table
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
        # Get professional_license from documents for backward compatibility
        for doc in professional_documents:
            if doc["document_name"] in ["Cédula Profesional", "Número de Colegiación", "Matrícula Nacional"]:
                professional_license = doc["document_value"]
                break
    
    # Get personal documents (for CURP, RFC)
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
    
    return {
        "id": user_with_relations.id,
        "person_code": user_with_relations.person_code,
        "person_type": user_with_relations.person_type,
        "title": user_with_relations.title,
        "first_name": user_with_relations.first_name,
        "paternal_surname": user_with_relations.paternal_surname,
        "maternal_surname": user_with_relations.maternal_surname,
        "full_name": user_with_relations.full_name,
        "email": user_with_relations.email,
        "primary_phone": user_with_relations.primary_phone,
        "birth_date": user_with_relations.birth_date,
        "gender": user_with_relations.gender,
        "civil_status": user_with_relations.civil_status,
        "curp": curp,  # From person_documents
        "rfc": rfc,  # From person_documents
        "birth_city": user_with_relations.birth_city,
        "birth_state_id": user_with_relations.birth_state_id,
        
        # Personal Address
        "home_address": user_with_relations.home_address,
        "address_city": user_with_relations.address_city,
        "address_state_id": user_with_relations.address_state_id,
        "address_state_name": user_with_relations.address_state.name if user_with_relations.address_state else None,
        "address_country_name": user_with_relations.address_state.country.name if user_with_relations.address_state and user_with_relations.address_state.country else None,
        "address_postal_code": user_with_relations.address_postal_code,
        
        # Professional Address (Office) - Now using offices table
        "offices": offices_with_details,
        "office_phone": None,  # Moved to offices table
        "office_timezone": None,  # Moved to offices table
        "appointment_duration": user_with_relations.appointment_duration,
        
        # Professional Data
        "professional_license": professional_license,  # From person_documents
        "professional_documents": professional_documents,  # New normalized format
        "personal_documents": personal_documents,  # New normalized format
        "specialty_id": user_with_relations.specialty_id,
        "specialty_name": specialty_name,
        "specialty_license": None,  # Removed from persons table
        "university": user_with_relations.university,
        "graduation_year": user_with_relations.graduation_year,
        "subspecialty": None,  # Removed from persons table
        "digital_signature": None,  # Removed from persons table
        "professional_seal": None,  # Removed from persons table
        
        # Emergency Contact
        "emergency_contact_name": user_with_relations.emergency_contact_name,
        "emergency_contact_phone": user_with_relations.emergency_contact_phone,
        "emergency_contact_relationship": user_with_relations.emergency_contact_relationship,
        
        # System
        "is_active": user_with_relations.is_active,
        "created_at": user_with_relations.created_at,
        "updated_at": user_with_relations.updated_at
    }


@router.post("/doctors")
async def create_doctor(
    doctor_data: schemas.DoctorCreate,
    db: Session = Depends(get_db)
):
    """Create new doctor"""
    try:
        return crud.create_doctor_safe(db, doctor_data)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/doctors/me/profile")
async def update_my_profile(
    request: Request,
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user)
):
    """Update current authenticated doctor's profile"""
    if current_user.person_type != 'doctor':
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only doctors can access this endpoint"
        )
    
    try:
        import traceback
        api_logger.info(f"🔄 Updating doctor profile for user {current_user.id}")
        
        # Read raw request JSON directly (without Pydantic validation first)
        raw_json = await request.json()
        api_logger.info(f"📋 Raw request JSON keys: {list(raw_json.keys()) if raw_json else []}")
        api_logger.info(f"📋 Raw professional_documents: {raw_json.get('professional_documents')}")
        api_logger.info(f"📋 Raw personal_documents: {raw_json.get('personal_documents')}")
        
        # Extract documents from raw JSON FIRST
        raw_professional_docs = raw_json.get('professional_documents', [])
        raw_personal_docs = raw_json.get('personal_documents', [])
        
        # Now parse with Pydantic (remove documents from dict to avoid validation issues)
        doctor_data_dict = raw_json.copy()
        doctor_data_dict.pop('professional_documents', None)
        doctor_data_dict.pop('personal_documents', None)
        
        try:
            api_logger.info(f"📞 Creating DoctorUpdate with primary_phone: {doctor_data_dict.get('primary_phone')}")
            doctor_data = schemas.DoctorUpdate(**doctor_data_dict)
            api_logger.info(f"📞 DoctorUpdate created - primary_phone attribute: {getattr(doctor_data, 'primary_phone', 'NOT_SET')}, has_attr: {hasattr(doctor_data, 'primary_phone')}")
        except Exception as e:
            api_logger.error(f"❌ Error parsing DoctorUpdate schema: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Invalid data format: {str(e)}"
            )
        
        # Handle documents if provided
        documents_to_save = []
        
        # Get dict WITHOUT exclude_unset to see all fields including None/empty arrays
        doctor_data_dict_full = doctor_data.dict() if hasattr(doctor_data, 'dict') else {}
        doctor_data_dict = doctor_data.dict(exclude_unset=True) if hasattr(doctor_data, 'dict') else {}
        
        api_logger.info(f"📋 Received doctor_data_dict keys: {list(doctor_data_dict.keys())}")
        api_logger.info(f"📋 Full doctor_data_dict_full keys: {list(doctor_data_dict_full.keys())}")
        api_logger.info(f"📋 professional_documents in full: {'professional_documents' in doctor_data_dict_full}")
        api_logger.info(f"📋 personal_documents in full: {'personal_documents' in doctor_data_dict_full}")
        if 'professional_documents' in doctor_data_dict_full:
            api_logger.info(f"📋 professional_documents value: {doctor_data_dict_full['professional_documents']}")
        if 'personal_documents' in doctor_data_dict_full:
            api_logger.info(f"📋 personal_documents value: {doctor_data_dict_full['personal_documents']}")
        
        # Check for documents in multiple formats
        all_docs = []
        
        # 1. Check for documents (legacy format)
        if hasattr(doctor_data, 'documents') and doctor_data.documents:
            all_docs.extend(doctor_data.documents)
            api_logger.info(f"📋 Found {len(doctor_data.documents)} documents in doctor_data.documents")
        
        # 2. Check for professional_documents (from raw JSON FIRST, then schema or dict) - PRIORIDAD: raw JSON
        # SOLO PERMITIR UN DOCUMENTO PROFESIONAL
        if raw_professional_docs:
            api_logger.info(f"📋 Processing professional_documents from RAW JSON: {raw_professional_docs} (type: {type(raw_professional_docs)})")
            if isinstance(raw_professional_docs, list):
                # Solo tomar el primer documento profesional
                if len(raw_professional_docs) > 1:
                    api_logger.warning(f"⚠️ Multiple professional documents received, only taking the first one: {len(raw_professional_docs)}")
                doc = raw_professional_docs[0]
                if isinstance(doc, dict) and doc.get('document_id'):
                    all_docs.append(schemas.PersonDocumentCreate(
                        document_id=doc['document_id'],
                        document_value=doc.get('document_value', '') or ''
                    ))
            elif isinstance(raw_professional_docs, dict) and raw_professional_docs.get('document_id'):
                # Si viene como objeto único en lugar de lista
                all_docs.append(schemas.PersonDocumentCreate(
                    document_id=raw_professional_docs['document_id'],
                    document_value=raw_professional_docs.get('document_value', '') or ''
                ))
        elif hasattr(doctor_data, 'professional_documents') and doctor_data.professional_documents:
            api_logger.info(f"📋 Processing professional_documents from schema: {doctor_data.professional_documents}")
            all_docs.extend(doctor_data.professional_documents)
        elif 'professional_documents' in doctor_data_dict_full:
            docs = doctor_data_dict_full['professional_documents']
            api_logger.info(f"📋 Processing professional_documents from dict_full: {docs} (type: {type(docs)})")
            if docs:  # Si no es None ni lista vacía
                if isinstance(docs, list):
                    for doc in docs:
                        if isinstance(doc, dict) and doc.get('document_id'):
                            all_docs.append(schemas.PersonDocumentCreate(
                                document_id=doc['document_id'],
                                document_value=doc.get('document_value', '') or ''
                            ))
                        elif hasattr(doc, 'document_id'):
                            all_docs.append(doc)
        
        # 3. Check for personal_documents (from raw JSON FIRST, then schema or dict) - PRIORIDAD: raw JSON
        # SOLO PERMITIR UN DOCUMENTO PERSONAL
        if raw_personal_docs:
            api_logger.info(f"📋 Processing personal_documents from RAW JSON: {raw_personal_docs} (type: {type(raw_personal_docs)})")
            if isinstance(raw_personal_docs, list):
                # Solo tomar el primer documento personal
                if len(raw_personal_docs) > 1:
                    api_logger.warning(f"⚠️ Multiple personal documents received, only taking the first one: {len(raw_personal_docs)}")
                doc = raw_personal_docs[0]
                if isinstance(doc, dict) and doc.get('document_id'):
                    all_docs.append(schemas.PersonDocumentCreate(
                        document_id=doc['document_id'],
                        document_value=doc.get('document_value', '') or ''
                    ))
            elif isinstance(raw_personal_docs, dict) and raw_personal_docs.get('document_id'):
                # Si viene como objeto único en lugar de lista
                all_docs.append(schemas.PersonDocumentCreate(
                    document_id=raw_personal_docs['document_id'],
                    document_value=raw_personal_docs.get('document_value', '') or ''
                ))
        elif hasattr(doctor_data, 'personal_documents') and doctor_data.personal_documents:
            api_logger.info(f"📋 Processing personal_documents from schema: {doctor_data.personal_documents}")
            # SOLO PERMITIR UN DOCUMENTO PERSONAL - tomar solo el primero
            if isinstance(doctor_data.personal_documents, list) and len(doctor_data.personal_documents) > 0:
                if len(doctor_data.personal_documents) > 1:
                    api_logger.warning(f"⚠️ Multiple personal documents in schema, only taking the first one: {len(doctor_data.personal_documents)}")
                all_docs.append(doctor_data.personal_documents[0])
            else:
                all_docs.extend(doctor_data.personal_documents)
        elif 'personal_documents' in doctor_data_dict_full:
            docs = doctor_data_dict_full['personal_documents']
            api_logger.info(f"📋 Processing personal_documents from dict_full: {docs} (type: {type(docs)})")
            if docs:  # Si no es None ni lista vacía
                if isinstance(docs, list):
                    # SOLO PERMITIR UN DOCUMENTO PERSONAL - tomar solo el primero
                    if len(docs) > 1:
                        api_logger.warning(f"⚠️ Multiple personal documents in dict_full, only taking the first one: {len(docs)}")
                    doc = docs[0]
                    if isinstance(doc, dict) and doc.get('document_id'):
                        all_docs.append(schemas.PersonDocumentCreate(
                            document_id=doc['document_id'],
                            document_value=doc.get('document_value', '') or ''
                        ))
                    elif hasattr(doc, 'document_id'):
                        all_docs.append(doc)
        
        # Filter valid documents - solo necesita document_id (el valor puede estar vacío)
        valid_docs = [doc for doc in all_docs if doc and ((hasattr(doc, 'document_id') and doc.document_id) or (isinstance(doc, dict) and doc.get('document_id')))]
        
        if valid_docs:
            documents_to_save = valid_docs
            api_logger.info(f"📋 Total {len(documents_to_save)} valid documents to save")
        else:
            api_logger.info(f"⚠️ No valid documents found in request")
        
        # Handle specialty conversion from name to ID if needed
        if 'specialty' in doctor_data_dict and doctor_data_dict.get('specialty'):
            # If specialty is sent as name, convert to ID
            specialty_name = doctor_data_dict['specialty']
            specialty_obj = db.query(Specialty).filter(Specialty.name == specialty_name, Specialty.is_active == True).first()
            if specialty_obj:
                # Update doctor_data to use specialty_id instead of specialty
                doctor_data.specialty_id = specialty_obj.id
                api_logger.info(f"✅ Converted specialty '{specialty_name}' to ID {specialty_obj.id}")
            else:
                api_logger.warning(f"⚠️ Specialty '{specialty_name}' not found, skipping specialty update")
        
        # Remove specialty from dict to avoid errors
        if 'specialty' in doctor_data_dict:
            del doctor_data_dict['specialty']
        
        # Update doctor profile (this will handle phone parsing)
        try:
            # Log phone data before update
            api_logger.info(f"📞 Phone data before update: primary_phone={getattr(doctor_data, 'primary_phone', None)}, has_attr={hasattr(doctor_data, 'primary_phone')}")
            updated_doctor = crud.update_doctor_profile(db, current_user.id, doctor_data)
            if not updated_doctor:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Doctor profile not found"
                )
            # Log phone after update
            api_logger.info(f"📞 Phone data after update: primary_phone={updated_doctor.primary_phone}")
        except Exception as e:
            api_logger.error(f"❌ Error updating doctor profile: {str(e)}", error_type=type(e).__name__, traceback=traceback.format_exc())
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error updating profile: {str(e)}"
            )
        
        # Save documents if provided (after profile update)
        if documents_to_save:
            api_logger.info(f"💾 Saving {len(documents_to_save)} documents for user {current_user.id}")
            try:
                # SEPARAR documentos por tipo para aplicar regla de "solo uno por tipo"
                professional_docs = []
                personal_docs = []
                
                # Obtener tipos de documentos
                professional_type = db.query(DocumentType).filter(DocumentType.name == 'Profesional').first()
                personal_type = db.query(DocumentType).filter(DocumentType.name == 'Personal').first()
                
                # Clasificar documentos
                for doc in documents_to_save:
                    doc_id = doc.document_id if hasattr(doc, 'document_id') else (doc.get('document_id') if isinstance(doc, dict) else None)
                    if doc_id:
                        document_obj = db.query(Document).filter(Document.id == doc_id).first()
                        if document_obj:
                            if professional_type and document_obj.document_type_id == professional_type.id:
                                professional_docs.append(doc)
                            elif personal_type and document_obj.document_type_id == personal_type.id:
                                personal_docs.append(doc)
                
                # SOLO PERMITIR UN DOCUMENTO DE CADA TIPO - tomar solo el primero si hay múltiples
                docs_to_process = []
                
                if professional_docs:
                    if len(professional_docs) > 1:
                        api_logger.warning(f"⚠️ Multiple professional documents to save, only taking the first one: {len(professional_docs)}")
                    docs_to_process.append(professional_docs[0])
                    # NO desactivar documentos profesionales aquí - upsert_person_document lo manejará
                    # La función upsert_person_document ahora actualiza el documento existente del mismo tipo
                
                if personal_docs:
                    if len(personal_docs) > 1:
                        api_logger.warning(f"⚠️ Multiple personal documents to save, only taking the first one: {len(personal_docs)}")
                    docs_to_process.append(personal_docs[0])
                    # Eliminar todos los documentos personales existentes de este usuario antes de guardar el nuevo
                    if personal_type:
                        existing_personal = db.query(PersonDocument).join(Document).filter(
                            PersonDocument.person_id == current_user.id,
                            Document.document_type_id == personal_type.id,
                            PersonDocument.is_active == True
                        ).all()
                        for existing_doc in existing_personal:
                            # Solo eliminar si no es el mismo document_id que vamos a guardar
                            if existing_doc.document_id != (personal_docs[0].document_id if hasattr(personal_docs[0], 'document_id') else personal_docs[0].get('document_id')):
                                existing_doc.is_active = False
                                api_logger.info(f"🗑️ Deactivating old personal document: document_id={existing_doc.document_id}")
                
                # Guardar solo los documentos seleccionados (máximo 1 de cada tipo)
                for doc in docs_to_process:
                    # Handle both Pydantic models and dicts
                    doc_id = doc.document_id if hasattr(doc, 'document_id') else (doc.get('document_id') if isinstance(doc, dict) else None)
                    doc_value = doc.document_value if hasattr(doc, 'document_value') else (doc.get('document_value') if isinstance(doc, dict) else None)
                    
                    if doc_id:
                        # Permitir valores vacíos si solo cambió el tipo de documento
                        final_value = str(doc_value) if doc_value else ''
                        api_logger.info(f"💾 Upserting document: document_id={doc_id}, document_value={final_value[:20] if len(final_value) > 20 else final_value}...")
                        crud.upsert_person_document(
                            db=db,
                            person_id=current_user.id,
                            document_id=doc_id,
                            document_value=final_value,
                            check_uniqueness=True
                        )
                db.commit()
                api_logger.info(f"✅ Successfully saved {len(docs_to_process)} documents (max 1 professional + 1 personal)")
            except Exception as e:
                api_logger.error(f"❌ Error saving documents: {str(e)}", error_type=type(e).__name__, traceback=traceback.format_exc())
                db.rollback()
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Error saving documents: {str(e)}"
                )
        else:
            api_logger.info(f"ℹ️ No documents to save")
        
        # Get specialty name for response
        specialty_name = None
        if updated_doctor.specialty_id:
            specialty = db.query(Specialty).filter(Specialty.id == updated_doctor.specialty_id).first()
            specialty_name = specialty.name if specialty else None
        
        # Get professional documents from person_documents table
        professional_type = db.query(DocumentType).filter(DocumentType.name == 'Profesional').first()
        professional_documents = []
        professional_license = None
        if professional_type:
            professional_docs = db.query(PersonDocument).join(Document).filter(
                PersonDocument.person_id == updated_doctor.id,
                PersonDocument.is_active == True,
                Document.document_type_id == professional_type.id
            ).all()
            professional_documents = [{"document_id": doc.document_id, "document_name": doc.document.name, "document_value": doc.document_value} for doc in professional_docs]
            # Get professional_license from documents for backward compatibility
            for doc in professional_documents:
                if doc["document_name"] in ["Cédula Profesional", "Número de Colegiación", "Matrícula Nacional"]:
                    professional_license = doc["document_value"]
                    break
        
        # Get personal documents (for CURP, RFC)
        personal_type = db.query(DocumentType).filter(DocumentType.name == 'Personal').first()
        personal_documents = {}
        curp = None
        rfc = None
        if personal_type:
            personal_docs = db.query(PersonDocument).join(Document).filter(
                PersonDocument.person_id == updated_doctor.id,
                PersonDocument.is_active == True,
                Document.document_type_id == personal_type.id
            ).all()
            personal_documents = {doc.document.name: doc.document_value for doc in personal_docs}
            curp = personal_documents.get("CURP", None)
            rfc = personal_documents.get("RFC", None)
        
        return {
            "id": updated_doctor.id,
            "person_code": updated_doctor.person_code,
            "person_type": updated_doctor.person_type,
            "title": updated_doctor.title,
            "first_name": updated_doctor.first_name,
            "paternal_surname": updated_doctor.paternal_surname,
            "maternal_surname": updated_doctor.maternal_surname,
            "full_name": updated_doctor.full_name,
            "email": updated_doctor.email,
            "primary_phone": updated_doctor.primary_phone,
            "birth_date": updated_doctor.birth_date,
            "gender": updated_doctor.gender,
            "civil_status": updated_doctor.civil_status,
            "curp": curp,  # From person_documents
            "rfc": rfc,  # From person_documents
            "birth_city": updated_doctor.birth_city,
            "birth_state_id": updated_doctor.birth_state_id,
            
            # Personal Address
            "home_address": updated_doctor.home_address,
            "address_city": updated_doctor.address_city,
            "address_state_id": updated_doctor.address_state_id,
            "address_state_name": updated_doctor.address_state.name if updated_doctor.address_state else None,
            "address_country_name": updated_doctor.address_state.country.name if updated_doctor.address_state and updated_doctor.address_state.country else None,
            "address_postal_code": updated_doctor.address_postal_code,
            
            # Professional Address (Office) - Moved to offices table
            "office_address": None,
            "office_city": None,
            "office_state_id": None,
            "office_state_name": None,
            "office_country_name": None,
            "office_postal_code": None,
            "office_phone": None,
            "appointment_duration": updated_doctor.appointment_duration,
            
            # Professional Data
            "professional_license": professional_license,  # From person_documents
            "professional_documents": professional_documents,  # New normalized format
            "personal_documents": personal_documents,  # New normalized format
            "specialty_id": updated_doctor.specialty_id,
            "specialty_name": specialty_name,
            "specialty_license": None,  # Removed from persons table
            "university": updated_doctor.university,
            "graduation_year": updated_doctor.graduation_year,
            "subspecialty": None,  # Removed from persons table
            "digital_signature": None,  # Removed from persons table
            "professional_seal": None,  # Removed from persons table
            
            # Emergency Contact
            "emergency_contact_name": updated_doctor.emergency_contact_name,
            "emergency_contact_phone": updated_doctor.emergency_contact_phone,
            "emergency_contact_relationship": updated_doctor.emergency_contact_relationship,
            
            # System
            "is_active": updated_doctor.is_active,
            "created_at": updated_doctor.created_at,
            "updated_at": updated_doctor.updated_at
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating profile: {str(e)}")

