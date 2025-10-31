-- ============================================================================
-- Migración: Crear tabla offices
-- Fecha: 2025-10-31
-- Descripción: Crea la tabla offices para almacenar información de oficinas
--              y consultorios de los doctores.
-- ============================================================================

CREATE TABLE IF NOT EXISTS offices (
    id SERIAL PRIMARY KEY,
    doctor_id INTEGER REFERENCES persons(id) NOT NULL,
    name VARCHAR(200) NOT NULL,
    
    -- Dirección
    address TEXT,
    city VARCHAR(100),
    state_id INTEGER REFERENCES states(id),
    country_id INTEGER REFERENCES countries(id),
    postal_code VARCHAR(10),
    
    -- Contacto
    phone VARCHAR(20),
    
    -- Configuración
    timezone VARCHAR(50) DEFAULT 'America/Mexico_City',
    maps_url TEXT,  -- URL de Google Maps
    
    -- Sistema
    is_active BOOLEAN DEFAULT TRUE,
    is_virtual BOOLEAN DEFAULT FALSE,  -- Indica si es consultorio virtual
    virtual_url VARCHAR(500),  -- URL para consultas virtuales (Zoom, Teams, etc.)
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_offices_doctor_id ON offices(doctor_id);
CREATE INDEX IF NOT EXISTS idx_offices_is_active ON offices(is_active);

-- Comentarios
COMMENT ON TABLE offices IS 'Tabla de oficinas y consultorios de los doctores';
COMMENT ON COLUMN offices.is_virtual IS 'Indica si es un consultorio virtual (consulta en línea)';
COMMENT ON COLUMN offices.virtual_url IS 'URL para consultas virtuales (Zoom, Teams, Google Meet, etc.)';
COMMENT ON COLUMN offices.maps_url IS 'URL de Google Maps o similar para la ubicación de la oficina';

-- ============================================================================
-- Rollback (si es necesario revertir):
-- DROP INDEX IF EXISTS idx_offices_is_active;
-- DROP INDEX IF EXISTS idx_offices_doctor_id;
-- DROP TABLE IF EXISTS offices CASCADE;
-- ============================================================================

