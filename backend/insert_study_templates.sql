-- Insertar plantillas de estudios específicas para Ginecología y Pediatría
-- Basado en normativa mexicana vigente

-- Insertar plantillas de estudios para Ginecología
INSERT INTO study_templates (name, description, specialty, is_default) VALUES
('Control Ginecológico Anual', 'Estudios para control ginecológico anual según NOM-007-SSA2-2016', 'Ginecología', false),
('Evaluación de Infertilidad', 'Estudios para evaluación de infertilidad femenina', 'Ginecología', false),
('Control Prenatal Primer Trimestre', 'Estudios para control prenatal en primer trimestre', 'Ginecología', false),
('Control Prenatal Segundo Trimestre', 'Estudios para control prenatal en segundo trimestre', 'Ginecología', false),
('Control Prenatal Tercer Trimestre', 'Estudios para control prenatal en tercer trimestre', 'Ginecología', false),
('Evaluación de Menopausia', 'Estudios para evaluación de menopausia', 'Ginecología', false),
('Detección de Cáncer de Mama', 'Estudios para detección de cáncer de mama', 'Ginecología', false),
('Detección de Cáncer Cervicouterino', 'Estudios para detección de cáncer cervicouterino', 'Ginecología', false),
('Evaluación Hormonal Femenina', 'Estudios para evaluación del perfil hormonal femenino', 'Ginecología', false),
('Evaluación de Amenorrea', 'Estudios para evaluación de amenorrea secundaria', 'Ginecología', false)
ON CONFLICT DO NOTHING;

-- Insertar plantillas de estudios para Pediatría
INSERT INTO study_templates (name, description, specialty, is_default) VALUES
('Control Pediátrico Recién Nacido', 'Estudios para control de recién nacido según NOM-031-SSA2-1999', 'Pediatría', false),
('Control Pediátrico 1 Mes', 'Estudios para control pediátrico a 1 mes', 'Pediatría', false),
('Control Pediátrico 3 Meses', 'Estudios para control pediátrico a 3 meses', 'Pediatría', false),
('Control Pediátrico 6 Meses', 'Estudios para control pediátrico a 6 meses', 'Pediatría', false),
('Control Pediátrico 12 Meses', 'Estudios para control pediátrico a 12 meses', 'Pediatría', false),
('Control Pediátrico 2 Años', 'Estudios para control pediátrico a 2 años', 'Pediatría', false),
('Control Pediátrico 5 Años', 'Estudios para control pediátrico a 5 años', 'Pediatría', false),
('Evaluación de Desarrollo', 'Estudios para evaluación del desarrollo infantil', 'Pediatría', false),
('Evaluación de Anemia', 'Estudios para evaluación de anemia en niños', 'Pediatría', false),
('Tamiz Neonatal Completo', 'Estudios de tamiz neonatal ampliado', 'Pediatría', false),
('Evaluación de Ictericia Neonatal', 'Estudios para evaluación de ictericia en recién nacidos', 'Pediatría', false),
('Evaluación de Retraso del Desarrollo', 'Estudios para evaluación de retraso del desarrollo psicomotor', 'Pediatría', false),
('Evaluación de Problemas de Crecimiento', 'Estudios para evaluación de problemas de crecimiento', 'Pediatría', false),
('Evaluación de Problemas de Aprendizaje', 'Estudios para evaluación de problemas de aprendizaje', 'Pediatría', false),
('Evaluación de Convulsiones', 'Estudios para evaluación de convulsiones en niños', 'Pediatría', false)
ON CONFLICT DO NOTHING;

-- Obtener IDs de estudios para las plantillas
-- Nota: Estos IDs pueden variar según la base de datos, se actualizarán dinámicamente

-- Insertar elementos de plantillas para Ginecología
-- Control Ginecológico Anual
INSERT INTO study_template_items (template_id, study_id, order_index) 
SELECT t.id, s.id, 1 FROM study_templates t, study_catalog s 
WHERE t.name = 'Control Ginecológico Anual' AND s.code = 'FUN005'
ON CONFLICT DO NOTHING;

INSERT INTO study_template_items (template_id, study_id, order_index) 
SELECT t.id, s.id, 2 FROM study_templates t, study_catalog s 
WHERE t.name = 'Control Ginecológico Anual' AND s.code = 'FUN006'
ON CONFLICT DO NOTHING;

INSERT INTO study_template_items (template_id, study_id, order_index) 
SELECT t.id, s.id, 3 FROM study_templates t, study_catalog s 
WHERE t.name = 'Control Ginecológico Anual' AND s.code = 'HEM001'
ON CONFLICT DO NOTHING;

INSERT INTO study_template_items (template_id, study_id, order_index) 
SELECT t.id, s.id, 4 FROM study_templates t, study_catalog s 
WHERE t.name = 'Control Ginecológico Anual' AND s.code = 'IMG008'
ON CONFLICT DO NOTHING;

-- Evaluación de Infertilidad
INSERT INTO study_template_items (template_id, study_id, order_index) 
SELECT t.id, s.id, 1 FROM study_templates t, study_catalog s 
WHERE t.name = 'Evaluación de Infertilidad' AND s.code = 'LAB021'
ON CONFLICT DO NOTHING;

INSERT INTO study_template_items (template_id, study_id, order_index) 
SELECT t.id, s.id, 2 FROM study_templates t, study_catalog s 
WHERE t.name = 'Evaluación de Infertilidad' AND s.code = 'LAB022'
ON CONFLICT DO NOTHING;

INSERT INTO study_template_items (template_id, study_id, order_index) 
SELECT t.id, s.id, 3 FROM study_templates t, study_catalog s 
WHERE t.name = 'Evaluación de Infertilidad' AND s.code = 'LAB023'
ON CONFLICT DO NOTHING;

INSERT INTO study_template_items (template_id, study_id, order_index) 
SELECT t.id, s.id, 4 FROM study_templates t, study_catalog s 
WHERE t.name = 'Evaluación de Infertilidad' AND s.code = 'LAB024'
ON CONFLICT DO NOTHING;

INSERT INTO study_template_items (template_id, study_id, order_index) 
SELECT t.id, s.id, 5 FROM study_templates t, study_catalog s 
WHERE t.name = 'Evaluación de Infertilidad' AND s.code = 'LAB025'
ON CONFLICT DO NOTHING;

INSERT INTO study_template_items (template_id, study_id, order_index) 
SELECT t.id, s.id, 6 FROM study_templates t, study_catalog s 
WHERE t.name = 'Evaluación de Infertilidad' AND s.code = 'LAB028'
ON CONFLICT DO NOTHING;

INSERT INTO study_template_items (template_id, study_id, order_index) 
SELECT t.id, s.id, 7 FROM study_templates t, study_catalog s 
WHERE t.name = 'Evaluación de Infertilidad' AND s.code = 'IMG006'
ON CONFLICT DO NOTHING;

-- Control Prenatal Primer Trimestre
INSERT INTO study_template_items (template_id, study_id, order_index) 
SELECT t.id, s.id, 1 FROM study_templates t, study_catalog s 
WHERE t.name = 'Control Prenatal Primer Trimestre' AND s.code = 'BIO001'
ON CONFLICT DO NOTHING;

INSERT INTO study_template_items (template_id, study_id, order_index) 
SELECT t.id, s.id, 2 FROM study_templates t, study_catalog s 
WHERE t.name = 'Control Prenatal Primer Trimestre' AND s.code = 'HEM001'
ON CONFLICT DO NOTHING;

INSERT INTO study_template_items (template_id, study_id, order_index) 
SELECT t.id, s.id, 3 FROM study_templates t, study_catalog s 
WHERE t.name = 'Control Prenatal Primer Trimestre' AND s.code = 'URO001'
ON CONFLICT DO NOTHING;

INSERT INTO study_template_items (template_id, study_id, order_index) 
SELECT t.id, s.id, 4 FROM study_templates t, study_catalog s 
WHERE t.name = 'Control Prenatal Primer Trimestre' AND s.code = 'IMG006'
ON CONFLICT DO NOTHING;

-- Detección de Cáncer de Mama
INSERT INTO study_template_items (template_id, study_id, order_index) 
SELECT t.id, s.id, 1 FROM study_templates t, study_catalog s 
WHERE t.name = 'Detección de Cáncer de Mama' AND s.code = 'IMG008'
ON CONFLICT DO NOTHING;

INSERT INTO study_template_items (template_id, study_id, order_index) 
SELECT t.id, s.id, 2 FROM study_templates t, study_catalog s 
WHERE t.name = 'Detección de Cáncer de Mama' AND s.code = 'IMG009'
ON CONFLICT DO NOTHING;

-- Detección de Cáncer Cervicouterino
INSERT INTO study_template_items (template_id, study_id, order_index) 
SELECT t.id, s.id, 1 FROM study_templates t, study_catalog s 
WHERE t.name = 'Detección de Cáncer Cervicouterino' AND s.code = 'FUN005'
ON CONFLICT DO NOTHING;

INSERT INTO study_template_items (template_id, study_id, order_index) 
SELECT t.id, s.id, 2 FROM study_templates t, study_catalog s 
WHERE t.name = 'Detección de Cáncer Cervicouterino' AND s.code = 'FUN006'
ON CONFLICT DO NOTHING;

INSERT INTO study_template_items (template_id, study_id, order_index) 
SELECT t.id, s.id, 3 FROM study_templates t, study_catalog s 
WHERE t.name = 'Detección de Cáncer Cervicouterino' AND s.code = 'FUN001'
ON CONFLICT DO NOTHING;

-- Insertar elementos de plantillas para Pediatría
-- Control Pediátrico Recién Nacido
INSERT INTO study_template_items (template_id, study_id, order_index) 
SELECT t.id, s.id, 1 FROM study_templates t, study_catalog s 
WHERE t.name = 'Control Pediátrico Recién Nacido' AND s.code = 'LAB031'
ON CONFLICT DO NOTHING;

INSERT INTO study_template_items (template_id, study_id, order_index) 
SELECT t.id, s.id, 2 FROM study_templates t, study_catalog s 
WHERE t.name = 'Control Pediátrico Recién Nacido' AND s.code = 'LAB033'
ON CONFLICT DO NOTHING;

INSERT INTO study_template_items (template_id, study_id, order_index) 
SELECT t.id, s.id, 3 FROM study_templates t, study_catalog s 
WHERE t.name = 'Control Pediátrico Recién Nacido' AND s.code = 'FUN009'
ON CONFLICT DO NOTHING;

INSERT INTO study_template_items (template_id, study_id, order_index) 
SELECT t.id, s.id, 4 FROM study_templates t, study_catalog s 
WHERE t.name = 'Control Pediátrico Recién Nacido' AND s.code = 'FUN011'
ON CONFLICT DO NOTHING;

-- Tamiz Neonatal Completo
INSERT INTO study_template_items (template_id, study_id, order_index) 
SELECT t.id, s.id, 1 FROM study_templates t, study_catalog s 
WHERE t.name = 'Tamiz Neonatal Completo' AND s.code = 'LAB032'
ON CONFLICT DO NOTHING;

INSERT INTO study_template_items (template_id, study_id, order_index) 
SELECT t.id, s.id, 2 FROM study_templates t, study_catalog s 
WHERE t.name = 'Tamiz Neonatal Completo' AND s.code = 'LAB031'
ON CONFLICT DO NOTHING;

INSERT INTO study_template_items (template_id, study_id, order_index) 
SELECT t.id, s.id, 3 FROM study_templates t, study_catalog s 
WHERE t.name = 'Tamiz Neonatal Completo' AND s.code = 'FUN009'
ON CONFLICT DO NOTHING;

INSERT INTO study_template_items (template_id, study_id, order_index) 
SELECT t.id, s.id, 4 FROM study_templates t, study_catalog s 
WHERE t.name = 'Tamiz Neonatal Completo' AND s.code = 'FUN011'
ON CONFLICT DO NOTHING;

-- Evaluación de Anemia
INSERT INTO study_template_items (template_id, study_id, order_index) 
SELECT t.id, s.id, 1 FROM study_templates t, study_catalog s 
WHERE t.name = 'Evaluación de Anemia' AND s.code = 'LAB034'
ON CONFLICT DO NOTHING;

INSERT INTO study_template_items (template_id, study_id, order_index) 
SELECT t.id, s.id, 2 FROM study_templates t, study_catalog s 
WHERE t.name = 'Evaluación de Anemia' AND s.code = 'LAB017'
ON CONFLICT DO NOTHING;

INSERT INTO study_template_items (template_id, study_id, order_index) 
SELECT t.id, s.id, 3 FROM study_templates t, study_catalog s 
WHERE t.name = 'Evaluación de Anemia' AND s.code = 'LAB018'
ON CONFLICT DO NOTHING;

INSERT INTO study_template_items (template_id, study_id, order_index) 
SELECT t.id, s.id, 4 FROM study_templates t, study_catalog s 
WHERE t.name = 'Evaluación de Anemia' AND s.code = 'LAB019'
ON CONFLICT DO NOTHING;

-- Evaluación de Desarrollo
INSERT INTO study_template_items (template_id, study_id, order_index) 
SELECT t.id, s.id, 1 FROM study_templates t, study_catalog s 
WHERE t.name = 'Evaluación de Desarrollo' AND s.code = 'FUN010'
ON CONFLICT DO NOTHING;

INSERT INTO study_template_items (template_id, study_id, order_index) 
SELECT t.id, s.id, 2 FROM study_templates t, study_catalog s 
WHERE t.name = 'Evaluación de Desarrollo' AND s.code = 'FUN012'
ON CONFLICT DO NOTHING;

-- Evaluación de Convulsiones
INSERT INTO study_template_items (template_id, study_id, order_index) 
SELECT t.id, s.id, 1 FROM study_templates t, study_catalog s 
WHERE t.name = 'Evaluación de Convulsiones' AND s.code = 'FUN007'
ON CONFLICT DO NOTHING;

INSERT INTO study_template_items (template_id, study_id, order_index) 
SELECT t.id, s.id, 2 FROM study_templates t, study_catalog s 
WHERE t.name = 'Evaluación de Convulsiones' AND s.code = 'IMG016'
ON CONFLICT DO NOTHING;

INSERT INTO study_template_items (template_id, study_id, order_index) 
SELECT t.id, s.id, 3 FROM study_templates t, study_catalog s 
WHERE t.name = 'Evaluación de Convulsiones' AND s.code = 'IMG018'
ON CONFLICT DO NOTHING;



