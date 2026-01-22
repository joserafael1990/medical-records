from sqlalchemy.orm import Session, joinedload
from sqlalchemy import desc
from typing import List, Optional
from fastapi import HTTPException
from models import MedicalRecord, utc_now
import schemas
from logger import get_logger

api_logger = get_logger("medical_records.api")

# ============================================================================
# MEDICAL RECORD OPERATIONS
# ============================================================================

def create_medical_record(db: Session, record_data: schemas.MedicalRecordCreate) -> MedicalRecord:
    """Create a new medical record"""
    api_logger.debug(
        "🔬 Creating medical record",
        extra={
            "patient_id": record_data.patient_id,
            "doctor_id": record_data.doctor_id,
            "has_laboratory_analysis": bool(record_data.laboratory_analysis)
        }
    )
    
    # Generate record code
    last_record = db.query(MedicalRecord).order_by(desc(MedicalRecord.id)).first()
    record_number = (last_record.id + 1) if last_record else 1
    record_code = f"MR{record_number:08d}"
    
    db_record = MedicalRecord(
        record_code=record_code,
        **record_data.model_dump()
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
    
    update_data = record_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(record, field, value)
    
    record.updated_at = utc_now()
    db.commit()
    db.refresh(record)
    return record
