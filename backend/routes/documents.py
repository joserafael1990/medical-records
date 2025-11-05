"""
Document management endpoints
Migrated from main_clean_english.py to improve code organization
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional

from database import get_db, Person, PersonDocument
from dependencies import get_current_user
import crud
import schemas

router = APIRouter(prefix="/api", tags=["documents"])


@router.get("/document-types", response_model=List[schemas.DocumentTypeResponse])
async def get_document_types(
    active_only: bool = Query(True),
    db: Session = Depends(get_db)
):
    """Get list of document types"""
    return crud.get_document_types(db, active_only=active_only)


@router.get("/document-types/{document_type_id}/documents", response_model=List[schemas.DocumentResponse])
async def get_documents_by_type(
    document_type_id: int,
    active_only: bool = Query(True),
    db: Session = Depends(get_db)
):
    """Get all documents of a specific type"""
    return crud.get_documents_by_type(db, document_type_id, active_only=active_only)


@router.get("/documents", response_model=List[schemas.DocumentResponse])
async def get_documents(
    document_type_id: Optional[int] = Query(None),
    active_only: bool = Query(True),
    db: Session = Depends(get_db)
):
    """Get all documents with optional filter by type"""
    return crud.get_documents(db, document_type_id=document_type_id, active_only=active_only)


@router.get("/persons/{person_id}/documents", response_model=List[schemas.PersonDocumentResponse])
async def get_person_documents(
    person_id: int,
    active_only: bool = Query(True),
    current_user: Person = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all documents for a person"""
    # Verify access (doctor can only access own documents or own patients' documents)
    if current_user.person_type == 'doctor':
        if person_id != current_user.id:
            # Check if it's a patient created by this doctor
            person = crud.get_person(db, person_id)
            if not person or person.created_by != current_user.id:
                raise HTTPException(status_code=403, detail="Access denied")
    
    return crud.get_person_documents(db, person_id, active_only=active_only)


@router.post("/persons/{person_id}/documents", response_model=schemas.PersonDocumentResponse)
async def create_person_document(
    person_id: int,
    document_data: schemas.PersonDocumentCreate,
    current_user: Person = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create or update a person document"""
    # Verify access
    if current_user.person_type == 'doctor':
        if person_id != current_user.id:
            person = crud.get_person(db, person_id)
            if not person or person.created_by != current_user.id:
                raise HTTPException(status_code=403, detail="Access denied")
    
    person_doc = crud.upsert_person_document(
        db=db,
        person_id=person_id,
        document_id=document_data.document_id,
        document_value=document_data.document_value
    )
    db.commit()
    db.refresh(person_doc)
    # Load document relationship
    person_doc = db.query(PersonDocument).options(joinedload(PersonDocument.document)).filter(PersonDocument.id == person_doc.id).first()
    return person_doc


@router.delete("/persons/{person_id}/documents/{document_id}")
async def delete_person_document(
    person_id: int,
    document_id: int,
    current_user: Person = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a person document"""
    # Verify access
    if current_user.person_type == 'doctor':
        if person_id != current_user.id:
            person = crud.get_person(db, person_id)
            if not person or person.created_by != current_user.id:
                raise HTTPException(status_code=403, detail="Access denied")
    
    deleted = crud.delete_person_document(db, person_id, document_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Document not found")
    db.commit()
    return {"message": "Document deleted successfully"}
