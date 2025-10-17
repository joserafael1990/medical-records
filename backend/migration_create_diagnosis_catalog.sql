-- ============================================================================
-- DIAGNOSIS CATALOG BASED ON CIE-10 (ICD-10)
-- International Classification of Diseases, 10th Revision
-- ============================================================================

-- Create diagnosis categories table
CREATE TABLE diagnosis_categories (
    id SERIAL PRIMARY KEY,
    code VARCHAR(10) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    parent_id INTEGER REFERENCES diagnosis_categories(id),
    level INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create diagnosis catalog table
CREATE TABLE diagnosis_catalog (
    id SERIAL PRIMARY KEY,
    code VARCHAR(10) UNIQUE NOT NULL,
    name VARCHAR(500) NOT NULL,
    category_id INTEGER REFERENCES diagnosis_categories(id),
    description TEXT,
    synonyms TEXT[], -- Alternative names or synonyms
    severity_level VARCHAR(20), -- mild, moderate, severe, critical
    is_chronic BOOLEAN DEFAULT false,
    is_contagious BOOLEAN DEFAULT false,
    age_group VARCHAR(50), -- pediatric, adult, geriatric, all
    gender_specific VARCHAR(10), -- male, female, both
    specialty VARCHAR(100), -- Medical specialty
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create diagnosis recommendations table
CREATE TABLE diagnosis_recommendations (
    id SERIAL PRIMARY KEY,
    diagnosis_id INTEGER REFERENCES diagnosis_catalog(id) ON DELETE CASCADE,
    recommended_study_id INTEGER REFERENCES study_catalog(id) ON DELETE CASCADE,
    recommendation_type VARCHAR(50), -- required, recommended, optional
    priority INTEGER DEFAULT 1, -- 1=high, 2=medium, 3=low
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create diagnosis differentials table
CREATE TABLE diagnosis_differentials (
    id SERIAL PRIMARY KEY,
    primary_diagnosis_id INTEGER REFERENCES diagnosis_catalog(id) ON DELETE CASCADE,
    differential_diagnosis_id INTEGER REFERENCES diagnosis_catalog(id) ON DELETE CASCADE,
    similarity_score DECIMAL(3,2), -- 0.00 to 1.00
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_diagnosis_categories_code ON diagnosis_categories (code);
CREATE INDEX idx_diagnosis_categories_parent_id ON diagnosis_categories (parent_id);
CREATE INDEX idx_diagnosis_catalog_code ON diagnosis_catalog (code);
CREATE INDEX idx_diagnosis_catalog_category_id ON diagnosis_catalog (category_id);
CREATE INDEX idx_diagnosis_catalog_specialty ON diagnosis_catalog (specialty);
CREATE INDEX idx_diagnosis_catalog_name ON diagnosis_catalog USING gin(to_tsvector('spanish', name));
CREATE INDEX idx_diagnosis_recommendations_diagnosis_id ON diagnosis_recommendations (diagnosis_id);
CREATE INDEX idx_diagnosis_recommendations_study_id ON diagnosis_recommendations (recommended_study_id);
CREATE INDEX idx_diagnosis_differentials_primary ON diagnosis_differentials (primary_diagnosis_id);
CREATE INDEX idx_diagnosis_differentials_differential ON diagnosis_differentials (differential_diagnosis_id);

-- Insert CIE-10 main categories
INSERT INTO diagnosis_categories (code, name, description, level) VALUES
('A00-B99', 'Ciertas enfermedades infecciosas y parasitarias', 'Enfermedades causadas por agentes infecciosos y parasitarios', 1),
('C00-D49', 'Neoplasias', 'Tumores benignos y malignos', 1),
('D50-D89', 'Enfermedades de la sangre y de los órganos hematopoyéticos', 'Trastornos de la sangre y sistema inmunitario', 1),
('E00-E89', 'Endocrinas, nutricionales y metabólicas', 'Trastornos endocrinos, nutricionales y metabólicos', 1),
('F01-F99', 'Trastornos mentales y del comportamiento', 'Enfermedades mentales y del comportamiento', 1),
('G00-G99', 'Enfermedades del sistema nervioso', 'Trastornos del sistema nervioso central y periférico', 1),
('H00-H59', 'Enfermedades del ojo y sus anexos', 'Trastornos oculares y de estructuras relacionadas', 1),
('H60-H95', 'Enfermedades del oído y de la apófisis mastoides', 'Trastornos del oído y estructuras relacionadas', 1),
('I00-I99', 'Enfermedades del sistema circulatorio', 'Trastornos cardiovasculares', 1),
('J00-J99', 'Enfermedades del sistema respiratorio', 'Trastornos del sistema respiratorio', 1),
('K00-K95', 'Enfermedades del sistema digestivo', 'Trastornos del sistema digestivo', 1),
('L00-L99', 'Enfermedades de la piel y del tejido subcutáneo', 'Trastornos dermatológicos', 1),
('M00-M99', 'Enfermedades del sistema osteomuscular', 'Trastornos musculoesqueléticos', 1),
('N00-N99', 'Enfermedades del sistema genitourinario', 'Trastornos del sistema genitourinario', 1),
('O00-O9A', 'Embarazo, parto y puerperio', 'Complicaciones del embarazo, parto y puerperio', 1),
('P00-P96', 'Ciertas afecciones originadas en el período perinatal', 'Trastornos del período perinatal', 1),
('Q00-Q99', 'Malformaciones congénitas', 'Anomalías congénitas y cromosómicas', 1),
('R00-R94', 'Síntomas, signos y hallazgos anormales', 'Síntomas y signos clínicos', 1),
('S00-T88', 'Traumatismos, envenenamientos y otras consecuencias', 'Lesiones y envenenamientos', 1),
('U00-U85', 'Causas externas de morbimortalidad', 'Factores externos de morbilidad y mortalidad', 1),
('V01-Y99', 'Causas externas de morbilidad y mortalidad', 'Causas externas de lesiones', 1),
('Z00-Z99', 'Factores que influyen en el estado de salud', 'Factores que influyen en el estado de salud', 1);

-- Insert subcategories for common conditions
INSERT INTO diagnosis_categories (code, name, description, parent_id, level) VALUES
-- Infectious diseases subcategories
('A00-A09', 'Enfermedades infecciosas intestinales', 'Infecciones del tracto gastrointestinal', (SELECT id FROM diagnosis_categories WHERE code = 'A00-B99'), 2),
('A15-A19', 'Tuberculosis', 'Tuberculosis en todas sus formas', (SELECT id FROM diagnosis_categories WHERE code = 'A00-B99'), 2),
('A30-A49', 'Otras enfermedades bacterianas', 'Otras infecciones bacterianas', (SELECT id FROM diagnosis_categories WHERE code = 'A00-B99'), 2),
('B00-B09', 'Infecciones virales', 'Infecciones por virus', (SELECT id FROM diagnosis_categories WHERE code = 'A00-B99'), 2),

-- Cardiovascular diseases subcategories
('I10-I16', 'Enfermedades hipertensivas', 'Hipertensión arterial', (SELECT id FROM diagnosis_categories WHERE code = 'I00-I99'), 2),
('I20-I25', 'Enfermedades isquémicas del corazón', 'Cardiopatía isquémica', (SELECT id FROM diagnosis_categories WHERE code = 'I00-I99'), 2),
('I30-I52', 'Otras formas de enfermedad del corazón', 'Otras cardiopatías', (SELECT id FROM diagnosis_categories WHERE code = 'I00-I99'), 2),
('I60-I69', 'Enfermedades cerebrovasculares', 'Accidentes cerebrovasculares', (SELECT id FROM diagnosis_categories WHERE code = 'I00-I99'), 2),

-- Respiratory diseases subcategories
('J00-J06', 'Infecciones agudas de las vías respiratorias superiores', 'Infecciones respiratorias altas', (SELECT id FROM diagnosis_categories WHERE code = 'J00-J99'), 2),
('J10-J18', 'Influenza y neumonía', 'Influenza y neumonía', (SELECT id FROM diagnosis_categories WHERE code = 'J00-J99'), 2),
('J40-J47', 'Enfermedades crónicas de las vías respiratorias inferiores', 'Enfermedades respiratorias crónicas', (SELECT id FROM diagnosis_categories WHERE code = 'J00-J99'), 2),

-- Endocrine diseases subcategories
('E10-E14', 'Diabetes mellitus', 'Diabetes mellitus', (SELECT id FROM diagnosis_categories WHERE code = 'E00-E89'), 2),
('E00-E07', 'Trastornos de la glándula tiroides', 'Trastornos tiroideos', (SELECT id FROM diagnosis_categories WHERE code = 'E00-E89'), 2),
('E65-E68', 'Obesidad y otros trastornos nutricionales', 'Obesidad y trastornos nutricionales', (SELECT id FROM diagnosis_categories WHERE code = 'E00-E89'), 2),

-- Digestive diseases subcategories
('K20-K31', 'Enfermedades del esófago, estómago y duodeno', 'Trastornos digestivos altos', (SELECT id FROM diagnosis_categories WHERE code = 'K00-K95'), 2),
('K35-K38', 'Enfermedades del apéndice', 'Apendicitis', (SELECT id FROM diagnosis_categories WHERE code = 'K00-K95'), 2),
('K70-K77', 'Enfermedades del hígado', 'Trastornos hepáticos', (SELECT id FROM diagnosis_categories WHERE code = 'K00-K95'), 2),

-- Genitourinary diseases subcategories
('N00-N08', 'Enfermedades glomerulares', 'Trastornos glomerulares', (SELECT id FROM diagnosis_categories WHERE code = 'N00-N99'), 2),
('N10-N16', 'Enfermedades tubulointersticiales del riñón', 'Trastornos tubulointersticiales', (SELECT id FROM diagnosis_categories WHERE code = 'N00-N99'), 2),
('N30-N39', 'Otras enfermedades del sistema urinario', 'Otras enfermedades urológicas', (SELECT id FROM diagnosis_categories WHERE code = 'N00-N99'), 2);

-- Insert common diagnoses
INSERT INTO diagnosis_catalog (code, name, category_id, description, synonyms, severity_level, is_chronic, specialty) VALUES
-- Infectious diseases
('A09', 'Diarrea y gastroenteritis de presunto origen infeccioso', (SELECT id FROM diagnosis_categories WHERE code = 'A00-A09'), 'Diarrea infecciosa aguda', ARRAY['Gastroenteritis infecciosa', 'Diarrea aguda'], 'mild', false, 'Medicina General'),
('A41.9', 'Sepsis no especificada', (SELECT id FROM diagnosis_categories WHERE code = 'A30-A49'), 'Infección sistémica grave', ARRAY['Septicemia', 'Infección generalizada'], 'severe', false, 'Medicina General'),
('B34.9', 'Infección viral no especificada', (SELECT id FROM diagnosis_categories WHERE code = 'B00-B09'), 'Infección viral sin especificar', ARRAY['Viremia', 'Infección viral'], 'moderate', false, 'Medicina General'),

-- Cardiovascular diseases
('I10', 'Hipertensión esencial (primaria)', (SELECT id FROM diagnosis_categories WHERE code = 'I10-I16'), 'Hipertensión arterial sin causa identificable', ARRAY['HTA', 'Hipertensión arterial'], 'moderate', true, 'Cardiología'),
('I25.9', 'Enfermedad cardíaca isquémica crónica no especificada', (SELECT id FROM diagnosis_categories WHERE code = 'I20-I25'), 'Cardiopatía isquémica crónica', ARRAY['Cardiopatía isquémica', 'Enfermedad coronaria'], 'severe', true, 'Cardiología'),
('I63.9', 'Infarto cerebral no especificado', (SELECT id FROM diagnosis_categories WHERE code = 'I60-I69'), 'Accidente cerebrovascular isquémico', ARRAY['ACV', 'Derrame cerebral', 'Ictus'], 'severe', false, 'Neurología'),

-- Respiratory diseases
('J06.9', 'Infección aguda de las vías respiratorias superiores no especificada', (SELECT id FROM diagnosis_categories WHERE code = 'J00-J06'), 'Infección respiratoria alta', ARRAY['Resfriado común', 'Infección respiratoria'], 'mild', false, 'Medicina General'),
('J18.9', 'Neumonía no especificada', (SELECT id FROM diagnosis_categories WHERE code = 'J10-J18'), 'Neumonía sin especificar agente', ARRAY['Pulmonía', 'Neumonía'], 'moderate', false, 'Neumología'),
('J44.1', 'Enfermedad pulmonar obstructiva crónica con exacerbación aguda', (SELECT id FROM diagnosis_categories WHERE code = 'J40-J47'), 'EPOC con exacerbación', ARRAY['EPOC', 'Bronquitis crónica'], 'severe', true, 'Neumología'),

-- Endocrine diseases
('E11.9', 'Diabetes mellitus tipo 2 sin complicaciones', (SELECT id FROM diagnosis_categories WHERE code = 'E10-E14'), 'Diabetes tipo 2 no complicada', ARRAY['DM2', 'Diabetes tipo 2'], 'moderate', true, 'Endocrinología'),
('E03.9', 'Hipotiroidismo no especificado', (SELECT id FROM diagnosis_categories WHERE code = 'E00-E07'), 'Hipotiroidismo sin especificar', ARRAY['Hipotiroidismo', 'Tiroides hipoactiva'], 'moderate', true, 'Endocrinología'),
('E66.9', 'Obesidad no especificada', (SELECT id FROM diagnosis_categories WHERE code = 'E65-E68'), 'Obesidad sin especificar tipo', ARRAY['Sobrepeso', 'Obesidad'], 'moderate', true, 'Endocrinología'),

-- Digestive diseases
('K21.9', 'Enfermedad por reflujo gastroesofágico sin esofagitis', (SELECT id FROM diagnosis_categories WHERE code = 'K20-K31'), 'Reflujo gastroesofágico', ARRAY['ERGE', 'Reflujo'], 'mild', true, 'Gastroenterología'),
('K35.9', 'Apendicitis aguda no especificada', (SELECT id FROM diagnosis_categories WHERE code = 'K35-K38'), 'Apendicitis aguda', ARRAY['Apendicitis'], 'severe', false, 'Cirugía'),
('K76.9', 'Enfermedad hepática no especificada', (SELECT id FROM diagnosis_categories WHERE code = 'K70-K77'), 'Trastorno hepático', ARRAY['Hepatopatía', 'Enfermedad del hígado'], 'moderate', true, 'Gastroenterología'),

-- Genitourinary diseases
('N18.6', 'Enfermedad renal crónica en estadio 6', (SELECT id FROM diagnosis_categories WHERE code = 'N00-N08'), 'Insuficiencia renal crónica terminal', ARRAY['IRC', 'Insuficiencia renal'], 'severe', true, 'Nefrología'),
('N39.0', 'Infección del tracto urinario no especificada', (SELECT id FROM diagnosis_categories WHERE code = 'N30-N39'), 'Infección urinaria', ARRAY['ITU', 'Infección urinaria'], 'moderate', false, 'Urología'),

-- Mental health
('F32.9', 'Episodio depresivo no especificado', (SELECT id FROM diagnosis_categories WHERE code = 'F01-F99'), 'Depresión sin especificar', ARRAY['Depresión', 'Trastorno depresivo'], 'moderate', true, 'Psiquiatría'),
('F41.9', 'Trastorno de ansiedad no especificado', (SELECT id FROM diagnosis_categories WHERE code = 'F01-F99'), 'Trastorno de ansiedad', ARRAY['Ansiedad', 'Trastorno ansioso'], 'moderate', true, 'Psiquiatría'),

-- Neurological diseases
('G43.9', 'Migraña no especificada', (SELECT id FROM diagnosis_categories WHERE code = 'G00-G99'), 'Migraña sin especificar', ARRAY['Jaqueca', 'Migraña'], 'moderate', true, 'Neurología'),
('G93.1', 'Lesión anóxica del cerebro no clasificada en otra parte', (SELECT id FROM diagnosis_categories WHERE code = 'G00-G99'), 'Lesión cerebral anóxica', ARRAY['Daño cerebral', 'Lesión cerebral'], 'severe', false, 'Neurología'),

-- Musculoskeletal diseases
('M79.3', 'Paniculitis no especificada', (SELECT id FROM diagnosis_categories WHERE code = 'M00-M99'), 'Inflamación del tejido subcutáneo', ARRAY['Paniculitis'], 'mild', false, 'Reumatología'),
('M25.5', 'Dolor en articulación', (SELECT id FROM diagnosis_categories WHERE code = 'M00-M99'), 'Artralgia', ARRAY['Dolor articular', 'Artralgia'], 'mild', false, 'Reumatología'),

-- Skin diseases
('L30.9', 'Dermatitis no especificada', (SELECT id FROM diagnosis_categories WHERE code = 'L00-L99'), 'Inflamación de la piel', ARRAY['Eczema', 'Dermatitis'], 'mild', false, 'Dermatología'),
('L70.9', 'Acné no especificado', (SELECT id FROM diagnosis_categories WHERE code = 'L00-L99'), 'Acné vulgar', ARRAY['Acné', 'Espinillas'], 'mild', false, 'Dermatología');

-- Insert diagnosis recommendations (linking diagnoses to recommended studies)
INSERT INTO diagnosis_recommendations (diagnosis_id, recommended_study_id, recommendation_type, priority, notes) VALUES
-- Diabetes recommendations
((SELECT id FROM diagnosis_catalog WHERE code = 'E11.9'), (SELECT id FROM study_catalog WHERE code = 'BIO004'), 'required', 1, 'Glucosa en ayunas para control'),
((SELECT id FROM diagnosis_catalog WHERE code = 'E11.9'), (SELECT id FROM study_catalog WHERE code = 'HEM024'), 'required', 1, 'HbA1c para control a largo plazo'),
((SELECT id FROM diagnosis_catalog WHERE code = 'E11.9'), (SELECT id FROM study_catalog WHERE code = 'URO007'), 'recommended', 2, 'Microalbuminuria para detección de nefropatía'),

-- Hypertension recommendations
((SELECT id FROM diagnosis_catalog WHERE code = 'I10'), (SELECT id FROM study_catalog WHERE code = 'BIO001'), 'required', 1, 'Perfil metabólico básico'),
((SELECT id FROM diagnosis_catalog WHERE code = 'I10'), (SELECT id FROM study_catalog WHERE code = 'URO001'), 'required', 1, 'Examen de orina para función renal'),
((SELECT id FROM diagnosis_catalog WHERE code = 'I10'), (SELECT id FROM study_catalog WHERE code = 'BIO019'), 'recommended', 2, 'Perfil lipídico para riesgo cardiovascular'),

-- Thyroid recommendations
((SELECT id FROM diagnosis_catalog WHERE code = 'E03.9'), (SELECT id FROM study_catalog WHERE code = 'END001'), 'required', 1, 'Perfil tiroideo básico'),
((SELECT id FROM diagnosis_catalog WHERE code = 'E03.9'), (SELECT id FROM study_catalog WHERE code = 'END008'), 'recommended', 2, 'Anticuerpos anti-tiroglobulina'),

-- Pneumonia recommendations
((SELECT id FROM diagnosis_catalog WHERE code = 'J18.9'), (SELECT id FROM study_catalog WHERE code = 'HEM001'), 'required', 1, 'Biometría hemática para infección'),
((SELECT id FROM diagnosis_catalog WHERE code = 'J18.9'), (SELECT id FROM study_catalog WHERE code = 'MIC013'), 'required', 1, 'Cultivo de esputo para agente causal'),
((SELECT id FROM diagnosis_catalog WHERE code = 'J18.9'), (SELECT id FROM study_catalog WHERE code = 'BIO001'), 'recommended', 2, 'Química sanguínea para estado general'),

-- UTI recommendations
((SELECT id FROM diagnosis_catalog WHERE code = 'N39.0'), (SELECT id FROM study_catalog WHERE code = 'URO001'), 'required', 1, 'Examen general de orina'),
((SELECT id FROM diagnosis_catalog WHERE code = 'N39.0'), (SELECT id FROM study_catalog WHERE code = 'MIC001'), 'recommended', 2, 'Cultivo de orina si hay sospecha de infección'),

-- Depression recommendations
((SELECT id FROM diagnosis_catalog WHERE code = 'F32.9'), (SELECT id FROM study_catalog WHERE code = 'BIO001'), 'recommended', 2, 'Perfil metabólico para descartar causas orgánicas'),
((SELECT id FROM diagnosis_catalog WHERE code = 'F32.9'), (SELECT id FROM study_catalog WHERE code = 'END001'), 'recommended', 3, 'Perfil tiroideo para descartar hipotiroidismo');

-- Insert differential diagnoses
INSERT INTO diagnosis_differentials (primary_diagnosis_id, differential_diagnosis_id, similarity_score, notes) VALUES
-- Diabetes differentials
((SELECT id FROM diagnosis_catalog WHERE code = 'E11.9'), (SELECT id FROM diagnosis_catalog WHERE code = 'E10.9'), 0.85, 'Diabetes tipo 1 vs tipo 2'),
((SELECT id FROM diagnosis_catalog WHERE code = 'E11.9'), (SELECT id FROM diagnosis_catalog WHERE code = 'E03.9'), 0.60, 'Diabetes vs hipotiroidismo'),

-- Hypertension differentials
((SELECT id FROM diagnosis_catalog WHERE code = 'I10'), (SELECT id FROM diagnosis_catalog WHERE code = 'I15.9'), 0.90, 'Hipertensión esencial vs secundaria'),
((SELECT id FROM diagnosis_catalog WHERE code = 'I10'), (SELECT id FROM diagnosis_catalog WHERE code = 'E11.9'), 0.70, 'Hipertensión vs diabetes'),

-- Pneumonia differentials
((SELECT id FROM diagnosis_catalog WHERE code = 'J18.9'), (SELECT id FROM diagnosis_catalog WHERE code = 'J44.1'), 0.80, 'Neumonía vs EPOC exacerbada'),
((SELECT id FROM diagnosis_catalog WHERE code = 'J18.9'), (SELECT id FROM diagnosis_catalog WHERE code = 'J06.9'), 0.70, 'Neumonía vs infección respiratoria alta'),

-- Depression differentials
((SELECT id FROM diagnosis_catalog WHERE code = 'F32.9'), (SELECT id FROM diagnosis_catalog WHERE code = 'F41.9'), 0.75, 'Depresión vs ansiedad'),
((SELECT id FROM diagnosis_catalog WHERE code = 'F32.9'), (SELECT id FROM diagnosis_catalog WHERE code = 'E03.9'), 0.65, 'Depresión vs hipotiroidismo');

-- Create a view for easy diagnosis search
CREATE VIEW diagnosis_search_view AS
SELECT 
    d.id,
    d.code,
    d.name,
    d.description,
    d.synonyms,
    d.severity_level,
    d.is_chronic,
    d.is_contagious,
    d.age_group,
    d.gender_specific,
    d.specialty,
    dc.name as category_name,
    dc.code as category_code,
    to_tsvector('spanish', d.name || ' ' || COALESCE(d.description, '') || ' ' || COALESCE(array_to_string(d.synonyms, ' '), '')) as search_vector
FROM diagnosis_catalog d
JOIN diagnosis_categories dc ON d.category_id = dc.id
WHERE d.is_active = true;

-- Create a function to search diagnoses
CREATE OR REPLACE FUNCTION search_diagnoses(search_term TEXT, specialty_filter TEXT DEFAULT NULL)
RETURNS TABLE (
    id INTEGER,
    code VARCHAR(10),
    name VARCHAR(500),
    description TEXT,
    category_name VARCHAR(200),
    specialty VARCHAR(100),
    rank REAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        d.id,
        d.code,
        d.name,
        d.description,
        dc.name as category_name,
        d.specialty,
        ts_rank(d.search_vector, plainto_tsquery('spanish', search_term)) as rank
    FROM diagnosis_search_view d
    WHERE d.search_vector @@ plainto_tsquery('spanish', search_term)
    AND (specialty_filter IS NULL OR d.specialty = specialty_filter)
    ORDER BY rank DESC, d.name ASC
    LIMIT 50;
END;
$$ LANGUAGE plpgsql;
