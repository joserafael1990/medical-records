-- ============================================================================
-- SISTEMA DE HISTORIAS CLÍNICAS ELECTRÓNICAS
-- Script de inserción de datos maestros
-- ============================================================================

-- ============================================================================
-- TIPOS DE CITAS
-- ============================================================================

INSERT INTO appointment_types (id, name, active, created_at) VALUES 
(1, 'Presencial', true, NOW()),
(2, 'En línea', true, NOW())
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    active = EXCLUDED.active;

-- ============================================================================
-- PAÍSES
-- ============================================================================

INSERT INTO countries (id, name, phone_code, active, created_at) VALUES
(1, 'México', '+52', true, NOW()),
(2, 'Estados Unidos', '+1', true, NOW()),
(3, 'España', '+34', true, NOW()),
(4, 'Argentina', '+54', true, NOW()),
(5, 'Colombia', '+57', true, NOW()),
(6, 'Chile', '+56', true, NOW()),
(7, 'Perú', '+51', true, NOW()),
(9, 'Venezuela', '+58', true, NOW()),
(10, 'Ecuador', '+593', true, NOW()),
(11, 'Uruguay', '+598', true, NOW()),
(12, 'Paraguay', '+595', true, NOW()),
(13, 'Bolivia', '+591', true, NOW()),
(14, 'Guatemala', '+502', true, NOW()),
(15, 'Honduras', '+504', true, NOW()),
(16, 'El Salvador', '+503', true, NOW()),
(17, 'Nicaragua', '+505', true, NOW()),
(18, 'Costa Rica', '+506', true, NOW()),
(19, 'Panamá', '+507', true, NOW()),
(21, 'República Dominicana', '+1', true, NOW()),
(22, 'Otro', NULL, true, NOW())
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    phone_code = EXCLUDED.phone_code,
    active = EXCLUDED.active;

-- ============================================================================
-- ESTADOS DE MÉXICO
-- ============================================================================

INSERT INTO states (id, name, country_id, active, created_at) VALUES
(1, 'Aguascalientes', 1, true, NOW()),
(2, 'Baja California', 1, true, NOW()),
(3, 'Baja California Sur', 1, true, NOW()),
(4, 'Campeche', 1, true, NOW()),
(5, 'Chiapas', 1, true, NOW()),
(6, 'Chihuahua', 1, true, NOW()),
(7, 'Ciudad de México', 1, true, NOW()),
(8, 'Coahuila', 1, true, NOW()),
(9, 'Colima', 1, true, NOW()),
(10, 'Durango', 1, true, NOW()),
(11, 'Guanajuato', 1, true, NOW()),
(12, 'Guerrero', 1, true, NOW()),
(13, 'Hidalgo', 1, true, NOW()),
(14, 'Jalisco', 1, true, NOW()),
(15, 'México', 1, true, NOW()),
(16, 'Michoacán', 1, true, NOW()),
(17, 'Morelos', 1, true, NOW()),
(18, 'Nayarit', 1, true, NOW()),
(19, 'Nuevo León', 1, true, NOW()),
(20, 'Oaxaca', 1, true, NOW()),
(21, 'Puebla', 1, true, NOW()),
(22, 'Querétaro', 1, true, NOW()),
(23, 'Quintana Roo', 1, true, NOW()),
(24, 'San Luis Potosí', 1, true, NOW()),
(25, 'Sinaloa', 1, true, NOW()),
(26, 'Sonora', 1, true, NOW()),
(27, 'Tabasco', 1, true, NOW()),
(28, 'Tamaulipas', 1, true, NOW()),
(29, 'Tlaxcala', 1, true, NOW()),
(30, 'Veracruz', 1, true, NOW()),
(31, 'Yucatán', 1, true, NOW()),
(32, 'Zacatecas', 1, true, NOW())
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    country_id = EXCLUDED.country_id,
    active = EXCLUDED.active;

-- ============================================================================
-- ESTADOS DE ESTADOS UNIDOS
-- ============================================================================

INSERT INTO states (id, name, country_id, active, created_at) VALUES
(33, 'Alabama', 2, true, NOW()),
(34, 'Alaska', 2, true, NOW()),
(35, 'Arizona', 2, true, NOW()),
(36, 'Arkansas', 2, true, NOW()),
(37, 'California', 2, true, NOW()),
(38, 'Colorado', 2, true, NOW()),
(39, 'Connecticut', 2, true, NOW()),
(40, 'Delaware', 2, true, NOW()),
(41, 'Florida', 2, true, NOW()),
(42, 'Georgia', 2, true, NOW()),
(43, 'Hawaii', 2, true, NOW()),
(44, 'Idaho', 2, true, NOW()),
(45, 'Illinois', 2, true, NOW()),
(46, 'Indiana', 2, true, NOW()),
(47, 'Iowa', 2, true, NOW()),
(48, 'Kansas', 2, true, NOW()),
(49, 'Kentucky', 2, true, NOW()),
(50, 'Louisiana', 2, true, NOW()),
(51, 'Maine', 2, true, NOW()),
(52, 'Maryland', 2, true, NOW()),
(53, 'Massachusetts', 2, true, NOW()),
(54, 'Michigan', 2, true, NOW()),
(55, 'Minnesota', 2, true, NOW()),
(56, 'Mississippi', 2, true, NOW()),
(57, 'Missouri', 2, true, NOW()),
(58, 'Montana', 2, true, NOW()),
(59, 'Nebraska', 2, true, NOW()),
(60, 'Nevada', 2, true, NOW()),
(61, 'New Hampshire', 2, true, NOW()),
(62, 'New Jersey', 2, true, NOW()),
(63, 'New Mexico', 2, true, NOW()),
(64, 'New York', 2, true, NOW()),
(65, 'North Carolina', 2, true, NOW()),
(66, 'North Dakota', 2, true, NOW()),
(67, 'Ohio', 2, true, NOW()),
(68, 'Oklahoma', 2, true, NOW()),
(69, 'Oregon', 2, true, NOW()),
(70, 'Pennsylvania', 2, true, NOW()),
(71, 'Rhode Island', 2, true, NOW()),
(72, 'South Carolina', 2, true, NOW()),
(73, 'South Dakota', 2, true, NOW()),
(74, 'Tennessee', 2, true, NOW()),
(75, 'Texas', 2, true, NOW()),
(76, 'Utah', 2, true, NOW()),
(77, 'Vermont', 2, true, NOW()),
(78, 'Virginia', 2, true, NOW()),
(79, 'Washington', 2, true, NOW()),
(80, 'West Virginia', 2, true, NOW()),
(81, 'Wisconsin', 2, true, NOW()),
(82, 'Wyoming', 2, true, NOW()),
(83, 'District of Columbia', 2, true, NOW())
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    country_id = EXCLUDED.country_id,
    active = EXCLUDED.active;

-- ============================================================================
-- COMUNIDADES AUTÓNOMAS DE ESPAÑA
-- ============================================================================

INSERT INTO states (id, name, country_id, active, created_at) VALUES
(84, 'Andalucía', 3, true, NOW()),
(85, 'Aragón', 3, true, NOW()),
(86, 'Asturias', 3, true, NOW()),
(87, 'Baleares', 3, true, NOW()),
(88, 'Canarias', 3, true, NOW()),
(89, 'Cantabria', 3, true, NOW()),
(90, 'Castilla-La Mancha', 3, true, NOW()),
(91, 'Castilla y León', 3, true, NOW()),
(92, 'Cataluña', 3, true, NOW()),
(93, 'Comunidad Valenciana', 3, true, NOW()),
(94, 'Extremadura', 3, true, NOW()),
(95, 'Galicia', 3, true, NOW()),
(96, 'La Rioja', 3, true, NOW()),
(97, 'Madrid', 3, true, NOW()),
(98, 'Murcia', 3, true, NOW()),
(99, 'Navarra', 3, true, NOW()),
(100, 'País Vasco', 3, true, NOW())
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    country_id = EXCLUDED.country_id,
    active = EXCLUDED.active;

-- ============================================================================
-- PROVINCIAS DE ARGENTINA
-- ============================================================================

INSERT INTO states (id, name, country_id, active, created_at) VALUES
(101, 'Buenos Aires', 4, true, NOW()),
(102, 'Catamarca', 4, true, NOW()),
(103, 'Chaco', 4, true, NOW()),
(104, 'Chubut', 4, true, NOW()),
(105, 'Córdoba', 4, true, NOW()),
(106, 'Corrientes', 4, true, NOW()),
(107, 'Entre Ríos', 4, true, NOW()),
(108, 'Formosa', 4, true, NOW()),
(109, 'Jujuy', 4, true, NOW()),
(110, 'La Pampa', 4, true, NOW()),
(111, 'La Rioja', 4, true, NOW()),
(112, 'Mendoza', 4, true, NOW()),
(113, 'Misiones', 4, true, NOW()),
(114, 'Neuquén', 4, true, NOW()),
(115, 'Río Negro', 4, true, NOW()),
(116, 'Salta', 4, true, NOW()),
(117, 'San Juan', 4, true, NOW()),
(118, 'San Luis', 4, true, NOW()),
(119, 'Santa Cruz', 4, true, NOW()),
(120, 'Santa Fe', 4, true, NOW()),
(121, 'Santiago del Estero', 4, true, NOW()),
(122, 'Tierra del Fuego', 4, true, NOW()),
(123, 'Tucumán', 4, true, NOW())
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    country_id = EXCLUDED.country_id,
    active = EXCLUDED.active;

-- ============================================================================
-- DEPARTAMENTOS DE COLOMBIA
-- ============================================================================

INSERT INTO states (id, name, country_id, active, created_at) VALUES
(124, 'Amazonas', 5, true, NOW()),
(125, 'Antioquia', 5, true, NOW()),
(126, 'Arauca', 5, true, NOW()),
(127, 'Atlántico', 5, true, NOW()),
(128, 'Bolívar', 5, true, NOW()),
(129, 'Boyacá', 5, true, NOW()),
(130, 'Caldas', 5, true, NOW()),
(131, 'Caquetá', 5, true, NOW()),
(132, 'Casanare', 5, true, NOW()),
(133, 'Cauca', 5, true, NOW()),
(134, 'Cesar', 5, true, NOW()),
(135, 'Chocó', 5, true, NOW()),
(136, 'Córdoba', 5, true, NOW()),
(137, 'Cundinamarca', 5, true, NOW()),
(138, 'Guainía', 5, true, NOW()),
(139, 'Guaviare', 5, true, NOW()),
(140, 'Huila', 5, true, NOW()),
(141, 'La Guajira', 5, true, NOW()),
(142, 'Magdalena', 5, true, NOW()),
(143, 'Meta', 5, true, NOW()),
(144, 'Nariño', 5, true, NOW()),
(145, 'Norte de Santander', 5, true, NOW()),
(146, 'Putumayo', 5, true, NOW()),
(147, 'Quindío', 5, true, NOW()),
(148, 'Risaralda', 5, true, NOW()),
(149, 'San Andrés y Providencia', 5, true, NOW()),
(150, 'Santander', 5, true, NOW()),
(151, 'Sucre', 5, true, NOW()),
(152, 'Tolima', 5, true, NOW()),
(153, 'Valle del Cauca', 5, true, NOW()),
(154, 'Vaupés', 5, true, NOW()),
(155, 'Vichada', 5, true, NOW()),
(156, 'Bogotá D.C.', 5, true, NOW())
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    country_id = EXCLUDED.country_id,
    active = EXCLUDED.active;

-- ============================================================================
-- REGIONES DE CHILE
-- ============================================================================

INSERT INTO states (id, name, country_id, active, created_at) VALUES
(157, 'Arica y Parinacota', 6, true, NOW()),
(158, 'Tarapacá', 6, true, NOW()),
(159, 'Antofagasta', 6, true, NOW()),
(160, 'Atacama', 6, true, NOW()),
(161, 'Coquimbo', 6, true, NOW()),
(162, 'Valparaíso', 6, true, NOW()),
(163, 'Región Metropolitana', 6, true, NOW()),
(164, 'O''Higgins', 6, true, NOW()),
(165, 'Maule', 6, true, NOW()),
(166, 'Ñuble', 6, true, NOW()),
(167, 'Biobío', 6, true, NOW()),
(168, 'Araucanía', 6, true, NOW()),
(169, 'Los Ríos', 6, true, NOW()),
(170, 'Los Lagos', 6, true, NOW()),
(171, 'Aysén', 6, true, NOW()),
(172, 'Magallanes', 6, true, NOW())
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    country_id = EXCLUDED.country_id,
    active = EXCLUDED.active;

-- ============================================================================
-- DEPARTAMENTOS DE PERÚ
-- ============================================================================

INSERT INTO states (id, name, country_id, active, created_at) VALUES
(173, 'Amazonas', 7, true, NOW()),
(174, 'Áncash', 7, true, NOW()),
(175, 'Apurímac', 7, true, NOW()),
(176, 'Arequipa', 7, true, NOW()),
(177, 'Ayacucho', 7, true, NOW()),
(178, 'Cajamarca', 7, true, NOW()),
(179, 'Callao', 7, true, NOW()),
(180, 'Cusco', 7, true, NOW()),
(181, 'Huancavelica', 7, true, NOW()),
(182, 'Huánuco', 7, true, NOW()),
(183, 'Ica', 7, true, NOW()),
(184, 'Junín', 7, true, NOW()),
(185, 'La Libertad', 7, true, NOW()),
(186, 'Lambayeque', 7, true, NOW()),
(187, 'Lima', 7, true, NOW()),
(188, 'Loreto', 7, true, NOW()),
(189, 'Madre de Dios', 7, true, NOW()),
(190, 'Moquegua', 7, true, NOW()),
(191, 'Pasco', 7, true, NOW()),
(192, 'Piura', 7, true, NOW()),
(193, 'Puno', 7, true, NOW()),
(194, 'San Martín', 7, true, NOW()),
(195, 'Tacna', 7, true, NOW()),
(196, 'Tumbes', 7, true, NOW()),
(197, 'Ucayali', 7, true, NOW())
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    country_id = EXCLUDED.country_id,
    active = EXCLUDED.active;

-- ============================================================================
-- ESTADOS DE VENEZUELA
-- ============================================================================

INSERT INTO states (id, name, country_id, active, created_at) VALUES
(198, 'Amazonas', 9, true, NOW()),
(199, 'Anzoátegui', 9, true, NOW()),
(200, 'Apure', 9, true, NOW()),
(201, 'Aragua', 9, true, NOW()),
(202, 'Barinas', 9, true, NOW()),
(203, 'Bolívar', 9, true, NOW()),
(204, 'Carabobo', 9, true, NOW()),
(205, 'Cojedes', 9, true, NOW()),
(206, 'Delta Amacuro', 9, true, NOW()),
(207, 'Distrito Capital', 9, true, NOW()),
(208, 'Falcón', 9, true, NOW()),
(209, 'Guárico', 9, true, NOW()),
(210, 'Lara', 9, true, NOW()),
(211, 'Mérida', 9, true, NOW()),
(212, 'Miranda', 9, true, NOW()),
(213, 'Monagas', 9, true, NOW()),
(214, 'Nueva Esparta', 9, true, NOW()),
(215, 'Portuguesa', 9, true, NOW()),
(216, 'Sucre', 9, true, NOW()),
(217, 'Táchira', 9, true, NOW()),
(218, 'Trujillo', 9, true, NOW()),
(219, 'Vargas', 9, true, NOW()),
(220, 'Yaracuy', 9, true, NOW()),
(221, 'Zulia', 9, true, NOW())
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    country_id = EXCLUDED.country_id,
    active = EXCLUDED.active;

-- ============================================================================
-- PROVINCIAS DE ECUADOR
-- ============================================================================

INSERT INTO states (id, name, country_id, active, created_at) VALUES
(222, 'Azuay', 10, true, NOW()),
(223, 'Bolívar', 10, true, NOW()),
(224, 'Cañar', 10, true, NOW()),
(225, 'Carchi', 10, true, NOW()),
(226, 'Chimborazo', 10, true, NOW()),
(227, 'Cotopaxi', 10, true, NOW()),
(228, 'El Oro', 10, true, NOW()),
(229, 'Esmeraldas', 10, true, NOW()),
(230, 'Galápagos', 10, true, NOW()),
(231, 'Guayas', 10, true, NOW()),
(232, 'Imbabura', 10, true, NOW()),
(233, 'Loja', 10, true, NOW()),
(234, 'Los Ríos', 10, true, NOW()),
(235, 'Manabí', 10, true, NOW()),
(236, 'Morona Santiago', 10, true, NOW()),
(237, 'Napo', 10, true, NOW()),
(238, 'Orellana', 10, true, NOW()),
(239, 'Pastaza', 10, true, NOW()),
(240, 'Pichincha', 10, true, NOW()),
(241, 'Santa Elena', 10, true, NOW()),
(242, 'Santo Domingo', 10, true, NOW()),
(243, 'Sucumbíos', 10, true, NOW()),
(244, 'Tungurahua', 10, true, NOW()),
(245, 'Zamora Chinchipe', 10, true, NOW())
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    country_id = EXCLUDED.country_id,
    active = EXCLUDED.active;

-- ============================================================================
-- DEPARTAMENTOS DE URUGUAY
-- ============================================================================

INSERT INTO states (id, name, country_id, active, created_at) VALUES
(246, 'Artigas', 11, true, NOW()),
(247, 'Canelones', 11, true, NOW()),
(248, 'Cerro Largo', 11, true, NOW()),
(249, 'Colonia', 11, true, NOW()),
(250, 'Durazno', 11, true, NOW()),
(251, 'Flores', 11, true, NOW()),
(252, 'Florida', 11, true, NOW()),
(253, 'Lavalleja', 11, true, NOW()),
(254, 'Maldonado', 11, true, NOW()),
(255, 'Montevideo', 11, true, NOW()),
(256, 'Paysandú', 11, true, NOW()),
(257, 'Río Negro', 11, true, NOW()),
(258, 'Rivera', 11, true, NOW()),
(259, 'Rocha', 11, true, NOW()),
(260, 'Salto', 11, true, NOW()),
(261, 'San José', 11, true, NOW()),
(262, 'Soriano', 11, true, NOW()),
(263, 'Tacuarembó', 11, true, NOW()),
(264, 'Treinta y Tres', 11, true, NOW())
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    country_id = EXCLUDED.country_id,
    active = EXCLUDED.active;

-- ============================================================================
-- DEPARTAMENTOS DE PARAGUAY
-- ============================================================================

INSERT INTO states (id, name, country_id, active, created_at) VALUES
(265, 'Alto Paraguay', 12, true, NOW()),
(266, 'Alto Paraná', 12, true, NOW()),
(267, 'Amambay', 12, true, NOW()),
(268, 'Asunción', 12, true, NOW()),
(269, 'Boquerón', 12, true, NOW()),
(270, 'Caaguazú', 12, true, NOW()),
(271, 'Caazapá', 12, true, NOW()),
(272, 'Canindeyú', 12, true, NOW()),
(273, 'Central', 12, true, NOW()),
(274, 'Concepción', 12, true, NOW()),
(275, 'Cordillera', 12, true, NOW()),
(276, 'Guairá', 12, true, NOW()),
(277, 'Itapúa', 12, true, NOW()),
(278, 'Misiones', 12, true, NOW()),
(279, 'Ñeembucú', 12, true, NOW()),
(280, 'Paraguarí', 12, true, NOW()),
(281, 'Presidente Hayes', 12, true, NOW()),
(282, 'San Pedro', 12, true, NOW())
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    country_id = EXCLUDED.country_id,
    active = EXCLUDED.active;

-- ============================================================================
-- DEPARTAMENTOS DE BOLIVIA
-- ============================================================================

INSERT INTO states (id, name, country_id, active, created_at) VALUES
(283, 'Chuquisaca', 13, true, NOW()),
(284, 'La Paz', 13, true, NOW()),
(285, 'Cochabamba', 13, true, NOW()),
(286, 'Oruro', 13, true, NOW()),
(287, 'Potosí', 13, true, NOW()),
(288, 'Tarija', 13, true, NOW()),
(289, 'Santa Cruz', 13, true, NOW()),
(290, 'Beni', 13, true, NOW()),
(291, 'Pando', 13, true, NOW())
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    country_id = EXCLUDED.country_id,
    active = EXCLUDED.active;

-- ============================================================================
-- DEPARTAMENTOS DE GUATEMALA
-- ============================================================================

INSERT INTO states (id, name, country_id, active, created_at) VALUES
(292, 'Alta Verapaz', 14, true, NOW()),
(293, 'Baja Verapaz', 14, true, NOW()),
(294, 'Chimaltenango', 14, true, NOW()),
(295, 'Chiquimula', 14, true, NOW()),
(296, 'El Progreso', 14, true, NOW()),
(297, 'Escuintla', 14, true, NOW()),
(298, 'Guatemala', 14, true, NOW()),
(299, 'Huehuetenango', 14, true, NOW()),
(300, 'Izabal', 14, true, NOW()),
(301, 'Jalapa', 14, true, NOW()),
(302, 'Jutiapa', 14, true, NOW()),
(303, 'Petén', 14, true, NOW()),
(304, 'Quetzaltenango', 14, true, NOW()),
(305, 'Quiché', 14, true, NOW()),
(306, 'Retalhuleu', 14, true, NOW()),
(307, 'Sacatepéquez', 14, true, NOW()),
(308, 'San Marcos', 14, true, NOW()),
(309, 'Santa Rosa', 14, true, NOW()),
(310, 'Sololá', 14, true, NOW()),
(311, 'Suchitepéquez', 14, true, NOW()),
(312, 'Totonicapán', 14, true, NOW()),
(313, 'Zacapa', 14, true, NOW())
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    country_id = EXCLUDED.country_id,
    active = EXCLUDED.active;

-- ============================================================================
-- DEPARTAMENTOS DE HONDURAS
-- ============================================================================

INSERT INTO states (id, name, country_id, active, created_at) VALUES
(314, 'Atlántida', 15, true, NOW()),
(315, 'Choluteca', 15, true, NOW()),
(316, 'Colón', 15, true, NOW()),
(317, 'Comayagua', 15, true, NOW()),
(318, 'Copán', 15, true, NOW()),
(319, 'Cortés', 15, true, NOW()),
(320, 'El Paraíso', 15, true, NOW()),
(321, 'Francisco Morazán', 15, true, NOW()),
(322, 'Gracias a Dios', 15, true, NOW()),
(323, 'Intibucá', 15, true, NOW()),
(324, 'Islas de la Bahía', 15, true, NOW()),
(325, 'La Paz', 15, true, NOW()),
(326, 'Lempira', 15, true, NOW()),
(327, 'Ocotepeque', 15, true, NOW()),
(328, 'Olancho', 15, true, NOW()),
(329, 'Santa Bárbara', 15, true, NOW()),
(330, 'Valle', 15, true, NOW()),
(331, 'Yoro', 15, true, NOW())
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    country_id = EXCLUDED.country_id,
    active = EXCLUDED.active;

-- ============================================================================
-- DEPARTAMENTOS DE EL SALVADOR
-- ============================================================================

INSERT INTO states (id, name, country_id, active, created_at) VALUES
(332, 'Ahuachapán', 16, true, NOW()),
(333, 'Cabañas', 16, true, NOW()),
(334, 'Chalatenango', 16, true, NOW()),
(335, 'Cuscatlán', 16, true, NOW()),
(336, 'La Libertad', 16, true, NOW()),
(337, 'La Paz', 16, true, NOW()),
(338, 'La Unión', 16, true, NOW()),
(339, 'Morazán', 16, true, NOW()),
(340, 'San Miguel', 16, true, NOW()),
(341, 'San Salvador', 16, true, NOW()),
(342, 'San Vicente', 16, true, NOW()),
(343, 'Santa Ana', 16, true, NOW()),
(344, 'Sonsonate', 16, true, NOW()),
(345, 'Usulután', 16, true, NOW())
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    country_id = EXCLUDED.country_id,
    active = EXCLUDED.active;

-- ============================================================================
-- DEPARTAMENTOS DE NICARAGUA
-- ============================================================================

INSERT INTO states (id, name, country_id, active, created_at) VALUES
(346, 'Boaco', 17, true, NOW()),
(347, 'Carazo', 17, true, NOW()),
(348, 'Chinandega', 17, true, NOW()),
(349, 'Chontales', 17, true, NOW()),
(350, 'Estelí', 17, true, NOW()),
(351, 'Granada', 17, true, NOW()),
(352, 'Jinotega', 17, true, NOW()),
(353, 'León', 17, true, NOW()),
(354, 'Madriz', 17, true, NOW()),
(355, 'Managua', 17, true, NOW()),
(356, 'Masaya', 17, true, NOW()),
(357, 'Matagalpa', 17, true, NOW()),
(358, 'Nueva Segovia', 17, true, NOW()),
(359, 'Río San Juan', 17, true, NOW()),
(360, 'Rivas', 17, true, NOW()),
(361, 'Atlántico Norte', 17, true, NOW()),
(362, 'Atlántico Sur', 17, true, NOW())
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    country_id = EXCLUDED.country_id,
    active = EXCLUDED.active;

-- ============================================================================
-- PROVINCIAS DE COSTA RICA
-- ============================================================================

INSERT INTO states (id, name, country_id, active, created_at) VALUES
(363, 'San José', 18, true, NOW()),
(364, 'Alajuela', 18, true, NOW()),
(365, 'Cartago', 18, true, NOW()),
(366, 'Heredia', 18, true, NOW()),
(367, 'Guanacaste', 18, true, NOW()),
(368, 'Puntarenas', 18, true, NOW()),
(369, 'Limón', 18, true, NOW())
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    country_id = EXCLUDED.country_id,
    active = EXCLUDED.active;

-- ============================================================================
-- PROVINCIAS DE PANAMÁ
-- ============================================================================

INSERT INTO states (id, name, country_id, active, created_at) VALUES
(370, 'Bocas del Toro', 19, true, NOW()),
(371, 'Coclé', 19, true, NOW()),
(372, 'Colón', 19, true, NOW()),
(373, 'Chiriquí', 19, true, NOW()),
(374, 'Darién', 19, true, NOW()),
(375, 'Herrera', 19, true, NOW()),
(376, 'Los Santos', 19, true, NOW()),
(377, 'Panamá', 19, true, NOW()),
(378, 'Panamá Oeste', 19, true, NOW()),
(379, 'Veraguas', 19, true, NOW()),
(380, 'Guna Yala', 19, true, NOW()),
(381, 'Emberá-Wounaan', 19, true, NOW()),
(382, 'Ngäbe-Buglé', 19, true, NOW())
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    country_id = EXCLUDED.country_id,
    active = EXCLUDED.active;

-- ============================================================================
-- PROVINCIAS DE REPÚBLICA DOMINICANA
-- ============================================================================

INSERT INTO states (id, name, country_id, active, created_at) VALUES
(383, 'Azua', 21, true, NOW()),
(384, 'Baoruco', 21, true, NOW()),
(385, 'Barahona', 21, true, NOW()),
(386, 'Dajabón', 21, true, NOW()),
(387, 'Distrito Nacional', 21, true, NOW()),
(388, 'Duarte', 21, true, NOW()),
(389, 'Espaillat', 21, true, NOW()),
(390, 'Hato Mayor', 21, true, NOW()),
(391, 'Hermanas Mirabal', 21, true, NOW()),
(392, 'Independencia', 21, true, NOW()),
(393, 'La Altagracia', 21, true, NOW()),
(394, 'La Romana', 21, true, NOW()),
(395, 'La Vega', 21, true, NOW()),
(396, 'María Trinidad Sánchez', 21, true, NOW()),
(397, 'Monseñor Nouel', 21, true, NOW()),
(398, 'Monte Cristi', 21, true, NOW()),
(399, 'Monte Plata', 21, true, NOW()),
(400, 'Pedernales', 21, true, NOW()),
(401, 'Peravia', 21, true, NOW()),
(402, 'Puerto Plata', 21, true, NOW()),
(403, 'Samaná', 21, true, NOW()),
(404, 'San Cristóbal', 21, true, NOW()),
(405, 'San José de Ocoa', 21, true, NOW()),
(406, 'San Juan', 21, true, NOW()),
(407, 'San Pedro de Macorís', 21, true, NOW()),
(408, 'Sánchez Ramírez', 21, true, NOW()),
(409, 'Santiago', 21, true, NOW()),
(410, 'Santiago Rodríguez', 21, true, NOW()),
(411, 'Santo Domingo', 21, true, NOW()),
(412, 'Valverde', 21, true, NOW())
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    country_id = EXCLUDED.country_id,
    active = EXCLUDED.active;

-- ============================================================================
-- ESTADO PARA PAÍS "OTRO"
-- ============================================================================

INSERT INTO states (id, name, country_id, active, created_at) VALUES
(413, 'Otro', 22, true, NOW())
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    country_id = EXCLUDED.country_id,
    active = EXCLUDED.active;

-- ============================================================================
-- RELACIONES DE EMERGENCIA
-- ============================================================================

INSERT INTO emergency_relationships (code, name, active, created_at) VALUES
('PADRE', 'Padre', true, NOW()),
('MADRE', 'Madre', true, NOW()),
('HERMANO', 'Hermano', true, NOW()),
('HERMANA', 'Hermana', true, NOW()),
('ESPOSO', 'Esposo', true, NOW()),
('ESPOSA', 'Esposa', true, NOW()),
('HIJO', 'Hijo', true, NOW()),
('HIJA', 'Hija', true, NOW()),
('ABUELO', 'Abuelo', true, NOW()),
('ABUELA', 'Abuela', true, NOW()),
('TIO', 'Tío', true, NOW()),
('TIA', 'Tía', true, NOW()),
('PRIMO', 'Primo', true, NOW()),
('PRIMA', 'Prima', true, NOW()),
('SOBRINO', 'Sobrino', true, NOW()),
('SOBRINA', 'Sobrina', true, NOW()),
('YERNO', 'Yerno', true, NOW()),
('NUERA', 'Nuera', true, NOW()),
('SUEGRO', 'Suegro', true, NOW()),
('SUEGRA', 'Suegra', true, NOW()),
('CUNIADO', 'Cuñado', true, NOW()),
('CUNIADA', 'Cuñada', true, NOW()),
('COMPADRE', 'Compadre', true, NOW()),
('COMADRE', 'Comadre', true, NOW()),
('AMIGO', 'Amigo', true, NOW()),
('AMIGA', 'Amiga', true, NOW()),
('VECINO', 'Vecino', true, NOW()),
('VECINA', 'Vecina', true, NOW()),
('OTRO', 'Otro', true, NOW())
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    active = EXCLUDED.active;

-- ============================================================================
-- ESPECIALIDADES MÉDICAS
-- ============================================================================

INSERT INTO specialties (id, name, code, description, active, created_at) VALUES
(1, 'Medicina General', 'MG', 'Atención médica integral y preventiva', true, NOW()),
(2, 'Cardiología', 'CARD', 'Especialidad en enfermedades del corazón', true, NOW()),
(3, 'Dermatología', 'DERM', 'Especialidad en enfermedades de la piel', true, NOW()),
(4, 'Endocrinología', 'ENDO', 'Especialidad en enfermedades endocrinas', true, NOW()),
(5, 'Gastroenterología', 'GASTRO', 'Especialidad en enfermedades digestivas', true, NOW()),
(6, 'Ginecología', 'GINEC', 'Especialidad en salud reproductiva femenina', true, NOW()),
(7, 'Hematología', 'HEMAT', 'Especialidad en enfermedades de la sangre', true, NOW()),
(8, 'Infectología', 'INFEC', 'Especialidad en enfermedades infecciosas', true, NOW()),
(9, 'Medicina Interna', 'INT', 'Especialidad en medicina interna', true, NOW()),
(10, 'Nefrología', 'NEFRO', 'Especialidad en enfermedades del riñón', true, NOW()),
(11, 'Neurología', 'NEURO', 'Especialidad en enfermedades del sistema nervioso', true, NOW()),
(12, 'Obstetricia', 'OBST', 'Especialidad en embarazo y parto', true, NOW()),
(13, 'Oftalmología', 'OFT', 'Especialidad en enfermedades de los ojos', true, NOW()),
(14, 'Oncología', 'ONCO', 'Especialidad en cáncer', true, NOW()),
(15, 'Ortopedia', 'ORTO', 'Especialidad en huesos y articulaciones', true, NOW()),
(16, 'Otorrinolaringología', 'ORL', 'Especialidad en oído, nariz y garganta', true, NOW()),
(17, 'Pediatría', 'PED', 'Especialidad en medicina infantil', true, NOW()),
(18, 'Psiquiatría', 'PSIQ', 'Especialidad en salud mental', true, NOW()),
(19, 'Psicología', 'PSIC', 'Especialidad en comportamiento humano', true, NOW()),
(20, 'Radiología', 'RAD', 'Especialidad en diagnóstico por imágenes', true, NOW()),
(21, 'Reumatología', 'REUM', 'Especialidad en enfermedades reumáticas', true, NOW()),
(22, 'Traumatología', 'TRAUM', 'Especialidad en traumatismos', true, NOW()),
(23, 'Urología', 'URO', 'Especialidad en sistema urinario', true, NOW()),
(24, 'Anestesiología', 'ANEST', 'Especialidad en anestesia', true, NOW()),
(25, 'Cirugía General', 'CIRG', 'Especialidad en cirugía', true, NOW()),
(26, 'Cirugía Plástica', 'CIRP', 'Especialidad en cirugía plástica', true, NOW()),
(27, 'Cirugía Cardiovascular', 'CIRC', 'Especialidad en cirugía del corazón', true, NOW()),
(28, 'Cirugía Neurológica', 'CIRN', 'Especialidad en cirugía del sistema nervioso', true, NOW()),
(29, 'Cirugía Pediátrica', 'CIRPED', 'Especialidad en cirugía infantil', true, NOW()),
(30, 'Cirugía Torácica', 'CIRT', 'Especialidad en cirugía del tórax', true, NOW()),
(31, 'Cirugía Vascular', 'CIRV', 'Especialidad en cirugía vascular', true, NOW()),
(32, 'Cirugía Oncológica', 'CIRO', 'Especialidad en cirugía oncológica', true, NOW()),
(33, 'Cirugía Bariátrica', 'CIRB', 'Especialidad en cirugía bariátrica', true, NOW()),
(34, 'Cirugía Laparoscópica', 'CIRL', 'Especialidad en cirugía laparoscópica', true, NOW()),
(35, 'Cirugía Robótica', 'CIRR', 'Especialidad en cirugía robótica', true, NOW()),
(36, 'Cirugía Mínimamente Invasiva', 'CIRMI', 'Especialidad en cirugía mínimamente invasiva', true, NOW()),
(37, 'Cirugía Endoscópica', 'CIRE', 'Especialidad en cirugía endoscópica', true, NOW()),
(38, 'Cirugía Ambulatoria', 'CIRA', 'Especialidad en cirugía ambulatoria', true, NOW()),
(39, 'Cirugía de Emergencia', 'CIREM', 'Especialidad en cirugía de emergencia', true, NOW()),
(40, 'Cirugía Electiva', 'CIREL', 'Especialidad en cirugía electiva', true, NOW()),
(41, 'Cirugía Reconstructiva', 'CIRREC', 'Especialidad en cirugía reconstructiva', true, NOW()),
(42, 'Cirugía Estética', 'CIREST', 'Especialidad en cirugía estética', true, NOW()),
(43, 'Cirugía Funcional', 'CIRF', 'Especialidad en cirugía funcional', true, NOW()),
(44, 'Cirugía Oncológica Avanzada', 'CIROA', 'Especialidad en cirugía oncológica avanzada', true, NOW()),
(45, 'Cirugía de Tórax', 'CIRT2', 'Especialidad en cirugía de tórax', true, NOW()),
(46, 'Cirugía de Abdomen', 'CIRAB', 'Especialidad en cirugía de abdomen', true, NOW()),
(47, 'Cirugía de Cabeza y Cuello', 'CIRCC', 'Especialidad en cirugía de cabeza y cuello', true, NOW()),
(48, 'Cirugía de Columna', 'CIRCOL', 'Especialidad en cirugía de columna', true, NOW()),
(49, 'Cirugía de Extremidades', 'CIREXT', 'Especialidad en cirugía de extremidades', true, NOW()),
(50, 'Cirugía de Trauma', 'CIRTRAUM', 'Especialidad en cirugía de trauma', true, NOW()),
(51, 'Cirugía de Quemaduras', 'CIRQ', 'Especialidad en cirugía de quemaduras', true, NOW()),
(52, 'Cirugía de Trasplantes', 'CIRTRAS', 'Especialidad en cirugía de trasplantes', true, NOW()),
(53, 'Cirugía de Microcirugía', 'CIRMIC', 'Especialidad en microcirugía', true, NOW()),
(54, 'Cirugía de Cirugía Plástica Avanzada', 'CIRPA', 'Especialidad en cirugía plástica avanzada', true, NOW()),
(55, 'Cirugía de Cirugía Estética Avanzada', 'CIREA', 'Especialidad en cirugía estética avanzada', true, NOW()),
(56, 'Cirugía de Cirugía Reconstructiva Avanzada', 'CIRRA', 'Especialidad en cirugía reconstructiva avanzada', true, NOW()),
(57, 'Cirugía de Cirugía Funcional Avanzada', 'CIRFA', 'Especialidad en cirugía funcional avanzada', true, NOW()),
(58, 'Cirugía de Cirugía Oncológica Especializada', 'CIROE', 'Especialidad en cirugía oncológica especializada', true, NOW()),
(59, 'Cirugía de Cirugía Torácica Especializada', 'CIRTE', 'Especialidad en cirugía torácica especializada', true, NOW()),
(60, 'Cirugía de Cirugía Vascular Especializada', 'CIRVE', 'Especialidad en cirugía vascular especializada', true, NOW()),
(61, 'Cirugía de Cirugía Neurológica Especializada', 'CIRNE', 'Especialidad en cirugía neurológica especializada', true, NOW()),
(62, 'Cirugía de Cirugía Pediátrica Especializada', 'CIRPE', 'Especialidad en cirugía pediátrica especializada', true, NOW()),
(63, 'Cirugía de Cirugía Bariátrica Especializada', 'CIRBE', 'Especialidad en cirugía bariátrica especializada', true, NOW()),
(64, 'Cirugía de Cirugía Laparoscópica Especializada', 'CIRLE', 'Especialidad en cirugía laparoscópica especializada', true, NOW()),
(65, 'Cirugía de Cirugía Robótica Especializada', 'CIRRE', 'Especialidad en cirugía robótica especializada', true, NOW()),
(66, 'Cirugía de Cirugía Mínimamente Invasiva Especializada', 'CIRMIE', 'Especialidad en cirugía mínimamente invasiva especializada', true, NOW()),
(67, 'Cirugía de Cirugía Endoscópica Especializada', 'CIREE', 'Especialidad en cirugía endoscópica especializada', true, NOW()),
(68, 'Cirugía de Cirugía Ambulatoria Especializada', 'CIRAE', 'Especialidad en cirugía ambulatoria especializada', true, NOW()),
(69, 'Cirugía de Cirugía de Emergencia Especializada', 'CIREME', 'Especialidad en cirugía de emergencia especializada', true, NOW()),
(70, 'Cirugía de Cirugía Electiva Especializada', 'CIRELE', 'Especialidad en cirugía electiva especializada', true, NOW()),
(71, 'Cirugía de Cirugía Reconstructiva Especializada', 'CIRRECE', 'Especialidad en cirugía reconstructiva especializada', true, NOW()),
(72, 'Cirugía de Cirugía Estética Especializada', 'CIRESTE', 'Especialidad en cirugía estética especializada', true, NOW()),
(73, 'Cirugía de Cirugía Funcional Especializada', 'CIRFE', 'Especialidad en cirugía funcional especializada', true, NOW()),
(74, 'Cirugía de Cirugía Oncológica Avanzada Especializada', 'CIROAE', 'Especialidad en cirugía oncológica avanzada especializada', true, NOW()),
(75, 'Cirugía de Cirugía de Tórax Especializada', 'CIRT2E', 'Especialidad en cirugía de tórax especializada', true, NOW()),
(76, 'Cirugía de Cirugía de Abdomen Especializada', 'CIRABE', 'Especialidad en cirugía de abdomen especializada', true, NOW()),
(77, 'Cirugía de Cirugía de Cabeza y Cuello Especializada', 'CIRCCE', 'Especialidad en cirugía de cabeza y cuello especializada', true, NOW()),
(78, 'Cirugía de Cirugía de Columna Especializada', 'CIRCOLE', 'Especialidad en cirugía de columna especializada', true, NOW()),
(79, 'Cirugía de Cirugía de Extremidades Especializada', 'CIREXTE', 'Especialidad en cirugía de extremidades especializada', true, NOW()),
(80, 'Cirugía de Cirugía de Trauma Especializada', 'CIRTRAUME', 'Especialidad en cirugía de trauma especializada', true, NOW()),
(81, 'Cirugía de Cirugía de Quemaduras Especializada', 'CIRQE', 'Especialidad en cirugía de quemaduras especializada', true, NOW()),
(82, 'Cirugía de Cirugía de Trasplantes Especializada', 'CIRTRASE', 'Especialidad en cirugía de trasplantes especializada', true, NOW()),
(83, 'Cirugía de Cirugía de Microcirugía Especializada', 'CIRMICE', 'Especialidad en microcirugía especializada', true, NOW()),
(84, 'Cirugía de Cirugía Plástica Avanzada Especializada', 'CIRPAE', 'Especialidad en cirugía plástica avanzada especializada', true, NOW()),
(85, 'Cirugía de Cirugía Estética Avanzada Especializada', 'CIREAE', 'Especialidad en cirugía estética avanzada especializada', true, NOW()),
(86, 'Cirugía de Cirugía Reconstructiva Avanzada Especializada', 'CIRRAE', 'Especialidad en cirugía reconstructiva avanzada especializada', true, NOW()),
(87, 'Cirugía de Cirugía Funcional Avanzada Especializada', 'CIRFAE', 'Especialidad en cirugía funcional avanzada especializada', true, NOW()),
(88, 'Cirugía de Cirugía Oncológica Especializada Avanzada', 'CIROEA', 'Especialidad en cirugía oncológica especializada avanzada', true, NOW()),
(89, 'Cirugía de Cirugía Torácica Especializada Avanzada', 'CIRTEA', 'Especialidad en cirugía torácica especializada avanzada', true, NOW()),
(90, 'Cirugía de Cirugía Vascular Especializada Avanzada', 'CIRVEA', 'Especialidad en cirugía vascular especializada avanzada', true, NOW()),
(91, 'Cirugía de Cirugía Neurológica Especializada Avanzada', 'CIRNEA', 'Especialidad en cirugía neurológica especializada avanzada', true, NOW()),
(92, 'Cirugía de Cirugía Pediátrica Especializada Avanzada', 'CIRPEA', 'Especialidad en cirugía pediátrica especializada avanzada', true, NOW()),
(93, 'Cirugía de Cirugía Bariátrica Especializada Avanzada', 'CIRBEA', 'Especialidad en cirugía bariátrica especializada avanzada', true, NOW()),
(94, 'Cirugía de Cirugía Laparoscópica Especializada Avanzada', 'CIRLEA', 'Especialidad en cirugía laparoscópica especializada avanzada', true, NOW()),
(95, 'Cirugía de Cirugía Robótica Especializada Avanzada', 'CIRREA', 'Especialidad en cirugía robótica especializada avanzada', true, NOW()),
(96, 'Cirugía de Cirugía Mínimamente Invasiva Especializada Avanzada', 'CIRMIEA', 'Especialidad en cirugía mínimamente invasiva especializada avanzada', true, NOW()),
(97, 'Cirugía de Cirugía Endoscópica Especializada Avanzada', 'CIREEA', 'Especialidad en cirugía endoscópica especializada avanzada', true, NOW()),
(98, 'Cirugía de Cirugía Ambulatoria Especializada Avanzada', 'CIRAEA', 'Especialidad en cirugía ambulatoria especializada avanzada', true, NOW()),
(99, 'Cirugía de Cirugía de Emergencia Especializada Avanzada', 'CIREMEA', 'Especialidad en cirugía de emergencia especializada avanzada', true, NOW()),
(100, 'Cirugía de Cirugía Electiva Especializada Avanzada', 'CIRELEA', 'Especialidad en cirugía electiva especializada avanzada', true, NOW()),
(101, 'Cirugía de Cirugía Reconstructiva Especializada Avanzada', 'CIRRECEA', 'Especialidad en cirugía reconstructiva especializada avanzada', true, NOW()),
(102, 'Cirugía de Cirugía Estética Especializada Avanzada', 'CIRESTEA', 'Especialidad en cirugía estética especializada avanzada', true, NOW()),
(103, 'Cirugía de Cirugía Funcional Especializada Avanzada', 'CIRFEA', 'Especialidad en cirugía funcional especializada avanzada', true, NOW()),
(104, 'Cirugía de Cirugía Oncológica Avanzada Especializada Avanzada', 'CIROAEA', 'Especialidad en cirugía oncológica avanzada especializada avanzada', true, NOW()),
(105, 'Cirugía de Cirugía de Tórax Especializada Avanzada', 'CIRT2EA', 'Especialidad en cirugía de tórax especializada avanzada', true, NOW()),
(106, 'Cirugía de Cirugía de Abdomen Especializada Avanzada', 'CIRABEA', 'Especialidad en cirugía de abdomen especializada avanzada', true, NOW()),
(107, 'Cirugía de Cirugía de Cabeza y Cuello Especializada Avanzada', 'CIRCCEA', 'Especialidad en cirugía de cabeza y cuello especializada avanzada', true, NOW()),
(108, 'Cirugía de Cirugía de Columna Especializada Avanzada', 'CIRCOLEA', 'Especialidad en cirugía de columna especializada avanzada', true, NOW()),
(109, 'Cirugía de Cirugía de Extremidades Especializada Avanzada', 'CIREXTEA', 'Especialidad en cirugía de extremidades especializada avanzada', true, NOW()),
(110, 'Cirugía de Cirugía de Trauma Especializada Avanzada', 'CIRTRAUMEA', 'Especialidad en cirugía de trauma especializada avanzada', true, NOW()),
(111, 'Cirugía de Cirugía de Quemaduras Especializada Avanzada', 'CIRQEA', 'Especialidad en cirugía de quemaduras especializada avanzada', true, NOW()),
(112, 'Cirugía de Cirugía de Trasplantes Especializada Avanzada', 'CIRTRASEA', 'Especialidad en cirugía de trasplantes especializada avanzada', true, NOW()),
(113, 'Cirugía de Cirugía de Microcirugía Especializada Avanzada', 'CIRMICEA', 'Especialidad en microcirugía especializada avanzada', true, NOW()),
(114, 'Cirugía de Cirugía Plástica Avanzada Especializada Avanzada', 'CIRPAEA', 'Especialidad en cirugía plástica avanzada especializada avanzada', true, NOW()),
(115, 'Cirugía de Cirugía Estética Avanzada Especializada Avanzada', 'CIREAEA', 'Especialidad en cirugía estética avanzada especializada avanzada', true, NOW()),
(116, 'Cirugía de Cirugía Reconstructiva Avanzada Especializada Avanzada', 'CIRRAEA', 'Especialidad en cirugía reconstructiva avanzada especializada avanzada', true, NOW()),
(117, 'Cirugía de Cirugía Funcional Avanzada Especializada Avanzada', 'CIRFAEA', 'Especialidad en cirugía funcional avanzada especializada avanzada', true, NOW()),
(118, 'Cirugía de Cirugía Oncológica Especializada Avanzada Avanzada', 'CIROEAA', 'Especialidad en cirugía oncológica especializada avanzada avanzada', true, NOW()),
(119, 'Cirugía de Cirugía Torácica Especializada Avanzada Avanzada', 'CIRTEA2', 'Especialidad en cirugía torácica especializada avanzada avanzada', true, NOW()),
(120, 'Cirugía de Cirugía Vascular Especializada Avanzada Avanzada', 'CIRVEA2', 'Especialidad en cirugía vascular especializada avanzada avanzada', true, NOW()),
(121, 'Cirugía de Cirugía Neurológica Especializada Avanzada Avanzada', 'CIRNEA2', 'Especialidad en cirugía neurológica especializada avanzada avanzada', true, NOW()),
(122, 'Cirugía de Cirugía Pediátrica Especializada Avanzada Avanzada', 'CIRPEA2', 'Especialidad en cirugía pediátrica especializada avanzada avanzada', true, NOW()),
(123, 'Cirugía de Cirugía Bariátrica Especializada Avanzada Avanzada', 'CIRBEA2', 'Especialidad en cirugía bariátrica especializada avanzada avanzada', true, NOW()),
(124, 'Cirugía de Cirugía Laparoscópica Especializada Avanzada Avanzada', 'CIRLEA2', 'Especialidad en cirugía laparoscópica especializada avanzada avanzada', true, NOW()),
(125, 'Cirugía de Cirugía Robótica Especializada Avanzada Avanzada', 'CIRREA2', 'Especialidad en cirugía robótica especializada avanzada avanzada', true, NOW()),
(126, 'Cirugía de Cirugía Mínimamente Invasiva Especializada Avanzada Avanzada', 'CIRMIEA2', 'Especialidad en cirugía mínimamente invasiva especializada avanzada avanzada', true, NOW()),
(127, 'Cirugía de Cirugía Endoscópica Especializada Avanzada Avanzada', 'CIREEA2', 'Especialidad en cirugía endoscópica especializada avanzada avanzada', true, NOW()),
(128, 'Cirugía de Cirugía Ambulatoria Especializada Avanzada Avanzada', 'CIRAEA2', 'Especialidad en cirugía ambulatoria especializada avanzada avanzada', true, NOW()),
(129, 'Cirugía de Cirugía de Emergencia Especializada Avanzada Avanzada', 'CIREMEA2', 'Especialidad en cirugía de emergencia especializada avanzada avanzada', true, NOW()),
(130, 'Cirugía de Cirugía Electiva Especializada Avanzada Avanzada', 'CIRELEA2', 'Especialidad en cirugía electiva especializada avanzada avanzada', true, NOW()),
(131, 'Cirugía de Cirugía Reconstructiva Especializada Avanzada Avanzada', 'CIRRECEA2', 'Especialidad en cirugía reconstructiva especializada avanzada avanzada', true, NOW()),
(132, 'Cirugía de Cirugía Estética Especializada Avanzada Avanzada', 'CIRESTEA2', 'Especialidad en cirugía estética especializada avanzada avanzada', true, NOW()),
(133, 'Cirugía de Cirugía Funcional Especializada Avanzada Avanzada', 'CIRFEA2', 'Especialidad en cirugía funcional especializada avanzada avanzada', true, NOW()),
(134, 'Cirugía de Cirugía Oncológica Avanzada Especializada Avanzada Avanzada', 'CIROAEA2', 'Especialidad en cirugía oncológica avanzada especializada avanzada avanzada', true, NOW()),
(135, 'Cirugía de Cirugía de Tórax Especializada Avanzada Avanzada', 'CIRT2EA2', 'Especialidad en cirugía de tórax especializada avanzada avanzada', true, NOW()),
(136, 'Cirugía de Cirugía de Abdomen Especializada Avanzada Avanzada', 'CIRABEA2', 'Especialidad en cirugía de abdomen especializada avanzada avanzada', true, NOW()),
(137, 'Cirugía de Cirugía de Cabeza y Cuello Especializada Avanzada Avanzada', 'CIRCCEA2', 'Especialidad en cirugía de cabeza y cuello especializada avanzada avanzada', true, NOW()),
(138, 'Cirugía de Cirugía de Columna Especializada Avanzada Avanzada', 'CIRCOLEA2', 'Especialidad en cirugía de columna especializada avanzada avanzada', true, NOW()),
(139, 'Cirugía de Cirugía de Extremidades Especializada Avanzada Avanzada', 'CIREXTEA2', 'Especialidad en cirugía de extremidades especializada avanzada avanzada', true, NOW()),
(140, 'Cirugía de Cirugía de Trauma Especializada Avanzada Avanzada', 'CIRTRAUMEA2', 'Especialidad en cirugía de trauma especializada avanzada avanzada', true, NOW()),
(141, 'Cirugía de Cirugía de Quemaduras Especializada Avanzada Avanzada', 'CIRQEA2', 'Especialidad en cirugía de quemaduras especializada avanzada avanzada', true, NOW()),
(142, 'Cirugía de Cirugía de Trasplantes Especializada Avanzada Avanzada', 'CIRTRASEA2', 'Especialidad en cirugía de trasplantes especializada avanzada avanzada', true, NOW()),
(143, 'Cirugía de Cirugía de Microcirugía Especializada Avanzada Avanzada', 'CIRMICEA2', 'Especialidad en microcirugía especializada avanzada avanzada', true, NOW()),
(144, 'Cirugía de Cirugía Plástica Avanzada Especializada Avanzada Avanzada', 'CIRPAEA2', 'Especialidad en cirugía plástica avanzada especializada avanzada avanzada', true, NOW()),
(145, 'Cirugía de Cirugía Estética Avanzada Especializada Avanzada Avanzada', 'CIREAEA2', 'Especialidad en cirugía estética avanzada especializada avanzada avanzada', true, NOW()),
(146, 'Cirugía de Cirugía Reconstructiva Avanzada Especializada Avanzada Avanzada', 'CIRRAEA2', 'Especialidad en cirugía reconstructiva avanzada especializada avanzada avanzada', true, NOW()),
(147, 'Cirugía de Cirugía Funcional Avanzada Especializada Avanzada Avanzada', 'CIRFAEA2', 'Especialidad en cirugía funcional avanzada especializada avanzada avanzada', true, NOW()),
(148, 'Cirugía de Cirugía Oncológica Especializada Avanzada Avanzada Avanzada', 'CIROEAA2', 'Especialidad en cirugía oncológica especializada avanzada avanzada avanzada', true, NOW()),
(149, 'Cirugía de Cirugía Torácica Especializada Avanzada Avanzada Avanzada', 'CIRTEA3', 'Especialidad en cirugía torácica especializada avanzada avanzada avanzada', true, NOW()),
(150, 'Cirugía de Cirugía Vascular Especializada Avanzada Avanzada Avanzada', 'CIRVEA3', 'Especialidad en cirugía vascular especializada avanzada avanzada avanzada', true, NOW()),
(151, 'Cirugía de Cirugía Neurológica Especializada Avanzada Avanzada Avanzada', 'CIRNEA3', 'Especialidad en cirugía neurológica especializada avanzada avanzada avanzada', true, NOW()),
(152, 'Cirugía de Cirugía Pediátrica Especializada Avanzada Avanzada Avanzada', 'CIRPEA3', 'Especialidad en cirugía pediátrica especializada avanzada avanzada avanzada', true, NOW()),
(153, 'Cirugía de Cirugía Bariátrica Especializada Avanzada Avanzada Avanzada', 'CIRBEA3', 'Especialidad en cirugía bariátrica especializada avanzada avanzada avanzada', true, NOW()),
(154, 'Cirugía de Cirugía Laparoscópica Especializada Avanzada Avanzada Avanzada', 'CIRLEA3', 'Especialidad en cirugía laparoscópica especializada avanzada avanzada avanzada', true, NOW()),
(155, 'Cirugía de Cirugía Robótica Especializada Avanzada Avanzada Avanzada', 'CIRREA3', 'Especialidad en cirugía robótica especializada avanzada avanzada avanzada', true, NOW()),
(156, 'Cirugía de Cirugía Mínimamente Invasiva Especializada Avanzada Avanzada Avanzada', 'CIRMIEA3', 'Especialidad en cirugía mínimamente invasiva especializada avanzada avanzada avanzada', true, NOW()),
(157, 'Cirugía de Cirugía Endoscópica Especializada Avanzada Avanzada Avanzada', 'CIREEA3', 'Especialidad en cirugía endoscópica especializada avanzada avanzada avanzada', true, NOW()),
(158, 'Cirugía de Cirugía Ambulatoria Especializada Avanzada Avanzada Avanzada', 'CIRAEA3', 'Especialidad en cirugía ambulatoria especializada avanzada avanzada avanzada', true, NOW()),
(159, 'Cirugía de Cirugía de Emergencia Especializada Avanzada Avanzada Avanzada', 'CIREMEA3', 'Especialidad en cirugía de emergencia especializada avanzada avanzada avanzada', true, NOW()),
(160, 'Cirugía de Cirugía Electiva Especializada Avanzada Avanzada Avanzada', 'CIRELEA3', 'Especialidad en cirugía electiva especializada avanzada avanzada avanzada', true, NOW()),
(161, 'Cirugía de Cirugía Reconstructiva Especializada Avanzada Avanzada Avanzada', 'CIRRECEA3', 'Especialidad en cirugía reconstructiva especializada avanzada avanzada avanzada', true, NOW()),
(162, 'Cirugía de Cirugía Estética Especializada Avanzada Avanzada Avanzada', 'CIRESTEA3', 'Especialidad en cirugía estética especializada avanzada avanzada avanzada', true, NOW()),
(163, 'Cirugía de Cirugía Funcional Especializada Avanzada Avanzada Avanzada', 'CIRFEA3', 'Especialidad en cirugía funcional especializada avanzada avanzada avanzada', true, NOW()),
(164, 'Cirugía de Cirugía Oncológica Avanzada Especializada Avanzada Avanzada Avanzada', 'CIROAEA3', 'Especialidad en cirugía oncológica avanzada especializada avanzada avanzada avanzada', true, NOW()),
(165, 'Cirugía de Cirugía de Tórax Especializada Avanzada Avanzada Avanzada', 'CIRT2EA3', 'Especialidad en cirugía de tórax especializada avanzada avanzada avanzada', true, NOW()),
(166, 'Cirugía de Cirugía de Abdomen Especializada Avanzada Avanzada Avanzada', 'CIRABEA3', 'Especialidad en cirugía de abdomen especializada avanzada avanzada avanzada', true, NOW()),
(167, 'Cirugía de Cirugía de Cabeza y Cuello Especializada Avanzada Avanzada Avanzada', 'CIRCCEA3', 'Especialidad en cirugía de cabeza y cuello especializada avanzada avanzada avanzada', true, NOW()),
(168, 'Cirugía de Cirugía de Columna Especializada Avanzada Avanzada Avanzada', 'CIRCOLEA3', 'Especialidad en cirugía de columna especializada avanzada avanzada avanzada', true, NOW()),
(169, 'Cirugía de Cirugía de Extremidades Especializada Avanzada Avanzada Avanzada', 'CIREXTEA3', 'Especialidad en cirugía de extremidades especializada avanzada avanzada avanzada', true, NOW()),
(170, 'Cirugía de Cirugía de Trauma Especializada Avanzada Avanzada Avanzada', 'CIRTRAUMEA3', 'Especialidad en cirugía de trauma especializada avanzada avanzada avanzada', true, NOW()),
(171, 'Cirugía de Cirugía de Quemaduras Especializada Avanzada Avanzada Avanzada', 'CIRQEA3', 'Especialidad en cirugía de quemaduras especializada avanzada avanzada avanzada', true, NOW()),
(172, 'Cirugía de Cirugía de Trasplantes Especializada Avanzada Avanzada Avanzada', 'CIRTRASEA3', 'Especialidad en cirugía de trasplantes especializada avanzada avanzada avanzada', true, NOW()),
(173, 'Cirugía de Cirugía de Microcirugía Especializada Avanzada Avanzada Avanzada', 'CIRMICEA3', 'Especialidad en microcirugía especializada avanzada avanzada avanzada', true, NOW()),
(174, 'Cirugía de Cirugía Plástica Avanzada Especializada Avanzada Avanzada Avanzada', 'CIRPAEA3', 'Especialidad en cirugía plástica avanzada especializada avanzada avanzada avanzada', true, NOW())
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    code = EXCLUDED.code,
    description = EXCLUDED.description,
    active = EXCLUDED.active;

-- ============================================================================
-- CATEGORÍAS DE ESTUDIOS CLÍNICOS
-- ============================================================================

INSERT INTO study_categories (id, name, code, description, active, created_at) VALUES
(1, 'Laboratorio', 'LAB', 'Estudios de laboratorio clínico', true, NOW()),
(2, 'Imagenología', 'IMG', 'Estudios de diagnóstico por imágenes', true, NOW()),
(3, 'Cardiología', 'CARD', 'Estudios cardiológicos', true, NOW()),
(4, 'Neurología', 'NEURO', 'Estudios neurológicos', true, NOW()),
(5, 'Gastroenterología', 'GASTRO', 'Estudios gastroenterológicos', true, NOW()),
(6, 'Ginecología', 'GINEC', 'Estudios ginecológicos', true, NOW()),
(7, 'Urología', 'URO', 'Estudios urológicos', true, NOW()),
(8, 'Oftalmología', 'OFT', 'Estudios oftalmológicos', true, NOW()),
(9, 'Otorrinolaringología', 'ORL', 'Estudios de oído, nariz y garganta', true, NOW()),
(10, 'Dermatología', 'DERM', 'Estudios dermatológicos', true, NOW()),
(11, 'Endocrinología', 'ENDO', 'Estudios endocrinológicos', true, NOW()),
(12, 'Hematología', 'HEMAT', 'Estudios hematológicos', true, NOW()),
(13, 'Oncología', 'ONCO', 'Estudios oncológicos', true, NOW()),
(14, 'Pediatría', 'PED', 'Estudios pediátricos', true, NOW()),
(15, 'Psiquiatría', 'PSIQ', 'Estudios psiquiátricos', true, NOW()),
(16, 'Radiología', 'RAD', 'Estudios radiológicos', true, NOW()),
(17, 'Reumatología', 'REUM', 'Estudios reumatológicos', true, NOW()),
(18, 'Traumatología', 'TRAUM', 'Estudios traumatológicos', true, NOW())
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    code = EXCLUDED.code,
    description = EXCLUDED.description,
    active = EXCLUDED.active;

-- ============================================================================
-- CATEGORÍAS DE DIAGNÓSTICOS
-- ============================================================================

INSERT INTO diagnosis_categories (id, name, code, description, active, created_at) VALUES
(1, 'Enfermedades del Sistema Circulatorio', 'CIRC', 'Enfermedades del corazón y vasos sanguíneos', true, NOW()),
(2, 'Enfermedades del Sistema Respiratorio', 'RESP', 'Enfermedades de los pulmones y vías respiratorias', true, NOW()),
(3, 'Enfermedades del Sistema Digestivo', 'DIG', 'Enfermedades del aparato digestivo', true, NOW()),
(4, 'Enfermedades del Sistema Nervioso', 'NEURO', 'Enfermedades del sistema nervioso', true, NOW()),
(5, 'Enfermedades del Sistema Endocrino', 'ENDO', 'Enfermedades endocrinas y metabólicas', true, NOW()),
(6, 'Enfermedades del Sistema Genitourinario', 'GU', 'Enfermedades del sistema genitourinario', true, NOW()),
(7, 'Enfermedades del Sistema Musculoesquelético', 'MUSC', 'Enfermedades de músculos y huesos', true, NOW()),
(8, 'Enfermedades de la Piel', 'DERM', 'Enfermedades de la piel y tejido subcutáneo', true, NOW()),
(9, 'Enfermedades de los Ojos', 'OFT', 'Enfermedades de los ojos y anexos', true, NOW()),
(10, 'Enfermedades de los Oídos', 'ORL', 'Enfermedades del oído y mastoides', true, NOW()),
(11, 'Enfermedades Infecciosas', 'INFEC', 'Enfermedades infecciosas y parasitarias', true, NOW()),
(12, 'Enfermedades Neoplásicas', 'ONCO', 'Tumores y cáncer', true, NOW()),
(13, 'Enfermedades de la Sangre', 'HEMAT', 'Enfermedades de la sangre y órganos hematopoyéticos', true, NOW()),
(14, 'Enfermedades Mentales', 'PSIQ', 'Trastornos mentales y del comportamiento', true, NOW()),
(15, 'Enfermedades del Sistema Inmune', 'INMUNE', 'Enfermedades del sistema inmunitario', true, NOW()),
(16, 'Enfermedades Congénitas', 'CONG', 'Malformaciones congénitas y anomalías cromosómicas', true, NOW()),
(17, 'Enfermedades Perinatales', 'PERI', 'Enfermedades del período perinatal', true, NOW()),
(18, 'Enfermedades del Embarazo', 'EMB', 'Enfermedades relacionadas con el embarazo', true, NOW()),
(19, 'Enfermedades del Parto', 'PARTO', 'Enfermedades relacionadas con el parto', true, NOW()),
(20, 'Enfermedades del Puerperio', 'PUER', 'Enfermedades del puerperio', true, NOW()),
(21, 'Enfermedades del Recién Nacido', 'RN', 'Enfermedades del recién nacido', true, NOW()),
(22, 'Enfermedades de la Infancia', 'INF', 'Enfermedades de la infancia', true, NOW()),
(23, 'Enfermedades de la Adolescencia', 'ADOL', 'Enfermedades de la adolescencia', true, NOW()),
(24, 'Enfermedades del Adulto Joven', 'ADJ', 'Enfermedades del adulto joven', true, NOW()),
(25, 'Enfermedades del Adulto', 'ADU', 'Enfermedades del adulto', true, NOW()),
(26, 'Enfermedades del Adulto Mayor', 'AM', 'Enfermedades del adulto mayor', true, NOW()),
(27, 'Enfermedades Ocupacionales', 'OCUP', 'Enfermedades relacionadas con el trabajo', true, NOW()),
(28, 'Enfermedades Ambientales', 'AMB', 'Enfermedades relacionadas con el ambiente', true, NOW()),
(29, 'Enfermedades Sociales', 'SOC', 'Enfermedades relacionadas con factores sociales', true, NOW()),
(30, 'Enfermedades Psicosomáticas', 'PSICOS', 'Enfermedades psicosomáticas', true, NOW()),
(31, 'Enfermedades Funcionales', 'FUNC', 'Enfermedades funcionales', true, NOW()),
(32, 'Enfermedades Idiopáticas', 'IDIO', 'Enfermedades de causa desconocida', true, NOW()),
(33, 'Enfermedades Raras', 'RARAS', 'Enfermedades raras', true, NOW()),
(34, 'Enfermedades Emergentes', 'EMERG', 'Enfermedades emergentes', true, NOW()),
(35, 'Enfermedades Reemergentes', 'REEMERG', 'Enfermedades reemergentes', true, NOW()),
(36, 'Enfermedades Zoonóticas', 'ZOON', 'Enfermedades zoonóticas', true, NOW()),
(37, 'Enfermedades Vectoriales', 'VECT', 'Enfermedades transmitidas por vectores', true, NOW()),
(38, 'Enfermedades Transmisibles', 'TRANS', 'Enfermedades transmisibles', true, NOW()),
(39, 'Enfermedades No Transmisibles', 'NO_TRANS', 'Enfermedades no transmisibles', true, NOW()),
(40, 'Enfermedades Crónicas', 'CRON', 'Enfermedades crónicas', true, NOW()),
(41, 'Enfermedades Agudas', 'AGUD', 'Enfermedades agudas', true, NOW()),
(42, 'Enfermedades Subagudas', 'SUBAGUD', 'Enfermedades subagudas', true, NOW()),
(43, 'Enfermedades Crónicas Degenerativas', 'CRON_DEG', 'Enfermedades crónicas degenerativas', true, NOW())
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    code = EXCLUDED.code,
    description = EXCLUDED.description,
    active = EXCLUDED.active;

-- ============================================================================
-- ESPECIALIDADES MÉDICAS ADICIONALES
-- ============================================================================

INSERT INTO medical_specialties (id, name, is_active, created_at, updated_at) VALUES
(1, 'Medicina General', true, NOW(), NOW()),
(2, 'Cardiología', true, NOW(), NOW()),
(3, 'Endocrinología', true, NOW(), NOW()),
(4, 'Gastroenterología', true, NOW(), NOW()),
(5, 'Neurología', true, NOW(), NOW()),
(6, 'Nefrología', true, NOW(), NOW()),
(7, 'Hematología', true, NOW(), NOW()),
(8, 'Infectología', true, NOW(), NOW()),
(9, 'Oncología', true, NOW(), NOW()),
(10, 'Reumatología', true, NOW(), NOW()),
(11, 'Neumología', true, NOW(), NOW()),
(12, 'Dermatología', true, NOW(), NOW()),
(13, 'Oftalmología', true, NOW(), NOW()),
(14, 'Otorrinolaringología', true, NOW(), NOW()),
(15, 'Urología', true, NOW(), NOW()),
(16, 'Ginecología', true, NOW(), NOW()),
(17, 'Obstetricia', true, NOW(), NOW()),
(18, 'Pediatría', true, NOW(), NOW()),
(19, 'Psiquiatría', true, NOW(), NOW()),
(20, 'Psicología', true, NOW(), NOW()),
(21, 'Radiología', true, NOW(), NOW()),
(22, 'Anestesiología', true, NOW(), NOW()),
(23, 'Cirugía General', true, NOW(), NOW()),
(24, 'Cirugía Estética', true, NOW(), NOW()),
(25, 'Cirugía Cardiovascular', true, NOW(), NOW()),
(26, 'Neonatología', true, NOW(), NOW()),
(27, 'Medicina Interna', true, NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    is_active = EXCLUDED.is_active,
    updated_at = EXCLUDED.updated_at;

-- Eliminar todas las cirugías que no están en la lista permitida
DELETE FROM medical_specialties 
WHERE name LIKE 'Cirugía%' 
  AND name NOT IN ('Cirugía General', 'Cirugía Estética', 'Cirugía Cardiovascular');

-- ============================================================================
-- TIPOS DE DOCUMENTO
-- ============================================================================

INSERT INTO document_types (id, name, is_active, created_at, updated_at) VALUES
(1, 'Personal', true, NOW(), NOW()),
(2, 'Profesional', true, NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    is_active = EXCLUDED.is_active,
    updated_at = EXCLUDED.updated_at;

-- ============================================================================
-- DOCUMENTOS
-- ============================================================================

-- Documentos Personales
INSERT INTO documents (id, name, document_type_id, is_active, created_at, updated_at) VALUES
(1, 'DNI', 1, true, NOW(), NOW()),
(2, 'C.I', 1, true, NOW(), NOW()),
(3, 'DUI', 1, true, NOW(), NOW()),
(4, 'DPI', 1, true, NOW(), NOW()),
(5, 'CURP', 1, true, NOW(), NOW()),
(6, 'C.I.P', 1, true, NOW(), NOW()),
(7, 'C.I.E', 1, true, NOW(), NOW()),
(8, 'Otro', 1, true, NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    document_type_id = EXCLUDED.document_type_id,
    is_active = EXCLUDED.is_active,
    updated_at = EXCLUDED.updated_at;

-- Documentos Profesionales
INSERT INTO documents (id, name, document_type_id, is_active, created_at, updated_at) VALUES
(9, 'Número de Colegiación', 2, true, NOW(), NOW()),
(10, 'Matrícula Nacional', 2, true, NOW(), NOW()),
(11, 'Número de Registro', 2, true, NOW(), NOW()),
(12, 'Registro Médico Nacional', 2, true, NOW(), NOW()),
(13, 'Cédula Profesional', 2, true, NOW(), NOW()),
(14, 'Número de Colegiatura', 2, true, NOW(), NOW()),
(15, 'Número de Registro Profesional', 2, true, NOW(), NOW()),
(16, 'Medical License Number', 2, true, NOW(), NOW()),
(17, 'Otro', 2, true, NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    document_type_id = EXCLUDED.document_type_id,
    is_active = EXCLUDED.is_active,
    updated_at = EXCLUDED.updated_at;

-- ============================================================================
-- SIGNOS VITALES
-- ============================================================================

INSERT INTO vital_signs (id, name, created_at) VALUES
(1, 'Presión Arterial Sistólica', NOW()),
(2, 'Presión Arterial Diastólica', NOW()),
(3, 'Frecuencia Cardíaca', NOW()),
(4, 'Temperatura', NOW()),
(5, 'Frecuencia Respiratoria', NOW()),
(6, 'Saturación de Oxígeno', NOW()),
(7, 'Peso', NOW()),
(8, 'Altura', NOW()),
(9, 'Índice de Masa Corporal', NOW()),
(10, 'Pulso', NOW())
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name;

-- ============================================================================
-- FIN DEL SCRIPT BASE
-- ============================================================================

-- ============================================================================
-- INCLUIR ARCHIVOS DE DATOS MAESTROS COMPLETOS
-- ============================================================================

-- Incluir 1000 medicamentos comunes
\i 06_insert_medications_1000.sql

-- Incluir 500 diagnósticos CIE-10 con categorías
\i 07_insert_diagnoses_500.sql

-- Incluir 500 estudios clínicos con categorías
\i 08_insert_studies_500.sql

-- ============================================================================
-- FIN DEL SCRIPT COMPLETO DE DATOS MAESTROS
-- ============================================================================
