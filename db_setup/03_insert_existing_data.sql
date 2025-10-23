-- ============================================================================
-- SISTEMA DE HISTORIAS CLÍNICAS ELECTRÓNICAS
-- Script de inserción de datos existentes (estudios, medicamentos, diagnósticos)
-- ============================================================================

-- ============================================================================
-- ESTUDIOS CLÍNICOS EXISTENTES (275 registros)
-- ============================================================================

-- Nota: Estos son los 275 estudios clínicos existentes en el sistema actual
-- Se insertan con ON CONFLICT para evitar duplicados

-- INSERT statements for study_catalog
-- Generated on 2025-10-22 20:00:44.415151

INSERT INTO study_catalog (id, code, name, category_id, subcategory, description, preparation, methodology, duration_hours, specialty, is_active, regulatory_compliance, created_at, updated_at) VALUES (1, 'LAB001', 'Biometría Hemática Completa', 1, 'Hematología', 'Conteo completo de células sanguíneas', 'Ayuno de 8 horas', 'Citometría de flujo', 4, 'Medicina General', TRUE, NULL, '2025-10-23 00:35:14.923125', '2025-10-23 00:35:14.923125')
ON CONFLICT (id) DO UPDATE SET
    code = EXCLUDED.code,
    name = EXCLUDED.name,
    category_id = EXCLUDED.category_id,
    subcategory = EXCLUDED.subcategory,
    description = EXCLUDED.description,
    preparation = EXCLUDED.preparation,
    methodology = EXCLUDED.methodology,
    duration_hours = EXCLUDED.duration_hours,
    specialty = EXCLUDED.specialty,
    is_active = EXCLUDED.is_active,
    regulatory_compliance = EXCLUDED.regulatory_compliance,
    updated_at = EXCLUDED.updated_at;

-- ============================================================================
-- MEDICAMENTOS EXISTENTES (404 registros)
-- ============================================================================

-- Nota: Estos son los 404 medicamentos existentes en el sistema actual
-- Se insertan con ON CONFLICT para evitar duplicados

INSERT INTO medications (id, name, created_at, updated_at) VALUES (1, 'Paracetamol', NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    updated_at = EXCLUDED.updated_at;

-- ============================================================================
-- DIAGNÓSTICOS EXISTENTES (202 registros)
-- ============================================================================

-- Nota: Estos son los 202 diagnósticos existentes en el sistema actual
-- Se insertan con ON CONFLICT para evitar duplicados

INSERT INTO diagnosis_catalog (id, code, name, category_id, description, synonyms, severity_level, is_chronic, is_contagious, age_group, gender_specific, specialty, is_active, created_at, updated_at) VALUES (1, 'A09', 'Diarrea y gastroenteritis de presunto origen infeccioso', 23, 'Diarrea infecciosa aguda', '{"Gastroenteritis infecciosa","Diarrea aguda"}', 'mild', FALSE, FALSE, NULL, NULL, 'Medicina General', TRUE, '2025-10-22 08:11:19.942377', '2025-10-22 08:11:19.942377')
ON CONFLICT (id) DO UPDATE SET
    code = EXCLUDED.code,
    name = EXCLUDED.name,
    category_id = EXCLUDED.category_id,
    description = EXCLUDED.description,
    synonyms = EXCLUDED.synonyms,
    severity_level = EXCLUDED.severity_level,
    is_chronic = EXCLUDED.is_chronic,
    is_contagious = EXCLUDED.is_contagious,
    age_group = EXCLUDED.age_group,
    gender_specific = EXCLUDED.gender_specific,
    specialty = EXCLUDED.specialty,
    is_active = EXCLUDED.is_active,
    updated_at = EXCLUDED.updated_at;

-- ============================================================================
-- NOTA IMPORTANTE
-- ============================================================================

/*
Este script contiene solo ejemplos de los primeros registros de cada tabla.
Para insertar todos los registros existentes, se requiere:

1. Ejecutar el script convert_csv_to_sql.py para generar todos los INSERT statements
2. Reemplazar los ejemplos con los datos completos generados
3. Asegurar que todos los registros tengan ON CONFLICT para evitar duplicados

Los archivos generados son:
- study_catalog_inserts.sql (275 registros)
- medications_inserts.sql (404 registros)  
- diagnosis_catalog_inserts.sql (202 registros)
*/

-- ============================================================================
-- FIN DEL SCRIPT
-- ============================================================================
