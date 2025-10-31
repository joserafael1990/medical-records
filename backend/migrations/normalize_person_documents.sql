-- ============================================================================
-- MIGRACIÓN: Normalizar documentos de personas
-- ============================================================================
-- Fecha: 2025-01-XX
-- Descripción: 
--   1. Crea tabla person_documents para relación normalizada (si no existe)
--   2. Migra datos existentes de persons a person_documents
--   3. Elimina campos de documentos de la tabla persons
-- ============================================================================

-- ============================================================================
-- 1. CREAR TABLA DE RELACIÓN PERSON_DOCUMENTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS person_documents (
    id SERIAL PRIMARY KEY,
    person_id INTEGER REFERENCES persons(id) ON DELETE CASCADE NOT NULL,
    document_id INTEGER REFERENCES documents(id) ON DELETE CASCADE NOT NULL,
    document_value VARCHAR(255) NOT NULL,  -- Valor del documento (ej: número de CURP, RFC, etc.)
    issue_date DATE,  -- Fecha de emisión del documento
    expiration_date DATE,  -- Fecha de expiración del documento (si aplica)
    issuing_authority VARCHAR(200),  -- Autoridad emisora (ej: SAT, Secretaría de Salud, etc.)
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(person_id, document_id)  -- Una persona solo puede tener un valor por tipo de documento
);

-- Índices para optimizar búsquedas
CREATE INDEX IF NOT EXISTS idx_person_documents_person_id ON person_documents(person_id);
CREATE INDEX IF NOT EXISTS idx_person_documents_document_id ON person_documents(document_id);
CREATE INDEX IF NOT EXISTS idx_person_documents_value ON person_documents(document_value);

-- ============================================================================
-- 2. MIGRAR DATOS EXISTENTES (ANTES DE ELIMINAR COLUMNAS)
-- ============================================================================

-- Migrar CURP si existe
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'persons' AND column_name = 'curp') THEN
        INSERT INTO person_documents (person_id, document_id, document_value, created_at, updated_at)
        SELECT p.id, 
               (SELECT id FROM documents WHERE name = 'CURP' AND document_type_id = 1 LIMIT 1),
               p.curp,
               NOW(),
               NOW()
        FROM persons p
        WHERE p.curp IS NOT NULL 
          AND p.curp != ''
          AND NOT EXISTS (
              SELECT 1 FROM person_documents pd 
              WHERE pd.person_id = p.id 
              AND pd.document_id = (SELECT id FROM documents WHERE name = 'CURP' AND document_type_id = 1 LIMIT 1)
          )
        ON CONFLICT DO NOTHING;
    END IF;
END $$;

-- Migrar RFC si existe
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'persons' AND column_name = 'rfc') THEN
        INSERT INTO person_documents (person_id, document_id, document_value, created_at, updated_at)
        SELECT p.id, 
               (SELECT id FROM documents WHERE name = 'Otro' AND document_type_id = 1 LIMIT 1),
               p.rfc,
               NOW(),
               NOW()
        FROM persons p
        WHERE p.rfc IS NOT NULL 
          AND p.rfc != ''
          AND NOT EXISTS (
              SELECT 1 FROM person_documents pd 
              WHERE pd.person_id = p.id 
              AND pd.document_id = (SELECT id FROM documents WHERE name = 'Otro' AND document_type_id = 1 LIMIT 1)
              AND pd.document_value = p.rfc
          )
        ON CONFLICT DO NOTHING;
    END IF;
END $$;

-- Migrar medical_license si existe
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'persons' AND column_name = 'medical_license') THEN
        INSERT INTO person_documents (person_id, document_id, document_value, created_at, updated_at)
        SELECT p.id, 
               (SELECT id FROM documents WHERE name = 'Medical License Number' AND document_type_id = 2 LIMIT 1),
               p.medical_license,
               NOW(),
               NOW()
        FROM persons p
        WHERE p.medical_license IS NOT NULL 
          AND p.medical_license != ''
          AND NOT EXISTS (
              SELECT 1 FROM person_documents pd 
              WHERE pd.person_id = p.id 
              AND pd.document_id = (SELECT id FROM documents WHERE name = 'Medical License Number' AND document_type_id = 2 LIMIT 1)
          )
        ON CONFLICT DO NOTHING;
    END IF;
END $$;

-- Migrar professional_license si existe
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'persons' AND column_name = 'professional_license') THEN
        INSERT INTO person_documents (person_id, document_id, document_value, created_at, updated_at)
        SELECT p.id, 
               (SELECT id FROM documents WHERE name = 'Cédula Profesional' AND document_type_id = 2 LIMIT 1),
               p.professional_license,
               NOW(),
               NOW()
        FROM persons p
        WHERE p.professional_license IS NOT NULL 
          AND p.professional_license != ''
          AND NOT EXISTS (
              SELECT 1 FROM person_documents pd 
              WHERE pd.person_id = p.id 
              AND pd.document_id = (SELECT id FROM documents WHERE name = 'Cédula Profesional' AND document_type_id = 2 LIMIT 1)
          )
        ON CONFLICT DO NOTHING;
    END IF;
END $$;

-- Migrar specialty_license si existe
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'persons' AND column_name = 'specialty_license') THEN
        INSERT INTO person_documents (person_id, document_id, document_value, created_at, updated_at)
        SELECT p.id, 
               (SELECT id FROM documents WHERE name = 'Número de Colegiación' AND document_type_id = 2 LIMIT 1),
               p.specialty_license,
               NOW(),
               NOW()
        FROM persons p
        WHERE p.specialty_license IS NOT NULL 
          AND p.specialty_license != ''
          AND NOT EXISTS (
              SELECT 1 FROM person_documents pd 
              WHERE pd.person_id = p.id 
              AND pd.document_id = (SELECT id FROM documents WHERE name = 'Número de Colegiación' AND document_type_id = 2 LIMIT 1)
          )
        ON CONFLICT DO NOTHING;
    END IF;
END $$;

-- ============================================================================
-- 3. ELIMINAR COLUMNAS DE PERSONS
-- ============================================================================

-- Eliminar índices relacionados primero
DROP INDEX IF EXISTS idx_persons_curp;
DROP INDEX IF EXISTS persons_curp_key;

-- Eliminar columnas
ALTER TABLE persons 
    DROP COLUMN IF EXISTS curp,
    DROP COLUMN IF EXISTS rfc,
    DROP COLUMN IF EXISTS medical_license,
    DROP COLUMN IF EXISTS professional_license,
    DROP COLUMN IF EXISTS specialty_license,
    DROP COLUMN IF EXISTS subspecialty,
    DROP COLUMN IF EXISTS professional_seal,
    DROP COLUMN IF EXISTS digital_signature;

-- ============================================================================
-- FIN DE LA MIGRACIÓN
-- ============================================================================
