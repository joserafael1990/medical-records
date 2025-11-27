"""
CRUD operations with English field names
Database: PostgreSQL with numeric IDs
Performance: Optimized queries with efficient joins
"""

from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, or_, func, text, desc, asc
from typing import Optional, List, Tuple
from datetime import datetime, date, timedelta
from utils.datetime_utils import utc_now
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
    Person, MedicalRecord, Appointment, VitalSign, ConsultationVitalSign, License,
    Country, State, Specialty, EmergencyRelationship,
    DocumentType, Document, PersonDocument
)
import schemas
from logger import get_logger
# Structured logger
api_logger = get_logger("medical_records.api")

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
        query = query.filter(Country.is_active == True)
    return query.order_by(Country.name).all()

def get_states(db: Session, country_id: Optional[int] = None, active: bool = True) -> List[State]:
    """Get list of states"""
    query = db.query(State)
    if active:
        query = query.filter(State.is_active == True)
    if country_id:
        query = query.filter(State.country_id == country_id)
    return query.order_by(State.name).all()



def get_specialties(db: Session, active: bool = True) -> List[Specialty]:
    """Get list of medical specialties"""
    query = db.query(Specialty)
    if active:
        query = query.filter(Specialty.is_active == True)
    return query.order_by(Specialty.name).all()

def get_emergency_relationships(db: Session, active: bool = True) -> List[EmergencyRelationship]:
    """Get list of emergency relationships"""
    query = db.query(EmergencyRelationship)
    if active:
        query = query.filter(EmergencyRelationship.is_active == True)
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
        # 'city_residence_id',  # Field doesn't exist in Person model - removed
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
        # Note: city_residence doesn't exist - use address_city field instead
    )
    
    if person_type:
        query = query.filter(Person.person_type == person_type)
    
    return query.offset(skip).limit(limit).all()

def get_doctors(db: Session, skip: int = 0, limit: int = 100) -> List[Person]:
    """Get list of doctors"""
    return db.query(Person).options(
        joinedload(Person.specialty),
        joinedload(Person.birth_country)  # Use birth_country instead of nationality (doesn't exist)
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
    
    # Search conditions (remove curp since it's now in person_documents)
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
        existing_same_type.updated_at = utc_now()
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
            existing_inactive.updated_at = utc_now()
            return existing_inactive
        else:
            # Create new document
            new_doc = PersonDocument(
                person_id=person_id,
                document_id=document_id,
                document_value=document_value
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
    api_logger.debug(
        "🔬 Creating medical record",
        extra={
            "patient_id": record_data.patient_id,
            "doctor_id": record_data.doctor_id,
            "has_laboratory_analysis": bool(record_data.laboratory_analysis)
        }
    )
    
    # Generate record code
    last_record = db.query(MedicalRecord).order_by(desc(MedicalRecord.id)).first()
    record_number = (last_record.id + 1) if last_record else 1
    record_code = f"MR{record_number:08d}"
    
    db_record = MedicalRecord(
        record_code=record_code,
        **record_data.model_dump()
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
    
    update_data = record_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(record, field, value)
    
    record.updated_at = utc_now()
    db.commit()
    db.refresh(record)
    return record

# ============================================================================
# APPOINTMENT OPERATIONS
# ============================================================================

def create_appointment(db: Session, appointment_data: schemas.AppointmentCreate, doctor_id: int) -> Appointment:
    """Create a new appointment"""
    from services.appointment_service import AppointmentService
    
    # Prepare appointment data for the service
    appointment_dict = appointment_data.model_dump()
    appointment_dict['doctor_id'] = doctor_id
    
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
        update_data = appointment_data.model_dump(exclude_unset=True)
    
    api_logger.debug(
        "🔄 CRUD update_appointment start",
        extra={
            "appointment_id": appointment_id,
            "original_appointment_date": appointment.appointment_date.isoformat() if appointment.appointment_date else None,
            "doctor_id": appointment.doctor_id,
            "doctor_duration": appointment.doctor.appointment_duration if appointment.doctor else None,
            "update_keys": list(update_data.keys())
        }
    )
    
    # Handle datetime conversion for appointment_date with CDMX timezone
    if 'appointment_date' in update_data and isinstance(update_data['appointment_date'], str):
        update_data['appointment_date'] = datetime.fromisoformat(
            update_data['appointment_date'].replace('Z', '+00:00')
        )
        # Convert to UTC for storage
        update_data['appointment_date'] = to_utc_for_storage(update_data['appointment_date'])
        api_logger.debug(
            "🌍 Converted appointment_date to UTC",
            extra={"appointment_id": appointment_id, "utc_value": update_data['appointment_date'].isoformat()}
        )
    
    # Recalculate end_time if appointment_date changed (duration comes from doctor's profile)
    if 'appointment_date' in update_data:
        start_time = update_data['appointment_date']
        # Get doctor's appointment_duration from persons table
        if appointment.doctor and appointment.doctor.appointment_duration:
            duration = appointment.doctor.appointment_duration
        else:
            duration = 30  # Default fallback
        update_data['end_time'] = start_time + timedelta(minutes=duration)
        api_logger.debug(
            "⏰ Recalculated end_time",
            extra={
                "appointment_id": appointment_id,
                "end_time": update_data['end_time'].isoformat(),
                "duration_minutes": duration
            }
        )
    
    # Handle cancellation
    if update_data.get('status') == 'cancelled' and 'cancelled_reason' in update_data:
        update_data['cancelled_at'] = get_cdmx_now().astimezone(pytz.utc)
    
    # Handle confirmation - Appointment model doesn't have confirmed_at field
    # Status change to 'confirmada' is handled by the status field itself
    
    # Filter out relationship fields and non-existent fields before assignment
    # Only assign columns that exist in the Appointment model
    valid_fields = {
        'appointment_date', 'end_time', 'appointment_type_id', 'office_id',
        'consultation_type', 'status', 'reminder_sent', 'reminder_sent_at',
        'auto_reminder_enabled', 'auto_reminder_offset_minutes',
        'cancelled_reason', 'cancelled_at', 'cancelled_by'
    }
    
    # Remove relationship fields (patient, doctor, office, appointment_type_rel, reminders)
    # and fields that don't exist in the model
    filtered_data = {k: v for k, v in update_data.items() if k in valid_fields}
    
    for field, value in filtered_data.items():
        setattr(appointment, field, value)
    
    appointment.updated_at = get_cdmx_now().astimezone(pytz.utc)
    
    api_logger.debug(
        "💾 Final appointment state before commit",
        extra={
            "appointment_id": appointment_id,
            "stored_appointment_date": appointment.appointment_date.isoformat() if appointment.appointment_date else None,
            "stored_end_time": appointment.end_time.isoformat() if appointment.end_time else None,
            "doctor_duration": appointment.doctor.appointment_duration if appointment.doctor else None
        }
    )
    
    db.commit()
    db.refresh(appointment)
    
    api_logger.info(
        "✅ Appointment updated successfully",
        extra={
            "appointment_id": appointment_id,
            "doctor_id": appointment.doctor_id,
            "appointment_date": appointment.appointment_date.isoformat() if appointment.appointment_date else None
        }
    )
    
    return appointment

def cancel_appointment(db: Session, appointment_id: int, reason: str, cancelled_by: int) -> Appointment:
    """Cancel appointment"""
    appointment = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    
    doctor_id = appointment.doctor_id
    
    appointment.status = 'cancelled'
    appointment.cancelled_reason = reason
    appointment.cancelled_at = utc_now()
    appointment.cancelled_by = cancelled_by
    appointment.updated_at = utc_now()
    
    db.commit()
    db.refresh(appointment)
    
    # Sincronizar con Google Calendar si está configurado
    if doctor_id:
        try:
            from services.google_calendar_service import GoogleCalendarService
            GoogleCalendarService.delete_calendar_event(db, doctor_id, appointment_id)
        except Exception as e:
            # No fallar si Google Calendar no está configurado o hay error
            api_logger = get_logger("medical_records.api")
            api_logger.warning("Error al sincronizar eliminación con Google Calendar (no crítico)", exc_info=True, extra={
                "doctor_id": doctor_id,
                "appointment_id": appointment_id
            })
    
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

from database import StudyCategory, StudyCatalog

def get_study_categories(db: Session, skip: int = 0, limit: int = 100) -> List[StudyCategory]:
    """Get all study categories"""
    return db.query(StudyCategory).filter(StudyCategory.is_active == True).offset(skip).limit(limit).all()

def get_study_category(db: Session, category_id: int) -> Optional[StudyCategory]:
    """Get study category by ID"""
    return db.query(StudyCategory).filter(StudyCategory.id == category_id).first()

def get_study_catalog(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    category_id: Optional[int] = None,
    search: Optional[str] = None
) -> List[StudyCatalog]:
    """Get studies from catalog with filters"""
    # Don't load normal_values to avoid schema issues
    query = db.query(StudyCatalog).options(
        joinedload(StudyCatalog.category)
    ).join(StudyCategory).filter(StudyCatalog.is_active == True)
    
    if category_id:
        query = query.filter(StudyCatalog.category_id == category_id)
    
    # specialty filter removed - column does not exist
    
    if search:
        query = query.filter(
            StudyCatalog.name.ilike(f"%{search}%")
        )
    
    return query.offset(skip).limit(limit).all()

def get_study_by_id(db: Session, study_id: int) -> Optional[StudyCatalog]:
    """Get study by ID with normal values"""
    return db.query(StudyCatalog).options(
        joinedload(StudyCatalog.category)
    ).filter(StudyCatalog.id == study_id).first()

# get_study_by_code removed - code column does not exist in study_catalog

# StudyTemplate CRUD functions removed - table deleted

# get_studies_by_specialty removed - specialty column does not exist in study_catalog

def get_study_recommendations(
    db: Session, 
    diagnosis: Optional[str] = None,
    category_id: Optional[int] = None
) -> List[StudyCatalog]:
    """Get study recommendations based on category"""
    query = db.query(StudyCatalog).filter(StudyCatalog.is_active == True)
    
    if category_id:
        query = query.filter(StudyCatalog.category_id == category_id)
    
    # This could be enhanced with a recommendation engine
    # For now, return studies by category
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
            StudyCatalog.name.ilike(f"%{search_term}%")
        )
    
    if category_id:
        query = query.filter(StudyCatalog.category_id == category_id)
    
    # specialty filter removed - column does not exist
    
    return query.limit(limit).all()

# ============================================================================
# LICENSE MANAGEMENT CRUD
# ============================================================================

def create_license(db: Session, license_data, created_by: int):
    """Create a new license for a doctor"""
    # Check if doctor already has an active license
    existing = db.query(License).filter(
        License.doctor_id == license_data.doctor_id,
        License.is_active == True
    ).first()
    
    if existing:
        # Deactivate existing license
        existing.is_active = False
        existing.status = 'inactive'
    
    new_license = License(
        doctor_id=license_data.doctor_id,
        license_type=license_data.license_type,
        start_date=license_data.start_date,
        expiration_date=license_data.expiration_date,
        payment_date=license_data.payment_date,
        status=license_data.status,
        is_active=license_data.is_active,
        notes=license_data.notes,
        created_by=created_by
    )
    db.add(new_license)
    db.commit()
    db.refresh(new_license)
    return new_license

def get_license_by_doctor(db: Session, doctor_id: int) -> Optional[License]:
    """Get active license for a doctor"""
    return db.query(License).filter(
        License.doctor_id == doctor_id,
        License.is_active == True
    ).first()

def get_all_licenses(db: Session, skip: int = 0, limit: int = 100) -> List[License]:
    """Get all licenses"""
    return db.query(License).offset(skip).limit(limit).all()

def update_license(db: Session, license_id: int, license_data) -> Optional[License]:
    """Update a license"""
    license = db.query(License).filter(License.id == license_id).first()
    if not license:
        return None
    
    # Use model_dump for Pydantic v2
    update_data = license_data.model_dump(exclude_unset=True) if hasattr(license_data, 'model_dump') else license_data.dict(exclude_unset=True)
    
    for key, value in update_data.items():
        setattr(license, key, value)
    
    license.updated_at = utc_now()
    db.commit()
    db.refresh(license)
    return license

def check_license_status(db: Session, license: License) -> str:
    """Check and update license status based on expiration date"""
    today = date.today()
    
    if license.expiration_date < today and license.status != 'expired':
        license.status = 'expired'
        license.is_active = False
        db.commit()
        return 'expired'
    
    return license.status
