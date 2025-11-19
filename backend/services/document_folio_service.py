from datetime import datetime
from typing import Dict

from sqlalchemy.orm import Session
from logger import get_logger
from database import DocumentFolioSequence, DocumentFolio

api_logger = get_logger("medical_records.api")


class DocumentFolioService:
    """Service layer for managing document folios (prescriptions, study orders)."""

    SUPPORTED_DOCUMENT_TYPES = {"prescription", "study_order"}

    @staticmethod
    def normalize_document_type(document_type: str) -> str:
        if not document_type:
            raise ValueError("Document type is required to generate folio")

        normalized = document_type.strip().lower()
        if normalized not in DocumentFolioService.SUPPORTED_DOCUMENT_TYPES:
            raise ValueError(f"Unsupported document type for folio: {document_type}")
        return normalized

    @staticmethod
    def _format_folio(number: int) -> str:
        """Format folio number to a 6-digit zero-padded string."""
        return f"{number:06d}"

    @staticmethod
    def get_or_create_folio(
        db: Session,
        doctor_id: int,
        consultation_id: int,
        document_type: str
    ) -> DocumentFolio:
        """Return existing folio or create a new one for the given consultation."""
        normalized_type = DocumentFolioService.normalize_document_type(document_type)

        existing_folio = db.query(DocumentFolio).filter(
            DocumentFolio.doctor_id == doctor_id,
            DocumentFolio.consultation_id == consultation_id,
            DocumentFolio.document_type == normalized_type
        ).first()

        if existing_folio:
            api_logger.debug(
                "📄 Folio encontrado",
                extra={
                    "doctor_id": doctor_id,
                    "consultation_id": consultation_id,
                    "document_type": normalized_type,
                    "folio": existing_folio.formatted_folio
                }
            )
            return existing_folio

        api_logger.debug(
            "🆕 Generando folio",
            extra={
                "doctor_id": doctor_id,
                "consultation_id": consultation_id,
                "document_type": normalized_type
            }
        )

        # Obtain or initialize sequence with row-level lock to avoid race conditions
        sequence = db.query(DocumentFolioSequence).filter(
            DocumentFolioSequence.doctor_id == doctor_id,
            DocumentFolioSequence.document_type == normalized_type
        ).with_for_update(nowait=False).first()

        if not sequence:
            sequence = DocumentFolioSequence(
                doctor_id=doctor_id,
                document_type=normalized_type,
                last_number=0,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )
            db.add(sequence)
            db.flush()  # Ensure sequence has an ID before usage

        next_number = sequence.last_number + 1
        sequence.last_number = next_number
        sequence.updated_at = datetime.utcnow()

        formatted_folio = DocumentFolioService._format_folio(next_number)

        folio = DocumentFolio(
            doctor_id=doctor_id,
            consultation_id=consultation_id,
            document_type=normalized_type,
            folio_number=next_number,
            formatted_folio=formatted_folio,
            created_at=datetime.utcnow()
        )

        db.add(folio)
        db.commit()
        db.refresh(folio)

        api_logger.info(
            "✅ Folio generado correctamente",
            extra={
                "doctor_id": doctor_id,
                "consultation_id": consultation_id,
                "document_type": normalized_type,
                "folio": formatted_folio
            }
        )

        return folio

    @staticmethod
    def serialize_folio(folio: DocumentFolio) -> Dict[str, str]:
        return {
            "document_type": folio.document_type,
            "folio_number": folio.folio_number,
            "formatted_folio": folio.formatted_folio
        }

