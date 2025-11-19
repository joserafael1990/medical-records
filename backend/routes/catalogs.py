"""
Catalog endpoints (specialties, countries, states, emergency relationships, timezones)
Migrated from main_clean_english.py to improve code organization
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional

from database import get_db
import crud
from timezone_list import get_timezone_options

router = APIRouter(prefix="/api/catalogs", tags=["catalogs"])


@router.get("/specialties")
async def get_specialties(db: Session = Depends(get_db)):
    """Get list of medical specialties from medical_specialties table"""
    try:
        specialties = crud.get_specialties(db, active=True)
        return [
            {
                "id": spec.id,
                "name": spec.name,
                "is_active": spec.is_active,
                "created_at": spec.created_at.isoformat() if spec.created_at else None
            }
            for spec in specialties
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting specialties: {str(e)}")


@router.get("/countries")
async def get_countries(db: Session = Depends(get_db)):
    """Get list of countries"""
    return crud.get_countries(db, active=True)


@router.get("/states")
async def get_states(
    country_id: Optional[int] = Query(None),
    db: Session = Depends(get_db)
):
    """Get list of states"""
    return crud.get_states(db, country_id=country_id, active=True)


@router.get("/emergency-relationships")
async def get_emergency_relationships(db: Session = Depends(get_db)):
    """Get list of emergency relationships"""
    return crud.get_emergency_relationships(db, active=True)


@router.get("/timezones")
async def get_timezones():
    """Get list of available timezones for doctor offices"""
    timezone_options = get_timezone_options()
    return [{"value": tz[0], "label": tz[1]} for tz in timezone_options]
