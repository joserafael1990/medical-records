-- ============================================================================
-- CATEGORÍAS DE ESTUDIOS CLÍNICOS
-- ============================================================================
-- Insertar categorías de estudios clínicos comunes

INSERT INTO study_categories (id, name, active, created_at) VALUES
(1, 'Hematología', true, NOW()),
(2, 'Química Sanguínea', true, NOW()),
(3, 'Microbiología', true, NOW()),
(4, 'Inmunología', true, NOW()),
(5, 'Radiología', true, NOW()),
(6, 'Ultrasonido', true, NOW()),
(7, 'Tomografía', true, NOW()),
(8, 'Resonancia Magnética', true, NOW()),
(9, 'Cardiología', true, NOW()),
(10, 'Ginecología', true, NOW()),
(11, 'Urología', true, NOW()),
(12, 'Gastroenterología', true, NOW()),
(13, 'Endocrinología', true, NOW()),
(14, 'Neurología', true, NOW()),
(15, 'Oftalmología', true, NOW()),
(16, 'Otorrinolaringología', true, NOW()),
(17, 'Dermatología', true, NOW()),
(18, 'Patología', true, NOW()),
(19, 'Genética', true, NOW()),
(20, 'Medicina Nuclear', true, NOW()),
(21, 'Espirometría', true, NOW()),
(22, 'Electrocardiograma', true, NOW()),
(23, 'Medicina del Deporte', true, NOW()),
(24, 'Oncología', true, NOW()),
(25, 'Medicina Preventiva', true, NOW())
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    active = EXCLUDED.active;

