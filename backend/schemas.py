"""
Schemas Pydantic para APIs con nombres en inglés
Compatible con nueva arquitectura unificada de base de datos
"""

from pydantic import BaseModel, validator, EmailStr
from typing import Optional, List, Literal
from datetime import datetime, date
from decimal import Decimal

# ============================================================================
# BASE SCHEMAS
# ============================================================================

class BaseSchema(BaseModel):
    class Config:
        from_attributes = True
        json_encoders = {
            datetime: lambda v: v.isoformat(),
            date: lambda v: v.isoformat() if v else None
        }

# ============================================================================
# GEOGRAPHIC CATALOGS
# ============================================================================

class CountryBase(BaseSchema):
    name: str
    active: bool = True

class Country(CountryBase):
    id: int
    created_at: datetime

class StateBase(BaseSchema):
    name: str
    country_id: int
    active: bool = True

class State(StateBase):
    id: int
    created_at: datetime
    country: Optional[Country] = None

class CityBase(BaseSchema):
    name: str
    state_id: int
    active: bool = True

class City(CityBase):
    id: int
    created_at: datetime
    state: Optional[State] = None

# ============================================================================
# OFFICE MANAGEMENT
# ============================================================================

class OfficeBase(BaseSchema):
    name: str
    address: Optional[str] = None
    city: Optional[str] = None
    state_id: Optional[int] = None
    country_id: Optional[int] = None
    postal_code: Optional[str] = None
    phone: Optional[str] = None
    timezone: str = 'America/Mexico_City'
    maps_url: Optional[str] = None
    is_virtual: bool = False
    virtual_url: Optional[str] = None
    
    @validator('name')
    def validate_name(cls, v):
        if not v or not v.strip():
            raise ValueError('Office name is required and cannot be empty')
        return v.strip()
    
    @validator('virtual_url')
    def validate_virtual_url(cls, v, values):
        # Si es consultorio virtual, la URL es obligatoria
        if values.get('is_virtual', False) and (not v or not v.strip()):
            raise ValueError('Virtual URL is required for virtual offices')
        return v.strip() if v else None

class OfficeCreate(OfficeBase):
    pass

class OfficeUpdate(OfficeBase):
    name: Optional[str] = None
    timezone: Optional[str] = None

class Office(OfficeBase):
    id: int
    doctor_id: int
    is_active: bool
    created_at: datetime
    updated_at: datetime
    state_name: Optional[str] = None
    country_name: Optional[str] = None

class AppointmentTypeBase(BaseSchema):
    name: str
    active: bool = True

class AppointmentType(AppointmentTypeBase):
    id: int
    created_at: datetime

# ============================================================================
# AUXILIARY CATALOGS
# ============================================================================


class SpecialtyBase(BaseSchema):
    name: str
    active: bool = True

class Specialty(SpecialtyBase):
    id: int
    created_at: datetime

class EmergencyRelationshipBase(BaseSchema):
    code: str
    name: str
    active: bool = True

class EmergencyRelationship(EmergencyRelationshipBase):
    created_at: datetime

# ============================================================================
# DOCUMENT MANAGEMENT
# ============================================================================

class DocumentTypeResponse(BaseSchema):
    id: int
    name: str
    is_active: bool
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class DocumentResponse(BaseSchema):
    id: int
    name: str
    document_type_id: int
    is_active: bool
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class PersonDocumentCreate(BaseSchema):
    document_id: int
    document_value: str
    issue_date: Optional[date] = None
    expiration_date: Optional[date] = None
    issuing_authority: Optional[str] = None

class PersonDocumentUpdate(BaseSchema):
    document_value: Optional[str] = None
    issue_date: Optional[date] = None
    expiration_date: Optional[date] = None
    issuing_authority: Optional[str] = None
    is_active: Optional[bool] = None

class PersonDocumentResponse(BaseSchema):
    id: int
    person_id: int
    document_id: int
    document_value: str
    issue_date: Optional[date] = None
    expiration_date: Optional[date] = None
    issuing_authority: Optional[str] = None
    is_active: bool
    created_at: datetime
    updated_at: datetime
    document: Optional[DocumentResponse] = None
    
    class Config:
        from_attributes = True

# ============================================================================
# PERSONS (UNIFIED)
# ============================================================================

class PersonBase(BaseSchema):
    person_type: Literal['doctor', 'patient', 'admin']
    title: Optional[str] = None
    first_name: str
    paternal_surname: str
    maternal_surname: Optional[str] = None
    birth_date: Optional[date] = None
    gender: str
    civil_status: Optional[str] = None
    birth_city: Optional[str] = None
    
    # Birth location
    birth_state_id: Optional[int] = None
    birth_country_id: Optional[int] = None
    
    # Contact
    email: Optional[str] = None
    primary_phone: Optional[str] = None
    
    # Personal address
    home_address: Optional[str] = None
    address_city: Optional[str] = None
    address_state_id: Optional[int] = None
    address_country_id: Optional[int] = None
    address_postal_code: Optional[str] = None
    
    # Emergency contact
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    emergency_contact_relationship: Optional[str] = None
    
    @validator('email')
    def validate_email(cls, v):
        if not v or v.strip() == '':
            return None
        if '@' not in v:
            raise ValueError('Email inválido')
        return v.strip().lower()

# Professional data for doctors
class DoctorCreate(PersonBase):
    person_type: Literal['doctor'] = 'doctor'
    
    # Authentication fields (required for registration)
    username: Optional[str] = None
    password: str
    
    # Online consultation
    online_consultation_url: Optional[str] = None
    appointment_duration: Optional[int] = None  # Duration in minutes
    
    # Professional data
    specialty_id: Optional[int] = None
    university: Optional[str] = None
    graduation_year: Optional[int] = None
    
    # Documents (normalized)
    documents: List[PersonDocumentCreate] = []
    
    # Schedule data (for registration)
    schedule_data: Optional[dict] = None
    
    # Office data (for registration)
    office_name: Optional[str] = None
    office_address: Optional[str] = None
    office_city: Optional[str] = None
    office_state_id: Optional[int] = None
    office_phone: Optional[str] = None
    office_maps_url: Optional[str] = None

# Professional data for doctor updates (optional fields for partial updates)
class DoctorUpdate(BaseSchema):
    # Personal info (optional for updates) - using correct model field names
    title: Optional[str] = None
    first_name: Optional[str] = None
    paternal_surname: Optional[str] = None
    maternal_surname: Optional[str] = None
    email: Optional[EmailStr] = None
    primary_phone: Optional[str] = None
    primary_phone_country_code: Optional[str] = None
    primary_phone_number: Optional[str] = None
    birth_date: Optional[date] = None
    gender: Optional[Literal['M', 'F', 'O']] = None
    civil_status: Optional[str] = None
    birth_city: Optional[str] = None
    birth_state_id: Optional[int] = None
    
    # Personal address
    home_address: Optional[str] = None
    address_city: Optional[str] = None
    address_state_id: Optional[int] = None
    address_country_id: Optional[int] = None
    address_postal_code: Optional[str] = None
    
    # Online consultation
    online_consultation_url: Optional[str] = None
    appointment_duration: Optional[int] = None  # Duration in minutes
    
    # Offices
    offices: List[OfficeCreate] = []
    
    # Professional data
    specialty_id: Optional[int] = None
    university: Optional[str] = None
    graduation_year: Optional[int] = None
    
    # Documents (normalized) - accept both formats for flexibility
    documents: List[PersonDocumentCreate] = []
    professional_documents: Optional[List[PersonDocumentCreate]] = None
    personal_documents: Optional[List[PersonDocumentCreate]] = None
    
    # Emergency contact
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    emergency_contact_relationship: Optional[str] = None

# Medical data for patients
class PatientCreate(PersonBase):
    person_type: Literal['patient'] = 'patient'
    # En creación de paciente (cita de primera vez), género no es obligatorio
    gender: Optional[str] = None
    
    # Medical data
    insurance_provider: Optional[str] = None
    insurance_number: Optional[str] = None
    
    # Documents (normalized)
    documents: List[PersonDocumentCreate] = []

class PersonUpdate(BaseSchema):
    # Personal data
    title: Optional[str] = None
    first_name: Optional[str] = None
    paternal_surname: Optional[str] = None
    maternal_surname: Optional[str] = None
    birth_date: Optional[date] = None
    gender: Optional[str] = None
    civil_status: Optional[str] = None
    birth_city: Optional[str] = None
    
    # Birth location
    birth_state_id: Optional[int] = None
    birth_country_id: Optional[int] = None
    
    # Contact
    email: Optional[str] = None
    primary_phone: Optional[str] = None
    
    # Personal address
    home_address: Optional[str] = None
    address_city: Optional[str] = None
    address_state_id: Optional[int] = None
    address_country_id: Optional[int] = None
    address_postal_code: Optional[str] = None
    
    # Professional data (doctors)
    appointment_duration: Optional[int] = None  # Duration in minutes
    specialty_id: Optional[int] = None
    university: Optional[str] = None
    graduation_year: Optional[int] = None
    
    # Documents (normalized)
    documents: List[PersonDocumentCreate] = []
    
    # Medical data (patients)
    insurance_provider: Optional[str] = None
    insurance_number: Optional[str] = None
    
    # Emergency contact
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    emergency_contact_relationship: Optional[str] = None

class Person(PersonBase):
    id: int
    person_code: str
    is_active: bool = True
    last_login: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    created_by: Optional[int] = None
    
    # Relationships
    specialty: Optional[Specialty] = None
    birth_state: Optional[State] = None
    address_state: Optional[State] = None
    offices: Optional[List[Office]] = None

# ============================================================================
# MEDICAL RECORDS
# ============================================================================

class MedicalRecordBase(BaseSchema):
    patient_id: int
    doctor_id: int
    consultation_date: datetime
    
    # NOM-004 required fields
    chief_complaint: str
    history_present_illness: str
    family_history: str
    personal_pathological_history: str
    personal_non_pathological_history: str
    physical_examination: str
    laboratory_analysis: Optional[str] = None
    primary_diagnosis: str
    treatment_plan: str
    follow_up_instructions: str
    prognosis: str
    
    # Appointment type and office
    appointment_type_id: int
    office_id: Optional[int] = None
    
    # First-time consultation fields (removed duplicate _story fields)
    # These fields are now handled by the existing _history fields:
    # - family_history
    # - personal_pathological_history  
    # - personal_non_pathological_history
    
    # Optional fields
    secondary_diagnoses: Optional[str] = None
    differential_diagnosis: Optional[str] = None
    prescribed_medications: Optional[str] = None
    laboratory_results: Optional[str] = None
    imaging_results: Optional[str] = None
    notes: Optional[str] = None

class MedicalRecordCreate(MedicalRecordBase):
    pass

class MedicalRecordUpdate(BaseSchema):
    chief_complaint: Optional[str] = None
    history_present_illness: Optional[str] = None
    family_history: Optional[str] = None
    personal_pathological_history: Optional[str] = None
    personal_non_pathological_history: Optional[str] = None
    physical_examination: Optional[str] = None
    laboratory_analysis: Optional[str] = None
    primary_diagnosis: Optional[str] = None
    treatment_plan: Optional[str] = None
    follow_up_instructions: Optional[str] = None
    prognosis: Optional[str] = None
    
    # First-time consultation fields (removed duplicate _story fields)
    # These fields are now handled by the existing _history fields:
    # - family_history
    # - personal_pathological_history  
    # - personal_non_pathological_history
    
    secondary_diagnoses: Optional[str] = None
    differential_diagnosis: Optional[str] = None
    prescribed_medications: Optional[str] = None
    laboratory_results: Optional[str] = None
    imaging_results: Optional[str] = None
    notes: Optional[str] = None

class MedicalRecord(MedicalRecordBase):
    id: int
    record_code: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    created_by: Optional[int] = None
    
    # Relationships
    patient: Optional[Person] = None
    doctor: Optional[Person] = None

# ============================================================================
# APPOINTMENTS
# ============================================================================

class AppointmentBase(BaseSchema):
    patient_id: int
    doctor_id: int
    appointment_date: str  # Changed from datetime to str to handle ISO strings with timezone
    end_time: Optional[str] = None  # Changed from datetime to str - calculated automatically by backend
    appointment_type_id: int
    office_id: Optional[int] = None
    consultation_type: str = 'Seguimiento'  # 'Primera vez' or 'Seguimiento'
    status: str = 'confirmed'
    priority: str = 'normal'
    reason: str
    notes: Optional[str] = None
    follow_up_required: bool = False
    follow_up_date: Optional[date] = None
    room_number: Optional[str] = None
    # Auto WhatsApp reminder
    auto_reminder_enabled: bool = False
    auto_reminder_offset_minutes: Optional[int] = 360  # 6 hours by default

class AppointmentCreate(AppointmentBase):
    pass

class AppointmentUpdate(BaseSchema):
    patient_id: Optional[int] = None
    appointment_date: Optional[str] = None  # Changed from datetime to str
    end_time: Optional[str] = None  # Changed from datetime to str
    appointment_type_id: Optional[int] = None
    office_id: Optional[int] = None
    consultation_type: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    reason: Optional[str] = None
    notes: Optional[str] = None
    preparation_instructions: Optional[str] = None
    follow_up_required: Optional[bool] = None
    follow_up_date: Optional[date] = None
    room_number: Optional[str] = None
    estimated_cost: Optional[Decimal] = None
    insurance_covered: Optional[bool] = None
    cancelled_reason: Optional[str] = None
    # Auto WhatsApp reminder
    auto_reminder_enabled: Optional[bool] = None
    auto_reminder_offset_minutes: Optional[int] = None

class Appointment(AppointmentBase):
    id: int
    appointment_code: Optional[str] = None
    confirmation_required: bool = False
    confirmed_at: Optional[datetime] = None
    reminder_sent: bool = False
    reminder_sent_at: Optional[datetime] = None
    auto_reminder_sent_at: Optional[datetime] = None
    cancelled_reason: Optional[str] = None
    cancelled_at: Optional[datetime] = None
    cancelled_by: Optional[int] = None
    created_at: datetime
    updated_at: datetime
    created_by: Optional[int] = None
    
    # Relationships
    patient: Optional[Person] = None
    doctor: Optional[Person] = None

# ============================================================================
# VITAL SIGNS
# ============================================================================

class VitalSignsBase(BaseSchema):
    patient_id: int
    date_recorded: datetime
    weight: Optional[str] = None
    height: Optional[str] = None
    bmi: Optional[str] = None
    temperature: Optional[str] = None
    blood_pressure_systolic: Optional[str] = None
    blood_pressure_diastolic: Optional[str] = None
    heart_rate: Optional[str] = None
    respiratory_rate: Optional[str] = None
    oxygen_saturation: Optional[str] = None
    abdominal_circumference: Optional[str] = None
    head_circumference: Optional[str] = None
    glucose_level: Optional[str] = None
    notes: Optional[str] = None
    recorded_by: Optional[int] = None
    measurement_context: Optional[str] = None

class VitalSignsCreate(VitalSignsBase):
    pass

class VitalSignsUpdate(BaseSchema):
    weight: Optional[str] = None
    height: Optional[str] = None
    bmi: Optional[str] = None
    temperature: Optional[str] = None
    blood_pressure_systolic: Optional[str] = None
    blood_pressure_diastolic: Optional[str] = None
    heart_rate: Optional[str] = None
    respiratory_rate: Optional[str] = None
    oxygen_saturation: Optional[str] = None
    abdominal_circumference: Optional[str] = None
    head_circumference: Optional[str] = None
    glucose_level: Optional[str] = None
    notes: Optional[str] = None
    measurement_context: Optional[str] = None

class VitalSigns(VitalSignsBase):
    id: int
    created_at: datetime
    
    # Relationships
    patient: Optional[Person] = None
    doctor: Optional[Person] = None

# ============================================================================
# AUTHENTICATION
# ============================================================================

class UserLogin(BaseSchema):
    email: str  # FIXED: Changed from username to email to match auth.py implementation
    password: str

class UserCreate(BaseSchema):
    person_type: Literal['doctor', 'patient', 'admin']
    username: str
    password: str
    email: str
    first_name: str
    paternal_surname: str
    maternal_surname: Optional[str] = None

class Token(BaseSchema):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    user: Person

class TokenData(BaseSchema):
    username: Optional[str] = None
    person_id: Optional[int] = None
    person_type: Optional[str] = None

class PasswordResetRequest(BaseSchema):
    email: str

class PasswordResetConfirm(BaseSchema):
    token: str
    new_password: str
    confirm_password: str

class ChangePasswordRequest(BaseSchema):
    current_password: str
    new_password: str

class RefreshTokenRequest(BaseSchema):
    refresh_token: str

# ============================================================================
# SEARCH AND PAGINATION
# ============================================================================

class SearchParams(BaseSchema):
    q: Optional[str] = None  # Búsqueda general
    tipo: Optional[str] = None  # doctor/patient
    specialty_id: Optional[int] = None  # ✅ UNIFICADO: especialidad_id → specialty_id
    ciudad_id: Optional[int] = None
    activo: bool = True
    page: int = 1
    limit: int = 10

class PaginatedResponse(BaseSchema):
    items: List
    total: int
    page: int
    limit: int
    total_pages: int

class DashboardStats(BaseSchema):
    citas_hoy: int
    pacientes_totales: int
    doctores_totales: int
    consultas_mes: int
    mis_citas_hoy: Optional[int] = None  # Solo para doctores

# ============================================================================
# STUDY CATALOG SCHEMAS
# ============================================================================

class StudyCategoryBase(BaseSchema):
    code: str
    name: str
    description: Optional[str] = None
    is_active: bool = True

class StudyCategory(StudyCategoryBase):
    id: int
    created_at: Optional[datetime] = None
    # Note: updated_at column does not exist in study_categories table

class StudyNormalValueBase(BaseSchema):
    age_min: Optional[int] = None
    age_max: Optional[int] = None
    gender: Optional[Literal['M', 'F', 'B']] = None
    normal_min: Optional[Decimal] = None  # DB column name
    normal_max: Optional[Decimal] = None  # DB column name
    # Aliases for backward compatibility
    min_value: Optional[Decimal] = None
    max_value: Optional[Decimal] = None
    unit: Optional[str] = None
    notes: Optional[str] = None

class StudyNormalValue(StudyNormalValueBase):
    id: int
    study_id: int
    created_at: datetime

class StudyCatalogBase(BaseSchema):
    code: str
    name: str
    category_id: int
    subcategory: Optional[str] = None
    description: Optional[str] = None
    preparation: Optional[str] = None
    methodology: Optional[str] = None
    duration_hours: Optional[int] = None
    specialty: Optional[str] = None
    is_active: bool = True
    regulatory_compliance: Optional[dict] = None

class StudyCatalog(StudyCatalogBase):
    id: int
    created_at: datetime
    updated_at: datetime
    category: Optional[StudyCategory] = None
    normal_values: List[StudyNormalValue] = []

class StudyTemplateItemBase(BaseSchema):
    study_id: int
    order_index: int = 0

class StudyTemplateItem(StudyTemplateItemBase):
    id: int
    template_id: int
    created_at: datetime
    study: Optional[StudyCatalog] = None

class StudyTemplateBase(BaseSchema):
    name: str
    description: Optional[str] = None
    specialty: Optional[str] = None
    is_default: bool = False

class StudyTemplate(StudyTemplateBase):
    id: int
    created_at: datetime
    updated_at: datetime
    template_items: List[StudyTemplateItem] = []

class StudyTemplateCreate(BaseSchema):
    name: str
    description: Optional[str] = None
    specialty: Optional[str] = None
    study_ids: List[int] = []

class StudySearchFilters(BaseSchema):
    category_id: Optional[int] = None
    subcategory: Optional[str] = None
    name: Optional[str] = None
    code: Optional[str] = None
    specialty: Optional[str] = None
    duration_hours: Optional[int] = None
    has_normal_values: Optional[bool] = None
    is_active: bool = True

class StudyRecommendation(BaseSchema):
    study: StudyCatalog
    reason: str
    priority: Literal['high', 'medium', 'low'] = 'medium'
