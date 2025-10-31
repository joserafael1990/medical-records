-- ============================================================================
-- MIGRACIÓN: Eliminar columna description de documents y document_types
-- ============================================================================
-- Fecha: 2025-01-XX
-- Descripción: Elimina la columna description de las tablas documents y document_types
-- ============================================================================

ALTER TABLE documents DROP COLUMN IF EXISTS description;
ALTER TABLE document_types DROP COLUMN IF EXISTS description;

-- ============================================================================
-- FIN DE LA MIGRACIÓN
-- ============================================================================

