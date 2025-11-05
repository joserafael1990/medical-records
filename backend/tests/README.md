# Scripts de Verificación y Pruebas

Este directorio contiene scripts para verificar que el código está alineado con la estructura actual de la base de datos después de las modificaciones recientes.

## Scripts Disponibles

### 1. `quick_db_check.py` (RÁPIDO)
Verificación rápida de la estructura básica de la base de datos.

**Qué verifica:**
- Tablas requeridas existen
- Tablas eliminadas ya no existen
- Estructura de `study_categories` (sin `code` ni `description`)
- Estructura de `study_catalog` (solo campos requeridos)
- Datos en catálogos principales

**Ejecución:**
```bash
# Desde el directorio backend
python tests/quick_db_check.py

# O desde Docker
docker-compose exec python-backend python tests/quick_db_check.py
```

**Uso recomendado:** Ejecutar primero este script para una verificación rápida antes de las pruebas completas.

### 2. `verify_models_alignment.py`
Verifica que los modelos SQLAlchemy están alineados con la estructura real de la base de datos PostgreSQL.

**Qué verifica:**
- Existencia de tablas en la BD vs modelos definidos
- Columnas de cada tabla vs atributos del modelo
- Tipos de datos básicos
- Foreign keys y constraints
- Tablas eliminadas (no deben existir en BD ni tener modelos)

**Ejecución:**
```bash
# Desde el directorio backend
python tests/verify_models_alignment.py

# O desde Docker
docker-compose exec python-backend python tests/verify_models_alignment.py
```

### 3. `verify_endpoints.py`
Verifica que los endpoints del backend responden correctamente.

**Qué verifica:**
- Salud del servidor
- Endpoints de catálogos públicos (países, estados, especialidades, etc.)
- Endpoints autenticados (si hay token disponible)
- Estructura de respuestas JSON

**Ejecución:**
```bash
# Asegúrate de que el servidor esté corriendo
docker-compose up -d python-backend

# Ejecutar pruebas
python tests/verify_endpoints.py

# O desde Docker
docker-compose exec python-backend python tests/verify_endpoints.py

# Configurar URL base si es necesario
export API_BASE_URL=http://localhost:8000
python tests/verify_endpoints.py
```

### 4. `integration_test.py`
Prueba de integración completa que valida el flujo completo de creación de consultas médicas.

**Qué prueba:**
1. Verificación de catálogos disponibles
2. Creación de paciente de prueba
3. Creación de consulta
4. Agregar signos vitales
5. Agregar diagnósticos
6. Agregar prescripciones
7. Agregar estudios clínicos
8. Verificación de que la consulta se recupera completa

**Ejecución:**
```bash
# Requiere autenticación (crear usuario de prueba primero)
python tests/integration_test.py

# O desde Docker
docker-compose exec python-backend python tests/integration_test.py
```

**Nota:** Este script requiere un usuario de prueba. Puedes crear uno manualmente o usar el endpoint de registro.

### 5. `run_all_tests.py`
Script maestro que ejecuta todas las pruebas en secuencia.

**Ejecución:**
```bash
python tests/run_all_tests.py

# O desde Docker
docker-compose exec python-backend python tests/run_all_tests.py
```

## Configuración

### Variables de Entorno

- `DATABASE_URL`: URL de conexión a la base de datos (por defecto: `postgresql://historias_user:historias_pass@postgres-db:5432/historias_clinicas`)
- `API_BASE_URL`: URL base del API (por defecto: `http://localhost:8000`)

### Usuario de Prueba

Para las pruebas de integración, necesitas un usuario de prueba. Puedes crear uno:

1. Usando el endpoint de registro (si está disponible)
2. Directamente en la base de datos:
```sql
INSERT INTO persons (person_code, person_type, first_name, paternal_surname, email, hashed_password, is_active)
VALUES ('DOC001', 'doctor', 'Test', 'Doctor', 'doctor@test.com', '$2b$12$...', true);
```

## Interpretación de Resultados

### ✅ Verificación Exitosa
- Todas las tablas y columnas están alineadas
- Todos los endpoints responden correctamente
- El flujo de integración funciona completo

### ⚠️ Advertencias
- Diferencias menores que no afectan funcionalidad
- Endpoints que requieren autenticación pero no hay token
- Campos opcionales que pueden estar presentes o no

### ❌ Errores
- Tablas o columnas faltantes
- Endpoints que no responden o retornan errores
- Problemas críticos que deben corregirse

## Solución de Problemas

### Error: "No se puede conectar al servidor"
- Verifica que el servidor esté corriendo: `docker-compose ps`
- Verifica que el puerto 8000 esté disponible
- Ajusta `API_BASE_URL` si es necesario

### Error: "No se puede conectar a la base de datos"
- Verifica que PostgreSQL esté corriendo: `docker-compose ps postgres-db`
- Verifica las credenciales en `DATABASE_URL`
- Asegúrate de que la base de datos existe

### Error: "Tabla no existe"
- Ejecuta los scripts de setup inicial: `db_setup/01_create_database_structure.sql`
- Verifica que las migraciones se hayan aplicado

### Error: "401 Unauthorized"
- Crea un usuario de prueba
- Verifica que las credenciales sean correctas
- Algunos endpoints pueden requerir autenticación

## Próximos Pasos

Después de ejecutar estas pruebas:

1. **Si hay errores**: Corregir los problemas identificados
2. **Si hay advertencias**: Evaluar si son críticas o pueden ignorarse
3. **Si todo pasa**: Proceder con las siguientes fases del plan (evaluación arquitectónica, limpieza de deuda técnica)

