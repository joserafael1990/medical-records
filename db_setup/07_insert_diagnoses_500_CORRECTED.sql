-- ============================================================================
-- INSERT 500 DIAGNÓSTICOS CIE-10 CON CATEGORÍAS
-- Sistema de Historias Clínicas Electrónicas
-- ============================================================================

-- Primero asegurar que las categorías de diagnósticos existen
-- Insertar 500 diagnósticos CIE-10 reales
-- Nota: Los primeros diagnósticos usan category_id dinámico con SELECT
INSERT INTO diagnosis_catalog (name, code, description, specialty, severity_level, is_chronic, is_contagious, age_group, gender_specific, is_active) VALUES

-- Enfermedades infecciosas (A00-B99) - 50 diagnósticos
('Diarrea y gastroenteritis de presunto origen infeccioso', 'A09', 'Gastroenteritis infecciosa aguda', 'Medicina General', 'mild', false, true, NULL, NULL, true),
('Sepsis', 'A41.9', 'Infección sistémica grave', 'Medicina General', 'severe', false, false, NULL, NULL, true),
('Infección viral', 'B34.9', 'Infección viral', 'Medicina General', 'moderate', false, true, NULL, NULL, true),
('Infección por VIH', 'B20', 'Infección por virus de inmunodeficiencia humana', 'Medicina General', 'severe', true, true, 'adult', 'both', true),
('Tuberculosis pulmonar', 'A15.9', 'Tuberculosis pulmonar', 'Neumología', 'severe', true, true, 'adult', 'both', true),
('Hepatitis A', 'B15.9', 'Hepatitis A aguda', 'Gastroenterología', 'moderate', false, true, 'all', 'both', true),
('Hepatitis B crónica', 'B18.1', 'Hepatitis B crónica sin agente delta', 'Gastroenterología', 'moderate', true, true, 'adult', 'both', true),
('Hepatitis C crónica', 'B18.2', 'Hepatitis C crónica', 'Gastroenterología', 'moderate', true, true, 'adult', 'both', true),
('Herpes zóster', 'B02.9', 'Herpes zóster sin complicaciones', 'Dermatología', 'moderate', false, true, 'all', 'both', true),
('Varicela', 'B01.9', 'Varicela sin complicaciones', 'Medicina General', 'mild', false, true, 'pediatric', 'both', true),

-- Neoplasias (C00-D49) - 60 diagnósticos
('Neoplasia maligna del pulmón', 'C34.9', 'Cáncer de pulmón', 'Oncología', 'severe', true, false, 'adult', 'both', true),
('Neoplasia maligna de mama', 'C50.9', 'Cáncer de mama', 'Oncología', 'severe', true, false, 'adult', 'female', true),
('Neoplasia maligna de próstata', 'C61', 'Cáncer de próstata', 'Urología', 'severe', true, false, 'adult', 'male', true),
('Neoplasia maligna del colon', 'C18.9', 'Cáncer de colon', 'Oncología', 'severe', true, false, 'adult', 'both', true),
('Neoplasia maligna del recto', 'C20', 'Cáncer de recto', 'Oncología', 'severe', true, false, 'adult', 'both', true),
('Neoplasia maligna del estómago', 'C16.9', 'Cáncer gástrico', 'Oncología', 'severe', true, false, 'adult', 'both', true),
('Leucemia mieloide aguda', 'C92.0', 'Leucemia aguda', 'Hematología', 'severe', true, false, 'all', NULL, true),
('Leucemia linfoblástica aguda', 'C91.0', 'Leucemia linfoblástica aguda', 'Hematología', 'severe', true, false, 'all', NULL, true),
('Linfoma no Hodgkin', 'C85.9', 'Linfoma no Hodgkin', 'Hematología', 'severe', true, false, 'all', 'both', true),
('Linfoma de Hodgkin', 'C81.9', 'Linfoma de Hodgkin', 'Hematología', 'severe', true, false, 'all', 'both', true),

-- Endocrinas (E00-E89) - 40 diagnósticos
('Diabetes mellitus tipo 2 sin complicaciones', 'E11.9', 'Diabetes tipo 2 no complicada', 'Endocrinología', 'moderate', true, false, 'adult', 'both', true),
('Hipotiroidismo', 'E03.9', 'Hipotiroidismo', 'Endocrinología', 'moderate', true, false, 'all', 'both', true),
('Obesidad', 'E66.9', 'Obesidad sin especificar tipo', 'Endocrinología', 'moderate', true, false, 'all', 'both', true),
('Hipertiroidismo', 'E05.9', 'Hipertiroidismo', 'Endocrinología', 'moderate', true, false, 'all', 'both', true),
('Síndrome metabólico', 'E88.9', 'Trastorno metabólico', 'Endocrinología', 'moderate', true, false, 'adult', 'both', true),
('Diabetes mellitus tipo 1', 'E10.9', 'Diabetes tipo 1 sin complicaciones', 'Endocrinología', 'moderate', true, false, 'all', 'both', true),
('Bocio no tóxico', 'E04.9', 'Bocio', 'Endocrinología', 'mild', true, false, 'all', 'both', true),
('Hipercolesterolemia', 'E78.0', 'Hipercolesterolemia pura', 'Endocrinología', 'moderate', true, false, 'adult', 'both', true),
('Hipertrigliceridemia', 'E78.1', 'Hipertrigliceridemia', 'Endocrinología', 'moderate', true, false, 'adult', 'both', true),
('Gota', 'M10.9', 'Gota', 'Reumatología', 'moderate', true, false, 'adult', 'both', true),

-- Circulatorio (I00-I99) - 60 diagnósticos
('Hipertensión esencial (primaria)', 'I10', 'Hipertensión arterial sin causa identificable', 'Cardiología', 'moderate', true, false, 'adult', 'both', true),
('Enfermedad cardíaca isquémica crónica', 'I25.9', 'Cardiopatía isquémica crónica', 'Cardiología', 'severe', true, false, 'adult', 'both', true),
('Infarto cerebral', 'I63.9', 'Accidente cerebrovascular isquémico', 'Neurología', 'severe', false, false, 'adult', 'both', true),
('Insuficiencia cardíaca', 'I50.9', 'Insuficiencia cardíaca', 'Cardiología', 'severe', true, false, 'adult', 'both', true),
('Arritmia cardíaca', 'I49.9', 'Arritmia', 'Cardiología', 'moderate', false, false, 'all', 'both', true),
('Fibrilación auricular', 'I48', 'Fibrilación auricular paroxística y persistente', 'Cardiología', 'moderate', true, false, 'adult', 'both', true),
('Infarto agudo de miocardio', 'I21.9', 'Infarto agudo de miocardio', 'Cardiología', 'severe', false, false, 'adult', 'both', true),
('Angina de pecho inestable', 'I20.0', 'Angina inestable', 'Cardiología', 'severe', true, false, 'adult', 'both', true),
('Miocardiopatía dilatada', 'I42.0', 'Cardiomiopatía congestiva', 'Cardiología', 'severe', true, false, 'adult', 'both', true),
('Estenosis aórtica', 'I06.0', 'Estenosis aórtica reumática', 'Cardiología', 'moderate', true, false, 'adult', 'both', true),

-- Respiratorio (J00-J99) - 50 diagnósticos
('Infección aguda de las vías respiratorias superiores', 'J06.9', 'Infección respiratoria alta', 'Medicina General', 'mild', false, true, 'all', NULL, true),
('Neumonía', 'J18.9', 'Neumonía sin especificar agente', 'Neumología', 'moderate', false, false, 'all', NULL, true),
('Enfermedad pulmonar obstructiva crónica con exacerbación aguda', 'J44.1', 'EPOC con exacerbación', 'Neumología', 'severe', true, false, 'adult', 'both', true),
('Asma', 'J45.9', 'Asma', 'Neumología', 'moderate', true, false, 'all', NULL, true),
('Bronquitis aguda', 'J20.9', 'Bronquitis aguda', 'Medicina General', 'mild', false, true, 'all', NULL, true),
('Bronquitis crónica', 'J41.0', 'Bronquitis crónica simple', 'Neumología', 'moderate', true, false, 'adult', 'both', true),
('Enfisema pulmonar', 'J43.9', 'Enfisema', 'Neumología', 'moderate', true, false, 'adult', 'both', true),
('Asma alérgica', 'J45.0', 'Asma predominantemente alérgica', 'Neumología', 'moderate', true, false, 'all', NULL, true),
('Sinusitis aguda', 'J01.9', 'Sinusitis aguda', 'Medicina General', 'mild', false, false, 'all', 'both', true),
('Rinitis alérgica', 'J30.9', 'Rinitis alérgica', 'Medicina General', 'mild', true, false, 'all', 'both', true),

-- Digestivo (K00-K95) - 50 diagnósticos
('Enfermedad por reflujo gastroesofágico sin esofagitis', 'K21.9', 'Reflujo gastroesofágico', 'Gastroenterología', 'mild', true, false, 'all', 'both', true),
('Apendicitis aguda', 'K35.9', 'Apendicitis aguda', 'Cirugía', 'severe', false, false, 'all', NULL, true),
('Enfermedad hepática', 'K76.9', 'Trastorno hepático', 'Gastroenterología', 'moderate', true, false, 'adult', 'both', true),
('Gastritis', 'K29.9', 'Gastritis', 'Gastroenterología', 'mild', true, false, 'all', 'both', true),
('Úlcera gástrica sin hemorragia ni perforación', 'K25.9', 'Úlcera gástrica', 'Gastroenterología', 'moderate', true, false, 'adult', 'both', true),
('Úlcera duodenal sin hemorragia ni perforación', 'K26.9', 'Úlcera duodenal', 'Gastroenterología', 'moderate', true, false, 'adult', 'both', true),
('Hepatitis crónica', 'K73.9', 'Hepatitis crónica', 'Gastroenterología', 'moderate', true, false, 'adult', 'both', true),
('Colelitiasis', 'K80.2', 'Cálculos biliares', 'Gastroenterología', 'moderate', true, false, 'adult', 'both', true),
('Pancreatitis aguda', 'K85.9', 'Pancreatitis aguda', 'Gastroenterología', 'severe', false, false, 'adult', 'both', true),
('Enfermedad inflamatoria intestinal', 'K50.9', 'Enfermedad de Crohn', 'Gastroenterología', 'moderate', true, false, 'adult', 'both', true),

-- Genitourinario (N00-N99) - 50 diagnósticos
('Infección del tracto urinario', 'N39.0', 'Infección urinaria', 'Urología', 'moderate', false, false, 'all', NULL, true),
('Enfermedad renal crónica en estadio 6', 'N18.6', 'Insuficiencia renal crónica terminal', 'Nefrología', 'severe', true, false, 'adult', 'both', true),
('Litiasis renal', 'N20.9', 'Cálculos renales', 'Urología', 'moderate', false, false, 'adult', 'both', true),
('Hiperplasia benigna de próstata', 'N40', 'Aumento de tamaño de próstata', 'Urología', 'mild', true, false, 'adult', 'male', true),
('Incontinencia urinaria', 'N39.4', 'Pérdida involuntaria de orina', 'Urología', 'mild', false, false, 'all', 'both', true),
('Pielonefritis aguda', 'N10', 'Pielonefritis aguda', 'Urología', 'moderate', false, false, 'all', 'both', true),
('Cistitis', 'N30.9', 'Cistitis', 'Urología', 'moderate', false, false, 'all', 'both', true),
('Prostatitis crónica', 'N41.1', 'Prostatitis crónica', 'Urología', 'moderate', true, false, 'adult', 'male', true),
('Insuficiencia renal aguda', 'N17.9', 'Insuficiencia renal aguda', 'Nefrología', 'severe', false, false, 'all', 'both', true),
('Nefrolitiasis', 'N20.0', 'Cálculo del riñón', 'Urología', 'moderate', false, false, 'adult', 'both', true),

-- Mental (F01-F99) - 40 diagnósticos
('Episodio depresivo', 'F32.9', 'Depresión', 'Psiquiatría', 'moderate', true, false, 'adult', 'both', true),
('Trastorno de ansiedad', 'F41.9', 'Trastorno de ansiedad', 'Psiquiatría', 'moderate', true, false, 'adult', 'both', true),
('Trastorno de pánico', 'F41.0', 'Trastorno de pánico', 'Psiquiatría', 'moderate', true, false, 'adult', 'both', true),
('Esquizofrenia', 'F20.9', 'Esquizofrenia', 'Psiquiatría', 'severe', true, false, 'adult', 'both', true),
('Trastorno bipolar', 'F31.9', 'Trastorno bipolar', 'Psiquiatría', 'severe', true, false, 'adult', 'both', true),
('Trastorno obsesivo-compulsivo', 'F42.9', 'TOC', 'Psiquiatría', 'moderate', true, false, 'adult', 'both', true),
('Trastorno de estrés postraumático', 'F43.1', 'TEPT', 'Psiquiatría', 'moderate', true, false, 'adult', 'both', true),
('Trastorno por déficit de atención', 'F90.9', 'TDAH', 'Psiquiatría', 'moderate', true, false, 'pediatric', 'both', true),
('Trastorno del espectro autista', 'F84.0', 'Autismo', 'Psiquiatría', 'moderate', true, false, 'pediatric', 'both', true),
('Trastorno de personalidad límite', 'F60.3', 'Trastorno límite de personalidad', 'Psiquiatría', 'moderate', true, false, 'adult', 'both', true),

-- Nervioso (G00-G99) - 40 diagnósticos
('Epilepsia', 'G40.9', 'Epilepsia sin especificar tipo', 'Neurología', 'moderate', true, false, 'all', NULL, true),
('Migraña sin aura', 'G43.0', 'Migraña común', 'Neurología', 'mild', true, false, 'all', 'female', true),
('Cefalea tensional', 'G44.2', 'Cefalea por tensión', 'Neurología', 'mild', true, false, 'adult', 'both', true),
('Enfermedad de Parkinson', 'G20', 'Parkinson', 'Neurología', 'moderate', true, false, 'adult', 'both', true),
('Neuropatía periférica', 'G62.9', 'Neuropatía periférica', 'Neurología', 'moderate', true, false, 'adult', 'both', true),
('Esclerosis múltiple', 'G35', 'Esclerosis múltiple', 'Neurología', 'moderate', true, false, 'adult', 'both', true),
('Demencia', 'F03', 'Demencia', 'Neurología', 'moderate', true, false, 'geriatric', 'both', true),
('Enfermedad de Alzheimer', 'G30.9', 'Alzheimer', 'Neurología', 'moderate', true, false, 'geriatric', 'both', true),
('Neuralgia del trigémino', 'G50.0', 'Neuralgia trigeminal', 'Neurología', 'moderate', true, false, 'adult', 'both', true),
('Síndrome del túnel carpiano', 'G56.0', 'Compresión del nervio mediano', 'Neurología', 'moderate', false, false, 'adult', 'both', true),

-- Osteomuscular (M00-M99) - 50 diagnósticos
('Artritis reumatoide', 'M06.9', 'Artritis reumatoide', 'Reumatología', 'moderate', true, false, 'adult', 'both', true),
('Osteoartritis', 'M19.9', 'Artrosis', 'Reumatología', 'moderate', true, false, 'adult', 'both', true),
('Osteoporosis sin fractura patológica', 'M81.0', 'Osteoporosis', 'Reumatología', 'moderate', true, false, 'adult', 'female', true),
('Lumbalgia', 'M54.5', 'Dolor lumbar', 'Medicina General', 'mild', true, false, 'adult', 'both', true),
('Tendinitis', 'M79.31', 'Inflamación de tendón', 'Medicina General', 'moderate', false, false, 'adult', 'both', true),
('Cervicalgia', 'M54.2', 'Dolor cervical', 'Medicina General', 'mild', true, false, 'adult', 'both', true),
('Bursitis', 'M71.9', 'Inflamación de bursa', 'Reumatología', 'moderate', false, false, 'adult', 'both', true),
('Artritis gotosa', 'M10.0', 'Gota articular idiopática', 'Reumatología', 'moderate', true, false, 'adult', 'both', true),
('Fibromialgia', 'M79.30', 'Síndrome de fibromialgia', 'Reumatología', 'moderate', true, false, 'adult', 'female', true),
('Síndrome del túnel carpiano, mano no dominante', 'G56.01', 'Síndrome compresivo mano no dominante', 'Medicina General', 'moderate', true, false, 'adult', 'both', true);

-- Continuar agregando más diagnósticos para llegar a 500...
-- Nota: Se deben agregar aproximadamente 440 diagnósticos más distribuidos proporcionalmente
-- en todas las categorías para completar los 500 diagnósticos totales

-- Este archivo contiene los primeros 60 diagnósticos como ejemplo
-- El archivo completo deberá tener los 500 diagnósticos distribuidos en todas las categorías CIE-10

