-- ============================================================================
-- Migración: Agregar columnas faltantes a tabla persons
-- Fecha: 2025-10-31
-- Descripción: Agrega las columnas que están definidas en el modelo SQLAlchemy
--              pero que faltaban en la estructura SQL de la base de datos.
-- ============================================================================

-- Columnas profesionales (doctores)
ALTER TABLE persons ADD COLUMN IF NOT EXISTS specialty_license VARCHAR(20);
ALTER TABLE persons ADD COLUMN IF NOT EXISTS university VARCHAR(200);
ALTER TABLE persons ADD COLUMN IF NOT EXISTS graduation_year INTEGER;
ALTER TABLE persons ADD COLUMN IF NOT EXISTS subspecialty VARCHAR(100);
ALTER TABLE persons ADD COLUMN IF NOT EXISTS appointment_duration INTEGER;
ALTER TABLE persons ADD COLUMN IF NOT EXISTS digital_signature VARCHAR(500);
ALTER TABLE persons ADD COLUMN IF NOT EXISTS professional_seal VARCHAR(500);

-- Columnas médicas (pacientes)
ALTER TABLE persons ADD COLUMN IF NOT EXISTS insurance_provider VARCHAR(100);
ALTER TABLE persons ADD COLUMN IF NOT EXISTS insurance_number VARCHAR(50);

-- Columnas de autenticación
ALTER TABLE persons ADD COLUMN IF NOT EXISTS hashed_password VARCHAR(255);
ALTER TABLE persons ADD COLUMN IF NOT EXISTS last_login TIMESTAMP;

-- Comentarios
COMMENT ON COLUMN persons.specialty_license IS 'Licencia de especialidad médica (opcional, solo para doctores)';
COMMENT ON COLUMN persons.university IS 'Universidad donde se graduó el doctor (opcional)';
COMMENT ON COLUMN persons.graduation_year IS 'Año de graduación del doctor (opcional)';
COMMENT ON COLUMN persons.subspecialty IS 'Subespecialidad médica (opcional, solo para doctores)';
COMMENT ON COLUMN persons.appointment_duration IS 'Duración de las citas en minutos (opcional, solo para doctores)';
COMMENT ON COLUMN persons.digital_signature IS 'Firma digital del doctor (opcional)';
COMMENT ON COLUMN persons.professional_seal IS 'Sello profesional del doctor (opcional)';
COMMENT ON COLUMN persons.insurance_provider IS 'Proveedor de seguro médico (solo para pacientes)';
COMMENT ON COLUMN persons.insurance_number IS 'Número de seguro médico (solo para pacientes)';
COMMENT ON COLUMN persons.hashed_password IS 'Contraseña hasheada para autenticación';
COMMENT ON COLUMN persons.last_login IS 'Fecha y hora del último inicio de sesión';

-- ============================================================================
-- Rollback (si es necesario revertir):
-- ALTER TABLE persons DROP COLUMN IF EXISTS specialty_license;
-- ALTER TABLE persons DROP COLUMN IF EXISTS university;
-- ALTER TABLE persons DROP COLUMN IF EXISTS graduation_year;
-- ALTER TABLE persons DROP COLUMN IF EXISTS subspecialty;
-- ALTER TABLE persons DROP COLUMN IF EXISTS appointment_duration;
-- ALTER TABLE persons DROP COLUMN IF EXISTS digital_signature;
-- ALTER TABLE persons DROP COLUMN IF EXISTS professional_seal;
-- ALTER TABLE persons DROP COLUMN IF EXISTS insurance_provider;
-- ALTER TABLE persons DROP COLUMN IF EXISTS insurance_number;
-- ALTER TABLE persons DROP COLUMN IF EXISTS hashed_password;
-- ALTER TABLE persons DROP COLUMN IF EXISTS last_login;
-- ============================================================================

