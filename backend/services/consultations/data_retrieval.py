"""
Data retrieval helpers for consultation service
"""
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from database import (
    ConsultationVitalSign, ConsultationPrescription, 
    Medication, ClinicalStudy, Person
)

def get_consultation_vital_signs(db: Session, consultation_id: int) -> List[Dict[str, Any]]:
    """
    Get vital signs for a consultation
    """
    vital_signs = db.query(ConsultationVitalSign).filter(
        ConsultationVitalSign.consultation_id == consultation_id
    ).all()
    
    return [
        {
            "id": vs.id,
            "vital_sign_id": vs.vital_sign_id,
            "value": vs.value,
            "unit": vs.unit or "",
            "created_at": vs.created_at.isoformat() if vs.created_at else None
        }
        for vs in vital_signs
    ]


def get_consultation_prescriptions(db: Session, consultation_id: int) -> List[Dict[str, Any]]:
    """
    Get prescriptions for a consultation
    """
    prescriptions = db.query(ConsultationPrescription).join(
        Medication, ConsultationPrescription.medication_id == Medication.id
    ).filter(
        ConsultationPrescription.consultation_id == consultation_id
    ).all()
    
    return [
        {
            "id": rx.id,
            "consultation_id": rx.consultation_id,
            "medication_id": rx.medication_id,
            "medication_name": rx.medication.name if rx.medication else "",
            "dosage": rx.dosage,
            "frequency": rx.frequency,
            "duration": rx.duration,
            "instructions": rx.instructions,
            "quantity": rx.quantity,
            "via_administracion": rx.via_administracion,
            "created_at": rx.created_at.isoformat() if rx.created_at else None
        }
        for rx in prescriptions
    ]


def get_consultation_clinical_studies(db: Session, consultation_id: int) -> List[Dict[str, Any]]:
    """
    Get clinical studies for a consultation
    """
    studies = db.query(ClinicalStudy).filter(
        ClinicalStudy.consultation_id == consultation_id
    ).order_by(ClinicalStudy.created_at.desc()).all()
    
    return [
        {
            "id": study.id,
            "study_name": study.study_name,
            "study_type": study.study_type,
            "description": study.clinical_indication or "",
            "pdf_url": study.file_path,
            "created_at": study.created_at.isoformat() if study.created_at else None
        }
        for study in studies
    ]


def get_patient_info(db: Session, patient_id: Optional[int]) -> tuple[str, Optional[Person]]:
    """
    Get patient information
    """
    if not patient_id:
        return "Paciente No Identificado", None
    
    patient = db.query(Person).filter(
        Person.id == patient_id,
        Person.person_type == "patient"
    ).first()
    
    if patient:
        patient_name = patient.name
        return patient_name, patient
    
    return "Paciente No Identificado", None
