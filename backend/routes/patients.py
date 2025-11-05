"""
Patient management endpoints
Migrated from main_clean_english.py to improve code organization
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional

from database import get_db, Person, PersonDocument, Document
from dependencies import get_current_user
from logger import get_logger
import crud
import schemas
from datetime import datetime

api_logger = get_logger("api")
security_logger = get_logger("security")

router = APIRouter(prefix="/api", tags=["patients"])


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
                'first_name': patient.first_name,
                'paternal_surname': patient.paternal_surname,
                'maternal_surname': patient.maternal_surname,
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
                    print(f"⚠️ Could not decrypt email for patient {patient.id}: {str(e)}")
                    patient_data['email'] = patient.email
            
            if getattr(patient, 'primary_phone', None):
                try:
                    print(f"🔓 Attempting to decrypt phone for patient {patient.id}: {patient.primary_phone[:40]}...")
                    decrypted_phone = patient.primary_phone
                    patient_data['primary_phone'] = decrypted_phone
                    print(f"✅ Successfully decrypted phone for patient {patient.id}: {decrypted_phone}")
                except Exception as e:
                    print(f"⚠️ Could not decrypt phone for patient {patient.id}: {str(e)}")
                    patient_data['primary_phone'] = patient.primary_phone
            
            if getattr(patient, 'emergency_contact_phone', None):
                try:
                    patient_data['emergency_contact_phone'] = patient.emergency_contact_phone
                except Exception as e:
                    print(f"⚠️ Could not decrypt emergency phone for patient {patient.id}: {str(e)}")
                    patient_data['emergency_contact_phone'] = patient.emergency_contact_phone
            
            # RFC is now in person_documents table, not in Person model
            # Skip direct access to patient.rfc as it no longer exists
            
            if getattr(patient, 'insurance_policy_number', None):
                try:
                    patient_data['insurance_policy_number'] = patient.insurance_policy_number
                except Exception as e:
                    print(f"⚠️ Could not decrypt insurance for patient {patient.id}: {str(e)}")
                    patient_data['insurance_policy_number'] = patient.insurance_policy_number
            
            decrypted_patients.append(patient_data)
        
        api_logger.info("Patient list retrieved and decrypted", doctor_id=current_user.id, count=len(decrypted_patients))
        return decrypted_patients
        
    except Exception as e:
        print(f"❌ Error in get_patients: {str(e)}")
        import traceback
        traceback.print_exc()
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
        for pd in person_docs:
            doc_name = pd.document.name if pd.document else None
            if pd.document and pd.document.document_type_id == 1:  # Personal
                personal_documents_dict[doc_name] = pd.document_value
            elif pd.document and pd.document.document_type_id == 2:  # Profesional
                professional_documents_dict[doc_name] = pd.document_value
        
        decrypted_curp = personal_documents_dict.get('CURP', None)
        decrypted_rfc = personal_documents_dict.get('RFC', None)
        decrypted_email = None
        decrypted_phone = None
        decrypted_insurance = None
        
        if patient.email:
            try:
                decrypted_email = patient.email
                print(f"🔓 Decrypted email: {patient.email[:40]}... -> {decrypted_email}")
            except Exception as e:
                print(f"⚠️ Could not decrypt email (might be unencrypted): {str(e)}")
                decrypted_email = patient.email
        
        if patient.primary_phone:
            try:
                decrypted_phone = patient.primary_phone
                print(f"🔓 Decrypted phone: {patient.primary_phone[:40]}... -> {decrypted_phone}")
            except Exception as e:
                print(f"⚠️ Could not decrypt phone (might be unencrypted): {str(e)}")
                decrypted_phone = patient.primary_phone
        
        if patient.insurance_number:
            try:
                decrypted_insurance = patient.insurance_number
                print(f"🔓 Decrypted insurance: {patient.insurance_number[:40]}... -> {decrypted_insurance}")
            except Exception as e:
                print(f"⚠️ Could not decrypt insurance (might be unencrypted): {str(e)}")
                decrypted_insurance = patient.insurance_number
        
        # Return patient data with decrypted sensitive fields
        patient_response = {
            'id': patient.id,
            'person_code': patient.person_code,
            'personal_documents': [{'document_name': name, 'document_value': value} for name, value in personal_documents_dict.items()],
            'professional_documents': [{'document_name': name, 'document_value': value} for name, value in professional_documents_dict.items()],
            'person_type': patient.person_type,
            'first_name': patient.first_name,
            'paternal_surname': patient.paternal_surname,
            'maternal_surname': patient.maternal_surname,
            'curp': decrypted_curp,
            'rfc': decrypted_rfc,  # From person_documents
            'email': decrypted_email,
            'primary_phone': decrypted_phone,
            'home_address': patient.home_address,
            'address_city': patient.address_city,
            'address_state_id': patient.address_state_id,
            'address_country_id': patient.address_country_id,
            'address_postal_code': patient.address_postal_code,
            'emergency_contact_name': patient.emergency_contact_name,
            'emergency_contact_phone': patient.emergency_contact_phone,
            'emergency_contact_relationship': patient.emergency_contact_relationship,
            'insurance_number': decrypted_insurance,
            'insurance_provider': patient.insurance_provider,
            'birth_date': patient.birth_date.isoformat() if patient.birth_date else None,
            'birth_city': patient.birth_city,
            'birth_state_id': patient.birth_state_id,
            'birth_country_id': patient.birth_country_id,
            'gender': patient.gender,
            'civil_status': patient.civil_status,
            'created_at': patient.created_at.isoformat(),
            'updated_at': patient.updated_at.isoformat() if patient.updated_at else None,
            'created_by': patient.created_by,
            'is_active': patient.is_active,
            'encrypted': True  # Flag to indicate this patient has encrypted data
        }
        
        security_logger.info("Patient data retrieved and decrypted", patient_id=patient_id, doctor_id=current_user.id)
        return patient_response
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error in get_patient: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


@router.post("/patients")
async def create_patient(
    patient_data: schemas.PatientCreate,
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user)
):
    """Create new patient with encrypted sensitive data"""
    try:
        print("=" * 80)
        print("🚨 CREATE PATIENT FUNCTION CALLED - NEW VERSION WITH ENCRYPTION")
        print("=" * 80)
        security_logger.info("Creating patient with encryption", operation="create_patient", doctor_id=current_user.id)
        
        # Check if patient already exists by documents (normalized) or email
        # Validate document uniqueness before creating patient
        if hasattr(patient_data, 'documents') and patient_data.documents:
            for doc in patient_data.documents:
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
            original_email = patient.email
            patient.email = patient.email
            print(f"🔐 Encrypted email: {original_email} -> {patient.email[:40]}...")
        
        if patient.primary_phone:
            original_phone = patient.primary_phone
            patient.primary_phone = patient.primary_phone
            print(f"🔐 Encrypted phone: {original_phone} -> {patient.primary_phone[:40]}...")
        
        if patient.insurance_number:
            original_insurance = patient.insurance_number
            patient.insurance_number = patient.insurance_number
            print(f"🔐 Encrypted insurance: {original_insurance} -> {patient.insurance_number[:40]}...")
        
        # Commit the transaction to persist the patient
        db.commit()
        db.refresh(patient)
        
        security_logger.info("Patient created successfully", patient_id=patient.id, doctor_id=current_user.id, encrypted=True)
        return patient
        
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        print("=" * 80)
        print("❌ ERROR CREATING PATIENT:")
        print(traceback.format_exc())
        print("=" * 80)
        security_logger.error(f"Error creating patient: {str(e)}", doctor_id=current_user.id, error=str(e))
        raise HTTPException(
            status_code=500, 
            detail=f"Error interno al crear paciente: {str(e)}"
        )


@router.put("/patients/{patient_id}")
async def update_patient(
    patient_id: int,
    patient_data: schemas.PersonUpdate,
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user)
):
    """Update specific patient by ID"""
    # Debug: Check emergency contact data in update request
    print(f"🔍 UPDATE Patient {patient_id} - Emergency contact data received:")
    print(f"  - Name: {patient_data.emergency_contact_name}")
    print(f"  - Phone: {patient_data.emergency_contact_phone}")
    print(f"  - Relationship: {patient_data.emergency_contact_relationship}")
    try:
        patient = db.query(Person).filter(
            Person.id == patient_id,
            Person.person_type == 'patient',
            Person.created_by == current_user.id  # Only patients created by this doctor
        ).first()
        
        if not patient:
            raise HTTPException(status_code=404, detail=f"No se encontró el paciente con ID: {patient_id} o acceso denegado")
        
        # Check for conflicts with other patients (excluding current patient)
        # Validate document uniqueness before updating patient
        if hasattr(patient_data, 'documents') and patient_data.documents:
            for doc in patient_data.documents:
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
            'city_residence_id'
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
        
        patient.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(patient)
        
        return patient
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        print(f"❌ Error in update_patient: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=500, 
            detail=f"Error interno al actualizar paciente: {str(e)}"
        )

