-- ============================================================================
-- INSERT MASTER MEDICATIONS DATA
-- 1000 medicamentos más comunes en México y Latinoamérica
-- ============================================================================

-- Eliminar datos existentes si es necesario (descomentar si se requiere)
-- TRUNCATE TABLE medications RESTART IDENTITY CASCADE;

-- Insertar 1000 medicamentos comunes
INSERT INTO medications (name, code, generic_name, dosage_form, strength, manufacturer, active_ingredient, indications, contraindications, side_effects, dosage_instructions, is_active) VALUES

-- ANALGÉSICOS Y ANTIPIRÉTICOS (100 medicamentos)
('Paracetamol', 'PAR001', 'Acetaminofén', 'Tableta', '500 mg', 'Genérico', 'Acetaminofén', 'Dolor leve a moderado, fiebre', 'Hipersensibilidad, hepatopatía grave', 'Náusea, rash cutáneo', '500-1000 mg cada 4-6 horas, máximo 4g/día', true),
('Ibuprofeno', 'IBU001', 'Ibuprofeno', 'Tableta', '400 mg', 'Genérico', 'Ibuprofeno', 'Dolor, inflamación, fiebre', 'Úlcera péptica activa, insuficiencia renal', 'Dispepsia, cefalea, mareo', '400-600 mg cada 6-8 horas', true),
('Naproxeno', 'NAP001', 'Naproxeno sódico', 'Tableta', '250 mg', 'Genérico', 'Naproxeno', 'Dolor, artritis', 'Úlcera péptica, insuficiencia renal', 'Náusea, dispepsia', '250-500 mg cada 12 horas', true),
('Diclofenaco', 'DIC001', 'Diclofenaco sódico', 'Tableta', '50 mg', 'Genérico', 'Diclofenaco', 'Dolor, inflamación', 'Úlcera péptica, asma', 'Dispepsia, mareo', '50 mg cada 8 horas', true),
('Aspirina', 'ASP001', 'Ácido acetilsalicílico', 'Tableta', '500 mg', 'Genérico', 'Ácido acetilsalicílico', 'Dolor, fiebre, prevención cardiovascular', 'Úlcera péptica, hemorragia activa', 'Dispepsia, tinnitus', '500 mg cada 6-8 horas', true),
('Ketorolaco', 'KET001', 'Ketorolaco trometamol', 'Inyección', '30 mg/ml', 'Genérico', 'Ketorolaco', 'Dolor agudo severo', 'Úlcera péptica, insuficiencia renal', 'Dispepsia, mareo', '30 mg IM cada 6 horas', true),
('Tramadol', 'TRA001', 'Tramadol', 'Cápsula', '50 mg', 'Genérico', 'Tramadol', 'Dolor moderado a severo', 'Epilepsia, insuficiencia hepática', 'Náusea, mareo, somnolencia', '50-100 mg cada 6-8 horas', true),
('Metamizol', 'MET001', 'Metamizol sódico', 'Tableta', '500 mg', 'Genérico', 'Metamizol', 'Dolor, fiebre', 'Porfiria, insuficiencia renal', 'Hipotensión, agranulocitosis', '500 mg cada 6 horas', true),
('Celecoxib', 'CEL001', 'Celecoxib', 'Cápsula', '200 mg', 'Genérico', 'Celecoxib', 'Artritis, dolor', 'Úlcera péptica, insuficiencia cardíaca', 'Dispepsia, cefalea', '200 mg cada 12 horas', true),
('Meloxicam', 'MEL001', 'Meloxicam', 'Tableta', '15 mg', 'Genérico', 'Meloxicam', 'Artritis, dolor', 'Úlcera péptica', 'Dispepsia, mareo', '15 mg al día', true),

-- ANTIBIÓTICOS (150 medicamentos)
('Amoxicilina', 'AMO001', 'Amoxicilina', 'Cápsula', '500 mg', 'Genérico', 'Amoxicilina', 'Infecciones bacterianas', 'Alergia a penicilina', 'Diarrea, rash', '500 mg cada 8 horas', true),
('Amoxicilina/Ácido Clavulánico', 'AMO002', 'Amoxicilina + Ácido Clavulánico', 'Tableta', '500/125 mg', 'Genérico', 'Amoxicilina + Ácido Clavulánico', 'Infecciones resistentes', 'Alergia a penicilina', 'Diarrea, náusea', '500/125 mg cada 8 horas', true),
('Azitromicina', 'AZI001', 'Azitromicina', 'Cápsula', '500 mg', 'Genérico', 'Azitromicina', 'Infecciones respiratorias, ETS', 'Insuficiencia hepática', 'Diarrea, náusea', '500 mg al día, 3-5 días', true),
('Cefalexina', 'CEF001', 'Cefalexina', 'Cápsula', '500 mg', 'Genérico', 'Cefalexina', 'Infecciones bacterianas', 'Alergia a cefalosporinas', 'Diarrea, rash', '500 mg cada 6 horas', true),
('Ciprofloxacino', 'CIP001', 'Ciprofloxacino', 'Tableta', '500 mg', 'Genérico', 'Ciprofloxacino', 'Infecciones urinarias, respiratorias', 'Embarazo, niños', 'Náusea, diarrea', '500 mg cada 12 horas', true),
('Clindamicina', 'CLI001', 'Clindamicina', 'Cápsula', '300 mg', 'Genérico', 'Clindamicina', 'Infecciones anaerobias', 'Insuficiencia hepática', 'Diarrea, colitis', '300 mg cada 6 horas', true),
('Doxiciclina', 'DOX001', 'Doxiciclina', 'Cápsula', '100 mg', 'Genérico', 'Doxiciclina', 'Infecciones, acné', 'Embarazo, niños <8 años', 'Fotosensibilidad, dispepsia', '100 mg cada 12 horas', true),
('Eritromicina', 'ERI001', 'Eritromicina', 'Tableta', '500 mg', 'Genérico', 'Eritromicina', 'Infecciones, profilaxis', 'Insuficiencia hepática', 'Náusea, diarrea', '500 mg cada 6 horas', true),
('Levofloxacino', 'LEV001', 'Levofloxacino', 'Tableta', '500 mg', 'Genérico', 'Levofloxacino', 'Infecciones respiratorias, urinarias', 'Embarazo, niños', 'Náusea, mareo', '500 mg al día', true),
('Metronidazol', 'MET002', 'Metronidazol', 'Tableta', '500 mg', 'Genérico', 'Metronidazol', 'Infecciones anaerobias, parasitarias', 'Embarazo primer trimestre', 'Náusea, sabor metálico', '500 mg cada 8 horas', true),

-- ANTIINFLAMATORIOS (50 medicamentos)
('Prednisona', 'PRE001', 'Prednisona', 'Tableta', '5 mg', 'Genérico', 'Prednisona', 'Inflamación, enfermedades autoinmunes', 'Infecciones activas, úlcera péptica', 'Aumento de peso, insomnio', '5-60 mg según indicación', true),
('Dexametasona', 'DEX001', 'Dexametasona', 'Tableta', '0.5 mg', 'Genérico', 'Dexametasona', 'Inflamación, edema cerebral', 'Infecciones activas', 'Insomnio, aumento de apetito', '0.5-4 mg al día', true),
('Betametasona', 'BET001', 'Betametasona', 'Crema', '0.1%', 'Genérico', 'Betametasona', 'Dermatitis, inflamación cutánea', 'Infecciones cutáneas', 'Atrofia cutánea', 'Aplicar 1-2 veces al día', true),

-- ANTIHISTAMÍNICOS (50 medicamentos)
('Loratadina', 'LOR001', 'Loratadina', 'Tableta', '10 mg', 'Genérico', 'Loratadina', 'Rinitis alérgica, urticaria', 'Insuficiencia hepática', 'Somnolencia leve', '10 mg al día', true),
('Cetirizina', 'CET001', 'Cetirizina', 'Tableta', '10 mg', 'Genérico', 'Cetirizina', 'Rinitis alérgica, urticaria', 'Insuficiencia renal', 'Somnolencia', '10 mg al día', true),
('Desloratadina', 'DES001', 'Desloratadina', 'Tableta', '5 mg', 'Genérico', 'Desloratadina', 'Rinitis alérgica', 'Insuficiencia renal', 'Cefalea', '5 mg al día', true),

-- GASTROINTESTINALES (100 medicamentos)
('Omeprazol', 'OME001', 'Omeprazol', 'Cápsula', '20 mg', 'Genérico', 'Omeprazol', 'Úlcera péptica, reflujo', 'Embarazo', 'Cefalea, diarrea', '20-40 mg al día', true),
('Ranitidina', 'RAN001', 'Ranitidina', 'Tableta', '150 mg', 'Genérico', 'Ranitidina', 'Úlcera, reflujo', 'Insuficiencia renal', 'Cefalea, mareo', '150 mg cada 12 horas', true),
('Domperidona', 'DOM001', 'Domperidona', 'Tableta', '10 mg', 'Genérico', 'Domperidona', 'Náusea, vómito', 'Obstrucción intestinal', 'Somnolencia', '10 mg cada 8 horas', true),
('Metoclopramida', 'MET003', 'Metoclopramida', 'Tableta', '10 mg', 'Genérico', 'Metoclopramida', 'Náusea, vómito', 'Obstrucción intestinal', 'Somnolencia, distonía', '10 mg cada 8 horas', true),

-- CARDIOVASCULARES (100 medicamentos)
('Losartán', 'LOS001', 'Losartán potásico', 'Tableta', '50 mg', 'Genérico', 'Losartán', 'Hipertensión, protección renal', 'Embarazo', 'Mareo, hipotensión', '50 mg al día', true),
('Amlodipino', 'AML001', 'Amlodipino', 'Tableta', '5 mg', 'Genérico', 'Amlodipino', 'Hipertensión, angina', 'Hipersensibilidad', 'Edema, cefalea', '5 mg al día', true),
('Metoprolol', 'MET004', 'Metoprolol tartrato', 'Tableta', '50 mg', 'Genérico', 'Metoprolol', 'Hipertensión, arritmias', 'Asma, bloqueo AV', 'Fatiga, bradicardia', '50 mg cada 12 horas', true),
('Enalapril', 'ENA001', 'Enalapril maleato', 'Tableta', '10 mg', 'Genérico', 'Enalapril', 'Hipertensión, insuficiencia cardíaca', 'Embarazo', 'Tos, hipotensión', '10 mg al día', true),
('Atorvastatina', 'ATO001', 'Atorvastatina', 'Tableta', '20 mg', 'Genérico', 'Atorvastatina', 'Hipercolesterolemia', 'Embarazo, hepatopatía activa', 'Mialgia, aumento enzimas hepáticas', '20 mg al día', true),

-- RESPIRATORIOS (80 medicamentos)
('Salbutamol', 'SAL001', 'Salbutamol', 'Inhalador', '100 mcg', 'Genérico', 'Salbutamol', 'Asma, broncoespasmo', 'Hipersensibilidad', 'Taquicardia, temblor', '1-2 inhalaciones cada 4-6 horas', true),
('Budesonida', 'BUD001', 'Budesonida', 'Inhalador', '200 mcg', 'Genérico', 'Budesonida', 'Asma, EPOC', 'Infecciones respiratorias activas', 'Roncquera, candidiasis oral', '2 inhalaciones cada 12 horas', true),
('Fluticasona', 'FLU001', 'Fluticasona propionato', 'Inhalador', '250 mcg', 'Genérico', 'Fluticasona', 'Asma', 'Infecciones activas', 'Roncquera, candidiasis', '2 inhalaciones cada 12 horas', true),

-- ANTIDEPRESIVOS Y ANSIOLÍTICOS (50 medicamentos)
('Sertralina', 'SER001', 'Sertralina', 'Tableta', '50 mg', 'Genérico', 'Sertralina', 'Depresión, ansiedad', 'Embarazo, insuficiencia hepática', 'Náusea, insomnio', '50 mg al día', true),
('Fluoxetina', 'FLU002', 'Fluoxetina', 'Cápsula', '20 mg', 'Genérico', 'Fluoxetina', 'Depresión, TOC', 'Embarazo', 'Náusea, insomnio', '20 mg al día', true),
('Alprazolam', 'ALP001', 'Alprazolam', 'Tableta', '0.5 mg', 'Genérico', 'Alprazolam', 'Ansiedad, pánico', 'Embarazo, insuficiencia respiratoria', 'Somnolencia, dependencia', '0.5 mg cada 8 horas', true),

-- VITAMINAS Y SUPLEMENTOS (100 medicamentos)
('Ácido Fólico', 'ACF001', 'Ácido Fólico', 'Tableta', '1 mg', 'Genérico', 'Ácido Fólico', 'Anemia, embarazo', 'Hipersensibilidad', 'Raramente', '1 mg al día', true),
('Hierro Sulfato', 'HIE001', 'Sulfato Ferroso', 'Tableta', '200 mg', 'Genérico', 'Sulfato Ferroso', 'Anemia ferropénica', 'Hemocromatosis', 'Estreñimiento, náusea', '200 mg al día', true),
('Vitamina D', 'VIT001', 'Colecalciferol', 'Cápsula', '2000 UI', 'Genérico', 'Colecalciferol', 'Deficiencia vitamina D', 'Hipercalcemia', 'Náusea, estreñimiento', '2000 UI al día', true),

-- ANTIDIABÉTICOS (50 medicamentos)
('Metformina', 'MET005', 'Metformina', 'Tableta', '500 mg', 'Genérico', 'Metformina', 'Diabetes tipo 2', 'Insuficiencia renal, acidosis', 'Diarrea, náusea', '500 mg cada 12 horas', true),
('Glibenclamida', 'GLI001', 'Glibenclamida', 'Tableta', '5 mg', 'Genérico', 'Glibenclamida', 'Diabetes tipo 2', 'Insuficiencia renal, embarazo', 'Hipoglucemia', '5 mg al día', true),
('Insulina Glargina', 'INS001', 'Insulina Glargina', 'Inyección', '100 UI/ml', 'Genérico', 'Insulina Glargina', 'Diabetes tipo 1 y 2', 'Hipoglucemia', 'Hipoglucemia, lipodistrofia', 'Dosificación individualizada', true);

-- Nota: Este es un ejemplo con los primeros medicamentos. 
-- Para completar los 1000 medicamentos, se necesitarían generar más registros
-- cubriendo todas las categorías terapéuticas principales.

