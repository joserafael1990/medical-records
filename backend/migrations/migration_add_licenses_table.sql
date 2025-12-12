-- ============================================================================
-- LICENSE MANAGEMENT SYSTEM
-- Migration to add licenses table
-- ============================================================================

CREATE TABLE IF NOT EXISTS licenses (
    id SERIAL PRIMARY KEY,
    doctor_id INTEGER REFERENCES persons(id) ON DELETE CASCADE NOT NULL,
    license_type VARCHAR(50) NOT NULL CHECK (license_type IN ('trial', 'basic', 'premium')),
    start_date DATE NOT NULL,
    expiration_date DATE NOT NULL,
    payment_date DATE,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'expired', 'suspended')),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_by INTEGER REFERENCES persons(id),
    UNIQUE(doctor_id)  -- One active license per doctor
);

CREATE INDEX IF NOT EXISTS idx_licenses_doctor_id ON licenses(doctor_id);
CREATE INDEX IF NOT EXISTS idx_licenses_status ON licenses(status);
CREATE INDEX IF NOT EXISTS idx_licenses_expiration_date ON licenses(expiration_date);
CREATE INDEX IF NOT EXISTS idx_licenses_is_active ON licenses(is_active);
























