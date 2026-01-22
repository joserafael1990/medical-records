from datetime import datetime
from typing import Dict
import json
import time

from sqlalchemy.orm import Session
from sqlalchemy import inspect, text
from logger import get_logger
from database import DocumentFolioSequence, DocumentFolio, engine
from utils.datetime_utils import utc_now

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
    def _log_debug(location: str, message: str, data: dict, hypothesis_id: str = 'A', run_id: str = 'pre-fix'):
        """Helper method to write debug logs"""
        # #region agent log
        try:
            with open('/Users/rafaelgarcia/Documents/Software projects/medical-records-main/.cursor/debug.log', 'a') as f:
                log_entry = json.dumps({
                    'location': location,
                    'message': message,
                    'data': data,
                    'timestamp': int(time.time() * 1000),
                    'sessionId': 'debug-session',
                    'runId': run_id,
                    'hypothesisId': hypothesis_id
                })
                f.write(log_entry + '\n')
        except: pass
        # #endregion

    @staticmethod
    def _table_exists(db: Session, table_name: str) -> bool:
        """Check if a table exists in the database"""
        # #region agent log
        try:
            inspector = inspect(engine)
            tables = inspector.get_table_names()
            exists = table_name in tables
            DocumentFolioService._log_debug(
                'document_folio_service.py:_table_exists',
                'table existence check',
                {'table_name': table_name, 'exists': exists, 'all_tables': tables[:10]},
                'A',
                'pre-fix'
            )
            return exists
        except Exception as e:
            DocumentFolioService._log_debug(
                'document_folio_service.py:_table_exists',
                'table existence check error',
                {'table_name': table_name, 'error': str(e)},
                'A',
                'pre-fix'
            )
            return False
        # #endregion

    @staticmethod
    def get_or_create_folio(
        db: Session,
        doctor_id: int,
        consultation_id: int,
        document_type: str
    ) -> DocumentFolio:
        """Return existing folio or create a new one for the given consultation."""
        normalized_type = DocumentFolioService.normalize_document_type(document_type)

        # #region agent log
        DocumentFolioService._log_debug(
            'document_folio_service.py:get_or_create_folio',
            'function entry',
            {'doctor_id': doctor_id, 'consultation_id': consultation_id, 'document_type': normalized_type},
            'A',
            'pre-fix'
        )
        # #endregion

        # Check if table exists before querying
        if not DocumentFolioService._table_exists(db, 'document_folios'):
            error_msg = "Table 'document_folios' does not exist. Please run migration: backend/migrations/migration_add_document_folios.sql"
            api_logger.error(error_msg)
            raise RuntimeError(error_msg)

        existing_folio = db.query(DocumentFolio).filter(
            DocumentFolio.doctor_id == doctor_id,
            DocumentFolio.consultation_id == consultation_id,
            DocumentFolio.document_type == normalized_type
        ).first()

        # #region agent log
        DocumentFolioService._log_debug(
            'document_folio_service.py:get_or_create_folio',
            'existing_folio query result',
            {'found': existing_folio is not None, 'folio_id': existing_folio.id if existing_folio else None},
            'A',
            'pre-fix'
        )
        # #endregion

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

        # Check if sequences table exists before querying
        if not DocumentFolioService._table_exists(db, 'document_folio_sequences'):
            error_msg = "Table 'document_folio_sequences' does not exist. Please run migration: backend/migrations/migration_add_document_folios.sql"
            api_logger.error(error_msg)
            raise RuntimeError(error_msg)

        # #region agent log
        DocumentFolioService._log_debug(
            'document_folio_service.py:get_or_create_folio',
            'before sequence query',
            {'doctor_id': doctor_id, 'document_type': normalized_type},
            'B',
            'pre-fix'
        )
        # #endregion

        # Obtain or initialize sequence with row-level lock to avoid race conditions
        sequence = db.query(DocumentFolioSequence).filter(
            DocumentFolioSequence.doctor_id == doctor_id,
            DocumentFolioSequence.document_type == normalized_type
        ).with_for_update(nowait=False).first()

        # #region agent log
        DocumentFolioService._log_debug(
            'document_folio_service.py:get_or_create_folio',
            'sequence query result',
            {'sequence_found': sequence is not None, 'last_number': sequence.last_number if sequence else None},
            'B',
            'pre-fix'
        )
        # #endregion

        if not sequence:
            sequence = DocumentFolioSequence(
                doctor_id=doctor_id,
                document_type=normalized_type,
                last_number=0,
                created_at=utc_now(),
                updated_at=utc_now()
            )
            db.add(sequence)
            db.flush()  # Ensure sequence has an ID before usage

        next_number = sequence.last_number + 1
        sequence.last_number = next_number
        sequence.updated_at = utc_now()

        formatted_folio = DocumentFolioService._format_folio(next_number)

        folio = DocumentFolio(
            doctor_id=doctor_id,
            consultation_id=consultation_id,
            document_type=normalized_type,
            folio_number=next_number,
            formatted_folio=formatted_folio,
            created_at=utc_now()
        )

        db.add(folio)
        db.commit()
        db.refresh(folio)

        # #region agent log
        DocumentFolioService._log_debug(
            'document_folio_service.py:get_or_create_folio',
            'folio created successfully',
            {'folio_id': folio.id, 'formatted_folio': formatted_folio, 'folio_number': next_number},
            'C',
            'pre-fix'
        )
        # #endregion

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

