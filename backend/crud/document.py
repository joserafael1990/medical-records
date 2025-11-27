from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from fastapi import HTTPException
from backend.models import DocumentType, Document, PersonDocument, utc_now

# ============================================================================
# DOCUMENT MANAGEMENT CRUD
# ============================================================================

def get_document_types(db: Session, active_only: bool = True) -> List[DocumentType]:
    """Get all document types"""
    query = db.query(DocumentType)
    if active_only:
        query = query.filter(DocumentType.is_active == True)
    return query.order_by(DocumentType.name).all()

def get_documents_by_type(db: Session, document_type_id: int, active_only: bool = True) -> List[Document]:
    """Get all documents of a specific type"""
    query = db.query(Document).filter(Document.document_type_id == document_type_id)
    if active_only:
        query = query.filter(Document.is_active == True)
    return query.order_by(Document.name).all()

def get_documents(db: Session, document_type_id: Optional[int] = None, active_only: bool = True) -> List[Document]:
    """Get all documents with optional filter by type"""
    query = db.query(Document)
    if document_type_id:
        query = query.filter(Document.document_type_id == document_type_id)
    if active_only:
        query = query.filter(Document.is_active == True)
    return query.order_by(Document.name).all()

def get_person_documents(db: Session, person_id: int, active_only: bool = True) -> List[PersonDocument]:
    """Get all documents for a person"""
    query = db.query(PersonDocument).filter(PersonDocument.person_id == person_id)
    if active_only:
        query = query.filter(PersonDocument.is_active == True)
    return query.options(joinedload(PersonDocument.document)).all()

def upsert_person_document(
    db: Session,
    person_id: int,
    document_id: int,
    document_value: str,
    check_uniqueness: bool = True
) -> PersonDocument:
    """
    Create or update a person document (UPSERT)
    check_uniqueness: If True, validates that the document_value is unique for this document_id
    """
    if check_uniqueness:
        existing_with_same_value = db.query(PersonDocument).filter(
            PersonDocument.document_id == document_id,
            PersonDocument.document_value == document_value,
            PersonDocument.person_id != person_id,
            PersonDocument.is_active == True
        ).first()
        
        if existing_with_same_value:
            document = db.query(Document).filter(Document.id == document_id).first()
            raise HTTPException(
                status_code=400,
                detail=f"El documento {document.name if document else 'desconocido'} con valor '{document_value}' ya está registrado para otra persona. Cada tipo de documento debe tener un valor único."
            )
    
    document_obj = db.query(Document).filter(Document.id == document_id).first()
    if not document_obj:
        raise HTTPException(status_code=400, detail=f"Document with id {document_id} not found")
    
    document_type_id = document_obj.document_type_id
    
    existing_same_type = db.query(PersonDocument).join(Document).filter(
        PersonDocument.person_id == person_id,
        Document.document_type_id == document_type_id,
        PersonDocument.is_active == True
    ).first()
    
    if existing_same_type:
        existing_same_type.document_id = document_id
        existing_same_type.document_value = document_value
        existing_same_type.updated_at = utc_now()
        return existing_same_type
    else:
        existing_inactive = db.query(PersonDocument).join(Document).filter(
            PersonDocument.person_id == person_id,
            Document.document_type_id == document_type_id,
            PersonDocument.is_active == False
        ).order_by(PersonDocument.updated_at.desc()).first()
        
        if existing_inactive:
            existing_inactive.document_id = document_id
            existing_inactive.document_value = document_value
            existing_inactive.is_active = True
            existing_inactive.updated_at = utc_now()
            return existing_inactive
        else:
            new_doc = PersonDocument(
                person_id=person_id,
                document_id=document_id,
                document_value=document_value
            )
            db.add(new_doc)
            db.flush()
            db.refresh(new_doc)
            return new_doc

def delete_person_document(db: Session, person_id: int, document_id: int) -> bool:
    """Delete a person document"""
    person_doc = db.query(PersonDocument).filter(
        PersonDocument.person_id == person_id,
        PersonDocument.document_id == document_id
    ).first()
    
    if person_doc:
        db.delete(person_doc)
        return True
    return False
