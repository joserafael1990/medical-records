"""
Medication management endpoints
Migrated from main_clean_english.py to improve code organization
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional

from database import get_db, Person, Medication
from dependencies import get_current_user

router = APIRouter(prefix="/api", tags=["medications"])


@router.get("/medications")
async def get_medications(
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user)
):
    """Get all medications or search by name (returns unique medications by name)"""
    print(f"💊 Getting medications. Search term: {search}")
    
    try:
        # Use DISTINCT ON to get unique medications by name (keeping the first one by id)
        if search:
            # For search, get distinct names and return the first medication with each name
            query = db.query(Medication).filter(Medication.name.ilike(f"%{search}%")).order_by(Medication.name, Medication.id)
        else:
            query = db.query(Medication).order_by(Medication.name, Medication.id)
        
        medications = query.all()
        
        # Filter duplicates by name, keeping only the first occurrence (lowest id)
        seen_names = {}
        medications_data = []
        for medication in medications:
            name_lower = medication.name.lower().strip()
            if name_lower not in seen_names:
                seen_names[name_lower] = True
            medication_data = {
                "id": medication.id,
                "name": medication.name,
                "created_at": medication.created_at.isoformat() if medication.created_at else None
            }
            medications_data.append(medication_data)
        
        print(f"✅ Found {len(medications_data)} unique medications (from {len(medications)} total)")
        return medications_data
        
    except Exception as e:
        print(f"❌ Error getting medications: {e}")
        raise HTTPException(status_code=500, detail="Error retrieving medications")


@router.post("/medications")
async def create_medication(
    medication_data: dict,
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user)
):
    """Create a new medication"""
    print(f"💊 Creating new medication: {medication_data}")
    
    try:
        # Check if medication already exists
        existing_medication = db.query(Medication).filter(
            Medication.name.ilike(medication_data.get('name'))
        ).first()
        
        if existing_medication:
            # Return existing medication instead of creating duplicate
            return {
                "id": existing_medication.id,
                "name": existing_medication.name,
                "created_at": existing_medication.created_at.isoformat() if existing_medication.created_at else None
            }
        
        # Create new medication with created_by set to current user
        new_medication = Medication(
            name=medication_data.get('name'),
            created_by=current_user.id,
            is_active=True
        )
        
        db.add(new_medication)
        db.commit()
        db.refresh(new_medication)
        
        response_data = {
            "id": new_medication.id,
            "name": new_medication.name,
            "is_active": new_medication.is_active,
            "created_by": new_medication.created_by,
            "created_at": new_medication.created_at.isoformat() if new_medication.created_at else None
        }
        
        print(f"✅ Created medication {new_medication.id}")
        return response_data
        
    except Exception as e:
        print(f"❌ Error creating medication: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Error creating medication")
