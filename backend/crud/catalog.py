from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from backend.models import (
    Country, State, Specialty, EmergencyRelationship,
    StudyCategory, StudyCatalog
)

# ============================================================================
# CATALOG OPERATIONS
# ============================================================================

def get_countries(db: Session, active: bool = True) -> List[Country]:
    """Get list of countries"""
    query = db.query(Country)
    if active:
        query = query.filter(Country.is_active == True)
    return query.order_by(Country.name).all()

def get_states(db: Session, country_id: Optional[int] = None, active: bool = True) -> List[State]:
    """Get list of states"""
    query = db.query(State)
    if active:
        query = query.filter(State.is_active == True)
    if country_id:
        query = query.filter(State.country_id == country_id)
    return query.order_by(State.name).all()

def get_specialties(db: Session, active: bool = True) -> List[Specialty]:
    """Get list of medical specialties"""
    query = db.query(Specialty)
    if active:
        query = query.filter(Specialty.is_active == True)
    return query.order_by(Specialty.name).all()

def get_emergency_relationships(db: Session, active: bool = True) -> List[EmergencyRelationship]:
    """Get list of emergency relationships"""
    query = db.query(EmergencyRelationship)
    if active:
        query = query.filter(EmergencyRelationship.is_active == True)
    return query.order_by(EmergencyRelationship.code).all()

def get_paises(db: Session, activo: bool = True) -> List[Country]:
    """Obtener lista de países (Alias for get_countries)"""
    return get_countries(db, active=activo)

def get_estados(db: Session, pais_id: Optional[int] = None, activo: bool = True) -> List[State]:
    """Obtener lista de estados (Alias for get_states)"""
    return get_states(db, country_id=pais_id, active=activo)

# ============================================================================
# STUDY CATALOG CRUD OPERATIONS
# ============================================================================

def get_study_categories(db: Session, skip: int = 0, limit: int = 100) -> List[StudyCategory]:
    """Get all study categories"""
    return db.query(StudyCategory).filter(StudyCategory.is_active == True).offset(skip).limit(limit).all()

def get_study_category(db: Session, category_id: int) -> Optional[StudyCategory]:
    """Get study category by ID"""
    return db.query(StudyCategory).filter(StudyCategory.id == category_id).first()

def get_study_catalog(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    category_id: Optional[int] = None,
    search: Optional[str] = None
) -> List[StudyCatalog]:
    """Get studies from catalog with filters"""
    query = db.query(StudyCatalog).options(
        joinedload(StudyCatalog.category)
    ).join(StudyCategory).filter(StudyCatalog.is_active == True)
    
    if category_id:
        query = query.filter(StudyCatalog.category_id == category_id)
    
    if search:
        query = query.filter(
            StudyCatalog.name.ilike(f"%{search}%")
        )
    
    return query.offset(skip).limit(limit).all()

def get_study_by_id(db: Session, study_id: int) -> Optional[StudyCatalog]:
    """Get study by ID"""
    return db.query(StudyCatalog).options(
        joinedload(StudyCatalog.category)
    ).filter(StudyCatalog.id == study_id).first()

def get_study_recommendations(
    db: Session, 
    diagnosis: Optional[str] = None,
    category_id: Optional[int] = None
) -> List[StudyCatalog]:
    """Get study recommendations based on category"""
    query = db.query(StudyCatalog).filter(StudyCatalog.is_active == True)
    
    if category_id:
        query = query.filter(StudyCatalog.category_id == category_id)
    
    return query.limit(10).all()

def search_studies(
    db: Session,
    search_term: str,
    category_id: Optional[int] = None,
    specialty: Optional[str] = None,
    limit: int = 20
) -> List[StudyCatalog]:
    """Search studies with advanced filters"""
    query = db.query(StudyCatalog).join(StudyCategory).filter(StudyCatalog.is_active == True)
    
    if search_term:
        query = query.filter(
            StudyCatalog.name.ilike(f"%{search_term}%")
        )
    
    if category_id:
        query = query.filter(StudyCatalog.category_id == category_id)
    
    return query.limit(limit).all()
