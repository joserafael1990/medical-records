"""
Database models re-export (Legacy Support)
This file now re-exports models from the backend/models/ package.
Please import directly from backend.models in new code.
"""

from models import (
    Base, engine, SessionLocal, get_db, utc_now, DATABASE_URL,
    Country, State, Office,
    Specialty, EmergencyRelationship, AuditLog, 
    PrivacyNotice, PrivacyConsent, ARCORequest,
    LegalDocument, LegalAcceptance,
    GoogleCalendarToken, License,
    DocumentType, Document, PersonDocument, 
    DocumentFolioSequence, DocumentFolio,
    Person,
    MedicalRecord, VitalSign, ConsultationVitalSign, 
    Medication, ConsultationPrescription,
    AppointmentType, Appointment, AppointmentReminder, 
    GoogleCalendarEventMapping,
    ClinicalStudy, StudyCategory, StudyCatalog,
    WhatsAppSession,
    IntakeQuestionnaireResponse,
    AssistantConversation, AssistantMessage,
    CfdiIssuer, CfdiInvoice,
)

# Re-export logger for compatibility if it was used
from logger import get_logger
db_logger = get_logger("medical_records.database")

def init_db():
    """Inicializar base de datos - solo crear tablas que no existen"""
    Base.metadata.create_all(bind=engine)
    db_logger.info("✅ Database models initialized")

if __name__ == "__main__":
    db_logger.info("🔍 Verificando conexión a base de datos...")
    try:
        engine.connect()
        db_logger.info("✅ Conexión exitosa a PostgreSQL")
        db_logger.info(
            "📊 Tablas disponibles",
            extra={"tables": list(Base.metadata.tables.keys())}
        )
    except Exception as e:
        db_logger.error("❌ Error de conexión a base de datos", exc_info=True)
