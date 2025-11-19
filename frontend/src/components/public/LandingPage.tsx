import React from 'react';
import {
  AppBar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Grid,
  Stack,
  TextField,
  Toolbar,
  Typography
} from '@mui/material';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';

const stats = [
  { label: 'Consultas automatizadas', value: '12,500+' },
  { label: 'Recordatorios por WhatsApp', value: '98% tasa apertura' },
  { label: 'Clínicas activas', value: '40+' },
];

const steps = [
  { title: '1. Agenda', detail: 'Carga citas, confirma disponibilidad y segmenta por consultorio.' },
  { title: '2. Comunica', detail: 'Automatiza recordatorios, avisos y seguimientos por WhatsApp.' },
  { title: '3. Consulta', detail: 'Documenta al instante con plantillas médicas y firmas digitales.' },
  { title: '4. Analiza', detail: 'Activa alertas y reportes para retención y decisiones operativas.' },
];

const features = [
  {
    title: 'Recordatorios inteligentes',
    description: 'Envía recordatorios preaprobados por WhatsApp a cada paciente para reducir ausencias.',
  },
  {
    title: 'Agenda médica unificada',
    description: 'Sincroniza citas, turnos y disponibilidad del consultorio en una sola vista.',
  },
  {
    title: 'Historias clínicas seguras',
    description: 'Cumple con NOM-004 y resguarda expedientes con encriptación y auditoría completa.',
  },
  {
    title: 'Analíticos en tiempo real',
    description: 'Mide productividad, ingresos y seguimiento de pacientes con dashboards accionables.',
  },
];

const testimonials = [
  {
    quote: 'Reducimos 43% las ausencias gracias a los recordatorios automáticos y seguimiento inmediato.',
    author: 'Dra. Andrea Valdés',
    role: 'Directora Médica · Centro IVI Salud',
  },
  {
    quote: 'El expediente digital en cumplimiento con NOM-004 nos permitió activar telemedicina en 2 semanas.',
    author: 'Dr. Ernesto López',
    role: 'CEO · Salud Integrada MX',
  },
];

export const LandingPage: React.FC = () => {
  const navigateTo = (path: string) => {
    window.location.href = path;
  };

  return (
    <Box sx={{ bgcolor: '#f8fbff', color: '#0f172a', minHeight: '100vh' }}>
      <AppBar position="sticky" elevation={0} sx={{ bgcolor: 'transparent', color: 'inherit', backdropFilter: 'blur(10px)' }}>
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 700 }}>
            CORTEX · Historias Clínicas
          </Typography>
          <Button variant="text" color="inherit" onClick={() => navigateTo('/login')}>
            Iniciar sesión
          </Button>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ py: { xs: 8, md: 12 } }}>
        <Grid container spacing={6} alignItems="center">
          <Grid item xs={12} md={6}>
            <Chip
              label="Cumple NOM-004 · WhatsApp Business API"
              color="success"
              variant="outlined"
              sx={{ mb: 3, fontWeight: 600 }}
            />
            <Typography variant="h2" sx={{ fontWeight: 800, mb: 3 }}>
              Gestiona tus consultas, recordatorios y expedientes desde un solo lugar.
            </Typography>
            <Typography variant="h6" sx={{ color: 'text.secondary', mb: 4, lineHeight: 1.6 }}>
              Automatizamos la agenda, enviamos recordatorios aprobados por WhatsApp y firmamos cada historia clínica
              para que tu equipo se enfoque en los pacientes.
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <Button
                variant="contained"
                size="large"
                onClick={() => navigateTo('/login')}
              >
                Iniciar sesión
              </Button>
              <Button
                variant="outlined"
                size="large"
                onClick={() => navigateTo('/forgot-password')}
              >
                Solicitar demo
              </Button>
            </Stack>
            <Stack direction="row" spacing={3} sx={{ mt: 6 }}>
              {stats.map((stat) => (
                <Box key={stat.label}>
                  <Typography variant="h4" sx={{ fontWeight: 700 }}>
                    {stat.value}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {stat.label}
                  </Typography>
                </Box>
              ))}
            </Stack>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card elevation={3} sx={{ p: 4, borderRadius: 4, bgcolor: 'white' }}>
              <Typography variant="overline" color="primary">
                Flujo automatizado
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 700, mt: 1, mb: 3 }}>
                Agenda inteligente + WhatsApp + Expediente digital
              </Typography>
              <Stack spacing={3}>
                {steps.map((step) => (
                  <Stack direction="row" spacing={2} key={step.title} alignItems="flex-start">
                    <Box sx={{ width: 32, height: 32, borderRadius: '50%', bgcolor: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1d4ed8', fontWeight: 700 }}>
                      {step.title.split('.')[0]}
                    </Box>
                    <Box>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                        {step.title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {step.detail}
                      </Typography>
                    </Box>
                  </Stack>
                ))}
              </Stack>
            </Card>
          </Grid>
        </Grid>
      </Container>

      <Box sx={{ bgcolor: 'white', py: 10 }}>
        <Container maxWidth="lg">
          <Typography variant="overline" color="primary">
            Características principales
          </Typography>
          <Typography variant="h3" sx={{ fontWeight: 700, mt: 1, mb: 6 }}>
            Diseñado para clínicas que necesitan crecer con orden y cumplimiento.
          </Typography>
          <Grid container spacing={4}>
            {features.map((feature) => (
              <Grid item xs={12} md={6} key={feature.title}>
                <Card elevation={1} sx={{ p: 3, height: '100%' }}>
                  <Typography variant="h5" sx={{ fontWeight: 700 }}>
                    {feature.title}
                  </Typography>
                  <Typography variant="body1" color="text.secondary" sx={{ mt: 2 }}>
                    {feature.description}
                  </Typography>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py: 10 }}>
        <Grid container spacing={4}>
          {testimonials.map((testimonial) => (
            <Grid item xs={12} md={6} key={testimonial.author}>
              <Card elevation={0} sx={{ p: 4, bgcolor: '#eef4ff', height: '100%' }}>
                <Typography variant="h5" sx={{ fontWeight: 600, mb: 2 }}>
                  “{testimonial.quote}”
                </Typography>
                <Typography variant="subtitle1" color="text.secondary">
                  {testimonial.author} · {testimonial.role}
                </Typography>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>

      <Box sx={{ bgcolor: '#0f172a', color: 'white', py: 10 }}>
        <Container maxWidth="md" sx={{ textAlign: 'center' }}>
          <VerifiedUserIcon fontSize="large" />
          <Typography variant="h4" sx={{ fontWeight: 800, my: 3 }}>
            Cumplimos con NOM-004 y políticas de privacidad mexicanas.
          </Typography>
          <Typography variant="body1" sx={{ opacity: 0.8, mb: 4 }}>
            Firma digital, control de accesos y auditoría completa en cada consulta. Tu equipo se enfoca en los pacientes,
            nosotros en la seguridad.
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="center">
            <Button variant="contained" size="large" onClick={() => navigateTo('/login')}>
              Comenzar ahora
            </Button>
            <Button variant="outlined" color="inherit" size="large" onClick={() => navigateTo('/privacy-notice')}>
              Ver aviso de privacidad
            </Button>
          </Stack>
        </Container>
      </Box>

      <Box sx={{ bgcolor: '#020617', color: 'rgba(255,255,255,0.7)', py: 4 }}>
        <Container maxWidth="lg">
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={2}
            justifyContent="space-between"
            alignItems={{ xs: 'flex-start', md: 'center' }}
          >
            <Typography variant="body2">© {new Date().getFullYear()} CORTEX. Todos los derechos reservados.</Typography>
            <Stack direction="row" spacing={3}>
              <Button color="inherit" onClick={() => navigateTo('/privacy-notice')}>
                Aviso de privacidad
              </Button>
              <Button color="inherit" onClick={() => navigateTo('/login')}>
                Iniciar sesión
              </Button>
            </Stack>
          </Stack>
        </Container>
      </Box>
    </Box>
  );
};

export default LandingPage;
