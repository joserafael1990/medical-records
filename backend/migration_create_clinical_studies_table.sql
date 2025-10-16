-- Migration: Create clinical_studies table
-- Description: Creates the clinical_studies table for managing clinical studies and laboratory results
-- Date: 2025-01-23

-- Create clinical_studies table
CREATE TABLE IF NOT EXISTS clinical_studies (
    id SERIAL PRIMARY KEY,
    study_code VARCHAR(20) UNIQUE,
    consultation_id INTEGER NOT NULL REFERENCES medical_records(id) ON DELETE CASCADE,
    patient_id INTEGER NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
    doctor_id INTEGER NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
    
    -- Study Information
    study_type VARCHAR(50) NOT NULL,
    study_name VARCHAR(200) NOT NULL,
    study_description TEXT,
    
    -- Dates
    ordered_date TIMESTAMP NOT NULL,
    performed_date TIMESTAMP,
    results_date TIMESTAMP,
    
    -- Status and Urgency
    status VARCHAR(20) DEFAULT 'pending',
    urgency VARCHAR(20) DEFAULT 'normal',
    
    -- Medical Information
    clinical_indication TEXT NOT NULL,
    relevant_history TEXT,
    results_text TEXT,
    interpretation TEXT,
    
    -- Medical Staff
    ordering_doctor VARCHAR(200) NOT NULL,
    performing_doctor VARCHAR(200),
    institution VARCHAR(200),
    
    -- File Attachments
    file_name VARCHAR(255),
    file_path VARCHAR(500),
    file_type VARCHAR(50),
    file_size INTEGER,
    
    -- System
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES persons(id)
);

-- Add comments for documentation
COMMENT ON TABLE clinical_studies IS 'Clinical studies and laboratory results for medical consultations';
COMMENT ON COLUMN clinical_studies.study_code IS 'Unique code for the clinical study';
COMMENT ON COLUMN clinical_studies.consultation_id IS 'Reference to the medical consultation';
COMMENT ON COLUMN clinical_studies.patient_id IS 'Reference to the patient';
COMMENT ON COLUMN clinical_studies.doctor_id IS 'Reference to the ordering doctor';
COMMENT ON COLUMN clinical_studies.study_type IS 'Type of study (hematologia, bioquimica, radiologia, etc.)';
COMMENT ON COLUMN clinical_studies.study_name IS 'Name of the clinical study';
COMMENT ON COLUMN clinical_studies.study_description IS 'Detailed description of the study';
COMMENT ON COLUMN clinical_studies.ordered_date IS 'Date when the study was ordered';
COMMENT ON COLUMN clinical_studies.performed_date IS 'Date when the study was performed';
COMMENT ON COLUMN clinical_studies.results_date IS 'Date when results were received';
COMMENT ON COLUMN clinical_studies.status IS 'Current status (pending, in_progress, completed, cancelled, failed)';
COMMENT ON COLUMN clinical_studies.urgency IS 'Urgency level (normal, urgent, stat)';
COMMENT ON COLUMN clinical_studies.clinical_indication IS 'Clinical indication for the study';
COMMENT ON COLUMN clinical_studies.relevant_history IS 'Relevant medical history';
COMMENT ON COLUMN clinical_studies.results_text IS 'Text results of the study';
COMMENT ON COLUMN clinical_studies.interpretation IS 'Medical interpretation of results';
COMMENT ON COLUMN clinical_studies.ordering_doctor IS 'Name of the doctor who ordered the study';
COMMENT ON COLUMN clinical_studies.performing_doctor IS 'Name of the doctor who performed the study';
COMMENT ON COLUMN clinical_studies.institution IS 'Institution where the study was performed';
COMMENT ON COLUMN clinical_studies.file_name IS 'Name of attached file';
COMMENT ON COLUMN clinical_studies.file_path IS 'Path to attached file';
COMMENT ON COLUMN clinical_studies.file_type IS 'Type of attached file';
COMMENT ON COLUMN clinical_studies.file_size IS 'Size of attached file in bytes';

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_clinical_studies_consultation_id ON clinical_studies(consultation_id);
CREATE INDEX IF NOT EXISTS idx_clinical_studies_patient_id ON clinical_studies(patient_id);
CREATE INDEX IF NOT EXISTS idx_clinical_studies_doctor_id ON clinical_studies(doctor_id);
CREATE INDEX IF NOT EXISTS idx_clinical_studies_status ON clinical_studies(status);
CREATE INDEX IF NOT EXISTS idx_clinical_studies_ordered_date ON clinical_studies(ordered_date);
CREATE INDEX IF NOT EXISTS idx_clinical_studies_study_type ON clinical_studies(study_type);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_clinical_studies_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_clinical_studies_updated_at
    BEFORE UPDATE ON clinical_studies
    FOR EACH ROW
    EXECUTE FUNCTION update_clinical_studies_updated_at();

-- Insert some sample data for testing (optional)
-- INSERT INTO clinical_studies (
--     study_code, consultation_id, patient_id, doctor_id,
--     study_type, study_name, study_description,
--     ordered_date, status, urgency,
--     clinical_indication, ordering_doctor, created_by
-- ) VALUES (
--     'CS001', 1, 1, 1,
--     'hematologia', 'Biometría Hemática Completa', 'Estudio de rutina para evaluación general',
--     CURRENT_TIMESTAMP, 'pending', 'normal',
--     'Evaluación de rutina', 'Dr. Juan Pérez', 1
-- );

COMMIT;
