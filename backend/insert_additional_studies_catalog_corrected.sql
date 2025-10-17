-- Insertar estudios clínicos adicionales según normativa mexicana
-- Basado en NOM-220-SSA1-2016 y otras normativas vigentes
-- Enfoque en estudios comunes y especialidades de Ginecología y Pediatría

-- Insertar estudios de laboratorio clínico comunes
INSERT INTO study_catalog (code, name, category_id, subcategory, description, preparation, methodology, duration_hours, specialty) VALUES
-- Estudios de Laboratorio Comunes
('LAB011', 'Perfil Hepático Completo', 19, 'Química Sanguínea', 'AST, ALT, bilirrubina total y directa, fosfatasa alcalina, GGT, proteínas totales, albúmina', 'Ayuno de 8 horas', 'Espectrofotometría', 4, 'Medicina General'),
('LAB012', 'Perfil Renal Completo', 19, 'Química Sanguínea', 'Urea, creatinina, ácido úrico, sodio, potasio, cloro, calcio, fósforo', 'Ayuno de 8 horas', 'Espectrofotometría', 4, 'Medicina General'),
('LAB013', 'Perfil Tiroideo Completo', 23, 'Hormonas', 'TSH, T3 libre, T4 libre, anticuerpos anti-tiroideos', 'No requiere ayuno', 'Inmunoensayo', 6, 'Endocrinología'),
('LAB014', 'Hemoglobina Glicosilada (HbA1c)', 19, 'Química Sanguínea', 'Control de diabetes a largo plazo', 'No requiere ayuno', 'Cromatografía líquida', 24, 'Endocrinología'),
('LAB015', 'Proteína C Reactiva (PCR)', 19, 'Marcadores Inflamatorios', 'Marcador de inflamación aguda', 'No requiere ayuno', 'Inmunoensayo', 2, 'Medicina General'),
('LAB016', 'Velocidad de Sedimentación Globular (VSG)', 18, 'Hematología', 'Medición de la velocidad de sedimentación de eritrocitos', 'No requiere ayuno', 'Método de Westergren', 2, 'Medicina General'),
('LAB017', 'Ferritina', 19, 'Marcadores de Hierro', 'Reserva de hierro corporal', 'Ayuno de 8 horas', 'Inmunoensayo', 4, 'Hematología'),
('LAB018', 'Vitamina B12', 19, 'Vitaminas', 'Nivel de vitamina B12 en sangre', 'Ayuno de 8 horas', 'Inmunoensayo', 6, 'Hematología'),
('LAB019', 'Ácido Fólico', 19, 'Vitaminas', 'Nivel de ácido fólico en sangre', 'Ayuno de 8 horas', 'Inmunoensayo', 6, 'Hematología'),
('LAB020', 'Coagulograma Completo', 18, 'Coagulación', 'TP, TTP, fibrinógeno, tiempo de sangrado', 'No requiere ayuno', 'Coagulometría', 4, 'Hematología'),

-- Estudios de Laboratorio para Ginecología
('LAB021', 'Estradiol', 23, 'Hormonas', 'Hormona estrogénica principal', 'No requiere ayuno', 'Inmunoensayo', 6, 'Ginecología'),
('LAB022', 'Progesterona', 23, 'Hormonas', 'Hormona progestacional', 'No requiere ayuno', 'Inmunoensayo', 6, 'Ginecología'),
('LAB023', 'FSH (Hormona Folículo Estimulante)', 23, 'Hormonas', 'Hormona estimulante del folículo', 'No requiere ayuno', 'Inmunoensayo', 6, 'Ginecología'),
('LAB024', 'LH (Hormona Luteinizante)', 23, 'Hormonas', 'Hormona luteinizante', 'No requiere ayuno', 'Inmunoensayo', 6, 'Ginecología'),
('LAB025', 'Prolactina', 23, 'Hormonas', 'Hormona prolactina', 'Ayuno de 8 horas', 'Inmunoensayo', 6, 'Ginecología'),
('LAB026', 'Testosterona Total', 23, 'Hormonas', 'Hormona testosterona total', 'No requiere ayuno', 'Inmunoensayo', 6, 'Ginecología'),
('LAB027', 'DHEA-S', 23, 'Hormonas', 'Sulfato de dehidroepiandrosterona', 'No requiere ayuno', 'Inmunoensayo', 6, 'Ginecología'),
('LAB028', 'AMH (Hormona Antimülleriana)', 23, 'Hormonas', 'Reserva ovárica', 'No requiere ayuno', 'Inmunoensayo', 24, 'Ginecología'),
('LAB029', 'Cortisol', 23, 'Hormonas', 'Hormona del estrés', 'Ayuno de 8 horas', 'Inmunoensayo', 6, 'Endocrinología'),
('LAB030', 'Insulina', 23, 'Hormonas', 'Hormona insulina', 'Ayuno de 8 horas', 'Inmunoensayo', 6, 'Endocrinología'),

-- Estudios de Laboratorio para Pediatría
('LAB031', 'Tamiz Neonatal Básico', 24, 'Tamiz Neonatal', 'Fenilcetonuria, hipotiroidismo congénito, galactosemia', 'No requiere ayuno', 'Espectrometría de masas', 72, 'Pediatría'),
('LAB032', 'Tamiz Neonatal Ampliado', 24, 'Tamiz Neonatal', '40+ enfermedades metabólicas congénitas', 'No requiere ayuno', 'Espectrometría de masas', 72, 'Pediatría'),
('LAB033', 'Bilirrubina Total y Directa', 19, 'Química Sanguínea', 'Evaluación de ictericia neonatal', 'No requiere ayuno', 'Espectrofotometría', 2, 'Pediatría'),
('LAB034', 'Hemoglobina y Hematocrito Pediátrico', 18, 'Hematología', 'Detección de anemia en niños', 'No requiere ayuno', 'Citometría de flujo', 2, 'Pediatría'),
('LAB035', 'Plomo en Sangre', 28, 'Toxicología', 'Detección de intoxicación por plomo', 'No requiere ayuno', 'Espectrometría de absorción atómica', 24, 'Pediatría'),
('LAB036', 'Vitamina D (25-OH)', 19, 'Vitaminas', 'Nivel de vitamina D', 'No requiere ayuno', 'Inmunoensayo', 6, 'Pediatría'),
('LAB037', 'Calcio, Fósforo y Magnesio', 19, 'Química Sanguínea', 'Metabolismo mineral', 'Ayuno de 8 horas', 'Espectrofotometría', 4, 'Pediatría'),
('LAB038', 'Creatinina y Urea Pediátrica', 19, 'Química Sanguínea', 'Función renal en niños', 'No requiere ayuno', 'Espectrofotometría', 4, 'Pediatría'),

-- Estudios de Imagen para Ginecología
('IMG006', 'Ultrasonido Transvaginal', 25, 'Ultrasonido', 'Evaluación de útero y ovarios por vía transvaginal', 'Vejiga vacía', 'Ultrasonido Doppler', 2, 'Ginecología'),
('IMG007', 'Ultrasonido Pélvico', 25, 'Ultrasonido', 'Evaluación de órganos pélvicos', 'Vejiga llena', 'Ultrasonido Doppler', 2, 'Ginecología'),
('IMG008', 'Mamografía Bilateral con Proyecciones Adicionales', 25, 'Radiología', 'Estudio completo de mama con proyecciones complementarias', 'No usar desodorante', 'Mamografía digital', 4, 'Ginecología'),
('IMG009', 'Ultrasonido de Mama', 25, 'Ultrasonido', 'Evaluación complementaria de mama', 'No requiere preparación', 'Ultrasonido Doppler', 2, 'Ginecología'),
('IMG010', 'Densitometría Ósea', 25, 'Densitometría', 'Evaluación de densidad mineral ósea', 'No requiere preparación', 'DEXA', 2, 'Ginecología'),
('IMG011', 'Histerosalpingografía', 25, 'Radiología', 'Evaluación de útero y trompas de Falopio', 'No requiere preparación', 'Radiografía con contraste', 2, 'Ginecología'),
('IMG012', 'Resonancia Magnética Pélvica', 25, 'Resonancia Magnética', 'Evaluación detallada de órganos pélvicos', 'Ayuno de 4 horas', 'Resonancia magnética', 24, 'Ginecología'),

-- Estudios de Imagen para Pediatría
('IMG013', 'Radiografía de Tórax Pediátrica', 25, 'Radiología', 'Radiografía de tórax en niños', 'No requiere preparación', 'Radiografía digital', 2, 'Pediatría'),
('IMG014', 'Ultrasonido Abdominal Pediátrico', 25, 'Ultrasonido', 'Evaluación de órganos abdominales en niños', 'Ayuno de 4 horas', 'Ultrasonido Doppler', 2, 'Pediatría'),
('IMG015', 'Ecocardiografía Pediátrica', 25, 'Ultrasonido', 'Evaluación del corazón en niños', 'No requiere preparación', 'Ultrasonido Doppler', 2, 'Pediatría'),
('IMG016', 'Ultrasonido Cerebral Neonatal', 25, 'Ultrasonido', 'Evaluación del cerebro en recién nacidos', 'No requiere preparación', 'Ultrasonido Doppler', 2, 'Pediatría'),
('IMG017', 'Radiografía de Cráneo Pediátrica', 25, 'Radiología', 'Radiografía de cráneo en niños', 'No requiere preparación', 'Radiografía digital', 2, 'Pediatría'),
('IMG018', 'Tomografía de Cráneo Pediátrica', 25, 'Tomografía', 'Tomografía de cráneo en niños', 'Sedación si es necesario', 'Tomografía helicoidal', 24, 'Pediatría'),

-- Estudios Funcionales para Ginecología
('FUN001', 'Colposcopia', 26, 'Endoscopía', 'Evaluación detallada del cuello uterino', 'No requiere preparación', 'Colposcopia con ácido acético', 1, 'Ginecología'),
('FUN002', 'Histeroscopia Diagnóstica', 26, 'Endoscopía', 'Evaluación del interior del útero', 'No requiere preparación', 'Histeroscopia', 2, 'Ginecología'),
('FUN003', 'Biopsia de Endometrio', 27, 'Biopsia', 'Obtención de muestra endometrial', 'No requiere preparación', 'Biopsia por aspiración', 1, 'Ginecología'),
('FUN004', 'Biopsia de Mama', 27, 'Biopsia', 'Obtención de muestra de tejido mamario', 'No requiere preparación', 'Biopsia con aguja gruesa', 2, 'Ginecología'),
('FUN005', 'Prueba de Papanicolaou', 27, 'Citología', 'Detección de cáncer cervicouterino', 'No requiere preparación', 'Citología cervical', 1, 'Ginecología'),
('FUN006', 'Prueba de VPH (Virus del Papiloma Humano)', 19, 'Microbiología', 'Detección de VPH de alto riesgo', 'No requiere preparación', 'PCR', 48, 'Ginecología'),

-- Estudios Funcionales para Pediatría
('FUN007', 'Electroencefalografía Pediátrica', 30, 'Neurofisiología', 'Registro de actividad eléctrica cerebral en niños', 'No requiere preparación', 'EEG de 20 derivaciones', 2, 'Pediatría'),
('FUN008', 'Espirometría Pediátrica', 26, 'Función Pulmonar', 'Evaluación de función pulmonar en niños', 'No requiere preparación', 'Espirometría forzada', 1, 'Pediatría'),
('FUN009', 'Prueba de Audición Neonatal', 26, 'Audiología', 'Detección de hipoacusia en recién nacidos', 'No requiere preparación', 'Emisiones otoacústicas', 1, 'Pediatría'),
('FUN010', 'Evaluación del Desarrollo Psicomotor', 26, 'Neurodesarrollo', 'Evaluación del desarrollo neurológico', 'No requiere preparación', 'Escalas estandarizadas', 2, 'Pediatría'),
('FUN011', 'Prueba de Reflejos Neonatales', 26, 'Neurología', 'Evaluación de reflejos primitivos', 'No requiere preparación', 'Examen neurológico', 1, 'Pediatría'),
('FUN012', 'Prueba de Tamiz Visual', 26, 'Oftalmología', 'Detección de problemas visuales', 'No requiere preparación', 'Reflejo rojo', 1, 'Pediatría'),

-- Estudios de Biopsia
('BIO001', 'Biopsia Cervical', 27, 'Biopsia', 'Obtención de muestra cervical', 'No requiere preparación', 'Biopsia dirigida', 1, 'Ginecología'),
('BIO002', 'Biopsia Endometrial', 27, 'Biopsia', 'Obtención de muestra endometrial', 'No requiere preparación', 'Biopsia por aspiración', 1, 'Ginecología'),
('BIO003', 'Biopsia de Mama', 27, 'Biopsia', 'Obtención de muestra mamaria', 'No requiere preparación', 'Biopsia con aguja gruesa', 2, 'Ginecología'),
('BIO004', 'Biopsia de Ganglio Linfático', 27, 'Biopsia', 'Obtención de muestra ganglionar', 'No requiere preparación', 'Biopsia por aspiración', 2, 'Medicina General'),

-- Estudios Genéticos
('GEN001', 'Cariotipo', 24, 'Genética', 'Análisis cromosómico', 'No requiere preparación', 'Citogenética', 168, 'Genética'),
('GEN002', 'Prueba de Paternidad', 24, 'Genética', 'Determinación de paternidad', 'No requiere preparación', 'PCR', 72, 'Genética'),
('GEN003', 'Tamiz Genético Preconcepcional', 24, 'Genética', 'Detección de portadores de enfermedades genéticas', 'No requiere preparación', 'Secuenciación', 168, 'Genética')
ON CONFLICT (code) DO NOTHING;
