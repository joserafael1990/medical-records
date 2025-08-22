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
import TextField from '@mui/material/TextField';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Tooltip from '@mui/material/Tooltip';
import MenuItem from '@mui/material/MenuItem';
import MenuList from '@mui/material/MenuList';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import IconButton from '@mui/material/IconButton';
import Divider from '@mui/material/Divider';
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
  AccessTime as TimeIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  LocationOn as LocationIcon,
  LocalHospital as HospitalIcon,
  Warning as WarningIcon,
  ArrowBack as ArrowBackIcon,
  Medication as MedicationIcon
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

// Patient interface
interface Patient {
  id: string;
  first_name: string;
  paternal_surname: string;
  maternal_surname: string;
  full_name: string;
  date_of_birth: string;
  place_of_birth: string;
  birth_state_code: string;
  nationality: string;
  internal_id?: string;
  age: number;
  gender: string;
  curp: string;
  phone: string;
  email?: string;
  address: string;
  neighborhood?: string;
  municipality: string;
  state: string;
  residence_state_code: string;
  postal_code?: string;
  civil_status?: string;
  education_level?: string;
  occupation?: string;
  religion?: string;
  insurance_type: string;
  insurance_number?: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  emergency_contact_relationship: string;
  emergency_contact_address?: string;
  allergies?: string;
  chronic_conditions?: string;
  current_medications?: string;
  blood_type?: string;
  previous_hospitalizations?: string;
  surgical_history?: string;
  family_history?: string;
  personal_pathological_history?: string;
  personal_non_pathological_history?: string;
  created_at: string;
  last_visit?: string;
  total_visits: number;
  status: string;
  last_updated?: string;
  created_by?: string;
  updated_by?: string;
}

// Medical record interfaces
interface VitalSigns {
  id: string;
  patient_id: string;
  date_recorded: string;
  weight?: number;
  height?: number;
  bmi?: number;
  blood_pressure_systolic?: number;
  blood_pressure_diastolic?: number;
  heart_rate?: number;
  temperature?: number;
  respiratory_rate?: number;
  oxygen_saturation?: number;
  notes?: string;
}

interface MedicalHistory {
  id: string;
  patient_id: string;
  date: string;
  chief_complaint: string;
  history_present_illness: string;
  physical_examination?: string;
  diagnosis: string;
  treatment_plan?: string;
  follow_up_instructions?: string;
  doctor_notes?: string;
  vital_signs_id?: string;
}

interface Prescription {
  id: string;
  patient_id: string;
  medical_history_id?: string;
  medication_name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions?: string;
  prescribed_date: string;
  status: string;
  notes?: string;
}

interface Appointment {
  id: string;
  patient_id: string;
  date_time: string;
  duration: number;
  appointment_type: string;
  status: string;
  chief_complaint?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

interface CompletePatientData {
  patient: Patient;
  medical_history: MedicalHistory[];
  vital_signs: VitalSigns[];
  prescriptions: Prescription[];
  appointments: Appointment[];
  active_prescriptions: Prescription[];
  upcoming_appointments: Appointment[];
}

function App() {
  const [backendStatus, setBackendStatus] = useState<'loading' | 'connected' | 'disconnected'>('loading');
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [activeView, setActiveView] = useState('dashboard');
  
  // Patient management state
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [patientDialogOpen, setPatientDialogOpen] = useState(false);
  const [isEditingPatient, setIsEditingPatient] = useState(false);
  const [patientSearchTerm, setPatientSearchTerm] = useState('');
  const [selectedPatientData, setSelectedPatientData] = useState<CompletePatientData | null>(null);
  const [patientFormData, setPatientFormData] = useState({
    first_name: '',
    paternal_surname: '',
    maternal_surname: '',
    date_of_birth: '',
    place_of_birth: '',
    birth_state_code: '',
    nationality: 'Mexicana',
    gender: '',
    curp: '',
    phone: '',
    email: '',
    address: '',
    municipality: '',
    state: '',
    residence_state_code: '',
    civil_status: '',
    occupation: '',
    insurance_type: 'Ninguno',
    insurance_number: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    emergency_contact_relationship: '',
    allergies: '',
    chronic_conditions: '',
    current_medications: '',
    blood_type: ''
  });

  // Patient management functions
  const fetchPatients = async () => {
    try {
      const response = await axios.get('http://localhost:8000/api/patients', {
        params: { search: patientSearchTerm }
      });
      // Ensure we always set an array - handle both array and object responses
      if (Array.isArray(response.data)) {
        setPatients(response.data);
      } else if (response.data && Array.isArray(response.data.patients)) {
        setPatients(response.data.patients);
      } else {
        setPatients([]);
      }
    } catch (error) {
      console.error('Error fetching patients:', error);
      // Set empty array to prevent the map error
      setPatients([]);
      // Mock data for demo when backend is not available
      setPatients([
        {
          id: 'PAT001',
          first_name: 'María',
          paternal_surname: 'González',
          maternal_surname: 'Pérez',
          place_of_birth: 'Ciudad de México, CDMX',
          birth_state_code: '09',
          nationality: 'Mexicana',
          municipality: 'Benito Juárez',
          state: 'Ciudad de México',
          residence_state_code: '09',
          full_name: 'María González Pérez',
          date_of_birth: '1985-05-15',
          age: 39,
          gender: 'Femenino',
          phone: '+52 555 123 4567',
          email: 'maria.gonzalez@email.com',
          address: 'Av. Insurgentes Sur 123, CDMX',
          curp: 'GOPM850515MDFNTR09',
          insurance_type: 'IMSS',
          insurance_number: '123456789',
          blood_type: 'O+',
          allergies: 'Penicilina',
          chronic_conditions: 'Diabetes tipo 2',
          current_medications: 'Metformina 500mg',
          emergency_contact_name: 'Juan González',
          emergency_contact_phone: '+52 555 987 6543',
          emergency_contact_relationship: 'Esposo',
          created_at: '2024-01-15T10:30:00',
          last_visit: '2024-08-20T14:45:00',
          total_visits: 5,
          status: 'active'
        }
      ]);
    }
  };

  const handlePatientSubmit = async () => {
    try {
      // Generate internal_id if creating new patient
      const submitData = { ...patientFormData };
      if (!isEditingPatient && !submitData.internal_id) {
        submitData.internal_id = `INT${Date.now()}`;
      }
      
      if (isEditingPatient && selectedPatient) {
        await axios.put(`http://localhost:8000/api/patients/${selectedPatient.id}`, submitData);
      } else {
        await axios.post('http://localhost:8000/api/patients', submitData);
      }
      setPatientDialogOpen(false);
      fetchPatients();
      resetPatientForm();
    } catch (error) {
      console.error('Error saving patient:', error);
      // Show error to user
      alert('Error al guardar paciente: ' + (error.response?.data?.detail || error.message));
    }
  };

  const handleEditPatient = (patient: Patient) => {
    setSelectedPatient(patient);
    setPatientFormData({
      first_name: patient.first_name,
      paternal_surname: patient.paternal_surname,
      maternal_surname: patient.maternal_surname,
      place_of_birth: patient.place_of_birth,
      birth_state_code: patient.birth_state_code,
      nationality: patient.nationality,
      municipality: patient.municipality,
      state: patient.state,
      residence_state_code: patient.residence_state_code,
      civil_status: patient.civil_status || '',
      occupation: patient.occupation || '',
      date_of_birth: patient.date_of_birth,
      gender: patient.gender,
      phone: patient.phone,
      email: patient.email || '',
      address: patient.address || '',
      curp: patient.curp || '',
      insurance_type: patient.insurance_type,
      insurance_number: patient.insurance_number || '',
      emergency_contact_name: patient.emergency_contact_name || '',
      emergency_contact_phone: patient.emergency_contact_phone || '',
      emergency_contact_relationship: patient.emergency_contact_relationship || '',
      allergies: patient.allergies || '',
      chronic_conditions: patient.chronic_conditions || '',
      current_medications: patient.current_medications || '',
      blood_type: patient.blood_type || ''
    });
    setIsEditingPatient(true);
    setPatientDialogOpen(true);
  };

  const handleNewPatient = () => {
    resetPatientForm();
    setIsEditingPatient(false);
    setPatientDialogOpen(true);
  };

  const resetPatientForm = () => {
        setPatientFormData({
      first_name: '',
      paternal_surname: '',
      maternal_surname: '',
      date_of_birth: '',
      place_of_birth: '',
      birth_state_code: '',
      nationality: 'Mexicana',
      gender: '',
      curp: '',
      phone: '',
      email: '',
      address: '',
      municipality: '',
      state: '',
      residence_state_code: '',
      civil_status: '',
      occupation: '',
      insurance_type: 'Ninguno',
      insurance_number: '',
      emergency_contact_name: '',
      emergency_contact_phone: '',
      emergency_contact_relationship: '',
      allergies: '',
      chronic_conditions: '',
      current_medications: '',
      blood_type: ''
    });
  setSelectedPatient(null);
};

// Fetch complete patient data
const fetchCompletePatientData = async (patientId: string) => {
  try {
    const response = await axios.get(`http://localhost:8000/api/patients/${patientId}/complete`);
    setSelectedPatientData(response.data);
  } catch (error) {
    console.error('Error fetching complete patient data:', error);
  }
};

// Handle patient detail view
const handleViewPatientDetails = (patient: Patient) => {
  setSelectedPatient(patient);
  setActiveView('patient-detail');
  fetchCompletePatientData(patient.id);
};

// Format date and time for display
const formatDateTime = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('es-MX', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

  // Check backend connection
  useEffect(() => {
    const checkBackend = async () => {
      try {
        await axios.get('http://localhost:8000/api/health');
        setBackendStatus('connected');
        
        // Fetch dashboard data
        const dashResponse = await axios.get('http://localhost:8000/api/physicians/dashboard');
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
            "Interfaz moderna y eficiente",
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

  // Fetch patients when view changes to patients
  useEffect(() => {
    if (activeView === 'patients') {
      fetchPatients();
    }
  }, [activeView, patientSearchTerm, fetchPatients]);

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

                            {activeView === 'patients' && (
                <Box>
                  {/* Patient Management Header */}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                    <Typography variant="h4" sx={{ fontWeight: 600 }}>
                      Gestión de Pacientes
                    </Typography>
                    <Button
                      variant="contained"
                      startIcon={<PersonAddIcon />}
                      onClick={handleNewPatient}
                      size="large"
                    >
                      Nuevo Paciente
                    </Button>
                    </Box>

                  {/* Search and Filters */}
                  <Paper sx={{ p: 3, mb: 3 }}>
                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                      <TextField
                        placeholder="Buscar por nombre, teléfono, email, CURP..."
                        value={patientSearchTerm}
                        onChange={(e) => setPatientSearchTerm(e.target.value)}
                        InputProps={{
                          startAdornment: <SearchIcon sx={{ color: 'text.secondary', mr: 1 }} />
                        }}
                        sx={{ flexGrow: 1 }}
                      />
                      <Button variant="outlined" startIcon={<AddIcon />}>
                        Filtros
                      </Button>
                    </Box>
                  </Paper>

                  {/* Patients Table */}
                  <Paper>
                    <TableContainer>
                      <Table>
                        <TableHead>
                          <TableRow>
                            <TableCell sx={{ fontWeight: 600 }}>Paciente</TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>Contacto</TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>Seguro</TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>Última Visita</TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>Estado</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 600 }}>Acciones</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {patients && Array.isArray(patients) && patients.map((patient) => (
                            <TableRow key={patient.id} hover>
                              <TableCell>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                  <Avatar sx={{ bgcolor: 'primary.main' }}>
                                    {patient.first_name[0]}{patient.paternal_surname[0]}
                                  </Avatar>
                                  <Box>
                                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                                      {patient.full_name}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                      {patient.age} años • {patient.gender}
                                    </Typography>
                                  </Box>
                                </Box>
                              </TableCell>
                              <TableCell>
                                <Box>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                                    <PhoneIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                                    <Typography variant="body2">{patient.phone}</Typography>
                                  </Box>
                                  {patient.email && (
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                      <EmailIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                                      <Typography variant="body2">{patient.email}</Typography>
                                    </Box>
                                  )}
                                </Box>
                              </TableCell>
                              <TableCell>
                                <Chip 
                                  label={patient.insurance_type}
                                  size="small"
                                  color={patient.insurance_type === 'IMSS' ? 'primary' : 
                                         patient.insurance_type === 'Privado' ? 'success' : 'default'}
                                  variant="outlined"
                                />
                              </TableCell>
                              <TableCell>
                                {patient.last_visit ? (
                                  <Typography variant="body2">
                                    {new Date(patient.last_visit).toLocaleDateString('es-MX')}
                                  </Typography>
                                ) : (
                                  <Typography variant="body2" color="text.secondary">
                                    Sin visitas
                                  </Typography>
                                )}
                              </TableCell>
                              <TableCell>
                                <Chip 
                                  label={patient.status === 'active' ? 'Activo' : 'Inactivo'}
                                  size="small"
                                  color={patient.status === 'active' ? 'success' : 'default'}
                                />
                              </TableCell>
                              <TableCell align="center">
                                <Box sx={{ display: 'flex', gap: 1 }}>
                                  <Tooltip title="Ver detalles">
                                    <IconButton 
                                      size="small" 
                                      color="primary"
                                      onClick={() => handleViewPatientDetails(patient)}
                                    >
                                      <ViewIcon />
                                    </IconButton>
                                  </Tooltip>
                                  <Tooltip title="Editar">
                                    <IconButton 
                                      size="small" 
                                      color="secondary"
                                      onClick={() => handleEditPatient(patient)}
                                    >
                                      <EditIcon />
                                    </IconButton>
                                  </Tooltip>
                                  <Tooltip title="Eliminar">
                                    <IconButton size="small" color="error">
                                      <DeleteIcon />
                                    </IconButton>
                                  </Tooltip>
                                </Box>
                              </TableCell>
                            </TableRow>
                          ))}
                          {(!patients || !Array.isArray(patients) || patients.length === 0) && (
                            <TableRow>
                              <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                                <Typography variant="body1" color="text.secondary">
                                  No hay pacientes registrados
                                </Typography>
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Paper>
                </Box>
              )}

              {activeView === 'patient-detail' && selectedPatientData && (
                <Box>
                  {/* Patient Detail Header */}
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                    <IconButton 
                      onClick={() => setActiveView('patients')} 
                      sx={{ mr: 2 }}
                      color="primary"
                    >
                      <ArrowBackIcon />
                    </IconButton>
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography variant="h4" sx={{ fontWeight: 600, mb: 1 }}>
                        {selectedPatientData.patient.full_name}
                      </Typography>
                      <Typography variant="body1" color="text.secondary">
                        {selectedPatientData.patient.age} años • {selectedPatientData.patient.gender} • 
                        {selectedPatientData.patient.insurance_type} • 
                        {selectedPatientData.patient.total_visits} visitas
                      </Typography>
                    </Box>
                    <Button
                      variant="outlined"
                      startIcon={<EditIcon />}
                      onClick={() => handleEditPatient(selectedPatientData.patient)}
                    >
                      Editar Paciente
                    </Button>
                  </Box>

                  {/* Patient Overview Cards */}
                  <Grid container spacing={3} sx={{ mb: 4 }}>
                    <Grid size={{ xs: 12, md: 4 }}>
                      <Card>
                        <CardContent>
                          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                            <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
                              <PatientIcon />
                            </Avatar>
                            <Typography variant="h6" sx={{ fontWeight: 600 }}>
                              Información Personal
                          </Typography>
                          </Box>
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <PhoneIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                              <Typography variant="body2">{selectedPatientData.patient.phone}</Typography>
                            </Box>
                            {selectedPatientData.patient.email && (
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <EmailIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                                <Typography variant="body2">{selectedPatientData.patient.email}</Typography>
                              </Box>
                            )}
                            {selectedPatientData.patient.address && (
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <LocationIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                                <Typography variant="body2">{selectedPatientData.patient.address}</Typography>
                              </Box>
                            )}
                            <Divider sx={{ my: 1 }} />
                            <Typography variant="body2" color="text.secondary">
                              <strong>CURP:</strong> {selectedPatientData.patient.curp || 'No registrado'}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                              <strong>Tipo de Sangre:</strong> {selectedPatientData.patient.blood_type || 'No registrado'}
                          </Typography>
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>

                    <Grid size={{ xs: 12, md: 4 }}>
                      <Card>
                        <CardContent>
                          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                            <Avatar sx={{ bgcolor: 'warning.main', mr: 2 }}>
                              <WarningIcon />
                            </Avatar>
                            <Typography variant="h6" sx={{ fontWeight: 600 }}>
                              Alertas Médicas
                          </Typography>
                          </Box>
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                            {selectedPatientData.patient.allergies && (
                              <Chip 
                                icon={<WarningIcon />}
                                label={`Alergia: ${selectedPatientData.patient.allergies}`}
                                color="error"
                                variant="outlined"
                                size="small"
                              />
                            )}
                            {selectedPatientData.patient.chronic_conditions && (
                              <Chip 
                                icon={<HospitalIcon />}
                                label={`Crónico: ${selectedPatientData.patient.chronic_conditions}`}
                                color="warning"
                                variant="outlined"
                                size="small"
                              />
                            )}
                            {selectedPatientData.active_prescriptions.length > 0 && (
                              <Chip 
                                icon={<MedicationIcon />}
                                label={`${selectedPatientData.active_prescriptions.length} medicamentos activos`}
                                color="info"
                                variant="outlined"
                                size="small"
                              />
                            )}
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>

                    <Grid size={{ xs: 12, md: 4 }}>
                      <Card>
                        <CardContent>
                          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                            <Avatar sx={{ bgcolor: 'success.main', mr: 2 }}>
                              <ScheduleIcon />
                            </Avatar>
                            <Typography variant="h6" sx={{ fontWeight: 600 }}>
                              Próximas Citas
                          </Typography>
                          </Box>
                          {selectedPatientData.upcoming_appointments.length > 0 ? (
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                              {selectedPatientData.upcoming_appointments.slice(0, 2).map((appointment) => (
                                <Box key={appointment.id} sx={{ p: 1, borderRadius: 1, bgcolor: 'grey.50' }}>
                                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                    {formatDateTime(appointment.date_time)}
                          </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    {appointment.chief_complaint || appointment.appointment_type}
                                  </Typography>
                                </Box>
                              ))}
                            </Box>
                          ) : (
                            <Typography variant="body2" color="text.secondary">
                              No hay citas programadas
                            </Typography>
                          )}
                        </CardContent>
                      </Card>
                    </Grid>
                  </Grid>

                  <Typography variant="h6" sx={{ mb: 2 }}>
                    Funcionalidad médica completa en desarrollo...
                  </Typography>
                </Box>
              )}

              {activeView !== 'dashboard' && activeView !== 'patients' && activeView !== 'patient-detail' && (
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

        {/* Patient Dialog */}
        <Dialog 
          open={patientDialogOpen} 
          onClose={() => setPatientDialogOpen(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            {isEditingPatient ? 'Editar Paciente' : 'Nuevo Paciente'}
          </DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              {/* Basic Information */}
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="Nombre"
                  value={patientFormData.first_name}
                  onChange={(e) => setPatientFormData({...patientFormData, first_name: e.target.value})}
                  required
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="Apellido Paterno"
                  value={patientFormData.paternal_surname}
                  onChange={(e) => setPatientFormData({...patientFormData, paternal_surname: e.target.value})}
                  required
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="Apellido Materno"
                  value={patientFormData.maternal_surname}
                  onChange={(e) => setPatientFormData({...patientFormData, maternal_surname: e.target.value})}
                  required
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="Fecha de Nacimiento"
                  type="date"
                  value={patientFormData.date_of_birth}
                  onChange={(e) => setPatientFormData({...patientFormData, date_of_birth: e.target.value})}
                  InputLabelProps={{ shrink: true }}
                  required
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl fullWidth required>
                  <InputLabel>Género</InputLabel>
                  <Select
                    value={patientFormData.gender}
                    onChange={(e) => setPatientFormData({...patientFormData, gender: e.target.value})}
                    label="Género"
                  >
                    <MenuItem value="Masculino">Masculino</MenuItem>
                    <MenuItem value="Femenino">Femenino</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              {/* NOM-024 Mandatory Birth Information */}
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="Lugar de Nacimiento"
                  value={patientFormData.place_of_birth}
                  onChange={(e) => setPatientFormData({...patientFormData, place_of_birth: e.target.value})}
                  required
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="Código Estado Nacimiento"
                  value={patientFormData.birth_state_code}
                  onChange={(e) => setPatientFormData({...patientFormData, birth_state_code: e.target.value})}
                  helperText="Código de 2 dígitos (ej: 09 para CDMX)"
                  required
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="Nacionalidad"
                  value={patientFormData.nationality}
                  onChange={(e) => setPatientFormData({...patientFormData, nationality: e.target.value})}
                  required
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="CURP"
                  value={patientFormData.curp}
                  onChange={(e) => setPatientFormData({...patientFormData, curp: e.target.value})}
                  inputProps={{ maxLength: 18 }}
                  helperText="Clave Única de Registro de Población"
                  required
                />
              </Grid>
              
              {/* Contact Information */}
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="Teléfono"
                  value={patientFormData.phone}
                  onChange={(e) => setPatientFormData({...patientFormData, phone: e.target.value})}
                  required
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="Email"
                  type="email"
                  value={patientFormData.email}
                  onChange={(e) => setPatientFormData({...patientFormData, email: e.target.value})}
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  label="Dirección"
                  value={patientFormData.address}
                  onChange={(e) => setPatientFormData({...patientFormData, address: e.target.value})}
                  multiline
                  rows={2}
                />
              </Grid>
              
              {/* NOM-024 Mandatory Address Fields */}
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="Municipio"
                  value={patientFormData.municipality}
                  onChange={(e) => setPatientFormData({...patientFormData, municipality: e.target.value})}
                  required
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="Estado"
                  value={patientFormData.state}
                  onChange={(e) => setPatientFormData({...patientFormData, state: e.target.value})}
                  required
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="Código Estado Residencia"
                  value={patientFormData.residence_state_code}
                  onChange={(e) => setPatientFormData({...patientFormData, residence_state_code: e.target.value})}
                  helperText="Código de 2 dígitos (ej: 09 para CDMX)"
                  required
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl fullWidth required>
                  <InputLabel>Estado Civil</InputLabel>
                  <Select
                    value={patientFormData.civil_status}
                    onChange={(e) => setPatientFormData({...patientFormData, civil_status: e.target.value})}
                    label="Estado Civil"
                  >
                    <MenuItem value="soltero">Soltero/a</MenuItem>
                    <MenuItem value="casado">Casado/a</MenuItem>
                    <MenuItem value="divorciado">Divorciado/a</MenuItem>
                    <MenuItem value="viudo">Viudo/a</MenuItem>
                    <MenuItem value="union_libre">Unión Libre</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl fullWidth required>
                  <InputLabel>Ocupación</InputLabel>
                  <Select
                    value={patientFormData.occupation}
                    onChange={(e) => setPatientFormData({...patientFormData, occupation: e.target.value})}
                    label="Ocupación"
                  >
                    <MenuItem value="desempleado">Desempleado</MenuItem>
                    <MenuItem value="estudiante">Estudiante</MenuItem>
                    <MenuItem value="ama_de_casa">Ama de Casa</MenuItem>
                    <MenuItem value="empleado">Empleado</MenuItem>
                    <MenuItem value="profesionista">Profesionista</MenuItem>
                    <MenuItem value="empresario">Empresario</MenuItem>
                    <MenuItem value="jubilado">Jubilado</MenuItem>
                    <MenuItem value="otro">Otro</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              {/* Medical Information */}
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="CURP"
                  value={patientFormData.curp}
                  onChange={(e) => setPatientFormData({...patientFormData, curp: e.target.value})}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl fullWidth>
                  <InputLabel>Tipo de Seguro</InputLabel>
                  <Select
                    value={patientFormData.insurance_type}
                    onChange={(e) => setPatientFormData({...patientFormData, insurance_type: e.target.value})}
                    label="Tipo de Seguro"
                  >
                    <MenuItem value="Ninguno">Ninguno</MenuItem>
                    <MenuItem value="IMSS">IMSS</MenuItem>
                    <MenuItem value="Seguro Popular">Seguro Popular</MenuItem>
                    <MenuItem value="Privado">Privado</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="Número de Seguro"
                  value={patientFormData.insurance_number}
                  onChange={(e) => setPatientFormData({...patientFormData, insurance_number: e.target.value})}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="Tipo de Sangre"
                  value={patientFormData.blood_type}
                  onChange={(e) => setPatientFormData({...patientFormData, blood_type: e.target.value})}
                />
              </Grid>
              
              {/* Medical History */}
              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  label="Alergias"
                  value={patientFormData.allergies}
                  onChange={(e) => setPatientFormData({...patientFormData, allergies: e.target.value})}
                  multiline
                  rows={2}
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  label="Condiciones Crónicas"
                  value={patientFormData.chronic_conditions}
                  onChange={(e) => setPatientFormData({...patientFormData, chronic_conditions: e.target.value})}
                  multiline
                  rows={2}
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  label="Medicamentos Actuales"
                  value={patientFormData.current_medications}
                  onChange={(e) => setPatientFormData({...patientFormData, current_medications: e.target.value})}
                  multiline
                  rows={2}
                />
              </Grid>
              
              {/* Emergency Contact */}
              <Grid size={{ xs: 12 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mt: 2, mb: 1 }}>
                  Contacto de Emergencia
                </Typography>
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField
                  fullWidth
                  label="Nombre"
                  value={patientFormData.emergency_contact_name}
                  onChange={(e) => setPatientFormData({...patientFormData, emergency_contact_name: e.target.value})}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField
                  fullWidth
                  label="Teléfono"
                  value={patientFormData.emergency_contact_phone}
                  onChange={(e) => setPatientFormData({...patientFormData, emergency_contact_phone: e.target.value})}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField
                  fullWidth
                  label="Relación"
                  value={patientFormData.emergency_contact_relationship}
                  onChange={(e) => setPatientFormData({...patientFormData, emergency_contact_relationship: e.target.value})}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setPatientDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handlePatientSubmit} variant="contained">
              {isEditingPatient ? 'Actualizar' : 'Crear'} Paciente
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </ThemeProvider>
  );
}

export default App;