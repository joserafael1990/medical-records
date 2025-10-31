"""
CRUD operations with English field names
Database: PostgreSQL with numeric IDs
Performance: Optimized queries with efficient joins
"""

from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, or_, func, text, desc, asc
from typing import Optional, List, Tuple
from datetime import datetime, date, timedelta
from fastapi import HTTPException
import bcrypt
import pytz

# CDMX Timezone configuration
CDMX_TZ = pytz.timezone('America/Mexico_City')

def get_cdmx_now() -> datetime:
    """Get current datetime in CDMX timezone"""
    return datetime.now(CDMX_TZ)

def to_utc_for_storage(dt: datetime) -> datetime:
    """Convert datetime to UTC for database storage"""
    if dt.tzinfo is None:
        # Assume CDMX if naive
        dt = CDMX_TZ.localize(dt)
    return dt.astimezone(pytz.utc)

from database import (
    Person, MedicalRecord, Appointment, VitalSign, ConsultationVitalSign,
    Country, State, Specialty, EmergencyRelationship,
    DocumentType, Document, PersonDocument
)
import schemas

# ============================================================================
# GENERAL UTILITIES
# ============================================================================

def hash_password(password: str) -> str:
    """Hash a password using bcrypt"""
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    """Verify a password against its hash"""
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

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

# ============================================================================
# CATALOG OPERATIONS
# ============================================================================

def get_countries(db: Session, active: bool = True) -> List[Country]:
    """Get list of countries"""
    query = db.query(Country)
    if active:
        query = query.filter(Country.active == True)
    return query.order_by(Country.name).all()

def get_states(db: Session, country_id: Optional[int] = None, active: bool = True) -> List[State]:
    """Get list of states"""
    query = db.query(State)
    if active:
        query = query.filter(State.active == True)
    if country_id:
        query = query.filter(State.country_id == country_id)
    return query.order_by(State.name).all()



def get_specialties(db: Session, active: bool = True) -> List[Specialty]:
    """Get list of medical specialties"""
    query = db.query(Specialty)
    if active:
        query = query.filter(Specialty.active == True)
    return query.order_by(Specialty.name).all()

def get_emergency_relationships(db: Session, active: bool = True) -> List[EmergencyRelationship]:
    """Get list of emergency relationships"""
    query = db.query(EmergencyRelationship)
    if active:
        query = query.filter(EmergencyRelationship.active == True)
    return query.order_by(EmergencyRelationship.code).all()

# ============================================================================
# PERSON OPERATIONS
# ============================================================================

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

# ELIMINATED: Legacy create_doctor function - use create_doctor_safe instead

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
                document_value=doc.document_value,
                issue_date=doc.issue_date,
                expiration_date=doc.expiration_date,
                issuing_authority=doc.issuing_authority
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
    elif hasattr(doctor_data, 'primary_phone') and doctor_data.primary_phone is not None:
        # If primary_phone is provided directly, use it
        db_doctor.primary_phone = doctor_data.primary_phone
    
    # Update only provided fields (excluding documents, phone fields)
    update_data = doctor_data.dict(exclude_unset=True, exclude={'documents', 'primary_phone_country_code', 'primary_phone_number', 'primary_phone'})
    
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
                document_value=doc.document_value,
                issue_date=doc.issue_date,
                expiration_date=doc.expiration_date,
                issuing_authority=doc.issuing_authority
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
        'city_residence_id',
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
                issue_date=doc.issue_date,
                expiration_date=doc.expiration_date,
                issuing_authority=doc.issuing_authority,
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
        joinedload(Person.birth_state),
        joinedload(Person.city_residence)
    )
    
    if person_type:
        query = query.filter(Person.person_type == person_type)
    
    return query.offset(skip).limit(limit).all()

def get_doctors(db: Session, skip: int = 0, limit: int = 100) -> List[Person]:
    """Get list of doctors"""
    return db.query(Person).options(
        joinedload(Person.specialty),
        joinedload(Person.nationality)
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
    
    person.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(person)
    return person

def delete_person(db: Session, person_id: int) -> bool:
    """Delete person (soft delete)"""
    person = db.query(Person).filter(Person.id == person_id).first()
    if not person:
        return False
    
    person.is_active = False
    person.updated_at = datetime.utcnow()
    db.commit()
    return True

def search_persons(db: Session, search_term: str, person_type: Optional[str] = None) -> List[Person]:
    """Search persons by name, code, documents, or email"""
    query = db.query(Person).options(
        joinedload(Person.specialty)
    )
    
    # Search conditions (remove curp since it's now in person_documents)
    search_conditions = [
        Person.first_name.ilike(f'%{search_term}%'),
        Person.paternal_surname.ilike(f'%{search_term}%'),
        Person.maternal_surname.ilike(f'%{search_term}%'),
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
# DOCUMENT MANAGEMENT CRUD
# ============================================================================

def get_document_types(db: Session, active_only: bool = True) -> List[DocumentType]:
    """Get all document types"""
    query = db.query(DocumentType)
    if active_only:
        query = query.filter(DocumentType.is_active == True)
    return query.order_by(DocumentType.name).all()

def get_documents_by_type(db: Session, document_type_id: int, active_only: bool = True) -> List[Document]:
    """Get all documents of a specific type"""
    query = db.query(Document).filter(Document.document_type_id == document_type_id)
    if active_only:
        query = query.filter(Document.is_active == True)
    return query.order_by(Document.name).all()

def get_documents(db: Session, document_type_id: Optional[int] = None, active_only: bool = True) -> List[Document]:
    """Get all documents with optional filter by type"""
    query = db.query(Document)
    if document_type_id:
        query = query.filter(Document.document_type_id == document_type_id)
    if active_only:
        query = query.filter(Document.is_active == True)
    return query.order_by(Document.name).all()

def get_person_documents(db: Session, person_id: int, active_only: bool = True) -> List[PersonDocument]:
    """Get all documents for a person"""
    query = db.query(PersonDocument).filter(PersonDocument.person_id == person_id)
    if active_only:
        query = query.filter(PersonDocument.is_active == True)
    return query.options(joinedload(PersonDocument.document)).all()

def upsert_person_document(
    db: Session,
    person_id: int,
    document_id: int,
    document_value: str,
    issue_date: Optional[date] = None,
    expiration_date: Optional[date] = None,
    issuing_authority: Optional[str] = None,
    check_uniqueness: bool = True
) -> PersonDocument:
    """
    Create or update a person document (UPSERT)
    check_uniqueness: If True, validates that the document_value is unique for this document_id
    """
    # Check for duplicate document values (same document_id only)
    # Ejemplo: C.I="12345" y C.I.E="12345" pueden coexistir, pero no dos C.I="12345"
    if check_uniqueness:
        existing_with_same_value = db.query(PersonDocument).filter(
            PersonDocument.document_id == document_id,
            PersonDocument.document_value == document_value,
            PersonDocument.person_id != person_id,  # Excluir el mismo usuario si está actualizando
            PersonDocument.is_active == True
        ).first()
        
        if existing_with_same_value:
            document = db.query(Document).filter(Document.id == document_id).first()
            raise HTTPException(
                status_code=400,
                detail=f"El documento {document.name if document else 'desconocido'} con valor '{document_value}' ya está registrado para otra persona. Cada tipo de documento debe tener un valor único."
            )
    
    # Get document type to check if we should update existing document of same type
    document_obj = db.query(Document).filter(Document.id == document_id).first()
    if not document_obj:
        raise HTTPException(status_code=400, detail=f"Document with id {document_id} not found")
    
    document_type_id = document_obj.document_type_id
    
    # Check if this person already has a document of this TYPE (not just this specific document_id)
    # This allows updating the document_id when changing document type
    existing_same_type = db.query(PersonDocument).join(Document).filter(
        PersonDocument.person_id == person_id,
        Document.document_type_id == document_type_id,
        PersonDocument.is_active == True
    ).first()
    
    if existing_same_type:
        # Update existing document: change document_id (if different) and value
        existing_same_type.document_id = document_id
        existing_same_type.document_value = document_value
        if issue_date is not None:
            existing_same_type.issue_date = issue_date
        if expiration_date is not None:
            existing_same_type.expiration_date = expiration_date
        if issuing_authority is not None:
            existing_same_type.issuing_authority = issuing_authority
        existing_same_type.updated_at = datetime.utcnow()
        return existing_same_type
    else:
        # Check if there's an inactive document of the same type to reactivate/update
        existing_inactive = db.query(PersonDocument).join(Document).filter(
            PersonDocument.person_id == person_id,
            Document.document_type_id == document_type_id,
            PersonDocument.is_active == False
        ).order_by(PersonDocument.updated_at.desc()).first()
        
        if existing_inactive:
            # Reactivate and update the inactive document
            existing_inactive.document_id = document_id
            existing_inactive.document_value = document_value
            existing_inactive.is_active = True
            if issue_date is not None:
                existing_inactive.issue_date = issue_date
            if expiration_date is not None:
                existing_inactive.expiration_date = expiration_date
            if issuing_authority is not None:
                existing_inactive.issuing_authority = issuing_authority
            existing_inactive.updated_at = datetime.utcnow()
            return existing_inactive
        else:
            # Create new document
            new_doc = PersonDocument(
                person_id=person_id,
                document_id=document_id,
                document_value=document_value,
                issue_date=issue_date,
                expiration_date=expiration_date,
                issuing_authority=issuing_authority
            )
            db.add(new_doc)
            db.flush()
            db.refresh(new_doc)
            return new_doc

def delete_person_document(db: Session, person_id: int, document_id: int) -> bool:
    """Delete a person document"""
    person_doc = db.query(PersonDocument).filter(
        PersonDocument.person_id == person_id,
        PersonDocument.document_id == document_id
    ).first()
    
    if person_doc:
        db.delete(person_doc)
        return True
    return False

# ============================================================================
# PHONE NUMBER HELPERS
# ============================================================================

def parse_phone_with_country_code(phone: str) -> dict:
    """
    Parse a phone number to extract country code and number
    Returns: {country_code: str, number: str}
    """
    if not phone:
        return {'country_code': '+52', 'number': ''}
    
    phone = phone.strip()
    
    # Common country codes (sorted by length descending to match longest first)
    country_codes = [
        '+593', '+595', '+598', '+591', '+592', '+597', '+594', '+596',
        '+502', '+503', '+504', '+505', '+506', '+507', '+509', '+501',
        '+971', '+972', '+973', '+974', '+975', '+976', '+977', '+992',
        '+993', '+994', '+995', '+996', '+998',
        '+52', '+54', '+55', '+56', '+57', '+58',
        '+1', '+7', '+20', '+27', '+30', '+31', '+32', '+33', '+34', 
        '+36', '+39', '+40', '+41', '+43', '+44', '+45', '+46', '+47',
        '+48', '+49', '+51', '+60', '+61', '+62', '+63', '+64', '+65',
        '+66', '+81', '+82', '+84', '+86', '+90', '+91', '+92', '+93',
        '+94', '+95', '+98'
    ]
    
    # Sort by length descending to match longest codes first
    country_codes.sort(key=len, reverse=True)
    
    for code in country_codes:
        if phone.startswith(code):
            return {
                'country_code': code,
                'number': phone[len(code):].strip()
            }
    
    # Default to Mexico if no code found
    return {'country_code': '+52', 'number': phone}

def build_phone(country_code: str, number: str) -> str:
    """Build full phone number from country code and number"""
    if not number:
        return ''
    country_code = country_code.strip() if country_code else '+52'
    number = number.strip().replace(' ', '').replace('-', '')
    return f"{country_code}{number}"

# ============================================================================
# MEDICAL RECORD OPERATIONS
# ============================================================================

def create_medical_record(db: Session, record_data: schemas.MedicalRecordCreate) -> MedicalRecord:
    """Create a new medical record"""
    print(f"🔬 Creating medical record with data: {record_data.dict()}")
    print(f"🔬 Laboratory analysis field: {record_data.laboratory_analysis}")
    
    # Generate record code
    last_record = db.query(MedicalRecord).order_by(desc(MedicalRecord.id)).first()
    record_number = (last_record.id + 1) if last_record else 1
    record_code = f"MR{record_number:08d}"
    
    db_record = MedicalRecord(
        record_code=record_code,
        **record_data.dict()
    )
    
    db.add(db_record)
    db.commit()
    db.refresh(db_record)
    return db_record

def get_medical_record(db: Session, record_id: int) -> Optional[MedicalRecord]:
    """Get medical record by ID"""
    return db.query(MedicalRecord).options(
        joinedload(MedicalRecord.patient),
        joinedload(MedicalRecord.doctor)
    ).filter(MedicalRecord.id == record_id).first()

def get_medical_records_by_patient(db: Session, patient_id: int) -> List[MedicalRecord]:
    """Get medical records by patient"""
    return db.query(MedicalRecord).options(
        joinedload(MedicalRecord.doctor)
    ).filter(MedicalRecord.patient_id == patient_id).order_by(desc(MedicalRecord.consultation_date)).all()

def get_medical_records_by_doctor(db: Session, doctor_id: int) -> List[MedicalRecord]:
    """Get medical records by doctor"""
    return db.query(MedicalRecord).options(
        joinedload(MedicalRecord.patient)
    ).filter(MedicalRecord.doctor_id == doctor_id).order_by(desc(MedicalRecord.consultation_date)).all()

def update_medical_record(db: Session, record_id: int, record_data: schemas.MedicalRecordUpdate) -> MedicalRecord:
    """Update medical record"""
    record = db.query(MedicalRecord).filter(MedicalRecord.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Medical record not found")
    
    update_data = record_data.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(record, field, value)
    
    record.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(record)
    return record

# ============================================================================
# APPOINTMENT OPERATIONS
# ============================================================================

def create_appointment(db: Session, appointment_data: schemas.AppointmentCreate, doctor_id: int) -> Appointment:
    """Create a new appointment"""
    from appointment_service import AppointmentService
    
    # Generate appointment code
    last_appointment = db.query(Appointment).order_by(desc(Appointment.id)).first()
    appointment_number = (last_appointment.id + 1) if last_appointment else 1
    appointment_code = f"APT{appointment_number:08d}"
    
    # Prepare appointment data for the service
    appointment_dict = appointment_data.dict()
    appointment_dict['doctor_id'] = doctor_id
    appointment_dict['appointment_code'] = appointment_code
    
    # Remove end_time if present since AppointmentService will calculate it automatically
    if 'end_time' in appointment_dict:
        del appointment_dict['end_time']
    
    # Use AppointmentService to create the appointment with automatic end_time calculation
    return AppointmentService.create_appointment(db, appointment_dict)

def get_appointment(db: Session, appointment_id: int) -> Optional[Appointment]:
    """Get appointment by ID"""
    return db.query(Appointment).options(
        joinedload(Appointment.patient),
        joinedload(Appointment.doctor)
    ).filter(Appointment.id == appointment_id).first()

def get_appointments_by_patient(db: Session, patient_id: int) -> List[Appointment]:
    """Get appointments by patient"""
    return db.query(Appointment).options(
        joinedload(Appointment.doctor)
    ).filter(Appointment.patient_id == patient_id).order_by(desc(Appointment.appointment_date)).all()

def get_appointments_by_doctor(db: Session, doctor_id: int, date_from: Optional[date] = None, date_to: Optional[date] = None) -> List[Appointment]:
    """Get appointments by doctor"""
    query = db.query(Appointment).options(
        joinedload(Appointment.patient)
    ).filter(Appointment.doctor_id == doctor_id)
    
    if date_from:
        query = query.filter(Appointment.appointment_date >= date_from)
    if date_to:
        query = query.filter(Appointment.appointment_date <= date_to)
    
    return query.order_by(Appointment.appointment_date).all()

def update_appointment(db: Session, appointment_id: int, appointment_data) -> Appointment:
    """Update appointment with CDMX timezone support
    appointment_data puede ser schemas.AppointmentUpdate o dict.
    """
    appointment = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    
    # Permitir dict directo o modelo pydantic
    if isinstance(appointment_data, dict):
        update_data = {k: v for k, v in appointment_data.items() if v is not None}
    else:
        update_data = appointment_data.dict(exclude_unset=True)
    
    print(f"🔄 CRUD update_appointment - ID: {appointment_id}")
    print(f"📝 Original appointment_date: {appointment.appointment_date}")
    print(f"📝 Doctor's appointment_duration: {appointment.doctor.appointment_duration or 30}")
    print(f"📥 Update data received: {update_data}")
    
    # Handle datetime conversion for appointment_date with CDMX timezone
    if 'appointment_date' in update_data and isinstance(update_data['appointment_date'], str):
        update_data['appointment_date'] = datetime.fromisoformat(
            update_data['appointment_date'].replace('Z', '+00:00')
        )
        # Convert to UTC for storage
        update_data['appointment_date'] = to_utc_for_storage(update_data['appointment_date'])
        print(f"🌍 Converted appointment_date to UTC: {update_data['appointment_date']}")
    
    # Recalculate end_time if appointment_date changed (duration comes from doctor's profile)
    if 'appointment_date' in update_data:
        start_time = update_data['appointment_date']
        # Get doctor's appointment_duration from persons table
        if appointment.doctor and appointment.doctor.appointment_duration:
            duration = appointment.doctor.appointment_duration
        else:
            duration = 30  # Default fallback
        update_data['end_time'] = start_time + timedelta(minutes=duration)
        print(f"⏰ Recalculated end_time: {update_data['end_time']} (duration: {duration} min)")
    
    # Handle cancellation
    if update_data.get('status') == 'cancelled' and 'cancelled_reason' in update_data:
        update_data['cancelled_at'] = get_cdmx_now().astimezone(pytz.utc)
    
    # Handle confirmation
    if update_data.get('status') == 'confirmed':
        update_data['confirmed_at'] = get_cdmx_now().astimezone(pytz.utc)
    
    for field, value in update_data.items():
        setattr(appointment, field, value)
    
    appointment.updated_at = get_cdmx_now().astimezone(pytz.utc)
    
    print(f"💾 Final appointment_date before save: {appointment.appointment_date}")
    print(f"💾 Final end_time before save: {appointment.end_time}")
    print(f"💾 Doctor's duration: {appointment.doctor.appointment_duration or 30} minutes")
    
    db.commit()
    db.refresh(appointment)
    
    print(f"✅ Appointment updated successfully - ID: {appointment_id}")
    print(f"📅 Final appointment date: {appointment.appointment_date}")
    print(f"⏱️  Doctor's duration: {appointment.doctor.appointment_duration or 30} minutes")
    
    return appointment

def cancel_appointment(db: Session, appointment_id: int, reason: str, cancelled_by: int) -> Appointment:
    """Cancel appointment"""
    appointment = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    
    appointment.status = 'cancelled'
    appointment.cancelled_reason = reason
    appointment.cancelled_at = datetime.utcnow()
    appointment.cancelled_by = cancelled_by
    appointment.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(appointment)
    return appointment

# ============================================================================
# VITAL SIGNS OPERATIONS
# ============================================================================

# Legacy vital signs functions - replaced by new consultation vital signs system
# def create_vital_signs(db: Session, vital_signs_data: schemas.VitalSignsCreate) -> VitalSign:
# def get_vital_signs_by_patient(db: Session, patient_id: int) -> List[VitalSign]:
# def update_vital_signs(db: Session, vital_signs_id: int, vital_signs_data: schemas.VitalSignsUpdate) -> VitalSign:

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
        person.last_login = datetime.utcnow()
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
        first_name=user_data.first_name,
        paternal_surname=user_data.paternal_surname,
        maternal_surname=user_data.maternal_surname,
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
    person.updated_at = datetime.utcnow()
    db.commit()
    return True

# ============================================================================
# STATISTICS AND REPORTS
# ============================================================================

def get_dashboard_stats(db: Session) -> dict:
    """Get dashboard statistics"""
    total_patients = db.query(Person).filter(Person.person_type == 'patient').count()
    total_doctors = db.query(Person).filter(Person.person_type == 'doctor').count()
    total_appointments = db.query(Appointment).count()
    total_records = db.query(MedicalRecord).count()
    
    return {
        "total_patients": total_patients,
        "total_doctors": total_doctors,
        "total_appointments": total_appointments,
        "total_medical_records": total_records
    }
def get_paises(db: Session, activo: bool = True) -> List[Country]:
    """Obtener lista de países"""
    query = db.query(Country)
    if activo:
        query = query.filter(Country.is_active == True)
    return query.order_by(Country.name).all()

def get_estados(db: Session, pais_id: Optional[int] = None, activo: bool = True) -> List[State]:
    """Obtener lista de estados"""
    query = db.query(State)
    if pais_id:
        query = query.filter(State.country_id == pais_id)
    if activo:
        query = query.filter(State.is_active == True)
    return query.order_by(State.name).all()


# ELIMINATED: Duplicate Spanish functions - use English versions instead:
# - get_nacionalidades -> use get_nationalities  
# - get_especialidades -> use get_specialties
# - get_relaciones_emergencia -> use get_emergency_relationships

# ============================================================================
# STUDY CATALOG CRUD OPERATIONS
# ============================================================================

from database import StudyCategory, StudyCatalog, StudyNormalValue, StudyTemplate, StudyTemplateItem

def get_study_categories(db: Session, skip: int = 0, limit: int = 100) -> List[StudyCategory]:
    """Get all study categories"""
    return db.query(StudyCategory).filter(StudyCategory.active == True).offset(skip).limit(limit).all()

def get_study_category(db: Session, category_id: int) -> Optional[StudyCategory]:
    """Get study category by ID"""
    return db.query(StudyCategory).filter(StudyCategory.id == category_id).first()

def get_study_catalog(
    db: Session, 
    skip: int = 0, 
    limit: int = 100,
    category_id: Optional[int] = None,
    specialty: Optional[str] = None,
    search: Optional[str] = None
) -> List[StudyCatalog]:
    """Get studies from catalog with filters"""
    # Don't load normal_values to avoid schema issues
    query = db.query(StudyCatalog).options(
        joinedload(StudyCatalog.category)
    ).join(StudyCategory).filter(StudyCatalog.active == True)
    
    if category_id:
        query = query.filter(StudyCatalog.category_id == category_id)
    
    if specialty:
        query = query.filter(StudyCatalog.specialty.ilike(f"%{specialty}%"))
    
    if search:
        query = query.filter(
            or_(
                StudyCatalog.name.ilike(f"%{search}%"),
                StudyCatalog.code.ilike(f"%{search}%"),
                StudyCatalog.description.ilike(f"%{search}%")
            )
        )
    
    return query.offset(skip).limit(limit).all()

def get_study_by_id(db: Session, study_id: int) -> Optional[StudyCatalog]:
    """Get study by ID with normal values"""
    return db.query(StudyCatalog).options(
        joinedload(StudyCatalog.normal_values),
        joinedload(StudyCatalog.category)
    ).filter(StudyCatalog.id == study_id).first()

def get_study_by_code(db: Session, code: str) -> Optional[StudyCatalog]:
    """Get study by code"""
    return db.query(StudyCatalog).options(
        joinedload(StudyCatalog.normal_values),
        joinedload(StudyCatalog.category)
    ).filter(StudyCatalog.code == code).first()

def get_study_templates(
    db: Session, 
    skip: int = 0, 
    limit: int = 100,
    specialty: Optional[str] = None
) -> List[StudyTemplate]:
    """Get study templates with filters"""
    query = db.query(StudyTemplate)
    
    if specialty:
        query = query.filter(StudyTemplate.specialty.ilike(f"%{specialty}%"))
    
    return query.offset(skip).limit(limit).all()

def get_study_template(db: Session, template_id: int) -> Optional[StudyTemplate]:
    """Get study template by ID with items"""
    return db.query(StudyTemplate).options(
        joinedload(StudyTemplate.template_items).joinedload(StudyTemplateItem.study)
    ).filter(StudyTemplate.id == template_id).first()

def create_study_template(db: Session, template_data: schemas.StudyTemplateCreate) -> StudyTemplate:
    """Create a new study template"""
    template = StudyTemplate(
        name=template_data.name,
        description=template_data.description,
        specialty=template_data.specialty
    )
    db.add(template)
    db.flush()  # Get the ID
    
    # Add template items
    for i, study_id in enumerate(template_data.study_ids):
        template_item = StudyTemplateItem(
            template_id=template.id,
            study_id=study_id,
            order_index=i
        )
        db.add(template_item)
    
    db.commit()
    db.refresh(template)
    return template

def get_studies_by_specialty(db: Session, specialty: str) -> List[StudyCatalog]:
    """Get studies recommended for a specific specialty"""
    return db.query(StudyCatalog).filter(
        and_(
            StudyCatalog.active == True,
            StudyCatalog.specialty.ilike(f"%{specialty}%")
        )
    ).all()

def get_study_recommendations(
    db: Session, 
    diagnosis: Optional[str] = None,
    specialty: Optional[str] = None
) -> List[StudyCatalog]:
    """Get study recommendations based on diagnosis and specialty"""
    query = db.query(StudyCatalog).filter(StudyCatalog.is_active == True)
    
    if specialty:
        query = query.filter(StudyCatalog.specialty.ilike(f"%{specialty}%"))
    
    # This could be enhanced with a recommendation engine
    # For now, return studies by specialty
    return query.limit(10).all()

def search_studies(
    db: Session,
    search_term: str,
    category_id: Optional[int] = None,
    specialty: Optional[str] = None,
    limit: int = 20
) -> List[StudyCatalog]:
    """Search studies with advanced filters"""
    query = db.query(StudyCatalog).join(StudyCategory).filter(StudyCatalog.is_active == True)
    
    if search_term:
        query = query.filter(
            or_(
                StudyCatalog.name.ilike(f"%{search_term}%"),
                StudyCatalog.code.ilike(f"%{search_term}%"),
                StudyCatalog.description.ilike(f"%{search_term}%"),
                StudyCatalog.subcategory.ilike(f"%{search_term}%")
            )
        )
    
    if category_id:
        query = query.filter(StudyCatalog.category_id == category_id)
    
    if specialty:
        query = query.filter(StudyCatalog.specialty.ilike(f"%{specialty}%"))
    
    return query.limit(limit).all()
