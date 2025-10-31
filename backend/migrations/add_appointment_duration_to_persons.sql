-- ============================================================================
-- Migración: Agregar columna appointment_duration a tabla persons
-- Fecha: 2025-10-31
-- Descripción: Agrega la columna appointment_duration para almacenar la 
--              duración de las citas en minutos para los doctores.
-- ============================================================================

-- Agregar columna appointment_duration si no existe
ALTER TABLE persons 
ADD COLUMN IF NOT EXISTS appointment_duration INTEGER;

-- Comentario en la columna
COMMENT ON COLUMN persons.appointment_duration IS 
'Duración de las citas en minutos (solo para doctores, opcional)';

-- ============================================================================
-- Rollback (si es necesario revertir):
-- ALTER TABLE persons DROP COLUMN IF EXISTS appointment_duration;
-- ============================================================================

