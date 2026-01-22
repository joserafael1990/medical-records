"""
Doctor profile management endpoints
Refactored to use DoctorService for better code health
"""

from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from typing import Dict, Any

from database import get_db, Person
from dependencies import get_current_user
from services.doctor_service import DoctorService
import schemas

router = APIRouter(prefix="/api", tags=["doctors"])


@router.get("/doctors/me/profile")
async def get_my_profile(
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user)
) -> Dict[str, Any]:
    """Get complete profile of current authenticated doctor"""
    if current_user.person_type != 'doctor':
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only doctors can access this endpoint"
        )
    
    return DoctorService.get_doctor_profile(db, current_user.id)


@router.post("/doctors")
async def create_doctor(
    doctor_data: schemas.DoctorCreate,
    db: Session = Depends(get_db)
):
    """Create new doctor"""
    return DoctorService.create_doctor(db, doctor_data)


@router.put("/doctors/me/profile")
async def update_my_profile(
    request: Request,
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user)
) -> Dict[str, Any]:
    """Update current authenticated doctor's profile"""
    if current_user.person_type != 'doctor':
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only doctors can access this endpoint"
        )
    
    # Read raw request JSON directly to handle mixed document formats
    try:
        raw_json = await request.json()
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid JSON body"
        )
        
    return DoctorService.update_doctor_profile(db, current_user.id, raw_json)
