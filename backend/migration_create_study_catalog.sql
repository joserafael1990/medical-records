-- Migration: Create normalized study catalog system
-- This migration creates the structure for a normalized clinical studies catalog
-- following Mexican medical standards (NOM-220-SSA1-2016)

-- Create study categories table
CREATE TABLE IF NOT EXISTS study_categories (
    id SERIAL PRIMARY KEY,
    code VARCHAR(10) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create study catalog table
CREATE TABLE IF NOT EXISTS study_catalog (
    id SERIAL PRIMARY KEY,
    code VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    category_id INTEGER REFERENCES study_categories(id),
    subcategory VARCHAR(100),
    description TEXT,
    preparation TEXT, -- Instructions for patient preparation
    methodology TEXT,
    duration_hours INTEGER, -- Delivery time in hours
    specialty VARCHAR(100), -- Medical specialty
    is_active BOOLEAN DEFAULT true,
    regulatory_compliance JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create study normal values table
CREATE TABLE IF NOT EXISTS study_normal_values (
    id SERIAL PRIMARY KEY,
    study_id INTEGER REFERENCES study_catalog(id) ON DELETE CASCADE,
    age_min INTEGER,
    age_max INTEGER,
    gender CHAR(1) CHECK (gender IN ('M', 'F', 'B')), -- M=Male, F=Female, B=Both
    min_value DECIMAL(10,3),
    max_value DECIMAL(10,3),
    unit VARCHAR(20),
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create study templates table
CREATE TABLE IF NOT EXISTS study_templates (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    specialty VARCHAR(100),
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create study template items table (many-to-many relationship)
CREATE TABLE IF NOT EXISTS study_template_items (
    id SERIAL PRIMARY KEY,
    template_id INTEGER REFERENCES study_templates(id) ON DELETE CASCADE,
    study_id INTEGER REFERENCES study_catalog(id) ON DELETE CASCADE,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_study_catalog_category ON study_catalog(category_id);
CREATE INDEX IF NOT EXISTS idx_study_catalog_specialty ON study_catalog(specialty);
CREATE INDEX IF NOT EXISTS idx_study_catalog_active ON study_catalog(is_active);
CREATE INDEX IF NOT EXISTS idx_study_normal_values_study ON study_normal_values(study_id);
CREATE INDEX IF NOT EXISTS idx_study_template_items_template ON study_template_items(template_id);
CREATE INDEX IF NOT EXISTS idx_study_template_items_study ON study_template_items(study_id);

-- Insert default study categories
INSERT INTO study_categories (code, name, description) VALUES
('LAB', 'Laboratorio Clínico', 'Estudios de laboratorio clínico'),
('IMG', 'Estudios de Imagen', 'Radiología, ultrasonido, tomografía, etc.'),
('FUN', 'Estudios Funcionales', 'Electrocardiografía, espirometría, endoscopía, etc.'),
('BIO', 'Biopsias', 'Estudios histopatológicos y citológicos'),
('GEN', 'Genética', 'Estudios genéticos y moleculares')
ON CONFLICT (code) DO NOTHING;

-- Insert sample laboratory studies
INSERT INTO study_catalog (code, name, category_id, subcategory, description, preparation, methodology, duration_hours, specialty) VALUES
('LAB001', 'Biometría Hemática Completa', 1, 'Hematología', 'Conteo completo de células sanguíneas', 'Ayuno de 8 horas', 'Citometría de flujo', 4, 'Medicina General'),
('LAB002', 'Química Sanguínea de 6 Elementos', 1, 'Química Sanguínea', 'Glucosa, urea, creatinina, ácido úrico, colesterol total, triglicéridos', 'Ayuno de 12 horas', 'Espectrofotometría', 4, 'Medicina General'),
('LAB003', 'Examen General de Orina', 1, 'Uroanálisis', 'Análisis físico, químico y microscópico de orina', 'Primera orina de la mañana', 'Microscopía y tiras reactivas', 2, 'Medicina General'),
('LAB004', 'Glucosa en Ayunas', 1, 'Química Sanguínea', 'Determinación de glucosa en sangre en ayunas', 'Ayuno de 8 horas', 'Glucosa oxidasa', 2, 'Endocrinología'),
('LAB005', 'Hemoglobina Glucosilada (HbA1c)', 1, 'Química Sanguínea', 'Control de diabetes a largo plazo', 'No requiere ayuno', 'Cromatografía líquida', 24, 'Endocrinología'),
('LAB006', 'Perfil Lipídico', 1, 'Química Sanguínea', 'Colesterol total, HDL, LDL, triglicéridos', 'Ayuno de 12 horas', 'Espectrofotometría', 4, 'Cardiología'),
('LAB007', 'Troponina I', 1, 'Marcadores Cardíacos', 'Marcador de daño miocárdico', 'No requiere ayuno', 'Inmunoensayo', 2, 'Cardiología'),
('LAB008', 'CK-MB', 1, 'Marcadores Cardíacos', 'Creatina quinasa MB', 'No requiere ayuno', 'Inmunoensayo', 2, 'Cardiología'),
('LAB009', 'Beta HCG Cuantitativa', 1, 'Hormonas', 'Hormona del embarazo', 'No requiere ayuno', 'Inmunoensayo', 4, 'Ginecología'),
('LAB010', 'TSH', 1, 'Hormonas', 'Hormona estimulante del tiroides', 'No requiere ayuno', 'Inmunoensayo', 4, 'Endocrinología')
ON CONFLICT (code) DO NOTHING;

-- Insert sample imaging studies
INSERT INTO study_catalog (code, name, category_id, subcategory, description, preparation, methodology, duration_hours, specialty) VALUES
('IMG001', 'Radiografía de Tórax PA y Lateral', 2, 'Radiología', 'Radiografía de tórax en proyecciones posteroanterior y lateral', 'Retirar objetos metálicos', 'Radiografía digital', 2, 'Medicina General'),
('IMG002', 'Electrocardiograma', 3, 'Electrocardiografía', 'Registro de la actividad eléctrica del corazón', 'No requiere preparación', 'Electrocardiografía de 12 derivaciones', 1, 'Cardiología'),
('IMG003', 'Ultrasonido Obstétrico', 2, 'Ultrasonido', 'Evaluación del embarazo y desarrollo fetal', 'Vejiga llena', 'Ultrasonido Doppler', 2, 'Ginecología'),
('IMG004', 'Mamografía Bilateral', 2, 'Radiología', 'Estudio de mama para detección de cáncer', 'No usar desodorante', 'Mamografía digital', 4, 'Ginecología'),
('IMG005', 'Tomografía de Tórax', 2, 'Tomografía', 'Estudio tomográfico del tórax', 'Ayuno de 4 horas si es con contraste', 'Tomografía helicoidal', 24, 'Neumología')
ON CONFLICT (code) DO NOTHING;

-- Insert sample normal values
INSERT INTO study_normal_values (study_id, age_min, age_max, gender, min_value, max_value, unit, notes) VALUES
-- Biometría Hemática Completa
(1, 18, 99, 'B', 4.5, 5.5, 'millones/μL', 'Eritrocitos'),
(1, 18, 99, 'B', 12, 16, 'g/dL', 'Hemoglobina'),
(1, 18, 99, 'B', 36, 46, '%', 'Hematocrito'),
(1, 18, 99, 'B', 4000, 10000, 'μL', 'Leucocitos'),
(1, 18, 99, 'B', 150000, 450000, 'μL', 'Plaquetas'),

-- Glucosa en Ayunas
(4, 18, 99, 'B', 70, 100, 'mg/dL', 'Valores normales'),
(4, 18, 99, 'B', 100, 125, 'mg/dL', 'Prediabetes'),
(4, 18, 99, 'B', 126, 999, 'mg/dL', 'Diabetes'),

-- Hemoglobina Glucosilada
(5, 18, 99, 'B', 4, 5.6, '%', 'Normal'),
(5, 18, 99, 'B', 5.7, 6.4, '%', 'Prediabetes'),
(5, 18, 99, 'B', 6.5, 15, '%', 'Diabetes'),

-- Perfil Lipídico
(6, 18, 99, 'B', 0, 200, 'mg/dL', 'Colesterol Total'),
(6, 18, 99, 'B', 40, 999, 'mg/dL', 'HDL Colesterol'),
(6, 18, 99, 'B', 0, 100, 'mg/dL', 'LDL Colesterol'),
(6, 18, 99, 'B', 0, 150, 'mg/dL', 'Triglicéridos'),

-- TSH
(10, 18, 99, 'B', 0.4, 4.0, 'mUI/L', 'Valores normales')
ON CONFLICT DO NOTHING;

-- Insert sample study templates
INSERT INTO study_templates (name, description, specialty, is_default) VALUES
('Chequeo General', 'Estudios básicos para evaluación general de salud', 'Medicina General', true),
('Monitoreo de Diabetes', 'Estudios para seguimiento de diabetes mellitus', 'Endocrinología', false),
('Evaluación Cardíaca', 'Estudios para evaluación cardiovascular', 'Cardiología', false),
('Control Prenatal', 'Estudios para seguimiento del embarazo', 'Ginecología', false),
('Evaluación Tiroidea', 'Estudios para evaluación de función tiroidea', 'Endocrinología', false)
ON CONFLICT DO NOTHING;

-- Insert study template items
INSERT INTO study_template_items (template_id, study_id, order_index) VALUES
-- Chequeo General
(1, 1, 1), -- Biometría Hemática
(1, 2, 2), -- Química Sanguínea 6 elementos
(1, 3, 3), -- Examen General de Orina
(1, 11, 4), -- Radiografía de Tórax

-- Monitoreo de Diabetes
(2, 4, 1), -- Glucosa en Ayunas
(2, 5, 2), -- Hemoglobina Glucosilada
(2, 6, 3), -- Perfil Lipídico

-- Evaluación Cardíaca
(3, 1, 1), -- Biometría Hemática
(3, 6, 2), -- Perfil Lipídico
(3, 7, 3), -- Troponina I
(3, 12, 4), -- Electrocardiograma

-- Control Prenatal
(4, 9, 1), -- Beta HCG
(4, 1, 2), -- Biometría Hemática
(4, 13, 3), -- Ultrasonido Obstétrico

-- Evaluación Tiroidea
(5, 10, 1), -- TSH
(5, 1, 2) -- Biometría Hemática
ON CONFLICT DO NOTHING;

-- Update clinical_studies table to reference study catalog
ALTER TABLE clinical_studies ADD COLUMN IF NOT EXISTS study_catalog_id INTEGER REFERENCES study_catalog(id);
ALTER TABLE clinical_studies ADD COLUMN IF NOT EXISTS results JSONB;
ALTER TABLE clinical_studies ADD COLUMN IF NOT EXISTS normal_values JSONB;
ALTER TABLE clinical_studies ADD COLUMN IF NOT EXISTS interpretation TEXT;

-- Create index for the new column
CREATE INDEX IF NOT EXISTS idx_clinical_studies_catalog ON clinical_studies(study_catalog_id);
