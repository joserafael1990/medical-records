-- ============================================================================
-- Migración: Agregar columnas faltantes a tabla appointments
-- Fecha: 2025-10-31
-- Descripción: Agrega todas las columnas que están definidas en el modelo 
--              SQLAlchemy pero que faltaban en la estructura SQL de la base de datos.
-- ============================================================================

-- SCHEDULING
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS end_time TIMESTAMP;

-- DETAILS
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS appointment_type_id INTEGER REFERENCES appointment_types(id);
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS office_id INTEGER REFERENCES offices(id);
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS consultation_type VARCHAR(50) DEFAULT 'Seguimiento';
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'normal';

-- CLINICAL INFORMATION
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS reason TEXT;

-- FOLLOW-UP
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS follow_up_required BOOLEAN DEFAULT FALSE;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS follow_up_date DATE;

-- ADMINISTRATIVE
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS room_number VARCHAR(20);
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMP;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS reminder_sent BOOLEAN DEFAULT FALSE;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMP;

-- AUTO REMINDER (WhatsApp)
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS auto_reminder_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS auto_reminder_offset_minutes INTEGER DEFAULT 360;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS auto_reminder_sent_at TIMESTAMP;

-- CANCELLATION
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS cancelled_reason TEXT;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS cancelled_by INTEGER REFERENCES persons(id);

-- Actualizar defaults
ALTER TABLE appointments ALTER COLUMN status SET DEFAULT 'confirmed';

-- Comentarios
COMMENT ON COLUMN appointments.end_time IS 'Hora de finalización de la cita';
COMMENT ON COLUMN appointments.appointment_type_id IS 'Tipo de cita (referencia a appointment_types)';
COMMENT ON COLUMN appointments.office_id IS 'Oficina donde se realizará la cita';
COMMENT ON COLUMN appointments.consultation_type IS 'Tipo de consulta: Primera vez o Seguimiento';
COMMENT ON COLUMN appointments.priority IS 'Prioridad de la cita: normal, alta, urgente';
COMMENT ON COLUMN appointments.reason IS 'Motivo de la cita';
COMMENT ON COLUMN appointments.auto_reminder_enabled IS 'Indica si está habilitado el recordatorio automático por WhatsApp';
COMMENT ON COLUMN appointments.auto_reminder_offset_minutes IS 'Minutos de anticipación para enviar recordatorio automático (default: 360 = 6 horas)';

-- ============================================================================
-- Rollback (si es necesario revertir):
-- ALTER TABLE appointments DROP COLUMN IF EXISTS end_time;
-- ALTER TABLE appointments DROP COLUMN IF EXISTS appointment_type_id;
-- ALTER TABLE appointments DROP COLUMN IF EXISTS office_id;
-- ALTER TABLE appointments DROP COLUMN IF EXISTS consultation_type;
-- ALTER TABLE appointments DROP COLUMN IF EXISTS priority;
-- ALTER TABLE appointments DROP COLUMN IF EXISTS reason;
-- ALTER TABLE appointments DROP COLUMN IF EXISTS follow_up_required;
-- ALTER TABLE appointments DROP COLUMN IF EXISTS follow_up_date;
-- ALTER TABLE appointments DROP COLUMN IF EXISTS room_number;
-- ALTER TABLE appointments DROP COLUMN IF EXISTS confirmed_at;
-- ALTER TABLE appointments DROP COLUMN IF EXISTS reminder_sent;
-- ALTER TABLE appointments DROP COLUMN IF EXISTS reminder_sent_at;
-- ALTER TABLE appointments DROP COLUMN IF EXISTS auto_reminder_enabled;
-- ALTER TABLE appointments DROP COLUMN IF EXISTS auto_reminder_offset_minutes;
-- ALTER TABLE appointments DROP COLUMN IF EXISTS auto_reminder_sent_at;
-- ALTER TABLE appointments DROP COLUMN IF EXISTS cancelled_reason;
-- ALTER TABLE appointments DROP COLUMN IF EXISTS cancelled_at;
-- ALTER TABLE appointments DROP COLUMN IF EXISTS cancelled_by;
-- ============================================================================

