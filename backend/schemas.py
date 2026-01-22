"""
Schemas Pydantic para APIs con nombres en inglés
Compatible con nueva arquitectura unificada de base de datos
"""

from pydantic import BaseModel, field_validator, EmailStr, ConfigDict, model_validator
from typing import Optional, List, Literal, Dict, Any
from datetime import datetime, date
from decimal import Decimal

# ============================================================================
# BASE SCHEMAS
# ============================================================================

class BaseSchema(BaseModel):
    model_config = ConfigDict(
        from_attributes=True,
        # json_encoders removed - use model_serializer instead if needed
        # For datetime/date serialization, Pydantic V2 handles it automatically
    )

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
    
    @field_validator('name')
    @classmethod
    def validate_name(cls, v):
        if not v or not v.strip():
            raise ValueError('Office name is required and cannot be empty')
        return v.strip()
    
    @field_validator('virtual_url')
    @classmethod
    def validate_virtual_url(cls, v, info):
        # Si es consultorio virtual, la URL es obligatoria
        if info.data.get('is_virtual', False) and (not v or not v.strip()):
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
    
    model_config = ConfigDict(from_attributes=True)

class DocumentResponse(BaseSchema):
    id: int
    name: str
    document_type_id: int
    is_active: bool
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

class PersonDocumentCreate(BaseSchema):
    document_id: int
    document_value: str

class PersonDocumentUpdate(BaseSchema):
    document_value: Optional[str] = None
    is_active: Optional[bool] = None

class PersonDocumentResponse(BaseSchema):
    id: int
    person_id: int
    document_id: int
    document_value: str
    is_active: bool
    created_at: datetime
    updated_at: datetime
    document: Optional[DocumentResponse] = None
    
    model_config = ConfigDict(from_attributes=True)

# ============================================================================
# PERSONS (UNIFIED)
# ============================================================================

class PersonBase(BaseSchema):
    person_type: Literal['doctor', 'patient', 'admin']
    title: Optional[str] = None
    name: str
    birth_date: Optional[date] = None
    gender: Optional[str] = None  # Optional: can be null for first-time appointments
    civil_status: Optional[str] = None
    birth_city: Optional[str] = None
    
    @model_validator(mode='before')
    @classmethod
    def validate_gender_allow_none(cls, data: Any) -> Any:
        # Ensure gender can be None in response validation
        if isinstance(data, dict) and 'gender' in data:
            # Explicitly allow None - convert empty string to None
            if data['gender'] is None or data['gender'] == '':
                data['gender'] = None
        return data
    
    @field_validator('name')
    @classmethod
    def validate_name(cls, v):
        if not v or not v.strip():
            raise ValueError('El nombre completo es requerido')
        words = v.strip().split()
        if len(words) < 2:
            raise ValueError('Ingresa al menos nombre y apellido')
        return v.strip()
    
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
    
    @field_validator('email')
    @classmethod
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
    
    # Avatar configuration
    avatar_type: Literal['initials', 'preloaded', 'custom'] = 'initials'
    avatar_template_key: Optional[str] = None
    avatar_file_path: Optional[str] = None
    
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
    name: Optional[str] = None
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

    # Avatar configuration
    avatar_type: Optional[Literal['initials', 'preloaded', 'custom']] = None
    avatar_template_key: Optional[str] = None
    avatar_file_path: Optional[str] = None

# Medical data for patients
class PatientCreate(PersonBase):
    person_type: Literal['patient'] = 'patient'
    gender: Optional[str] = None  # Optional for first-time appointments
    
    # Medical data
    insurance_provider: Optional[str] = None
    insurance_number: Optional[str] = None
    
    # Documents (normalized)
    documents: List[PersonDocumentCreate] = []

class PersonUpdate(BaseSchema):
    # Personal data
    title: Optional[str] = None
    name: Optional[str] = None
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
    
    # Avatar configuration
    avatar_type: Optional[str] = None
    avatar_template_key: Optional[str] = None
    avatar_file_path: Optional[str] = None

# ============================================================================
# MEDICAL RECORDS
# ============================================================================

class MedicalRecordBase(BaseSchema):
    patient_id: int
    doctor_id: int
    consultation_date: datetime
    patient_document_id: Optional[int] = None
    patient_document_value: Optional[str] = None
    
    # NOM-004 required fields
    chief_complaint: str
    history_present_illness: str
    family_history: str
    perinatal_history: str
    gynecological_and_obstetric_history: str
    personal_pathological_history: str
    personal_non_pathological_history: str
    physical_examination: str
    primary_diagnosis: str
    treatment_plan: str
    follow_up_instructions: str
    
    # Appointment type and office
    appointment_type_id: int
    office_id: Optional[int] = None
    
    # First-time consultation fields (removed duplicate _story fields)
    # These fields are now handled by the existing _history fields:
    # - family_history
    # - perinatal_history
    # - personal_pathological_history  
    # - personal_non_pathological_history
    
    # Optional fields
    secondary_diagnoses: Optional[str] = None
    prescribed_medications: Optional[str] = None
    laboratory_results: Optional[str] = None
    notes: Optional[str] = None

class MedicalRecordCreate(MedicalRecordBase):
    pass

class MedicalRecordUpdate(BaseSchema):
    patient_document_id: Optional[int] = None
    patient_document_value: Optional[str] = None
    chief_complaint: Optional[str] = None
    history_present_illness: Optional[str] = None
    family_history: Optional[str] = None
    perinatal_history: Optional[str] = None
    gynecological_and_obstetric_history: Optional[str] = None
    personal_pathological_history: Optional[str] = None
    personal_non_pathological_history: Optional[str] = None
    physical_examination: Optional[str] = None
    follow_up_instructions: Optional[str] = None
    primary_diagnosis: Optional[str] = None
    treatment_plan: Optional[str] = None
    
    # First-time consultation fields (removed duplicate _story fields)
    # These fields are now handled by the existing _history fields:
    # - family_history
    # - perinatal_history
    # - personal_pathological_history  
    # - personal_non_pathological_history
    
    secondary_diagnoses: Optional[str] = None
    prescribed_medications: Optional[str] = None
    laboratory_results: Optional[str] = None
    notes: Optional[str] = None

class MedicalRecord(MedicalRecordBase):
    id: int
    created_at: datetime
    updated_at: datetime
    created_by: Optional[int] = None
    
    # Relationships
    patient: Optional[Person] = None
    doctor: Optional[Person] = None

# ============================================================================
# APPOINTMENTS
# ============================================================================

# ============================================================================
# APPOINTMENT REMINDERS
# ============================================================================

class AppointmentReminderBase(BaseSchema):
    reminder_number: int  # 1, 2, or 3
    offset_minutes: int  # Time before appointment in minutes
    enabled: bool = True

class AppointmentReminderCreate(AppointmentReminderBase):
    pass

class AppointmentReminderUpdate(BaseSchema):
    reminder_number: Optional[int] = None
    offset_minutes: Optional[int] = None
    enabled: Optional[bool] = None

class AppointmentReminder(AppointmentReminderBase):
    id: int
    appointment_id: int
    sent: bool = False
    sent_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

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
    status: str = 'por_confirmar'
    reason: Optional[str] = None
    # Auto WhatsApp reminder (deprecated - use reminders array instead)
    auto_reminder_enabled: bool = False
    auto_reminder_offset_minutes: Optional[int] = 360  # 6 hours by default
    # New multiple reminders system
    reminders: Optional[List[AppointmentReminderCreate]] = None  # Up to 3 reminders

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
    preparation_instructions: Optional[str] = None
    estimated_cost: Optional[Decimal] = None
    insurance_covered: Optional[bool] = None
    cancelled_reason: Optional[str] = None
    # Auto WhatsApp reminder (deprecated - use reminders array instead)
    auto_reminder_enabled: Optional[bool] = None
    auto_reminder_offset_minutes: Optional[int] = None
    # New multiple reminders system
    reminders: Optional[List[AppointmentReminderCreate]] = None  # Up to 3 reminders

class Appointment(AppointmentBase):
    id: int
    confirmation_required: bool = False
    reminder_sent: bool = False  # Deprecated - check reminders array instead
    reminder_sent_at: Optional[datetime] = None  # Deprecated
    cancelled_reason: Optional[str] = None
    cancelled_at: Optional[datetime] = None
    cancelled_by: Optional[int] = None
    created_at: datetime
    updated_at: datetime
    # created_by removed - not used, doctor_id already identifies the doctor
    
    # Relationships
    patient: Optional[Person] = None
    doctor: Optional[Person] = None
    reminders: Optional[List[AppointmentReminder]] = None  # Up to 3 reminders
    
    @classmethod
    def model_validate(cls, obj, **kwargs):
        """Override to ensure appointment_date includes timezone when loading from DB"""
        import pytz
        from datetime import datetime as dt
        
        # If obj is a database model instance with appointment_date
        if hasattr(obj, 'appointment_date') and isinstance(obj.appointment_date, dt):
            cdmx_tz = pytz.timezone('America/Mexico_City')
            
            # If the datetime is naive, assume it's in CDMX time
            if obj.appointment_date.tzinfo is None:
                localized = cdmx_tz.localize(obj.appointment_date)
                # Store as ISO string with timezone
                obj.appointment_date = localized.isoformat()
            elif obj.appointment_date.tzinfo != cdmx_tz:
                # If it has different timezone, convert to CDMX
                localized = obj.appointment_date.astimezone(cdmx_tz)
                obj.appointment_date = localized.isoformat()
        
        return super().model_validate(obj, **kwargs)

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
    name: str  # Full name (replaces first_name, paternal_surname, maternal_surname)

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
    name: str
    is_active: bool = True

class StudyCategory(StudyCategoryBase):
    id: int
    created_at: Optional[datetime] = None

# StudyNormalValue schemas removed - table deleted

class StudyCatalogBase(BaseSchema):
    name: str
    category_id: int
    is_active: bool = True

class StudyCatalog(StudyCatalogBase):
    id: int
    created_at: datetime
    updated_at: datetime
    category: Optional[StudyCategory] = None
    # normal_values field removed - table deleted

# StudyTemplate and StudyTemplateItem schemas removed - tables deleted

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

# ============================================================================
# MEDICATIONS
# ============================================================================

class MedicationBase(BaseSchema):
    name: str

    @field_validator('name')
    @classmethod
    def validate_name(cls, value: str) -> str:
        if not value or not value.strip():
            raise ValueError("El nombre del medicamento es obligatorio")
        return value.strip()


class MedicationCreate(MedicationBase):
    pass


class MedicationResponse(MedicationBase):
    id: int
    created_by: Optional[int] = None
    is_active: bool = True
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

# ============================================================================
# LICENSE MANAGEMENT
# ============================================================================

class LicenseBase(BaseSchema):
    doctor_id: int
    license_type: Literal['trial', 'basic', 'premium']
    start_date: date
    expiration_date: date
    payment_date: Optional[date] = None
    status: Literal['active', 'inactive', 'expired', 'suspended'] = 'active'
    is_active: bool = True
    notes: Optional[str] = None

class LicenseCreate(LicenseBase):
    pass

class LicenseUpdate(BaseSchema):
    license_type: Optional[Literal['trial', 'basic', 'premium']] = None
    start_date: Optional[date] = None
    expiration_date: Optional[date] = None
    payment_date: Optional[date] = None
    status: Optional[Literal['active', 'inactive', 'expired', 'suspended']] = None
    is_active: Optional[bool] = None
    notes: Optional[str] = None

class LicenseResponse(LicenseBase):
    id: int
    created_at: datetime
    updated_at: datetime
    created_by: Optional[int] = None
    doctor: Optional[Dict[str, Any]] = None  # Will include name, email, etc.
    
    model_config = ConfigDict(from_attributes=True)
