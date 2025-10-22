-- ============================================================================
-- LIMPIEZA DE DATOS DE ESTADOS - HISTORIAS CLÍNICAS
-- ============================================================================
-- Este script documentaa la limpieza realizada en la base de datos de estados
-- Fecha: 2025-10-22
-- Propósito: Eliminar estados ficticios y duplicados, asignar country_id correctos
-- ============================================================================

-- ============================================================================
-- PASO 1: Verificar estados problemáticos antes de la limpieza
-- ============================================================================

-- Ver estados con country_id NULL
SELECT id, name, country_id 
FROM states 
WHERE country_id IS NULL
ORDER BY name;

-- Ver estados duplicados
SELECT name, country_id, COUNT(*) as cantidad
FROM states
GROUP BY name, country_id
HAVING COUNT(*) > 1
ORDER BY cantidad DESC, name;

-- Ver estados ficticios
SELECT id, name, country_id
FROM states
WHERE name IN ('Nacional', 'No Aplica')
ORDER BY name, country_id;

-- ============================================================================
-- PASO 2: Asignar country_id correcto a estados sin país
-- ============================================================================

-- Estados de Brasil (country_id = 8)
UPDATE states SET country_id = 8 
WHERE country_id IS NULL AND name IN (
    'Acre', 'Alagoas', 'Amapá', 'Bahía', 'Ceará', 
    'Espírito Santo', 'Goiás', 'Maranhão', 'Mato Grosso', 
    'Mato Grosso do Sul', 'Minas Gerais', 'Pará', 'Paraíba', 
    'Paraná', 'Pernambuco', 'Piauí', 'Río de Janeiro', 
    'Rio Grande do Norte', 'Rio Grande do Sul', 'Rondônia', 
    'Roraima', 'Santa Catarina', 'São Paulo', 'Sergipe', 'Tocantins'
);

-- Distrito Federal de Brasil
UPDATE states SET country_id = 8 
WHERE country_id IS NULL AND name = 'Distrito Federal';

-- Amazonas de Brasil (el primero)
UPDATE states SET country_id = 8 
WHERE country_id IS NULL AND name = 'Amazonas' 
AND id IN (
    SELECT id FROM states WHERE name = 'Amazonas' AND country_id IS NULL 
    ORDER BY id LIMIT 1
);

-- Estados de Venezuela (country_id = 9)
UPDATE states SET country_id = 9 
WHERE country_id IS NULL AND name IN (
    'Anzoátegui', 'Apure', 'Aragua', 'Barinas', 'Bolívar', 
    'Carabobo', 'Cojedes', 'Delta Amacuro', 'Distrito Capital', 
    'Falcón', 'Guárico', 'Lara', 'Mérida', 'Miranda', 
    'Monagas', 'Nueva Esparta', 'Portuguesa', 'Sucre', 
    'Táchira', 'Trujillo', 'Vargas', 'Yaracuy', 'Zulia'
);

-- Amazonas de Venezuela (el que queda)
UPDATE states SET country_id = 9 
WHERE country_id IS NULL AND name = 'Amazonas';

-- ============================================================================
-- PASO 3: Eliminar estados duplicados (mantener solo el ID más bajo)
-- ============================================================================

-- Eliminar duplicados (mantiene el ID más bajo de cada grupo)
DELETE FROM states
WHERE id IN (
    SELECT s1.id
    FROM states s1
    WHERE EXISTS (
        SELECT 1 FROM states s2
        WHERE s1.name = s2.name 
        AND s1.country_id = s2.country_id 
        AND s1.id > s2.id
    )
);

-- ============================================================================
-- PASO 4: Eliminar estados ficticios
-- ============================================================================

-- Verificar que nadie usa estos estados antes de eliminar
SELECT COUNT(*) as personas_usando_nacional
FROM persons
WHERE birth_state_id IN (SELECT id FROM states WHERE name IN ('Nacional', 'No Aplica'))
   OR address_state_id IN (SELECT id FROM states WHERE name IN ('Nacional', 'No Aplica'));

-- Eliminar estados ficticios
DELETE FROM states WHERE name = 'Nacional';
DELETE FROM states WHERE name = 'No Aplica';

-- ============================================================================
-- PASO 5: Agregar restricción única para prevenir duplicados futuros
-- ============================================================================

-- Esta restricción previene que se creen estados duplicados en el futuro
ALTER TABLE states 
ADD CONSTRAINT unique_state_per_country 
UNIQUE (name, country_id);

-- ============================================================================
-- VERIFICACIÓN FINAL
-- ============================================================================

-- Verificar que no quedan estados sin país
SELECT COUNT(*) as estados_sin_pais 
FROM states 
WHERE country_id IS NULL;

-- Verificar que no hay duplicados
SELECT 
    'Total de estados' as descripcion,
    COUNT(*) as cantidad
FROM states
UNION ALL
SELECT 
    'Estados únicos' as descripcion,
    COUNT(DISTINCT (name, country_id)) as cantidad
FROM states;

-- Ver distribución final por país
SELECT 
    c.name as pais, 
    COUNT(s.id) as cantidad_estados 
FROM countries c
LEFT JOIN states s ON c.id = s.country_id
WHERE s.id IS NOT NULL
GROUP BY c.id, c.name
ORDER BY cantidad_estados DESC;

-- ============================================================================
-- RESULTADO ESPERADO:
-- ============================================================================
-- - 181 estados reales (sin ficticios, sin duplicados)
-- - Todos los estados tienen country_id asignado
-- - México: 32 estados
-- - Colombia: 33 estados
-- - Brasil: 27 estados
-- - Perú: 25 estados
-- - Argentina: 24 estados
-- - Venezuela: 24 estados
-- - Chile: 16 estados
-- ============================================================================

