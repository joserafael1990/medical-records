-- Insertar estudios clínicos adicionales según normativa mexicana
-- Basado en NOM-220-SSA1-2016 y otras normativas vigentes
-- Enfoque en estudios comunes y especialidades de Ginecología y Pediatría

-- Insertar nuevas categorías de estudios (solo si no existen)
INSERT INTO study_categories (code, name, description) VALUES
('CIT', 'Citología y Patología', 'Estudios citológicos y anatomopatológicos'),
('ESC', 'Endoscopía', 'Estudios endoscópicos diagnósticos y terapéuticos'),
('MET', 'Metabolismo y Tamiz Neonatal', 'Estudios metabólicos y tamiz neonatal')
ON CONFLICT (code) DO NOTHING;

-- Insertar estudios de laboratorio clínico comunes
INSERT INTO study_catalog (code, name, category_id, subcategory, description, preparation, methodology, duration_hours, specialty) VALUES
-- Estudios de Laboratorio Comunes
('LAB011', 'Perfil Hepático Completo', 1, 'Química Sanguínea', 'AST, ALT, bilirrubina total y directa, fosfatasa alcalina, GGT, proteínas totales, albúmina', 'Ayuno de 8 horas', 'Espectrofotometría', 4, 'Medicina General'),
('LAB012', 'Perfil Renal Completo', 1, 'Química Sanguínea', 'Urea, creatinina, ácido úrico, sodio, potasio, cloro, calcio, fósforo', 'Ayuno de 8 horas', 'Espectrofotometría', 4, 'Medicina General'),
('LAB013', 'Perfil Tiroideo Completo', 1, 'Hormonas', 'TSH, T3 libre, T4 libre, anticuerpos anti-tiroideos', 'No requiere ayuno', 'Inmunoensayo', 6, 'Endocrinología'),
('LAB014', 'Hemoglobina Glicosilada (HbA1c)', 1, 'Química Sanguínea', 'Control de diabetes a largo plazo', 'No requiere ayuno', 'Cromatografía líquida', 24, 'Endocrinología'),
('LAB015', 'Proteína C Reactiva (PCR)', 1, 'Marcadores Inflamatorios', 'Marcador de inflamación aguda', 'No requiere ayuno', 'Inmunoensayo', 2, 'Medicina General'),
('LAB016', 'Velocidad de Sedimentación Globular (VSG)', 1, 'Hematología', 'Medición de la velocidad de sedimentación de eritrocitos', 'No requiere ayuno', 'Método de Westergren', 2, 'Medicina General'),
('LAB017', 'Ferritina', 1, 'Marcadores de Hierro', 'Reserva de hierro corporal', 'Ayuno de 8 horas', 'Inmunoensayo', 4, 'Hematología'),
('LAB018', 'Vitamina B12', 1, 'Vitaminas', 'Nivel de vitamina B12 en sangre', 'Ayuno de 8 horas', 'Inmunoensayo', 6, 'Hematología'),
('LAB019', 'Ácido Fólico', 1, 'Vitaminas', 'Nivel de ácido fólico en sangre', 'Ayuno de 8 horas', 'Inmunoensayo', 6, 'Hematología'),
('LAB020', 'Coagulograma Completo', 1, 'Coagulación', 'TP, TTP, fibrinógeno, tiempo de sangrado', 'No requiere ayuno', 'Coagulometría', 4, 'Hematología'),

-- Estudios de Laboratorio para Ginecología
('LAB021', 'Estradiol', 1, 'Hormonas', 'Hormona estrogénica principal', 'No requiere ayuno', 'Inmunoensayo', 6, 'Ginecología'),
('LAB022', 'Progesterona', 1, 'Hormonas', 'Hormona progestacional', 'No requiere ayuno', 'Inmunoensayo', 6, 'Ginecología'),
('LAB023', 'FSH (Hormona Folículo Estimulante)', 1, 'Hormonas', 'Hormona estimulante del folículo', 'No requiere ayuno', 'Inmunoensayo', 6, 'Ginecología'),
('LAB024', 'LH (Hormona Luteinizante)', 1, 'Hormonas', 'Hormona luteinizante', 'No requiere ayuno', 'Inmunoensayo', 6, 'Ginecología'),
('LAB025', 'Prolactina', 1, 'Hormonas', 'Hormona prolactina', 'Ayuno de 8 horas', 'Inmunoensayo', 6, 'Ginecología'),
('LAB026', 'Testosterona Total', 1, 'Hormonas', 'Hormona testosterona total', 'No requiere ayuno', 'Inmunoensayo', 6, 'Ginecología'),
('LAB027', 'DHEA-S', 1, 'Hormonas', 'Sulfato de dehidroepiandrosterona', 'No requiere ayuno', 'Inmunoensayo', 6, 'Ginecología'),
('LAB028', 'AMH (Hormona Antimülleriana)', 1, 'Hormonas', 'Reserva ovárica', 'No requiere ayuno', 'Inmunoensayo', 24, 'Ginecología'),
('LAB029', 'Cortisol', 1, 'Hormonas', 'Hormona del estrés', 'Ayuno de 8 horas', 'Inmunoensayo', 6, 'Endocrinología'),
('LAB030', 'Insulina', 1, 'Hormonas', 'Hormona insulina', 'Ayuno de 8 horas', 'Inmunoensayo', 6, 'Endocrinología'),

-- Estudios de Laboratorio para Pediatría
('LAB031', 'Tamiz Neonatal Básico', 1, 'Tamiz Neonatal', 'Fenilcetonuria, hipotiroidismo congénito, galactosemia', 'No requiere ayuno', 'Espectrometría de masas', 72, 'Pediatría'),
('LAB032', 'Tamiz Neonatal Ampliado', 1, 'Tamiz Neonatal', '40+ enfermedades metabólicas congénitas', 'No requiere ayuno', 'Espectrometría de masas', 72, 'Pediatría'),
('LAB033', 'Bilirrubina Total y Directa', 1, 'Química Sanguínea', 'Evaluación de ictericia neonatal', 'No requiere ayuno', 'Espectrofotometría', 2, 'Pediatría'),
('LAB034', 'Hemoglobina y Hematocrito Pediátrico', 1, 'Hematología', 'Detección de anemia en niños', 'No requiere ayuno', 'Citometría de flujo', 2, 'Pediatría'),
('LAB035', 'Plomo en Sangre', 1, 'Toxicología', 'Detección de intoxicación por plomo', 'No requiere ayuno', 'Espectrometría de absorción atómica', 24, 'Pediatría'),
('LAB036', 'Vitamina D (25-OH)', 1, 'Vitaminas', 'Nivel de vitamina D', 'No requiere ayuno', 'Inmunoensayo', 6, 'Pediatría'),
('LAB037', 'Calcio, Fósforo y Magnesio', 1, 'Química Sanguínea', 'Metabolismo mineral', 'Ayuno de 8 horas', 'Espectrofotometría', 4, 'Pediatría'),
('LAB038', 'Creatinina y Urea Pediátrica', 1, 'Química Sanguínea', 'Función renal en niños', 'No requiere ayuno', 'Espectrofotometría', 4, 'Pediatría'),

-- Estudios de Imagen para Ginecología
('IMG006', 'Ultrasonido Transvaginal', 2, 'Ultrasonido', 'Evaluación de útero y ovarios por vía transvaginal', 'Vejiga vacía', 'Ultrasonido Doppler', 2, 'Ginecología'),
('IMG007', 'Ultrasonido Pélvico', 2, 'Ultrasonido', 'Evaluación de órganos pélvicos', 'Vejiga llena', 'Ultrasonido Doppler', 2, 'Ginecología'),
('IMG008', 'Mamografía Bilateral con Proyecciones Adicionales', 2, 'Radiología', 'Estudio completo de mama con proyecciones complementarias', 'No usar desodorante', 'Mamografía digital', 4, 'Ginecología'),
('IMG009', 'Ultrasonido de Mama', 2, 'Ultrasonido', 'Evaluación complementaria de mama', 'No requiere preparación', 'Ultrasonido Doppler', 2, 'Ginecología'),
('IMG010', 'Densitometría Ósea', 2, 'Densitometría', 'Evaluación de densidad mineral ósea', 'No requiere preparación', 'DEXA', 2, 'Ginecología'),
('IMG011', 'Histerosalpingografía', 2, 'Radiología', 'Evaluación de útero y trompas de Falopio', 'No requiere preparación', 'Radiografía con contraste', 2, 'Ginecología'),
('IMG012', 'Resonancia Magnética Pélvica', 2, 'Resonancia Magnética', 'Evaluación detallada de órganos pélvicos', 'Ayuno de 4 horas', 'Resonancia magnética', 24, 'Ginecología'),

-- Estudios de Imagen para Pediatría
('IMG013', 'Radiografía de Tórax Pediátrica', 2, 'Radiología', 'Radiografía de tórax en niños', 'No requiere preparación', 'Radiografía digital', 2, 'Pediatría'),
('IMG014', 'Ultrasonido Abdominal Pediátrico', 2, 'Ultrasonido', 'Evaluación de órganos abdominales en niños', 'Ayuno de 4 horas', 'Ultrasonido Doppler', 2, 'Pediatría'),
('IMG015', 'Ecocardiografía Pediátrica', 2, 'Ultrasonido', 'Evaluación del corazón en niños', 'No requiere preparación', 'Ultrasonido Doppler', 2, 'Pediatría'),
('IMG016', 'Ultrasonido Cerebral Neonatal', 2, 'Ultrasonido', 'Evaluación del cerebro en recién nacidos', 'No requiere preparación', 'Ultrasonido Doppler', 2, 'Pediatría'),
('IMG017', 'Radiografía de Cráneo Pediátrica', 2, 'Radiología', 'Radiografía de cráneo en niños', 'No requiere preparación', 'Radiografía digital', 2, 'Pediatría'),
('IMG018', 'Tomografía de Cráneo Pediátrica', 2, 'Tomografía', 'Tomografía de cráneo en niños', 'Sedación si es necesario', 'Tomografía helicoidal', 24, 'Pediatría'),

-- Estudios Funcionales para Ginecología
('FUN001', 'Colposcopia', 3, 'Endoscopía', 'Evaluación detallada del cuello uterino', 'No requiere preparación', 'Colposcopia con ácido acético', 1, 'Ginecología'),
('FUN002', 'Histeroscopia Diagnóstica', 3, 'Endoscopía', 'Evaluación del interior del útero', 'No requiere preparación', 'Histeroscopia', 2, 'Ginecología'),
('FUN003', 'Biopsia de Endometrio', 3, 'Biopsia', 'Obtención de muestra endometrial', 'No requiere preparación', 'Biopsia por aspiración', 1, 'Ginecología'),
('FUN004', 'Biopsia de Mama', 3, 'Biopsia', 'Obtención de muestra de tejido mamario', 'No requiere preparación', 'Biopsia con aguja gruesa', 2, 'Ginecología'),
('FUN005', 'Prueba de Papanicolaou', 3, 'Citología', 'Detección de cáncer cervicouterino', 'No requiere preparación', 'Citología cervical', 1, 'Ginecología'),
('FUN006', 'Prueba de VPH (Virus del Papiloma Humano)', 3, 'Microbiología', 'Detección de VPH de alto riesgo', 'No requiere preparación', 'PCR', 48, 'Ginecología'),

-- Estudios Funcionales para Pediatría
('FUN007', 'Electroencefalografía Pediátrica', 3, 'Neurofisiología', 'Registro de actividad eléctrica cerebral en niños', 'No requiere preparación', 'EEG de 20 derivaciones', 2, 'Pediatría'),
('FUN008', 'Espirometría Pediátrica', 3, 'Función Pulmonar', 'Evaluación de función pulmonar en niños', 'No requiere preparación', 'Espirometría forzada', 1, 'Pediatría'),
('FUN009', 'Prueba de Audición Neonatal', 3, 'Audiología', 'Detección de hipoacusia en recién nacidos', 'No requiere preparación', 'Emisiones otoacústicas', 1, 'Pediatría'),
('FUN010', 'Evaluación del Desarrollo Psicomotor', 3, 'Neurodesarrollo', 'Evaluación del desarrollo neurológico', 'No requiere preparación', 'Escalas estandarizadas', 2, 'Pediatría'),
('FUN011', 'Prueba de Reflejos Neonatales', 3, 'Neurología', 'Evaluación de reflejos primitivos', 'No requiere preparación', 'Examen neurológico', 1, 'Pediatría'),
('FUN012', 'Prueba de Tamiz Visual', 3, 'Oftalmología', 'Detección de problemas visuales', 'No requiere preparación', 'Reflejo rojo', 1, 'Pediatría'),

-- Estudios de Biopsia
('BIO001', 'Biopsia Cervical', 4, 'Biopsia', 'Obtención de muestra cervical', 'No requiere preparación', 'Biopsia dirigida', 1, 'Ginecología'),
('BIO002', 'Biopsia Endometrial', 4, 'Biopsia', 'Obtención de muestra endometrial', 'No requiere preparación', 'Biopsia por aspiración', 1, 'Ginecología'),
('BIO003', 'Biopsia de Mama', 4, 'Biopsia', 'Obtención de muestra mamaria', 'No requiere preparación', 'Biopsia con aguja gruesa', 2, 'Ginecología'),
('BIO004', 'Biopsia de Ganglio Linfático', 4, 'Biopsia', 'Obtención de muestra ganglionar', 'No requiere preparación', 'Biopsia por aspiración', 2, 'Medicina General'),

-- Estudios Genéticos
('GEN001', 'Cariotipo', 5, 'Genética', 'Análisis cromosómico', 'No requiere preparación', 'Citogenética', 168, 'Genética'),
('GEN002', 'Prueba de Paternidad', 5, 'Genética', 'Determinación de paternidad', 'No requiere preparación', 'PCR', 72, 'Genética'),
('GEN003', 'Tamiz Genético Preconcepcional', 5, 'Genética', 'Detección de portadores de enfermedades genéticas', 'No requiere preparación', 'Secuenciación', 168, 'Genética')
ON CONFLICT (code) DO NOTHING;

-- Insertar valores normales para estudios pediátricos
INSERT INTO study_normal_values (study_id, age_min, age_max, gender, min_value, max_value, unit, notes) VALUES
-- Tamiz Neonatal Básico
(31, 0, 30, 'B', 0, 2, 'mg/dL', 'Fenilalanina - Normal'),
(31, 0, 30, 'B', 0, 10, 'mUI/L', 'TSH - Normal'),

-- Bilirrubina Neonatal
(33, 0, 7, 'B', 0, 12, 'mg/dL', 'Bilirrubina Total - Recién nacidos'),
(33, 8, 30, 'B', 0, 1, 'mg/dL', 'Bilirrubina Total - Lactantes'),

-- Hemoglobina Pediátrica
(34, 0, 6, 'B', 9.5, 14.5, 'g/dL', 'Hemoglobina - 0-6 meses'),
(34, 6, 12, 'B', 10.5, 13.5, 'g/dL', 'Hemoglobina - 6-12 meses'),
(34, 1, 5, 'B', 11.0, 13.0, 'g/dL', 'Hemoglobina - 1-5 años'),
(34, 5, 12, 'B', 11.5, 14.5, 'g/dL', 'Hemoglobina - 5-12 años'),

-- Plomo en Sangre
(35, 0, 18, 'B', 0, 5, 'μg/dL', 'Plomo - Normal'),
(35, 0, 18, 'B', 5, 10, 'μg/dL', 'Plomo - Riesgo elevado'),
(35, 0, 18, 'B', 10, 999, 'μg/dL', 'Plomo - Intoxicación'),

-- Vitamina D Pediátrica
(36, 0, 18, 'B', 30, 100, 'ng/mL', 'Vitamina D - Suficiente'),
(36, 0, 18, 'B', 20, 29, 'ng/mL', 'Vitamina D - Insuficiente'),
(36, 0, 18, 'B', 0, 19, 'ng/mL', 'Vitamina D - Deficiente'),

-- Creatinina Pediátrica
(38, 0, 1, 'B', 0.2, 0.4, 'mg/dL', 'Creatinina - 0-1 año'),
(38, 1, 5, 'B', 0.3, 0.5, 'mg/dL', 'Creatinina - 1-5 años'),
(38, 5, 12, 'B', 0.4, 0.7, 'mg/dL', 'Creatinina - 5-12 años'),
(38, 12, 18, 'B', 0.5, 0.9, 'mg/dL', 'Creatinina - 12-18 años')
ON CONFLICT DO NOTHING;

-- Insertar plantillas de estudios para Ginecología
INSERT INTO study_templates (name, description, specialty, is_default) VALUES
('Control Ginecológico Anual', 'Estudios para control ginecológico anual', 'Ginecología', false),
('Evaluación de Infertilidad', 'Estudios para evaluación de infertilidad femenina', 'Ginecología', false),
('Control Prenatal Primer Trimestre', 'Estudios para control prenatal en primer trimestre', 'Ginecología', false),
('Control Prenatal Segundo Trimestre', 'Estudios para control prenatal en segundo trimestre', 'Ginecología', false),
('Control Prenatal Tercer Trimestre', 'Estudios para control prenatal en tercer trimestre', 'Ginecología', false),
('Evaluación de Menopausia', 'Estudios para evaluación de menopausia', 'Ginecología', false),
('Detección de Cáncer de Mama', 'Estudios para detección de cáncer de mama', 'Ginecología', false),
('Detección de Cáncer Cervicouterino', 'Estudios para detección de cáncer cervicouterino', 'Ginecología', false)
ON CONFLICT DO NOTHING;

-- Insertar plantillas de estudios para Pediatría
INSERT INTO study_templates (name, description, specialty, is_default) VALUES
('Control Pediátrico Recién Nacido', 'Estudios para control de recién nacido', 'Pediatría', false),
('Control Pediátrico 1 Mes', 'Estudios para control pediátrico a 1 mes', 'Pediatría', false),
('Control Pediátrico 3 Meses', 'Estudios para control pediátrico a 3 meses', 'Pediatría', false),
('Control Pediátrico 6 Meses', 'Estudios para control pediátrico a 6 meses', 'Pediatría', false),
('Control Pediátrico 12 Meses', 'Estudios para control pediátrico a 12 meses', 'Pediatría', false),
('Control Pediátrico 2 Años', 'Estudios para control pediátrico a 2 años', 'Pediatría', false),
('Control Pediátrico 5 Años', 'Estudios para control pediátrico a 5 años', 'Pediatría', false),
('Evaluación de Desarrollo', 'Estudios para evaluación del desarrollo infantil', 'Pediatría', false),
('Evaluación de Anemia', 'Estudios para evaluación de anemia en niños', 'Pediatría', false),
('Tamiz Neonatal Completo', 'Estudios de tamiz neonatal ampliado', 'Pediatría', false)
ON CONFLICT DO NOTHING;

-- Insertar elementos de plantillas para Ginecología
INSERT INTO study_template_items (template_id, study_id, order_index) VALUES
-- Control Ginecológico Anual
(6, 5, 1), -- Papanicolaou
(6, 6, 2), -- VPH
(6, 1, 3), -- Biometría Hemática
(6, 8, 4), -- Mamografía

-- Evaluación de Infertilidad
(7, 21, 1), -- Estradiol
(7, 22, 2), -- Progesterona
(7, 23, 3), -- FSH
(7, 24, 4), -- LH
(7, 25, 5), -- Prolactina
(7, 28, 6), -- AMH
(7, 6, 7), -- Ultrasonido Transvaginal

-- Control Prenatal Primer Trimestre
(8, 9, 1), -- Beta HCG
(8, 1, 2), -- Biometría Hemática
(8, 3, 3), -- Examen General de Orina
(8, 13, 4), -- Ultrasonido Obstétrico

-- Control Prenatal Segundo Trimestre
(9, 1, 1), -- Biometría Hemática
(9, 2, 2), -- Química Sanguínea
(9, 3, 3), -- Examen General de Orina
(9, 13, 4), -- Ultrasonido Obstétrico

-- Control Prenatal Tercer Trimestre
(10, 1, 1), -- Biometría Hemática
(10, 2, 2), -- Química Sanguínea
(10, 3, 3), -- Examen General de Orina
(10, 13, 4), -- Ultrasonido Obstétrico

-- Evaluación de Menopausia
(11, 21, 1), -- Estradiol
(11, 23, 2), -- FSH
(11, 24, 3), -- LH
(11, 10, 4), -- TSH
(11, 10, 5), -- Densitometría Ósea

-- Detección de Cáncer de Mama
(12, 8, 1), -- Mamografía
(12, 9, 2), -- Ultrasonido de Mama

-- Detección de Cáncer Cervicouterino
(13, 5, 1), -- Papanicolaou
(13, 6, 2), -- VPH
(13, 1, 3) -- Colposcopia
ON CONFLICT DO NOTHING;

-- Insertar elementos de plantillas para Pediatría
INSERT INTO study_template_items (template_id, study_id, order_index) VALUES
-- Control Pediátrico Recién Nacido
(14, 31, 1), -- Tamiz Neonatal Básico
(14, 33, 2), -- Bilirrubina
(14, 9, 3), -- Prueba de Audición Neonatal
(14, 12, 4), -- Prueba de Reflejos Neonatales

-- Control Pediátrico 1 Mes
(15, 34, 1), -- Hemoglobina Pediátrica
(15, 33, 2), -- Bilirrubina
(15, 12, 3), -- Prueba de Reflejos Neonatales

-- Control Pediátrico 3 Meses
(16, 34, 1), -- Hemoglobina Pediátrica
(16, 10, 2), -- Evaluación del Desarrollo

-- Control Pediátrico 6 Meses
(17, 34, 1), -- Hemoglobina Pediátrica
(17, 10, 2), -- Evaluación del Desarrollo

-- Control Pediátrico 12 Meses
(18, 34, 1), -- Hemoglobina Pediátrica
(18, 10, 2), -- Evaluación del Desarrollo
(18, 12, 3), -- Prueba de Tamiz Visual

-- Control Pediátrico 2 Años
(19, 34, 1), -- Hemoglobina Pediátrica
(19, 10, 2), -- Evaluación del Desarrollo
(19, 12, 3), -- Prueba de Tamiz Visual

-- Control Pediátrico 5 Años
(20, 34, 1), -- Hemoglobina Pediátrica
(20, 1, 2), -- Biometría Hemática
(20, 3, 3), -- Examen General de Orina
(20, 12, 4), -- Prueba de Tamiz Visual

-- Evaluación de Desarrollo
(21, 10, 1), -- Evaluación del Desarrollo Psicomotor
(21, 7, 2), -- Electroencefalografía Pediátrica

-- Evaluación de Anemia
(22, 34, 1), -- Hemoglobina Pediátrica
(22, 17, 2), -- Ferritina
(22, 18, 3), -- Vitamina B12
(22, 19, 4), -- Ácido Fólico

-- Tamiz Neonatal Completo
(23, 32, 1), -- Tamiz Neonatal Ampliado
(23, 31, 2), -- Tamiz Neonatal Básico
(23, 9, 3), -- Prueba de Audición Neonatal
(23, 12, 4) -- Prueba de Reflejos Neonatales
ON CONFLICT DO NOTHING;
