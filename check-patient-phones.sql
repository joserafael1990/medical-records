-- Ver pacientes con sus números de teléfono
SELECT 
    id,
    CONCAT(first_name, ' ', paternal_surname, ' ', COALESCE(maternal_surname, '')) as nombre_completo,
    primary_phone as telefono,
    CASE 
        WHEN primary_phone IS NULL THEN '❌ Sin teléfono'
        WHEN LENGTH(primary_phone) < 10 THEN '⚠️ Teléfono inválido'
        ELSE '✅ OK'
    END as estado
FROM persons
WHERE person_type = 'patient'
ORDER BY id DESC
LIMIT 10;
