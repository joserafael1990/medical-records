-- ============================================================================
-- PRODUCTION DATABASE MASTER DATA POPULATION SCRIPT
-- Description: Populates all master/catalog tables with initial data
-- Author: CORTEX Medical Records System
-- Date: 2025-12-01
-- Compliance: NOM-004-SSA3-2012, NOM-024-SSA3-2012
-- ============================================================================

-- ============================================================================
-- 1. COUNTRIES
-- ============================================================================
INSERT INTO countries (id, name, phone_code, is_active, created_at) VALUES
(1, 'México', '+52', true, NOW()),
(2, 'Estados Unidos', '+1', true, NOW()),
(3, 'Venezuela', '+58', true, NOW()),
(4, 'Colombia', '+57', true, NOW()),
(5, 'Argentina', '+54', true, NOW()),
(6, 'España', '+34', true, NOW()),
(7, 'Chile', '+56', true, NOW()),
(8, 'Perú', '+51', true, NOW()),
(9, 'Ecuador', '+593', true, NOW()),
(10, 'Guatemala', '+502', true, NOW())
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    phone_code = EXCLUDED.phone_code,
    is_active = EXCLUDED.is_active;

-- Update sequence
SELECT setval('countries_id_seq', 10, true);

-- ============================================================================
-- 2. STATES - MÉXICO
-- ============================================================================
INSERT INTO states (id, name, country_id, is_active, created_at) VALUES
-- Estados de México
(1, 'Aguascalientes', 1, true, NOW()),
(2, 'Baja California', 1, true, NOW()),
(3, 'Baja California Sur', 1, true, NOW()),
(4, 'Campeche', 1, true, NOW()),
(5, 'Chiapas', 1, true, NOW()),
(6, 'Chihuahua', 1, true, NOW()),
(7, 'Ciudad de México', 1, true, NOW()),
(8, 'Coahuila', 1, true, NOW()),
(9, 'Colima', 1, true, NOW()),
(10, 'Durango', 1, true, NOW()),
(11, 'Guanajuato', 1, true, NOW()),
(12, 'Guerrero', 1, true, NOW()),
(13, 'Hidalgo', 1, true, NOW()),
(14, 'Jalisco', 1, true, NOW()),
(15, 'México', 1, true, NOW()),
(16, 'Michoacán', 1, true, NOW()),
(17, 'Morelos', 1, true, NOW()),
(18, 'Nayarit', 1, true, NOW()),
(19, 'Nuevo León', 1, true, NOW()),
(20, 'Oaxaca', 1, true, NOW()),
(21, 'Puebla', 1, true, NOW()),
(22, 'Querétaro', 1, true, NOW()),
(23, 'Quintana Roo', 1, true, NOW()),
(24, 'San Luis Potosí', 1, true, NOW()),
(25, 'Sinaloa', 1, true, NOW()),
(26, 'Sonora', 1, true, NOW()),
(27, 'Tabasco', 1, true, NOW()),
(28, 'Tamaulipas', 1, true, NOW()),
(29, 'Tlaxcala', 1, true, NOW()),
(30, 'Veracruz', 1, true, NOW()),
(31, 'Yucatán', 1, true, NOW()),
(32, 'Zacatecas', 1, true, NOW())
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    country_id = EXCLUDED.country_id,
    is_active = EXCLUDED.is_active;

-- Update sequence
SELECT setval('states_id_seq', 32, true);

-- ============================================================================
-- 3. SPECIALTIES (Medical Specialties)
-- ============================================================================
INSERT INTO specialties (id, name, is_active, created_at) VALUES
(1, 'Medicina General', true, NOW()),
(2, 'Cardiología', true, NOW()),
(3, 'Dermatología', true, NOW()),
(4, 'Endocrinología', true, NOW()),
(5, 'Gastroenterología', true, NOW()),
(6, 'Ginecología y Obstetricia', true, NOW()),
(7, 'Medicina Interna', true, NOW()),
(8, 'Nefrología', true, NOW()),
(9, 'Neumología', true, NOW()),
(10, 'Neurología', true, NOW()),
(11, 'Oftalmología', true, NOW()),
(12, 'Oncología', true, NOW()),
(13, 'Ortopedia y Traumatología', true, NOW()),
(14, 'Otorrinolaringología', true, NOW()),
(15, 'Pediatría', true, NOW()),
(16, 'Psiquiatría', true, NOW()),
(17, 'Reumatología', true, NOW()),
(18, 'Urología', true, NOW()),
(19, 'Cirugía General', true, NOW()),
(20, 'Anestesiología', true, NOW()),
(21, 'Radiología', true, NOW()),
(22, 'Patología', true, NOW()),
(23, 'Medicina Familiar', true, NOW()),
(24, 'Geriatría', true, NOW()),
(25, 'Hematología', true, NOW()),
(26, 'Infectología', true, NOW()),
(27, 'Medicina del Deporte', true, NOW()),
(28, 'Nutrición', true, NOW()),
(29, 'Psicología', true, NOW()),
(30, 'Fisioterapia', true, NOW())
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    is_active = EXCLUDED.is_active;

-- Update sequence
SELECT setval('specialties_id_seq', 30, true);

-- ============================================================================
-- 4. EMERGENCY RELATIONSHIPS
-- ============================================================================
INSERT INTO emergency_relationships (id, name, is_active, created_at) VALUES
(1, 'Padre', true, NOW()),
(2, 'Madre', true, NOW()),
(3, 'Esposo/a', true, NOW()),
(4, 'Hijo/a', true, NOW()),
(5, 'Hermano/a', true, NOW()),
(6, 'Abuelo/a', true, NOW()),
(7, 'Tío/a', true, NOW()),
(8, 'Primo/a', true, NOW()),
(9, 'Amigo/a', true, NOW()),
(10, 'Otro', true, NOW())
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    is_active = EXCLUDED.is_active;

-- Update sequence
SELECT setval('emergency_relationships_id_seq', 10, true);

-- ============================================================================
-- 5. APPOINTMENT TYPES
-- ============================================================================
INSERT INTO appointment_types (id, name, active, created_at) VALUES
(1, 'Presencial', true, NOW()),
(2, 'En línea', true, NOW())
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    active = EXCLUDED.active;

-- Update sequence
SELECT setval('appointment_types_id_seq', 2, true);

-- ============================================================================
-- 6. VITAL SIGNS CATALOG
-- ============================================================================
INSERT INTO vital_signs (id, name, unit, normal_min, normal_max, is_active, created_at) VALUES
(1, 'Estatura', 'cm', NULL, NULL, true, NOW()),
(2, 'Peso', 'kg', NULL, NULL, true, NOW()),
(3, 'Índice de Masa Corporal', 'kg/m²', 18.5, 24.9, true, NOW()),
(4, 'Frecuencia Cardíaca', 'bpm', 60, 100, true, NOW()),
(5, 'Frecuencia Respiratoria', 'bpm', 12, 20, true, NOW()),
(6, 'Perímetro cefálico', 'cm', NULL, NULL, true, NOW()),
(7, 'Presión Arterial Diastólica', 'mmHg', 60, 80, true, NOW()),
(8, 'Presión Arterial Sistólica', 'mmHg', 90, 120, true, NOW()),
(9, 'Saturación de Oxígeno', '%', 95, 100, true, NOW()),
(10, 'Superficie Corporal', 'm²', NULL, NULL, true, NOW()),
(11, 'Temperatura', '°C', 36.0, 37.5, true, NOW())
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    unit = EXCLUDED.unit,
    normal_min = EXCLUDED.normal_min,
    normal_max = EXCLUDED.normal_max,
    is_active = EXCLUDED.is_active;

-- Update sequence
SELECT setval('vital_signs_id_seq', 11, true);

-- ============================================================================
-- 7. DOCUMENT TYPES
-- ============================================================================
INSERT INTO document_types (id, name, is_active, created_at) VALUES
(1, 'Personal', true, NOW()),
(2, 'Profesional', true, NOW())
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    is_active = EXCLUDED.is_active;

-- Update sequence
SELECT setval('document_types_id_seq', 2, true);

-- ============================================================================
-- 8. STUDY CATEGORIES
-- ============================================================================
INSERT INTO study_categories (id, name, is_active, created_at) VALUES
(1, 'Laboratorio Clínico', true, NOW()),
(2, 'Imagenología', true, NOW()),
(3, 'Cardiología', true, NOW()),
(4, 'Endoscopía', true, NOW()),
(5, 'Patología', true, NOW()),
(6, 'Microbiología', true, NOW()),
(7, 'Genética', true, NOW()),
(8, 'Medicina Nuclear', true, NOW()),
(9, 'Ultrasonido', true, NOW()),
(10, 'Otros', true, NOW())
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    is_active = EXCLUDED.is_active;

-- Update sequence
SELECT setval('study_categories_id_seq', 10, true);

-- ============================================================================
-- 9. COMMON MEDICATIONS (Base Catalog)
-- ============================================================================
INSERT INTO medications (id, name, is_active, created_by, created_at, updated_at) VALUES
(1, 'Paracetamol 500mg', true, 0, NOW(), NOW()),
(2, 'Ibuprofeno 400mg', true, 0, NOW(), NOW()),
(3, 'Amoxicilina 500mg', true, 0, NOW(), NOW()),
(4, 'Omeprazol 20mg', true, 0, NOW(), NOW()),
(5, 'Losartán 50mg', true, 0, NOW(), NOW()),
(6, 'Metformina 850mg', true, 0, NOW(), NOW()),
(7, 'Atorvastatina 20mg', true, 0, NOW(), NOW()),
(8, 'Ácido Acetilsalicílico 100mg', true, 0, NOW(), NOW()),
(9, 'Captopril 25mg', true, 0, NOW(), NOW()),
(10, 'Ranitidina 150mg', true, 0, NOW(), NOW()),
(11, 'Ciprofloxacino 500mg', true, 0, NOW(), NOW()),
(12, 'Clonazepam 2mg', true, 0, NOW(), NOW()),
(13, 'Diclofenaco 50mg', true, 0, NOW(), NOW()),
(14, 'Loratadina 10mg', true, 0, NOW(), NOW()),
(15, 'Salbutamol 100mcg', true, 0, NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    is_active = EXCLUDED.is_active,
    created_by = 0,
    updated_at = NOW();

-- Update sequence
SELECT setval('medications_id_seq', 15, true);

-- ============================================================================
-- 10. COMMON DIAGNOSES (CIE-10)
-- ============================================================================
INSERT INTO diagnosis_catalog (id, code, name, is_active, created_by, created_at, updated_at) VALUES
(1, 'I10', 'Hipertensión esencial (primaria)', true, 0, NOW(), NOW()),
(2, 'E11.9', 'Diabetes mellitus tipo 2 sin complicaciones', true, 0, NOW(), NOW()),
(3, 'E78.5', 'Hiperlipidemia no especificada', true, 0, NOW(), NOW()),
(4, 'E66.9', 'Obesidad no especificada', true, 0, NOW(), NOW()),
(5, 'J06.9', 'Infección aguda de las vías respiratorias superiores no especificada', true, 0, NOW(), NOW()),
(6, 'K21.9', 'Enfermedad por reflujo gastroesofágico sin esofagitis', true, 0, NOW(), NOW()),
(7, 'M54.5', 'Lumbago no especificado', true, 0, NOW(), NOW()),
(8, 'R51', 'Cefalea', true, 0, NOW(), NOW()),
(9, 'N39.0', 'Infección de vías urinarias sitio no especificado', true, 0, NOW(), NOW()),
(10, 'J45.9', 'Asma no especificada', true, 0, NOW(), NOW()),
(11, 'K29.7', 'Gastritis no especificada', true, 0, NOW(), NOW()),
(12, 'M79.3', 'Paniculitis no especificada', true, 0, NOW(), NOW()),
(13, 'F41.9', 'Trastorno de ansiedad no especificado', true, 0, NOW(), NOW()),
(14, 'F32.9', 'Episodio depresivo no especificado', true, 0, NOW(), NOW()),
(15, 'G43.9', 'Migraña no especificada', true, 0, NOW(), NOW()),
(16, 'J18.9', 'Neumonía no especificada', true, 0, NOW(), NOW()),
(17, 'A09', 'Diarrea y gastroenteritis de presunto origen infeccioso', true, 0, NOW(), NOW()),
(18, 'L30.9', 'Dermatitis no especificada', true, 0, NOW(), NOW()),
(19, 'N18.9', 'Enfermedad renal crónica no especificada', true, 0, NOW(), NOW()),
(20, 'I25.9', 'Enfermedad isquémica crónica del corazón no especificada', true, 0, NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
    code = EXCLUDED.code,
    name = EXCLUDED.name,
    is_active = EXCLUDED.is_active,
    created_by = 0,
    updated_at = NOW();

-- Update sequence
SELECT setval('diagnosis_catalog_id_seq', 20, true);

-- ============================================================================
-- 11. COMMON CLINICAL STUDIES
-- ============================================================================
INSERT INTO study_catalog (id, name, category_id, is_active, created_by, created_at, updated_at) VALUES
(1, 'Biometría Hemática Completa', 1, true, 0, NOW(), NOW()),
(2, 'Química Sanguínea (Glucosa, Urea, Creatinina)', 1, true, 0, NOW(), NOW()),
(3, 'Perfil de Lípidos', 1, true, 0, NOW(), NOW()),
(4, 'Examen General de Orina', 1, true, 0, NOW(), NOW()),
(5, 'Radiografía de Tórax', 2, true, 0, NOW(), NOW()),
(6, 'Electrocardiograma', 3, true, 0, NOW(), NOW()),
(7, 'Ultrasonido Abdominal', 9, true, 0, NOW(), NOW()),
(8, 'Tomografía Computarizada', 2, true, 0, NOW(), NOW()),
(9, 'Resonancia Magnética', 2, true, 0, NOW(), NOW()),
(10, 'Pruebas de Función Hepática', 1, true, 0, NOW(), NOW()),
(11, 'Hemoglobina Glucosilada (HbA1c)', 1, true, 0, NOW(), NOW()),
(12, 'Prueba de Esfuerzo', 3, true, 0, NOW(), NOW()),
(13, 'Endoscopía Digestiva Alta', 4, true, 0, NOW(), NOW()),
(14, 'Colonoscopía', 4, true, 0, NOW(), NOW()),
(15, 'Mamografía', 2, true, 0, NOW(), NOW()),
(16, 'Papanicolaou', 5, true, 0, NOW(), NOW()),
(17, 'Cultivo de Orina', 6, true, 0, NOW(), NOW()),
(18, 'Cultivo de Garganta', 6, true, 0, NOW(), NOW()),
(19, 'Espirometría', 9, true, 0, NOW(), NOW()),
(20, 'Densitometría Ósea', 2, true, 0, NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    category_id = EXCLUDED.category_id,
    is_active = EXCLUDED.is_active,
    created_by = 0,
    updated_at = NOW();

-- Update sequence
SELECT setval('study_catalog_id_seq', 20, true);

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify data insertion
SELECT 'Countries' as table_name, COUNT(*) as total FROM countries
UNION ALL
SELECT 'States (México)', COUNT(*) FROM states WHERE country_id = 1
UNION ALL
SELECT 'Specialties', COUNT(*) FROM specialties
UNION ALL
SELECT 'Emergency Relationships', COUNT(*) FROM emergency_relationships
UNION ALL
SELECT 'Appointment Types', COUNT(*) FROM appointment_types
UNION ALL
SELECT 'Vital Signs', COUNT(*) FROM vital_signs
UNION ALL
SELECT 'Document Types', COUNT(*) FROM document_types
UNION ALL
SELECT 'Study Categories', COUNT(*) FROM study_categories
UNION ALL
SELECT 'Medications', COUNT(*) FROM medications WHERE created_by = 0
UNION ALL
SELECT 'Diagnoses', COUNT(*) FROM diagnosis_catalog WHERE created_by = 0
UNION ALL
SELECT 'Clinical Studies', COUNT(*) FROM study_catalog WHERE created_by = 0;

-- ============================================================================
-- END OF SCRIPT
-- ============================================================================
