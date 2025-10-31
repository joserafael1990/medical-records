-- ============================================================================
-- MIGRACIÓN: Tablas de tipos de documento y documentos
-- Actualización de especialidades médicas
-- ============================================================================
-- Fecha: 2025-01-XX
-- Descripción: 
--   1. Crea tablas document_types y documents
--   2. Inserta tipos de documento (Personal, Profesional)
--   3. Inserta documentos personales y profesionales
--   4. Actualiza medical_specialties: elimina cirugías y agrega Neonatología
-- ============================================================================

-- ============================================================================
-- 1. CREAR TABLAS DE DOCUMENTOS
-- ============================================================================

-- Tabla de tipos de documento
CREATE TABLE IF NOT EXISTS document_types (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabla de documentos
CREATE TABLE IF NOT EXISTS documents (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    document_type_id INTEGER REFERENCES document_types(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(name, document_type_id)
);

-- Eliminar columnas description si existen
ALTER TABLE document_types DROP COLUMN IF EXISTS description;
ALTER TABLE documents DROP COLUMN IF EXISTS description;

-- ============================================================================
-- 2. INSERTAR TIPOS DE DOCUMENTO
-- ============================================================================

INSERT INTO document_types (id, name, is_active, created_at, updated_at) VALUES
(1, 'Personal', true, NOW(), NOW()),
(2, 'Profesional', true, NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    is_active = EXCLUDED.is_active,
    updated_at = EXCLUDED.updated_at;

-- ============================================================================
-- 3. INSERTAR DOCUMENTOS
-- ============================================================================

-- Documentos Personales
INSERT INTO documents (id, name, document_type_id, is_active, created_at, updated_at) VALUES
(1, 'DNI', 1, true, NOW(), NOW()),
(2, 'C.I', 1, true, NOW(), NOW()),
(3, 'DUI', 1, true, NOW(), NOW()),
(4, 'DPI', 1, true, NOW(), NOW()),
(5, 'CURP', 1, true, NOW(), NOW()),
(6, 'C.I.P', 1, true, NOW(), NOW()),
(7, 'C.I.E', 1, true, NOW(), NOW()),
(8, 'Otro', 1, true, NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    document_type_id = EXCLUDED.document_type_id,
    is_active = EXCLUDED.is_active,
    updated_at = EXCLUDED.updated_at;

-- Documentos Profesionales
INSERT INTO documents (id, name, document_type_id, is_active, created_at, updated_at) VALUES
(9, 'Número de Colegiación', 2, true, NOW(), NOW()),
(10, 'Matrícula Nacional', 2, true, NOW(), NOW()),
(11, 'Número de Registro', 2, true, NOW(), NOW()),
(12, 'Registro Médico Nacional', 2, true, NOW(), NOW()),
(13, 'Cédula Profesional', 2, true, NOW(), NOW()),
(14, 'Número de Colegiatura', 2, true, NOW(), NOW()),
(15, 'Número de Registro Profesional', 2, true, NOW(), NOW()),
(16, 'Medical License Number', 2, true, NOW(), NOW()),
(17, 'Otro', 2, true, NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    document_type_id = EXCLUDED.document_type_id,
    is_active = EXCLUDED.is_active,
    updated_at = EXCLUDED.updated_at;

-- ============================================================================
-- 4. ACTUALIZAR ESPECIALIDADES MÉDICAS
-- ============================================================================

-- Renombrar "Cirugía Plástica" a "Cirugía Estética" si existe
UPDATE medical_specialties 
SET name = 'Cirugía Estética', updated_at = NOW()
WHERE name = 'Cirugía Plástica';

-- Eliminar todas las cirugías excepto las permitidas
DELETE FROM medical_specialties 
WHERE name LIKE 'Cirugía%' 
  AND name NOT IN ('Cirugía General', 'Cirugía Estética', 'Cirugía Cardiovascular');

-- Eliminar columna description si existe
ALTER TABLE medical_specialties DROP COLUMN IF EXISTS description;

-- Agregar Neonatología si no existe (usando el próximo ID disponible)
INSERT INTO medical_specialties (id, name, is_active, created_at, updated_at)
SELECT COALESCE((SELECT MAX(id) FROM medical_specialties), 0) + 1, 
       'Neonatología', 
       true, 
       NOW(), 
       NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM medical_specialties WHERE name = 'Neonatología'
);

-- Asegurar que las cirugías permitidas estén activas
UPDATE medical_specialties 
SET is_active = true, updated_at = NOW()
WHERE name IN ('Cirugía General', 'Cirugía Estética', 'Cirugía Cardiovascular');

-- ============================================================================
-- FIN DE LA MIGRACIÓN
-- ============================================================================

