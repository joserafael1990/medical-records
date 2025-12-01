-- ============================================================================
-- SISTEMA DE HISTORIAS CLÍNICAS ELECTRÓNICAS
-- Script de inserción de datos maestros
-- ============================================================================

-- ============================================================================
-- TIPOS DE CITAS
-- ============================================================================

INSERT INTO appointment_types (id, name, is_active, created_at) VALUES 
(1, 'Presencial', true, NOW()),
(2, 'En línea', true, NOW())
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    is_active = EXCLUDED.is_active;

-- ============================================================================
-- PAÍSES
-- ============================================================================

INSERT INTO countries (id, name, phone_code, is_active, created_at) VALUES
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
    is_active = EXCLUDED.is_active;

-- ============================================================================
-- ESTADOS DE MÉXICO
-- ============================================================================

INSERT INTO states (id, name, country_id, is_active, created_at) VALUES
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
    is_active = EXCLUDED.is_active;

-- ============================================================================
-- ESTADOS DE ESTADOS UNIDOS
-- ============================================================================

INSERT INTO states (id, name, country_id, is_active, created_at) VALUES
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
    is_active = EXCLUDED.is_active;

-- ============================================================================
-- COMUNIDADES AUTÓNOMAS DE ESPAÑA
-- ============================================================================

INSERT INTO states (id, name, country_id, is_active, created_at) VALUES
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
    is_active = EXCLUDED.is_active;

-- ============================================================================
-- PROVINCIAS DE ARGENTINA
-- ============================================================================

INSERT INTO states (id, name, country_id, is_active, created_at) VALUES
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
    is_active = EXCLUDED.is_active;

-- ============================================================================
-- DEPARTAMENTOS DE COLOMBIA
-- ============================================================================

INSERT INTO states (id, name, country_id, is_active, created_at) VALUES
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
    is_active = EXCLUDED.is_active;

-- ============================================================================
-- REGIONES DE CHILE
-- ============================================================================

INSERT INTO states (id, name, country_id, is_active, created_at) VALUES
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
    is_active = EXCLUDED.is_active;

-- ============================================================================
-- DEPARTAMENTOS DE PERÚ
-- ============================================================================

INSERT INTO states (id, name, country_id, is_active, created_at) VALUES
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
    is_active = EXCLUDED.is_active;

-- ============================================================================
-- ESTADOS DE VENEZUELA
-- ============================================================================

INSERT INTO states (id, name, country_id, is_active, created_at) VALUES
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
    is_active = EXCLUDED.is_active;

-- ============================================================================
-- PROVINCIAS DE ECUADOR
-- ============================================================================

INSERT INTO states (id, name, country_id, is_active, created_at) VALUES
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
    is_active = EXCLUDED.is_active;

-- ============================================================================
-- DEPARTAMENTOS DE URUGUAY
-- ============================================================================

INSERT INTO states (id, name, country_id, is_active, created_at) VALUES
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
    is_active = EXCLUDED.is_active;

-- ============================================================================
-- DEPARTAMENTOS DE PARAGUAY
-- ============================================================================

INSERT INTO states (id, name, country_id, is_active, created_at) VALUES
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
    is_active = EXCLUDED.is_active;

-- ============================================================================
-- DEPARTAMENTOS DE BOLIVIA
-- ============================================================================

INSERT INTO states (id, name, country_id, is_active, created_at) VALUES
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
    is_active = EXCLUDED.is_active;

-- ============================================================================
-- DEPARTAMENTOS DE GUATEMALA
-- ============================================================================

INSERT INTO states (id, name, country_id, is_active, created_at) VALUES
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
    is_active = EXCLUDED.is_active;

-- ============================================================================
-- DEPARTAMENTOS DE HONDURAS
-- ============================================================================

INSERT INTO states (id, name, country_id, is_active, created_at) VALUES
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
    is_active = EXCLUDED.is_active;

-- ============================================================================
-- DEPARTAMENTOS DE EL SALVADOR
-- ============================================================================

INSERT INTO states (id, name, country_id, is_active, created_at) VALUES
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
    is_active = EXCLUDED.is_active;

-- ============================================================================
-- DEPARTAMENTOS DE NICARAGUA
-- ============================================================================

INSERT INTO states (id, name, country_id, is_active, created_at) VALUES
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
    is_active = EXCLUDED.is_active;

-- ============================================================================
-- PROVINCIAS DE COSTA RICA
-- ============================================================================

INSERT INTO states (id, name, country_id, is_active, created_at) VALUES
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
    is_active = EXCLUDED.is_active;

-- ============================================================================
-- PROVINCIAS DE PANAMÁ
-- ============================================================================

INSERT INTO states (id, name, country_id, is_active, created_at) VALUES
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
    is_active = EXCLUDED.is_active;

-- ============================================================================
-- PROVINCIAS DE REPÚBLICA DOMINICANA
-- ============================================================================

INSERT INTO states (id, name, country_id, is_active, created_at) VALUES
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
    is_active = EXCLUDED.is_active;

-- ============================================================================
-- ESTADO PARA PAÍS "OTRO"
-- ============================================================================

INSERT INTO states (id, name, country_id, is_active, created_at) VALUES
(413, 'Otro', 22, true, NOW())
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    country_id = EXCLUDED.country_id,
    is_active = EXCLUDED.is_active;

-- ============================================================================
-- RELACIONES DE EMERGENCIA
-- ============================================================================

INSERT INTO emergency_relationships (code, name, is_active, created_at) VALUES
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
    is_active = EXCLUDED.is_active;

-- ============================================================================
-- ESPECIALIDADES MÉDICAS
-- ============================================================================

INSERT INTO medical_specialties (id, name, is_active, created_at) VALUES
(1, 'Medicina General', true, NOW()),
(2, 'Cardiología', true, NOW()),
(3, 'Dermatología', true, NOW()),
(4, 'Endocrinología', true, NOW()),
(5, 'Gastroenterología', true, NOW()),
(6, 'Ginecología', true, NOW()),
(7, 'Hematología', true, NOW()),
(8, 'Infectología', true, NOW()),
(9, 'Medicina Interna', true, NOW()),
(10, 'Nefrología', true, NOW()),
(11, 'Neurología', true, NOW()),
(12, 'Obstetricia', true, NOW()),
(13, 'Oftalmología', true, NOW()),
(14, 'Oncología', true, NOW()),
(15, 'Ortopedia', true, NOW()),
(16, 'Otorrinolaringología', true, NOW()),
(17, 'Pediatría', true, NOW()),
(18, 'Psiquiatría', true, NOW()),
(19, 'Psicología', true, NOW()),
(20, 'Radiología', true, NOW()),
(21, 'Reumatología', true, NOW()),
(22, 'Traumatología', true, NOW()),
(23, 'Urología', true, NOW()),
(24, 'Anestesiología', true, NOW()),
(25, 'Cirugía General', true, NOW()),
(26, 'Cirugía Plástica', true, NOW()),
(27, 'Cirugía Cardiovascular', true, NOW()),
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    is_active = EXCLUDED.is_active;

-- ============================================================================
-- CATEGORÍAS DE ESTUDIOS CLÍNICOS
-- ============================================================================

-- ============================================================================
-- ESTUDIOS CLÍNICOS - CATÁLOGO
-- ============================================================================

-- ============================================================================
-- ESPECIALIDADES MÉDICAS ADICIONALES
-- ============================================================================
-- Las especialidades se insertan en la tabla medical_specialties (ver arriba)

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
(9, 'Índice de Masa Corporal', NOW())
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name;

-- ============================================================================
-- FIN DEL SCRIPT BASE
-- ============================================================================

-- ============================================================================
-- INCLUIR ARCHIVOS DE DATOS MAESTROS COMPLETOS
-- ============================================================================

-- Incluir 1000 medicamentos comunes

-- Incluir 500 diagnósticos CIE-10 con categorías

-- Los estudios clínicos ya se insertaron arriba en las líneas 737-742

-- ============================================================================
-- FIN DEL SCRIPT COMPLETO DE DATOS MAESTROS
-- ============================================================================
