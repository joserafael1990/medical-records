"""
Expediente complete export — aggregator.

Produces a JSON-serialisable snapshot of a patient's whole expediente
for the doctor-triggered PDF export. PDF rendering happens on the
frontend (jsPDF); this layer's only job is to query efficiently and
emit a shape the frontend can stitch together.

Scope includes:
- patient demographics (plus CURP/RFC if registered as documents)
- list of consultations (most recent first, unbounded)
- prescriptions per consultation
- vital signs per consultation
- clinical studies ordered for the patient

Admin callers see the full expediente; non-admin doctors see only the
consultations THEY authored (same rule the FHIR Patient/$everything
operation already applies). Patient demographics are always shown in
full once the ACL gate passes, because the doctor is authorised to
read that patient.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session

from database import (
    ClinicalStudy,
    ConsultationPrescription,
    ConsultationVitalSign,
    Document,
    MedicalRecord,
    Person,
    PersonDocument,
)
from services.patient_access import doctor_can_read_patient


class ExpedienteAggregator:
    """Stateless aggregator — inject a `Session` per call."""

    def __init__(self, db: Session) -> None:
        self.db = db

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def build(self, patient_id: int, doctor: Person) -> Dict[str, Any]:
        """Return the complete expediente payload or raise an access error."""
        patient = self._load_patient(patient_id)
        if patient is None:
            raise LookupError("patient_not_found")
        if not doctor_can_read_patient(self.db, doctor, patient):
            raise PermissionError("not_authorized")

        consultations = self._load_consultations(patient_id, doctor)
        consultation_ids = [c.id for c in consultations]
        prescriptions_by_consult = self._prescriptions_by_consultation(consultation_ids)
        vitals_by_consult = self._vitals_by_consultation(consultation_ids)
        studies = self._studies_for_patient(patient_id, doctor)

        return {
            "patient": self._serialize_patient(patient),
            "consultations": [
                self._serialize_consultation(
                    c,
                    prescriptions=prescriptions_by_consult.get(c.id, []),
                    vitals=vitals_by_consult.get(c.id, []),
                )
                for c in consultations
            ],
            "clinical_studies": [self._serialize_study(s) for s in studies],
            "summary": {
                "total_consultations": len(consultations),
                "total_prescriptions": sum(len(v) for v in prescriptions_by_consult.values()),
                "total_vitals": sum(len(v) for v in vitals_by_consult.values()),
                "total_studies": len(studies),
            },
        }

    # ------------------------------------------------------------------
    # Queries
    # ------------------------------------------------------------------

    def _load_patient(self, patient_id: int) -> Optional[Person]:
        return (
            self.db.query(Person)
            .filter(Person.id == patient_id, Person.person_type == "patient")
            .first()
        )

    def _load_consultations(
        self, patient_id: int, doctor: Person
    ) -> List[MedicalRecord]:
        q = self.db.query(MedicalRecord).filter(MedicalRecord.patient_id == patient_id)
        if doctor.person_type != "admin":
            q = q.filter(MedicalRecord.doctor_id == doctor.id)
        return q.order_by(MedicalRecord.consultation_date.desc()).all()

    def _prescriptions_by_consultation(
        self, consultation_ids: List[int]
    ) -> Dict[int, List[ConsultationPrescription]]:
        if not consultation_ids:
            return {}
        rows = (
            self.db.query(ConsultationPrescription)
            .filter(ConsultationPrescription.consultation_id.in_(consultation_ids))
            .all()
        )
        out: Dict[int, List[ConsultationPrescription]] = {}
        for rx in rows:
            out.setdefault(rx.consultation_id, []).append(rx)
        return out

    def _vitals_by_consultation(
        self, consultation_ids: List[int]
    ) -> Dict[int, List[ConsultationVitalSign]]:
        if not consultation_ids:
            return {}
        rows = (
            self.db.query(ConsultationVitalSign)
            .filter(ConsultationVitalSign.consultation_id.in_(consultation_ids))
            .all()
        )
        out: Dict[int, List[ConsultationVitalSign]] = {}
        for vs in rows:
            out.setdefault(vs.consultation_id, []).append(vs)
        return out

    def _studies_for_patient(
        self, patient_id: int, doctor: Person
    ) -> List[ClinicalStudy]:
        q = self.db.query(ClinicalStudy).filter(ClinicalStudy.patient_id == patient_id)
        if doctor.person_type != "admin":
            q = q.filter(ClinicalStudy.doctor_id == doctor.id)
        return q.order_by(ClinicalStudy.ordered_date.desc()).all()

    def _patient_documents(self, patient_id: int) -> Dict[str, str]:
        rows = (
            self.db.query(PersonDocument, Document)
            .join(Document, PersonDocument.document_id == Document.id)
            .filter(
                PersonDocument.person_id == patient_id,
                PersonDocument.is_active.is_(True),
            )
            .all()
        )
        return {doc.name: pd.document_value for pd, doc in rows}

    # ------------------------------------------------------------------
    # Serialisers (shapes the frontend generator consumes)
    # ------------------------------------------------------------------

    def _serialize_patient(self, p: Person) -> Dict[str, Any]:
        docs = self._patient_documents(p.id)
        return {
            "id": p.id,
            "name": p.name,
            "birth_date": _iso_or_none(getattr(p, "birth_date", None)),
            "gender": getattr(p, "gender", None),
            "email": getattr(p, "email", None),
            "phone": getattr(p, "primary_phone", None),
            "civil_status": getattr(p, "civil_status", None),
            "address": getattr(p, "home_address", None),
            "address_city": getattr(p, "address_city", None),
            "emergency_contact_name": getattr(p, "emergency_contact_name", None),
            "emergency_contact_phone": getattr(p, "emergency_contact_phone", None),
            "insurance_provider": getattr(p, "insurance_provider", None),
            "insurance_number": getattr(p, "insurance_number", None),
            "curp": docs.get("CURP"),
            "rfc": docs.get("RFC"),
        }

    def _serialize_consultation(
        self,
        c: MedicalRecord,
        prescriptions: List[ConsultationPrescription],
        vitals: List[ConsultationVitalSign],
    ) -> Dict[str, Any]:
        return {
            "id": c.id,
            "consultation_date": _iso_or_none(c.consultation_date),
            "consultation_type": getattr(c, "consultation_type", None),
            "chief_complaint": getattr(c, "chief_complaint", None),
            "history_present_illness": getattr(c, "history_present_illness", None),
            "family_history": getattr(c, "family_history", None),
            "personal_pathological_history": getattr(c, "personal_pathological_history", None),
            "personal_non_pathological_history": getattr(c, "personal_non_pathological_history", None),
            "physical_examination": getattr(c, "physical_examination", None),
            "primary_diagnosis": getattr(c, "primary_diagnosis", None),
            "secondary_diagnoses": getattr(c, "secondary_diagnoses", None),
            "treatment_plan": getattr(c, "treatment_plan", None),
            "follow_up_instructions": getattr(c, "follow_up_instructions", None),
            "notes": getattr(c, "notes", None),
            "prescriptions": [self._serialize_prescription(rx) for rx in prescriptions],
            "vital_signs": [self._serialize_vital(vs) for vs in vitals],
        }

    def _serialize_prescription(self, rx: ConsultationPrescription) -> Dict[str, Any]:
        med = getattr(rx, "medication", None)
        return {
            "id": rx.id,
            "medication": getattr(med, "name", None) if med else None,
            "dosage": getattr(rx, "dosage", None),
            "frequency": getattr(rx, "frequency", None),
            "duration": getattr(rx, "duration", None),
            "instructions": getattr(rx, "instructions", None),
            "via_administracion": getattr(rx, "via_administracion", None),
        }

    def _serialize_vital(self, vs: ConsultationVitalSign) -> Dict[str, Any]:
        sign = getattr(vs, "vital_sign", None)
        return {
            "id": vs.id,
            "name": getattr(sign, "name", None) if sign else None,
            "value": getattr(vs, "value", None),
            "unit": getattr(vs, "unit", None),
        }

    def _serialize_study(self, s: ClinicalStudy) -> Dict[str, Any]:
        return {
            "id": s.id,
            "study_type": getattr(s, "study_type", None),
            "study_name": getattr(s, "study_name", None),
            "status": getattr(s, "status", None),
            "urgency": getattr(s, "urgency", None),
            "ordered_date": _iso_or_none(getattr(s, "ordered_date", None)),
            "performed_date": _iso_or_none(getattr(s, "performed_date", None)),
        }


def _iso_or_none(value: Any) -> Optional[str]:
    if value is None:
        return None
    try:
        return value.isoformat()
    except AttributeError:
        return str(value)
