-- ====================================================================================
-- MIGRACIÓN: Eliminar duration_minutes de la tabla appointments
-- ====================================================================================
-- Este script elimina el campo duration_minutes de la tabla appointments
-- ya que ahora se usará appointment_duration de la tabla persons
-- Fecha: 2025-09-24
-- ====================================================================================

-- 1. Eliminar la columna duration_minutes de la tabla appointments
ALTER TABLE appointments DROP COLUMN duration_minutes;

-- 2. Verificar que la columna fue eliminada correctamente
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'appointments'
AND column_name NOT IN ('id', 'appointment_code', 'patient_id', 'doctor_id', 'appointment_date', 'end_time', 'appointment_type', 'status', 'priority', 'reason', 'notes', 'preparation_instructions', 'follow_up_required', 'follow_up_date', 'room_number', 'estimated_cost', 'insurance_covered', 'confirmation_required', 'confirmed_at', 'reminder_sent', 'reminder_sent_at', 'cancelled_reason', 'cancelled_at', 'cancelled_by', 'created_at', 'updated_at', 'created_by')
ORDER BY column_name;

-- 3. Mostrar un resumen de las citas existentes
SELECT
    COUNT(*) as total_appointments,
    COUNT(end_time) as appointments_with_end_time,
    MIN(appointment_date) as first_appointment,
    MAX(appointment_date) as last_appointment
FROM appointments;

-- ====================================================================================
-- FIN DE LA MIGRACIÓN
-- ====================================================================================
-- Después de ejecutar este script:
-- 1. La columna duration_minutes se elimina completamente
-- 2. El código se actualizará para usar appointment_duration de la tabla persons
-- 3. Las nuevas citas calcularán end_time automáticamente
-- ====================================================================================
