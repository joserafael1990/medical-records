-- Migration to create consultation_vital_signs table for many-to-many relationship
-- between consultations and vital signs

-- Create the junction table
CREATE TABLE IF NOT EXISTS consultation_vital_signs (
    id SERIAL PRIMARY KEY,
    consultation_id INTEGER NOT NULL,
    vital_sign_id INTEGER NOT NULL,
    value VARCHAR(100) NOT NULL,
    unit VARCHAR(20),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key constraints
    CONSTRAINT fk_consultation_vital_signs_consultation 
        FOREIGN KEY (consultation_id) REFERENCES medical_records(id) ON DELETE CASCADE,
    CONSTRAINT fk_consultation_vital_signs_vital_sign 
        FOREIGN KEY (vital_sign_id) REFERENCES vital_signs(id) ON DELETE CASCADE,
    
    -- Unique constraint to prevent duplicate vital signs for the same consultation
    CONSTRAINT unique_consultation_vital_sign 
        UNIQUE (consultation_id, vital_sign_id)
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_consultation_vital_signs_consultation_id 
    ON consultation_vital_signs(consultation_id);
CREATE INDEX IF NOT EXISTS idx_consultation_vital_signs_vital_sign_id 
    ON consultation_vital_signs(vital_sign_id);

-- Add comments
COMMENT ON TABLE consultation_vital_signs IS 'Junction table for consultation vital signs with values';
COMMENT ON COLUMN consultation_vital_signs.consultation_id IS 'Reference to the medical record/consultation';
COMMENT ON COLUMN consultation_vital_signs.vital_sign_id IS 'Reference to the vital sign type';
COMMENT ON COLUMN consultation_vital_signs.value IS 'The measured value of the vital sign';
COMMENT ON COLUMN consultation_vital_signs.unit IS 'Unit of measurement (e.g., mmHg, bpm, °C)';
COMMENT ON COLUMN consultation_vital_signs.notes IS 'Additional notes about the vital sign measurement';

