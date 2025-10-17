-- Insert CIE-10 Categories
INSERT INTO diagnosis_categories (code, name, level, is_active, created_at, updated_at) VALUES
('A00-B99', 'Ciertas enfermedades infecciosas y parasitarias', 1, true, NOW(), NOW()),
('C00-D49', 'Neoplasias', 1, true, NOW(), NOW()),
('D50-D89', 'Enfermedades de la sangre y de los órganos hematopoyéticos', 1, true, NOW(), NOW()),
('E00-E89', 'Enfermedades endocrinas, nutricionales y metabólicas', 1, true, NOW(), NOW()),
('F01-F99', 'Trastornos mentales y del comportamiento', 1, true, NOW(), NOW()),
('G00-G99', 'Enfermedades del sistema nervioso', 1, true, NOW(), NOW()),
('H00-H59', 'Enfermedades del ojo y sus anexos', 1, true, NOW(), NOW()),
('H60-H95', 'Enfermedades del oído y de la apófisis mastoides', 1, true, NOW(), NOW()),
('I00-I99', 'Enfermedades del sistema circulatorio', 1, true, NOW(), NOW()),
('J00-J99', 'Enfermedades del sistema respiratorio', 1, true, NOW(), NOW()),
('K00-K93', 'Enfermedades del sistema digestivo', 1, true, NOW(), NOW()),
('L00-L99', 'Enfermedades de la piel y del tejido subcutáneo', 1, true, NOW(), NOW()),
('M00-M99', 'Enfermedades del sistema osteomuscular y del tejido conectivo', 1, true, NOW(), NOW()),
('N00-N99', 'Enfermedades del sistema genitourinario', 1, true, NOW(), NOW()),
('O00-O9A', 'Embarazo, parto y puerperio', 1, true, NOW(), NOW()),
('P00-P96', 'Ciertas afecciones originadas en el período perinatal', 1, true, NOW(), NOW()),
('Q00-Q99', 'Malformaciones congénitas, deformidades y anomalías cromosómicas', 1, true, NOW(), NOW()),
('R00-R94', 'Síntomas, signos y hallazgos anormales clínicos y de laboratorio', 1, true, NOW(), NOW()),
('S00-T88', 'Traumatismos, envenenamientos y algunas otras consecuencias de causas externas', 1, true, NOW(), NOW()),
('U00-U85', 'Códigos para situaciones especiales', 1, true, NOW(), NOW()),
('V01-Y99', 'Causas externas de morbilidad y mortalidad', 1, true, NOW(), NOW()),
('Z00-Z99', 'Factores que influyen en el estado de salud y contacto con los servicios de salud', 1, true, NOW(), NOW())
ON CONFLICT (code) DO NOTHING;

-- Insert Medical Specialties
CREATE TABLE IF NOT EXISTS medical_specialties (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO medical_specialties (name, description, is_active) VALUES
('Medicina Interna', 'Especialidad médica en Medicina Interna', true),
('Cardiología', 'Especialidad médica en Cardiología', true),
('Endocrinología', 'Especialidad médica en Endocrinología', true),
('Gastroenterología', 'Especialidad médica en Gastroenterología', true),
('Neurología', 'Especialidad médica en Neurología', true),
('Psiquiatría', 'Especialidad médica en Psiquiatría', true),
('Dermatología', 'Especialidad médica en Dermatología', true),
('Oftalmología', 'Especialidad médica en Oftalmología', true),
('Otorrinolaringología', 'Especialidad médica en Otorrinolaringología', true),
('Neumología', 'Especialidad médica en Neumología', true),
('Nefrología', 'Especialidad médica en Nefrología', true),
('Hematología', 'Especialidad médica en Hematología', true),
('Oncología', 'Especialidad médica en Oncología', true),
('Reumatología', 'Especialidad médica en Reumatología', true),
('Infectología', 'Especialidad médica en Infectología', true),
('Medicina Familiar', 'Especialidad médica en Medicina Familiar', true),
('Pediatría', 'Especialidad médica en Pediatría', true),
('Ginecología y Obstetricia', 'Especialidad médica en Ginecología y Obstetricia', true),
('Urología', 'Especialidad médica en Urología', true),
('Traumatología', 'Especialidad médica en Traumatología', true),
('Cirugía General', 'Especialidad médica en Cirugía General', true),
('Cirugía Cardiovascular', 'Especialidad médica en Cirugía Cardiovascular', true),
('Neurocirugía', 'Especialidad médica en Neurocirugía', true),
('Cirugía Plástica', 'Especialidad médica en Cirugía Plástica', true),
('Anestesiología', 'Especialidad médica en Anestesiología', true),
('Radiología', 'Especialidad médica en Radiología', true),
('Patología', 'Especialidad médica en Patología', true),
('Medicina de Emergencias', 'Especialidad médica en Medicina de Emergencias', true),
('Medicina Preventiva', 'Especialidad médica en Medicina Preventiva', true),
('Medicina del Trabajo', 'Especialidad médica en Medicina del Trabajo', true),
('Medicina Deportiva', 'Especialidad médica en Medicina Deportiva', true),
('Geriatría', 'Especialidad médica en Geriatría', true),
('Alergología', 'Especialidad médica en Alergología', true),
('Inmunología', 'Especialidad médica en Inmunología', true),
('Genética Médica', 'Especialidad médica en Genética Médica', true),
('Medicina Nuclear', 'Especialidad médica en Medicina Nuclear', true),
('Fisiatría', 'Especialidad médica en Fisiatría', true),
('Medicina Paliativa', 'Especialidad médica en Medicina Paliativa', true)
ON CONFLICT (name) DO NOTHING;

-- Insert Diagnosis Catalog
INSERT INTO diagnosis_catalog (code, name, category_id, description, severity_level, is_chronic, is_contagious, specialty, is_active, created_at, updated_at) VALUES
-- A00-B99: Ciertas enfermedades infecciosas y parasitarias
('A00', 'Cólera', (SELECT id FROM diagnosis_categories WHERE code = 'A00-B99'), 'Infección bacteriana aguda del intestino', 'severe', true, true, 'Infectología', true, NOW(), NOW()),
('A01', 'Fiebres tifoidea y paratifoidea', (SELECT id FROM diagnosis_categories WHERE code = 'A00-B99'), 'Infección bacteriana sistémica', 'severe', false, true, 'Infectología', true, NOW(), NOW()),
('A09', 'Diarrea y gastroenteritis de presunto origen infeccioso', (SELECT id FROM diagnosis_categories WHERE code = 'A00-B99'), 'Inflamación del tracto gastrointestinal', 'mild', false, true, 'Gastroenterología', true, NOW(), NOW()),
('B00', 'Infección por herpesvirus [herpes simple]', (SELECT id FROM diagnosis_categories WHERE code = 'A00-B99'), 'Infección viral recurrente', 'moderate', true, true, 'Dermatología', true, NOW(), NOW()),
('B15', 'Hepatitis A', (SELECT id FROM diagnosis_categories WHERE code = 'A00-B99'), 'Inflamación viral del hígado', 'moderate', false, true, 'Gastroenterología', true, NOW(), NOW()),
('B16', 'Hepatitis B', (SELECT id FROM diagnosis_categories WHERE code = 'A00-B99'), 'Inflamación viral crónica del hígado', 'severe', true, true, 'Gastroenterología', true, NOW(), NOW()),
('B17', 'Hepatitis C', (SELECT id FROM diagnosis_categories WHERE code = 'A00-B99'), 'Inflamación viral crónica del hígado', 'severe', true, true, 'Gastroenterología', true, NOW(), NOW()),

-- C00-D49: Neoplasias
('C00', 'Neoplasia maligna del labio', (SELECT id FROM diagnosis_categories WHERE code = 'C00-D49'), 'Tumor maligno del labio', 'severe', true, false, 'Oncología', true, NOW(), NOW()),
('C15', 'Neoplasia maligna del esófago', (SELECT id FROM diagnosis_categories WHERE code = 'C00-D49'), 'Tumor maligno del esófago', 'severe', true, false, 'Oncología', true, NOW(), NOW()),
('C16', 'Neoplasia maligna del estómago', (SELECT id FROM diagnosis_categories WHERE code = 'C00-D49'), 'Tumor maligno del estómago', 'severe', true, false, 'Oncología', true, NOW(), NOW()),
('C18', 'Neoplasia maligna del colon', (SELECT id FROM diagnosis_categories WHERE code = 'C00-D49'), 'Tumor maligno del colon', 'severe', true, false, 'Oncología', true, NOW(), NOW()),
('C22', 'Neoplasia maligna del hígado y de las vías biliares intrahepáticas', (SELECT id FROM diagnosis_categories WHERE code = 'C00-D49'), 'Tumor maligno del hígado', 'severe', true, false, 'Oncología', true, NOW(), NOW()),
('C25', 'Neoplasia maligna del páncreas', (SELECT id FROM diagnosis_categories WHERE code = 'C00-D49'), 'Tumor maligno del páncreas', 'severe', true, false, 'Oncología', true, NOW(), NOW()),
('C34', 'Neoplasia maligna de bronquios y pulmón', (SELECT id FROM diagnosis_categories WHERE code = 'C00-D49'), 'Tumor maligno del pulmón', 'severe', true, false, 'Neumología', true, NOW(), NOW()),
('C50', 'Neoplasia maligna de la mama', (SELECT id FROM diagnosis_categories WHERE code = 'C00-D49'), 'Tumor maligno de la mama', 'severe', true, false, 'Oncología', true, NOW(), NOW()),
('C56', 'Neoplasia maligna del ovario', (SELECT id FROM diagnosis_categories WHERE code = 'C00-D49'), 'Tumor maligno del ovario', 'severe', true, false, 'Ginecología y Obstetricia', true, NOW(), NOW()),
('C61', 'Neoplasia maligna de la próstata', (SELECT id FROM diagnosis_categories WHERE code = 'C00-D49'), 'Tumor maligno de la próstata', 'severe', true, false, 'Urología', true, NOW(), NOW()),

-- D50-D89: Enfermedades de la sangre
('D50', 'Anemia ferropénica', (SELECT id FROM diagnosis_categories WHERE code = 'D50-D89'), 'Deficiencia de hierro en la sangre', 'moderate', false, false, 'Hematología', true, NOW(), NOW()),
('D51', 'Anemia por deficiencia de vitamina B12', (SELECT id FROM diagnosis_categories WHERE code = 'D50-D89'), 'Deficiencia de vitamina B12', 'moderate', false, false, 'Hematología', true, NOW(), NOW()),
('D64', 'Otras anemias', (SELECT id FROM diagnosis_categories WHERE code = 'D50-D89'), 'Diversas formas de anemia', 'moderate', false, false, 'Hematología', true, NOW(), NOW()),
('D69', 'Púrpura y otras afecciones hemorrágicas', (SELECT id FROM diagnosis_categories WHERE code = 'D50-D89'), 'Trastornos de la coagulación', 'moderate', false, false, 'Hematología', true, NOW(), NOW()),

-- E00-E89: Enfermedades endocrinas
('E10', 'Diabetes mellitus tipo 1', (SELECT id FROM diagnosis_categories WHERE code = 'E00-E89'), 'Diabetes insulinodependiente', 'severe', true, false, 'Endocrinología', true, NOW(), NOW()),
('E11', 'Diabetes mellitus tipo 2', (SELECT id FROM diagnosis_categories WHERE code = 'E00-E89'), 'Diabetes no insulinodependiente', 'severe', true, false, 'Endocrinología', true, NOW(), NOW()),
('E03', 'Hipotiroidismo', (SELECT id FROM diagnosis_categories WHERE code = 'E00-E89'), 'Deficiencia de hormonas tiroideas', 'moderate', true, false, 'Endocrinología', true, NOW(), NOW()),
('E04', 'Bocio no tóxico', (SELECT id FROM diagnosis_categories WHERE code = 'E00-E89'), 'Agrandamiento de la tiroides', 'mild', false, false, 'Endocrinología', true, NOW(), NOW()),
('E05', 'Tirotoxicosis [hipertiroidismo]', (SELECT id FROM diagnosis_categories WHERE code = 'E00-E89'), 'Exceso de hormonas tiroideas', 'severe', false, false, 'Endocrinología', true, NOW(), NOW()),
('E66', 'Obesidad', (SELECT id FROM diagnosis_categories WHERE code = 'E00-E89'), 'Exceso de peso corporal', 'moderate', true, false, 'Endocrinología', true, NOW(), NOW()),
('E78', 'Trastornos del metabolismo de las lipoproteínas', (SELECT id FROM diagnosis_categories WHERE code = 'E00-E89'), 'Alteraciones del colesterol', 'moderate', true, false, 'Endocrinología', true, NOW(), NOW()),

-- F01-F99: Trastornos mentales
('F10', 'Trastornos mentales y del comportamiento debidos al uso de alcohol', (SELECT id FROM diagnosis_categories WHERE code = 'F01-F99'), 'Adicción al alcohol', 'severe', true, false, 'Psiquiatría', true, NOW(), NOW()),
('F17', 'Trastornos mentales y del comportamiento debidos al uso de tabaco', (SELECT id FROM diagnosis_categories WHERE code = 'F01-F99'), 'Adicción al tabaco', 'moderate', true, false, 'Psiquiatría', true, NOW(), NOW()),
('F20', 'Esquizofrenia', (SELECT id FROM diagnosis_categories WHERE code = 'F01-F99'), 'Trastorno psicótico crónico', 'severe', true, false, 'Psiquiatría', true, NOW(), NOW()),
('F32', 'Episodio depresivo', (SELECT id FROM diagnosis_categories WHERE code = 'F01-F99'), 'Trastorno del estado de ánimo', 'moderate', false, false, 'Psiquiatría', true, NOW(), NOW()),
('F41', 'Otros trastornos de ansiedad', (SELECT id FROM diagnosis_categories WHERE code = 'F01-F99'), 'Trastornos de ansiedad', 'moderate', true, false, 'Psiquiatría', true, NOW(), NOW()),
('F43', 'Trastornos de adaptación', (SELECT id FROM diagnosis_categories WHERE code = 'F01-F99'), 'Respuesta al estrés', 'moderate', false, false, 'Psiquiatría', true, NOW(), NOW()),

-- G00-G99: Enfermedades del sistema nervioso
('G40', 'Epilepsia', (SELECT id FROM diagnosis_categories WHERE code = 'G00-G99'), 'Trastorno convulsivo', 'severe', true, false, 'Neurología', true, NOW(), NOW()),
('G43', 'Migraña', (SELECT id FROM diagnosis_categories WHERE code = 'G00-G99'), 'Cefalea vascular', 'moderate', true, false, 'Neurología', true, NOW(), NOW()),
('G93', 'Otros trastornos del encéfalo', (SELECT id FROM diagnosis_categories WHERE code = 'G00-G99'), 'Trastornos cerebrales diversos', 'moderate', false, false, 'Neurología', true, NOW(), NOW()),
('G95', 'Otras enfermedades de la médula espinal', (SELECT id FROM diagnosis_categories WHERE code = 'G00-G99'), 'Trastornos medulares', 'severe', true, false, 'Neurología', true, NOW(), NOW()),

-- H00-H59: Enfermedades del ojo
('H25', 'Catarata senil', (SELECT id FROM diagnosis_categories WHERE code = 'H00-H59'), 'Opacidad del cristalino', 'moderate', true, false, 'Oftalmología', true, NOW(), NOW()),
('H26', 'Otras cataratas', (SELECT id FROM diagnosis_categories WHERE code = 'H00-H59'), 'Opacidad del cristalino', 'moderate', false, false, 'Oftalmología', true, NOW(), NOW()),
('H40', 'Glaucoma', (SELECT id FROM diagnosis_categories WHERE code = 'H00-H59'), 'Presión intraocular elevada', 'severe', true, false, 'Oftalmología', true, NOW(), NOW()),
('H52', 'Trastornos de la refracción y de la acomodación', (SELECT id FROM diagnosis_categories WHERE code = 'H00-H59'), 'Defectos de visión', 'mild', true, false, 'Oftalmología', true, NOW(), NOW()),

-- H60-H95: Enfermedades del oído
('H65', 'Otitis media no supurativa', (SELECT id FROM diagnosis_categories WHERE code = 'H60-H95'), 'Inflamación del oído medio', 'mild', false, false, 'Otorrinolaringología', true, NOW(), NOW()),
('H66', 'Otitis media supurativa y la no especificada', (SELECT id FROM diagnosis_categories WHERE code = 'H60-H95'), 'Infección del oído medio', 'moderate', false, false, 'Otorrinolaringología', true, NOW(), NOW()),
('H90', 'Hipoacusia conductiva y neurosensorial', (SELECT id FROM diagnosis_categories WHERE code = 'H60-H95'), 'Pérdida de audición', 'moderate', true, false, 'Otorrinolaringología', true, NOW(), NOW()),

-- I00-I99: Enfermedades del sistema circulatorio
('I10', 'Hipertensión esencial (primaria)', (SELECT id FROM diagnosis_categories WHERE code = 'I00-I99'), 'Presión arterial elevada', 'moderate', true, false, 'Cardiología', true, NOW(), NOW()),
('I20', 'Angina de pecho', (SELECT id FROM diagnosis_categories WHERE code = 'I00-I99'), 'Dolor torácico por isquemia', 'severe', true, false, 'Cardiología', true, NOW(), NOW()),
('I21', 'Infarto agudo de miocardio', (SELECT id FROM diagnosis_categories WHERE code = 'I00-I99'), 'Muerte del tejido cardíaco', 'critical', false, false, 'Cardiología', true, NOW(), NOW()),
('I25', 'Enfermedad cardíaca isquémica crónica', (SELECT id FROM diagnosis_categories WHERE code = 'I00-I99'), 'Enfermedad coronaria crónica', 'severe', true, false, 'Cardiología', true, NOW(), NOW()),
('I48', 'Fibrilación y aleteo auricular', (SELECT id FROM diagnosis_categories WHERE code = 'I00-I99'), 'Arritmia cardíaca', 'severe', true, false, 'Cardiología', true, NOW(), NOW()),
('I50', 'Insuficiencia cardíaca', (SELECT id FROM diagnosis_categories WHERE code = 'I00-I99'), 'Fallencia del corazón', 'severe', true, false, 'Cardiología', true, NOW(), NOW()),
('I63', 'Infarto cerebral', (SELECT id FROM diagnosis_categories WHERE code = 'I00-I99'), 'Accidente cerebrovascular isquémico', 'critical', false, false, 'Neurología', true, NOW(), NOW()),
('I64', 'Accidente cerebrovascular, no especificado como hemorrágico o isquémico', (SELECT id FROM diagnosis_categories WHERE code = 'I00-I99'), 'Accidente cerebrovascular', 'critical', false, false, 'Neurología', true, NOW(), NOW()),

-- J00-J99: Enfermedades del sistema respiratorio
('J06', 'Infecciones agudas de las vías respiratorias superiores', (SELECT id FROM diagnosis_categories WHERE code = 'J00-J99'), 'Infección respiratoria alta', 'mild', false, true, 'Medicina Interna', true, NOW(), NOW()),
('J15', 'Neumonía bacteriana', (SELECT id FROM diagnosis_categories WHERE code = 'J00-J99'), 'Infección pulmonar bacteriana', 'severe', false, true, 'Neumología', true, NOW(), NOW()),
('J18', 'Neumonía, organismo no especificado', (SELECT id FROM diagnosis_categories WHERE code = 'J00-J99'), 'Infección pulmonar', 'severe', false, true, 'Neumología', true, NOW(), NOW()),
('J40', 'Bronquitis, no especificada como aguda o crónica', (SELECT id FROM diagnosis_categories WHERE code = 'J00-J99'), 'Inflamación de los bronquios', 'moderate', false, false, 'Neumología', true, NOW(), NOW()),
('J44', 'Otras enfermedades pulmonares obstructivas crónicas', (SELECT id FROM diagnosis_categories WHERE code = 'J00-J99'), 'Enfermedad pulmonar obstructiva', 'severe', true, false, 'Neumología', true, NOW(), NOW()),
('J45', 'Asma', (SELECT id FROM diagnosis_categories WHERE code = 'J00-J99'), 'Enfermedad inflamatoria de las vías respiratorias', 'moderate', true, false, 'Neumología', true, NOW(), NOW()),

-- K00-K93: Enfermedades del sistema digestivo
('K21', 'Enfermedad por reflujo gastroesofágico', (SELECT id FROM diagnosis_categories WHERE code = 'K00-K93'), 'Reflujo ácido', 'moderate', true, false, 'Gastroenterología', true, NOW(), NOW()),
('K25', 'Úlcera gástrica', (SELECT id FROM diagnosis_categories WHERE code = 'K00-K93'), 'Lesión en el estómago', 'severe', false, false, 'Gastroenterología', true, NOW(), NOW()),
('K29', 'Gastritis y duodenitis', (SELECT id FROM diagnosis_categories WHERE code = 'K00-K93'), 'Inflamación del estómago', 'moderate', false, false, 'Gastroenterología', true, NOW(), NOW()),
('K35', 'Apendicitis aguda', (SELECT id FROM diagnosis_categories WHERE code = 'K00-K93'), 'Inflamación del apéndice', 'severe', false, false, 'Cirugía General', true, NOW(), NOW()),
('K40', 'Hernia inguinal', (SELECT id FROM diagnosis_categories WHERE code = 'K00-K93'), 'Protrusión intestinal', 'moderate', false, false, 'Cirugía General', true, NOW(), NOW()),
('K59', 'Otros trastornos funcionales del intestino', (SELECT id FROM diagnosis_categories WHERE code = 'K00-K93'), 'Trastornos intestinales', 'mild', false, false, 'Gastroenterología', true, NOW(), NOW()),
('K80', 'Colelitiasis', (SELECT id FROM diagnosis_categories WHERE code = 'K00-K93'), 'Cálculos en la vesícula', 'moderate', false, false, 'Gastroenterología', true, NOW(), NOW()),

-- L00-L99: Enfermedades de la piel
('L30', 'Dermatitis, no especificada', (SELECT id FROM diagnosis_categories WHERE code = 'L00-L99'), 'Inflamación de la piel', 'mild', false, false, 'Dermatología', true, NOW(), NOW()),
('L50', 'Urticaria', (SELECT id FROM diagnosis_categories WHERE code = 'L00-L99'), 'Reacción alérgica cutánea', 'mild', false, false, 'Dermatología', true, NOW(), NOW()),
('L70', 'Acné', (SELECT id FROM diagnosis_categories WHERE code = 'L00-L99'), 'Trastorno de las glándulas sebáceas', 'mild', false, false, 'Dermatología', true, NOW(), NOW()),
('L93', 'Lupus eritematoso', (SELECT id FROM diagnosis_categories WHERE code = 'L00-L99'), 'Enfermedad autoinmune', 'severe', true, false, 'Reumatología', true, NOW(), NOW()),

-- M00-M99: Enfermedades osteomusculares
('M05', 'Artritis reumatoide seropositiva', (SELECT id FROM diagnosis_categories WHERE code = 'M00-M99'), 'Enfermedad articular inflamatoria', 'severe', true, false, 'Reumatología', true, NOW(), NOW()),
('M19', 'Artrosis, no especificada', (SELECT id FROM diagnosis_categories WHERE code = 'M00-M99'), 'Degeneración articular', 'moderate', true, false, 'Reumatología', true, NOW(), NOW()),
('M25', 'Otros trastornos articulares, no clasificados en otra parte', (SELECT id FROM diagnosis_categories WHERE code = 'M00-M99'), 'Trastornos articulares', 'moderate', false, false, 'Reumatología', true, NOW(), NOW()),
('M79', 'Otros trastornos de los tejidos blandos, no clasificados en otra parte', (SELECT id FROM diagnosis_categories WHERE code = 'M00-M99'), 'Trastornos musculares', 'moderate', false, false, 'Reumatología', true, NOW(), NOW()),

-- N00-N99: Enfermedades del sistema genitourinario
('N18', 'Enfermedad renal crónica', (SELECT id FROM diagnosis_categories WHERE code = 'N00-N99'), 'Fallencia renal progresiva', 'severe', true, false, 'Nefrología', true, NOW(), NOW()),
('N20', 'Cálculos del riñón y del uréter', (SELECT id FROM diagnosis_categories WHERE code = 'N00-N99'), 'Cálculos renales', 'severe', false, false, 'Urología', true, NOW(), NOW()),
('N30', 'Cistitis', (SELECT id FROM diagnosis_categories WHERE code = 'N00-N99'), 'Inflamación de la vejiga', 'moderate', false, false, 'Urología', true, NOW(), NOW()),
('N39', 'Otros trastornos del sistema urinario', (SELECT id FROM diagnosis_categories WHERE code = 'N00-N99'), 'Trastornos urinarios', 'moderate', false, false, 'Urología', true, NOW(), NOW()),
('N40', 'Hiperplasia de la próstata', (SELECT id FROM diagnosis_categories WHERE code = 'N00-N99'), 'Agrandamiento prostático', 'moderate', true, false, 'Urología', true, NOW(), NOW()),
('N80', 'Endometriosis', (SELECT id FROM diagnosis_categories WHERE code = 'N00-N99'), 'Tejido endometrial fuera del útero', 'moderate', true, false, 'Ginecología y Obstetricia', true, NOW(), NOW()),

-- R00-R94: Síntomas y signos
('R06', 'Anormalidades de la respiración', (SELECT id FROM diagnosis_categories WHERE code = 'R00-R94'), 'Trastornos respiratorios', 'moderate', false, false, 'Neumología', true, NOW(), NOW()),
('R10', 'Dolor abdominal y pélvico', (SELECT id FROM diagnosis_categories WHERE code = 'R00-R94'), 'Dolor en el abdomen', 'moderate', false, false, 'Gastroenterología', true, NOW(), NOW()),
('R50', 'Fiebre de origen desconocido', (SELECT id FROM diagnosis_categories WHERE code = 'R00-R94'), 'Fiebre sin causa aparente', 'moderate', false, false, 'Medicina Interna', true, NOW(), NOW()),
('R51', 'Cefalea', (SELECT id FROM diagnosis_categories WHERE code = 'R00-R94'), 'Dolor de cabeza', 'mild', false, false, 'Neurología', true, NOW(), NOW())
ON CONFLICT (code) DO NOTHING;
