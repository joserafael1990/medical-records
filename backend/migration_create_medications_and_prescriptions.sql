-- ============================================================================
-- MIGRATION: Create medications and consultation_prescriptions tables
-- ============================================================================
-- Description: Creates tables for medication catalog and consultation prescriptions
-- Date: 2025-10-21
-- Author: System
-- ============================================================================

-- Create medications table (catalog of common medications)
CREATE TABLE IF NOT EXISTS medications (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index on medication name for faster searches
CREATE INDEX IF NOT EXISTS idx_medications_name ON medications(name);

-- Create consultation_prescriptions table (associative table between consultations and medications)
CREATE TABLE IF NOT EXISTS consultation_prescriptions (
    id SERIAL PRIMARY KEY,
    consultation_id INTEGER NOT NULL,
    medication_id INTEGER NOT NULL,
    dosage VARCHAR(255) NOT NULL,
    frequency VARCHAR(255) NOT NULL,
    duration VARCHAR(255) NOT NULL,
    instructions TEXT,
    quantity INTEGER,
    via_administracion VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign keys
    CONSTRAINT fk_consultation_prescriptions_consultation
        FOREIGN KEY (consultation_id) 
        REFERENCES medical_records(id) 
        ON DELETE CASCADE,
    
    CONSTRAINT fk_consultation_prescriptions_medication
        FOREIGN KEY (medication_id) 
        REFERENCES medications(id) 
        ON DELETE RESTRICT,
    
    -- Prevent duplicate medication entries in same consultation
    CONSTRAINT unique_consultation_medication 
        UNIQUE (consultation_id, medication_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_consultation_prescriptions_consultation ON consultation_prescriptions(consultation_id);
CREATE INDEX IF NOT EXISTS idx_consultation_prescriptions_medication ON consultation_prescriptions(medication_id);

-- Create trigger to update updated_at on medications
CREATE OR REPLACE FUNCTION update_medications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_medications_updated_at
    BEFORE UPDATE ON medications
    FOR EACH ROW
    EXECUTE FUNCTION update_medications_updated_at();

-- Create trigger to update updated_at on consultation_prescriptions
CREATE OR REPLACE FUNCTION update_consultation_prescriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_consultation_prescriptions_updated_at
    BEFORE UPDATE ON consultation_prescriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_consultation_prescriptions_updated_at();

-- ============================================================================
-- Insert 200 most common medications in Mexico
-- ============================================================================

INSERT INTO medications (name) VALUES
    -- Pain relievers and anti-inflammatories
    ('Paracetamol'),
    ('Ibuprofeno'),
    ('Naproxeno'),
    ('Ketorolaco'),
    ('Metamizol'),
    ('Diclofenaco'),
    ('Aspirina'),
    ('Celecoxib'),
    ('Meloxicam'),
    ('Piroxicam'),
    
    -- Antibiotics
    ('Amoxicilina'),
    ('Amoxicilina con ácido clavulánico'),
    ('Azitromicina'),
    ('Claritromicina'),
    ('Ciprofloxacino'),
    ('Levofloxacino'),
    ('Cefalexina'),
    ('Ceftriaxona'),
    ('Trimetoprima con sulfametoxazol'),
    ('Metronidazol'),
    ('Nitrofurantoína'),
    ('Clindamicina'),
    ('Doxiciclina'),
    
    -- Cardiovascular
    ('Losartán'),
    ('Enalapril'),
    ('Captopril'),
    ('Amlodipino'),
    ('Nifedipino'),
    ('Atenolol'),
    ('Metoprolol'),
    ('Carvedilol'),
    ('Furosemida'),
    ('Hidroclorotiazida'),
    ('Espironolactona'),
    ('Atorvastatina'),
    ('Simvastatina'),
    ('Gemfibrozilo'),
    ('Clopidogrel'),
    ('Ácido acetilsalicílico'),
    ('Warfarina'),
    ('Rivaroxabán'),
    ('Digoxina'),
    
    -- Diabetes
    ('Metformina'),
    ('Glibenclamida'),
    ('Glimepirida'),
    ('Insulina glargina'),
    ('Insulina NPH'),
    ('Insulina regular'),
    ('Sitagliptina'),
    ('Linagliptina'),
    ('Empagliflozina'),
    
    -- Gastrointestinal
    ('Omeprazol'),
    ('Pantoprazol'),
    ('Ranitidina'),
    ('Esomeprazol'),
    ('Aluminio y magnesio'),
    ('Metoclopramida'),
    ('Domperidona'),
    ('Loperamida'),
    ('Butilhioscina'),
    ('Trimebutina'),
    ('Lactulosa'),
    ('Bisacodilo'),
    ('Sales de rehidratación oral'),
    
    -- Respiratory
    ('Salbutamol'),
    ('Bromuro de ipratropio'),
    ('Beclometasona'),
    ('Budesonida'),
    ('Fluticasona'),
    ('Montelukast'),
    ('Loratadina'),
    ('Cetirizina'),
    ('Desloratadina'),
    ('Fexofenadina'),
    ('Clorfenamina'),
    ('Dextrometorfano'),
    ('Ambroxol'),
    ('Acetilcisteína'),
    ('Bromhexina'),
    
    -- Neurological and psychiatric
    ('Fluoxetina'),
    ('Sertralina'),
    ('Escitalopram'),
    ('Paroxetina'),
    ('Amitriptilina'),
    ('Clonazepam'),
    ('Alprazolam'),
    ('Diazepam'),
    ('Gabapentina'),
    ('Pregabalina'),
    ('Carbamazepina'),
    ('Ácido valproico'),
    ('Topiramato'),
    ('Levetiracetam'),
    ('Fenitoína'),
    ('Risperidona'),
    ('Quetiapina'),
    ('Olanzapina'),
    ('Haloperidol'),
    ('Levodopa con carbidopa'),
    
    -- Analgesics and anesthetics
    ('Tramadol'),
    ('Codeína'),
    ('Lidocaína'),
    ('Benzocaína'),
    
    -- Vitamins and supplements
    ('Ácido fólico'),
    ('Complejo B'),
    ('Vitamina B12'),
    ('Vitamina D'),
    ('Vitamina C'),
    ('Sulfato ferroso'),
    ('Calcio'),
    ('Multivitamínico'),
    
    -- Hormones
    ('Levotiroxina'),
    ('Metimazol'),
    ('Dexametasona'),
    ('Prednisona'),
    ('Hidrocortisona'),
    ('Betametasona'),
    
    -- Antivirals and antiparasitics
    ('Aciclovir'),
    ('Oseltamivir'),
    ('Albendazol'),
    ('Mebendazol'),
    ('Ivermectina'),
    ('Nitazoxanida'),
    
    -- Ophthalmologic
    ('Lágrimas artificiales'),
    ('Tropicamida'),
    ('Timolol'),
    ('Latanoprost'),
    ('Moxifloxacino oftálmico'),
    ('Dexametasona oftálmica'),
    
    -- Dermatologic
    ('Clotrimazol'),
    ('Ketoconazol'),
    ('Miconazol'),
    ('Fluconazol'),
    ('Mupirocina'),
    ('Ácido fusídico'),
    ('Hidrocortisona tópica'),
    ('Betametasona tópica'),
    ('Adapaleno'),
    ('Tretinoína'),
    ('Peróxido de benzoílo'),
    ('Isotretinoína'),
    
    -- Gynecological and obstetric
    ('Etinilestradiol con levonorgestrel'),
    ('Etinilestradiol con drospirenona'),
    ('Medroxiprogesterona'),
    ('Clomifeno'),
    ('Misoprostol'),
    ('Oxitocina'),
    ('Metronidazol vaginal'),
    ('Clotrimazol vaginal'),
    
    -- Urological
    ('Tamsulosina'),
    ('Finasterida'),
    ('Dutasterida'),
    ('Tolterodina'),
    ('Solifenacina'),
    
    -- Anticoagulants and antiplatelets
    ('Enoxaparina'),
    ('Heparina'),
    ('Pentoxifilina'),
    
    -- Others commonly prescribed
    ('Alopurinol'),
    ('Colchicina'),
    ('Prednisona'),
    ('Metilprednisolona'),
    ('Ciclosporina'),
    ('Metotrexato'),
    ('Hidroxicloroquina'),
    ('Cloroquina'),
    ('Dimenhidrinato'),
    ('Meclizina'),
    ('Ondansetrón'),
    ('Sucralfato'),
    ('Simeticona'),
    ('Dimeticona'),
    ('Bromazepam'),
    ('Zolpidem'),
    ('Orlistat'),
    ('Memantina'),
    ('Donepezilo'),
    ('Rivastigmina'),
    ('Baclofen'),
    ('Tizanidina'),
    ('Ciclobenzaprina'),
    ('Ácido tranexámico'),
    ('Vitamina K'),
    ('Potasio'),
    ('Magnesio'),
    ('Zinc'),
    ('Isotretinoína oral'),
    ('Minoxidil'),
    ('Bimatoprost'),
    ('Sildenafil'),
    ('Tadalafil'),
    ('Diosmina'),
    ('Hidrosmina')
ON CONFLICT (name) DO NOTHING;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON medications TO historias_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON consultation_prescriptions TO historias_user;
GRANT USAGE, SELECT ON SEQUENCE medications_id_seq TO historias_user;
GRANT USAGE, SELECT ON SEQUENCE consultation_prescriptions_id_seq TO historias_user;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================

