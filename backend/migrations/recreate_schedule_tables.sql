-- ============================================================================
-- RECREAR TABLAS DE HORARIOS DEL DOCTOR
-- ============================================================================
-- Este script recrea las 2 tablas necesarias para la configuración de horarios:
-- 1. schedule_templates: Plantillas de horarios semanales
-- 2. schedule_exceptions: Excepciones (vacaciones, días festivos, etc.)
--
-- NOTA: schedule_slots fue removida - los slots se generan dinámicamente
-- ============================================================================

-- Eliminar tablas si existen (para recrear desde cero)
DROP TABLE IF EXISTS schedule_exceptions CASCADE;
DROP TABLE IF EXISTS schedule_templates CASCADE;

-- ============================================================================
-- 1. TABLA: schedule_templates
-- ============================================================================
-- Descripción: Plantilla de horarios para el médico
-- Define los horarios base de trabajo por día de la semana
-- ============================================================================

CREATE TABLE schedule_templates (
    id SERIAL PRIMARY KEY,
    doctor_id INTEGER NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
    
    -- Día de la semana (0=Lunes, 1=Martes, ..., 6=Domingo)
    day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
    
    -- Horarios de trabajo
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    
    -- Duración por consulta (en minutos)
    consultation_duration INTEGER DEFAULT 30,
    
    -- Tiempo de descanso entre consultas (en minutos)
    break_duration INTEGER DEFAULT 0,
    
    -- Horario de almuerzo
    lunch_start TIME,
    lunch_end TIME,
    
    -- Estado del día
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Metadatos
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Constraints
    CHECK (end_time > start_time),
    CHECK (lunch_end > lunch_start OR lunch_start IS NULL OR lunch_end IS NULL),
    CHECK (consultation_duration >= 15 AND consultation_duration <= 120),
    CHECK (break_duration >= 0 AND break_duration <= 30),
    
    -- Un doctor solo puede tener un horario activo por día de la semana
    UNIQUE (doctor_id, day_of_week, is_active)
);

-- Índices para mejorar rendimiento
CREATE INDEX idx_schedule_templates_doctor ON schedule_templates(doctor_id);
CREATE INDEX idx_schedule_templates_day ON schedule_templates(day_of_week);
CREATE INDEX idx_schedule_templates_active ON schedule_templates(is_active);

-- ============================================================================
-- 2. TABLA: schedule_exceptions
-- ============================================================================
-- Descripción: Excepciones al horario base
-- Define días especiales: vacaciones, días festivos, horarios especiales, etc.
-- ============================================================================

CREATE TABLE schedule_exceptions (
    id SERIAL PRIMARY KEY,
    doctor_id INTEGER NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
    template_id INTEGER REFERENCES schedule_templates(id) ON DELETE SET NULL,
    
    -- Fecha específica de la excepción
    exception_date TIMESTAMP NOT NULL,
    
    -- Tipo de excepción
    exception_type VARCHAR(50) NOT NULL CHECK (
        exception_type IN ('vacation', 'holiday', 'sick_leave', 'custom', 'special_hours')
    ),
    
    -- Horarios especiales (si aplica)
    start_time TIME,
    end_time TIME,
    
    -- Estado
    is_day_off BOOLEAN DEFAULT FALSE,  -- True si es día libre completo
    
    -- Descripción
    description TEXT,
    
    -- Metadatos
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Constraints
    CHECK (end_time > start_time OR start_time IS NULL OR end_time IS NULL),
    
    -- Un doctor no puede tener múltiples excepciones para la misma fecha
    UNIQUE (doctor_id, exception_date)
);

-- Índices para mejorar rendimiento
CREATE INDEX idx_schedule_exceptions_doctor ON schedule_exceptions(doctor_id);
CREATE INDEX idx_schedule_exceptions_date ON schedule_exceptions(exception_date);
CREATE INDEX idx_schedule_exceptions_type ON schedule_exceptions(exception_type);

-- ============================================================================
-- COMENTARIOS EN LAS TABLAS Y COLUMNAS
-- ============================================================================

COMMENT ON TABLE schedule_templates IS 'Plantillas de horarios semanales del médico';
COMMENT ON COLUMN schedule_templates.day_of_week IS '0=Lunes, 1=Martes, 2=Miércoles, 3=Jueves, 4=Viernes, 5=Sábado, 6=Domingo';
COMMENT ON COLUMN schedule_templates.consultation_duration IS 'Duración de cada consulta en minutos (15-120)';
COMMENT ON COLUMN schedule_templates.break_duration IS 'Tiempo de descanso entre consultas en minutos (0-30)';

COMMENT ON TABLE schedule_exceptions IS 'Excepciones al horario base: vacaciones, días festivos, etc.';
COMMENT ON COLUMN schedule_exceptions.exception_type IS 'vacation, holiday, sick_leave, custom, special_hours';
COMMENT ON COLUMN schedule_exceptions.is_day_off IS 'TRUE si es día libre completo (sin horarios)';

-- ============================================================================
-- DATOS DE EJEMPLO (OPCIONAL)
-- ============================================================================
-- Descomenta las siguientes líneas para insertar datos de ejemplo para el doctor thiago@avant.com

/*
-- Obtener el ID del doctor thiago@avant.com
DO $$
DECLARE
    v_doctor_id INTEGER;
BEGIN
    -- Buscar el doctor thiago@avant.com
    SELECT id INTO v_doctor_id 
    FROM persons 
    WHERE email = 'thiago@avant.com' 
    AND person_type = 'doctor'
    LIMIT 1;
    
    IF v_doctor_id IS NOT NULL THEN
        -- Horario de Lunes a Viernes: 9:00 - 18:00, con almuerzo 14:00 - 15:00
        INSERT INTO schedule_templates (doctor_id, day_of_week, start_time, end_time, consultation_duration, break_duration, lunch_start, lunch_end, is_active)
        VALUES
            (v_doctor_id, 0, '09:00', '18:00', 30, 5, '14:00', '15:00', TRUE),  -- Lunes
            (v_doctor_id, 1, '09:00', '18:00', 30, 5, '14:00', '15:00', TRUE),  -- Martes
            (v_doctor_id, 2, '09:00', '18:00', 30, 5, '14:00', '15:00', TRUE),  -- Miércoles
            (v_doctor_id, 3, '09:00', '18:00', 30, 5, '14:00', '15:00', TRUE),  -- Jueves
            (v_doctor_id, 4, '09:00', '18:00', 30, 5, '14:00', '15:00', TRUE);  -- Viernes
        
        -- Sábado: 9:00 - 14:00 (medio día)
        INSERT INTO schedule_templates (doctor_id, day_of_week, start_time, end_time, consultation_duration, break_duration, is_active)
        VALUES (v_doctor_id, 5, '09:00', '14:00', 30, 5, TRUE);  -- Sábado
        
        RAISE NOTICE 'Horarios de ejemplo creados para el doctor ID %', v_doctor_id;
    ELSE
        RAISE NOTICE 'No se encontró el doctor thiago@avant.com';
    END IF;
END $$;
*/

-- ============================================================================
-- VERIFICACIÓN
-- ============================================================================

-- Mostrar todas las tablas creadas
SELECT 
    tablename, 
    schemaname 
FROM pg_tables 
WHERE tablename LIKE 'schedule%' 
ORDER BY tablename;

-- Mostrar la estructura de las tablas
\d schedule_templates
\d schedule_exceptions

-- ============================================================================
-- FIN DEL SCRIPT
-- ============================================================================

