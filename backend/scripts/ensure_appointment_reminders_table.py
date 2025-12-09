#!/usr/bin/env python3
"""
Ensure appointment_reminders table exists before running migrations.
This script runs BEFORE Alembic to guarantee the table exists.
"""
import os
import sys

# Add backend to path
backend_dir = os.path.dirname(os.path.dirname(__file__))
sys.path.insert(0, backend_dir)

try:
    from models.base import DATABASE_URL
    import sqlalchemy as sa
    from sqlalchemy import create_engine, text
    
    # Create engine
    engine = create_engine(DATABASE_URL)
    
    # Create table if it doesn't exist
    with engine.connect() as conn:
        # Use autocommit mode to ensure it commits even if later operations fail
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS appointment_reminders (
                id SERIAL PRIMARY KEY,
                appointment_id INTEGER NOT NULL,
                reminder_number INTEGER NOT NULL,
                offset_minutes INTEGER NOT NULL,
                enabled BOOLEAN NOT NULL DEFAULT TRUE,
                sent BOOLEAN NOT NULL DEFAULT FALSE,
                sent_at TIMESTAMP,
                whatsapp_message_id VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT appointment_reminders_appointment_id_reminder_number_key UNIQUE (appointment_id, reminder_number)
            )
        """))
        conn.commit()
        
        # Create indexes if they don't exist
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_appointment_reminders_appointment_id ON appointment_reminders(appointment_id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_appointment_reminders_appointment_status ON appointment_reminders(appointment_id) WHERE enabled = TRUE AND sent = FALSE"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_appointment_reminders_enabled_sent ON appointment_reminders(enabled, sent) WHERE enabled = TRUE AND sent = FALSE"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_appointment_reminders_whatsapp_message_id ON appointment_reminders(whatsapp_message_id)"))
        conn.commit()
        
        # Add comment if it doesn't exist
        conn.execute(text("""
            COMMENT ON TABLE appointment_reminders IS 'Stores up to 3 automatic reminders per appointment. Each reminder can be enabled/disabled independently and has a custom offset_minutes (time before appointment).'
        """))
        conn.commit()
        
    print("✅ appointment_reminders table ensured (created if it didn't exist)")
    
except Exception as e:
    # Don't fail startup if this fails - just log it
    print(f"⚠️  Could not ensure appointment_reminders table: {e}")
    print("   Migration will attempt to create it instead")
