from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date
from models import License, utc_now

# ============================================================================
# LICENSE MANAGEMENT CRUD
# ============================================================================

def create_license(db: Session, license_data, created_by: int):
    """Create a new license for a doctor"""
    # Check if doctor already has an active license
    existing = db.query(License).filter(
        License.doctor_id == license_data.doctor_id,
        License.is_active == True
    ).first()
    
    if existing:
        # Deactivate existing license
        existing.is_active = False
        existing.status = 'inactive'
    
    new_license = License(
        doctor_id=license_data.doctor_id,
        license_type=license_data.license_type,
        start_date=license_data.start_date,
        expiration_date=license_data.expiration_date,
        payment_date=license_data.payment_date,
        status=license_data.status,
        is_active=license_data.is_active,
        notes=license_data.notes,
        created_by=created_by
    )
    db.add(new_license)
    db.commit()
    db.refresh(new_license)
    return new_license

def get_license_by_doctor(db: Session, doctor_id: int) -> Optional[License]:
    """Get active license for a doctor"""
    return db.query(License).filter(
        License.doctor_id == doctor_id,
        License.is_active == True
    ).first()

def get_all_licenses(db: Session, skip: int = 0, limit: int = 100) -> List[License]:
    """Get all licenses"""
    return db.query(License).offset(skip).limit(limit).all()

def update_license(db: Session, license_id: int, license_data) -> Optional[License]:
    """Update a license"""
    license = db.query(License).filter(License.id == license_id).first()
    if not license:
        return None
    
    # Use model_dump for Pydantic v2
    update_data = license_data.model_dump(exclude_unset=True) if hasattr(license_data, 'model_dump') else license_data.dict(exclude_unset=True)
    
    for key, value in update_data.items():
        setattr(license, key, value)
    
    license.updated_at = utc_now()
    db.commit()
    db.refresh(license)
    return license

def check_license_status(db: Session, license: License) -> str:
    """Check and update license status based on expiration date"""
    today = date.today()
    
    if license.expiration_date < today and license.status != 'expired':
        license.status = 'expired'
        license.is_active = False
        db.commit()
        return 'expired'
    
    return license.status
