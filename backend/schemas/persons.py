"""Person schemas (unified for doctors, patients, admins)."""
import unicodedata
from datetime import date, datetime
from typing import Any, List, Literal, Optional

from pydantic import EmailStr, field_validator, model_validator

from .base import BaseSchema
from .catalogs import Specialty, State
from .documents import PersonDocumentCreate
from .office import Office, OfficeCreate


def normalize_relationship_code(v: Any) -> Optional[str]:
    """Coerce emergency-contact relationship input to the canonical DB code.

    The `emergency_relationships` catalog stores uppercase ASCII codes with
    `Ñ` expanded to `NI` (e.g. CUÑADA → CUNIADA, TÍA → TIA, PADRE → PADRE).
    Frontends historically send the display label ("Padre", "Cuñada"), which
    triggers a FK violation on persons.emergency_contact_relationship. This
    normalizer bridges both forms so the insert stops 500'ing.
    """
    if v is None:
        return None
    s = str(v).strip()
    if not s:
        return None
    s = s.upper().replace('Ñ', 'NI')
    # Strip remaining combining marks (accents) after NFKD decomposition.
    s = ''.join(c for c in unicodedata.normalize('NFKD', s) if not unicodedata.combining(c))
    return s or None


# Canonical gender is a single-letter code: M / F / O. Legacy callers and
# older rows use full Spanish/English words; the normalizer below accepts
# those and coerces to the canonical code so the DB stays consistent.
GenderCode = Literal['M', 'F', 'O']

_GENDER_ALIASES = {
    'm': 'M', 'masculino': 'M', 'male': 'M', 'hombre': 'M',
    'f': 'F', 'femenino': 'F', 'female': 'F', 'mujer': 'F',
    'o': 'O', 'otro': 'O', 'other': 'O',
}


def normalize_gender(v: Any) -> Optional[str]:
    """Coerce any accepted gender input to the canonical M/F/O code.

    Returns None for None/empty; raises ValueError for unknown values so
    Pydantic surfaces a 422 instead of silently writing garbage.
    """
    if v is None:
        return None
    s = str(v).strip()
    if not s:
        return None
    code = _GENDER_ALIASES.get(s.lower())
    if code is None:
        raise ValueError(f"gender inválido: '{v}' (valores aceptados: M, F, O, Masculino, Femenino, Otro)")
    return code


def empty_str_to_none(v: Any) -> Any:
    """Coerce '' → None for Optional[non-str] fields.

    Frontends (quick register, profile dialogs, patient forms) send '' as a
    stub for unfilled dates/numbers. Pydantic v2 does not coerce empty
    strings into date/int/None and raises "input is too short" or
    "unable to parse string as an integer", so normalize here before the
    type validators run.
    """
    if isinstance(v, str) and v.strip() == '':
        return None
    return v


class PersonBase(BaseSchema):
    person_type: Literal['doctor', 'patient', 'admin']
    title: Optional[str] = None
    name: str
    birth_date: Optional[date] = None
    gender: Optional[GenderCode] = None
    civil_status: Optional[str] = None
    birth_city: Optional[str] = None

    @field_validator('gender', mode='before')
    @classmethod
    def _normalize_gender(cls, v: Any) -> Any:
        return normalize_gender(v)

    @field_validator('birth_date', mode='before')
    @classmethod
    def _empty_birth_date_to_none(cls, v: Any) -> Any:
        return empty_str_to_none(v)

    @field_validator('birth_state_id', 'birth_country_id', 'address_state_id',
                     'address_country_id', mode='before')
    @classmethod
    def _empty_int_to_none(cls, v: Any) -> Any:
        return empty_str_to_none(v)

    @field_validator('name')
    @classmethod
    def validate_name(cls, v):
        # Relaxed: accepts single-word names so a doctor can book an appointment
        # with minimal patient data (e.g., only first name is known when the
        # patient calls). NOM-004 completeness (full name + apellidos paterno
        # y materno) is enforced downstream by the compliance guard before a
        # consultation can be signed, not here.
        if not v or not v.strip():
            raise ValueError('El nombre es requerido')
        trimmed = v.strip()
        if len(trimmed) < 2:
            raise ValueError('El nombre debe tener al menos 2 caracteres')
        return trimmed

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

    @field_validator('emergency_contact_relationship', mode='before')
    @classmethod
    def _normalize_emergency_contact_relationship(cls, v: Any) -> Any:
        return normalize_relationship_code(v)


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

    # Coerce '' → None for Optional[int] fields that frontends send as empty
    # string stubs (RegisterView, DoctorProfileDialog). Without this,
    # Pydantic raises int_parsing on the empty value.
    @field_validator('graduation_year', 'specialty_id', 'appointment_duration',
                     'office_state_id', mode='before')
    @classmethod
    def _empty_int_to_none(cls, v: Any) -> Any:
        return empty_str_to_none(v)

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
    gender: Optional[GenderCode] = None
    civil_status: Optional[str] = None
    birth_city: Optional[str] = None
    birth_state_id: Optional[int] = None

    @field_validator('gender', mode='before')
    @classmethod
    def _normalize_gender(cls, v: Any) -> Any:
        return normalize_gender(v)

    @field_validator('birth_date', mode='before')
    @classmethod
    def _empty_birth_date_to_none(cls, v: Any) -> Any:
        return empty_str_to_none(v)

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

    @field_validator('graduation_year', 'specialty_id', 'appointment_duration',
                     'address_state_id', 'address_country_id', 'birth_state_id',
                     mode='before')
    @classmethod
    def _empty_int_to_none(cls, v: Any) -> Any:
        return empty_str_to_none(v)

    # Documents (normalized) - accept both formats for flexibility
    documents: List[PersonDocumentCreate] = []
    professional_documents: Optional[List[PersonDocumentCreate]] = None
    personal_documents: Optional[List[PersonDocumentCreate]] = None

    # Emergency contact
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    emergency_contact_relationship: Optional[str] = None

    @field_validator('emergency_contact_relationship', mode='before')
    @classmethod
    def _normalize_emergency_contact_relationship(cls, v: Any) -> Any:
        return normalize_relationship_code(v)

    # Avatar configuration
    avatar_type: Optional[Literal['initials', 'preloaded', 'custom']] = None
    avatar_template_key: Optional[str] = None
    avatar_file_path: Optional[str] = None


# Medical data for patients
class PatientCreate(PersonBase):
    person_type: Literal['patient'] = 'patient'
    gender: Optional[GenderCode] = None  # Optional for first-time appointments

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
    gender: Optional[GenderCode] = None
    civil_status: Optional[str] = None
    birth_city: Optional[str] = None

    @field_validator('gender', mode='before')
    @classmethod
    def _normalize_gender(cls, v: Any) -> Any:
        return normalize_gender(v)

    @field_validator('birth_date', mode='before')
    @classmethod
    def _empty_birth_date_to_none(cls, v: Any) -> Any:
        return empty_str_to_none(v)

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

    @field_validator('graduation_year', 'specialty_id', 'appointment_duration',
                     'birth_state_id', 'birth_country_id', 'address_state_id',
                     'address_country_id', mode='before')
    @classmethod
    def _empty_int_to_none(cls, v: Any) -> Any:
        return empty_str_to_none(v)

    # Documents (normalized)
    documents: List[PersonDocumentCreate] = []

    # Medical data (patients)
    insurance_provider: Optional[str] = None
    insurance_number: Optional[str] = None

    # Emergency contact
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    emergency_contact_relationship: Optional[str] = None

    @field_validator('emergency_contact_relationship', mode='before')
    @classmethod
    def _normalize_emergency_contact_relationship(cls, v: Any) -> Any:
        return normalize_relationship_code(v)


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
