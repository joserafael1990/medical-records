"""
CRUD operations with English field names
Database: PostgreSQL with numeric IDs
Performance: Optimized queries with efficient joins
"""

from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, or_, func, text, desc, asc
from typing import Optional, List, Tuple
from datetime import datetime, date
from fastapi import HTTPException
import bcrypt

from database import (
    Person, MedicalRecord, Appointment, VitalSigns,
    Country, State, City, Nationality, Specialty, EmergencyRelationship
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
    
    # Get last number for this type
    last_person = db.query(Person).filter(
        Person.person_code.like(f'{prefix}%')
    ).order_by(desc(Person.person_code)).first()
    
    if last_person:
        try:
            last_num = int(last_person.person_code[3:])
            new_num = last_num + 1
        except:
            new_num = 1
    else:
        new_num = 1
    
    return f"{prefix}{new_num:06d}"

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

def get_cities(db: Session, state_id: Optional[int] = None, active: bool = True) -> List[City]:
    """Get list of cities"""
    query = db.query(City)
    if active:
        query = query.filter(City.active == True)
    if state_id:
        query = query.filter(City.state_id == state_id)
    return query.order_by(City.name).all()

def get_nationalities(db: Session, active: bool = True) -> List[Nationality]:
    """Get list of nationalities"""
    query = db.query(Nationality)
    if active:
        query = query.filter(Nationality.active == True)
    return query.order_by(Nationality.name).all()

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
    
    # Extract password and hash it
    doctor_dict = doctor_data.dict(exclude={'person_type', 'password'})
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
    
    # Update only provided fields
    update_data = doctor_data.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_doctor, field, value)
    
    db.commit()
    db.refresh(db_doctor)
    return db_doctor

def create_patient(db: Session, patient_data: schemas.PatientCreate) -> Person:
    """Create a new patient"""
    # Generate patient code
    person_code = generate_person_code(db, 'patient')
    
    # Create patient
    db_patient = Person(
        person_code=person_code,
        person_type='patient',
        **patient_data.dict(exclude={'person_type'})
    )
    
    db.add(db_patient)
    db.commit()
    db.refresh(db_patient)
    return db_patient

def get_person(db: Session, person_id: int) -> Optional[Person]:
    """Get person by ID"""
    return db.query(Person).filter(Person.id == person_id).first()

def get_person_by_code(db: Session, person_code: str) -> Optional[Person]:
    """Get person by person code"""
    return db.query(Person).filter(Person.person_code == person_code).first()

def get_person_by_curp(db: Session, curp: str) -> Optional[Person]:
    """Get person by CURP"""
    return db.query(Person).filter(Person.curp == curp).first()

def get_person_by_email(db: Session, email: str) -> Optional[Person]:
    """Get person by email"""
    return db.query(Person).filter(Person.email == email).first()

def get_persons(db: Session, skip: int = 0, limit: int = 100, person_type: Optional[str] = None) -> List[Person]:
    """Get list of persons"""
    query = db.query(Person).options(
        joinedload(Person.nationality),
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
    """Get list of patients"""
    return db.query(Person).options(
        joinedload(Person.nationality),
        joinedload(Person.birth_state),
        joinedload(Person.city_residence)
    ).filter(Person.person_type == 'patient').offset(skip).limit(limit).all()

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
    """Search persons by name, code, CURP, or email"""
    query = db.query(Person).options(
        joinedload(Person.nationality),
        joinedload(Person.specialty)
    )
    
    # Search conditions
    search_conditions = [
        Person.first_name.ilike(f'%{search_term}%'),
        Person.paternal_surname.ilike(f'%{search_term}%'),
        Person.maternal_surname.ilike(f'%{search_term}%'),
        Person.person_code.ilike(f'%{search_term}%'),
        Person.curp.ilike(f'%{search_term}%'),
        Person.email.ilike(f'%{search_term}%')
    ]
    
    query = query.filter(or_(*search_conditions))
    
    if person_type:
        query = query.filter(Person.person_type == person_type)
    
    return query.limit(50).all()

# ============================================================================
# MEDICAL RECORD OPERATIONS
# ============================================================================

def create_medical_record(db: Session, record_data: schemas.MedicalRecordCreate) -> MedicalRecord:
    """Create a new medical record"""
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

def create_appointment(db: Session, appointment_data: schemas.AppointmentCreate) -> Appointment:
    """Create a new appointment"""
    # Generate appointment code
    last_appointment = db.query(Appointment).order_by(desc(Appointment.id)).first()
    appointment_number = (last_appointment.id + 1) if last_appointment else 1
    appointment_code = f"APT{appointment_number:08d}"
    
    db_appointment = Appointment(
        appointment_code=appointment_code,
        **appointment_data.dict()
    )
    
    db.add(db_appointment)
    db.commit()
    db.refresh(db_appointment)
    return db_appointment

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

def update_appointment(db: Session, appointment_id: int, appointment_data: schemas.AppointmentUpdate) -> Appointment:
    """Update appointment"""
    appointment = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    
    update_data = appointment_data.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(appointment, field, value)
    
    appointment.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(appointment)
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

def create_vital_signs(db: Session, vital_signs_data: schemas.VitalSignsCreate) -> VitalSigns:
    """Create new vital signs record"""
    db_vital_signs = VitalSigns(**vital_signs_data.dict())
    db.add(db_vital_signs)
    db.commit()
    db.refresh(db_vital_signs)
    return db_vital_signs

def get_vital_signs_by_patient(db: Session, patient_id: int) -> List[VitalSigns]:
    """Get vital signs by patient"""
    return db.query(VitalSigns).options(
        joinedload(VitalSigns.doctor)
    ).filter(VitalSigns.patient_id == patient_id).order_by(desc(VitalSigns.date_recorded)).all()

def update_vital_signs(db: Session, vital_signs_id: int, vital_signs_data: schemas.VitalSignsUpdate) -> VitalSigns:
    """Update vital signs"""
    vital_signs = db.query(VitalSigns).filter(VitalSigns.id == vital_signs_id).first()
    if not vital_signs:
        raise HTTPException(status_code=404, detail="Vital signs not found")
    
    update_data = vital_signs_data.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(vital_signs, field, value)
    
    db.commit()
    db.refresh(vital_signs)
    return vital_signs

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

def get_ciudades(db: Session, estado_id: Optional[int] = None, activo: bool = True) -> List[City]:
    """Obtener lista de ciudades"""
    query = db.query(City)
    if estado_id:
        query = query.filter(City.state_id == estado_id)
    if activo:
        query = query.filter(City.is_active == True)
    return query.order_by(City.name).all()

# ELIMINATED: Duplicate Spanish functions - use English versions instead:
# - get_nacionalidades -> use get_nationalities  
# - get_especialidades -> use get_specialties
# - get_relaciones_emergencia -> use get_emergency_relationships
