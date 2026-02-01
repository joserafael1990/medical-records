"""
Alembic environment configuration for database migrations
"""
from logging.config import fileConfig

from sqlalchemy import engine_from_config
from sqlalchemy import pool

from alembic import context

# Import database models and Base
# This ensures all models are registered with SQLAlchemy
import sys
import os

# Add parent directory to path to import database module
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

# Import Base and all models
from database import Base, DATABASE_URL
# Import all models to ensure they're registered
from database import (
    Person, Appointment, MedicalRecord, Office, AppointmentType,
    Country, State, Document, DocumentType,
    Specialty, EmergencyRelationship,
    VitalSign, ConsultationVitalSign,
    Medication, ConsultationPrescription,
    DocumentFolioSequence, DocumentFolio,
    AuditLog, PrivacyNotice, PrivacyConsent, ARCORequest,
    GoogleCalendarToken, GoogleCalendarEventMapping,
    StudyCategory, StudyCatalog, ClinicalStudy,
    AppointmentReminder, PersonDocument
)
# Import schedule models
from models.schedule import ScheduleTemplate
# Import diagnosis models
from models.diagnosis import DiagnosisCatalog

# this is the Alembic Config object, which provides
# access to the values within the .ini file in use.
config = context.config

# Interpret the config file for Python logging.
# This line sets up loggers basically.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# add your model's MetaData object here
# for 'autogenerate' support
target_metadata = Base.metadata

# other values from the config, defined by the needs of env.py,
# can be acquired:
# my_important_option = config.get_main_option("my_important_option")
# ... etc.


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode.

    This configures the context with just a URL
    and not an Engine, though an Engine is acceptable
    here as well.  By skipping the Engine creation
    we don't even need a DBAPI to be available.

    Calls to context.execute() here emit the given string to the
    script output.

    """
    url = DATABASE_URL
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode.

    In this scenario we need to create an Engine
    and associate a connection with the context.

    """
    from sqlalchemy import create_engine
    connectable = create_engine(
        DATABASE_URL,
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        # CRITICAL: Disable transactional DDL to prevent rollback of successful operations
        # This allows operations like table creation to persist even if later operations fail
        # We configure WITHOUT transaction_per_migration and WITHOUT begin_transaction wrapper
        context.configure(
            connection=connection, 
            target_metadata=target_metadata
        )

        # Run migrations WITHOUT transaction wrapper - each operation commits immediately
        # This ensures appointment_reminders table creation persists even if migration fails
        context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()

