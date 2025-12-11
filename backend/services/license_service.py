"""
License Service
Handles license validation and status management
"""

from sqlalchemy.orm import Session
from datetime import date, datetime
from typing import Optional
from fastapi import HTTPException, status

from database import License, Person
from logger import get_logger
from utils.datetime_utils import utc_now

logger = get_logger("medical_records.license_service")

class LicenseService:
    @staticmethod
    def get_current_license(db: Session, doctor_id: int) -> Optional[License]:
        """Get current active license for a doctor"""
        license = db.query(License).filter(
            License.doctor_id == doctor_id,
            License.is_active == True
        ).first()
        
        if license:
            # Auto-update status if expired
            LicenseService.check_and_update_status(db, license)
        
        return license
    
    @staticmethod
    def check_and_update_status(db: Session, license: License) -> License:
        """Check expiration and update status automatically"""
        today = date.today()
        
        if license.expiration_date < today:
            if license.status != 'expired':
                license.status = 'expired'
                license.is_active = False
                license.updated_at = utc_now()
                db.commit()
                logger.info(f"License {license.id} expired automatically")
        
        return license
    
    @staticmethod
    def is_license_valid(db: Session, doctor_id: int) -> bool:
        """Check if doctor has a valid active license"""
        license = LicenseService.get_current_license(db, doctor_id)
        if not license:
            return False
        
        return license.status == 'active' and license.is_active
    
    # Sentinel value to indicate table doesn't exist
    _LICENSE_TABLE_MISSING = object()
    
    @staticmethod
    def require_valid_license(db: Session, doctor_id: int) -> Optional[License]:
        """
        Require a valid active license, raise exception if not valid.
        If the licenses table doesn't exist, skip validation (allows login during migration).
        Returns:
            License object if valid, None if table doesn't exist (skip validation)
        """
        try:
            license = LicenseService.get_current_license(db, doctor_id)
        except Exception as e:
            # If the licenses table doesn't exist, skip license validation
            # This allows the system to work while migrations are pending
            error_msg = str(e).lower()
            if "relation" in error_msg and "does not exist" in error_msg:
                logger.warning(f"Licenses table not found, skipping license validation for doctor {doctor_id}")
                # Rollback the failed transaction so the session is usable
                db.rollback()
                return None  # Skip license validation, allow login
            # Re-raise other database errors
            raise
        
        # If we get here, table exists but no license found
        if not license:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No active license found. Please contact administrator."
            )
        
        if license.status != 'active' or not license.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"License is {license.status}. Please contact administrator."
            )
        
        return license


