-- Migration: Add document_folios and document_folio_sequences tables
-- These tables are required for generating folio numbers for prescriptions and study orders

-- Create document_folio_sequences table if it doesn't exist
CREATE TABLE IF NOT EXISTS document_folio_sequences (
    id SERIAL PRIMARY KEY,
    doctor_id INTEGER NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
    document_type VARCHAR(50) NOT NULL,
    last_number INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT document_folio_sequences_doctor_type_unique UNIQUE (doctor_id, document_type)
);

-- Create indexes for document_folio_sequences
CREATE INDEX IF NOT EXISTS idx_document_folio_sequences_doctor_type ON document_folio_sequences(doctor_id, document_type);

-- Create document_folios table if it doesn't exist
CREATE TABLE IF NOT EXISTS document_folios (
    id SERIAL PRIMARY KEY,
    doctor_id INTEGER NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
    consultation_id INTEGER NOT NULL REFERENCES medical_records(id) ON DELETE CASCADE,
    document_type VARCHAR(50) NOT NULL,
    folio_number INTEGER NOT NULL,
    formatted_folio VARCHAR(20) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT document_folios_doctor_consultation_type_unique UNIQUE (doctor_id, consultation_id, document_type)
);

-- Create indexes for document_folios
CREATE INDEX IF NOT EXISTS idx_document_folios_doctor_type_number ON document_folios(doctor_id, document_type, folio_number);
CREATE INDEX IF NOT EXISTS idx_document_folios_unique_consultation ON document_folios(doctor_id, consultation_id, document_type);

-- Add table comments
COMMENT ON TABLE document_folio_sequences IS 'Secuencias de folios por doctor y tipo de documento';
COMMENT ON TABLE document_folios IS 'Folios generados para recetas y órdenes de estudio';

