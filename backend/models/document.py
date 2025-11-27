from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from .base import Base, utc_now

# ============================================================================
# DOCUMENT MANAGEMENT
# ============================================================================

class DocumentType(Base):
    __tablename__ = "document_types"
    
    id = Column(Integer, primary_key=True)
    name = Column(String(50), nullable=False, unique=True)  # "Personal", "Profesional"
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)
    
    # Relationships
    documents = relationship("Document", back_populates="document_type")

class Document(Base):
    __tablename__ = "documents"
    
    id = Column(Integer, primary_key=True)
    name = Column(String(100), nullable=False)  # "DNI", "CURP", "Cédula Profesional", etc.
    document_type_id = Column(Integer, ForeignKey("document_types.id", ondelete="CASCADE"))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)
    
    # Relationships
    document_type = relationship("DocumentType", back_populates="documents")
    person_documents = relationship("PersonDocument", back_populates="document")

class PersonDocument(Base):
    __tablename__ = "person_documents"
    
    id = Column(Integer, primary_key=True)
    person_id = Column(Integer, ForeignKey("persons.id", ondelete="CASCADE"), nullable=False)
    document_id = Column(Integer, ForeignKey("documents.id", ondelete="CASCADE"), nullable=False)
    document_value = Column(String(255), nullable=False)  # Valor del documento
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)
    
    # Relationships
    person = relationship("Person", back_populates="person_documents")
    document = relationship("Document", back_populates="person_documents")

# ============================================================================
# DOCUMENT FOLIOS (RECETAS Y ÓRDENES DE ESTUDIO)
# ============================================================================

class DocumentFolioSequence(Base):
    __tablename__ = "document_folio_sequences"

    id = Column(Integer, primary_key=True)
    doctor_id = Column(Integer, ForeignKey("persons.id"), nullable=False)
    document_type = Column(String(50), nullable=False)
    last_number = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)

    doctor = relationship("Person", back_populates="document_folio_sequences")

class DocumentFolio(Base):
    __tablename__ = "document_folios"

    id = Column(Integer, primary_key=True)
    doctor_id = Column(Integer, ForeignKey("persons.id"), nullable=False)
    consultation_id = Column(Integer, ForeignKey("medical_records.id"), nullable=False)
    document_type = Column(String(50), nullable=False)
    folio_number = Column(Integer, nullable=False)
    formatted_folio = Column(String(20), nullable=False)
    created_at = Column(DateTime, default=utc_now)

    doctor = relationship("Person", back_populates="document_folios")
    consultation = relationship("MedicalRecord", back_populates="document_folios")
