"""
Prescription management endpoints for consultations
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from database import get_db, Person, ConsultationPrescription, MedicalRecord, Medication
from dependencies import get_current_user
from logger import get_logger

api_logger = get_logger("medical_records.api")

router = APIRouter(prefix="/api", tags=["prescriptions"])


@router.get("/consultations/{consultation_id}/prescriptions")
async def get_consultation_prescriptions(
    consultation_id: int,
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user)
):
    """Get all prescriptions for a consultation"""
    # Verify consultation belongs to current doctor
    consultation = db.query(MedicalRecord).filter(
        MedicalRecord.id == consultation_id,
        MedicalRecord.doctor_id == current_user.id
    ).first()
    
    if not consultation:
        raise HTTPException(status_code=404, detail="Consultation not found")
    
    # Get prescriptions
    prescriptions = db.query(ConsultationPrescription).filter(
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


@router.post("/consultations/{consultation_id}/prescriptions")
async def create_consultation_prescription(
    consultation_id: int,
    prescription_data: dict,
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user)
):
    """Create a new prescription for a consultation"""
    # Verify consultation belongs to current doctor
    consultation = db.query(MedicalRecord).filter(
        MedicalRecord.id == consultation_id,
        MedicalRecord.doctor_id == current_user.id
    ).first()
    
    if not consultation:
        raise HTTPException(status_code=404, detail="Consultation not found")
    
    # Verify medication exists
    medication_id = prescription_data.get("medication_id")
    if medication_id:
        medication = db.query(Medication).filter(Medication.id == medication_id).first()
        if not medication:
            raise HTTPException(status_code=404, detail="Medication not found")
    
    # Create prescription
    prescription = ConsultationPrescription(
        consultation_id=consultation_id,
        medication_id=prescription_data.get("medication_id"),
        dosage=prescription_data.get("dosage", ""),
        frequency=prescription_data.get("frequency", ""),
        duration=prescription_data.get("duration", ""),
        instructions=prescription_data.get("instructions"),
        quantity=prescription_data.get("quantity"),
        via_administracion=prescription_data.get("via_administracion")
    )
    
    db.add(prescription)
    db.commit()
    db.refresh(prescription)
    
    api_logger.info(
        "✅ Prescription created",
        extra={
            "consultation_id": consultation_id,
            "prescription_id": prescription.id,
            "medication_id": medication_id
        }
    )
    
    return {
        "id": prescription.id,
        "consultation_id": prescription.consultation_id,
        "medication_id": prescription.medication_id,
        "medication_name": prescription.medication.name if prescription.medication else "",
        "dosage": prescription.dosage,
        "frequency": prescription.frequency,
        "duration": prescription.duration,
        "instructions": prescription.instructions,
        "quantity": prescription.quantity,
        "via_administracion": prescription.via_administracion,
        "created_at": prescription.created_at.isoformat() if prescription.created_at else None
    }


@router.put("/consultations/{consultation_id}/prescriptions/{prescription_id}")
async def update_consultation_prescription(
    consultation_id: int,
    prescription_id: int,
    prescription_data: dict,
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user)
):
    """Update a prescription"""
    # Verify consultation belongs to current doctor
    consultation = db.query(MedicalRecord).filter(
        MedicalRecord.id == consultation_id,
        MedicalRecord.doctor_id == current_user.id
    ).first()
    
    if not consultation:
        raise HTTPException(status_code=404, detail="Consultation not found")
    
    # Get prescription
    prescription = db.query(ConsultationPrescription).filter(
        ConsultationPrescription.id == prescription_id,
        ConsultationPrescription.consultation_id == consultation_id
    ).first()
    
    if not prescription:
        raise HTTPException(status_code=404, detail="Prescription not found")
    
    # Update fields
    if "medication_id" in prescription_data:
        prescription.medication_id = prescription_data["medication_id"]
    if "dosage" in prescription_data:
        prescription.dosage = prescription_data["dosage"]
    if "frequency" in prescription_data:
        prescription.frequency = prescription_data["frequency"]
    if "duration" in prescription_data:
        prescription.duration = prescription_data["duration"]
    if "instructions" in prescription_data:
        prescription.instructions = prescription_data["instructions"]
    if "quantity" in prescription_data:
        prescription.quantity = prescription_data["quantity"]
    if "via_administracion" in prescription_data:
        prescription.via_administracion = prescription_data["via_administracion"]
    
    db.commit()
    db.refresh(prescription)
    
    return {
        "id": prescription.id,
        "consultation_id": prescription.consultation_id,
        "medication_id": prescription.medication_id,
        "medication_name": prescription.medication.name if prescription.medication else "",
        "dosage": prescription.dosage,
        "frequency": prescription.frequency,
        "duration": prescription.duration,
        "instructions": prescription.instructions,
        "quantity": prescription.quantity,
        "via_administracion": prescription.via_administracion,
        "created_at": prescription.created_at.isoformat() if prescription.created_at else None
    }


@router.delete("/consultations/{consultation_id}/prescriptions/{prescription_id}")
async def delete_consultation_prescription(
    consultation_id: int,
    prescription_id: int,
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user)
):
    """Delete a prescription"""
    # Verify consultation belongs to current doctor
    consultation = db.query(MedicalRecord).filter(
        MedicalRecord.id == consultation_id,
        MedicalRecord.doctor_id == current_user.id
    ).first()
    
    if not consultation:
        raise HTTPException(status_code=404, detail="Consultation not found")
    
    # Get prescription
    prescription = db.query(ConsultationPrescription).filter(
        ConsultationPrescription.id == prescription_id,
        ConsultationPrescription.consultation_id == consultation_id
    ).first()
    
    if not prescription:
        raise HTTPException(status_code=404, detail="Prescription not found")
    
    db.delete(prescription)
    db.commit()
    
    api_logger.info(
        "🗑️ Prescription deleted",
        extra={
            "consultation_id": consultation_id,
            "prescription_id": prescription_id
        }
    )
    
    return {"message": "Prescription deleted successfully"}
