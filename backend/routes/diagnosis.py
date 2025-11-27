"""
Diagnosis catalog API routes based on CIE-10 (ICD-10)
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_, text
from typing import List, Optional, Dict, Any
import logging

from database import get_db, StudyCatalog, Person
from models.diagnosis import DiagnosisCatalog
from schemas_diagnosis import (
    DiagnosisCatalog as DiagnosisCatalogSchema,
    DiagnosisCatalogCreate,
    # DiagnosisCategory removed - not required by law
    # DiagnosisRecommendation and DiagnosisDifferential schemas removed - tables deleted
    DiagnosisSearchRequest,
    DiagnosisSearchResult,
    # DiagnosisRecommendationResult and DiagnosisDifferentialResult removed - tables deleted
    DiagnosisStats
)
from dependencies import get_current_user

router = APIRouter(prefix="/api/diagnosis", tags=["diagnosis"])
logger = logging.getLogger(__name__)

# Diagnosis categories endpoints removed - diagnosis_categories table eliminated (not required by law)
# Only code and name are required for CIE-10 catalog compliance (NOM-004-SSA3-2012, NOM-024-SSA3-2012)

def filter_diagnoses_by_creator(query, current_user: Optional[Person] = None):
    """
    Filter diagnoses to show system diagnoses (created_by=0) and doctor's own diagnoses (created_by=doctor_id)
    If current_user is None or not a doctor, show all diagnoses
    """
    if current_user and current_user.person_type == 'doctor':
        # Show system diagnoses (created_by=0) OR doctor's own diagnoses (created_by=doctor_id)
        query = query.filter(
            or_(
                DiagnosisCatalog.created_by == 0,
                DiagnosisCatalog.created_by == current_user.id
            )
        )
    # If current_user is None or not a doctor, show all diagnoses (no filter)
    return query

# Disabled for security - endpoint without authentication
# @router.get("/test")
# async def test_diagnosis_api():
#     """Simple test endpoint to verify the API is working"""
#     return {"message": "Diagnosis API is working", "status": "ok"}

@router.get("/catalog", response_model=List[DiagnosisCatalogSchema])
async def get_diagnosis_catalog(
    limit: int = Query(100, ge=1, le=500, description="Maximum number of results"),
    offset: int = Query(0, ge=0, description="Number of results to skip"),
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user)
):
    """Get diagnosis catalog
    Compliance: NOM-004-SSA3-2012, NOM-024-SSA3-2012 - CIE-10 catalog
    Shows system diagnoses (created_by=0) and doctor's own diagnoses (created_by=doctor_id)
    Only code and name are required by law
    """
    try:
        query = db.query(DiagnosisCatalog).filter(
            DiagnosisCatalog.is_active == True
        )
        
        # Filter by creator: system (created_by=0) OR doctor's own (created_by=doctor_id)
        query = filter_diagnoses_by_creator(query, current_user)
        
        diagnoses = query.order_by(DiagnosisCatalog.code).offset(offset).limit(limit).all()
        
        # Return diagnoses directly - schema will handle serialization
        return diagnoses
    
    except Exception as e:
        logger.error(f"Error getting diagnosis catalog: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error retrieving diagnosis catalog"
        )

@router.get("/catalog/{diagnosis_id}", response_model=DiagnosisCatalogSchema)
async def get_diagnosis(
    diagnosis_id: int,
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user)
):
    """Get a specific diagnosis by ID
    Compliance: NOM-004-SSA3-2012, NOM-024-SSA3-2012 - CIE-10 catalog
    Doctors can only access system diagnoses (created_by=0) or their own diagnoses (created_by=doctor_id)
    """
    try:
        query = db.query(DiagnosisCatalog).filter(
            DiagnosisCatalog.id == diagnosis_id,
            DiagnosisCatalog.is_active == True
        )
        
        # Filter by creator: system (created_by=0) OR doctor's own (created_by=doctor_id)
        query = filter_diagnoses_by_creator(query, current_user)
        
        diagnosis = query.first()
        
        if not diagnosis:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Diagnosis not found or access denied"
            )
        
        return diagnosis
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting diagnosis {diagnosis_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error retrieving diagnosis"
        )

@router.post("/search", response_model=List[DiagnosisSearchResult])
async def search_diagnoses(
    search_request: DiagnosisSearchRequest,
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user)
):
    """Search diagnoses using full-text search
    Compliance: NOM-004-SSA3-2012, NOM-024-SSA3-2012 - CIE-10 catalog
    Shows system diagnoses (created_by=0) and doctor's own diagnoses (created_by=doctor_id)
    """
    try:
        logger.info(f"🔍 Searching diagnoses with query: {search_request.query}")
        
        # Build base query
        query = db.query(DiagnosisCatalog).filter(
            DiagnosisCatalog.is_active == True
        )
        
        # Filter by creator: system (created_by=0) OR doctor's own (created_by=doctor_id)
        query = filter_diagnoses_by_creator(query, current_user)
        
        # Add text search (only search name and code)
        if search_request.query:
            search_term = f"%{search_request.query}%"
            logger.info(f"🔍 Using search term: {search_term}")
            query = query.filter(
                or_(
                    DiagnosisCatalog.name.ilike(search_term),
                    DiagnosisCatalog.code.ilike(search_term)
                )
            )
        
        # Execute query
        logger.info(f"🔍 Executing search query with limit: {search_request.limit}, offset: {search_request.offset}")
        results = query.order_by(DiagnosisCatalog.name).offset(
            search_request.offset
        ).limit(search_request.limit).all()
        
        logger.info(f"🔍 Found {len(results)} diagnoses matching search criteria")
        
        # Convert to search results
        search_results = []
        for diagnosis in results:
            search_results.append(DiagnosisSearchResult(
                id=diagnosis.id,
                code=diagnosis.code,
                name=diagnosis.name,
                created_by=diagnosis.created_by
            ))
        
        logger.info(f"🔍 Returning {len(search_results)} search results")
        return search_results
    
    except Exception as e:
        logger.error(f"Error searching diagnoses: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error searching diagnoses"
        )

# Diagnosis recommendations and differentials endpoints removed - tables deleted

@router.post("/catalog", response_model=DiagnosisCatalogSchema, status_code=status.HTTP_201_CREATED)
async def create_diagnosis(
    diagnosis_data: DiagnosisCatalogCreate,
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user)
):
    """Create a new diagnosis
    Compliance: NOM-004-SSA3-2012, NOM-024-SSA3-2012 - CIE-10 catalog
    Only doctors can create diagnoses. The created_by field is set automatically to the doctor's ID.
    """
    try:
        # Verify user is a doctor
        if current_user.person_type != 'doctor':
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only doctors can create diagnoses"
            )
        
        # Check if diagnosis code already exists (only if code is not empty)
        if diagnosis_data.code and diagnosis_data.code.strip():
            existing_diagnosis = db.query(DiagnosisCatalog).filter(
                DiagnosisCatalog.code == diagnosis_data.code
            ).first()
            
            if existing_diagnosis:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Diagnosis with code '{diagnosis_data.code}' already exists"
                )
        
        # For custom diagnoses without code, check if name already exists for this doctor
        if not diagnosis_data.code or not diagnosis_data.code.strip():
            existing_by_name = db.query(DiagnosisCatalog).filter(
                DiagnosisCatalog.name.ilike(diagnosis_data.name.strip()),
                DiagnosisCatalog.created_by == current_user.id
            ).first()
            
            if existing_by_name:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Ya tienes un diagnóstico con el nombre '{diagnosis_data.name}'"
                )
        
        # Create new diagnosis
        # Use empty string for code if not provided
        diagnosis_code = (diagnosis_data.code or "").strip()
        new_diagnosis = DiagnosisCatalog(
            code=diagnosis_code,
            name=diagnosis_data.name.strip(),
            is_active=diagnosis_data.is_active,
            created_by=current_user.id  # Set created_by to doctor's ID
        )
        
        db.add(new_diagnosis)
        db.commit()
        db.refresh(new_diagnosis)
        
        logger.info(f"✅ Created new diagnosis: {new_diagnosis.code} - {new_diagnosis.name} (created_by={new_diagnosis.created_by})")
        
        return new_diagnosis
    
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating diagnosis: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error creating diagnosis"
        )

@router.get("/stats", response_model=DiagnosisStats)
async def get_diagnosis_stats(
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user)
):
    """Get diagnosis catalog statistics
    Compliance: NOM-004-SSA3-2012, NOM-024-SSA3-2012 - CIE-10 catalog
    Shows statistics for system diagnoses (created_by=0) and doctor's own diagnoses (created_by=doctor_id)
    """
    try:
        # Build base query
        query = db.query(DiagnosisCatalog).filter(
            DiagnosisCatalog.is_active == True
        )
        
        # Filter by creator: system (created_by=0) OR doctor's own (created_by=doctor_id)
        query = filter_diagnoses_by_creator(query, current_user)
        
        # Total counts
        total_diagnoses = query.count()
        
        return DiagnosisStats(
            total_diagnoses=total_diagnoses
        )
    
    except Exception as e:
        logger.error(f"Error getting diagnosis stats: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error retrieving diagnosis statistics"
        )

@router.get("/catalog-status")
async def get_catalog_status(
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user)
):
    """
    Get CIE-10 catalog status and compliance information
    Compliance: NOM-004-SSA3-2012 - Verify catalog version and status
    Shows status for system diagnoses (created_by=0) and doctor's own diagnoses (created_by=doctor_id)
    """
    try:
        from catalog_metadata import get_catalog_version, CATALOG_METADATA
        
        # Get catalog metadata
        catalog_info = CATALOG_METADATA.get("diagnosis_catalog", {})
        catalog_version = catalog_info.get("version", "Unknown")
        
        # Build base query
        query = db.query(DiagnosisCatalog).filter(
            DiagnosisCatalog.is_active == True
        )
        
        # Filter by creator: system (created_by=0) OR doctor's own (created_by=doctor_id)
        query = filter_diagnoses_by_creator(query, current_user)
        
        # Get catalog statistics
        total_diagnoses = query.count()
        diagnoses_with_code = query.filter(
            DiagnosisCatalog.code.isnot(None),
            DiagnosisCatalog.code != ''
        ).count()
        diagnoses_with_name = query.filter(
            DiagnosisCatalog.name.isnot(None),
            DiagnosisCatalog.name != ''
        ).count()
        
        # Calculate compliance percentage
        compliance_percentage = 100.0 if total_diagnoses > 0 and diagnoses_with_code == total_diagnoses and diagnoses_with_name == total_diagnoses else 0.0
        
        # Check if catalog meets minimum requirements
        min_records = catalog_info.get("min_records", 0)
        meets_minimum = total_diagnoses >= min_records
        
        return {
            "catalog_name": catalog_info.get("name", "CIE-10 Diagnósticos"),
            "version": catalog_version,
            "official_source": catalog_info.get("official_source", "Unknown"),
            "norm_reference": catalog_info.get("norm_reference", "NOM-004-SSA3-2012, NOM-024-SSA3-2012"),
            "status": "active" if meets_minimum and compliance_percentage == 100.0 else "needs_attention",
            "total_diagnoses": total_diagnoses,
            "diagnoses_with_code": diagnoses_with_code,
            "diagnoses_with_name": diagnoses_with_name,
            "compliance_percentage": compliance_percentage,
            "meets_minimum_requirements": meets_minimum,
            "min_records_required": min_records,
            "compliance_required": catalog_info.get("compliance_required", True),
            "validation_enabled": catalog_info.get("validation_enabled", True),
            "compliance_note": "Catalog complies with NOM-004-SSA3-2012 requirements" if compliance_percentage == 100.0 and meets_minimum else "Catalog needs attention to meet NOM-004-SSA3-2012 requirements",
            "note": catalog_info.get("note", "")
        }
    
    except Exception as e:
        logger.error(f"Error getting catalog status: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error retrieving catalog status"
        )
