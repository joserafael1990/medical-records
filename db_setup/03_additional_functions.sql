-- ============================================================================
-- SISTEMA DE HISTORIAS CLÍNICAS ELECTRÓNICAS
-- Script de funciones adicionales y optimizaciones
-- ============================================================================

-- ============================================================================
-- FUNCIÓN DE BÚSQUEDA DE DIAGNÓSTICOS
-- ============================================================================

CREATE OR REPLACE FUNCTION search_diagnoses(
    search_term text, 
    specialty_filter text DEFAULT NULL
)
RETURNS TABLE(
    id integer, 
    code character varying, 
    name character varying, 
    description text, 
    category_name character varying, 
    specialty character varying, 
    rank real
)
LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    SELECT
        d.id,
        d.code,
        d.name,
        d.description,
        d.category_name,
        d.specialty,
        ts_rank(d.search_vector, plainto_tsquery('spanish', search_term)) as rank
    FROM diagnosis_search_view d
    WHERE d.search_vector @@ plainto_tsquery('spanish', search_term)
    AND (specialty_filter IS NULL OR d.specialty = specialty_filter)
    ORDER BY rank DESC, d.name ASC
    LIMIT 50;
END;
$function$;

-- ============================================================================
-- ÍNDICES DE OPTIMIZACIÓN ADICIONALES
-- ============================================================================

-- Índices para búsquedas de texto completo
CREATE INDEX IF NOT EXISTS idx_diagnosis_catalog_search_vector 
ON diagnosis_catalog USING gin(search_vector);

-- Índices para consultas frecuentes
CREATE INDEX IF NOT EXISTS idx_medical_records_consultation_date 
ON medical_records(consultation_date);

CREATE INDEX IF NOT EXISTS idx_appointments_appointment_date 
ON appointments(appointment_date);

CREATE INDEX IF NOT EXISTS idx_clinical_studies_ordered_date 
ON clinical_studies(ordered_date);

CREATE INDEX IF NOT EXISTS idx_audit_log_timestamp_user 
ON audit_log(timestamp, user_id);

-- Índices para búsquedas por código
CREATE INDEX IF NOT EXISTS idx_diagnosis_catalog_code 
ON diagnosis_catalog(code);

-- Index for active diagnoses
CREATE INDEX IF NOT EXISTS idx_diagnosis_catalog_active 
ON diagnosis_catalog(is_active) WHERE is_active = TRUE;

-- Índices para relaciones frecuentes
CREATE INDEX IF NOT EXISTS idx_medical_records_patient_doctor 
ON medical_records(patient_id, doctor_id);

CREATE INDEX IF NOT EXISTS idx_appointments_patient_doctor 
ON appointments(patient_id, doctor_id);

CREATE INDEX IF NOT EXISTS idx_clinical_studies_patient_doctor 
ON clinical_studies(patient_id, doctor_id);

-- ============================================================================
-- RESTRICCIONES ADICIONALES DE VALIDACIÓN
-- ============================================================================

-- Restricciones para validación de datos
ALTER TABLE persons DROP CONSTRAINT IF EXISTS chk_person_type;
ALTER TABLE persons ADD CONSTRAINT chk_person_type 
CHECK (person_type IN ('doctor', 'patient', 'admin'));

ALTER TABLE appointments DROP CONSTRAINT IF EXISTS chk_appointment_status;
ALTER TABLE appointments ADD CONSTRAINT chk_appointment_status 
CHECK (status IN ('por_confirmar', 'confirmada', 'cancelled', 'completed'));

ALTER TABLE clinical_studies DROP CONSTRAINT IF EXISTS chk_study_status;
ALTER TABLE clinical_studies ADD CONSTRAINT chk_study_status 
CHECK (status IN ('ordered', 'in_progress', 'completed', 'cancelled', 'failed'));


ALTER TABLE clinical_studies DROP CONSTRAINT IF EXISTS chk_study_urgency;
ALTER TABLE clinical_studies ADD CONSTRAINT chk_study_urgency 
CHECK (urgency IN ('routine', 'urgent', 'stat', 'emergency'));

-- Restricciones para fechas
ALTER TABLE persons DROP CONSTRAINT IF EXISTS chk_birth_date;
ALTER TABLE persons ADD CONSTRAINT chk_birth_date 
CHECK (birth_date IS NULL OR birth_date <= CURRENT_DATE);

ALTER TABLE appointments DROP CONSTRAINT IF EXISTS chk_appointment_date;
ALTER TABLE appointments ADD CONSTRAINT chk_appointment_date 
CHECK (appointment_date >= CURRENT_DATE - INTERVAL '1 year');

-- Note: consultation_vital_signs uses a flexible vital_sign_id + value structure
-- Individual column constraints are not applicable

-- ============================================================================
-- TRIGGERS PARA AUDITORÍA AUTOMÁTICA
-- ============================================================================

-- Función para auditoría automática
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $audit$
BEGIN
    IF TG_OP = 'DELETE' THEN
        INSERT INTO audit_log (
            user_id, user_email, user_name, user_type,
            action, table_name, record_id, old_values,
            changes_summary, timestamp
        ) VALUES (
            OLD.created_by, NULL, NULL, 'system',
            'DELETE', TG_TABLE_NAME, OLD.id, row_to_json(OLD),
            'Record deleted', NOW()
        );
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO audit_log (
            user_id, user_email, user_name, user_type,
            action, table_name, record_id, old_values, new_values,
            changes_summary, timestamp
        ) VALUES (
            NEW.created_by, NULL, NULL, 'system',
            'UPDATE', TG_TABLE_NAME, NEW.id, row_to_json(OLD), row_to_json(NEW),
            'Record updated', NOW()
        );
        RETURN NEW;
    ELSIF TG_OP = 'INSERT' THEN
        INSERT INTO audit_log (
            user_id, user_email, user_name, user_type,
            action, table_name, record_id, new_values,
            changes_summary, timestamp
        ) VALUES (
            NEW.created_by, NULL, NULL, 'system',
            'INSERT', TG_TABLE_NAME, NEW.id, row_to_json(NEW),
            'Record created', NOW()
        );
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$audit$ LANGUAGE plpgsql;

-- Triggers para tablas críticas
DROP TRIGGER IF EXISTS audit_medical_records ON medical_records;
CREATE TRIGGER audit_medical_records
    AFTER INSERT OR UPDATE OR DELETE ON medical_records
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

DROP TRIGGER IF EXISTS audit_appointments ON appointments;
CREATE TRIGGER audit_appointments
    AFTER INSERT OR UPDATE OR DELETE ON appointments
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

DROP TRIGGER IF EXISTS audit_clinical_studies ON clinical_studies;
CREATE TRIGGER audit_clinical_studies
    AFTER INSERT OR UPDATE OR DELETE ON clinical_studies
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- ============================================================================
-- FUNCIONES DE UTILIDAD
-- ============================================================================

-- Función para calcular edad
CREATE OR REPLACE FUNCTION calculate_age(birth_date date)
RETURNS integer
LANGUAGE plpgsql
AS $function$
BEGIN
    IF birth_date IS NULL THEN
        RETURN NULL;
    END IF;
    
    RETURN EXTRACT(YEAR FROM AGE(CURRENT_DATE, birth_date));
END;
$function$;

-- Función para formatear nombre completo
DROP FUNCTION IF EXISTS format_full_name(text, text, text, text); -- Drop old signature
CREATE OR REPLACE FUNCTION format_full_name(
    title text,
    name text
)
RETURNS text
LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN TRIM(
        COALESCE(title || ' ', '') ||
        COALESCE(name, '')
    );
END;
$function$;

-- Función para validar CURP
CREATE OR REPLACE FUNCTION validate_curp(curp text)
RETURNS boolean
LANGUAGE plpgsql
AS $function$
BEGIN
    IF curp IS NULL OR curp = '' THEN
        RETURN TRUE; -- CURP es opcional
    END IF;
    
    -- Validar formato básico de CURP (18 caracteres)
    IF LENGTH(curp) != 18 THEN
        RETURN FALSE;
    END IF;
    
    -- Validar que contenga solo letras y números
    IF NOT curp ~ '^[A-Z0-9]+$' THEN
        RETURN FALSE;
    END IF;
    
    RETURN TRUE;
END;
$function$;

-- ============================================================================
-- COMENTARIOS EN FUNCIONES
-- ============================================================================

COMMENT ON FUNCTION search_diagnoses IS 'Función de búsqueda de diagnósticos con filtros de especialidad';
COMMENT ON FUNCTION calculate_age IS 'Calcula la edad basada en la fecha de nacimiento';
COMMENT ON FUNCTION format_full_name IS 'Formatea el nombre completo de una persona';
COMMENT ON FUNCTION validate_curp IS 'Valida el formato de CURP mexicano';

-- ============================================================================
-- FIN DEL SCRIPT
-- ============================================================================

