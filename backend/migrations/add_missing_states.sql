-- ============================================================================
-- AGREGAR ESTADOS/PROVINCIAS FALTANTES - 21 PAÍSES
-- ============================================================================
-- Este script agrega los estados/provincias/departamentos de los países
-- que no tenían estados registrados en la base de datos
-- Fecha: 2025-10-22
-- ============================================================================

\echo '🗺️  Agregando estados de países faltantes...'

-- Estados Unidos (50 estados + DC)
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

\echo '✅ Estados Unidos: 51 estados'

-- España (17 comunidades autónomas + 2 ciudades autónomas)
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

\echo '✅ España: 19 comunidades'

-- Ecuador (24 provincias)
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

\echo '✅ Ecuador: 24 provincias'

-- Guatemala (22 departamentos)
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

\echo '✅ Guatemala: 22 departamentos'

-- Cuba (15 provincias + 1 municipio especial)
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

\echo '✅ Cuba: 16 provincias'

-- Bolivia (9 departamentos)
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

\echo '✅ Bolivia: 9 departamentos'

-- Haití (10 departamentos)
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

\echo '✅ Haití: 10 departamentos'

-- República Dominicana (31 provincias + 1 distrito)
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

\echo '✅ República Dominicana: 32 provincias'

-- Honduras (18 departamentos)
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

\echo '✅ Honduras: 18 departamentos'

-- Paraguay (17 departamentos + 1 capital)
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

\echo '✅ Paraguay: 18 departamentos'

-- Nicaragua (15 departamentos + 2 regiones autónomas)
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

\echo '✅ Nicaragua: 17 departamentos'

-- El Salvador (14 departamentos)
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

\echo '✅ El Salvador: 14 departamentos'

-- Costa Rica (7 provincias)
INSERT INTO states (name, country_id) VALUES
    ('Alajuela', 20),
    ('Cartago', 20),
    ('Guanacaste', 20),
    ('Heredia', 20),
    ('Limón', 20),
    ('Puntarenas', 20),
    ('San José', 20)
ON CONFLICT (name, country_id) DO NOTHING;

\echo '✅ Costa Rica: 7 provincias'

-- Panamá (10 provincias + 3 comarcas)
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

\echo '✅ Panamá: 13 provincias'

-- Uruguay (19 departamentos)
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

\echo '✅ Uruguay: 19 departamentos'

-- Puerto Rico (78 municipios, listando solo los principales)
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

\echo '✅ Puerto Rico: 78 municipios'

-- Guyana (10 regiones)
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

\echo '✅ Guyana: 10 regiones'

-- Surinam (10 distritos)
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

\echo '✅ Surinam: 10 distritos'

-- Belice (6 distritos)
INSERT INTO states (name, country_id) VALUES
    ('Belice', 26),
    ('Cayo', 26),
    ('Corozal', 26),
    ('Orange Walk', 26),
    ('Stann Creek', 26),
    ('Toledo', 26)
ON CONFLICT (name, country_id) DO NOTHING;

\echo '✅ Belice: 6 distritos'

-- Guayana Francesa (1 región)
INSERT INTO states (name, country_id) VALUES
    ('Guayana Francesa', 27)
ON CONFLICT (name, country_id) DO NOTHING;

\echo '✅ Guayana Francesa: 1 región'

-- Otro (Estado genérico)
INSERT INTO states (name, country_id) VALUES
    ('No especificado', 28)
ON CONFLICT (name, country_id) DO NOTHING;

\echo '✅ Otro: 1 estado'

-- ============================================================================
-- VERIFICACIÓN FINAL
-- ============================================================================
\echo ''
\echo '============================================='
\echo '   ✅ ESTADOS AGREGADOS EXITOSAMENTE'
\echo '============================================='
\echo ''

-- Ver resumen de estados por país
SELECT 
    c.name as pais,
    COUNT(s.id) as estados
FROM countries c
LEFT JOIN states s ON c.id = s.country_id
GROUP BY c.id, c.name
ORDER BY estados DESC, c.name;

\echo ''
\echo '📊 Total de estados en el sistema:'
SELECT COUNT(*) as total_estados FROM states;

