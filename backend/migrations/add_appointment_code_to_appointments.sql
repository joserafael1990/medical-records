-- ============================================================================
-- Migración: Agregar columna appointment_code a tabla appointments
-- Fecha: 2025-10-31
-- Descripción: Agrega la columna appointment_code para almacenar códigos 
--              únicos de identificación para las citas médicas.
-- ============================================================================

-- Agregar columna appointment_code si no existe
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS appointment_code VARCHAR(20) UNIQUE;

-- Crear índice para mejorar búsquedas por código
CREATE INDEX IF NOT EXISTS idx_appointments_appointment_code 
ON appointments(appointment_code);

-- Comentario en la columna
COMMENT ON COLUMN appointments.appointment_code IS 
'Código único de identificación para la cita médica (formato: APT00000001)';

-- ============================================================================
-- Rollback (si es necesario revertir):
-- DROP INDEX IF EXISTS idx_appointments_appointment_code;
-- ALTER TABLE appointments DROP COLUMN IF EXISTS appointment_code;
-- ============================================================================

