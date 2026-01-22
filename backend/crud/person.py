from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_
from typing import List, Optional
from datetime import date
from fastapi import HTTPException

from models import Person, PersonDocument, Document, State, utc_now
from crud.base import hash_password, verify_password, build_phone
from crud.document import upsert_person_document
import schemas
from logger import get_logger

api_logger = get_logger("medical_records.api")

# ============================================================================
# PERSON OPERATIONS
# ============================================================================

def generate_person_code(db: Session, person_type: str) -> str:
    """Generate unique person code"""
    prefix = {
        'doctor': 'DOC',
        'patient': 'PAT', 
        'admin': 'ADM'
    }.get(person_type, 'PER')
    
    # Get all existing codes for this type and find the highest number
    existing_codes = db.query(Person.person_code).filter(
        Person.person_code.like(f'{prefix}%')
    ).all()
    
    max_num = 0
    for (code,) in existing_codes:
        try:
            # Extract number part after the prefix
            num_part = code[3:]  # Remove 3-char prefix (DOC, PAT, ADM)
            num = int(num_part)
            max_num = max(max_num, num)
        except (ValueError, IndexError):
            continue
    
    new_num = max_num + 1
    new_code = f"{prefix}{new_num:06d}"
    
    # Double-check the code doesn't exist (safety check)
    existing = db.query(Person).filter(Person.person_code == new_code).first()
    if existing:
        # If somehow it still exists, try incrementing until we find a free one
        while existing:
            new_num += 1
            new_code = f"{prefix}{new_num:06d}"
            existing = db.query(Person).filter(Person.person_code == new_code).first()
    
    return new_code

def create_person(db: Session, person_data: schemas.PersonBase, person_type: str = None) -> Person:
    """Create a new person (generic)"""
    # Generate person code
    final_type = person_type or person_data.person_type
    person_code = generate_person_code(db, final_type)
    
    # Create person object
    db_person = Person(
        person_code=person_code,
        person_type=final_type,
        **person_data.dict(exclude={'person_type'})
    )
    
    db.add(db_person)
    db.commit()
    db.refresh(db_person)
    return db_person

def create_doctor_safe(db: Session, doctor_data: schemas.DoctorCreate) -> Person:
    """Create a new doctor without auto-commit (for transaction control)"""
    # Generate doctor code
    person_code = generate_person_code(db, 'doctor')
    
    # Extract password and hash it, excluding fields that are not Person fields
    doctor_dict = doctor_data.dict(exclude={
        'person_type', 'password', 'schedule_data', 'username', 'online_consultation_url',
        'office_name', 'office_address', 'office_city', 'office_state_id', 'office_phone', 'office_maps_url',
        'documents'  # Documents are handled separately
    })
    hashed_password = hash_password(doctor_data.password) if doctor_data.password else None
    
    # Create doctor
    db_doctor = Person(
        person_code=person_code,
        person_type='doctor',
        hashed_password=hashed_password,
        **doctor_dict
    )
    
    db.add(db_doctor)
    # NO COMMIT - let the caller handle the transaction
    db.flush()  # This makes the object available for queries within the transaction
    
    # Process documents if provided
    if hasattr(doctor_data, 'documents') and doctor_data.documents:
        for doc in doctor_data.documents:
            upsert_person_document(
                db=db,
                person_id=db_doctor.id,
                document_id=doc.document_id,
                document_value=doc.document_value
            )
    
    db.refresh(db_doctor)
    return db_doctor

def update_doctor_profile(db: Session, doctor_id: int, doctor_data: schemas.DoctorUpdate) -> Person:
    """Update doctor profile with only provided fields"""
    # Get the doctor
    db_doctor = db.query(Person).filter(
        Person.id == doctor_id,
        Person.person_type == 'doctor'
    ).first()
    
    if not db_doctor:
        return None  # Return None if not found, let the API handle the error
    
    # Handle phone parsing if provided
    if hasattr(doctor_data, 'primary_phone_country_code') and hasattr(doctor_data, 'primary_phone_number'):
        if doctor_data.primary_phone_country_code is not None or doctor_data.primary_phone_number is not None:
            db_doctor.primary_phone = build_phone(
                doctor_data.primary_phone_country_code or '+52',
                doctor_data.primary_phone_number or ''
            )
            api_logger.debug(
                "📞 [CRUD] Set phone from country_code + number",
                extra={"doctor_id": doctor_id, "phone": db_doctor.primary_phone}
            )
    elif hasattr(doctor_data, 'primary_phone') and doctor_data.primary_phone is not None:
        # If primary_phone is provided directly, use it
        phone_value = doctor_data.primary_phone
        # Handle empty string as None (don't update if empty)
        if phone_value and phone_value.strip():
            db_doctor.primary_phone = phone_value.strip()
            api_logger.debug(
                "📞 [CRUD] Set phone from primary_phone",
                extra={"doctor_id": doctor_id, "phone": db_doctor.primary_phone}
            )
        elif phone_value == '':
            api_logger.debug(
                "📞 [CRUD] Skipping empty primary_phone value",
                extra={"doctor_id": doctor_id}
            )
    
    # Update only provided fields (excluding documents, phone fields)
    update_data = doctor_data.dict(
        exclude_unset=True,
        exclude={
            'documents',
            'primary_phone_country_code',
            'primary_phone_number',
            'primary_phone',
            'avatar_type',
            'avatar_template_key',
            'avatar_file_path'
        }
    )
    
    for field, value in update_data.items():
        # Verify the field exists in the model
        if hasattr(db_doctor, field):
            setattr(db_doctor, field, value)
    
    # Process documents if provided
    if hasattr(doctor_data, 'documents') and doctor_data.documents:
        for doc in doctor_data.documents:
            upsert_person_document(
                db=db,
                person_id=doctor_id,
                document_id=doc.document_id,
                document_value=doc.document_value
            )
    
    try:
        db.commit()
        db.refresh(db_doctor)
        return db_doctor
    except Exception as e:
        db.rollback()
        raise e

def create_patient_with_code(db: Session, patient_data: schemas.PatientCreate, person_code: str, created_by_doctor_id: int = None) -> Person:
    """Create a new patient with a pre-generated code"""
    # Prepare patient data with proper null handling for foreign keys
    patient_dict = patient_data.dict(exclude={'person_type', 'documents'})  # Documents handled separately
    
    # Handle foreign key fields and date fields - convert empty strings to None
    nullable_fields = [
        'emergency_contact_relationship',
        'birth_state_id',
        'birth_country_id',
        'address_state_id',
        'address_country_id',
        'birth_date'  # Date field that should be None if empty
    ]
    
    for field in nullable_fields:
        if field in patient_dict and (patient_dict[field] == '' or patient_dict[field] is None):
            patient_dict[field] = None
    
    # Create patient with the provided code and assign the creating doctor
    db_patient = Person(
        person_code=person_code,
        person_type='patient',
        created_by=created_by_doctor_id,  # Assign the doctor who creates the patient
        **patient_dict
    )
    
    db.add(db_patient)
    db.flush()  # Flush to get the ID but don't commit yet
    
    # Process documents if provided - validate uniqueness before saving
    if hasattr(patient_data, 'documents') and patient_data.documents:
        # Check for duplicate document values (same document_id only)
        for doc in patient_data.documents:
            if doc.document_id and doc.document_value:
                existing_doc = db.query(PersonDocument).filter(
                    PersonDocument.document_id == doc.document_id,
                    PersonDocument.document_value == doc.document_value,
                    PersonDocument.is_active == True
                ).first()
                if existing_doc:
                    document = db.query(Document).filter(Document.id == doc.document_id).first()
                    raise HTTPException(
                        status_code=400,
                        detail=f"El documento {document.name if document else 'desconocido'} con valor '{doc.document_value}' ya está registrado. Cada tipo de documento debe tener un valor único."
                    )
            
            upsert_person_document(
                db=db,
                person_id=db_patient.id,
                document_id=doc.document_id,
                document_value=doc.document_value,
                check_uniqueness=False  # Ya validamos arriba
            )
    
    db.refresh(db_patient)
    return db_patient

def create_patient(db: Session, patient_data: schemas.PatientCreate) -> Person:
    """Create a new patient (legacy function for backward compatibility)"""
    # Generate patient code
    person_code = generate_person_code(db, 'patient')
    return create_patient_with_code(db, patient_data, person_code)

def get_person(db: Session, person_id: int) -> Optional[Person]:
    """Get person by ID"""
    return db.query(Person).filter(Person.id == person_id).first()

def get_person_by_code(db: Session, person_code: str) -> Optional[Person]:
    """Get person by person code"""
    return db.query(Person).filter(Person.person_code == person_code).first()

def get_person_by_curp(db: Session, curp: str) -> Optional[Person]:
    """Get person by CURP - searches in person_documents table"""
    # Find document ID for CURP (document_type_id = 1 is Personal, name = 'CURP')
    curp_document = db.query(Document).filter(
        Document.name == 'CURP',
        Document.document_type_id == 1
    ).first()
    
    if not curp_document:
        return None
    
    # Find person with this CURP value
    person_doc = db.query(PersonDocument).filter(
        PersonDocument.document_id == curp_document.id,
        PersonDocument.document_value == curp.upper()
    ).first()
    
    if person_doc:
        return db.query(Person).filter(Person.id == person_doc.person_id).first()
    return None

def get_person_by_email(db: Session, email: str) -> Optional[Person]:
    """Get person by email"""
    return db.query(Person).filter(Person.email == email).first()

def get_persons(db: Session, skip: int = 0, limit: int = 100, person_type: Optional[str] = None) -> List[Person]:
    """Get list of persons"""
    query = db.query(Person).options(
        joinedload(Person.specialty),
        joinedload(Person.birth_state)
    )
    
    if person_type:
        query = query.filter(Person.person_type == person_type)
    
    return query.offset(skip).limit(limit).all()

def get_doctors(db: Session, skip: int = 0, limit: int = 100) -> List[Person]:
    """Get list of doctors"""
    return db.query(Person).options(
        joinedload(Person.specialty),
        joinedload(Person.birth_country)
    ).filter(Person.person_type == 'doctor').offset(skip).limit(limit).all()

def get_patients(db: Session, skip: int = 0, limit: int = 100) -> List[Person]:
    """Get list of all patients (admin function - use get_patients_by_doctor for doctor access)"""
    return db.query(Person).options(
        joinedload(Person.birth_state),
        joinedload(Person.specialty)
    ).filter(Person.person_type == 'patient').offset(skip).limit(limit).all()

def get_patients_by_doctor(db: Session, doctor_id: int, skip: int = 0, limit: int = 100) -> List[Person]:
    """Get list of patients created by a specific doctor"""
    return db.query(Person).options(
        joinedload(Person.birth_state),
        joinedload(Person.address_state).joinedload(State.country),
        joinedload(Person.specialty)
    ).filter(
        Person.person_type == 'patient',
        Person.created_by == doctor_id
    ).offset(skip).limit(limit).all()

def update_person(db: Session, person_id: int, person_data: schemas.PersonUpdate) -> Person:
    """Update person"""
    person = db.query(Person).filter(Person.id == person_id).first()
    if not person:
        raise HTTPException(status_code=404, detail="Person not found")
    
    # Update fields
    update_data = person_data.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(person, field, value)
    
    person.updated_at = utc_now()
    db.commit()
    db.refresh(person)
    return person

def delete_person(db: Session, person_id: int) -> bool:
    """Delete person (soft delete)"""
    person = db.query(Person).filter(Person.id == person_id).first()
    if not person:
        return False
    
    person.is_active = False
    person.updated_at = utc_now()
    db.commit()
    return True

def search_persons(db: Session, search_term: str, person_type: Optional[str] = None) -> List[Person]:
    """Search persons by name, code, documents, or email"""
    query = db.query(Person).options(
        joinedload(Person.specialty)
    )
    
    # Search conditions
    search_conditions = [
        Person.name.ilike(f'%{search_term}%'),
        Person.person_code.ilike(f'%{search_term}%'),
        Person.email.ilike(f'%{search_term}%')
    ]
    
    # Also search in person_documents
    person_ids_from_documents = db.query(PersonDocument.person_id).join(Document).filter(
        PersonDocument.document_value.ilike(f'%{search_term}%')
    ).distinct().subquery()
    
    query = query.filter(
        or_(
            *search_conditions,
            Person.id.in_(db.query(person_ids_from_documents.c.person_id))
        )
    )
    
    if person_type:
        query = query.filter(Person.person_type == person_type)
    
    return query.limit(50).all()

# ============================================================================
# AUTHENTICATION OPERATIONS
# ============================================================================

def authenticate_user(db: Session, username: str, password: str) -> Optional[Person]:
    """Authenticate user"""
    person = db.query(Person).filter(
        Person.username == username,
        Person.is_active == True
    ).first()
    
    if person and person.hashed_password and verify_password(password, person.hashed_password):
        # Update last login
        person.last_login = utc_now()
        db.commit()
        return person
    
    return None

def create_user(db: Session, user_data: schemas.UserCreate) -> Person:
    """Create new user with authentication"""
    # Check if username already exists
    existing_user = db.query(Person).filter(Person.username == user_data.username).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Username already exists")
    
    # Hash password
    hashed_password = hash_password(user_data.password)
    
    # Generate person code
    person_code = generate_person_code(db, user_data.person_type)
    
    # Create person with auth data
    db_person = Person(
        person_code=person_code,
        person_type=user_data.person_type,
        username=user_data.username,
        email=user_data.email,
        hashed_password=hashed_password,
        name=user_data.name,
        title=getattr(user_data, 'title', None),
        birth_date=date.today(),  # Default, should be updated
        gender="No especificado"  # Default, should be updated
    )
    
    db.add(db_person)
    db.commit()
    db.refresh(db_person)
    return db_person

def change_password(db: Session, person_id: int, old_password: str, new_password: str) -> bool:
    """Change user password"""
    person = db.query(Person).filter(Person.id == person_id).first()
    if not person or not person.hashed_password:
        return False
    
    if not verify_password(old_password, person.hashed_password):
        return False
    
    person.hashed_password = hash_password(new_password)
    person.updated_at = utc_now()
    db.commit()
    return True
