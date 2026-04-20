"""
Patient access control helpers.

Single source of truth for the rule `can doctor X read patient Y?`.
Used by FHIR routes, ARCO exports, the doctor assistant, and the
expediente PDF export.

Rule: doctors see only patients they created or have consulted.
Admins see everyone. Anyone else is denied.
"""

from __future__ import annotations

from sqlalchemy.orm import Session

from database import MedicalRecord, Person


def doctor_can_read_patient(db: Session, doctor: Person, patient: Person) -> bool:
    """Return True if `doctor` may read `patient`'s records.

    - admins → always True
    - doctors → True if they created the patient, or have a
      `MedicalRecord` with them
    - any other person_type → False
    """
    if doctor.person_type == "admin":
        return True
    if doctor.person_type != "doctor":
        return False
    if patient.created_by == doctor.id:
        return True
    has_consultation = (
        db.query(MedicalRecord)
        .filter(
            MedicalRecord.patient_id == patient.id,
            MedicalRecord.doctor_id == doctor.id,
        )
        .first()
        is not None
    )
    return has_consultation
