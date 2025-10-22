-- ============================================================================
-- PRIVACY AND CONSENT SYSTEM - LFPDPPP Compliance
-- Sistema de Avisos de Privacidad y Consentimientos
-- ============================================================================

-- Versiones del aviso de privacidad
CREATE TABLE privacy_notices (
    id SERIAL PRIMARY KEY,
    version VARCHAR(20) NOT NULL UNIQUE,
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    short_summary TEXT,
    effective_date DATE NOT NULL,
    expiry_date DATE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Consentimientos de pacientes
CREATE TABLE privacy_consents (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER REFERENCES persons(id) ON DELETE CASCADE,
    privacy_notice_id INTEGER REFERENCES privacy_notices(id),
    privacy_notice_version VARCHAR(20),
    
    -- Tipos de consentimiento
    consent_data_collection BOOLEAN DEFAULT FALSE,
    consent_data_processing BOOLEAN DEFAULT FALSE,
    consent_data_sharing BOOLEAN DEFAULT FALSE,
    consent_marketing BOOLEAN DEFAULT FALSE,
    
    -- Método de consentimiento
    consent_method VARCHAR(50), -- 'whatsapp_button', 'papel_firmado', 'tablet_digital', 'portal_web'
    consent_status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'sent', 'delivered', 'read', 'accepted', 'rejected', 'expired'
    consent_date TIMESTAMP,
    
    -- Datos de WhatsApp
    whatsapp_message_id VARCHAR(100),
    whatsapp_sent_at TIMESTAMP,
    whatsapp_delivered_at TIMESTAMP,
    whatsapp_read_at TIMESTAMP,
    whatsapp_response_text TEXT,
    whatsapp_response_at TIMESTAMP,
    
    -- Metadatos del consentimiento
    ip_address VARCHAR(45),
    user_agent TEXT,
    digital_signature TEXT, -- Base64 de firma digital o button_id de WhatsApp
    
    -- Revocación
    is_revoked BOOLEAN DEFAULT FALSE,
    revoked_date TIMESTAMP,
    revocation_reason TEXT,
    
    -- Metadatos adicionales
    metadata JSONB, -- {privacy_token, privacy_url, sent_by_doctor_id, button_id, etc}
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT unique_patient_notice UNIQUE(patient_id, privacy_notice_version)
);

-- Solicitudes ARCO (Acceso, Rectificación, Cancelación, Oposición)
CREATE TABLE arco_requests (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER REFERENCES persons(id) ON DELETE CASCADE,
    request_type VARCHAR(20) NOT NULL, -- 'access', 'rectification', 'cancellation', 'opposition'
    request_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Detalles de la solicitud
    request_description TEXT NOT NULL,
    requested_data TEXT, -- Qué datos específicos solicita
    
    -- Estado
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'in_progress', 'completed', 'rejected'
    assigned_to INTEGER REFERENCES persons(id), -- Oficial de privacidad/Doctor
    
    -- Respuesta
    response_date TIMESTAMP,
    response_description TEXT,
    response_attachments TEXT[], -- Rutas de archivos
    
    -- Plazos legales (20 días hábiles según LFPDPPP)
    legal_deadline DATE,
    days_to_respond INTEGER,
    
    -- Seguimiento
    notes TEXT,
    priority VARCHAR(20) DEFAULT 'normal', -- 'low', 'normal', 'high', 'urgent'
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para rendimiento
CREATE INDEX idx_privacy_consents_patient ON privacy_consents(patient_id);
CREATE INDEX idx_privacy_consents_status ON privacy_consents(consent_status);
CREATE INDEX idx_privacy_consents_whatsapp_msg ON privacy_consents(whatsapp_message_id);
CREATE INDEX idx_privacy_consents_active ON privacy_consents(patient_id) WHERE NOT is_revoked;
CREATE INDEX idx_arco_requests_patient ON arco_requests(patient_id);
CREATE INDEX idx_arco_requests_status ON arco_requests(status);
CREATE INDEX idx_arco_requests_deadline ON arco_requests(legal_deadline) WHERE status IN ('pending', 'in_progress');

-- Permisos
GRANT ALL ON privacy_notices TO historias_user;
GRANT ALL ON privacy_consents TO historias_user;
GRANT ALL ON arco_requests TO historias_user;

-- Comentarios
COMMENT ON TABLE privacy_notices IS 'Versiones del aviso de privacidad según LFPDPPP';
COMMENT ON TABLE privacy_consents IS 'Registro de consentimientos de privacidad de pacientes';
COMMENT ON TABLE arco_requests IS 'Solicitudes de derechos ARCO de los titulares de datos';
COMMENT ON COLUMN privacy_consents.consent_method IS 'whatsapp_button: Botón WhatsApp, papel_firmado: Físico, tablet_digital: Firma digital, portal_web: Portal paciente';
COMMENT ON COLUMN privacy_consents.consent_status IS 'pending: Creado, sent: Enviado, delivered: Entregado, read: Leído, accepted: Aceptado, rejected: Rechazado, expired: Expirado sin respuesta';

-- Insertar aviso de privacidad inicial
INSERT INTO privacy_notices (version, title, content, short_summary, effective_date, is_active) VALUES
('1.0', 
 'Aviso de Privacidad - Sistema CORTEX', 
 E'AVISO DE PRIVACIDAD INTEGRAL\n\n'
 'En cumplimiento con la Ley Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP), '
 'le informamos lo siguiente:\n\n'
 'IDENTIDAD Y DOMICILIO DEL RESPONSABLE:\n'
 'Su médico tratante es el responsable del tratamiento de sus datos personales.\n\n'
 'FINALIDADES DEL TRATAMIENTO:\n'
 '• Prestación de servicios médicos\n'
 '• Elaboración de expediente clínico electrónico\n'
 '• Cumplimiento de obligaciones legales\n'
 '• Facturación y cobranza\n\n'
 'DATOS PERSONALES QUE RECABAMOS:\n'
 '• Datos de identificación: nombre, CURP, RFC, fecha de nacimiento\n'
 '• Datos de contacto: teléfono, correo electrónico, domicilio\n'
 '• Datos sensibles: información médica, antecedentes patológicos, diagnósticos, tratamientos\n\n'
 'SUS DERECHOS ARCO:\n'
 'Usted tiene derecho a Acceder, Rectificar, Cancelar u Oponerse al tratamiento de sus datos personales. '
 'Para ejercer estos derechos, contacte a su médico tratante.\n\n'
 'REVOCACIÓN DEL CONSENTIMIENTO:\n'
 'Puede revocar su consentimiento en cualquier momento contactando a su médico.\n\n'
 'MEDIDAS DE SEGURIDAD:\n'
 'Sus datos están protegidos mediante cifrado y controles de acceso estrictos.\n\n'
 'CAMBIOS AL AVISO:\n'
 'Cualquier cambio será notificado a través de WhatsApp o por escrito.',
 'Sus datos personales serán utilizados para prestar servicios médicos, elaborar su expediente clínico y cumplir obligaciones legales. Puede ejercer sus derechos ARCO en cualquier momento.',
 CURRENT_DATE,
 TRUE);

-- ============================================================================
-- ROLLBACK INSTRUCTIONS
-- ============================================================================
-- To rollback this migration:
-- DROP TABLE IF EXISTS arco_requests CASCADE;
-- DROP TABLE IF EXISTS privacy_consents CASCADE;
-- DROP TABLE IF EXISTS privacy_notices CASCADE;

