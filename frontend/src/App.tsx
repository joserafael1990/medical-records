import React, { useState, useEffect } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Container from '@mui/material/Container';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Avatar from '@mui/material/Avatar';
import LinearProgress from '@mui/material/LinearProgress';
import MenuItem from '@mui/material/MenuItem';
import MenuList from '@mui/material/MenuList';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import IconButton from '@mui/material/IconButton';
import {
  MedicalServices as MedicalIcon,
  Dashboard as DashboardIcon,
  Description as DocumentIcon,
  People as PatientIcon,
  WhatsApp as WhatsAppIcon,
  AccountCircle as ProfileIcon,
  CheckCircle as CheckIcon,
  Schedule as ScheduleIcon,
  Analytics as AnalyticsIcon,
  TrendingUp as TrendingUpIcon,
  Speed as SpeedIcon,
  PersonAdd as PersonAddIcon,
  MessageOutlined as MessageIcon,
  NotificationsNone as NotificationIcon,
  SearchOutlined as SearchIcon,
  Add as AddIcon,
  CalendarToday as CalendarIcon,
  AccessTime as TimeIcon
} from '@mui/icons-material';
import axios from 'axios';

// Modern, elegant medical theme
const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#0B5394', // Professional medical blue
      light: '#4285F4',
      dark: '#073763',
    },
    secondary: {
      main: '#34A853', // Medical green
      light: '#7BC46D',
      dark: '#1E7E34',
    },
    success: {
      main: '#34A853',
      light: '#7BC46D',
    },
    error: {
      main: '#EA4335',
      light: '#FF6B6B',
    },
    warning: {
      main: '#FBBC04',
      light: '#FFD93D',
    },
    info: {
      main: '#4285F4',
      light: '#8AB4F8',
    },
    background: {
      default: '#F8FAFC', // Clean, modern background
      paper: '#FFFFFF',
    },
    text: {
      primary: '#1A1A1A',
      secondary: '#5F6368',
    },
    grey: {
      50: '#F8FAFC',
      100: '#F1F3F4',
      200: '#E8EAED',
      300: '#DADCE0',
      400: '#BDC1C6',
      500: '#9AA0A6',
      600: '#80868B',
      700: '#5F6368',
      800: '#3C4043',
      900: '#202124',
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", -apple-system, BlinkMacSystemFont, sans-serif',
    h1: {
      fontWeight: 700,
      fontSize: '2.5rem',
      lineHeight: 1.2,
    },
    h2: {
      fontWeight: 600,
      fontSize: '2rem',
      lineHeight: 1.3,
    },
    h3: {
      fontWeight: 600,
      fontSize: '1.75rem',
      lineHeight: 1.3,
    },
    h4: {
      fontWeight: 600,
      fontSize: '1.5rem',
      lineHeight: 1.4,
    },
    h5: {
      fontWeight: 600,
      fontSize: '1.25rem',
      lineHeight: 1.4,
    },
    h6: {
      fontWeight: 600,
      fontSize: '1.125rem',
      lineHeight: 1.4,
    },
    body1: {
      fontSize: '0.875rem',
      lineHeight: 1.5,
    },
    body2: {
      fontSize: '0.75rem',
      lineHeight: 1.5,
    },
    button: {
      fontWeight: 500,
      textTransform: 'none',
    },
  },
  shape: {
    borderRadius: 12,
  },
  shadows: [
    'none',
    '0px 2px 4px rgba(0, 0, 0, 0.04)',
    '0px 4px 8px rgba(0, 0, 0, 0.06)',
    '0px 8px 16px rgba(0, 0, 0, 0.08)',
    '0px 12px 24px rgba(0, 0, 0, 0.10)',
    '0px 16px 32px rgba(0, 0, 0, 0.12)',
    '0px 16px 32px rgba(0, 0, 0, 0.12)',
    '0px 16px 32px rgba(0, 0, 0, 0.12)',
    '0px 16px 32px rgba(0, 0, 0, 0.12)',
    '0px 16px 32px rgba(0, 0, 0, 0.12)',
    '0px 16px 32px rgba(0, 0, 0, 0.12)',
    '0px 16px 32px rgba(0, 0, 0, 0.12)',
    '0px 16px 32px rgba(0, 0, 0, 0.12)',
    '0px 16px 32px rgba(0, 0, 0, 0.12)',
    '0px 16px 32px rgba(0, 0, 0, 0.12)',
    '0px 16px 32px rgba(0, 0, 0, 0.12)',
    '0px 16px 32px rgba(0, 0, 0, 0.12)',
    '0px 16px 32px rgba(0, 0, 0, 0.12)',
    '0px 16px 32px rgba(0, 0, 0, 0.12)',
    '0px 16px 32px rgba(0, 0, 0, 0.12)',
    '0px 16px 32px rgba(0, 0, 0, 0.12)',
    '0px 16px 32px rgba(0, 0, 0, 0.12)',
    '0px 16px 32px rgba(0, 0, 0, 0.12)',
    '0px 16px 32px rgba(0, 0, 0, 0.12)',
    '0px 16px 32px rgba(0, 0, 0, 0.12)',
  ],
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: '#F8FAFC',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          background: 'linear-gradient(135deg, #0B5394 0%, #4285F4 100%)',
          boxShadow: '0px 4px 20px rgba(11, 83, 148, 0.15)',
          backdropFilter: 'blur(10px)',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.05)',
          borderRadius: '16px',
          border: '1px solid #E8EAED',
          transition: 'all 0.3s ease-in-out',
          '&:hover': {
            boxShadow: '0px 8px 24px rgba(0, 0, 0, 0.08)',
            transform: 'translateY(-2px)',
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: '12px',
          textTransform: 'none',
          fontWeight: 500,
          padding: '10px 24px',
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.15)',
          },
        },
        contained: {
          '&:hover': {
            boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.15)',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: '16px',
          border: '1px solid #E8EAED',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: '8px',
          fontWeight: 500,
        },
      },
    },

  },
});

// Dashboard data interface
interface DashboardData {
  physician: string;
  today_appointments: number;
  pending_records: number;
  whatsapp_messages: number;
  compliance_score: number;
  monthly_revenue: number;
  ai_time_saved: number;
  features_ready: string[];
}

function App() {
  const [backendStatus, setBackendStatus] = useState<'loading' | 'connected' | 'disconnected'>('loading');
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [activeView, setActiveView] = useState('dashboard');

  // Check backend connection
  useEffect(() => {
    const checkBackend = async () => {
      try {
        const response = await axios.get('http://localhost:8000/api/health');
        setBackendStatus('connected');
        
        // Fetch dashboard data
        const dashResponse = await axios.get('http://localhost:8000/api/dashboard');
        setDashboardData(dashResponse.data);
      } catch (error) {
        setBackendStatus('disconnected');
        // Mock data for demo
        setDashboardData({
          physician: 'Dr. García Martínez',
          today_appointments: 8,
          pending_records: 15,
          whatsapp_messages: 2,
          compliance_score: 100,
          monthly_revenue: 45000,
          ai_time_saved: 2.5,
          features_ready: [
            "Interfaz estilo Word",
            "Comunicación WhatsApp nativa", 
            "Cumplimiento automático NOM-004",
            "Sugerencias IA para diagnóstico",
            "Optimización de ingresos"
          ]
        });
      }
    };

    checkBackend();
  }, []);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ flexGrow: 1, minHeight: '100vh', backgroundColor: '#f8f9fa' }}>
        {/* Modern Medical Header */}
        <AppBar position="static" elevation={0}>
          <Toolbar sx={{ py: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 40,
                  height: 40,
                  backgroundColor: 'rgba(255,255,255,0.15)',
                  borderRadius: '12px',
                  backdropFilter: 'blur(10px)',
                }}
              >
                <MedicalIcon sx={{ color: 'white', fontSize: 24 }} />
              </Box>
              <Box>
                <Typography variant="h6" component="div" sx={{ color: 'white', fontWeight: 600 }}>
                  ClinicFlow
                </Typography>
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.75rem' }}>
                  Sistema Médico Inteligente
                </Typography>
              </Box>
            </Box>

            <Box sx={{ flexGrow: 1 }} />

            {/* Search Bar */}
            <Box sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center', mr: 3 }}>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  backgroundColor: 'rgba(255,255,255,0.15)',
                  borderRadius: '12px',
                  px: 2,
                  py: 1,
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  minWidth: 300,
                }}
              >
                <SearchIcon sx={{ color: 'rgba(255,255,255,0.7)', mr: 1 }} />
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                  Buscar paciente, expediente...
            </Typography>
              </Box>
            </Box>

            {/* Right Side - Status & Profile */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              {/* Notifications */}
              <IconButton sx={{ color: 'white' }}>
                <NotificationIcon />
              </IconButton>

              {/* Status Indicators */}
              <Box sx={{ display: { xs: 'none', sm: 'flex' }, gap: 1 }}>
              <Chip 
                  icon={<CheckIcon sx={{ fontSize: 16 }} />}
                  label={backendStatus === 'connected' ? "En línea" : backendStatus === 'loading' ? "Conectando..." : "Sin conexión"} 
                size="small" 
                  variant="filled"
                color={backendStatus === 'connected' ? 'success' : 'error'}
                  sx={{ 
                    backgroundColor: backendStatus === 'connected' ? 'rgba(52, 168, 83, 0.9)' : 'rgba(234, 67, 53, 0.9)',
                    color: 'white',
                    fontWeight: 500,
                    '& .MuiChip-icon': {
                      color: 'white'
                    }
                  }}
              />
              <Chip 
                  icon={<CheckIcon sx={{ fontSize: 16 }} />}
                  label="NOM-004" 
                size="small" 
                  variant="filled"
                  sx={{ 
                    backgroundColor: 'rgba(52, 168, 83, 0.9)',
                    color: 'white',
                    fontWeight: 500,
                    '& .MuiChip-icon': {
                      color: 'white'
                    }
                  }}
                />
              </Box>

              {/* Profile */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: 1 }}>
                <Box sx={{ textAlign: 'right', display: { xs: 'none', sm: 'block' } }}>
                  <Typography variant="body2" sx={{ color: 'white', fontWeight: 500 }}>
                    {dashboardData?.physician || 'Dr. García'}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                    Médico General
                  </Typography>
                </Box>
                <Avatar 
                  sx={{ 
                    bgcolor: 'rgba(255,255,255,0.15)', 
                    border: '2px solid rgba(255,255,255,0.2)',
                    backdropFilter: 'blur(10px)'
                  }}
                >
                  <ProfileIcon sx={{ color: 'white' }} />
              </Avatar>
              </Box>
            </Box>
          </Toolbar>
        </AppBar>

        {/* Backend Status Banner */}
        {backendStatus === 'loading' && (
          <Box sx={{ width: '100%' }}>
            <LinearProgress color="primary" />
          </Box>
        )}

        <Container maxWidth="xl" sx={{ mt: 3, mb: 3 }}>
          <Grid container spacing={3}>
            {/* Modern Sidebar Navigation */}
            <Grid size={{ xs: 12, md: 3 }}>
              <Box sx={{ position: 'sticky', top: 24 }}>
                <Paper sx={{ p: 3, mb: 2 }}>
                  <Typography variant="h6" sx={{ mb: 3, color: 'text.primary', fontWeight: 600 }}>
                    Panel de Control
                </Typography>
                  <MenuList sx={{ gap: 1 }}>
                  <MenuItem 
                    selected={activeView === 'dashboard'}
                    onClick={() => setActiveView('dashboard')}
                      sx={{ 
                        borderRadius: '12px', 
                        mb: 1,
                        '&.Mui-selected': {
                          backgroundColor: 'primary.main',
                          color: 'white',
                          '& .MuiListItemIcon-root': {
                            color: 'white'
                          }
                        }
                      }}
                  >
                    <ListItemIcon>
                        <DashboardIcon />
                    </ListItemIcon>
                      <ListItemText 
                        primary="Panel Principal" 
                        primaryTypographyProps={{ fontWeight: 500 }}
                      />
                  </MenuItem>
                  
                  <MenuItem 
                    selected={activeView === 'clinical-note'}
                    onClick={() => setActiveView('clinical-note')}
                      sx={{ 
                        borderRadius: '12px', 
                        mb: 1,
                        '&.Mui-selected': {
                          backgroundColor: 'primary.main',
                          color: 'white',
                          '& .MuiListItemIcon-root': {
                            color: 'white'
                          }
                        }
                      }}
                  >
                    <ListItemIcon>
                        <DocumentIcon />
                    </ListItemIcon>
                      <ListItemText 
                        primary="Nueva Consulta" 
                        primaryTypographyProps={{ fontWeight: 500 }}
                      />
                  </MenuItem>
                  
                  <MenuItem 
                    selected={activeView === 'patients'}
                    onClick={() => setActiveView('patients')}
                      sx={{ 
                        borderRadius: '12px', 
                        mb: 1,
                        '&.Mui-selected': {
                          backgroundColor: 'primary.main',
                          color: 'white',
                          '& .MuiListItemIcon-root': {
                            color: 'white'
                          }
                        }
                      }}
                  >
                    <ListItemIcon>
                        <PatientIcon />
                    </ListItemIcon>
                      <ListItemText 
                        primary="Pacientes" 
                        primaryTypographyProps={{ fontWeight: 500 }}
                      />
                  </MenuItem>
                  
                  <MenuItem 
                    selected={activeView === 'whatsapp'}
                    onClick={() => setActiveView('whatsapp')}
                      sx={{ 
                        borderRadius: '12px', 
                        mb: 1,
                        '&.Mui-selected': {
                          backgroundColor: 'primary.main',
                          color: 'white',
                          '& .MuiListItemIcon-root': {
                            color: 'white'
                          }
                        }
                      }}
                  >
                    <ListItemIcon>
                        <WhatsAppIcon />
                    </ListItemIcon>
                      <ListItemText 
                        primary="WhatsApp" 
                        primaryTypographyProps={{ fontWeight: 500 }}
                      />
                  </MenuItem>
                  
                  <MenuItem 
                      selected={activeView === 'analytics'}
                      onClick={() => setActiveView('analytics')}
                      sx={{ 
                        borderRadius: '12px', 
                        mb: 1,
                        '&.Mui-selected': {
                          backgroundColor: 'primary.main',
                          color: 'white',
                          '& .MuiListItemIcon-root': {
                            color: 'white'
                          }
                        }
                      }}
                  >
                    <ListItemIcon>
                        <AnalyticsIcon />
                    </ListItemIcon>
                      <ListItemText 
                        primary="Analíticas" 
                        primaryTypographyProps={{ fontWeight: 500 }}
                      />
                  </MenuItem>
                </MenuList>
                </Paper>

                {/* Quick Actions Card */}
                <Paper sx={{ p: 3 }}>
                  <Typography variant="h6" sx={{ mb: 2, color: 'text.primary', fontWeight: 600 }}>
                    Acciones Rápidas
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    <Button
                      variant="contained"
                      startIcon={<PersonAddIcon />}
                      fullWidth
                      sx={{ justifyContent: 'flex-start', py: 1.5 }}
                    >
                      Nuevo Paciente
                    </Button>
                    <Button
                      variant="outlined"
                      startIcon={<ScheduleIcon />}
                      fullWidth
                      sx={{ justifyContent: 'flex-start', py: 1.5 }}
                    >
                      Agendar Cita
                    </Button>
                    <Button
                      variant="outlined"
                      startIcon={<MessageIcon />}
                      fullWidth
                      sx={{ justifyContent: 'flex-start', py: 1.5 }}
                    >
                      Enviar Mensaje
                    </Button>
                  </Box>
              </Paper>
              </Box>
            </Grid>

            {/* Main Content Area */}
            <Grid size={{ xs: 12, md: 9 }}>
              {activeView === 'dashboard' && (
                <Box>
                  {/* Welcome Header */}
                  <Box sx={{ mb: 4 }}>
                    <Typography variant="h4" sx={{ mb: 1, fontWeight: 600 }}>
                      Buenos días, {dashboardData?.physician || 'Dr. García'}
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                      Aquí tienes un resumen de tu día y métricas de eficiencia.
                  </Typography>
                  </Box>

                  {/* Key Metrics Row */}
                  <Grid container spacing={3} sx={{ mb: 4 }}>
                    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                      <Card sx={{ 
                        background: 'linear-gradient(135deg, #4285F4 0%, #34A853 100%)',
                        color: 'white',
                        border: 'none'
                      }}>
                        <CardContent sx={{ pb: 2 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Box>
                              <Typography variant="h3" sx={{ fontWeight: 700, mb: 0.5 }}>
                            {dashboardData?.today_appointments || 8}
                          </Typography>
                              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                                Citas Hoy
                          </Typography>
                            </Box>
                            <CalendarIcon sx={{ fontSize: 40, opacity: 0.8 }} />
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                    
                    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                      <Card sx={{ 
                        background: 'linear-gradient(135deg, #34A853 0%, #FBBC04 100%)',
                        color: 'white',
                        border: 'none'
                      }}>
                        <CardContent sx={{ pb: 2 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Box>
                              <Typography variant="h3" sx={{ fontWeight: 700, mb: 0.5 }}>
                                {dashboardData?.ai_time_saved || 2.5}h
                          </Typography>
                              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                                Tiempo Ahorrado
                          </Typography>
                            </Box>
                            <SpeedIcon sx={{ fontSize: 40, opacity: 0.8 }} />
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                    
                    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                      <Card sx={{ 
                        background: 'linear-gradient(135deg, #FBBC04 0%, #EA4335 100%)',
                        color: 'white',
                        border: 'none'
                      }}>
                        <CardContent sx={{ pb: 2 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Box>
                              <Typography variant="h3" sx={{ fontWeight: 700, mb: 0.5 }}>
                                {dashboardData?.whatsapp_messages || 2}
                          </Typography>
                              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                                Mensajes Pendientes
                          </Typography>
                            </Box>
                            <MessageIcon sx={{ fontSize: 40, opacity: 0.8 }} />
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>

                    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                      <Card sx={{ 
                        background: 'linear-gradient(135deg, #EA4335 0%, #4285F4 100%)',
                        color: 'white',
                        border: 'none'
                      }}>
                        <CardContent sx={{ pb: 2 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Box>
                              <Typography variant="h3" sx={{ fontWeight: 700, mb: 0.5 }}>
                                {dashboardData?.compliance_score || 100}%
                          </Typography>
                              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                                Cumplimiento
                          </Typography>
                            </Box>
                            <CheckIcon sx={{ fontSize: 40, opacity: 0.8 }} />
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                  </Grid>

                  {/* Main Content Row */}
                  <Grid container spacing={3}>
                    {/* Today's Schedule */}
                    <Grid size={{ xs: 12, md: 8 }}>
                      <Card>
                        <CardContent sx={{ p: 3 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                            <Typography variant="h6" sx={{ fontWeight: 600 }}>
                              Agenda de Hoy
                            </Typography>
                            <Button variant="outlined" size="small" startIcon={<AddIcon />}>
                              Nueva Cita
                            </Button>
                          </Box>
                          
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            {[
                              { time: '09:00', patient: 'María González', type: 'Consulta General', status: 'confirmed' },
                              { time: '10:30', patient: 'Carlos Hernández', type: 'Seguimiento', status: 'confirmed' },
                              { time: '12:00', patient: 'Ana Rodríguez', type: 'Consulta General', status: 'pending' },
                              { time: '14:00', patient: 'Luis Martínez', type: 'Revisión', status: 'confirmed' },
                            ].map((appointment, index) => (
                              <Box
                                key={index}
                                sx={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  p: 2,
                                  borderRadius: '12px',
                                  backgroundColor: index === 1 ? 'primary.light' : 'grey.50',
                                  color: index === 1 ? 'white' : 'text.primary',
                                  border: index === 1 ? 'none' : '1px solid',
                                  borderColor: 'grey.200'
                                }}
                              >
                                <Box sx={{ 
                                  display: 'flex', 
                                  alignItems: 'center', 
                                  justifyContent: 'center',
                                  width: 60,
                                  height: 60,
                                  borderRadius: '12px',
                                  backgroundColor: index === 1 ? 'rgba(255,255,255,0.2)' : 'primary.main',
                                  color: 'white',
                                  mr: 2
                                }}>
                                  <TimeIcon />
                                </Box>
                                <Box sx={{ flexGrow: 1 }}>
                                  <Typography variant="body1" sx={{ fontWeight: 600, mb: 0.5 }}>
                                    {appointment.time} - {appointment.patient}
                                  </Typography>
                                  <Typography variant="body2" sx={{ opacity: 0.8 }}>
                                    {appointment.type}
                                  </Typography>
                                </Box>
                                <Chip
                                  label={appointment.status === 'confirmed' ? 'Confirmada' : 'Pendiente'}
                                  size="small"
                                  color={appointment.status === 'confirmed' ? 'success' : 'warning'}
                                  sx={{ fontWeight: 500 }}
                                />
                              </Box>
                      ))}
                    </Box>
                        </CardContent>
                      </Card>
                    </Grid>

                    {/* Revenue & Efficiency Panel */}
                    <Grid size={{ xs: 12, md: 4 }}>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        {/* Revenue Card */}
                        <Card>
                          <CardContent sx={{ p: 3 }}>
                            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                              Ingresos del Mes
                            </Typography>
                            <Typography variant="h3" color="success.main" sx={{ fontWeight: 700, mb: 1 }}>
                              ${dashboardData?.monthly_revenue?.toLocaleString() || '45,000'}
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                              <TrendingUpIcon color="success" sx={{ fontSize: 20 }} />
                              <Typography variant="body2" color="success.main" sx={{ fontWeight: 500 }}>
                                +25% vs mes anterior
                              </Typography>
                            </Box>
                            <Typography variant="body2" color="text.secondary">
                              Optimización automática de facturación activa
                            </Typography>
                          </CardContent>
                        </Card>

                        {/* Efficiency Metrics */}
                        <Card>
                          <CardContent sx={{ p: 3 }}>
                            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                              Métricas de Eficiencia
                            </Typography>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                              <Box>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                  <Typography variant="body2">Tiempo promedio por consulta</Typography>
                                  <Typography variant="body2" sx={{ fontWeight: 600 }}>18 min</Typography>
                                </Box>
                                <LinearProgress 
                                  variant="determinate" 
                                  value={75} 
                                  sx={{ borderRadius: '4px', height: 6 }}
                                />
                              </Box>
                              <Box>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                  <Typography variant="body2">Eficiencia documental</Typography>
                                  <Typography variant="body2" sx={{ fontWeight: 600 }}>94%</Typography>
                                </Box>
                                <LinearProgress 
                                  variant="determinate" 
                                  value={94} 
                                  color="success"
                                  sx={{ borderRadius: '4px', height: 6 }}
                                />
                              </Box>
                              <Box>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                  <Typography variant="body2">Satisfacción del paciente</Typography>
                                  <Typography variant="body2" sx={{ fontWeight: 600 }}>4.8/5</Typography>
                                </Box>
                                <LinearProgress 
                                  variant="determinate" 
                                  value={96} 
                                  color="info"
                                  sx={{ borderRadius: '4px', height: 6 }}
                                />
                              </Box>
                            </Box>
                          </CardContent>
                        </Card>
                      </Box>
                    </Grid>
                  </Grid>
                </Box>
              )}

              {activeView !== 'dashboard' && (
                <Box>
                  <Box sx={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    minHeight: '60vh',
                    textAlign: 'center'
                  }}>
                    <Box sx={{ 
                      width: 120, 
                      height: 120, 
                      borderRadius: '50%', 
                      backgroundColor: 'primary.light',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mb: 3
                    }}>
                      <Typography variant="h2" sx={{ color: 'white' }}>🚧</Typography>
                    </Box>
                    <Typography variant="h4" sx={{ mb: 2, fontWeight: 600 }}>
                      Funcionalidad en Desarrollo
                  </Typography>
                    <Typography variant="body1" color="text.secondary" sx={{ mb: 4, maxWidth: 500 }}>
                      Estamos construyendo esta sección para maximizar tu eficiencia. 
                      Mientras tanto, puedes usar el dashboard principal para gestionar tu práctica.
                    </Typography>
                    <Button 
                      variant="contained" 
                      onClick={() => setActiveView('dashboard')}
                      startIcon={<DashboardIcon />}
                      size="large"
                    >
                      Volver al Dashboard
                    </Button>
                  </Box>
                </Box>
              )}
            </Grid>
          </Grid>
        </Container>
      </Box>
    </ThemeProvider>
  );
}

export default App;