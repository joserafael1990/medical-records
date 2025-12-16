   SELECT column_name, data_type, is_nullable
   FROM information_schema.columns 
   WHERE table_name = 'medical_records' 
   AND column_name IN ('patient_document_id', 'patient_document_value');