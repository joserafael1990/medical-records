/**
 * Public Terms of Service page.
 *
 * Static MVP — complement to the active privacy notice served at `/privacy`.
 * Linked from QuickRegisterView's consent footer. Text placeholders in
 * [[ ]] must be replaced with the operator's legal entity details before
 * publishing.
 */

import React from 'react';
import {
  Box,
  Container,
  Paper,
  Typography,
  Divider,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';

const TERMS_VERSION = 'v1';
const LAST_UPDATED = '2026-04-19';

export const PublicTermsOfService: React.FC = () => {
  return (
    <Container maxWidth="md" sx={{ py: { xs: 3, sm: 5 } }}>
      <Paper elevation={0} sx={{ p: { xs: 3, sm: 5 }, borderRadius: 2 }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 700, mb: 1 }}>
          Términos y Condiciones de Uso
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Versión {TERMS_VERSION} · Última actualización: {LAST_UPDATED}
        </Typography>
        <Divider sx={{ my: 3 }} />

        <Section title="1. Aceptación">
          Al crear una cuenta y utilizar CORTEX (la "Plataforma"), el profesional
          médico ("Usuario") acepta estos Términos y Condiciones, el Aviso de
          Privacidad Integral disponible en <strong>/privacy</strong>, y las
          normativas aplicables: NOM-004-SSA3-2012, NOM-024-SSA3-2012,
          NOM-035-SSA3-2012 y la Ley Federal de Protección de Datos Personales
          en Posesión de los Particulares (LFPDPPP).
        </Section>

        <Section title="2. Naturaleza del servicio">
          CORTEX es un sistema de expediente clínico electrónico diseñado para
          auxiliar al profesional en la documentación de consultas, recetas,
          estudios y seguimiento de pacientes. La Plataforma <strong>no sustituye
          el juicio clínico</strong> del Usuario ni emite diagnósticos
          automatizados con valor médico-legal.
        </Section>

        <Section title="3. Responsabilidades del Usuario">
          <List dense>
            <ListItem sx={{ display: 'list-item' }}>
              <ListItemText primary="Mantener la confidencialidad de sus credenciales." />
            </ListItem>
            <ListItem sx={{ display: 'list-item' }}>
              <ListItemText primary="Registrar únicamente datos clínicos veraces y relevantes para la atención." />
            </ListItem>
            <ListItem sx={{ display: 'list-item' }}>
              <ListItemText primary="Obtener el consentimiento informado del paciente para el tratamiento de sus datos personales (LFPDPPP Art. 8)." />
            </ListItem>
            <ListItem sx={{ display: 'list-item' }}>
              <ListItemText primary="Completar los campos obligatorios del expediente clínico conforme a NOM-004 antes de cerrar una consulta." />
            </ListItem>
            <ListItem sx={{ display: 'list-item' }}>
              <ListItemText primary="No utilizar la Plataforma para actividades ilícitas, fraudulentas o que pongan en riesgo la integridad de terceros." />
            </ListItem>
          </List>
        </Section>

        <Section title="4. Datos personales y sensibles">
          El tratamiento de datos personales y datos sensibles de pacientes
          (salud, identificaciones oficiales, CURP, etc.) se rige por el Aviso
          de Privacidad Integral. CORTEX aplica cifrado AES-256-GCM a los
          campos sensibles en reposo y conserva bitácoras de auditoría de los
          accesos con el fin de cumplir las obligaciones de seguridad previstas
          en la LFPDPPP y su Reglamento.
        </Section>

        <Section title="5. Firma electrónica">
          Las firmas electrónicas generadas por CORTEX corresponden al supuesto
          del <strong>Art. 89-bis del Código de Comercio</strong> (firma
          electrónica simple): un hash SHA-256 del contenido del documento
          acompañado de un código de autenticación mensaje (HMAC) emitido por
          la Plataforma, validable públicamente mediante folio UUID. Se emite
          vinculada a la cédula profesional del Usuario emisor y tiene valor
          probatorio equivalente a la firma autógrafa digitalizada para los
          efectos de la Ley General de Salud Art. 240 y su Reglamento de
          Insumos Art. 50 (receta médica electrónica).
          <br /><br />
          Para documentos que requieran <strong>firma electrónica avanzada</strong>
          (FEA) con e.firma SAT o <strong>conservación con NOM-151-SCFI-2016</strong>
          mediante Prestador de Servicios de Certificación acreditado, consulte
          nuestros planes Premium. CORTEX no garantiza que la firma simple sea
          aceptada por todas las autoridades, farmacias, laboratorios o
          instituciones bancarias que puedan requerir FEA.
          <br /><br />
          El Usuario es el único responsable de la custodia de sus credenciales
          de acceso. Una firma generada desde una cuenta comprometida conserva
          su validez técnica; el Usuario debe notificar de inmediato cualquier
          uso no autorizado para revocación y bitácora de no repudio.
        </Section>

        <Section title="6. Propiedad intelectual">
          Los contenidos, marcas y código fuente de la Plataforma pertenecen a
          [[Nombre legal del operador]]. El Usuario conserva la titularidad de
          los datos clínicos que registra. La Plataforma recibe una licencia
          limitada y no exclusiva sobre esos datos para operar el servicio.
        </Section>

        <Section title="7. Disponibilidad y limitación de responsabilidad">
          CORTEX se ofrece bajo un modelo de mejor esfuerzo ("best effort"). No
          garantizamos disponibilidad ininterrumpida y recomendamos al Usuario
          respaldar periódicamente la información clínica crítica. En ningún
          caso [[Nombre legal del operador]] será responsable por daños
          indirectos, lucro cesante o consecuenciales derivados del uso o
          imposibilidad de uso de la Plataforma.
        </Section>

        <Section title="8. Cancelación de cuenta">
          El Usuario puede solicitar la cancelación de su cuenta en cualquier
          momento a través del centro de ayuda o ejerciendo los derechos ARCO
          descritos en el Aviso de Privacidad. La información clínica se
          conservará por el plazo legal mínimo aplicable (NOM-004, cinco años)
          antes de ser anonimizada o suprimida.
        </Section>

        <Section title="9. Modificaciones">
          Podremos actualizar estos Términos para reflejar cambios operativos o
          regulatorios. Notificaremos al Usuario con al menos 30 días de
          anticipación cuando los cambios sean materiales. El uso continuado de
          la Plataforma después de la fecha efectiva constituye aceptación.
        </Section>

        <Section title="10. Ley aplicable y jurisdicción">
          Estos Términos se rigen por las leyes de los Estados Unidos Mexicanos.
          Las controversias se someterán a los tribunales competentes de
          [[Ciudad, Entidad Federativa]], con renuncia expresa a cualquier otro
          fuero.
        </Section>

        <Section title="11. Contacto">
          Para preguntas o ejercicio de derechos: [[correo de contacto]].
        </Section>

        <Box sx={{ mt: 4 }}>
          <Typography variant="caption" color="text.secondary">
            Este documento es una versión preliminar. Antes de producción debe
            ser revisado por el área legal y completarse con los datos reales
            del operador.
          </Typography>
        </Box>
      </Paper>
    </Container>
  );
};

interface SectionProps {
  title: string;
  children: React.ReactNode;
}

const Section: React.FC<SectionProps> = ({ title, children }) => (
  <Box sx={{ mb: 3 }}>
    <Typography variant="h6" component="h2" sx={{ fontWeight: 600, mb: 1 }}>
      {title}
    </Typography>
    <Typography component="div" variant="body1" sx={{ color: 'text.primary', lineHeight: 1.7 }}>
      {children}
    </Typography>
  </Box>
);

export default PublicTermsOfService;
