-- Script to insert countries and states data
-- Date: 2025-10-13

-- Insert countries (excluding Mexico and USA which already exist)
INSERT INTO countries (name, code, active) VALUES
-- Central America
('Guatemala', 'GT', true),
('Belice', 'BZ', true),
('El Salvador', 'SV', true),
('Honduras', 'HN', true),
('Nicaragua', 'NI', true),
('Costa Rica', 'CR', true),
('Panamá', 'PA', true),

-- South America
('Argentina', 'AR', true),
('Bolivia', 'BO', true),
('Brasil', 'BR', true),
('Chile', 'CL', true),
('Colombia', 'CO', true),
('Ecuador', 'EC', true),
('Guyana', 'GY', true),
('Paraguay', 'PY', true),
('Perú', 'PE', true),
('Surinam', 'SR', true),
('Uruguay', 'UY', true),
('Venezuela', 'VE', true),

-- Caribbean
('Cuba', 'CU', true),
('República Dominicana', 'DO', true),
('Haití', 'HT', true),
('Jamaica', 'JM', true),
('Puerto Rico', 'PR', true),
('Trinidad y Tobago', 'TT', true),

-- Europe
('España', 'ES', true),
('Francia', 'FR', true),
('Alemania', 'DE', true),
('Italia', 'IT', true),
('Reino Unido', 'GB', true),
('Portugal', 'PT', true),
('Países Bajos', 'NL', true),
('Bélgica', 'BE', true),
('Suiza', 'CH', true),
('Austria', 'AT', true),
('Suecia', 'SE', true),
('Noruega', 'NO', true),
('Dinamarca', 'DK', true),
('Finlandia', 'FI', true),
('Polonia', 'PL', true),
('Rusia', 'RU', true),
('Ucrania', 'UA', true),
('Grecia', 'GR', true),
('Turquía', 'TR', true),
('Irlanda', 'IE', true),

-- Asia
('China', 'CN', true),
('Japón', 'JP', true),
('India', 'IN', true),
('Corea del Sur', 'KR', true),
('Corea del Norte', 'KP', true),
('Tailandia', 'TH', true),
('Vietnam', 'VN', true),
('Filipinas', 'PH', true),
('Indonesia', 'ID', true),
('Malasia', 'MY', true),
('Singapur', 'SG', true),
('Pakistán', 'PK', true),
('Bangladesh', 'BD', true),
('Sri Lanka', 'LK', true),
('Myanmar', 'MM', true),
('Camboya', 'KH', true),
('Laos', 'LA', true),
('Mongolia', 'MN', true),
('Kazajistán', 'KZ', true),
('Uzbekistán', 'UZ', true),

-- Africa
('Egipto', 'EG', true),
('Nigeria', 'NG', true),
('Sudáfrica', 'ZA', true),
('Kenia', 'KE', true),
('Etiopía', 'ET', true),
('Ghana', 'GH', true),
('Marruecos', 'MA', true),
('Argelia', 'DZ', true),
('Túnez', 'TN', true),
('Libia', 'LY', true),
('Sudán', 'SD', true),
('Tanzania', 'TZ', true),
('Uganda', 'UG', true),
('Ruanda', 'RW', true),
('Senegal', 'SN', true),
('Costa de Marfil', 'CI', true),
('Mali', 'ML', true),
('Burkina Faso', 'BF', true),
('Níger', 'NE', true),
('Chad', 'TD', true),

-- Oceania
('Australia', 'AU', true),
('Nueva Zelanda', 'NZ', true),
('Fiji', 'FJ', true),
('Papúa Nueva Guinea', 'PG', true),
('Samoa', 'WS', true),
('Tonga', 'TO', true),

-- North America (excluding Mexico and USA)
('Canadá', 'CA', true),
('Groenlandia', 'GL', true),

-- Others
('Israel', 'IL', true),
('Irán', 'IR', true),
('Iraq', 'IQ', true),
('Afganistán', 'AF', true),
('Arabia Saudí', 'SA', true),
('Emiratos Árabes Unidos', 'AE', true),
('Qatar', 'QA', true),
('Kuwait', 'KW', true),
('Bahrein', 'BH', true),
('Omán', 'OM', true),
('Yemen', 'YE', true),
('Jordania', 'JO', true),
('Líbano', 'LB', true),
('Siria', 'SY', true),
('Palestina', 'PS', true);

-- Insert states for Hispanic American countries
-- Guatemala
INSERT INTO states (name, code, country_id, active) VALUES
('Guatemala', 'GT-GT', (SELECT id FROM countries WHERE code = 'GT'), true),
('Alta Verapaz', 'GT-AV', (SELECT id FROM countries WHERE code = 'GT'), true),
('Baja Verapaz', 'GT-BV', (SELECT id FROM countries WHERE code = 'GT'), true),
('Chimaltenango', 'GT-CM', (SELECT id FROM countries WHERE code = 'GT'), true),
('Chiquimula', 'GT-CQ', (SELECT id FROM countries WHERE code = 'GT'), true),
('Escuintla', 'GT-ES', (SELECT id FROM countries WHERE code = 'GT'), true),
('Huehuetenango', 'GT-HU', (SELECT id FROM countries WHERE code = 'GT'), true),
('Izabal', 'GT-IZ', (SELECT id FROM countries WHERE code = 'GT'), true),
('Jalapa', 'GT-JA', (SELECT id FROM countries WHERE code = 'GT'), true),
('Jutiapa', 'GT-JU', (SELECT id FROM countries WHERE code = 'GT'), true),
('Petén', 'GT-PE', (SELECT id FROM countries WHERE code = 'GT'), true),
('Quetzaltenango', 'GT-QZ', (SELECT id FROM countries WHERE code = 'GT'), true),
('Quiché', 'GT-QC', (SELECT id FROM countries WHERE code = 'GT'), true),
('Retalhuleu', 'GT-RE', (SELECT id FROM countries WHERE code = 'GT'), true),
('Sacatepéquez', 'GT-SA', (SELECT id FROM countries WHERE code = 'GT'), true),
('San Marcos', 'GT-SM', (SELECT id FROM countries WHERE code = 'GT'), true),
('Santa Rosa', 'GT-SR', (SELECT id FROM countries WHERE code = 'GT'), true),
('Sololá', 'GT-SO', (SELECT id FROM countries WHERE code = 'GT'), true),
('Suchitepéquez', 'GT-SU', (SELECT id FROM countries WHERE code = 'GT'), true),
('Totonicapán', 'GT-TO', (SELECT id FROM countries WHERE code = 'GT'), true),
('Zacapa', 'GT-ZA', (SELECT id FROM countries WHERE code = 'GT'), true);

-- El Salvador
INSERT INTO states (name, code, country_id, active) VALUES
('Ahuachapán', 'SV-AH', (SELECT id FROM countries WHERE code = 'SV'), true),
('Cabañas', 'SV-CA', (SELECT id FROM countries WHERE code = 'SV'), true),
('Chalatenango', 'SV-CH', (SELECT id FROM countries WHERE code = 'SV'), true),
('Cuscatlán', 'SV-CU', (SELECT id FROM countries WHERE code = 'SV'), true),
('La Libertad', 'SV-LI', (SELECT id FROM countries WHERE code = 'SV'), true),
('La Paz', 'SV-PA', (SELECT id FROM countries WHERE code = 'SV'), true),
('La Unión', 'SV-UN', (SELECT id FROM countries WHERE code = 'SV'), true),
('Morazán', 'SV-MO', (SELECT id FROM countries WHERE code = 'SV'), true),
('San Miguel', 'SV-SM', (SELECT id FROM countries WHERE code = 'SV'), true),
('San Salvador', 'SV-SS', (SELECT id FROM countries WHERE code = 'SV'), true),
('San Vicente', 'SV-SV', (SELECT id FROM countries WHERE code = 'SV'), true),
('Santa Ana', 'SV-SA', (SELECT id FROM countries WHERE code = 'SV'), true),
('Sonsonate', 'SV-SO', (SELECT id FROM countries WHERE code = 'SV'), true),
('Usulután', 'SV-US', (SELECT id FROM countries WHERE code = 'SV'), true);

-- Honduras
INSERT INTO states (name, code, country_id, active) VALUES
('Atlántida', 'HN-AT', (SELECT id FROM countries WHERE code = 'HN'), true),
('Choluteca', 'HN-CH', (SELECT id FROM countries WHERE code = 'HN'), true),
('Colón', 'HN-CL', (SELECT id FROM countries WHERE code = 'HN'), true),
('Comayagua', 'HN-CM', (SELECT id FROM countries WHERE code = 'HN'), true),
('Copán', 'HN-CP', (SELECT id FROM countries WHERE code = 'HN'), true),
('Cortés', 'HN-CR', (SELECT id FROM countries WHERE code = 'HN'), true),
('El Paraíso', 'HN-EP', (SELECT id FROM countries WHERE code = 'HN'), true),
('Francisco Morazán', 'HN-FM', (SELECT id FROM countries WHERE code = 'HN'), true),
('Gracias a Dios', 'HN-GD', (SELECT id FROM countries WHERE code = 'HN'), true),
('Intibucá', 'HN-IN', (SELECT id FROM countries WHERE code = 'HN'), true),
('Islas de la Bahía', 'HN-IB', (SELECT id FROM countries WHERE code = 'HN'), true),
('La Paz', 'HN-LP', (SELECT id FROM countries WHERE code = 'HN'), true),
('Lempira', 'HN-LE', (SELECT id FROM countries WHERE code = 'HN'), true),
('Ocotepeque', 'HN-OC', (SELECT id FROM countries WHERE code = 'HN'), true),
('Olancho', 'HN-OL', (SELECT id FROM countries WHERE code = 'HN'), true),
('Santa Bárbara', 'HN-SB', (SELECT id FROM countries WHERE code = 'HN'), true),
('Valle', 'HN-VA', (SELECT id FROM countries WHERE code = 'HN'), true),
('Yoro', 'HN-YO', (SELECT id FROM countries WHERE code = 'HN'), true);

-- Nicaragua
INSERT INTO states (name, code, country_id, active) VALUES
('Boaco', 'NI-BO', (SELECT id FROM countries WHERE code = 'NI'), true),
('Carazo', 'NI-CA', (SELECT id FROM countries WHERE code = 'NI'), true),
('Chinandega', 'NI-CI', (SELECT id FROM countries WHERE code = 'NI'), true),
('Chontales', 'NI-CO', (SELECT id FROM countries WHERE code = 'NI'), true),
('Estelí', 'NI-ES', (SELECT id FROM countries WHERE code = 'NI'), true),
('Granada', 'NI-GR', (SELECT id FROM countries WHERE code = 'NI'), true),
('Jinotega', 'NI-JI', (SELECT id FROM countries WHERE code = 'NI'), true),
('León', 'NI-LE', (SELECT id FROM countries WHERE code = 'NI'), true),
('Madriz', 'NI-MD', (SELECT id FROM countries WHERE code = 'NI'), true),
('Managua', 'NI-MN', (SELECT id FROM countries WHERE code = 'NI'), true),
('Masaya', 'NI-MS', (SELECT id FROM countries WHERE code = 'NI'), true),
('Matagalpa', 'NI-MT', (SELECT id FROM countries WHERE code = 'NI'), true),
('Nueva Segovia', 'NI-NS', (SELECT id FROM countries WHERE code = 'NI'), true),
('Río San Juan', 'NI-RS', (SELECT id FROM countries WHERE code = 'NI'), true),
('Rivas', 'NI-RI', (SELECT id FROM countries WHERE code = 'NI'), true),
('Atlántico Norte', 'NI-AN', (SELECT id FROM countries WHERE code = 'NI'), true),
('Atlántico Sur', 'NI-AS', (SELECT id FROM countries WHERE code = 'NI'), true);

-- Costa Rica
INSERT INTO states (name, code, country_id, active) VALUES
('San José', 'CR-SJ', (SELECT id FROM countries WHERE code = 'CR'), true),
('Alajuela', 'CR-A', (SELECT id FROM countries WHERE code = 'CR'), true),
('Cartago', 'CR-C', (SELECT id FROM countries WHERE code = 'CR'), true),
('Heredia', 'CR-H', (SELECT id FROM countries WHERE code = 'CR'), true),
('Guanacaste', 'CR-G', (SELECT id FROM countries WHERE code = 'CR'), true),
('Puntarenas', 'CR-P', (SELECT id FROM countries WHERE code = 'CR'), true),
('Limón', 'CR-L', (SELECT id FROM countries WHERE code = 'CR'), true);

-- Panamá
INSERT INTO states (name, code, country_id, active) VALUES
('Bocas del Toro', 'PA-1', (SELECT id FROM countries WHERE code = 'PA'), true),
('Coclé', 'PA-2', (SELECT id FROM countries WHERE code = 'PA'), true),
('Colón', 'PA-3', (SELECT id FROM countries WHERE code = 'PA'), true),
('Chiriquí', 'PA-4', (SELECT id FROM countries WHERE code = 'PA'), true),
('Darién', 'PA-5', (SELECT id FROM countries WHERE code = 'PA'), true),
('Herrera', 'PA-6', (SELECT id FROM countries WHERE code = 'PA'), true),
('Los Santos', 'PA-7', (SELECT id FROM countries WHERE code = 'PA'), true),
('Panamá', 'PA-8', (SELECT id FROM countries WHERE code = 'PA'), true),
('Veraguas', 'PA-9', (SELECT id FROM countries WHERE code = 'PA'), true),
('Guna Yala', 'PA-KY', (SELECT id FROM countries WHERE code = 'PA'), true),
('Emberá-Wounaan', 'PA-EM', (SELECT id FROM countries WHERE code = 'PA'), true),
('Ngäbe-Buglé', 'PA-NB', (SELECT id FROM countries WHERE code = 'PA'), true);

-- Argentina
INSERT INTO states (name, code, country_id, active) VALUES
('Buenos Aires', 'AR-B', (SELECT id FROM countries WHERE code = 'AR'), true),
('Catamarca', 'AR-K', (SELECT id FROM countries WHERE code = 'AR'), true),
('Chaco', 'AR-H', (SELECT id FROM countries WHERE code = 'AR'), true),
('Chubut', 'AR-U', (SELECT id FROM countries WHERE code = 'AR'), true),
('Córdoba', 'AR-X', (SELECT id FROM countries WHERE code = 'AR'), true),
('Corrientes', 'AR-W', (SELECT id FROM countries WHERE code = 'AR'), true),
('Entre Ríos', 'AR-E', (SELECT id FROM countries WHERE code = 'AR'), true),
('Formosa', 'AR-P', (SELECT id FROM countries WHERE code = 'AR'), true),
('Jujuy', 'AR-Y', (SELECT id FROM countries WHERE code = 'AR'), true),
('La Pampa', 'AR-L', (SELECT id FROM countries WHERE code = 'AR'), true),
('La Rioja', 'AR-F', (SELECT id FROM countries WHERE code = 'AR'), true),
('Mendoza', 'AR-M', (SELECT id FROM countries WHERE code = 'AR'), true),
('Misiones', 'AR-N', (SELECT id FROM countries WHERE code = 'AR'), true),
('Neuquén', 'AR-Q', (SELECT id FROM countries WHERE code = 'AR'), true),
('Río Negro', 'AR-R', (SELECT id FROM countries WHERE code = 'AR'), true),
('Salta', 'AR-A', (SELECT id FROM countries WHERE code = 'AR'), true),
('San Juan', 'AR-J', (SELECT id FROM countries WHERE code = 'AR'), true),
('San Luis', 'AR-D', (SELECT id FROM countries WHERE code = 'AR'), true),
('Santa Cruz', 'AR-Z', (SELECT id FROM countries WHERE code = 'AR'), true),
('Santa Fe', 'AR-S', (SELECT id FROM countries WHERE code = 'AR'), true),
('Santiago del Estero', 'AR-G', (SELECT id FROM countries WHERE code = 'AR'), true),
('Tierra del Fuego', 'AR-V', (SELECT id FROM countries WHERE code = 'AR'), true),
('Tucumán', 'AR-T', (SELECT id FROM countries WHERE code = 'AR'), true);

-- Chile
INSERT INTO states (name, code, country_id, active) VALUES
('Arica y Parinacota', 'CL-AP', (SELECT id FROM countries WHERE code = 'CL'), true),
('Tarapacá', 'CL-TA', (SELECT id FROM countries WHERE code = 'CL'), true),
('Antofagasta', 'CL-AN', (SELECT id FROM countries WHERE code = 'CL'), true),
('Atacama', 'CL-AT', (SELECT id FROM countries WHERE code = 'CL'), true),
('Coquimbo', 'CL-CO', (SELECT id FROM countries WHERE code = 'CL'), true),
('Valparaíso', 'CL-VS', (SELECT id FROM countries WHERE code = 'CL'), true),
('Región Metropolitana', 'CL-RM', (SELECT id FROM countries WHERE code = 'CL'), true),
('O''Higgins', 'CL-LI', (SELECT id FROM countries WHERE code = 'CL'), true),
('Maule', 'CL-ML', (SELECT id FROM countries WHERE code = 'CL'), true),
('Ñuble', 'CL-NB', (SELECT id FROM countries WHERE code = 'CL'), true),
('Biobío', 'CL-BI', (SELECT id FROM countries WHERE code = 'CL'), true),
('La Araucanía', 'CL-AR', (SELECT id FROM countries WHERE code = 'CL'), true),
('Los Ríos', 'CL-LR', (SELECT id FROM countries WHERE code = 'CL'), true),
('Los Lagos', 'CL-LL', (SELECT id FROM countries WHERE code = 'CL'), true),
('Aysén', 'CL-AI', (SELECT id FROM countries WHERE code = 'CL'), true),
('Magallanes', 'CL-MA', (SELECT id FROM countries WHERE code = 'CL'), true);

-- Colombia
INSERT INTO states (name, code, country_id, active) VALUES
('Amazonas', 'CO-AMA', (SELECT id FROM countries WHERE code = 'CO'), true),
('Antioquia', 'CO-ANT', (SELECT id FROM countries WHERE code = 'CO'), true),
('Arauca', 'CO-ARA', (SELECT id FROM countries WHERE code = 'CO'), true),
('Atlántico', 'CO-ATL', (SELECT id FROM countries WHERE code = 'CO'), true),
('Bolívar', 'CO-BOL', (SELECT id FROM countries WHERE code = 'CO'), true),
('Boyacá', 'CO-BOY', (SELECT id FROM countries WHERE code = 'CO'), true),
('Caldas', 'CO-CAL', (SELECT id FROM countries WHERE code = 'CO'), true),
('Caquetá', 'CO-CAQ', (SELECT id FROM countries WHERE code = 'CO'), true),
('Casanare', 'CO-CAS', (SELECT id FROM countries WHERE code = 'CO'), true),
('Cauca', 'CO-CAU', (SELECT id FROM countries WHERE code = 'CO'), true),
('Cesar', 'CO-CES', (SELECT id FROM countries WHERE code = 'CO'), true),
('Chocó', 'CO-CHO', (SELECT id FROM countries WHERE code = 'CO'), true),
('Córdoba', 'CO-COR', (SELECT id FROM countries WHERE code = 'CO'), true),
('Cundinamarca', 'CO-CUN', (SELECT id FROM countries WHERE code = 'CO'), true),
('Guainía', 'CO-GUA', (SELECT id FROM countries WHERE code = 'CO'), true),
('Guaviare', 'CO-GUV', (SELECT id FROM countries WHERE code = 'CO'), true),
('Huila', 'CO-HUI', (SELECT id FROM countries WHERE code = 'CO'), true),
('La Guajira', 'CO-LAG', (SELECT id FROM countries WHERE code = 'CO'), true),
('Magdalena', 'CO-MAG', (SELECT id FROM countries WHERE code = 'CO'), true),
('Meta', 'CO-MET', (SELECT id FROM countries WHERE code = 'CO'), true),
('Nariño', 'CO-NAR', (SELECT id FROM countries WHERE code = 'CO'), true),
('Norte de Santander', 'CO-NSA', (SELECT id FROM countries WHERE code = 'CO'), true),
('Putumayo', 'CO-PUT', (SELECT id FROM countries WHERE code = 'CO'), true),
('Quindío', 'CO-QUI', (SELECT id FROM countries WHERE code = 'CO'), true),
('Risaralda', 'CO-RIS', (SELECT id FROM countries WHERE code = 'CO'), true),
('San Andrés y Providencia', 'CO-SAP', (SELECT id FROM countries WHERE code = 'CO'), true),
('Santander', 'CO-SAN', (SELECT id FROM countries WHERE code = 'CO'), true),
('Sucre', 'CO-SUC', (SELECT id FROM countries WHERE code = 'CO'), true),
('Tolima', 'CO-TOL', (SELECT id FROM countries WHERE code = 'CO'), true),
('Valle del Cauca', 'CO-VAC', (SELECT id FROM countries WHERE code = 'CO'), true),
('Vaupés', 'CO-VAU', (SELECT id FROM countries WHERE code = 'CO'), true),
('Vichada', 'CO-VID', (SELECT id FROM countries WHERE code = 'CO'), true);

-- Ecuador
INSERT INTO states (name, code, country_id, active) VALUES
('Azuay', 'EC-A', (SELECT id FROM countries WHERE code = 'EC'), true),
('Bolívar', 'EC-B', (SELECT id FROM countries WHERE code = 'EC'), true),
('Cañar', 'EC-F', (SELECT id FROM countries WHERE code = 'EC'), true),
('Carchi', 'EC-C', (SELECT id FROM countries WHERE code = 'EC'), true),
('Chimborazo', 'EC-H', (SELECT id FROM countries WHERE code = 'EC'), true),
('Cotopaxi', 'EC-X', (SELECT id FROM countries WHERE code = 'EC'), true),
('El Oro', 'EC-O', (SELECT id FROM countries WHERE code = 'EC'), true),
('Esmeraldas', 'EC-E', (SELECT id FROM countries WHERE code = 'EC'), true),
('Galápagos', 'EC-W', (SELECT id FROM countries WHERE code = 'EC'), true),
('Guayas', 'EC-G', (SELECT id FROM countries WHERE code = 'EC'), true),
('Imbabura', 'EC-I', (SELECT id FROM countries WHERE code = 'EC'), true),
('Loja', 'EC-L', (SELECT id FROM countries WHERE code = 'EC'), true),
('Los Ríos', 'EC-R', (SELECT id FROM countries WHERE code = 'EC'), true),
('Manabí', 'EC-M', (SELECT id FROM countries WHERE code = 'EC'), true),
('Morona Santiago', 'EC-S', (SELECT id FROM countries WHERE code = 'EC'), true),
('Napo', 'EC-N', (SELECT id FROM countries WHERE code = 'EC'), true),
('Orellana', 'EC-D', (SELECT id FROM countries WHERE code = 'EC'), true),
('Pastaza', 'EC-Y', (SELECT id FROM countries WHERE code = 'EC'), true),
('Pichincha', 'EC-P', (SELECT id FROM countries WHERE code = 'EC'), true),
('Santa Elena', 'EC-SE', (SELECT id FROM countries WHERE code = 'EC'), true),
('Santo Domingo de los Tsáchilas', 'EC-SD', (SELECT id FROM countries WHERE code = 'EC'), true),
('Sucumbíos', 'EC-U', (SELECT id FROM countries WHERE code = 'EC'), true),
('Tungurahua', 'EC-T', (SELECT id FROM countries WHERE code = 'EC'), true),
('Zamora Chinchipe', 'EC-Z', (SELECT id FROM countries WHERE code = 'EC'), true);

-- Perú
INSERT INTO states (name, code, country_id, active) VALUES
('Amazonas', 'PE-AMA', (SELECT id FROM countries WHERE code = 'PE'), true),
('Áncash', 'PE-ANC', (SELECT id FROM countries WHERE code = 'PE'), true),
('Apurímac', 'PE-APU', (SELECT id FROM countries WHERE code = 'PE'), true),
('Arequipa', 'PE-ARE', (SELECT id FROM countries WHERE code = 'PE'), true),
('Ayacucho', 'PE-AYA', (SELECT id FROM countries WHERE code = 'PE'), true),
('Cajamarca', 'PE-CAJ', (SELECT id FROM countries WHERE code = 'PE'), true),
('Callao', 'PE-CAL', (SELECT id FROM countries WHERE code = 'PE'), true),
('Cusco', 'PE-CUS', (SELECT id FROM countries WHERE code = 'PE'), true),
('Huancavelica', 'PE-HUV', (SELECT id FROM countries WHERE code = 'PE'), true),
('Huánuco', 'PE-HUC', (SELECT id FROM countries WHERE code = 'PE'), true),
('Ica', 'PE-ICA', (SELECT id FROM countries WHERE code = 'PE'), true),
('Junín', 'PE-JUN', (SELECT id FROM countries WHERE code = 'PE'), true),
('La Libertad', 'PE-LAL', (SELECT id FROM countries WHERE code = 'PE'), true),
('Lambayeque', 'PE-LAM', (SELECT id FROM countries WHERE code = 'PE'), true),
('Lima', 'PE-LIM', (SELECT id FROM countries WHERE code = 'PE'), true),
('Loreto', 'PE-LOR', (SELECT id FROM countries WHERE code = 'PE'), true),
('Madre de Dios', 'PE-MDD', (SELECT id FROM countries WHERE code = 'PE'), true),
('Moquegua', 'PE-MOQ', (SELECT id FROM countries WHERE code = 'PE'), true),
('Pasco', 'PE-PAS', (SELECT id FROM countries WHERE code = 'PE'), true),
('Piura', 'PE-PIU', (SELECT id FROM countries WHERE code = 'PE'), true),
('Puno', 'PE-PUN', (SELECT id FROM countries WHERE code = 'PE'), true),
('San Martín', 'PE-SAM', (SELECT id FROM countries WHERE code = 'PE'), true),
('Tacna', 'PE-TAC', (SELECT id FROM countries WHERE code = 'PE'), true),
('Tumbes', 'PE-TUM', (SELECT id FROM countries WHERE code = 'PE'), true),
('Ucayali', 'PE-UCA', (SELECT id FROM countries WHERE code = 'PE'), true);

-- Venezuela
INSERT INTO states (name, code, country_id, active) VALUES
('Amazonas', 'VE-X', (SELECT id FROM countries WHERE code = 'VE'), true),
('Anzoátegui', 'VE-B', (SELECT id FROM countries WHERE code = 'VE'), true),
('Apure', 'VE-C', (SELECT id FROM countries WHERE code = 'VE'), true),
('Aragua', 'VE-D', (SELECT id FROM countries WHERE code = 'VE'), true),
('Barinas', 'VE-E', (SELECT id FROM countries WHERE code = 'VE'), true),
('Bolívar', 'VE-F', (SELECT id FROM countries WHERE code = 'VE'), true),
('Carabobo', 'VE-G', (SELECT id FROM countries WHERE code = 'VE'), true),
('Cojedes', 'VE-H', (SELECT id FROM countries WHERE code = 'VE'), true),
('Delta Amacuro', 'VE-Y', (SELECT id FROM countries WHERE code = 'VE'), true),
('Falcón', 'VE-I', (SELECT id FROM countries WHERE code = 'VE'), true),
('Guárico', 'VE-J', (SELECT id FROM countries WHERE code = 'VE'), true),
('Lara', 'VE-K', (SELECT id FROM countries WHERE code = 'VE'), true),
('Mérida', 'VE-L', (SELECT id FROM countries WHERE code = 'VE'), true),
('Miranda', 'VE-M', (SELECT id FROM countries WHERE code = 'VE'), true),
('Monagas', 'VE-N', (SELECT id FROM countries WHERE code = 'VE'), true),
('Nueva Esparta', 'VE-O', (SELECT id FROM countries WHERE code = 'VE'), true),
('Portuguesa', 'VE-P', (SELECT id FROM countries WHERE code = 'VE'), true),
('Sucre', 'VE-R', (SELECT id FROM countries WHERE code = 'VE'), true),
('Táchira', 'VE-S', (SELECT id FROM countries WHERE code = 'VE'), true),
('Trujillo', 'VE-T', (SELECT id FROM countries WHERE code = 'VE'), true),
('Vargas', 'VE-W', (SELECT id FROM countries WHERE code = 'VE'), true),
('Yaracuy', 'VE-U', (SELECT id FROM countries WHERE code = 'VE'), true),
('Zulia', 'VE-V', (SELECT id FROM countries WHERE code = 'VE'), true),
('Distrito Capital', 'VE-A', (SELECT id FROM countries WHERE code = 'VE'), true);

-- Add "Otro" state for all non-Hispanic American countries
INSERT INTO states (name, code, country_id, active)
SELECT 'Otro', CONCAT(country.code, '-OT'), country.id, true
FROM countries country
WHERE country.code NOT IN (
  'GT', 'SV', 'HN', 'NI', 'CR', 'PA',  -- Central America
  'AR', 'CL', 'CO', 'EC', 'PE', 'VE',  -- South America
  'MX', 'US'  -- Already existing
) AND country.code NOT IN (
  SELECT DISTINCT c.code FROM countries c
  WHERE c.name IN ('Guatemala', 'El Salvador', 'Honduras', 'Nicaragua', 'Costa Rica', 'Panamá',
                   'Argentina', 'Chile', 'Colombia', 'Ecuador', 'Perú', 'Venezuela',
                   'México', 'Estados Unidos')
);
