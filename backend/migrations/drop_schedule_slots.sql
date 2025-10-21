-- ============================================================================
-- MIGRATION: Drop schedule_slots table
-- ============================================================================
-- Razón: Tabla no utilizada. Los slots se generan dinámicamente en el endpoint
--        /api/schedule/available-times. No hay necesidad de pre-generarlos.
-- Fecha: 2025-10-21
-- ============================================================================

-- Drop the schedule_slots table
DROP TABLE IF EXISTS schedule_slots CASCADE;

-- Verificar que la tabla fue eliminada
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 
            FROM information_schema.tables 
            WHERE table_name = 'schedule_slots'
        ) 
        THEN 'ERROR: schedule_slots table still exists'
        ELSE 'SUCCESS: schedule_slots table dropped'
    END as result;

