# 📅 Guía de Tablas de Horarios del Doctor

## 📋 Índice

1. [Resumen General](#resumen-general)
2. [Tabla: schedule_templates](#1-tabla-schedule_templates)
3. [Tabla: schedule_exceptions](#2-tabla-schedule_exceptions)
4. [Tabla: schedule_slots](#3-tabla-schedule_slots)
5. [Cómo Recrear las Tablas](#cómo-recrear-las-tablas)
6. [Ejemplos de Uso](#ejemplos-de-uso)

---

## Resumen General

El sistema de horarios del doctor consta de **3 tablas principales**:

| Tabla | Propósito | Ejemplo |
|-------|-----------|---------|
| `schedule_templates` | Horarios semanales base | Lunes a Viernes 9:00-18:00 |
| `schedule_exceptions` | Excepciones al horario | Vacaciones, días festivos |
| `schedule_slots` | Espacios específicos para citas | Slot de 9:00-9:30 el 25/Oct |

---

## 1. Tabla: `schedule_templates`

### 📝 Descripción

Define los **horarios base de trabajo** del médico para cada día de la semana.

### 🗂️ Estructura

```sql
CREATE TABLE schedule_templates (
    id SERIAL PRIMARY KEY,
    doctor_id INTEGER NOT NULL,           -- FK a persons
    day_of_week INTEGER NOT NULL,         -- 0=Lun, 1=Mar, ..., 6=Dom
    start_time TIME NOT NULL,             -- Hora de inicio (ej: 09:00)
    end_time TIME NOT NULL,               -- Hora de fin (ej: 18:00)
    consultation_duration INTEGER,        -- Duración consulta (min)
    break_duration INTEGER,               -- Descanso entre consultas
    lunch_start TIME,                     -- Inicio almuerzo
    lunch_end TIME,                       -- Fin almuerzo
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

### 📊 Columnas Importantes

| Columna | Tipo | Descripción | Valores |
|---------|------|-------------|---------|
| `day_of_week` | INTEGER | Día de la semana | 0=Lunes, 1=Martes, ..., 6=Domingo |
| `start_time` | TIME | Hora de inicio | Ej: `09:00` |
| `end_time` | TIME | Hora de fin | Ej: `18:00` |
| `consultation_duration` | INTEGER | Duración de cada cita (minutos) | 15-120 min (default: 30) |
| `break_duration` | INTEGER | Descanso entre citas (minutos) | 0-30 min (default: 5) |
| `lunch_start` | TIME | Inicio de almuerzo | Ej: `14:00` (opcional) |
| `lunch_end` | TIME | Fin de almuerzo | Ej: `15:00` (opcional) |

### 🎯 Ejemplo de Datos

```sql
-- Horario de Lunes a Viernes: 9:00 - 18:00, con almuerzo 14:00-15:00
INSERT INTO schedule_templates 
(doctor_id, day_of_week, start_time, end_time, consultation_duration, break_duration, lunch_start, lunch_end)
VALUES
    (1, 0, '09:00', '18:00', 30, 5, '14:00', '15:00'),  -- Lunes
    (1, 1, '09:00', '18:00', 30, 5, '14:00', '15:00'),  -- Martes
    (1, 2, '09:00', '18:00', 30, 5, '14:00', '15:00'),  -- Miércoles
    (1, 3, '09:00', '18:00', 30, 5, '14:00', '15:00'),  -- Jueves
    (1, 4, '09:00', '18:00', 30, 5, '14:00', '15:00');  -- Viernes

-- Sábado: 9:00 - 14:00 (medio día, sin almuerzo)
INSERT INTO schedule_templates 
(doctor_id, day_of_week, start_time, end_time, consultation_duration, break_duration)
VALUES (1, 5, '09:00', '14:00', 30, 5);  -- Sábado
```

---

## 2. Tabla: `schedule_exceptions`

### 📝 Descripción

Define **excepciones al horario base**: vacaciones, días festivos, horarios especiales, etc.

### 🗂️ Estructura

```sql
CREATE TABLE schedule_exceptions (
    id SERIAL PRIMARY KEY,
    doctor_id INTEGER NOT NULL,           -- FK a persons
    template_id INTEGER,                  -- FK a schedule_templates (opcional)
    exception_date TIMESTAMP NOT NULL,    -- Fecha de la excepción
    exception_type VARCHAR(50) NOT NULL,  -- Tipo: vacation, holiday, etc.
    start_time TIME,                      -- Hora especial de inicio
    end_time TIME,                        -- Hora especial de fin
    is_day_off BOOLEAN DEFAULT FALSE,     -- TRUE = día libre completo
    description TEXT,                     -- Descripción
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

### 📊 Tipos de Excepciones

| `exception_type` | Descripción | Ejemplo |
|------------------|-------------|---------|
| `vacation` | Vacaciones del doctor | "Vacaciones de verano" |
| `holiday` | Día festivo nacional | "1 de Mayo - Día del Trabajo" |
| `sick_leave` | Incapacidad médica | "Reposo médico" |
| `special_hours` | Horario especial | "Hoy salgo a las 12:00" |
| `custom` | Otro tipo de excepción | "Conferencia médica" |

### 🎯 Ejemplo de Datos

```sql
-- Vacaciones del 20 al 30 de Diciembre
INSERT INTO schedule_exceptions 
(doctor_id, exception_date, exception_type, is_day_off, description)
VALUES
    (1, '2024-12-20', 'vacation', TRUE, 'Vacaciones de fin de año'),
    (1, '2024-12-21', 'vacation', TRUE, 'Vacaciones de fin de año'),
    (1, '2024-12-22', 'vacation', TRUE, 'Vacaciones de fin de año');
    -- ... más días

-- Día festivo (1 de Mayo)
INSERT INTO schedule_exceptions 
(doctor_id, exception_date, exception_type, is_day_off, description)
VALUES (1, '2024-05-01', 'holiday', TRUE, 'Día del Trabajo');

-- Horario especial (salir temprano)
INSERT INTO schedule_exceptions 
(doctor_id, exception_date, exception_type, start_time, end_time, is_day_off, description)
VALUES (1, '2024-10-25', 'special_hours', '09:00', '12:00', FALSE, 'Salida temprana - Conferencia médica');
```

---

## 3. Tabla: `schedule_slots`

### 📝 Descripción

Define **espacios de tiempo específicos** para citas, generados a partir de las plantillas.

### 🗂️ Estructura

```sql
CREATE TABLE schedule_slots (
    id SERIAL PRIMARY KEY,
    doctor_id INTEGER NOT NULL,           -- FK a persons
    slot_date TIMESTAMP NOT NULL,         -- Fecha del slot
    start_time TIME NOT NULL,             -- Hora de inicio
    end_time TIME NOT NULL,               -- Hora de fin
    is_available BOOLEAN DEFAULT TRUE,    -- Disponible para agendar
    is_blocked BOOLEAN DEFAULT FALSE,     -- Bloqueado manualmente
    slot_type VARCHAR(30),                -- Tipo de slot
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

### 📊 Tipos de Slots

| `slot_type` | Descripción | `is_available` |
|-------------|-------------|----------------|
| `consultation` | Espacio para consulta | TRUE/FALSE |
| `break` | Descanso entre consultas | FALSE |
| `lunch` | Hora de almuerzo | FALSE |
| `blocked` | Bloqueado manualmente | FALSE |

### 🎯 Ejemplo de Datos

```sql
-- Slots del Lunes 25 de Octubre de 2024 (9:00 - 18:00, almuerzo 14:00-15:00)
INSERT INTO schedule_slots 
(doctor_id, slot_date, start_time, end_time, is_available, slot_type)
VALUES
    (1, '2024-10-25', '09:00', '09:30', TRUE, 'consultation'),
    (1, '2024-10-25', '09:35', '10:05', TRUE, 'consultation'),  -- +5 min descanso
    (1, '2024-10-25', '10:10', '10:40', TRUE, 'consultation'),
    (1, '2024-10-25', '10:45', '11:15', TRUE, 'consultation'),
    (1, '2024-10-25', '11:20', '11:50', TRUE, 'consultation'),
    (1, '2024-10-25', '11:55', '12:25', TRUE, 'consultation'),
    (1, '2024-10-25', '12:30', '13:00', TRUE, 'consultation'),
    (1, '2024-10-25', '13:05', '13:35', TRUE, 'consultation'),
    (1, '2024-10-25', '14:00', '15:00', FALSE, 'lunch'),        -- Almuerzo
    (1, '2024-10-25', '15:00', '15:30', TRUE, 'consultation'),
    (1, '2024-10-25', '15:35', '16:05', TRUE, 'consultation'),
    (1, '2024-10-25', '16:10', '16:40', TRUE, 'consultation'),
    (1, '2024-10-25', '16:45', '17:15', TRUE, 'consultation'),
    (1, '2024-10-25', '17:20', '17:50', TRUE, 'consultation');
```

---

## Cómo Recrear las Tablas

### Opción 1: Usando el Script SQL Directo

```bash
# Conectarse a PostgreSQL
docker exec -it medical-records-main-postgres-db-1 psql -U postgres -d historias_clinicas

# Ejecutar el script SQL
\i /path/to/backend/migrations/recreate_schedule_tables.sql
```

### Opción 2: Usando el Script Python (Recomendado)

```bash
# Sin datos de ejemplo
python backend/migrations/run_recreate_schedule_tables.py

# Con datos de ejemplo para thiago@avant.com
python backend/migrations/run_recreate_schedule_tables.py --with-sample-data
```

### ✅ Verificación

Después de ejecutar el script, verifica que las tablas se crearon correctamente:

```sql
-- Ver las tablas creadas
SELECT tablename FROM pg_tables WHERE tablename LIKE 'schedule%';

-- Resultado esperado:
-- schedule_exceptions
-- schedule_slots
-- schedule_templates

-- Ver la estructura de cada tabla
\d schedule_templates
\d schedule_exceptions
\d schedule_slots
```

---

## Ejemplos de Uso

### 1. Consultar Horarios del Doctor

```sql
-- Ver horarios semanales del doctor ID 1
SELECT 
    day_of_week,
    CASE day_of_week
        WHEN 0 THEN 'Lunes'
        WHEN 1 THEN 'Martes'
        WHEN 2 THEN 'Miércoles'
        WHEN 3 THEN 'Jueves'
        WHEN 4 THEN 'Viernes'
        WHEN 5 THEN 'Sábado'
        WHEN 6 THEN 'Domingo'
    END as dia,
    start_time,
    end_time,
    consultation_duration,
    lunch_start,
    lunch_end
FROM schedule_templates
WHERE doctor_id = 1 AND is_active = TRUE
ORDER BY day_of_week;
```

### 2. Consultar Excepciones Futuras

```sql
-- Ver excepciones futuras del doctor ID 1
SELECT 
    exception_date::date as fecha,
    exception_type as tipo,
    description as descripcion,
    is_day_off as dia_libre
FROM schedule_exceptions
WHERE doctor_id = 1 
  AND exception_date >= CURRENT_DATE
ORDER BY exception_date;
```

### 3. Consultar Slots Disponibles

```sql
-- Ver slots disponibles para la próxima semana
SELECT 
    slot_date::date as fecha,
    start_time,
    end_time,
    is_available,
    slot_type
FROM schedule_slots
WHERE doctor_id = 1 
  AND slot_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'
  AND is_available = TRUE
  AND slot_type = 'consultation'
ORDER BY slot_date, start_time;
```

### 4. Bloquear un Slot Manualmente

```sql
-- Bloquear el slot de 10:00 del 25 de Octubre
UPDATE schedule_slots
SET is_available = FALSE,
    is_blocked = TRUE
WHERE doctor_id = 1 
  AND slot_date::date = '2024-10-25'
  AND start_time = '10:00';
```

### 5. Agregar Excepción (Día Festivo)

```sql
-- Agregar el 16 de Septiembre como día festivo
INSERT INTO schedule_exceptions 
(doctor_id, exception_date, exception_type, is_day_off, description)
VALUES (1, '2024-09-16', 'holiday', TRUE, 'Día de la Independencia');
```

---

## 🔄 Relaciones entre Tablas

```
schedule_templates (Horario Base Semanal)
        ↓
    Genera slots según
        ↓
schedule_slots (Espacios Específicos)
        
schedule_exceptions (Modifica o Bloquea)
        ↓
    Afecta a slots específicos
        ↓
schedule_slots (Espacios Modificados)
```

---

## 📚 Referencias

- **Archivo SQL**: `backend/migrations/recreate_schedule_tables.sql`
- **Script Python**: `backend/migrations/run_recreate_schedule_tables.py`
- **Modelos SQLAlchemy**: `backend/models/schedule.py`
- **Schemas Pydantic**: `backend/models/schedule.py` (sección PYDANTIC MODELS)

---

## ❓ Preguntas Frecuentes

### ¿Qué pasa si borro estas tablas?

Perderás toda la configuración de horarios del doctor, pero puedes recrearlas con los scripts proporcionados.

### ¿Puedo tener múltiples horarios para el mismo día?

No, por el constraint `UNIQUE (doctor_id, day_of_week, is_active)`. Solo puede haber un horario activo por día.

### ¿Cómo desactivo temporalmente un día?

Actualiza `is_active = FALSE` en `schedule_templates` para ese día.

```sql
UPDATE schedule_templates 
SET is_active = FALSE 
WHERE doctor_id = 1 AND day_of_week = 5;  -- Desactivar sábados
```

### ¿Los slots se generan automáticamente?

Depende de tu implementación. Puedes:
1. Generarlos automáticamente con un script/cron job
2. Generarlos bajo demanda cuando un paciente busca citas
3. Generarlos manualmente con SQL

---

## 📞 Soporte

Si tienes problemas recreando las tablas:

1. Verifica que Docker esté corriendo
2. Verifica la conexión a PostgreSQL
3. Revisa los logs del script Python
4. Consulta los errores en PostgreSQL

```bash
# Ver logs de PostgreSQL
docker logs medical-records-main-postgres-db-1
```

---

**Última actualización**: Octubre 2024  
**Versión**: 1.0

