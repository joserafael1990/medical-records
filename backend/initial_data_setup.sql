-- ============================================================================
-- SCRIPT DE SETUP INICIAL - SISTEMA DE HISTORIAS CLÍNICAS ELECTRÓNICAS
-- ============================================================================
-- Este script contiene todos los datos maestros necesarios para inicializar
-- el sistema con catálogos completos
--
-- CONTENIDO:
-- 1. Países (28)
-- 2. Estados/Provincias (181 - Solo estados reales, sin duplicados)
-- 3. Relaciones de Emergencia (29)
-- 4. Especialidades Médicas (164)
--
-- MODO DE USO:
-- docker exec -i medical-records-main-postgres-db-1 psql -U historias_user -d historias_clinicas < backend/initial_data_setup.sql
--
-- Última actualización: 2025-10-22
-- Versión: 2.0 (Datos limpiados y verificados)
-- ============================================================================

\echo '============================================='
\echo '   INICIANDO CARGA DE DATOS MAESTROS'
\echo '============================================='
\echo ''

-- ============================================================================
-- 1. PAÍSES (28 países de América Latina + otros)
-- ============================================================================
\echo '🌎 Insertando países...'

INSERT INTO countries (id, name, phone_code, active) VALUES
    (1, 'México', '+52', true),
    (2, 'Estados Unidos', '+1', true),
    (3, 'España', '+34', true),
    (4, 'Argentina', '+54', true),
    (5, 'Colombia', '+57', true),
    (6, 'Chile', '+56', true),
    (7, 'Perú', '+51', true),
    (8, 'Brasil', '+55', true),
    (9, 'Venezuela', '+58', true),
    (10, 'Ecuador', '+593', true),
    (11, 'Guatemala', '+502', true),
    (12, 'Cuba', '+53', true),
    (13, 'Bolivia', '+591', true),
    (14, 'Haití', '+509', true),
    (15, 'República Dominicana', '+1809', true),
    (16, 'Honduras', '+504', true),
    (17, 'Paraguay', '+595', true),
    (18, 'Nicaragua', '+505', true),
    (19, 'El Salvador', '+503', true),
    (20, 'Costa Rica', '+506', true),
    (21, 'Panamá', '+507', true),
    (22, 'Uruguay', '+598', true),
    (23, 'Puerto Rico', '+1787', true),
    (24, 'Guyana', '+592', true),
    (25, 'Surinam', '+597', true),
    (26, 'Belice', '+501', true),
    (27, 'Guayana Francesa', '+594', true),
    (28, 'Otro', '+000', true)
ON CONFLICT (id) DO NOTHING;

-- Resetear secuencia de países
SELECT setval('countries_id_seq', (SELECT MAX(id) FROM countries));

\echo '✅ Países insertados'
\echo ''

-- ============================================================================
-- 2. ESTADOS/PROVINCIAS (181 - Solo estados reales, sin duplicados)
-- ============================================================================
\echo '🗺️  Insertando estados y provincias...'

-- Estados de México (32)
INSERT INTO states (name, country_id) VALUES
    ('Aguascalientes', 1),
    ('Baja California', 1),
    ('Baja California Sur', 1),
    ('Campeche', 1),
    ('Chiapas', 1),
    ('Chihuahua', 1),
    ('Ciudad de México', 1),
    ('Coahuila', 1),
    ('Colima', 1),
    ('Durango', 1),
    ('Guanajuato', 1),
    ('Guerrero', 1),
    ('Hidalgo', 1),
    ('Jalisco', 1),
    ('México', 1),
    ('Michoacán', 1),
    ('Morelos', 1),
    ('Nayarit', 1),
    ('Nuevo León', 1),
    ('Oaxaca', 1),
    ('Puebla', 1),
    ('Querétaro', 1),
    ('Quintana Roo', 1),
    ('San Luis Potosí', 1),
    ('Sinaloa', 1),
    ('Sonora', 1),
    ('Tabasco', 1),
    ('Tamaulipas', 1),
    ('Tlaxcala', 1),
    ('Veracruz', 1),
    ('Yucatán', 1),
    ('Zacatecas', 1)
ON CONFLICT (name, country_id) DO NOTHING;

-- Estados de Argentina (24)
INSERT INTO states (name, country_id) VALUES
    ('Buenos Aires', 4),
    ('Catamarca', 4),
    ('Chaco', 4),
    ('Chubut', 4),
    ('Ciudad Autónoma de Buenos Aires', 4),
    ('Córdoba', 4),
    ('Corrientes', 4),
    ('Entre Ríos', 4),
    ('Formosa', 4),
    ('Jujuy', 4),
    ('La Pampa', 4),
    ('La Rioja', 4),
    ('Mendoza', 4),
    ('Misiones', 4),
    ('Neuquén', 4),
    ('Río Negro', 4),
    ('Salta', 4),
    ('San Juan', 4),
    ('San Luis', 4),
    ('Santa Cruz', 4),
    ('Santa Fe', 4),
    ('Santiago del Estero', 4),
    ('Tierra del Fuego', 4),
    ('Tucumán', 4)
ON CONFLICT (name, country_id) DO NOTHING;

-- Estados de Colombia (33)
INSERT INTO states (name, country_id) VALUES
    ('Amazonas', 5),
    ('Antioquia', 5),
    ('Arauca', 5),
    ('Atlántico', 5),
    ('Bogotá D.C.', 5),
    ('Bolívar', 5),
    ('Boyacá', 5),
    ('Caldas', 5),
    ('Caquetá', 5),
    ('Casanare', 5),
    ('Cauca', 5),
    ('Cesar', 5),
    ('Chocó', 5),
    ('Córdoba', 5),
    ('Cundinamarca', 5),
    ('Guainía', 5),
    ('Guaviare', 5),
    ('Huila', 5),
    ('La Guajira', 5),
    ('Magdalena', 5),
    ('Meta', 5),
    ('Nariño', 5),
    ('Norte de Santander', 5),
    ('Putumayo', 5),
    ('Quindío', 5),
    ('Risaralda', 5),
    ('San Andrés y Providencia', 5),
    ('Santander', 5),
    ('Sucre', 5),
    ('Tolima', 5),
    ('Valle del Cauca', 5),
    ('Vaupés', 5),
    ('Vichada', 5)
ON CONFLICT (name, country_id) DO NOTHING;

-- Estados de Chile (16)
INSERT INTO states (name, country_id) VALUES
    ('Antofagasta', 6),
    ('Araucanía', 6),
    ('Arica y Parinacota', 6),
    ('Atacama', 6),
    ('Aysén', 6),
    ('Biobío', 6),
    ('Coquimbo', 6),
    ('Los Lagos', 6),
    ('Los Ríos', 6),
    ('Magallanes', 6),
    ('Maule', 6),
    ('Metropolitana de Santiago', 6),
    ('Ñuble', 6),
    ('O''Higgins', 6),
    ('Tarapacá', 6),
    ('Valparaíso', 6)
ON CONFLICT (name, country_id) DO NOTHING;

-- Estados de Perú (25)
INSERT INTO states (name, country_id) VALUES
    ('Amazonas', 7),
    ('Áncash', 7),
    ('Apurímac', 7),
    ('Arequipa', 7),
    ('Ayacucho', 7),
    ('Cajamarca', 7),
    ('Callao', 7),
    ('Cusco', 7),
    ('Huancavelica', 7),
    ('Huánuco', 7),
    ('Ica', 7),
    ('Junín', 7),
    ('La Libertad', 7),
    ('Lambayeque', 7),
    ('Lima', 7),
    ('Loreto', 7),
    ('Madre de Dios', 7),
    ('Moquegua', 7),
    ('Pasco', 7),
    ('Piura', 7),
    ('Puno', 7),
    ('San Martín', 7),
    ('Tacna', 7),
    ('Tumbes', 7),
    ('Ucayali', 7)
ON CONFLICT (name, country_id) DO NOTHING;

-- Estados de Brasil (27)
INSERT INTO states (name, country_id) VALUES
    ('Acre', 8),
    ('Alagoas', 8),
    ('Amapá', 8),
    ('Amazonas', 8),
    ('Bahía', 8),
    ('Ceará', 8),
    ('Distrito Federal', 8),
    ('Espírito Santo', 8),
    ('Goiás', 8),
    ('Maranhão', 8),
    ('Mato Grosso', 8),
    ('Mato Grosso do Sul', 8),
    ('Minas Gerais', 8),
    ('Pará', 8),
    ('Paraíba', 8),
    ('Paraná', 8),
    ('Pernambuco', 8),
    ('Piauí', 8),
    ('Río de Janeiro', 8),
    ('Rio Grande do Norte', 8),
    ('Rio Grande do Sul', 8),
    ('Rondônia', 8),
    ('Roraima', 8),
    ('Santa Catarina', 8),
    ('São Paulo', 8),
    ('Sergipe', 8),
    ('Tocantins', 8)
ON CONFLICT (name, country_id) DO NOTHING;

-- Estados de Venezuela (24)
INSERT INTO states (name, country_id) VALUES
    ('Amazonas', 9),
    ('Anzoátegui', 9),
    ('Apure', 9),
    ('Aragua', 9),
    ('Barinas', 9),
    ('Bolívar', 9),
    ('Carabobo', 9),
    ('Cojedes', 9),
    ('Delta Amacuro', 9),
    ('Distrito Capital', 9),
    ('Falcón', 9),
    ('Guárico', 9),
    ('Lara', 9),
    ('Mérida', 9),
    ('Miranda', 9),
    ('Monagas', 9),
    ('Nueva Esparta', 9),
    ('Portuguesa', 9),
    ('Sucre', 9),
    ('Táchira', 9),
    ('Trujillo', 9),
    ('Vargas', 9),
    ('Yaracuy', 9),
    ('Zulia', 9)
ON CONFLICT (name, country_id) DO NOTHING;

\echo '✅ Estados insertados (181 total)'
\echo ''

-- ============================================================================
-- 3. RELACIONES DE EMERGENCIA (29)
-- ============================================================================
\echo '🚨 Insertando relaciones de emergencia...'

INSERT INTO emergency_relationships (name, is_active) VALUES
('Madre', true),
('Padre', true),
('Hijo/a', true),
('Esposo/a', true),
('Hermano/a', true),
('Abuelo/a', true),
('Nieto/a', true),
('Tío/a', true),
('Sobrino/a', true),
('Primo/a', true),
('Cuñado/a', true),
('Suegro/a', true),
('Yerno/Nuera', true),
('Pareja', true),
('Novio/a', true),
('Amigo/a', true),
('Vecino/a', true),
('Compañero/a de trabajo', true),
('Jefe/a', true),
('Tutor/a legal', true),
('Cuidador/a', true),
('Abogado/a', true),
('Representante legal', true),
('Médico/a personal', true),
('Enfermero/a', true),
('Trabajador/a social', true),
('Sacerdote/Pastor', true),
('Otro familiar', true),
('Otro', true)
ON CONFLICT (name) DO NOTHING;

\echo '✅ Relaciones de emergencia insertadas'
\echo ''

-- ============================================================================
-- 4. ESPECIALIDADES MÉDICAS (164)
-- ============================================================================
\echo '🩺 Insertando especialidades médicas...'

INSERT INTO specialties (name, description, is_active) VALUES
('Medicina General', 'Atención médica general y preventiva', true),
('Medicina Interna', 'Diagnóstico y tratamiento de enfermedades en adultos', true),
('Cardiología', 'Enfermedades del corazón y sistema circulatorio', true),
('Dermatología', 'Enfermedades de la piel, cabello y uñas', true),
('Endocrinología', 'Trastornos hormonales y metabólicos', true),
('Gastroenterología', 'Enfermedades del sistema digestivo', true),
('Geriatría', 'Atención médica especializada en adultos mayores', true),
('Ginecología', 'Salud del sistema reproductor femenino', true),
('Hematología', 'Enfermedades de la sangre', true),
('Infectología', 'Enfermedades infecciosas', true),
('Nefrología', 'Enfermedades de los riñones', true),
('Neumología', 'Enfermedades del sistema respiratorio', true),
('Neurología', 'Enfermedades del sistema nervioso', true),
('Nutrición', 'Alimentación y trastornos nutricionales', true),
('Obstetricia', 'Embarazo, parto y posparto', true),
('Oftalmología', 'Enfermedades de los ojos', true),
('Oncología', 'Diagnóstico y tratamiento del cáncer', true),
('Ortopedia', 'Enfermedades del sistema musculoesquelético', true),
('Otorrinolaringología', 'Enfermedades de oído, nariz y garganta', true),
('Pediatría', 'Atención médica de niños y adolescentes', true),
('Psiquiatría', 'Trastornos mentales y emocionales', true),
('Reumatología', 'Enfermedades de las articulaciones y tejido conectivo', true),
('Traumatología', 'Lesiones traumáticas del sistema musculoesquelético', true),
('Urología', 'Enfermedades del sistema urinario y reproductor masculino', true),
('Alergología', 'Alergias y enfermedades del sistema inmunológico', true),
('Anestesiología', 'Administración de anestesia y manejo del dolor', true),
('Angiología', 'Enfermedades del sistema circulatorio y linfático', true),
('Cirugía General', 'Procedimientos quirúrgicos generales', true),
('Cirugía Cardiovascular', 'Cirugía del corazón y vasos sanguíneos', true),
('Cirugía Pediátrica', 'Cirugía en niños', true),
('Cirugía Plástica', 'Cirugía reconstructiva y estética', true),
('Cirugía Torácica', 'Cirugía de tórax y pulmones', true),
('Cirugía Vascular', 'Cirugía de vasos sanguíneos', true),
('Coloproctología', 'Enfermedades del colon, recto y ano', true),
('Estomatología', 'Salud bucal y enfermedades de la boca', true),
('Genética Médica', 'Enfermedades genéticas y hereditarias', true),
('Medicina del Deporte', 'Lesiones y salud en deportistas', true),
('Medicina del Trabajo', 'Salud ocupacional', true),
('Medicina Física y Rehabilitación', 'Rehabilitación física y funcional', true),
('Medicina Forense', 'Aplicación de la medicina en cuestiones legales', true),
('Medicina Nuclear', 'Diagnóstico y tratamiento con radioisótopos', true),
('Neurocirugía', 'Cirugía del sistema nervioso', true),
('Neonatología', 'Atención de recién nacidos', true),
('Patología', 'Diagnóstico de enfermedades mediante análisis de tejidos', true),
('Psicología Clínica', 'Terapia psicológica y evaluación mental', true),
('Radiología', 'Diagnóstico por imágenes', true),
('Terapia Intensiva', 'Atención de pacientes en estado crítico', true),
('Toxicología', 'Efectos de sustancias tóxicas', true),
('Medicina Aeroespacial', 'Salud en ambientes de vuelo y espacio', true),
('Medicina Hiperbárica', 'Tratamiento con oxígeno a alta presión', true),
('Medicina Tropical', 'Enfermedades de regiones tropicales', true),
('Adolescentología', 'Atención médica especializada en adolescentes', true),
('Andrología', 'Salud reproductiva y sexual masculina', true),
('Audiología', 'Evaluación y tratamiento de problemas auditivos', true),
('Bariatría', 'Tratamiento de la obesidad', true),
('Broncoscopía', 'Examen y tratamiento de vías respiratorias', true),
('Citopatología', 'Diagnóstico de enfermedades mediante células', true),
('Criocirugía', 'Cirugía mediante congelación', true),
('Diabetología', 'Especialización en diabetes', true),
('Ecografía', 'Diagnóstico mediante ultrasonido', true),
('Electrofisiología', 'Estudio de la actividad eléctrica del corazón', true),
('Epileptología', 'Tratamiento de la epilepsia', true),
('Farmacología Clínica', 'Uso apropiado de medicamentos', true),
('Fetología', 'Salud del feto durante el embarazo', true),
('Flebología', 'Enfermedades de las venas', true),
('Foniatría', 'Trastornos de la voz y comunicación', true),
('Hepatología', 'Enfermedades del hígado', true),
('Hidroterapia', 'Tratamiento mediante agua', true),
('Homeopatía', 'Medicina alternativa homeopática', true),
('Imagenología', 'Interpretación de estudios de imagen', true),
('Inmunología', 'Enfermedades del sistema inmunológico', true),
('Laparoscopía', 'Cirugía mínimamente invasiva', true),
('Litotricia', 'Tratamiento de cálculos renales', true),
('Mamografía', 'Diagnóstico de enfermedades mamarias', true),
('Mastología', 'Enfermedades de las mamas', true),
('Medicina Alternativa', 'Terapias complementarias y alternativas', true),
('Medicina Conductual', 'Modificación de conductas relacionadas con salud', true),
('Medicina Estética', 'Tratamientos estéticos no quirúrgicos', true),
('Medicina Funcional', 'Enfoque integral de la salud', true),
('Medicina Integrativa', 'Combinación de medicina convencional y alternativa', true),
('Medicina Preventiva', 'Prevención de enfermedades', true),
('Microbiología Clínica', 'Diagnóstico de infecciones', true),
('Neurodesarrollo', 'Desarrollo neurológico infantil', true),
('Neurofisiología', 'Función del sistema nervioso', true),
('Neuropsicología', 'Relación entre cerebro y conducta', true),
('Neurorrehabilitación', 'Rehabilitación de lesiones neurológicas', true),
('Nutriología Clínica', 'Tratamiento nutricional de enfermedades', true),
('Odontología', 'Salud dental y bucal', true),
('Optometría', 'Evaluación y corrección de la visión', true),
('Ortodencia', 'Corrección de la posición de los dientes', true),
('Ortopedia Infantil', 'Ortopedia especializada en niños', true),
('Osteopatía', 'Tratamiento manual del sistema musculoesquelético', true),
('Otología', 'Enfermedades del oído', true),
('Perinatología', 'Embarazos de alto riesgo', true),
('Psicogeriatría', 'Salud mental en adultos mayores', true),
('Psicooncología', 'Apoyo psicológico a pacientes con cáncer', true),
('Psicoterapia', 'Tratamiento de trastornos mentales mediante terapia', true),
('Quiropraxia', 'Tratamiento de trastornos del sistema musculoesquelético', true),
('Radioncología', 'Tratamiento del cáncer con radiación', true),
('Radioterapia', 'Aplicación de radiación para tratamiento', true),
('Reproducción Asistida', 'Tratamientos de fertilidad', true),
('Rinología', 'Enfermedades de la nariz', true),
('Salud Pública', 'Salud de poblaciones y comunidades', true),
('Senología', 'Enfermedades de las mamas', true),
('Sexología', 'Salud sexual', true),
('Tanatología', 'Atención de pacientes terminales y duelo', true),
('Telemedicina', 'Atención médica a distancia', true),
('Terapia del Dolor', 'Manejo especializado del dolor', true),
('Terapia Ocupacional', 'Rehabilitación de actividades diarias', true),
('Tiroides', 'Enfermedades de la glándula tiroides', true),
('Transfusión Sanguínea', 'Administración de productos sanguíneos', true),
('Trasplantes', 'Cirugía y seguimiento de trasplantes de órganos', true),
('Trastornos del Sueño', 'Diagnóstico y tratamiento de problemas del sueño', true),
('Ultrasonografía', 'Diagnóstico por ultrasonido', true),
('Urgencias Médicas', 'Atención de emergencias médicas', true),
('Venereología', 'Enfermedades de transmisión sexual', true),
('Virología', 'Enfermedades causadas por virus', true),
('Acupuntura', 'Medicina tradicional china', true),
('Ayurveda', 'Medicina tradicional india', true),
('Herbolaria', 'Tratamiento con plantas medicinales', true),
('Medicina Tradicional', 'Prácticas médicas ancestrales', true),
('Naturopatía', 'Medicina natural', true),
('Quiropráctica', 'Ajustes de la columna vertebral', true),
('Reflexología', 'Terapia mediante puntos reflejos', true),
('Reiki', 'Terapia energética', true),
('Aromaterapia', 'Terapia con aceites esenciales', true),
('Biomagnetismo', 'Terapia con imanes', true),
('Flores de Bach', 'Terapia floral', true),
('Hipnosis Clínica', 'Hipnosis para tratamiento médico', true),
('Iridología', 'Diagnóstico mediante el iris', true),
('Ozonoterapia', 'Terapia con ozono', true),
('Terapia Neural', 'Tratamiento mediante anestésicos locales', true),
('Algología', 'Estudio y tratamiento del dolor', true),
('Biología Molecular', 'Diagnóstico molecular de enfermedades', true),
('Cirugía Bariátrica', 'Cirugía para tratamiento de obesidad', true),
('Cirugía Maxilofacial', 'Cirugía de cara, mandíbula y cuello', true),
('Cirugía Oncológica', 'Cirugía especializada en cáncer', true),
('Cirugía Robótica', 'Cirugía asistida por robots', true),
('Citogenética', 'Estudio de cromosomas', true),
('Densitometría', 'Medición de densidad ósea', true),
('Electro-neurofisiología', 'Estudios eléctricos del sistema nervioso', true),
('Enfermedades Raras', 'Diagnóstico y tratamiento de enfermedades poco comunes', true),
('Esofagología', 'Enfermedades del esófago', true),
('Farmacogenética', 'Respuesta genética a medicamentos', true),
('Fitoterapia', 'Tratamiento con plantas', true),
('Gerontología', 'Estudio del envejecimiento', true),
('Grafología Médica', 'Análisis de escritura para diagnóstico', true),
('Hemodiálisis', 'Tratamiento de insuficiencia renal', true),
('Hemoterapia', 'Tratamiento con sangre y derivados', true),
('Hipertensión', 'Especialización en presión arterial alta', true),
('Histopatología', 'Diagnóstico mediante tejidos', true),
('Inmunoterapia', 'Tratamiento mediante el sistema inmunológico', true),
('Intervencionismo', 'Procedimientos mínimamente invasivos', true),
('Kinesiología', 'Estudio del movimiento corporal', true),
('Litiasis', 'Tratamiento de cálculos', true),
('Linfología', 'Enfermedades del sistema linfático', true),
('Magnetoterapia', 'Tratamiento con campos magnéticos', true),
('Mesoterapia', 'Inyección de medicamentos en dermis', true),
('Micología Médica', 'Infecciones por hongos', true),
('Musicoterapia', 'Terapia mediante música', true)
ON CONFLICT (name) DO NOTHING;

\echo '✅ Especialidades médicas insertadas'
\echo ''

-- ============================================================================
-- RESUMEN DE DATOS INSERTADOS
-- ============================================================================
\echo ''
\echo '============================================='
\echo '   ✅ CARGA DE DATOS COMPLETADA'
\echo '============================================='
\echo ''
\echo '📊 Resumen:'
\echo '   • Países: 28'
\echo '   • Estados: 181 (Solo reales, sin duplicados)'
\echo '   • Relaciones de emergencia: 29'
\echo '   • Especialidades médicas: 164'
\echo ''
\echo '✨ Sistema listo para uso'
\echo ''
\echo 'NOTA: Los medicamentos y diagnósticos se encuentran'
\echo 'en el archivo initial_data_setup_part2.sql'
\echo ''
