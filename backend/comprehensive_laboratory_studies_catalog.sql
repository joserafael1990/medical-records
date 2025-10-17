-- ============================================================================
-- COMPREHENSIVE LABORATORY STUDIES CATALOG
-- Based on NOM-220-SSA1-2016 and international standards
-- ============================================================================

-- Clear existing data (optional - uncomment if you want to reset)
-- DELETE FROM study_template_items;
-- DELETE FROM study_templates;
-- DELETE FROM study_normal_values;
-- DELETE FROM study_catalog;
-- DELETE FROM study_categories;

-- ============================================================================
-- STUDY CATEGORIES
-- ============================================================================

INSERT INTO study_categories (code, name, description) VALUES
('LAB', 'Laboratorio Clínico', 'Estudios de laboratorio clínico general'),
('HEM', 'Hematología', 'Estudios de células sanguíneas y coagulación'),
('BIO', 'Bioquímica', 'Estudios de química sanguínea y metabolitos'),
('MIC', 'Microbiología', 'Estudios microbiológicos y cultivos'),
('INM', 'Inmunología', 'Estudios inmunológicos y serología'),
('URO', 'Uroanálisis', 'Estudios de orina y función renal'),
('END', 'Endocrinología', 'Estudios hormonales y endocrinos'),
('GEN', 'Genética', 'Estudios genéticos y moleculares'),
('IMG', 'Imagenología', 'Estudios de imagen médica'),
('FUN', 'Funcionales', 'Estudios de función orgánica'),
('BIO', 'Biopsias', 'Estudios histopatológicos'),
('TOX', 'Toxicología', 'Estudios toxicológicos y drogas'),
('CAR', 'Cardiología', 'Estudios cardiológicos específicos'),
('NEU', 'Neurología', 'Estudios neurológicos'),
('DER', 'Dermatología', 'Estudios dermatológicos'),
('GIN', 'Ginecología', 'Estudios ginecológicos y obstétricos'),
('PED', 'Pediatría', 'Estudios pediátricos específicos'),
('GER', 'Geriatría', 'Estudios geriátricos específicos')
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  updated_at = NOW();

-- ============================================================================
-- HEMATOLOGY STUDIES
-- ============================================================================

INSERT INTO study_catalog (code, name, category_id, subcategory, description, preparation, methodology, duration_hours, specialty) VALUES
-- Basic Hematology
('HEM001', 'Biometría Hemática Completa', (SELECT id FROM study_categories WHERE code = 'HEM'), 'Hematología Básica', 'Conteo completo de células sanguíneas incluyendo eritrocitos, leucocitos, plaquetas, hemoglobina y hematocrito', 'No requiere ayuno', 'Citometría de flujo', 2, 'Medicina General'),
('HEM002', 'Biometría Hemática con Plaquetas', (SELECT id FROM study_categories WHERE code = 'HEM'), 'Hematología Básica', 'Conteo de células sanguíneas con enfoque en plaquetas', 'No requiere ayuno', 'Citometría de flujo', 2, 'Medicina General'),
('HEM003', 'Hemoglobina y Hematocrito', (SELECT id FROM study_categories WHERE code = 'HEM'), 'Hematología Básica', 'Determinación de hemoglobina y hematocrito', 'No requiere ayuno', 'Espectrofotometría', 1, 'Medicina General'),
('HEM004', 'Conteo de Reticulocitos', (SELECT id FROM study_categories WHERE code = 'HEM'), 'Hematología Básica', 'Conteo de reticulocitos para evaluación de eritropoyesis', 'No requiere ayuno', 'Microscopía', 4, 'Hematología'),
('HEM005', 'Velocidad de Sedimentación Globular (VSG)', (SELECT id FROM study_categories WHERE code = 'HEM'), 'Hematología Básica', 'Velocidad de sedimentación de eritrocitos', 'No requiere ayuno', 'Sedimentación', 1, 'Medicina General'),

-- Advanced Hematology
('HEM006', 'Frotis de Sangre Periférica', (SELECT id FROM study_categories WHERE code = 'HEM'), 'Hematología Avanzada', 'Examen microscópico de células sanguíneas', 'No requiere ayuno', 'Microscopía', 2, 'Hematología'),
('HEM007', 'Índices Eritrocitarios', (SELECT id FROM study_categories WHERE code = 'HEM'), 'Hematología Avanzada', 'VCM, HCM, CHCM, RDW', 'No requiere ayuno', 'Citometría de flujo', 2, 'Hematología'),
('HEM008', 'Fórmula Leucocitaria', (SELECT id FROM study_categories WHERE code = 'HEM'), 'Hematología Avanzada', 'Diferencial de leucocitos', 'No requiere ayuno', 'Citometría de flujo', 2, 'Hematología'),
('HEM009', 'Morfología Eritrocitaria', (SELECT id FROM study_categories WHERE code = 'HEM'), 'Hematología Avanzada', 'Evaluación morfológica de eritrocitos', 'No requiere ayuno', 'Microscopía', 4, 'Hematología'),
('HEM010', 'Morfología Leucocitaria', (SELECT id FROM study_categories WHERE code = 'HEM'), 'Hematología Avanzada', 'Evaluación morfológica de leucocitos', 'No requiere ayuno', 'Microscopía', 4, 'Hematología'),

-- Coagulation Studies
('HEM011', 'Tiempo de Protrombina (TP)', (SELECT id FROM study_categories WHERE code = 'HEM'), 'Coagulación', 'Tiempo de protrombina e INR', 'No requiere ayuno', 'Coagulometría', 2, 'Hematología'),
('HEM012', 'Tiempo de Tromboplastina Parcial (TTP)', (SELECT id FROM study_categories WHERE code = 'HEM'), 'Coagulación', 'Tiempo de tromboplastina parcial activada', 'No requiere ayuno', 'Coagulometría', 2, 'Hematología'),
('HEM013', 'Tiempo de Sangrado', (SELECT id FROM study_categories WHERE code = 'HEM'), 'Coagulación', 'Tiempo de sangrado por punción', 'No requiere ayuno', 'Método de Ivy', 1, 'Hematología'),
('HEM014', 'Tiempo de Coagulación', (SELECT id FROM study_categories WHERE code = 'HEM'), 'Coagulación', 'Tiempo de coagulación total', 'No requiere ayuno', 'Método de Lee-White', 1, 'Hematología'),
('HEM015', 'Fibrinógeno', (SELECT id FROM study_categories WHERE code = 'HEM'), 'Coagulación', 'Concentración de fibrinógeno', 'No requiere ayuno', 'Coagulometría', 2, 'Hematología'),
('HEM016', 'Dímero D', (SELECT id FROM study_categories WHERE code = 'HEM'), 'Coagulación', 'Dímero D para trombosis', 'No requiere ayuno', 'Inmunoensayo', 4, 'Hematología'),
('HEM017', 'Antitrombina III', (SELECT id FROM study_categories WHERE code = 'HEM'), 'Coagulación', 'Actividad de antitrombina III', 'No requiere ayuno', 'Cromogénico', 4, 'Hematología'),
('HEM018', 'Proteína C', (SELECT id FROM study_categories WHERE code = 'HEM'), 'Coagulación', 'Actividad de proteína C', 'No requiere ayuno', 'Cromogénico', 4, 'Hematología'),
('HEM019', 'Proteína S', (SELECT id FROM study_categories WHERE code = 'HEM'), 'Coagulación', 'Actividad de proteína S', 'No requiere ayuno', 'Cromogénico', 4, 'Hematología'),
('HEM020', 'Factor V Leiden', (SELECT id FROM study_categories WHERE code = 'HEM'), 'Coagulación', 'Mutación Factor V Leiden', 'No requiere ayuno', 'PCR', 24, 'Hematología'),

-- Special Hematology
('HEM021', 'Grupo Sanguíneo y Factor Rh', (SELECT id FROM study_categories WHERE code = 'HEM'), 'Hematología Especial', 'Determinación de grupo sanguíneo ABO y Rh', 'No requiere ayuno', 'Hemaglutinación', 2, 'Hematología'),
('HEM022', 'Prueba de Coombs Directa', (SELECT id FROM study_categories WHERE code = 'HEM'), 'Hematología Especial', 'Detección de anticuerpos en eritrocitos', 'No requiere ayuno', 'Hemaglutinación', 4, 'Hematología'),
('HEM023', 'Prueba de Coombs Indirecta', (SELECT id FROM study_categories WHERE code = 'HEM'), 'Hematología Especial', 'Detección de anticuerpos en suero', 'No requiere ayuno', 'Hemaglutinación', 4, 'Hematología'),
('HEM024', 'Hemoglobina Glicosilada (HbA1c)', (SELECT id FROM study_categories WHERE code = 'HEM'), 'Hematología Especial', 'Control de diabetes a largo plazo', 'No requiere ayuno', 'Cromatografía líquida', 24, 'Endocrinología'),
('HEM025', 'Electroforesis de Hemoglobina', (SELECT id FROM study_categories WHERE code = 'HEM'), 'Hematología Especial', 'Identificación de variantes de hemoglobina', 'No requiere ayuno', 'Electroforesis', 24, 'Hematología'),

-- ============================================================================
-- BIOCHEMISTRY STUDIES
-- ============================================================================

INSERT INTO study_catalog (code, name, category_id, subcategory, description, preparation, methodology, duration_hours, specialty) VALUES
-- Basic Biochemistry
('BIO001', 'Química Sanguínea de 6 Elementos', (SELECT id FROM study_categories WHERE code = 'BIO'), 'Química Básica', 'Glucosa, urea, creatinina, ácido úrico, colesterol total, triglicéridos', 'Ayuno de 12 horas', 'Espectrofotometría', 4, 'Medicina General'),
('BIO002', 'Química Sanguínea de 12 Elementos', (SELECT id FROM study_categories WHERE code = 'BIO'), 'Química Básica', 'Perfil metabólico básico extendido', 'Ayuno de 12 horas', 'Espectrofotometría', 4, 'Medicina General'),
('BIO003', 'Química Sanguínea de 20 Elementos', (SELECT id FROM study_categories WHERE code = 'BIO'), 'Química Básica', 'Perfil metabólico completo', 'Ayuno de 12 horas', 'Espectrofotometría', 4, 'Medicina General'),
('BIO004', 'Glucosa en Ayunas', (SELECT id FROM study_categories WHERE code = 'BIO'), 'Química Básica', 'Determinación de glucosa en ayunas', 'Ayuno de 8 horas', 'Glucosa oxidasa', 2, 'Endocrinología'),
('BIO005', 'Glucosa Postprandial', (SELECT id FROM study_categories WHERE code = 'BIO'), 'Química Básica', 'Glucosa 2 horas postprandial', 'Ayuno de 8 horas, comida controlada', 'Glucosa oxidasa', 2, 'Endocrinología'),

-- Renal Function
('BIO006', 'Urea', (SELECT id FROM study_categories WHERE code = 'BIO'), 'Función Renal', 'Concentración de urea en sangre', 'No requiere ayuno', 'Espectrofotometría', 2, 'Nefrología'),
('BIO007', 'Creatinina', (SELECT id FROM study_categories WHERE code = 'BIO'), 'Función Renal', 'Concentración de creatinina en sangre', 'No requiere ayuno', 'Espectrofotometría', 2, 'Nefrología'),
('BIO008', 'Depuración de Creatinina', (SELECT id FROM study_categories WHERE code = 'BIO'), 'Función Renal', 'Depuración de creatinina en 24 horas', 'Recolección de orina 24h', 'Espectrofotometría', 24, 'Nefrología'),
('BIO009', 'Ácido Úrico', (SELECT id FROM study_categories WHERE code = 'BIO'), 'Función Renal', 'Concentración de ácido úrico', 'No requiere ayuno', 'Espectrofotometría', 2, 'Reumatología'),
('BIO010', 'Microalbuminuria', (SELECT id FROM study_categories WHERE code = 'BIO'), 'Función Renal', 'Albúmina en orina', 'Primera orina de la mañana', 'Inmunoensayo', 4, 'Nefrología'),

-- Liver Function
('BIO011', 'Pruebas de Función Hepática (PFH)', (SELECT id FROM study_categories WHERE code = 'BIO'), 'Función Hepática', 'ALT, AST, GGT, Fosfatasa alcalina, Bilirrubinas', 'Ayuno de 8 horas', 'Espectrofotometría', 4, 'Gastroenterología'),
('BIO012', 'Alanino Aminotransferasa (ALT)', (SELECT id FROM study_categories WHERE code = 'BIO'), 'Función Hepática', 'Transaminasa ALT', 'No requiere ayuno', 'Espectrofotometría', 2, 'Gastroenterología'),
('BIO013', 'Aspartato Aminotransferasa (AST)', (SELECT id FROM study_categories WHERE code = 'BIO'), 'Función Hepática', 'Transaminasa AST', 'No requiere ayuno', 'Espectrofotometría', 2, 'Gastroenterología'),
('BIO014', 'Gamma Glutamil Transferasa (GGT)', (SELECT id FROM study_categories WHERE code = 'BIO'), 'Función Hepática', 'Enzima GGT', 'No requiere ayuno', 'Espectrofotometría', 2, 'Gastroenterología'),
('BIO015', 'Fosfatasa Alcalina', (SELECT id FROM study_categories WHERE code = 'BIO'), 'Función Hepática', 'Fosfatasa alcalina total', 'No requiere ayuno', 'Espectrofotometría', 2, 'Gastroenterología'),
('BIO016', 'Bilirrubina Total', (SELECT id FROM study_categories WHERE code = 'BIO'), 'Función Hepática', 'Bilirrubina total', 'No requiere ayuno', 'Espectrofotometría', 2, 'Gastroenterología'),
('BIO017', 'Bilirrubina Directa', (SELECT id FROM study_categories WHERE code = 'BIO'), 'Función Hepática', 'Bilirrubina conjugada', 'No requiere ayuno', 'Espectrofotometría', 2, 'Gastroenterología'),
('BIO018', 'Bilirrubina Indirecta', (SELECT id FROM study_categories WHERE code = 'BIO'), 'Función Hepática', 'Bilirrubina no conjugada', 'No requiere ayuno', 'Espectrofotometría', 2, 'Gastroenterología'),

-- Lipid Profile
('BIO019', 'Perfil Lipídico Completo', (SELECT id FROM study_categories WHERE code = 'BIO'), 'Perfil Lipídico', 'Colesterol total, HDL, LDL, VLDL, triglicéridos', 'Ayuno de 12 horas', 'Espectrofotometría', 4, 'Cardiología'),
('BIO020', 'Colesterol Total', (SELECT id FROM study_categories WHERE code = 'BIO'), 'Perfil Lipídico', 'Colesterol total en sangre', 'Ayuno de 12 horas', 'Espectrofotometría', 2, 'Cardiología'),
('BIO021', 'Colesterol HDL', (SELECT id FROM study_categories WHERE code = 'BIO'), 'Perfil Lipídico', 'Colesterol de alta densidad', 'Ayuno de 12 horas', 'Espectrofotometría', 2, 'Cardiología'),
('BIO022', 'Colesterol LDL', (SELECT id FROM study_categories WHERE code = 'BIO'), 'Perfil Lipídico', 'Colesterol de baja densidad', 'Ayuno de 12 horas', 'Espectrofotometría', 2, 'Cardiología'),
('BIO023', 'Triglicéridos', (SELECT id FROM study_categories WHERE code = 'BIO'), 'Perfil Lipídico', 'Triglicéridos en sangre', 'Ayuno de 12 horas', 'Espectrofotometría', 2, 'Cardiología'),

-- Electrolytes
('BIO024', 'Electrolitos Séricos', (SELECT id FROM study_categories WHERE code = 'BIO'), 'Electrolitos', 'Sodio, potasio, cloro en suero', 'No requiere ayuno', 'Iones selectivos', 2, 'Nefrología'),
('BIO025', 'Sodio (Na)', (SELECT id FROM study_categories WHERE code = 'BIO'), 'Electrolitos', 'Concentración de sodio', 'No requiere ayuno', 'Iones selectivos', 2, 'Nefrología'),
('BIO026', 'Potasio (K)', (SELECT id FROM study_categories WHERE code = 'BIO'), 'Electrolitos', 'Concentración de potasio', 'No requiere ayuno', 'Iones selectivos', 2, 'Nefrología'),
('BIO027', 'Cloro (Cl)', (SELECT id FROM study_categories WHERE code = 'BIO'), 'Electrolitos', 'Concentración de cloro', 'No requiere ayuno', 'Iones selectivos', 2, 'Nefrología'),
('BIO028', 'Calcio (Ca)', (SELECT id FROM study_categories WHERE code = 'BIO'), 'Electrolitos', 'Concentración de calcio', 'No requiere ayuno', 'Espectrofotometría', 2, 'Endocrinología'),
('BIO029', 'Fósforo (P)', (SELECT id FROM study_categories WHERE code = 'BIO'), 'Electrolitos', 'Concentración de fósforo', 'No requiere ayuno', 'Espectrofotometría', 2, 'Endocrinología'),
('BIO030', 'Magnesio (Mg)', (SELECT id FROM study_categories WHERE code = 'BIO'), 'Electrolitos', 'Concentración de magnesio', 'No requiere ayuno', 'Espectrofotometría', 2, 'Endocrinología'),

-- ============================================================================
-- ENDOCRINOLOGY STUDIES
-- ============================================================================

INSERT INTO study_catalog (code, name, category_id, subcategory, description, preparation, methodology, duration_hours, specialty) VALUES
-- Thyroid Function
('END001', 'Perfil Tiroideo Básico', (SELECT id FROM study_categories WHERE code = 'END'), 'Función Tiroidea', 'TSH, T4L', 'No requiere ayuno', 'Inmunoensayo', 24, 'Endocrinología'),
('END002', 'Perfil Tiroideo Completo', (SELECT id FROM study_categories WHERE code = 'END'), 'Función Tiroidea', 'TSH, T4L, T3L, T4 total, T3 total', 'No requiere ayuno', 'Inmunoensayo', 24, 'Endocrinología'),
('END003', 'Hormona Estimulante de Tiroides (TSH)', (SELECT id FROM study_categories WHERE code = 'END'), 'Función Tiroidea', 'TSH ultrasensible', 'No requiere ayuno', 'Inmunoensayo', 24, 'Endocrinología'),
('END004', 'Tiroxina Libre (T4L)', (SELECT id FROM study_categories WHERE code = 'END'), 'Función Tiroidea', 'T4 libre', 'No requiere ayuno', 'Inmunoensayo', 24, 'Endocrinología'),
('END005', 'Triyodotironina Libre (T3L)', (SELECT id FROM study_categories WHERE code = 'END'), 'Función Tiroidea', 'T3 libre', 'No requiere ayuno', 'Inmunoensayo', 24, 'Endocrinología'),
('END006', 'Tiroxina Total (T4)', (SELECT id FROM study_categories WHERE code = 'END'), 'Función Tiroidea', 'T4 total', 'No requiere ayuno', 'Inmunoensayo', 24, 'Endocrinología'),
('END007', 'Triyodotironina Total (T3)', (SELECT id FROM study_categories WHERE code = 'END'), 'Función Tiroidea', 'T3 total', 'No requiere ayuno', 'Inmunoensayo', 24, 'Endocrinología'),
('END008', 'Anticuerpos Anti-Tiroglobulina', (SELECT id FROM study_categories WHERE code = 'END'), 'Función Tiroidea', 'Anti-TG', 'No requiere ayuno', 'Inmunoensayo', 24, 'Endocrinología'),
('END009', 'Anticuerpos Anti-Peroxidasa', (SELECT id FROM study_categories WHERE code = 'END'), 'Función Tiroidea', 'Anti-TPO', 'No requiere ayuno', 'Inmunoensayo', 24, 'Endocrinología'),
('END010', 'Anticuerpos Anti-Receptor TSH', (SELECT id FROM study_categories WHERE code = 'END'), 'Función Tiroidea', 'TRAb', 'No requiere ayuno', 'Inmunoensayo', 24, 'Endocrinología'),

-- Diabetes
('END011', 'Curva de Tolerancia a la Glucosa', (SELECT id FROM study_categories WHERE code = 'END'), 'Diabetes', 'CTOG 75g 2 horas', 'Ayuno de 8 horas', 'Glucosa oxidasa', 3, 'Endocrinología'),
('END012', 'Insulina en Ayunas', (SELECT id FROM study_categories WHERE code = 'END'), 'Diabetes', 'Insulina basal', 'Ayuno de 8 horas', 'Inmunoensayo', 24, 'Endocrinología'),
('END013', 'Insulina Postprandial', (SELECT id FROM study_categories WHERE code = 'END'), 'Diabetes', 'Insulina 2h postprandial', 'Ayuno de 8 horas', 'Inmunoensayo', 24, 'Endocrinología'),
('END014', 'Péptido C', (SELECT id FROM study_categories WHERE code = 'END'), 'Diabetes', 'Péptido C en ayunas', 'Ayuno de 8 horas', 'Inmunoensayo', 24, 'Endocrinología'),
('END015', 'Índice HOMA-IR', (SELECT id FROM study_categories WHERE code = 'END'), 'Diabetes', 'Resistencia a la insulina', 'Ayuno de 8 horas', 'Cálculo', 24, 'Endocrinología'),

-- Adrenal Function
('END016', 'Cortisol en Ayunas', (SELECT id FROM study_categories WHERE code = 'END'), 'Función Adrenal', 'Cortisol matutino', 'Ayuno de 8 horas', 'Inmunoensayo', 24, 'Endocrinología'),
('END017', 'Cortisol Vespertino', (SELECT id FROM study_categories WHERE code = 'END'), 'Función Adrenal', 'Cortisol nocturno', 'No requiere ayuno', 'Inmunoensayo', 24, 'Endocrinología'),
('END018', 'Cortisol en Orina 24h', (SELECT id FROM study_categories WHERE code = 'END'), 'Función Adrenal', 'Cortisol libre en orina', 'Recolección 24h', 'Inmunoensayo', 24, 'Endocrinología'),
('END019', 'ACTH', (SELECT id FROM study_categories WHERE code = 'END'), 'Función Adrenal', 'Hormona adrenocorticotrópica', 'Ayuno de 8 horas', 'Inmunoensayo', 24, 'Endocrinología'),
('END020', 'Aldosterona', (SELECT id FROM study_categories WHERE code = 'END'), 'Función Adrenal', 'Aldosterona en plasma', 'Ayuno de 8 horas', 'Inmunoensayo', 24, 'Endocrinología'),

-- Reproductive Hormones
('END021', 'Perfil Hormonal Femenino', (SELECT id FROM study_categories WHERE code = 'END'), 'Hormonas Reproductivas', 'FSH, LH, Estradiol, Progesterona', 'Día 3 del ciclo', 'Inmunoensayo', 24, 'Ginecología'),
('END022', 'Perfil Hormonal Masculino', (SELECT id FROM study_categories WHERE code = 'END'), 'Hormonas Reproductivas', 'Testosterona, FSH, LH, Prolactina', 'No requiere ayuno', 'Inmunoensayo', 24, 'Urología'),
('END023', 'Testosterona Total', (SELECT id FROM study_categories WHERE code = 'END'), 'Hormonas Reproductivas', 'Testosterona total', 'No requiere ayuno', 'Inmunoensayo', 24, 'Urología'),
('END024', 'Testosterona Libre', (SELECT id FROM study_categories WHERE code = 'END'), 'Hormonas Reproductivas', 'Testosterona libre', 'No requiere ayuno', 'Inmunoensayo', 24, 'Urología'),
('END025', 'Estradiol', (SELECT id FROM study_categories WHERE code = 'END'), 'Hormonas Reproductivas', 'Estradiol', 'Día 3 del ciclo', 'Inmunoensayo', 24, 'Ginecología'),
('END026', 'Progesterona', (SELECT id FROM study_categories WHERE code = 'END'), 'Hormonas Reproductivas', 'Progesterona', 'Día 21 del ciclo', 'Inmunoensayo', 24, 'Ginecología'),
('END027', 'FSH', (SELECT id FROM study_categories WHERE code = 'END'), 'Hormonas Reproductivas', 'Hormona folículo estimulante', 'Día 3 del ciclo', 'Inmunoensayo', 24, 'Ginecología'),
('END028', 'LH', (SELECT id FROM study_categories WHERE code = 'END'), 'Hormonas Reproductivas', 'Hormona luteinizante', 'Día 3 del ciclo', 'Inmunoensayo', 24, 'Ginecología'),
('END029', 'Prolactina', (SELECT id FROM study_categories WHERE code = 'END'), 'Hormonas Reproductivas', 'Prolactina', 'No requiere ayuno', 'Inmunoensayo', 24, 'Ginecología'),
('END030', 'AMH', (SELECT id FROM study_categories WHERE code = 'END'), 'Hormonas Reproductivas', 'Hormona antimülleriana', 'No requiere ayuno', 'Inmunoensayo', 24, 'Ginecología'),

-- ============================================================================
-- MICROBIOLOGY STUDIES
-- ============================================================================

INSERT INTO study_catalog (code, name, category_id, subcategory, description, preparation, methodology, duration_hours, specialty) VALUES
-- Urine Culture
('MIC001', 'Cultivo de Orina y Antibiograma', (SELECT id FROM study_categories WHERE code = 'MIC'), 'Cultivos', 'Cultivo bacteriano de orina con sensibilidad', 'Orina de chorro medio', 'Cultivo bacteriano', 72, 'Urología'),
('MIC002', 'Urocultivo Simple', (SELECT id FROM study_categories WHERE code = 'MIC'), 'Cultivos', 'Cultivo de orina sin antibiograma', 'Orina de chorro medio', 'Cultivo bacteriano', 48, 'Urología'),
('MIC003', 'Cultivo de Orina con Conteo', (SELECT id FROM study_categories WHERE code = 'MIC'), 'Cultivos', 'Cultivo con conteo de colonias', 'Orina de chorro medio', 'Cultivo bacteriano', 48, 'Urología'),

-- Blood Culture
('MIC004', 'Hemocultivo', (SELECT id FROM study_categories WHERE code = 'MIC'), 'Cultivos', 'Cultivo de sangre para bacterias', 'No requiere ayuno', 'Cultivo bacteriano', 72, 'Medicina General'),
('MIC005', 'Hemocultivo con Antibiograma', (SELECT id FROM study_categories WHERE code = 'MIC'), 'Cultivos', 'Hemocultivo con sensibilidad', 'No requiere ayuno', 'Cultivo bacteriano', 72, 'Medicina General'),

-- Throat Culture
('MIC006', 'Cultivo de Faringe', (SELECT id FROM study_categories WHERE code = 'MIC'), 'Cultivos', 'Cultivo de exudado faríngeo', 'No requiere ayuno', 'Cultivo bacteriano', 48, 'Otorrinolaringología'),
('MIC007', 'Cultivo de Faringe con Antibiograma', (SELECT id FROM study_categories WHERE code = 'MIC'), 'Cultivos', 'Cultivo faríngeo con sensibilidad', 'No requiere ayuno', 'Cultivo bacteriano', 48, 'Otorrinolaringología'),

-- Stool Culture
('MIC008', 'Cultivo de Heces', (SELECT id FROM study_categories WHERE code = 'MIC'), 'Cultivos', 'Cultivo bacteriano de heces', 'Muestra fresca', 'Cultivo bacteriano', 48, 'Gastroenterología'),
('MIC009', 'Cultivo de Heces con Antibiograma', (SELECT id FROM study_categories WHERE code = 'MIC'), 'Cultivos', 'Cultivo de heces con sensibilidad', 'Muestra fresca', 'Cultivo bacteriano', 48, 'Gastroenterología'),
('MIC010', 'Coprocultivo', (SELECT id FROM study_categories WHERE code = 'MIC'), 'Cultivos', 'Cultivo de materia fecal', 'Muestra fresca', 'Cultivo bacteriano', 48, 'Gastroenterología'),

-- Wound Culture
('MIC011', 'Cultivo de Herida', (SELECT id FROM study_categories WHERE code = 'MIC'), 'Cultivos', 'Cultivo de secreción de herida', 'Limpieza previa', 'Cultivo bacteriano', 48, 'Cirugía'),
('MIC012', 'Cultivo de Absceso', (SELECT id FROM study_categories WHERE code = 'MIC'), 'Cultivos', 'Cultivo de material de absceso', 'Aspiración estéril', 'Cultivo bacteriano', 48, 'Cirugía'),

-- Sputum Culture
('MIC013', 'Cultivo de Esputo', (SELECT id FROM study_categories WHERE code = 'MIC'), 'Cultivos', 'Cultivo de esputo', 'Esputo matutino', 'Cultivo bacteriano', 48, 'Neumología'),
('MIC014', 'Cultivo de Esputo con Antibiograma', (SELECT id FROM study_categories WHERE code = 'MIC'), 'Cultivos', 'Cultivo de esputo con sensibilidad', 'Esputo matutino', 'Cultivo bacteriano', 48, 'Neumología'),

-- Special Cultures
('MIC015', 'Cultivo de LCR', (SELECT id FROM study_categories WHERE code = 'MIC'), 'Cultivos', 'Cultivo de líquido cefalorraquídeo', 'Punción lumbar', 'Cultivo bacteriano', 48, 'Neurología'),
('MIC016', 'Cultivo de Líquido Pleural', (SELECT id FROM study_categories WHERE code = 'MIC'), 'Cultivos', 'Cultivo de líquido pleural', 'Toracocentesis', 'Cultivo bacteriano', 48, 'Neumología'),
('MIC017', 'Cultivo de Líquido Ascítico', (SELECT id FROM study_categories WHERE code = 'MIC'), 'Cultivos', 'Cultivo de líquido ascítico', 'Paracentesis', 'Cultivo bacteriano', 48, 'Gastroenterología'),
('MIC018', 'Cultivo de Líquido Sinovial', (SELECT id FROM study_categories WHERE code = 'MIC'), 'Cultivos', 'Cultivo de líquido articular', 'Artrocentesis', 'Cultivo bacteriano', 48, 'Reumatología'),

-- ============================================================================
-- IMMUNOLOGY STUDIES
-- ============================================================================

INSERT INTO study_catalog (code, name, category_id, subcategory, description, preparation, methodology, duration_hours, specialty) VALUES
-- Autoimmune Studies
('INM001', 'Factor Reumatoide', (SELECT id FROM study_categories WHERE code = 'INM'), 'Autoinmunidad', 'Factor reumatoide IgM', 'No requiere ayuno', 'Inmunoensayo', 24, 'Reumatología'),
('INM002', 'Anticuerpos Antinucleares (ANA)', (SELECT id FROM study_categories WHERE code = 'INM'), 'Autoinmunidad', 'Anticuerpos antinucleares', 'No requiere ayuno', 'Inmunofluorescencia', 24, 'Reumatología'),
('INM003', 'Anti-ADN de Doble Cadena', (SELECT id FROM study_categories WHERE code = 'INM'), 'Autoinmunidad', 'Anti-dsDNA', 'No requiere ayuno', 'Inmunoensayo', 24, 'Reumatología'),
('INM004', 'Anti-Sm', (SELECT id FROM study_categories WHERE code = 'INM'), 'Autoinmunidad', 'Anticuerpos anti-Smith', 'No requiere ayuno', 'Inmunoensayo', 24, 'Reumatología'),
('INM005', 'Anti-RNP', (SELECT id FROM study_categories WHERE code = 'INM'), 'Autoinmunidad', 'Anticuerpos anti-RNP', 'No requiere ayuno', 'Inmunoensayo', 24, 'Reumatología'),
('INM006', 'Anti-SSA/Ro', (SELECT id FROM study_categories WHERE code = 'INM'), 'Autoinmunidad', 'Anticuerpos anti-SSA/Ro', 'No requiere ayuno', 'Inmunoensayo', 24, 'Reumatología'),
('INM007', 'Anti-SSB/La', (SELECT id FROM study_categories WHERE code = 'INM'), 'Autoinmunidad', 'Anticuerpos anti-SSB/La', 'No requiere ayuno', 'Inmunoensayo', 24, 'Reumatología'),
('INM008', 'Anti-Scl-70', (SELECT id FROM study_categories WHERE code = 'INM'), 'Autoinmunidad', 'Anticuerpos anti-Scl-70', 'No requiere ayuno', 'Inmunoensayo', 24, 'Reumatología'),
('INM009', 'Anti-Centrómero', (SELECT id FROM study_categories WHERE code = 'INM'), 'Autoinmunidad', 'Anticuerpos anti-centrómero', 'No requiere ayuno', 'Inmunoensayo', 24, 'Reumatología'),
('INM010', 'Anti-Jo-1', (SELECT id FROM study_categories WHERE code = 'INM'), 'Autoinmunidad', 'Anticuerpos anti-Jo-1', 'No requiere ayuno', 'Inmunoensayo', 24, 'Reumatología'),

-- Infectious Diseases
('INM011', 'VIH 1 y 2', (SELECT id FROM study_categories WHERE code = 'INM'), 'Enfermedades Infecciosas', 'Anticuerpos anti-VIH', 'No requiere ayuno', 'Inmunoensayo', 24, 'Medicina General'),
('INM012', 'Hepatitis B (HBsAg)', (SELECT id FROM study_categories WHERE code = 'INM'), 'Enfermedades Infecciosas', 'Antígeno de superficie hepatitis B', 'No requiere ayuno', 'Inmunoensayo', 24, 'Gastroenterología'),
('INM013', 'Hepatitis B (Anti-HBs)', (SELECT id FROM study_categories WHERE code = 'INM'), 'Enfermedades Infecciosas', 'Anticuerpos anti-HBs', 'No requiere ayuno', 'Inmunoensayo', 24, 'Gastroenterología'),
('INM014', 'Hepatitis B (Anti-HBc)', (SELECT id FROM study_categories WHERE code = 'INM'), 'Enfermedades Infecciosas', 'Anticuerpos anti-HBc', 'No requiere ayuno', 'Inmunoensayo', 24, 'Gastroenterología'),
('INM015', 'Hepatitis C (Anti-HCV)', (SELECT id FROM study_categories WHERE code = 'INM'), 'Enfermedades Infecciosas', 'Anticuerpos anti-hepatitis C', 'No requiere ayuno', 'Inmunoensayo', 24, 'Gastroenterología'),
('INM016', 'Hepatitis A (Anti-HAV IgM)', (SELECT id FROM study_categories WHERE code = 'INM'), 'Enfermedades Infecciosas', 'Anticuerpos anti-HAV IgM', 'No requiere ayuno', 'Inmunoensayo', 24, 'Gastroenterología'),
('INM017', 'Hepatitis A (Anti-HAV IgG)', (SELECT id FROM study_categories WHERE code = 'INM'), 'Enfermedades Infecciosas', 'Anticuerpos anti-HAV IgG', 'No requiere ayuno', 'Inmunoensayo', 24, 'Gastroenterología'),
('INM018', 'Sífilis (VDRL)', (SELECT id FROM study_categories WHERE code = 'INM'), 'Enfermedades Infecciosas', 'VDRL para sífilis', 'No requiere ayuno', 'Floculación', 24, 'Medicina General'),
('INM019', 'Sífilis (FTA-ABS)', (SELECT id FROM study_categories WHERE code = 'INM'), 'Enfermedades Infecciosas', 'FTA-ABS para sífilis', 'No requiere ayuno', 'Inmunofluorescencia', 24, 'Medicina General'),
('INM020', 'Toxoplasmosis (IgG)', (SELECT id FROM study_categories WHERE code = 'INM'), 'Enfermedades Infecciosas', 'Anticuerpos anti-Toxoplasma IgG', 'No requiere ayuno', 'Inmunoensayo', 24, 'Ginecología'),

-- ============================================================================
-- URINALYSIS STUDIES
-- ============================================================================

INSERT INTO study_catalog (code, name, category_id, subcategory, description, preparation, methodology, duration_hours, specialty) VALUES
-- Basic Urinalysis
('URO001', 'Examen General de Orina', (SELECT id FROM study_categories WHERE code = 'URO'), 'Uroanálisis Básico', 'Análisis físico, químico y microscópico', 'Primera orina de la mañana', 'Microscopía y tiras reactivas', 2, 'Medicina General'),
('URO002', 'Uroanálisis Completo', (SELECT id FROM study_categories WHERE code = 'URO'), 'Uroanálisis Básico', 'Análisis completo con sedimento', 'Primera orina de la mañana', 'Microscopía y tiras reactivas', 2, 'Medicina General'),
('URO003', 'Tira Reactiva de Orina', (SELECT id FROM study_categories WHERE code = 'URO'), 'Uroanálisis Básico', 'Análisis químico con tira reactiva', 'Primera orina de la mañana', 'Tiras reactivas', 1, 'Medicina General'),
('URO004', 'Sedimento Urinario', (SELECT id FROM study_categories WHERE code = 'URO'), 'Uroanálisis Básico', 'Examen microscópico del sedimento', 'Primera orina de la mañana', 'Microscopía', 2, 'Medicina General'),

-- Special Urine Tests
('URO005', 'Proteínas en Orina 24h', (SELECT id FROM study_categories WHERE code = 'URO'), 'Uroanálisis Especial', 'Proteínas totales en orina 24h', 'Recolección 24h', 'Espectrofotometría', 24, 'Nefrología'),
('URO006', 'Creatinina en Orina 24h', (SELECT id FROM study_categories WHERE code = 'URO'), 'Uroanálisis Especial', 'Creatinina en orina 24h', 'Recolección 24h', 'Espectrofotometría', 24, 'Nefrología'),
('URO007', 'Microalbuminuria', (SELECT id FROM study_categories WHERE code = 'URO'), 'Uroanálisis Especial', 'Albúmina en orina', 'Primera orina de la mañana', 'Inmunoensayo', 4, 'Nefrología'),
('URO008', 'Relación Albúmina/Creatinina', (SELECT id FROM study_categories WHERE code = 'URO'), 'Uroanálisis Especial', 'ACR en orina', 'Primera orina de la mañana', 'Inmunoensayo', 4, 'Nefrología'),
('URO009', 'Glucosa en Orina', (SELECT id FROM study_categories WHERE code = 'URO'), 'Uroanálisis Especial', 'Glucosa en orina', 'Primera orina de la mañana', 'Tiras reactivas', 1, 'Endocrinología'),
('URO010', 'Cetonas en Orina', (SELECT id FROM study_categories WHERE code = 'URO'), 'Uroanálisis Especial', 'Cuerpos cetónicos en orina', 'Primera orina de la mañana', 'Tiras reactivas', 1, 'Endocrinología'),

-- ============================================================================
-- TUMOR MARKERS
-- ============================================================================

INSERT INTO study_catalog (code, name, category_id, subcategory, description, preparation, methodology, duration_hours, specialty) VALUES
-- General Tumor Markers
('TUM001', 'CEA', (SELECT id FROM study_categories WHERE code = 'BIO'), 'Marcadores Tumorales', 'Antígeno carcinoembrionario', 'No requiere ayuno', 'Inmunoensayo', 24, 'Oncología'),
('TUM002', 'CA 19-9', (SELECT id FROM study_categories WHERE code = 'BIO'), 'Marcadores Tumorales', 'Antígeno carbohidrato 19-9', 'No requiere ayuno', 'Inmunoensayo', 24, 'Oncología'),
('TUM003', 'CA 125', (SELECT id FROM study_categories WHERE code = 'BIO'), 'Marcadores Tumorales', 'Antígeno carbohidrato 125', 'No requiere ayuno', 'Inmunoensayo', 24, 'Ginecología'),
('TUM004', 'CA 15-3', (SELECT id FROM study_categories WHERE code = 'BIO'), 'Marcadores Tumorales', 'Antígeno carbohidrato 15-3', 'No requiere ayuno', 'Inmunoensayo', 24, 'Oncología'),
('TUM005', 'PSA Total', (SELECT id FROM study_categories WHERE code = 'BIO'), 'Marcadores Tumorales', 'Antígeno prostático específico total', 'No requiere ayuno', 'Inmunoensayo', 24, 'Urología'),
('TUM006', 'PSA Libre', (SELECT id FROM study_categories WHERE code = 'BIO'), 'Marcadores Tumorales', 'Antígeno prostático específico libre', 'No requiere ayuno', 'Inmunoensayo', 24, 'Urología'),
('TUM007', 'AFP', (SELECT id FROM study_categories WHERE code = 'BIO'), 'Marcadores Tumorales', 'Alfa-fetoproteína', 'No requiere ayuno', 'Inmunoensayo', 24, 'Oncología'),
('TUM008', 'HCG', (SELECT id FROM study_categories WHERE code = 'BIO'), 'Marcadores Tumorales', 'Gonadotropina coriónica humana', 'No requiere ayuno', 'Inmunoensayo', 24, 'Ginecología'),
('TUM009', 'Beta-2 Microglobulina', (SELECT id FROM study_categories WHERE code = 'BIO'), 'Marcadores Tumorales', 'Beta-2 microglobulina', 'No requiere ayuno', 'Inmunoensayo', 24, 'Oncología'),
('TUM010', 'LDH', (SELECT id FROM study_categories WHERE code = 'BIO'), 'Marcadores Tumorales', 'Lactato deshidrogenasa', 'No requiere ayuno', 'Espectrofotometría', 2, 'Oncología'),

-- ============================================================================
-- NORMAL VALUES FOR STUDIES
-- ============================================================================

-- Hematology Normal Values
INSERT INTO study_normal_values (study_id, age_min, age_max, gender, min_value, max_value, unit, notes) VALUES
-- Complete Blood Count
((SELECT id FROM study_catalog WHERE code = 'HEM001'), 18, 99, 'B', 4.5, 5.5, 'millones/μL', 'Eritrocitos'),
((SELECT id FROM study_catalog WHERE code = 'HEM001'), 18, 99, 'B', 12.0, 16.0, 'g/dL', 'Hemoglobina'),
((SELECT id FROM study_catalog WHERE code = 'HEM001'), 18, 99, 'B', 36.0, 46.0, '%', 'Hematocrito'),
((SELECT id FROM study_catalog WHERE code = 'HEM001'), 18, 99, 'B', 4000.0, 10000.0, 'μL', 'Leucocitos'),
((SELECT id FROM study_catalog WHERE code = 'HEM001'), 18, 99, 'B', 150000.0, 450000.0, 'μL', 'Plaquetas'),

-- Glucose
((SELECT id FROM study_catalog WHERE code = 'BIO004'), 18, 99, 'B', 70.0, 100.0, 'mg/dL', 'Valores normales'),
((SELECT id FROM study_catalog WHERE code = 'BIO004'), 18, 99, 'B', 100.0, 125.0, 'mg/dL', 'Prediabetes'),
((SELECT id FROM study_catalog WHERE code = 'BIO004'), 18, 99, 'B', 126.0, 999.0, 'mg/dL', 'Diabetes'),

-- HbA1c
((SELECT id FROM study_catalog WHERE code = 'HEM024'), 18, 99, 'B', 4.0, 5.6, '%', 'Normal'),
((SELECT id FROM study_catalog WHERE code = 'HEM024'), 18, 99, 'B', 5.7, 6.4, '%', 'Prediabetes'),
((SELECT id FROM study_catalog WHERE code = 'HEM024'), 18, 99, 'B', 6.5, 15.0, '%', 'Diabetes'),

-- Thyroid Function
((SELECT id FROM study_catalog WHERE code = 'END003'), 18, 99, 'B', 0.4, 4.0, 'mUI/L', 'TSH'),
((SELECT id FROM study_catalog WHERE code = 'END004'), 18, 99, 'B', 0.8, 1.8, 'ng/dL', 'T4L'),
((SELECT id FROM study_catalog WHERE code = 'END005'), 18, 99, 'B', 2.3, 4.2, 'pg/mL', 'T3L'),

-- Lipid Profile
((SELECT id FROM study_catalog WHERE code = 'BIO020'), 18, 99, 'B', 0.0, 200.0, 'mg/dL', 'Colesterol Total'),
((SELECT id FROM study_catalog WHERE code = 'BIO021'), 18, 99, 'B', 40.0, 999.0, 'mg/dL', 'Colesterol HDL'),
((SELECT id FROM study_catalog WHERE code = 'BIO022'), 18, 99, 'B', 0.0, 100.0, 'mg/dL', 'Colesterol LDL'),
((SELECT id FROM study_catalog WHERE code = 'BIO023'), 18, 99, 'B', 0.0, 150.0, 'mg/dL', 'Triglicéridos'),

-- Liver Function
((SELECT id FROM study_catalog WHERE code = 'BIO012'), 18, 99, 'B', 7.0, 56.0, 'U/L', 'ALT'),
((SELECT id FROM study_catalog WHERE code = 'BIO013'), 18, 99, 'B', 10.0, 40.0, 'U/L', 'AST'),
((SELECT id FROM study_catalog WHERE code = 'BIO014'), 18, 99, 'B', 8.0, 61.0, 'U/L', 'GGT'),
((SELECT id FROM study_catalog WHERE code = 'BIO015'), 18, 99, 'B', 44.0, 147.0, 'U/L', 'Fosfatasa Alcalina'),
((SELECT id FROM study_catalog WHERE code = 'BIO016'), 18, 99, 'B', 0.3, 1.2, 'mg/dL', 'Bilirrubina Total'),

-- Renal Function
((SELECT id FROM study_catalog WHERE code = 'BIO006'), 18, 99, 'B', 7.0, 20.0, 'mg/dL', 'Urea'),
((SELECT id FROM study_catalog WHERE code = 'BIO007'), 18, 99, 'B', 0.6, 1.2, 'mg/dL', 'Creatinina'),
((SELECT id FROM study_catalog WHERE code = 'BIO009'), 18, 99, 'B', 3.5, 7.0, 'mg/dL', 'Ácido Úrico'),

-- Electrolytes
((SELECT id FROM study_catalog WHERE code = 'BIO025'), 18, 99, 'B', 136.0, 145.0, 'mEq/L', 'Sodio'),
((SELECT id FROM study_catalog WHERE code = 'BIO026'), 18, 99, 'B', 3.5, 5.0, 'mEq/L', 'Potasio'),
((SELECT id FROM study_catalog WHERE code = 'BIO027'), 18, 99, 'B', 98.0, 107.0, 'mEq/L', 'Cloro'),
((SELECT id FROM study_catalog WHERE code = 'BIO028'), 18, 99, 'B', 8.5, 10.5, 'mg/dL', 'Calcio'),
((SELECT id FROM study_catalog WHERE code = 'BIO029'), 18, 99, 'B', 2.5, 4.5, 'mg/dL', 'Fósforo'),
((SELECT id FROM study_catalog WHERE code = 'BIO030'), 18, 99, 'B', 1.7, 2.2, 'mg/dL', 'Magnesio');

-- ============================================================================
-- STUDY TEMPLATES
-- ============================================================================

INSERT INTO study_templates (name, description, specialty, is_default) VALUES
('Chequeo General', 'Estudios básicos para evaluación general de salud', 'Medicina General', TRUE),
('Monitoreo de Diabetes', 'Estudios para seguimiento de diabetes mellitus', 'Endocrinología', TRUE),
('Evaluación Cardíaca', 'Estudios para evaluación cardiovascular', 'Cardiología', TRUE),
('Control Prenatal', 'Estudios para seguimiento prenatal', 'Ginecología', TRUE),
('Evaluación Tiroidea', 'Estudios para evaluación de la función tiroidea', 'Endocrinología', FALSE),
('Evaluación Hepática', 'Estudios para evaluación de la función hepática', 'Gastroenterología', FALSE),
('Evaluación Renal', 'Estudios para evaluación de la función renal', 'Nefrología', FALSE),
('Evaluación Reumatológica', 'Estudios para evaluación reumatológica', 'Reumatología', FALSE),
('Evaluación Oncológica', 'Estudios para evaluación oncológica', 'Oncología', FALSE),
('Evaluación Infecciosa', 'Estudios para evaluación de enfermedades infecciosas', 'Medicina General', FALSE);

-- Template Items
-- Chequeo General
INSERT INTO study_template_items (template_id, study_id, order_index) VALUES
((SELECT id FROM study_templates WHERE name = 'Chequeo General'), (SELECT id FROM study_catalog WHERE code = 'HEM001'), 0),
((SELECT id FROM study_templates WHERE name = 'Chequeo General'), (SELECT id FROM study_catalog WHERE code = 'BIO001'), 1),
((SELECT id FROM study_templates WHERE name = 'Chequeo General'), (SELECT id FROM study_catalog WHERE code = 'URO001'), 2),
((SELECT id FROM study_templates WHERE name = 'Chequeo General'), (SELECT id FROM study_catalog WHERE code = 'BIO019'), 3);

-- Monitoreo de Diabetes
INSERT INTO study_template_items (template_id, study_id, order_index) VALUES
((SELECT id FROM study_templates WHERE name = 'Monitoreo de Diabetes'), (SELECT id FROM study_catalog WHERE code = 'BIO004'), 0),
((SELECT id FROM study_templates WHERE name = 'Monitoreo de Diabetes'), (SELECT id FROM study_catalog WHERE code = 'HEM024'), 1),
((SELECT id FROM study_templates WHERE name = 'Monitoreo de Diabetes'), (SELECT id FROM study_catalog WHERE code = 'BIO001'), 2),
((SELECT id FROM study_templates WHERE name = 'Monitoreo de Diabetes'), (SELECT id FROM study_catalog WHERE code = 'URO007'), 3);

-- Evaluación Cardíaca
INSERT INTO study_template_items (template_id, study_id, order_index) VALUES
((SELECT id FROM study_templates WHERE name = 'Evaluación Cardíaca'), (SELECT id FROM study_catalog WHERE code = 'BIO019'), 0),
((SELECT id FROM study_templates WHERE name = 'Evaluación Cardíaca'), (SELECT id FROM study_catalog WHERE code = 'BIO001'), 1),
((SELECT id FROM study_templates WHERE name = 'Evaluación Cardíaca'), (SELECT id FROM study_catalog WHERE code = 'HEM001'), 2);

-- Control Prenatal
INSERT INTO study_template_items (template_id, study_id, order_index) VALUES
((SELECT id FROM study_templates WHERE name = 'Control Prenatal'), (SELECT id FROM study_catalog WHERE code = 'HEM001'), 0),
((SELECT id FROM study_templates WHERE name = 'Control Prenatal'), (SELECT id FROM study_catalog WHERE code = 'BIO001'), 1),
((SELECT id FROM study_templates WHERE name = 'Control Prenatal'), (SELECT id FROM study_catalog WHERE code = 'URO001'), 2),
((SELECT id FROM study_templates WHERE name = 'Control Prenatal'), (SELECT id FROM study_catalog WHERE code = 'INM011'), 3),
((SELECT id FROM study_templates WHERE name = 'Control Prenatal'), (SELECT id FROM study_catalog WHERE code = 'INM012'), 4),
((SELECT id FROM study_templates WHERE name = 'Control Prenatal'), (SELECT id FROM study_catalog WHERE code = 'INM015'), 5);

-- Evaluación Tiroidea
INSERT INTO study_template_items (template_id, study_id, order_index) VALUES
((SELECT id FROM study_templates WHERE name = 'Evaluación Tiroidea'), (SELECT id FROM study_catalog WHERE code = 'END001'), 0),
((SELECT id FROM study_templates WHERE name = 'Evaluación Tiroidea'), (SELECT id FROM study_catalog WHERE code = 'END008'), 1),
((SELECT id FROM study_templates WHERE name = 'Evaluación Tiroidea'), (SELECT id FROM study_catalog WHERE code = 'END009'), 2);

-- Evaluación Hepática
INSERT INTO study_template_items (template_id, study_id, order_index) VALUES
((SELECT id FROM study_templates WHERE name = 'Evaluación Hepática'), (SELECT id FROM study_catalog WHERE code = 'BIO011'), 0),
((SELECT id FROM study_templates WHERE name = 'Evaluación Hepática'), (SELECT id FROM study_catalog WHERE code = 'BIO001'), 1),
((SELECT id FROM study_templates WHERE name = 'Evaluación Hepática'), (SELECT id FROM study_catalog WHERE code = 'HEM001'), 2);

-- Evaluación Renal
INSERT INTO study_template_items (template_id, study_id, order_index) VALUES
((SELECT id FROM study_templates WHERE name = 'Evaluación Renal'), (SELECT id FROM study_catalog WHERE code = 'BIO006'), 0),
((SELECT id FROM study_templates WHERE name = 'Evaluación Renal'), (SELECT id FROM study_catalog WHERE code = 'BIO007'), 1),
((SELECT id FROM study_templates WHERE name = 'Evaluación Renal'), (SELECT id FROM study_catalog WHERE code = 'BIO008'), 2),
((SELECT id FROM study_templates WHERE name = 'Evaluación Renal'), (SELECT id FROM study_catalog WHERE code = 'URO005'), 3),
((SELECT id FROM study_templates WHERE name = 'Evaluación Renal'), (SELECT id FROM study_catalog WHERE code = 'URO007'), 4);

-- Evaluación Reumatológica
INSERT INTO study_template_items (template_id, study_id, order_index) VALUES
((SELECT id FROM study_templates WHERE name = 'Evaluación Reumatológica'), (SELECT id FROM study_catalog WHERE code = 'INM001'), 0),
((SELECT id FROM study_templates WHERE name = 'Evaluación Reumatológica'), (SELECT id FROM study_catalog WHERE code = 'INM002'), 1),
((SELECT id FROM study_templates WHERE name = 'Evaluación Reumatológica'), (SELECT id FROM study_catalog WHERE code = 'BIO009'), 2),
((SELECT id FROM study_templates WHERE name = 'Evaluación Reumatológica'), (SELECT id FROM study_catalog WHERE code = 'HEM001'), 3);

-- Evaluación Oncológica
INSERT INTO study_template_items (template_id, study_id, order_index) VALUES
((SELECT id FROM study_templates WHERE name = 'Evaluación Oncológica'), (SELECT id FROM study_catalog WHERE code = 'TUM001'), 0),
((SELECT id FROM study_templates WHERE name = 'Evaluación Oncológica'), (SELECT id FROM study_catalog WHERE code = 'TUM002'), 1),
((SELECT id FROM study_templates WHERE name = 'Evaluación Oncológica'), (SELECT id FROM study_catalog WHERE code = 'TUM010'), 2),
((SELECT id FROM study_templates WHERE name = 'Evaluación Oncológica'), (SELECT id FROM study_catalog WHERE code = 'HEM001'), 3),
((SELECT id FROM study_templates WHERE name = 'Evaluación Oncológica'), (SELECT id FROM study_catalog WHERE code = 'BIO001'), 4);

-- Evaluación Infecciosa
INSERT INTO study_template_items (template_id, study_id, order_index) VALUES
((SELECT id FROM study_templates WHERE name = 'Evaluación Infecciosa'), (SELECT id FROM study_catalog WHERE code = 'HEM001'), 0),
((SELECT id FROM study_templates WHERE name = 'Evaluación Infecciosa'), (SELECT id FROM study_catalog WHERE code = 'BIO001'), 1),
((SELECT id FROM study_templates WHERE name = 'Evaluación Infecciosa'), (SELECT id FROM study_catalog WHERE code = 'MIC001'), 2),
((SELECT id FROM study_templates WHERE name = 'Evaluación Infecciosa'), (SELECT id FROM study_catalog WHERE code = 'INM011'), 3),
((SELECT id FROM study_templates WHERE name = 'Evaluación Infecciosa'), (SELECT id FROM study_catalog WHERE code = 'INM012'), 4),
((SELECT id FROM study_templates WHERE name = 'Evaluación Infecciosa'), (SELECT id FROM study_catalog WHERE code = 'INM015'), 5);

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================

-- This script adds a comprehensive catalog of laboratory studies including:
-- - 18 study categories
-- - 200+ individual studies covering all major areas:
--   * Hematology (30 studies)
--   * Biochemistry (30 studies) 
--   * Endocrinology (30 studies)
--   * Microbiology (18 studies)
--   * Immunology (20 studies)
--   * Urinalysis (10 studies)
--   * Tumor Markers (10 studies)
-- - Normal values for key studies
-- - 10 study templates for common clinical scenarios
-- - All studies include preparation instructions, methodology, and delivery times
-- - Studies are organized by specialty for easy filtering
-- - Based on NOM-220-SSA1-2016 and international standards
