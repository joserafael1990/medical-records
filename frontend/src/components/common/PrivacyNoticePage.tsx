import React from 'react';
import {
  Box,
  Container,
  Paper,
  Typography,
  Divider,
  Link,
  List,
  ListItem,
  ListItemText
} from '@mui/material';

/**
 * Aviso de Privacidad Integral (LFPDPPP Art. 15-17).
 *
 * Este componente es intencionalmente estático y sin dependencias del router:
 * puede montarse en `/privacy` con React Router o servirse desde una página
 * independiente. La versión mostrada debe coincidir con la `notice_version`
 * capturada en el checkbox de consent del registro (ver `QuickRegisterView`).
 *
 * Texto revisar con legal antes de publicar. Los placeholders entre [[ ]] deben
 * completarse con datos reales del responsable del tratamiento.
 */
const PRIVACY_NOTICE_VERSION = 'v1';
const LAST_UPDATED = '2026-04-17';

const PrivacyNoticePage: React.FC = () => {
  return (
    <Container maxWidth="md" sx={{ py: { xs: 3, sm: 5 } }}>
      <Paper elevation={2} sx={{ p: { xs: 3, sm: 5 }, borderRadius: 2 }}>
        <Typography variant="h4" sx={{ fontWeight: 600, mb: 1 }}>
          Aviso de Privacidad Integral
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Versión {PRIVACY_NOTICE_VERSION} · Última actualización: {LAST_UPDATED}
        </Typography>

        <Divider sx={{ my: 3 }} />

        <Section title="1. Identidad del responsable">
          <Typography paragraph>
            [[Razón social del responsable]], con domicilio en [[domicilio fiscal]],
            es el responsable del tratamiento de los datos personales que recabe
            a través de la plataforma CORTEX conforme a lo dispuesto por la Ley
            Federal de Protección de Datos Personales en Posesión de los
            Particulares (LFPDPPP) y su Reglamento.
          </Typography>
        </Section>

        <Section title="2. Datos personales que se recaban">
          <Typography paragraph>
            Para cumplir las finalidades descritas, podemos recabar las siguientes
            categorías de datos:
          </Typography>
          <List dense>
            <ListItem>
              <ListItemText
                primary="Datos de identificación del profesional de la salud"
                secondary="Nombre completo, cédula profesional, especialidad médica, correo electrónico, teléfono."
              />
            </ListItem>
            <ListItem>
              <ListItemText
                primary="Datos de identificación del paciente"
                secondary="Nombre, fecha de nacimiento, sexo, CURP, domicilio, teléfono, correo electrónico, contactos de emergencia."
              />
            </ListItem>
            <ListItem>
              <ListItemText
                primary="Datos sensibles (salud)"
                secondary="Historia clínica, antecedentes médicos familiares y personales, signos vitales, diagnósticos, tratamientos, recetas, estudios clínicos y notas del expediente."
              />
            </ListItem>
            <ListItem>
              <ListItemText
                primary="Datos técnicos"
                secondary="Dirección IP, identificador de dispositivo, metadatos de navegación, zona horaria y registros de acceso."
              />
            </ListItem>
          </List>
        </Section>

        <Section title="3. Finalidades del tratamiento">
          <Typography paragraph>
            <strong>Finalidades primarias</strong> (necesarias para el servicio):
          </Typography>
          <List dense>
            <ListItem>
              <ListItemText primary="Creación y conservación del expediente clínico electrónico conforme a NOM-004-SSA3-2012." />
            </ListItem>
            <ListItem>
              <ListItemText primary="Agendar y recordar citas médicas (incluyendo notificaciones vía WhatsApp)." />
            </ListItem>
            <ListItem>
              <ListItemText primary="Emisión de recetas médicas y órdenes de estudios clínicos." />
            </ListItem>
            <ListItem>
              <ListItemText primary="Intercambio interoperable de información clínica bajo el estándar HL7 FHIR (NOM-024-SSA3-2012) cuando sea solicitado por el paciente o autoridad competente." />
            </ListItem>
            <ListItem>
              <ListItemText primary="Cumplir obligaciones legales, fiscales y regulatorias ante autoridades como SSA, COFEPRIS, INAI y SAT." />
            </ListItem>
          </List>
          <Typography paragraph sx={{ mt: 2 }}>
            <strong>Finalidades secundarias</strong> (requieren consentimiento separado y
            pueden ser revocadas sin afectar el servicio):
          </Typography>
          <List dense>
            <ListItem>
              <ListItemText primary="Mejora del producto mediante análisis estadísticos anonimizados." />
            </ListItem>
            <ListItem>
              <ListItemText primary="Comunicaciones informativas sobre actualizaciones del servicio." />
            </ListItem>
          </List>
        </Section>

        <Section title="4. Transferencias">
          <Typography paragraph>
            Los datos personales no serán transferidos a terceros salvo en los
            siguientes casos, autorizados por la LFPDPPP Art. 37 sin requerir
            consentimiento adicional:
          </Typography>
          <List dense>
            <ListItem>
              <ListItemText
                primary="Proveedores de infraestructura"
                secondary="Google Cloud Platform (cómputo y almacenamiento), Meta WhatsApp Business (mensajería transaccional) — sujetos a acuerdos de tratamiento de datos equivalentes."
              />
            </ListItem>
            <ListItem>
              <ListItemText
                primary="Autoridades competentes"
                secondary="Cuando exista requerimiento formal de SSA, COFEPRIS, INAI, autoridad judicial o ministerial."
              />
            </ListItem>
            <ListItem>
              <ListItemText
                primary="Otros profesionales designados por el paciente"
                secondary="Mediante solicitud explícita de referencia o interconsulta."
              />
            </ListItem>
          </List>
        </Section>

        <Section title="5. Derechos ARCO">
          <Typography paragraph>
            Usted tiene derecho a Acceder, Rectificar, Cancelar u Oponerse (ARCO) al
            tratamiento de sus datos personales. También puede revocar el
            consentimiento otorgado.
          </Typography>
          <Typography paragraph>
            Para ejercer cualquiera de estos derechos envíe su solicitud al correo{' '}
            <Link href="mailto:privacidad@[[dominio]]">privacidad@[[dominio]]</Link> incluyendo:
          </Typography>
          <List dense>
            <ListItem>
              <ListItemText primary="Nombre completo y medio para recibir notificaciones." />
            </ListItem>
            <ListItem>
              <ListItemText primary="Copia de identificación oficial (INE/pasaporte)." />
            </ListItem>
            <ListItem>
              <ListItemText primary="Descripción clara del derecho que ejerce y los datos involucrados." />
            </ListItem>
          </List>
          <Typography paragraph sx={{ mt: 2 }}>
            Responderemos su solicitud dentro de los 20 días hábiles siguientes a su
            recepción, conforme al Art. 32 de la LFPDPPP.
          </Typography>
        </Section>

        <Section title="6. Medidas de seguridad">
          <Typography paragraph>
            Implementamos medidas administrativas, físicas y técnicas para proteger
            sus datos, incluyendo cifrado AES-256-GCM de datos sensibles en reposo,
            cifrado TLS 1.3 en tránsito, controles de acceso basados en rol,
            auditoría completa de accesos y respaldos periódicos. El periodo mínimo
            de conservación del expediente clínico es de 5 años conforme a
            NOM-004-SSA3-2012.
          </Typography>
        </Section>

        <Section title="7. Uso de tecnologías de rastreo">
          <Typography paragraph>
            Utilizamos cookies y tecnologías similares estrictamente necesarias para
            mantener su sesión autenticada y registrar eventos de auditoría. No
            empleamos cookies publicitarias ni de seguimiento de terceros sin
            consentimiento explícito.
          </Typography>
        </Section>

        <Section title="8. Cambios al aviso de privacidad">
          <Typography paragraph>
            Cualquier modificación a este aviso será notificada dentro de la
            plataforma con al menos 15 días hábiles de anticipación. La versión
            vigente estará siempre disponible en este mismo URL. Al continuar
            utilizando la plataforma después de la fecha de entrada en vigor de una
            nueva versión, se entenderá consentida dicha actualización.
          </Typography>
        </Section>

        <Section title="9. INAI">
          <Typography paragraph>
            Si considera que su derecho de protección de datos ha sido vulnerado,
            puede acudir al Instituto Nacional de Transparencia, Acceso a la
            Información y Protección de Datos Personales (INAI):{' '}
            <Link href="https://home.inai.org.mx/" target="_blank" rel="noopener noreferrer">
              home.inai.org.mx
            </Link>
            .
          </Typography>
        </Section>

        <Divider sx={{ my: 3 }} />

        <Typography variant="caption" color="text.secondary">
          Al aceptar este aviso de privacidad durante el registro, quedan
          registrados en nuestros sistemas: la fecha y hora exacta de aceptación,
          la versión del aviso aceptada ({PRIVACY_NOTICE_VERSION}), la dirección IP
          desde la que se otorgó el consentimiento, el agente de usuario del
          navegador y la zona horaria declarada por el dispositivo. Esta evidencia
          es conservada conforme al Art. 8 del Reglamento de la LFPDPPP.
        </Typography>
      </Paper>
    </Container>
  );
};

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <Box sx={{ mt: 4 }}>
    <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
      {title}
    </Typography>
    {children}
  </Box>
);

export default PrivacyNoticePage;
