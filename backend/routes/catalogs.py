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
    try:
        countries = crud.get_countries(db, active=True)
        return [
            {
                "id": country.id,
                "name": country.name,
                "phone_code": country.phone_code,
                "is_active": country.is_active,
                "created_at": country.created_at.isoformat() if country.created_at else None
            }
            for country in countries
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting countries: {str(e)}")


@router.get("/states")
async def get_states(
    country_id: Optional[int] = Query(None),
    db: Session = Depends(get_db)
):
    """Get list of states"""
    try:
        states = crud.get_states(db, country_id=country_id, active=True)
        return [
            {
                "id": state.id,
                "name": state.name,
                "country_id": state.country_id,
                "is_active": state.is_active,
                "created_at": state.created_at.isoformat() if state.created_at else None
            }
            for state in states
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting states: {str(e)}")


@router.get("/emergency-relationships")
async def get_emergency_relationships(db: Session = Depends(get_db)):
    """Get list of emergency relationships"""
    return crud.get_emergency_relationships(db, active=True)


@router.get("/timezones")
async def get_timezones():
    """Get list of available timezones for doctor offices"""
    timezone_options = get_timezone_options()
    return [{"value": tz[0], "label": tz[1]} for tz in timezone_options]


@router.get("/stats")
async def get_catalog_stats(db: Session = Depends(get_db)):
    """Get catalog statistics - useful for debugging"""
    try:
        from models import Country, State, Specialty
        return {
            "countries": {
                "total": db.query(Country).count(),
                "active": db.query(Country).filter(Country.is_active == True).count()
            },
            "states": {
                "total": db.query(State).count(),
                "active": db.query(State).filter(State.is_active == True).count()
            },
            "specialties": {
                "total": db.query(Specialty).count(),
                "active": db.query(Specialty).filter(Specialty.is_active == True).count()
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting stats: {str(e)}")
