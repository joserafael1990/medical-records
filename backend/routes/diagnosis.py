"""
Diagnosis catalog API routes based on CIE-10 (ICD-10)
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, and_, or_, text
from typing import List, Optional, Dict, Any
import logging

from database import get_db, StudyCatalog
from models.diagnosis import DiagnosisCategory, DiagnosisCatalog, DiagnosisRecommendation, DiagnosisDifferential
from schemas_diagnosis import (
    DiagnosisCategory as DiagnosisCategorySchema,
    DiagnosisCatalog as DiagnosisCatalogSchema,
    DiagnosisRecommendation as DiagnosisRecommendationSchema,
    DiagnosisDifferential as DiagnosisDifferentialSchema,
    SimpleDiagnosisCategory,
    SimpleDiagnosisCatalog,
    DiagnosisSearchRequest,
    DiagnosisSearchResult,
    DiagnosisRecommendationResult,
    DiagnosisDifferentialResult,
    DiagnosisStats,
    SeverityLevel,
    AgeGroup,
    GenderSpecific,
    RecommendationType,
    PriorityLevel
)
# Temporary authentication bypass for development
def get_current_user():
    """Temporary function to bypass authentication during development"""
    return None

router = APIRouter(prefix="/api/diagnosis", tags=["diagnosis"])
logger = logging.getLogger(__name__)

@router.get("/categories")
async def get_diagnosis_categories(
    is_active: bool = Query(True, description="Filter by active status"),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Get diagnosis categories with optional filtering"""
    try:
        # Use raw SQL - only select columns that exist in DB
        sql = """
        SELECT id, code, name, description, active, created_at
        FROM diagnosis_categories 
        WHERE active = :active
        ORDER BY code
        """
        params = {"active": is_active}
        
        result = db.execute(text(sql), params).fetchall()
        
        # Convert to simple dict format
        categories = []
        for row in result:
            categories.append({
                "id": row.id,
                "code": row.code,
                "name": row.name,
                "description": row.description,
                "is_active": row.active,  # Map 'active' to 'is_active' for API
                "created_at": row.created_at.isoformat() if row.created_at else None
                # parent_id, level, and updated_at don't exist in DB
            })
        
        return categories
    
    except Exception as e:
        logger.error(f"Error getting diagnosis categories: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error retrieving diagnosis categories"
        )

# Add a simple test endpoint
@router.get("/test")
async def test_diagnosis_api():
    """Simple test endpoint to verify the API is working"""
    return {"message": "Diagnosis API is working", "status": "ok"}

@router.get("/categories/{category_id}", response_model=DiagnosisCategorySchema)
async def get_diagnosis_category(
    category_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Get a specific diagnosis category by ID"""
    try:
        category = db.query(DiagnosisCategory).filter(
            DiagnosisCategory.id == category_id,
            DiagnosisCategory.active == True
        ).first()
        
        if not category:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Diagnosis category not found"
            )
        
        return category
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting diagnosis category {category_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error retrieving diagnosis category"
        )

@router.get("/catalog", response_model=List[DiagnosisCatalogSchema])
async def get_diagnosis_catalog(
    category_id: Optional[int] = Query(None, description="Filter by category ID"),
    specialty: Optional[str] = Query(None, description="Filter by medical specialty"),
    severity_level: Optional[SeverityLevel] = Query(None, description="Filter by severity level"),
    is_chronic: Optional[bool] = Query(None, description="Filter by chronic conditions"),
    is_contagious: Optional[bool] = Query(None, description="Filter by contagious conditions"),
    age_group: Optional[AgeGroup] = Query(None, description="Filter by age group"),
    gender_specific: Optional[GenderSpecific] = Query(None, description="Filter by gender specificity"),
    limit: int = Query(100, ge=1, le=500, description="Maximum number of results"),
    offset: int = Query(0, ge=0, description="Number of results to skip"),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Get diagnosis catalog with optional filtering"""
    try:
        query = db.query(DiagnosisCatalog).join(DiagnosisCategory).filter(
            DiagnosisCatalog.active == True
        )
        
        if category_id is not None:
            query = query.filter(DiagnosisCatalog.category_id == category_id)
        
        if specialty is not None:
            query = query.filter(DiagnosisCatalog.specialty.ilike(f"%{specialty}%"))
        
        if severity_level is not None:
            query = query.filter(DiagnosisCatalog.severity_level == severity_level)
        
        if is_chronic is not None:
            query = query.filter(DiagnosisCatalog.is_chronic == is_chronic)
        
        if is_contagious is not None:
            query = query.filter(DiagnosisCatalog.is_contagious == is_contagious)
        
        if age_group is not None:
            query = query.filter(
                or_(
                    DiagnosisCatalog.age_group == age_group,
                    DiagnosisCatalog.age_group == "all"
                )
            )
        
        if gender_specific is not None:
            query = query.filter(
                or_(
                    DiagnosisCatalog.gender_specific == gender_specific,
                    DiagnosisCatalog.gender_specific == "both"
                )
            )
        
        diagnoses = query.options(
            joinedload(DiagnosisCatalog.category)
        ).order_by(DiagnosisCatalog.code).offset(offset).limit(limit).all()
        
        # Convert to response format with proper category serialization
        result = []
        for diagnosis in diagnoses:
            diagnosis_dict = {
                "id": diagnosis.id,
                "code": diagnosis.code,
                "name": diagnosis.name,
                "category_id": diagnosis.category_id,
                "description": diagnosis.description,
                "synonyms": getattr(diagnosis, 'synonyms', None) or [],
                "severity_level": diagnosis.severity_level,
                "is_chronic": diagnosis.is_chronic,
                "is_contagious": diagnosis.is_contagious,
                "age_group": diagnosis.age_group,
                "gender_specific": diagnosis.gender_specific,
                "specialty": diagnosis.specialty,
                "is_active": diagnosis.is_active,
                "created_at": diagnosis.created_at,
                "updated_at": diagnosis.updated_at,
                "category": {
                    "id": diagnosis.category.id,
                    "code": diagnosis.category.code,
                    "name": diagnosis.category.name,
                    "description": diagnosis.category.description,
                    "is_active": diagnosis.category.is_active,
                    "created_at": diagnosis.category.created_at
                    # parent_id, level, and updated_at columns don't exist in DB
                } if diagnosis.category else None
            }
            result.append(diagnosis_dict)
        
        return result
    
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
    current_user = Depends(get_current_user)
):
    """Get a specific diagnosis by ID"""
    try:
        diagnosis = db.query(DiagnosisCatalog).options(
            joinedload(DiagnosisCatalog.category),
            joinedload(DiagnosisCatalog.recommendations).joinedload(DiagnosisRecommendation.recommended_study),
            joinedload(DiagnosisCatalog.primary_differentials).joinedload(DiagnosisDifferential.differential_diagnosis)
        ).filter(
            DiagnosisCatalog.id == diagnosis_id,
            DiagnosisCatalog.active == True
        ).first()
        
        if not diagnosis:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Diagnosis not found"
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
    current_user = Depends(get_current_user)
):
    """Search diagnoses using full-text search"""
    try:
        # Build base query
        query = db.query(DiagnosisCatalog).join(DiagnosisCategory).filter(
            DiagnosisCatalog.active == True
        )
        
        # Add text search (synonyms column doesn't exist in DB, so we only search name, description, and code)
        if search_request.query:
            search_term = f"%{search_request.query}%"
            query = query.filter(
                or_(
                    DiagnosisCatalog.name.ilike(search_term),
                    DiagnosisCatalog.description.ilike(search_term),
                    DiagnosisCatalog.code.ilike(search_term)
                )
            )
        
        # Add filters
        if search_request.specialty:
            query = query.filter(DiagnosisCatalog.specialty.ilike(f"%{search_request.specialty}%"))
        
        if search_request.category_code:
            query = query.filter(DiagnosisCategory.code == search_request.category_code)
        
        if search_request.severity_level:
            query = query.filter(DiagnosisCatalog.severity_level == search_request.severity_level)
        
        if search_request.is_chronic is not None:
            query = query.filter(DiagnosisCatalog.is_chronic == search_request.is_chronic)
        
        if search_request.age_group:
            query = query.filter(
                or_(
                    DiagnosisCatalog.age_group == search_request.age_group,
                    DiagnosisCatalog.age_group == "all"
                )
            )
        
        if search_request.gender_specific:
            query = query.filter(
                or_(
                    DiagnosisCatalog.gender_specific == search_request.gender_specific,
                    DiagnosisCatalog.gender_specific == "both"
                )
            )
        
        # Execute query
        results = query.options(
            joinedload(DiagnosisCatalog.category)
        ).order_by(DiagnosisCatalog.name).offset(
            search_request.offset
        ).limit(search_request.limit).all()
        
        # Convert to search results
        search_results = []
        for diagnosis in results:
            search_results.append(DiagnosisSearchResult(
                id=diagnosis.id,
                code=diagnosis.code,
                name=diagnosis.name,
                description=diagnosis.description,
                category_name=diagnosis.category.name,
                category_code=diagnosis.category.code,
                specialty=diagnosis.specialty,
                severity_level=diagnosis.severity_level,
                is_chronic=diagnosis.is_chronic,
                is_contagious=diagnosis.is_contagious,
                age_group=diagnosis.age_group,
                gender_specific=diagnosis.gender_specific,
                synonyms=getattr(diagnosis, 'synonyms', None) or []
            ))
        
        return search_results
    
    except Exception as e:
        logger.error(f"Error searching diagnoses: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error searching diagnoses"
        )

@router.get("/catalog/{diagnosis_id}/recommendations", response_model=DiagnosisRecommendationResult)
async def get_diagnosis_recommendations(
    diagnosis_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Get recommended studies for a specific diagnosis"""
    try:
        # Get diagnosis
        diagnosis = db.query(DiagnosisCatalog).filter(
            DiagnosisCatalog.id == diagnosis_id,
            DiagnosisCatalog.active == True
        ).first()
        
        if not diagnosis:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Diagnosis not found"
            )
        
        # Get recommendations
        recommendations = db.query(DiagnosisRecommendation).options(
            joinedload(DiagnosisRecommendation.recommended_study)
        ).filter(
            DiagnosisRecommendation.diagnosis_id == diagnosis_id
        ).order_by(
            DiagnosisRecommendation.priority,
            DiagnosisRecommendation.recommendation_type
        ).all()
        
        # Format recommendations
        recommended_studies = []
        for rec in recommendations:
            recommended_studies.append({
                "id": rec.id,
                "study": {
                    "id": rec.recommended_study.id,
                    "code": rec.recommended_study.code,
                    "name": rec.recommended_study.name,
                    "description": rec.recommended_study.description,
                    "specialty": rec.recommended_study.specialty,
                    "duration_hours": rec.recommended_study.duration_hours
                },
                "recommendation_type": rec.recommendation_type,
                "priority": rec.priority,
                "notes": rec.notes
            })
        
        return DiagnosisRecommendationResult(
            diagnosis=diagnosis,
            recommended_studies=recommended_studies
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting diagnosis recommendations {diagnosis_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error retrieving diagnosis recommendations"
        )

@router.get("/catalog/{diagnosis_id}/differentials", response_model=DiagnosisDifferentialResult)
async def get_diagnosis_differentials(
    diagnosis_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Get differential diagnoses for a specific diagnosis"""
    try:
        # Get diagnosis
        diagnosis = db.query(DiagnosisCatalog).filter(
            DiagnosisCatalog.id == diagnosis_id,
            DiagnosisCatalog.active == True
        ).first()
        
        if not diagnosis:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Diagnosis not found"
            )
        
        # Get differentials
        differentials = db.query(DiagnosisDifferential).options(
            joinedload(DiagnosisDifferential.differential_diagnosis)
        ).filter(
            DiagnosisDifferential.primary_diagnosis_id == diagnosis_id
        ).order_by(
            DiagnosisDifferential.similarity_score.desc()
        ).all()
        
        # Format differentials
        differential_diagnoses = []
        for diff in differentials:
            differential_diagnoses.append({
                "id": diff.id,
                "diagnosis": {
                    "id": diff.differential_diagnosis.id,
                    "code": diff.differential_diagnosis.code,
                    "name": diff.differential_diagnosis.name,
                    "description": diff.differential_diagnosis.description,
                    "specialty": diff.differential_diagnosis.specialty,
                    "severity_level": diff.differential_diagnosis.severity_level
                },
                "similarity_score": float(diff.similarity_score) if diff.similarity_score else None,
                "notes": diff.notes
            })
        
        return DiagnosisDifferentialResult(
            primary_diagnosis=diagnosis,
            differential_diagnoses=differential_diagnoses
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting diagnosis differentials {diagnosis_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error retrieving diagnosis differentials"
        )

@router.get("/stats", response_model=DiagnosisStats)
async def get_diagnosis_stats(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Get diagnosis catalog statistics"""
    try:
        # Total counts (using 'active' column name from database)
        total_diagnoses = db.query(DiagnosisCatalog).filter(DiagnosisCatalog.active == True).count()
        total_categories = db.query(DiagnosisCategory).filter(DiagnosisCategory.active == True).count()
        
        # Diagnoses by specialty
        specialty_stats = db.query(
            DiagnosisCatalog.specialty,
            func.count(DiagnosisCatalog.id).label('count')
        ).filter(
            DiagnosisCatalog.active == True,
            DiagnosisCatalog.specialty.isnot(None)
        ).group_by(DiagnosisCatalog.specialty).all()
        
        diagnoses_by_specialty = {stat.specialty: stat.count for stat in specialty_stats}
        
        # Diagnoses by severity
        severity_stats = db.query(
            DiagnosisCatalog.severity_level,
            func.count(DiagnosisCatalog.id).label('count')
        ).filter(
            DiagnosisCatalog.active == True,
            DiagnosisCatalog.severity_level.isnot(None)
        ).group_by(DiagnosisCatalog.severity_level).all()
        
        diagnoses_by_severity = {stat.severity_level: stat.count for stat in severity_stats}
        
        # Chronic and contagious conditions
        chronic_conditions = db.query(DiagnosisCatalog).filter(
            DiagnosisCatalog.active == True,
            DiagnosisCatalog.is_chronic == True
        ).count()
        
        contagious_conditions = db.query(DiagnosisCatalog).filter(
            DiagnosisCatalog.active == True,
            DiagnosisCatalog.is_contagious == True
        ).count()
        
        return DiagnosisStats(
            total_diagnoses=total_diagnoses,
            total_categories=total_categories,
            diagnoses_by_specialty=diagnoses_by_specialty,
            diagnoses_by_severity=diagnoses_by_severity,
            chronic_conditions=chronic_conditions,
            contagious_conditions=contagious_conditions
        )
    
    except Exception as e:
        logger.error(f"Error getting diagnosis stats: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error retrieving diagnosis statistics"
        )

@router.get("/specialties", response_model=List[str])
async def get_diagnosis_specialties(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Get list of all medical specialties in the diagnosis catalog"""
    try:
        specialties = db.query(DiagnosisCatalog.specialty).filter(
            DiagnosisCatalog.active == True,
            DiagnosisCatalog.specialty.isnot(None)
        ).distinct().order_by(DiagnosisCatalog.specialty).all()
        
        return [specialty[0] for specialty in specialties]
    
    except Exception as e:
        logger.error(f"Error getting diagnosis specialties: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error retrieving diagnosis specialties"
        )
