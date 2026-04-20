"""Medical record schemas (NOM-004-SSA3-2012 required fields)."""
from datetime import datetime
from typing import Optional

from .base import BaseSchema
from .persons import Person


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
