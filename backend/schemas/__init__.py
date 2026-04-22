"""Schemas package — re-exports all public schema names.

Previously a single 805-line `schemas.py` file, now split by domain into
sub-modules. Consumer code using `import schemas` and `schemas.X` continues to
work because every public class is re-exported here.
"""
from .appointments import (
    Appointment,
    AppointmentBase,
    AppointmentCreate,
    AppointmentReminder,
    AppointmentReminderBase,
    AppointmentReminderCreate,
    AppointmentReminderUpdate,
    AppointmentUpdate,
)
from .auth import (
    ChangePasswordRequest,
    PasswordResetConfirm,
    PasswordResetRequest,
    RefreshTokenRequest,
    Token,
    TokenData,
    UserCreate,
    UserLogin,
)
from .base import BaseSchema
from .catalogs import (
    AppointmentType,
    AppointmentTypeBase,
    City,
    CityBase,
    Country,
    CountryBase,
    EmergencyRelationship,
    EmergencyRelationshipBase,
    Specialty,
    SpecialtyBase,
    State,
    StateBase,
)
from .common import DashboardStats, PaginatedResponse, SearchParams
from .documents import (
    DocumentResponse,
    DocumentTypeResponse,
    PersonDocumentCreate,
    PersonDocumentResponse,
    PersonDocumentUpdate,
)
from .licenses import LicenseBase, LicenseCreate, LicenseResponse, LicenseUpdate
from .medical import (
    MedicalRecord,
    MedicalRecordBase,
    MedicalRecordCreate,
    MedicalRecordUpdate,
)
from .medications import MedicationBase, MedicationCreate, MedicationResponse
from .office import Office, OfficeBase, OfficeCreate, OfficeUpdate
from .persons import (
    DoctorCreate,
    DoctorUpdate,
    PatientCreate,
    Person,
    PersonBase,
    PersonUpdate,
    PrivacyConsentPayload,
)
from .studies import (
    StudyCatalog,
    StudyCatalogBase,
    StudyCategory,
    StudyCategoryBase,
    StudyRecommendation,
    StudySearchFilters,
)
from .vital_signs import VitalSigns, VitalSignsBase, VitalSignsCreate, VitalSignsUpdate
from .cfdi import (
    IssuerBase,
    IssuerCreate,
    IssuerUpdate,
    IssuerResponse,
    InvoiceCreate,
    InvoiceCancel,
    InvoiceResponse,
)

__all__ = [
    # base
    "BaseSchema",
    # catalogs
    "AppointmentType", "AppointmentTypeBase",
    "City", "CityBase",
    "Country", "CountryBase",
    "EmergencyRelationship", "EmergencyRelationshipBase",
    "Specialty", "SpecialtyBase",
    "State", "StateBase",
    # office
    "Office", "OfficeBase", "OfficeCreate", "OfficeUpdate",
    # documents
    "DocumentResponse", "DocumentTypeResponse",
    "PersonDocumentCreate", "PersonDocumentResponse", "PersonDocumentUpdate",
    # persons
    "DoctorCreate", "DoctorUpdate",
    "PatientCreate",
    "Person", "PersonBase", "PersonUpdate",
    "PrivacyConsentPayload",
    # medical
    "MedicalRecord", "MedicalRecordBase",
    "MedicalRecordCreate", "MedicalRecordUpdate",
    # appointments
    "Appointment", "AppointmentBase", "AppointmentCreate",
    "AppointmentReminder", "AppointmentReminderBase",
    "AppointmentReminderCreate", "AppointmentReminderUpdate",
    "AppointmentUpdate",
    # vital signs
    "VitalSigns", "VitalSignsBase", "VitalSignsCreate", "VitalSignsUpdate",
    # auth
    "ChangePasswordRequest",
    "PasswordResetConfirm", "PasswordResetRequest",
    "RefreshTokenRequest",
    "Token", "TokenData",
    "UserCreate", "UserLogin",
    # common
    "DashboardStats", "PaginatedResponse", "SearchParams",
    # studies
    "StudyCatalog", "StudyCatalogBase",
    "StudyCategory", "StudyCategoryBase",
    "StudyRecommendation", "StudySearchFilters",
    # medications
    "MedicationBase", "MedicationCreate", "MedicationResponse",
    # licenses
    "LicenseBase", "LicenseCreate", "LicenseResponse", "LicenseUpdate",
]
