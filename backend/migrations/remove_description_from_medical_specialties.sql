-- ============================================================================
-- MIGRACIÓN: Eliminar columna description de medical_specialties
-- ============================================================================
-- Fecha: 2025-01-XX
-- Descripción: Elimina la columna description de la tabla medical_specialties
-- ============================================================================

ALTER TABLE medical_specialties DROP COLUMN IF EXISTS description;

-- ============================================================================
-- FIN DE LA MIGRACIÓN
-- ============================================================================

