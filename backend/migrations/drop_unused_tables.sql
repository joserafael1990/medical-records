-- ============================================================================
-- MIGRATION: Eliminar tablas no utilizadas
-- ============================================================================
-- Descripción: Elimina tablas que están definidas pero no se usan en el sistema
-- Tablas eliminadas:
--   - study_normal_values
--   - diagnosis_differentials
--   - diagnosis_recommendations
--   - schedule_exceptions
--   - study_template_items
--   - study_templates
--
-- Fecha: 2025-11-02
-- ============================================================================

BEGIN;

-- Eliminar tablas en orden (respetando dependencias de claves foráneas)

-- 1. study_template_items (depende de study_templates y study_catalog)
DROP TABLE IF EXISTS study_template_items CASCADE;

-- 2. study_templates (depende de specialties - pero no hay FK explícita)
DROP TABLE IF EXISTS study_templates CASCADE;

-- 3. study_normal_values (depende de study_catalog)
DROP TABLE IF EXISTS study_normal_values CASCADE;

-- 4. diagnosis_recommendations (depende de diagnosis_catalog y study_catalog)
DROP TABLE IF EXISTS diagnosis_recommendations CASCADE;

-- 5. diagnosis_differentials (depende de diagnosis_catalog)
DROP TABLE IF EXISTS diagnosis_differentials CASCADE;

-- 6. schedule_exceptions (depende de persons y schedule_templates)
DROP TABLE IF EXISTS schedule_exceptions CASCADE;

COMMIT;

-- ============================================================================
-- NOTAS:
-- - Todas las tablas se eliminan con CASCADE para eliminar también índices,
--   restricciones y objetos dependientes
-- - No hay datos migrados ya que estas tablas no estaban en uso
-- - Los modelos SQLAlchemy ya fueron actualizados en el código
-- ============================================================================

