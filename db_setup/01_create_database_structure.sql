-- ============================================================================
-- SISTEMA DE HISTORIAS CLÍNICAS ELECTRÓNICAS
-- Script de creación de estructura de base de datos
-- ============================================================================

-- Crear base de datos si no existe
-- CREATE DATABASE historias_clinicas;

-- Conectar a la base de datos
-- \c historias_clinicas;

-- ============================================================================
-- CATÁLOGOS GEOGRÁFICOS
-- ============================================================================

-- Tabla de países
CREATE TABLE IF NOT EXISTS countries (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    phone_code VARCHAR(5),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Tabla de estados/provincias
CREATE TABLE IF NOT EXISTS states (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    country_id INTEGER REFERENCES countries(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Tabla de relaciones de emergencia
CREATE TABLE IF NOT EXISTS emergency_relationships (
    code VARCHAR(20) PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- CATÁLOGOS MÉDICOS
-- ============================================================================

-- Tabla de especialidades médicas
CREATE TABLE IF NOT EXISTS medical_specialties (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

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

-- Tabla de categorías de estudios clínicos
CREATE TABLE IF NOT EXISTS study_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Tabla de catálogo de estudios clínicos
CREATE TABLE IF NOT EXISTS study_catalog (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    code VARCHAR(50),
    category_id INTEGER REFERENCES study_categories(id),
    specialty VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- study_normal_values table removed - not used
-- study_templates table removed - not used
-- study_template_items table removed - not used

-- Tabla de medicamentos
CREATE TABLE IF NOT EXISTS medications (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL UNIQUE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_by INTEGER DEFAULT 0
);

-- Tabla de categorías de diagnósticos
CREATE TABLE IF NOT EXISTS diagnosis_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Tabla de catálogo de diagnósticos
CREATE TABLE IF NOT EXISTS diagnosis_catalog (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    code VARCHAR(50) UNIQUE,
    category_id INTEGER REFERENCES diagnosis_categories(id),
    description TEXT,
    specialty VARCHAR(100),
    severity_level VARCHAR(50),
    is_chronic BOOLEAN DEFAULT FALSE,
    is_contagious BOOLEAN DEFAULT FALSE,
    age_group VARCHAR(50),
    gender_specific VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE,
    created_by INTEGER DEFAULT 0,
    search_vector tsvector,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- diagnosis_differentials table removed - not used
-- diagnosis_recommendations table removed - not used

-- ============================================================================
-- TABLA PRINCIPAL: PERSONAS
-- ============================================================================

CREATE TABLE IF NOT EXISTS persons (
    id SERIAL PRIMARY KEY,
    person_code VARCHAR(20) UNIQUE NOT NULL,
    person_type VARCHAR(20) NOT NULL CHECK (person_type IN ('doctor', 'patient', 'admin')),
    
    -- Datos personales (NOM-004)
    title VARCHAR(10),
    birth_date DATE,
    gender VARCHAR(20),  -- Optional: can be NULL for first-time appointments
    civil_status VARCHAR(20),
    birth_city VARCHAR(100),
    
    -- Ubicación de nacimiento
    birth_state_id INTEGER REFERENCES states(id),
    birth_country_id INTEGER REFERENCES countries(id),
    
    -- Información de contacto
    email VARCHAR(100),
    primary_phone VARCHAR(20),
    
    -- Dirección personal
    home_address TEXT,
    address_city VARCHAR(100),
    address_state_id INTEGER REFERENCES states(id),
    address_country_id INTEGER REFERENCES countries(id),
    address_postal_code VARCHAR(5),
    
    -- Dirección profesional (solo doctores)
    office_address TEXT,
    office_city VARCHAR(100),
    office_state_id INTEGER REFERENCES states(id),
    office_postal_code VARCHAR(5),
    office_phone VARCHAR(20),
    office_timezone VARCHAR(50) DEFAULT 'America/Mexico_City',
    
    -- Especialidad médica (solo doctores)
    specialty_id INTEGER REFERENCES medical_specialties(id),
    university VARCHAR(200),
    graduation_year INTEGER,
    professional_license VARCHAR(50),
    appointment_duration INTEGER,  -- Duración de citas en minutos (solo doctores)
    
    -- Datos médicos (solo pacientes)
    insurance_provider VARCHAR(100),  -- Proveedor de seguro médico
    insurance_number VARCHAR(50),  -- Número de seguro médico
    
    -- Contacto de emergencia
    emergency_contact_name VARCHAR(200),
    emergency_contact_phone VARCHAR(20),
    emergency_contact_relationship VARCHAR(20) REFERENCES emergency_relationships(code),
    
    -- Autenticación
    hashed_password VARCHAR(255),  -- Contraseña hasheada
    
    -- Sistema
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP,  -- Fecha y hora del último inicio de sesión
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_by INTEGER,
    
    -- Name (single column instead of first_name/paternal_surname/maternal_surname)
    name VARCHAR(200) NOT NULL,
    
    -- Avatar fields
    avatar_type VARCHAR(50),
    avatar_template_key VARCHAR(100),
    avatar_file_path VARCHAR(500)
);

-- ============================================================================
-- TABLA DE RELACIÓN: PERSON_DOCUMENTS
-- ============================================================================

-- Tabla de relación entre personas y documentos (normalización)
CREATE TABLE IF NOT EXISTS person_documents (
    id SERIAL PRIMARY KEY,
    person_id INTEGER REFERENCES persons(id) ON DELETE CASCADE NOT NULL,
    document_id INTEGER REFERENCES documents(id) ON DELETE CASCADE NOT NULL,
    document_value VARCHAR(255) NOT NULL,  -- Valor del documento (ej: número de CURP, RFC, etc.)
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(person_id, document_id)  -- Una persona solo puede tener un valor por tipo de documento
);

-- Índice para búsquedas rápidas por persona
CREATE INDEX IF NOT EXISTS idx_person_documents_person_id ON person_documents(person_id);

-- Índice para búsquedas rápidas por documento
CREATE INDEX IF NOT EXISTS idx_person_documents_document_id ON person_documents(document_id);

-- Índice para búsquedas por valor del documento
CREATE INDEX IF NOT EXISTS idx_person_documents_value ON person_documents(document_value);

-- ============================================================================
-- TABLAS DE CONFIGURACIÓN (OFFICES)
-- ============================================================================

-- Tabla de oficinas/consultorios
CREATE TABLE IF NOT EXISTS offices (
    id SERIAL PRIMARY KEY,
    doctor_id INTEGER REFERENCES persons(id) NOT NULL,
    name VARCHAR(200) NOT NULL,
    
    -- Dirección
    address TEXT,
    city VARCHAR(100),
    state_id INTEGER REFERENCES states(id),
    country_id INTEGER REFERENCES countries(id),
    postal_code VARCHAR(10),
    
    -- Contacto
    phone VARCHAR(20),
    
    -- Configuración
    timezone VARCHAR(50) DEFAULT 'America/Mexico_City',
    maps_url TEXT,  -- URL de Google Maps
    
    -- Sistema
    is_active BOOLEAN DEFAULT TRUE,
    is_virtual BOOLEAN DEFAULT FALSE,  -- Indica si es consultorio virtual
    virtual_url VARCHAR(500),  -- URL para consultas virtuales (Zoom, Teams, etc.)
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Índices para offices
CREATE INDEX IF NOT EXISTS idx_offices_doctor_id ON offices(doctor_id);
CREATE INDEX IF NOT EXISTS idx_offices_is_active ON offices(is_active);

-- ============================================================================
-- TABLAS MÉDICAS TRANSACCIONALES
-- ============================================================================

-- Tabla de historias clínicas/consultas
CREATE TABLE IF NOT EXISTS medical_records (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER REFERENCES persons(id) NOT NULL,
    doctor_id INTEGER REFERENCES persons(id) NOT NULL,
    consultation_date TIMESTAMP NOT NULL,
    
    -- Campos requeridos NOM-004
    chief_complaint TEXT NOT NULL,
    history_present_illness TEXT NOT NULL,
    family_history TEXT NOT NULL,
    perinatal_history TEXT NOT NULL,
    gynecological_and_obstetric_history TEXT NOT NULL,
    personal_pathological_history TEXT NOT NULL,
    personal_non_pathological_history TEXT NOT NULL,
    physical_examination TEXT NOT NULL,
    primary_diagnosis TEXT NOT NULL,
    treatment_plan TEXT NOT NULL,
    
    -- Tipo de consulta
    consultation_type VARCHAR(50) DEFAULT 'Seguimiento',
    
    -- Campos opcionales
    secondary_diagnoses TEXT,
    prescribed_medications TEXT,
    laboratory_results TEXT,
    notes TEXT,
    
    -- Sistema
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_by INTEGER REFERENCES persons(id)
);

-- Tabla de tipos de citas
CREATE TABLE IF NOT EXISTS appointment_types (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Tabla de citas médicas
CREATE TABLE IF NOT EXISTS appointments (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER REFERENCES persons(id) NOT NULL,
    doctor_id INTEGER REFERENCES persons(id) NOT NULL,
    
    -- SCHEDULING
    appointment_date TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    
    -- DETAILS
    appointment_type_id INTEGER REFERENCES appointment_types(id) NOT NULL,
    office_id INTEGER REFERENCES offices(id),
    consultation_type VARCHAR(50) DEFAULT 'Seguimiento',  -- 'Primera vez' or 'Seguimiento'
    status VARCHAR(20) DEFAULT 'por_confirmar',
    
    -- CLINICAL INFORMATION
    -- ADMINISTRATIVE
    reminder_sent BOOLEAN DEFAULT FALSE,
    reminder_sent_at TIMESTAMP,
    
    -- AUTO REMINDER (WhatsApp)
    auto_reminder_enabled BOOLEAN DEFAULT FALSE,
    auto_reminder_offset_minutes INTEGER DEFAULT 360,  -- 6 hours default
    
    -- CANCELLATION
    cancelled_reason TEXT,
    cancelled_at TIMESTAMP,
    cancelled_by INTEGER REFERENCES persons(id),
    
    -- SYSTEM
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_by INTEGER REFERENCES persons(id)
);

-- Tabla de estudios clínicos
CREATE TABLE IF NOT EXISTS clinical_studies (
    id SERIAL PRIMARY KEY,
    consultation_id INTEGER REFERENCES medical_records(id) ON DELETE CASCADE,
    patient_id INTEGER REFERENCES persons(id) NOT NULL,
    doctor_id INTEGER REFERENCES persons(id) NOT NULL,
    study_type VARCHAR(100),
    study_name VARCHAR(200),
    ordered_date TIMESTAMP,
    performed_date TIMESTAMP,
    status VARCHAR(50) DEFAULT 'ordered',
    urgency VARCHAR(20) DEFAULT 'normal',
    clinical_indication TEXT,
    ordering_doctor VARCHAR(200),
    file_name VARCHAR(255),
    file_path VARCHAR(500),
    file_type VARCHAR(50),
    file_size INTEGER,
    created_by INTEGER REFERENCES persons(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabla de recetas médicas
CREATE TABLE IF NOT EXISTS consultation_prescriptions (
    id SERIAL PRIMARY KEY,
    consultation_id INTEGER REFERENCES medical_records(id) ON DELETE CASCADE,
    medication_id INTEGER REFERENCES medications(id),
    dosage VARCHAR(100),
    frequency VARCHAR(100),
    duration VARCHAR(100),
    quantity INTEGER,
    via_administracion VARCHAR(100),
    instructions TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Tabla de signos vitales (catálogo)
CREATE TABLE IF NOT EXISTS vital_signs (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Tabla de signos vitales por consulta
CREATE TABLE IF NOT EXISTS consultation_vital_signs (
    id SERIAL PRIMARY KEY,
    consultation_id INTEGER REFERENCES medical_records(id) ON DELETE CASCADE,
    vital_sign_id INTEGER REFERENCES vital_signs(id),
    value VARCHAR(100) NOT NULL,
    unit VARCHAR(20),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- SISTEMA DE HORARIOS
-- ============================================================================

-- Tabla de plantillas de horarios
CREATE TABLE IF NOT EXISTS schedule_templates (
    id SERIAL PRIMARY KEY,
    doctor_id INTEGER REFERENCES persons(id) ON DELETE CASCADE,
    office_id INTEGER REFERENCES offices(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    time_blocks JSONB DEFAULT '[]',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- schedule_exceptions table removed - not used

-- ============================================================================
-- SISTEMA DE AUDITORÍA Y COMPLIANCE
-- ============================================================================

-- Tabla de log de auditoría
CREATE TABLE IF NOT EXISTS audit_log (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES persons(id) ON DELETE SET NULL,
    user_email VARCHAR(100),
    user_name VARCHAR(200),
    user_type VARCHAR(20),
    action VARCHAR(50) NOT NULL,
    table_name VARCHAR(50),
    record_id INTEGER,
    old_values JSON,
    new_values JSON,
    changes_summary TEXT,
    operation_type VARCHAR(50),
    affected_patient_id INTEGER REFERENCES persons(id) ON DELETE SET NULL,
    affected_patient_name VARCHAR(200),
    ip_address VARCHAR(45),
    user_agent TEXT,
    session_id VARCHAR(100),
    request_path VARCHAR(500),
    request_method VARCHAR(10),
    success BOOLEAN DEFAULT TRUE,
    error_message TEXT,
    security_level VARCHAR(20) DEFAULT 'INFO',
    timestamp TIMESTAMP DEFAULT NOW(),
    metadata JSON
);

-- Tabla de avisos de privacidad
CREATE TABLE IF NOT EXISTS privacy_notices (
    id SERIAL PRIMARY KEY,
    version VARCHAR(20) NOT NULL,
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    effective_date DATE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Tabla de consentimientos de privacidad
CREATE TABLE IF NOT EXISTS privacy_consents (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER REFERENCES persons(id) ON DELETE CASCADE,
    notice_id INTEGER REFERENCES privacy_notices(id),
    consent_given BOOLEAN NOT NULL,
    consent_date TIMESTAMP NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Tabla de solicitudes ARCO
CREATE TABLE IF NOT EXISTS arco_requests (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER REFERENCES persons(id) ON DELETE CASCADE,
    request_type VARCHAR(20) NOT NULL CHECK (request_type IN ('access', 'rectification', 'cancellation', 'opposition')),
    description TEXT,
    status VARCHAR(20) DEFAULT 'pending',
    response TEXT,
    processed_by INTEGER REFERENCES persons(id),
    processed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Tabla de logs de retención de datos
CREATE TABLE IF NOT EXISTS data_retention_logs (
    id SERIAL PRIMARY KEY,
    table_name VARCHAR(50) NOT NULL,
    record_id INTEGER NOT NULL,
    retention_period_years INTEGER NOT NULL,
    expiration_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- ÍNDICES PARA OPTIMIZACIÓN
-- ============================================================================

-- Índices para búsquedas frecuentes
CREATE INDEX IF NOT EXISTS idx_persons_person_type ON persons(person_type);
CREATE INDEX IF NOT EXISTS idx_persons_email ON persons(email);
CREATE INDEX IF NOT EXISTS idx_medical_records_patient_id ON medical_records(patient_id);
CREATE INDEX IF NOT EXISTS idx_medical_records_doctor_id ON medical_records(doctor_id);
CREATE INDEX IF NOT EXISTS idx_appointments_patient_id ON appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_doctor_id ON appointments(doctor_id);
CREATE INDEX IF NOT EXISTS idx_clinical_studies_patient_id ON clinical_studies(patient_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_timestamp ON audit_log(timestamp);

-- ============================================================================
-- VISTAS PARA REPORTES
-- ============================================================================

-- Vista de búsqueda de diagnósticos
CREATE OR REPLACE VIEW diagnosis_search_view AS
SELECT 
    dc.id,
    dc.name,
    dc.code,
    dc.description,
    cat.name as category_name,
    dc.specialty,
    dc.severity_level,
    dc.is_chronic,
    dc.is_contagious,
    dc.age_group,
    dc.gender_specific,
    dc.search_vector
FROM diagnosis_catalog dc
LEFT JOIN diagnosis_categories cat ON dc.category_id = cat.id
WHERE dc.is_active = TRUE;

-- Vista de estadísticas de retención de datos
CREATE OR REPLACE VIEW v_data_retention_stats AS
SELECT 
    table_name,
    COUNT(*) as total_records,
    COUNT(CASE WHEN status = 'active' THEN 1 END) as active_records,
    COUNT(CASE WHEN status = 'expired' THEN 1 END) as expired_records,
    MIN(expiration_date) as earliest_expiration,
    MAX(expiration_date) as latest_expiration
FROM data_retention_logs
GROUP BY table_name;

-- Vista de datos próximos a expirar
CREATE OR REPLACE VIEW v_data_retention_expiring AS
SELECT 
    table_name,
    record_id,
    expiration_date,
    retention_period_years,
    status
FROM data_retention_logs
WHERE status = 'active' 
AND expiration_date <= CURRENT_DATE + INTERVAL '30 days'
ORDER BY expiration_date ASC;

-- ============================================================================
-- COMENTARIOS EN TABLAS
-- ============================================================================

COMMENT ON TABLE countries IS 'Catálogo de países del mundo';
COMMENT ON TABLE states IS 'Catálogo de estados/provincias por país';
COMMENT ON TABLE emergency_relationships IS 'Relaciones familiares para contactos de emergencia';
COMMENT ON TABLE medical_specialties IS 'Especialidades médicas';
COMMENT ON TABLE document_types IS 'Tipos de documento (Personal, Profesional)';
COMMENT ON TABLE documents IS 'Documentos por tipo (DNI, CURP, Cédula Profesional, etc.)';
COMMENT ON TABLE person_documents IS 'Relación normalizada entre personas y documentos';
COMMENT ON TABLE study_categories IS 'Categorías de estudios clínicos';
COMMENT ON TABLE study_catalog IS 'Catálogo de estudios clínicos disponibles';
COMMENT ON TABLE medications IS 'Catálogo de medicamentos';
COMMENT ON TABLE diagnosis_categories IS 'Categorías de diagnósticos';
COMMENT ON TABLE diagnosis_catalog IS 'Catálogo de diagnósticos médicos';
COMMENT ON TABLE vital_signs IS 'Catálogo de signos vitales';
COMMENT ON TABLE persons IS 'Tabla unificada de doctores, pacientes y administradores';
COMMENT ON TABLE medical_records IS 'Historias clínicas/consultas médicas';
COMMENT ON TABLE appointments IS 'Citas médicas';
COMMENT ON TABLE clinical_studies IS 'Estudios clínicos realizados';
COMMENT ON TABLE consultation_vital_signs IS 'Signos vitales por consulta';
COMMENT ON TABLE audit_log IS 'Log de auditoría del sistema';
COMMENT ON TABLE privacy_notices IS 'Avisos de privacidad';
COMMENT ON TABLE privacy_consents IS 'Consentimientos de privacidad';
COMMENT ON TABLE arco_requests IS 'Solicitudes ARCO (LFPDPPP)';

-- ============================================================================
-- FIN DEL SCRIPT
-- ============================================================================