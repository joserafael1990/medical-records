-- ====================================================================================
-- MIGRACIÓN: Cambiar birth_place a birth_city en la tabla persons
-- ====================================================================================
-- Este script renombra la columna birth_place a birth_city en la tabla persons
-- Fecha: 2025-09-24
-- ====================================================================================

-- 1. Renombrar la columna birth_place a birth_city
ALTER TABLE persons RENAME COLUMN birth_place TO birth_city;

-- 2. Verificar que la columna fue renombrada correctamente
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'persons'
AND column_name = 'birth_city';

-- 3. Mostrar un resumen de los datos migrados
SELECT
    COUNT(*) as total_records,
    COUNT(birth_city) as records_with_birth_city,
    COUNT(CASE WHEN birth_city IS NOT NULL AND birth_city != '' THEN 1 END) as records_with_data
FROM persons;

-- ====================================================================================
-- FIN DE LA MIGRACIÓN
-- ====================================================================================
-- Después de ejecutar este script:
-- 1. Todos los datos de birth_place ahora están en birth_city
-- 2. El código del frontend y backend ya está actualizado
-- 3. Las aplicaciones usarán el nuevo nombre de campo
-- ====================================================================================

