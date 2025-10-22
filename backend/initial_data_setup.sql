-- ============================================================================
-- SCRIPT DE SETUP INICIAL - SISTEMA DE HISTORIAS CLÍNICAS ELECTRÓNICAS
-- ============================================================================
-- Este script contiene todos los datos maestros necesarios para inicializar
-- el sistema con catálogos completos
--
-- CONTENIDO:
-- 1. Países (28)
-- 2. Estados/Provincias (575 - Cobertura completa de todos los países)
-- 3. Relaciones de Emergencia (29)
-- 4. Especialidades Médicas (164)
--
-- MODO DE USO:
-- docker exec -i medical-records-main-postgres-db-1 psql -U historias_user -d historias_clinicas < backend/initial_data_setup.sql
--
-- Última actualización: 2025-10-22
-- Versión: 3.0 (Cobertura completa - 28 países, 575 estados)
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

-- Estados Unidos (51)
INSERT INTO states (name, country_id) VALUES
    ('Alabama', 2),
    ('Alaska', 2),
    ('Arizona', 2),
    ('Arkansas', 2),
    ('California', 2),
    ('Colorado', 2),
    ('Connecticut', 2),
    ('Delaware', 2),
    ('Florida', 2),
    ('Georgia', 2),
    ('Hawaii', 2),
    ('Idaho', 2),
    ('Illinois', 2),
    ('Indiana', 2),
    ('Iowa', 2),
    ('Kansas', 2),
    ('Kentucky', 2),
    ('Louisiana', 2),
    ('Maine', 2),
    ('Maryland', 2),
    ('Massachusetts', 2),
    ('Michigan', 2),
    ('Minnesota', 2),
    ('Mississippi', 2),
    ('Missouri', 2),
    ('Montana', 2),
    ('Nebraska', 2),
    ('Nevada', 2),
    ('New Hampshire', 2),
    ('New Jersey', 2),
    ('New Mexico', 2),
    ('New York', 2),
    ('North Carolina', 2),
    ('North Dakota', 2),
    ('Ohio', 2),
    ('Oklahoma', 2),
    ('Oregon', 2),
    ('Pennsylvania', 2),
    ('Rhode Island', 2),
    ('South Carolina', 2),
    ('South Dakota', 2),
    ('Tennessee', 2),
    ('Texas', 2),
    ('Utah', 2),
    ('Vermont', 2),
    ('Virginia', 2),
    ('Washington', 2),
    ('West Virginia', 2),
    ('Wisconsin', 2),
    ('Wyoming', 2),
    ('Washington D.C.', 2)
ON CONFLICT (name, country_id) DO NOTHING;

-- España (19)
INSERT INTO states (name, country_id) VALUES
    ('Andalucía', 3),
    ('Aragón', 3),
    ('Asturias', 3),
    ('Baleares', 3),
    ('Canarias', 3),
    ('Cantabria', 3),
    ('Castilla-La Mancha', 3),
    ('Castilla y León', 3),
    ('Cataluña', 3),
    ('Ceuta', 3),
    ('Extremadura', 3),
    ('Galicia', 3),
    ('La Rioja', 3),
    ('Madrid', 3),
    ('Melilla', 3),
    ('Murcia', 3),
    ('Navarra', 3),
    ('País Vasco', 3),
    ('Valencia', 3)
ON CONFLICT (name, country_id) DO NOTHING;

-- Ecuador (24)
INSERT INTO states (name, country_id) VALUES
    ('Azuay', 10),
    ('Bolívar', 10),
    ('Cañar', 10),
    ('Carchi', 10),
    ('Chimborazo', 10),
    ('Cotopaxi', 10),
    ('El Oro', 10),
    ('Esmeraldas', 10),
    ('Galápagos', 10),
    ('Guayas', 10),
    ('Imbabura', 10),
    ('Loja', 10),
    ('Los Ríos', 10),
    ('Manabí', 10),
    ('Morona Santiago', 10),
    ('Napo', 10),
    ('Orellana', 10),
    ('Pastaza', 10),
    ('Pichincha', 10),
    ('Santa Elena', 10),
    ('Santo Domingo de los Tsáchilas', 10),
    ('Sucumbíos', 10),
    ('Tungurahua', 10),
    ('Zamora Chinchipe', 10)
ON CONFLICT (name, country_id) DO NOTHING;

-- Guatemala (22)
INSERT INTO states (name, country_id) VALUES
    ('Alta Verapaz', 11),
    ('Baja Verapaz', 11),
    ('Chimaltenango', 11),
    ('Chiquimula', 11),
    ('El Progreso', 11),
    ('Escuintla', 11),
    ('Guatemala', 11),
    ('Huehuetenango', 11),
    ('Izabal', 11),
    ('Jalapa', 11),
    ('Jutiapa', 11),
    ('Petén', 11),
    ('Quetzaltenango', 11),
    ('Quiché', 11),
    ('Retalhuleu', 11),
    ('Sacatepéquez', 11),
    ('San Marcos', 11),
    ('Santa Rosa', 11),
    ('Sololá', 11),
    ('Suchitepéquez', 11),
    ('Totonicapán', 11),
    ('Zacapa', 11)
ON CONFLICT (name, country_id) DO NOTHING;

-- Cuba (16)
INSERT INTO states (name, country_id) VALUES
    ('Artemisa', 12),
    ('Camagüey', 12),
    ('Ciego de Ávila', 12),
    ('Cienfuegos', 12),
    ('Granma', 12),
    ('Guantánamo', 12),
    ('Holguín', 12),
    ('Isla de la Juventud', 12),
    ('La Habana', 12),
    ('Las Tunas', 12),
    ('Matanzas', 12),
    ('Mayabeque', 12),
    ('Pinar del Río', 12),
    ('Sancti Spíritus', 12),
    ('Santiago de Cuba', 12),
    ('Villa Clara', 12)
ON CONFLICT (name, country_id) DO NOTHING;

-- Bolivia (9)
INSERT INTO states (name, country_id) VALUES
    ('Chuquisaca', 13),
    ('Cochabamba', 13),
    ('Beni', 13),
    ('La Paz', 13),
    ('Oruro', 13),
    ('Pando', 13),
    ('Potosí', 13),
    ('Santa Cruz', 13),
    ('Tarija', 13)
ON CONFLICT (name, country_id) DO NOTHING;

-- Haití (10)
INSERT INTO states (name, country_id) VALUES
    ('Artibonite', 14),
    ('Centre', 14),
    ('Grand''Anse', 14),
    ('Nippes', 14),
    ('Nord', 14),
    ('Nord-Est', 14),
    ('Nord-Ouest', 14),
    ('Ouest', 14),
    ('Sud', 14),
    ('Sud-Est', 14)
ON CONFLICT (name, country_id) DO NOTHING;

-- República Dominicana (32)
INSERT INTO states (name, country_id) VALUES
    ('Azua', 15),
    ('Bahoruco', 15),
    ('Barahona', 15),
    ('Dajabón', 15),
    ('Distrito Nacional', 15),
    ('Duarte', 15),
    ('El Seibo', 15),
    ('Elías Piña', 15),
    ('Espaillat', 15),
    ('Hato Mayor', 15),
    ('Hermanas Mirabal', 15),
    ('Independencia', 15),
    ('La Altagracia', 15),
    ('La Romana', 15),
    ('La Vega', 15),
    ('María Trinidad Sánchez', 15),
    ('Monseñor Nouel', 15),
    ('Monte Cristi', 15),
    ('Monte Plata', 15),
    ('Pedernales', 15),
    ('Peravia', 15),
    ('Puerto Plata', 15),
    ('Samaná', 15),
    ('San Cristóbal', 15),
    ('San José de Ocoa', 15),
    ('San Juan', 15),
    ('San Pedro de Macorís', 15),
    ('Sánchez Ramírez', 15),
    ('Santiago', 15),
    ('Santiago Rodríguez', 15),
    ('Santo Domingo', 15),
    ('Valverde', 15)
ON CONFLICT (name, country_id) DO NOTHING;

-- Honduras (18)
INSERT INTO states (name, country_id) VALUES
    ('Atlántida', 16),
    ('Choluteca', 16),
    ('Colón', 16),
    ('Comayagua', 16),
    ('Copán', 16),
    ('Cortés', 16),
    ('El Paraíso', 16),
    ('Francisco Morazán', 16),
    ('Gracias a Dios', 16),
    ('Intibucá', 16),
    ('Islas de la Bahía', 16),
    ('La Paz', 16),
    ('Lempira', 16),
    ('Ocotepeque', 16),
    ('Olancho', 16),
    ('Santa Bárbara', 16),
    ('Valle', 16),
    ('Yoro', 16)
ON CONFLICT (name, country_id) DO NOTHING;

-- Paraguay (18)
INSERT INTO states (name, country_id) VALUES
    ('Alto Paraguay', 17),
    ('Alto Paraná', 17),
    ('Amambay', 17),
    ('Asunción', 17),
    ('Boquerón', 17),
    ('Caaguazú', 17),
    ('Caazapá', 17),
    ('Canindeyú', 17),
    ('Central', 17),
    ('Concepción', 17),
    ('Cordillera', 17),
    ('Guairá', 17),
    ('Itapúa', 17),
    ('Misiones', 17),
    ('Ñeembucú', 17),
    ('Paraguarí', 17),
    ('Presidente Hayes', 17),
    ('San Pedro', 17)
ON CONFLICT (name, country_id) DO NOTHING;

-- Nicaragua (17)
INSERT INTO states (name, country_id) VALUES
    ('Boaco', 18),
    ('Carazo', 18),
    ('Chinandega', 18),
    ('Chontales', 18),
    ('Costa Caribe Norte', 18),
    ('Costa Caribe Sur', 18),
    ('Estelí', 18),
    ('Granada', 18),
    ('Jinotega', 18),
    ('León', 18),
    ('Madriz', 18),
    ('Managua', 18),
    ('Masaya', 18),
    ('Matagalpa', 18),
    ('Nueva Segovia', 18),
    ('Río San Juan', 18),
    ('Rivas', 18)
ON CONFLICT (name, country_id) DO NOTHING;

-- El Salvador (14)
INSERT INTO states (name, country_id) VALUES
    ('Ahuachapán', 19),
    ('Cabañas', 19),
    ('Chalatenango', 19),
    ('Cuscatlán', 19),
    ('La Libertad', 19),
    ('La Paz', 19),
    ('La Unión', 19),
    ('Morazán', 19),
    ('San Miguel', 19),
    ('San Salvador', 19),
    ('San Vicente', 19),
    ('Santa Ana', 19),
    ('Sonsonate', 19),
    ('Usulután', 19)
ON CONFLICT (name, country_id) DO NOTHING;

-- Costa Rica (7)
INSERT INTO states (name, country_id) VALUES
    ('Alajuela', 20),
    ('Cartago', 20),
    ('Guanacaste', 20),
    ('Heredia', 20),
    ('Limón', 20),
    ('Puntarenas', 20),
    ('San José', 20)
ON CONFLICT (name, country_id) DO NOTHING;

-- Panamá (13)
INSERT INTO states (name, country_id) VALUES
    ('Bocas del Toro', 21),
    ('Chiriquí', 21),
    ('Coclé', 21),
    ('Colón', 21),
    ('Darién', 21),
    ('Emberá-Wounaan', 21),
    ('Guna Yala', 21),
    ('Herrera', 21),
    ('Los Santos', 21),
    ('Ngäbe-Buglé', 21),
    ('Panamá', 21),
    ('Panamá Oeste', 21),
    ('Veraguas', 21)
ON CONFLICT (name, country_id) DO NOTHING;

-- Uruguay (19)
INSERT INTO states (name, country_id) VALUES
    ('Artigas', 22),
    ('Canelones', 22),
    ('Cerro Largo', 22),
    ('Colonia', 22),
    ('Durazno', 22),
    ('Flores', 22),
    ('Florida', 22),
    ('Lavalleja', 22),
    ('Maldonado', 22),
    ('Montevideo', 22),
    ('Paysandú', 22),
    ('Río Negro', 22),
    ('Rivera', 22),
    ('Rocha', 22),
    ('Salto', 22),
    ('San José', 22),
    ('Soriano', 22),
    ('Tacuarembó', 22),
    ('Treinta y Tres', 22)
ON CONFLICT (name, country_id) DO NOTHING;

-- Puerto Rico (77)
INSERT INTO states (name, country_id) VALUES
    ('Adjuntas', 23),
    ('Aguada', 23),
    ('Aguadilla', 23),
    ('Aguas Buenas', 23),
    ('Aibonito', 23),
    ('Añasco', 23),
    ('Arecibo', 23),
    ('Arroyo', 23),
    ('Barceloneta', 23),
    ('Barranquitas', 23),
    ('Bayamón', 23),
    ('Cabo Rojo', 23),
    ('Caguas', 23),
    ('Camuy', 23),
    ('Canóvanas', 23),
    ('Carolina', 23),
    ('Cataño', 23),
    ('Cayey', 23),
    ('Ceiba', 23),
    ('Ciales', 23),
    ('Cidra', 23),
    ('Coamo', 23),
    ('Comerío', 23),
    ('Corozal', 23),
    ('Culebra', 23),
    ('Dorado', 23),
    ('Fajardo', 23),
    ('Guánica', 23),
    ('Guayama', 23),
    ('Guayanilla', 23),
    ('Guaynabo', 23),
    ('Gurabo', 23),
    ('Hatillo', 23),
    ('Hormigueros', 23),
    ('Humacao', 23),
    ('Isabela', 23),
    ('Jayuya', 23),
    ('Juana Díaz', 23),
    ('Juncos', 23),
    ('Lajas', 23),
    ('Lares', 23),
    ('Las Marías', 23),
    ('Las Piedras', 23),
    ('Loíza', 23),
    ('Luquillo', 23),
    ('Manatí', 23),
    ('Maricao', 23),
    ('Maunabo', 23),
    ('Mayagüez', 23),
    ('Moca', 23),
    ('Morovis', 23),
    ('Naguabo', 23),
    ('Naranjito', 23),
    ('Orocovis', 23),
    ('Patillas', 23),
    ('Peñuelas', 23),
    ('Ponce', 23),
    ('Quebradillas', 23),
    ('Rincón', 23),
    ('Río Grande', 23),
    ('Sabana Grande', 23),
    ('Salinas', 23),
    ('San Germán', 23),
    ('San Juan', 23),
    ('San Lorenzo', 23),
    ('San Sebastián', 23),
    ('Santa Isabel', 23),
    ('Toa Alta', 23),
    ('Toa Baja', 23),
    ('Trujillo Alto', 23),
    ('Utuado', 23),
    ('Vega Alta', 23),
    ('Vega Baja', 23),
    ('Vieques', 23),
    ('Villalba', 23),
    ('Yabucoa', 23),
    ('Yauco', 23)
ON CONFLICT (name, country_id) DO NOTHING;

-- Guyana (10)
INSERT INTO states (name, country_id) VALUES
    ('Barima-Waini', 24),
    ('Cuyuni-Mazaruni', 24),
    ('Demerara-Mahaica', 24),
    ('East Berbice-Corentyne', 24),
    ('Essequibo Islands-West Demerara', 24),
    ('Mahaica-Berbice', 24),
    ('Pomeroon-Supenaam', 24),
    ('Potaro-Siparuni', 24),
    ('Upper Demerara-Berbice', 24),
    ('Upper Takutu-Upper Essequibo', 24)
ON CONFLICT (name, country_id) DO NOTHING;

-- Surinam (10)
INSERT INTO states (name, country_id) VALUES
    ('Brokopondo', 25),
    ('Commewijne', 25),
    ('Coronie', 25),
    ('Marowijne', 25),
    ('Nickerie', 25),
    ('Para', 25),
    ('Paramaribo', 25),
    ('Saramacca', 25),
    ('Sipaliwini', 25),
    ('Wanica', 25)
ON CONFLICT (name, country_id) DO NOTHING;

-- Belice (6)
INSERT INTO states (name, country_id) VALUES
    ('Belice', 26),
    ('Cayo', 26),
    ('Corozal', 26),
    ('Orange Walk', 26),
    ('Stann Creek', 26),
    ('Toledo', 26)
ON CONFLICT (name, country_id) DO NOTHING;

-- Guayana Francesa (1)
INSERT INTO states (name, country_id) VALUES
    ('Guayana Francesa', 27)
ON CONFLICT (name, country_id) DO NOTHING;

-- Otro (1)
INSERT INTO states (name, country_id) VALUES
    ('No especificado', 28)
ON CONFLICT (name, country_id) DO NOTHING;

\echo '✅ Estados insertados (575 total - Cobertura completa)'
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
\echo '   • Estados: 575 (Cobertura completa de todos los países)'
\echo '   • Relaciones de emergencia: 29'
\echo '   • Especialidades médicas: 164'
\echo ''
\echo '✨ Sistema listo para uso'
\echo ''
\echo 'NOTA: Los medicamentos y diagnósticos se encuentran'
\echo 'en el archivo initial_data_setup_part2.sql'
\echo ''
