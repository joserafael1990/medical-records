import React, { useState, useEffect, useCallback, useMemo, useRef, Suspense } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Container from '@mui/material/Container';
import Box from '@mui/material/Box';
// Grid removed - using Box with flexbox instead
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

import MenuItem from '@mui/material/MenuItem';
import MenuList from '@mui/material/MenuList';
import Menu from '@mui/material/Menu';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import IconButton from '@mui/material/IconButton';

import Divider from '@mui/material/Divider';

// Import lazy-loaded components for code splitting
import {
  DashboardView,
  PatientsView,
  ConsultationsView,
  AgendaView,
  PatientDialog,
  ConsultationDialog,
  DoctorProfileView,
  DoctorProfileDialog
} from './components/lazy';
import { ConsultationDetailView } from './components';
import { LoadingFallback } from './components';
import { Patient, DoctorFormData } from './types';
import { useDoctorProfile } from './hooks/useDoctorProfile';
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

  Phone as PhoneIcon,
  Email as EmailIcon,
  LocationOn as LocationIcon,
  LocalHospital as HospitalIcon,
  Warning as WarningIcon,
  ArrowBack as ArrowBackIcon,
  Medication as   MedicationIcon,
  Close as CloseIcon,
  Delete as DeleteIcon,
  Settings as SettingsIcon,
  Person as PersonIcon,
  ExitToApp as LogoutIcon,
  KeyboardArrowDown as ArrowDownIcon
} from '@mui/icons-material';
import axios from 'axios';

// Mexican States with Official INEGI Codes




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

// Patient interface imported from types

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
  const [fieldErrors, setFieldErrors] = useState<{[key: string]: string}>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [formErrorMessage, setFormErrorMessage] = useState<string>('');
  const successTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Consultations management state
  const [consultations, setConsultations] = useState<any[]>([]);
  const [consultationSearchTerm, setConsultationSearchTerm] = useState('');
  const [consultationDialogOpen, setConsultationDialogOpen] = useState(false);
  const [isEditingConsultation, setIsEditingConsultation] = useState(false);
  const [selectedConsultation, setSelectedConsultation] = useState<any>(null);
  const [consultationDetailView, setConsultationDetailView] = useState(false);
  const [consultationFormData, setConsultationFormData] = useState({
    patient_id: '',
    date: '',
    chief_complaint: '',
    history_present_illness: '',
    physical_examination: '',
    primary_diagnosis: '',
    primary_diagnosis_cie10: '',
    secondary_diagnoses: '',
    secondary_diagnoses_cie10: '',
    treatment_plan: '',
    therapeutic_plan: '',
    follow_up_instructions: '',
    prognosis: '',
    laboratory_results: '',
    imaging_studies: '',
    interconsultations: '',
    doctor_name: '',
    doctor_professional_license: '',
    doctor_specialty: ''
  });

  // Agenda management state
  const [appointments, setAppointments] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  // User menu state
  const [userMenuAnchor, setUserMenuAnchor] = useState<null | HTMLElement>(null);
  const userMenuOpen = Boolean(userMenuAnchor);

  // Doctor profile management
  const {
    doctorProfile,
    isLoading: isDoctorProfileLoading,
    isEditing: isEditingDoctorProfile,
    dialogOpen: doctorProfileDialogOpen,
    formData: doctorProfileFormData,
    fieldErrors: doctorProfileFieldErrors,
    formErrorMessage: doctorProfileFormErrorMessage,
    successMessage: doctorProfileSuccessMessage,
    isSubmitting: isDoctorProfileSubmitting,
    setFormData: setDoctorProfileFormData,
    setFormErrorMessage: setDoctorProfileFormErrorMessage,
    handleEdit: handleEditDoctorProfile,
    handleCreate: handleCreateDoctorProfile,
    handleCancel: handleCancelDoctorProfile,
    handleSubmit: handleSubmitDoctorProfile,
    clearMessages: clearDoctorProfileMessages
  } = useDoctorProfile();
  const [agendaView, setAgendaView] = useState<'daily' | 'weekly'>('daily');
  const [patientFormData, setPatientFormData] = useState({
    // ===== CAMPOS OBLIGATORIOS NOM-004 =====
    first_name: '',
    paternal_surname: '',
    maternal_surname: '',
    date_of_birth: '',
    gender: '',
    address: '',
    family_history: '',
    personal_pathological_history: '',
    personal_non_pathological_history: '',
    
    // ===== CAMPOS OPCIONALES =====
    // Identificación adicional
    birth_state_code: '',
    nationality: 'Mexicana',
    curp: '',
    internal_id: '',
    
    // Contacto adicional
    phone: '',
    email: '',
    neighborhood: '',
    municipality: '',
    state: '',
    postal_code: '',
    
    // Datos sociodemográficos
    civil_status: '',
    education_level: '',
    occupation: '',
    religion: '',
    
    // Seguro médico
    insurance_type: '',
    insurance_number: '',
    
    // Contacto de emergencia
    emergency_contact_name: '',
    emergency_contact_phone: '',
    emergency_contact_relationship: '',
    emergency_contact_address: '',
    
    // Historial médico adicional
    allergies: '',
    chronic_conditions: '',
    current_medications: '',
    blood_type: '',
    previous_hospitalizations: '',
    surgical_history: ''
  });

  // Utility function to calculate age from date of birth
  const calculateAge = (dateOfBirth: string): number => {
    const birthDate = new Date(dateOfBirth);
    const today = new Date();
    
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    // If the birthday hasn't occurred this year yet, subtract 1 from age
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  };

  // Optimized success message handler
  const showSuccessMessage = useCallback((message: string) => {
    // Clear any existing timeout
    if (successTimeoutRef.current) {
      clearTimeout(successTimeoutRef.current);
    }
    
    setSuccessMessage(message);
    
    // Set new timeout
    successTimeoutRef.current = setTimeout(() => {
      setSuccessMessage('');
      successTimeoutRef.current = null;
    }, 5000);
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (successTimeoutRef.current) {
        clearTimeout(successTimeoutRef.current);
      }
    };
  }, []);

  // Global error handler to catch runtime errors
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      // Filter out extension-related errors
      if (event.message.includes('runtime.lastError') || 
          event.message.includes('Extension context invalidated') ||
          event.message.includes('message channel closed')) {
        console.warn('Browser extension error (can be ignored):', event.message);
        return;
      }
      console.error('Application error:', event.error);
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('Unhandled promise rejection:', event.reason);
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  // Patient management functions
  const fetchPatients = useCallback(async () => {
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
          birth_state_code: 'Ciudad de México',
          nationality: 'Mexicana',
          municipality: 'Benito Juárez',
          state: 'Ciudad de México',
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
          family_history: 'Diabetes mellitus tipo 2 (madre), Hipertensión arterial (padre)',
          personal_pathological_history: 'Diabetes mellitus tipo 2 diagnosticada en 2020',
          personal_non_pathological_history: 'Niega tabaquismo, alcoholismo ocasional',
          created_at: '2024-01-15T10:30:00',
          last_visit: '2024-08-20T14:45:00',
          total_visits: 5,
          status: 'active'
        }
      ]);
    }
  }, [patientSearchTerm]);





  const resetPatientForm = useCallback(() => {
    setPatientFormData({
      // ===== CAMPOS OBLIGATORIOS NOM-004 =====
      first_name: '',
      paternal_surname: '',
      maternal_surname: '',
      date_of_birth: '',
      gender: '',
      address: '',
      family_history: '',
      personal_pathological_history: '',
      personal_non_pathological_history: '',
      
      // ===== CAMPOS OPCIONALES =====
      // Identificación adicional
      birth_state_code: '',
      nationality: 'Mexicana',
      curp: '',
      internal_id: '',
      
      // Contacto adicional
      phone: '',
      email: '',
      neighborhood: '',
      municipality: '',
      state: '',
      postal_code: '',
      
      // Datos sociodemográficos
      civil_status: '',
      education_level: '',
      occupation: '',
      religion: '',
      
      // Seguro médico
      insurance_type: '',
      insurance_number: '',
      
      // Contacto de emergencia
      emergency_contact_name: '',
      emergency_contact_phone: '',
      emergency_contact_relationship: '',
      emergency_contact_address: '',
      
      // Historial médico adicional
      allergies: '',
      chronic_conditions: '',
      current_medications: '',
      blood_type: '',
      previous_hospitalizations: '',
      surgical_history: ''
    });
    setSelectedPatient(null);
    setFieldErrors({});
    setFormErrorMessage('');
    setIsSubmitting(false);
  }, []);

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
};

// Consultation handlers (enhanced implementation)
const handleNewConsultation = useCallback(() => {
  setSelectedConsultation(null);
  setIsEditingConsultation(false);
  setConsultationFormData({
    patient_id: '',
    date: new Date().toISOString().slice(0, 16),
    chief_complaint: '',
    history_present_illness: '',
    physical_examination: '',
    primary_diagnosis: '',
    primary_diagnosis_cie10: '',
    secondary_diagnoses: '',
    secondary_diagnoses_cie10: '',
    treatment_plan: '',
    therapeutic_plan: '',
    follow_up_instructions: '',
    prognosis: '',
    laboratory_results: '',
    imaging_studies: '',
    interconsultations: '',
    doctor_name: '',
    doctor_professional_license: '',
    doctor_specialty: ''
  });
  setConsultationDialogOpen(true);
  setFormErrorMessage('');
  setConsultationDetailView(false);
}, []);

const handleEditConsultation = useCallback((consultation: any) => {
  setSelectedConsultation(consultation);
  setIsEditingConsultation(true);
  setConsultationFormData({
    patient_id: consultation.patient_id || '',
    date: consultation.date || '',
    chief_complaint: consultation.chief_complaint || '',
    history_present_illness: consultation.history_present_illness || '',
    physical_examination: consultation.physical_examination || '',
    primary_diagnosis: consultation.primary_diagnosis || '',
    primary_diagnosis_cie10: consultation.primary_diagnosis_cie10 || '',
    secondary_diagnoses: consultation.secondary_diagnoses || '',
    secondary_diagnoses_cie10: consultation.secondary_diagnoses_cie10 || '',
    treatment_plan: consultation.treatment_plan || '',
    therapeutic_plan: consultation.therapeutic_plan || '',
    follow_up_instructions: consultation.follow_up_instructions || '',
    prognosis: consultation.prognosis || '',
    laboratory_results: consultation.laboratory_results || '',
    imaging_studies: consultation.imaging_studies || '',
    interconsultations: consultation.interconsultations || '',
    doctor_name: consultation.doctor_name || '',
    doctor_professional_license: consultation.doctor_professional_license || '',
    doctor_specialty: consultation.doctor_specialty || ''
  });
  setConsultationDialogOpen(true);
  setFormErrorMessage('');
  setConsultationDetailView(false);
}, []);

// Handle view consultation
const handleViewConsultation = useCallback((consultation: any) => {
  setSelectedConsultation(consultation);
  setConsultationDetailView(true);
}, []);

// Handle print consultation
const handlePrintConsultation = useCallback((consultation: any) => {
  // Create a print-friendly version
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(`
      <html>
        <head>
          <title>Consulta Médica - ${consultation.patient_name}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .section { margin-bottom: 20px; }
            .label { font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Consulta Médica</h1>
            <p>Fecha: ${new Date(consultation.date).toLocaleDateString('es-MX')}</p>
            <p>Paciente: ${consultation.patient_name}</p>
          </div>
          <div class="section">
            <div class="label">Motivo de Consulta:</div>
            <p>${consultation.chief_complaint}</p>
          </div>
          <div class="section">
            <div class="label">Historia de la Enfermedad Actual:</div>
            <p>${consultation.history_present_illness}</p>
          </div>
          <div class="section">
            <div class="label">Exploración Física:</div>
            <p>${consultation.physical_examination}</p>
          </div>
          <div class="section">
            <div class="label">Diagnóstico Principal:</div>
            <p>${consultation.primary_diagnosis}</p>
          </div>
          <div class="section">
            <div class="label">Plan de Tratamiento:</div>
            <p>${consultation.treatment_plan}</p>
          </div>
          <div class="section">
            <div class="label">Instrucciones de Seguimiento:</div>
            <p>${consultation.follow_up_instructions}</p>
          </div>
          <div class="section">
            <div class="label">Doctor:</div>
            <p>${consultation.doctor_name} - Cédula: ${consultation.doctor_professional_license}</p>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  }
}, []);

// Fetch consultations from API
const fetchConsultations = useCallback(async () => {
  try {
    const response = await fetch(`http://localhost:8000/api/consultations?patient_search=${consultationSearchTerm}`);
    if (response.ok) {
      const data = await response.json();
      setConsultations(data);
    } else {
      console.error('Error fetching consultations:', response.statusText);
    }
  } catch (error) {
    console.error('Error fetching consultations:', error);
  }
}, [consultationSearchTerm]);

// Handle delete consultation
const handleDeleteConsultation = useCallback(async (consultation: any) => {
  if (!window.confirm(`¿Estás seguro de que deseas eliminar la consulta de ${consultation.patient_name}?`)) {
    return;
  }
  
  try {
    // TODO: Implement delete API call when backend is ready
    console.log('Delete consultation:', consultation);
    showSuccessMessage(`Consulta de ${consultation.patient_name} eliminada exitosamente`);
    fetchConsultations(); // Refresh the list
  } catch (error) {
    console.error('Error deleting consultation:', error);
    setFormErrorMessage('Error al eliminar la consulta');
  }
}, [fetchConsultations]);

// Handle back from consultation detail
const handleBackFromConsultationDetail = useCallback(() => {
  setConsultationDetailView(false);
  setSelectedConsultation(null);
}, []);

// User menu handlers
const handleUserMenuOpen = useCallback((event: React.MouseEvent<HTMLElement>) => {
  setUserMenuAnchor(event.currentTarget);
}, []);

const handleUserMenuClose = useCallback(() => {
  setUserMenuAnchor(null);
}, []);

const handleOpenProfile = useCallback(() => {
  handleUserMenuClose();
  if (doctorProfile) {
    handleEditDoctorProfile();
  } else {
    handleCreateDoctorProfile();
  }
  setActiveView('profile');
}, [doctorProfile, handleEditDoctorProfile, handleCreateDoctorProfile]);

const handleLogout = useCallback(() => {
  handleUserMenuClose();
  // TODO: Implement logout logic
  console.log('Logout clicked');
}, []);

// Handle consultation form submission
const handleConsultationSubmit = useCallback(async () => {
  setIsSubmitting(true);
  setFormErrorMessage('');
  
  try {
    const url = isEditingConsultation 
      ? `http://localhost:8000/api/consultations/${selectedConsultation?.id}`
      : 'http://localhost:8000/api/consultations';
    
    const method = isEditingConsultation ? 'PUT' : 'POST';
    
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(consultationFormData),
    });

    if (response.ok) {
      const result = await response.json();
      showSuccessMessage(
        isEditingConsultation 
          ? 'Consulta actualizada exitosamente' 
          : 'Consulta creada exitosamente'
      );
      setConsultationDialogOpen(false);
      fetchConsultations(); // Refresh the list
    } else {
      const errorData = await response.json();
      setFormErrorMessage(errorData.detail || 'Error al guardar la consulta');
    }
  } catch (error) {
    console.error('Error saving consultation:', error);
    setFormErrorMessage('Error de conexión al guardar la consulta');
  } finally {
    setIsSubmitting(false);
  }
}, [consultationFormData, isEditingConsultation, selectedConsultation, fetchConsultations]);

// Appointment handlers (basic implementation)
const handleNewAppointment = () => {
  console.log('New appointment');
};

const handleEditAppointment = (appointment: any) => {
  console.log('Edit appointment', appointment);
};

// Validation function for required fields
const validatePatientForm = () => {
  const errors: {[key: string]: string} = {};
  
  // Mandatory fields according to NOM-004
  if (!patientFormData.first_name.trim()) errors.first_name = 'Este campo es obligatorio';
  if (!patientFormData.paternal_surname.trim()) errors.paternal_surname = 'Este campo es obligatorio';
  if (!patientFormData.maternal_surname.trim()) errors.maternal_surname = 'Este campo es obligatorio';
  if (!patientFormData.date_of_birth) errors.date_of_birth = 'Este campo es obligatorio';
  if (!patientFormData.gender) errors.gender = 'Este campo es obligatorio';
  if (!patientFormData.phone.trim()) errors.phone = 'Este campo es obligatorio';
  if (!patientFormData.address.trim()) errors.address = 'Este campo es obligatorio';
  if (!patientFormData.family_history.trim()) errors.family_history = 'Este campo es obligatorio';
  if (!patientFormData.personal_pathological_history.trim()) errors.personal_pathological_history = 'Este campo es obligatorio';
  if (!patientFormData.personal_non_pathological_history.trim()) errors.personal_non_pathological_history = 'Este campo es obligatorio';
  
  return errors;
};

// Clear error for a specific field when user starts typing
const clearFieldError = useCallback((fieldName: string) => {
  setFieldErrors(prev => {
    if (prev[fieldName]) {
      const newErrors = { ...prev };
      delete newErrors[fieldName];
      return newErrors;
    }
    return prev; // Return same object if no changes needed
  });
}, []);

// Optimized handler for field changes with debouncing
const handleFieldChange = useCallback((fieldName: string, value: string) => {
  // Update form data immediately for UI responsiveness
  setPatientFormData(prev => ({
    ...prev,
    [fieldName]: value
  }));
  
  // Clear error if exists (debounced to avoid excessive re-renders)
  if (fieldErrors[fieldName]) {
    setFieldErrors(prev => {
      if (!prev[fieldName]) return prev; // No change needed
      const newErrors = { ...prev };
      delete newErrors[fieldName];
      return newErrors;
    });
  }
}, [fieldErrors]);

// Handle patient form submission
const handlePatientSubmit = async () => {
  console.log('=== PATIENT SUBMIT STARTED ===');
  // Set submitting state
  setIsSubmitting(true);
  
  // Clear any previous form error
  setFormErrorMessage('');
  
  // Validate required fields
  const validationErrors = validatePatientForm();
  setFieldErrors(validationErrors);
  
  if (Object.keys(validationErrors).length > 0) {
    setIsSubmitting(false);
    setFormErrorMessage('Por favor, completa todos los campos obligatorios marcados en rojo.');
    return;
  }
  
  try {
    // Prepare patient data for backend (only fields expected by PatientBase model)
    const patientData = {
      first_name: patientFormData.first_name,
      paternal_surname: patientFormData.paternal_surname,
      maternal_surname: patientFormData.maternal_surname,
      date_of_birth: patientFormData.date_of_birth,
      gender: patientFormData.gender,
      place_of_birth: null, // Not included in frontend form
      birth_state_code: patientFormData.birth_state_code || null,
      nationality: patientFormData.nationality || "Mexicana",
      curp: patientFormData.curp || null,
      internal_id: patientFormData.internal_id || null,
      phone: patientFormData.phone,
      address: patientFormData.address,
      email: patientFormData.email || null,
      neighborhood: patientFormData.neighborhood || null,
      municipality: patientFormData.municipality || null,
      state: patientFormData.state || null,
      postal_code: patientFormData.postal_code || null,
      civil_status: patientFormData.civil_status || null,
      education_level: patientFormData.education_level || null,
      occupation: patientFormData.occupation || null,
      religion: patientFormData.religion || null,
      insurance_type: patientFormData.insurance_type || null,
      insurance_number: patientFormData.insurance_number || null,
      emergency_contact_name: patientFormData.emergency_contact_name || null,
      emergency_contact_phone: patientFormData.emergency_contact_phone || null,
      emergency_contact_relationship: patientFormData.emergency_contact_relationship || null,
      emergency_contact_address: patientFormData.emergency_contact_address || null,
      allergies: patientFormData.allergies || null,
      chronic_conditions: patientFormData.chronic_conditions || null,
      current_medications: patientFormData.current_medications || null,
      blood_type: patientFormData.blood_type || null,
      family_history: patientFormData.family_history,
      personal_pathological_history: patientFormData.personal_pathological_history,
      personal_non_pathological_history: patientFormData.personal_non_pathological_history,
      previous_hospitalizations: patientFormData.previous_hospitalizations || null,
      surgical_history: patientFormData.surgical_history || null
    };
    
    if (isEditingPatient && selectedPatient) {
      // Update existing patient
      const response = await axios.put(`http://localhost:8000/api/patients/${selectedPatient.id}`, patientData);
      if (response.status === 200) {
        const patientName = `${patientFormData.first_name} ${patientFormData.paternal_surname} ${patientFormData.maternal_surname}`;
        fetchPatients();
        setPatientDialogOpen(false);
        resetPatientForm();
        setFieldErrors({});
        showSuccessMessage(`✅ El paciente ${patientName} fue actualizado exitosamente`);
      }
    } else {
      // Create new patient
      console.log('Sending patient data:', JSON.stringify(patientData, null, 2));
      console.log('Full form data:', JSON.stringify(patientFormData, null, 2));
      const response = await axios.post('http://localhost:8000/api/patients', patientData);
      console.log('Response received:', response.status, response.data);
      console.log('Response status type:', typeof response.status);
      
      // Check for both 200 and 201 status codes
      if (response.status === 201 || response.status === 200) {
        const patientName = `${patientFormData.first_name} ${patientFormData.paternal_surname} ${patientFormData.maternal_surname}`;
        console.log('Success! Closing dialog and changing view...');
        
        // Immediate UI updates
        setPatientDialogOpen(false);
        setActiveView('patients');
        
        // Batch state updates to avoid multiple re-renders
        setTimeout(() => {
          setFormErrorMessage('');
          setFieldErrors({});
          resetPatientForm();
          showSuccessMessage(`✅ El paciente ${patientName} fue agregado con éxito`);
          fetchPatients();
        }, 10);
        
        console.log('Success flow completed');
      } else {
        console.log('Unexpected response status:', response.status);
        console.log('Full response:', response);
        // Force close dialog even if status is unexpected but patient was created
        if (response.data && response.data.id) {
          console.log('Patient was created despite unexpected status, forcing success flow...');
          const patientName = `${patientFormData.first_name} ${patientFormData.paternal_surname} ${patientFormData.maternal_surname}`;
          
          // Immediate UI updates
          setPatientDialogOpen(false);
          setActiveView('patients');
          
          // Batch other updates
          setTimeout(() => {
            setFormErrorMessage('');
            setFieldErrors({});
            resetPatientForm();
            showSuccessMessage(`✅ El paciente ${patientName} fue agregado con éxito`);
            fetchPatients();
          }, 10);
        }
      }
    }
  } catch (error: any) {
    console.error('Error saving patient:', error);
    console.error('Error response status:', error.response?.status);
    console.error('Error response data:', error.response?.data);
    console.error('Error response headers:', error.response?.headers);
    console.error('Request config:', error.config);
    
    let errorMessage = 'Error al guardar el paciente. Por favor, verifica los datos e intenta nuevamente.';
    
    if (error.response?.data) {
      if (typeof error.response.data === 'string') {
        errorMessage = error.response.data;
      } else if (error.response.data.detail) {
        errorMessage = error.response.data.detail;
      } else if (error.response.data.message) {
        errorMessage = error.response.data.message;
      } else if (Array.isArray(error.response.data)) {
        // Handle validation error arrays
        errorMessage = error.response.data.map((err: any) => 
          err.msg || err.message || JSON.stringify(err)
        ).join(', ');
      } else {
        // If it's an object, try to extract meaningful error info
        console.error('Unknown error format:', error.response.data);
        errorMessage = `Error ${error.response.status}: ${JSON.stringify(error.response.data)}`;
      }
    }
    
    console.error('Final error message:', errorMessage);
    setFormErrorMessage(errorMessage);
  } finally {
    console.log('=== PATIENT SUBMIT FINISHED ===');
    setIsSubmitting(false);
  }
};

// Handle edit patient
const handleEditPatient = (patient: Patient) => {
  setPatientFormData({
    // ===== CAMPOS OBLIGATORIOS NOM-004 =====
    first_name: patient.first_name,
    paternal_surname: patient.paternal_surname,
    maternal_surname: patient.maternal_surname,
    date_of_birth: patient.date_of_birth,
    gender: patient.gender,
    phone: patient.phone,
    address: patient.address,
    family_history: patient.family_history,
    personal_pathological_history: patient.personal_pathological_history,
    personal_non_pathological_history: patient.personal_non_pathological_history,
    
    // ===== CAMPOS OPCIONALES =====
    // Identificación adicional
    birth_state_code: patient.birth_state_code || '',
    nationality: patient.nationality || '',
    curp: patient.curp || '',
    internal_id: patient.internal_id || '',
    
    // Contacto adicional
    neighborhood: patient.neighborhood || '',
    
    // Datos demográficos
    municipality: patient.municipality || '',
    state: patient.state || '',
    postal_code: patient.postal_code || '',
    civil_status: patient.civil_status || '',
    education_level: patient.education_level || '',
    occupation: patient.occupation || '',
    religion: patient.religion || '',
    
    // Seguro médico
    insurance_type: patient.insurance_type || '',
    insurance_number: patient.insurance_number || '',
    
    // Contacto de emergencia
    emergency_contact_name: patient.emergency_contact_name || '',
    emergency_contact_phone: patient.emergency_contact_phone || '',
    emergency_contact_relationship: patient.emergency_contact_relationship || '',
    emergency_contact_address: patient.emergency_contact_address || '',
    
    // Información médica adicional
    blood_type: patient.blood_type || '',
    allergies: patient.allergies || '',
    chronic_conditions: patient.chronic_conditions || '',
    current_medications: patient.current_medications || '',
    previous_hospitalizations: patient.previous_hospitalizations || '',
    surgical_history: patient.surgical_history || '',
    
    // Otros campos
    email: patient.email || ''
  });
  
  setSelectedPatient(patient);
  setIsEditingPatient(true);
  setPatientDialogOpen(true);
};

// Handle new patient
const handleNewPatient = useCallback(() => {
  resetPatientForm();
  setIsEditingPatient(false);
  setFormErrorMessage('');
  setPatientDialogOpen(true);
}, []);

// Handle delete patient
const handleDeletePatient = useCallback(async () => {
  if (!selectedPatient) return;
  
  const patientName = `${selectedPatient.first_name} ${selectedPatient.paternal_surname} ${selectedPatient.maternal_surname}`;
  
  // Confirmation dialog
  const confirmDelete = window.confirm(
    `⚠️ ¿Estás seguro de que deseas eliminar al paciente ${patientName}?\n\n` +
    `Esta acción NO se puede deshacer y se eliminará:\n` +
    `• Toda la información del paciente\n` +
    `• Historial médico\n` +
    `• Citas programadas\n` +
    `• Prescripciones\n\n` +
    `Escribe "ELIMINAR" en el siguiente campo si estás completamente seguro.`
  );
  
  if (!confirmDelete) return;
  
  // Additional confirmation
  const confirmText = window.prompt(
    `Para confirmar la eliminación del paciente ${patientName}, escribe exactamente: ELIMINAR`
  );
  
  if (confirmText !== 'ELIMINAR') {
    alert('❌ Eliminación cancelada. El texto no coincide.');
    return;
  }
  
  try {
    setIsSubmitting(true);
    const response = await axios.delete(`http://localhost:8000/api/patients/${selectedPatient.id}`);
    
    if (response.status === 200 || response.status === 204) {
      setPatientDialogOpen(false);
      resetPatientForm();
      setFieldErrors({});
      setActiveView('patients');
      fetchPatients();
      showSuccessMessage(`🗑️ El paciente ${patientName} fue eliminado exitosamente`);
    }
  } catch (error: any) {
    console.error('Error deleting patient:', error);
    const errorMessage = error.response?.data?.detail || 'Error al eliminar el paciente. Por favor, intenta nuevamente.';
    alert(`❌ Error: ${errorMessage}`);
  } finally {
    setIsSubmitting(false);
  }
}, [selectedPatient, fetchPatients]);

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
  }, [activeView]); // Remove fetchPatients dependency to avoid loops

  // Search patients with debounce
  useEffect(() => {
    if (activeView === 'patients' && patientSearchTerm !== undefined) {
      const timeoutId = setTimeout(() => {
        fetchPatients();
      }, 500); // Increased debounce to 500ms to reduce API calls
      
      return () => clearTimeout(timeoutId);
    }
  }, [patientSearchTerm, activeView]); // Remove fetchPatients dependency

  // Fetch consultations when view changes to consultations
  useEffect(() => {
    if (activeView === 'consultations') {
      fetchConsultations();
    }
  }, [activeView, fetchConsultations]);

  // Debounced consultation search
  useEffect(() => {
    if (activeView === 'consultations' && consultationSearchTerm !== undefined) {
      const timeoutId = setTimeout(() => {
        fetchConsultations();
      }, 500); // 500ms debounce
      
      return () => clearTimeout(timeoutId);
    }
  }, [consultationSearchTerm, activeView]);

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
                    {doctorProfile 
                      ? `${doctorProfile.first_name} ${doctorProfile.paternal_surname}` 
                      : (dashboardData?.physician || 'Dr. García')
                    }
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                    {doctorProfile?.specialty || 'Médico General'}
                  </Typography>
                </Box>
                <IconButton
                  onClick={handleUserMenuOpen}
                  sx={{ 
                    p: 0,
                    '&:hover': {
                      backgroundColor: 'rgba(255,255,255,0.1)'
                    }
                  }}
                >
                  <Avatar 
                    sx={{ 
                      bgcolor: 'rgba(255,255,255,0.15)', 
                      border: '2px solid rgba(255,255,255,0.2)',
                      backdropFilter: 'blur(10px)',
                      cursor: 'pointer'
                    }}
                  >
                    {doctorProfile ? 
                      `${doctorProfile.first_name[0]}${doctorProfile.paternal_surname[0]}` :
                      <ProfileIcon sx={{ color: 'white' }} />
                    }
                  </Avatar>
                </IconButton>
                <ArrowDownIcon 
                  sx={{ 
                    color: 'rgba(255,255,255,0.7)', 
                    fontSize: 16,
                    ml: 0.5,
                    transform: userMenuOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.2s ease'
                  }} 
                />
              </Box>
            </Box>
          </Toolbar>
        </AppBar>

        {/* User Menu */}
        <Menu
          anchorEl={userMenuAnchor}
          open={userMenuOpen}
          onClose={handleUserMenuClose}
          PaperProps={{
            sx: {
              mt: 1.5,
              minWidth: 220,
              borderRadius: '12px',
              boxShadow: '0px 8px 32px rgba(0,0,0,0.12)',
              border: '1px solid rgba(0,0,0,0.05)'
            }
          }}
          transformOrigin={{ horizontal: 'right', vertical: 'top' }}
          anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        >
          <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              {doctorProfile 
                ? `${doctorProfile.first_name} ${doctorProfile.paternal_surname}` 
                : (dashboardData?.physician || 'Dr. García')
              }
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {doctorProfile?.specialty || 'Médico General'}
            </Typography>
            {doctorProfile?.professional_license && (
              <Typography variant="caption" color="text.secondary">
                Cédula: {doctorProfile.professional_license}
              </Typography>
            )}
          </Box>
          
          <MenuItem onClick={handleOpenProfile}>
            <ListItemIcon>
              <PersonIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>
              <Typography variant="body2">
                {doctorProfile ? 'Editar Perfil' : 'Configurar Perfil'}
              </Typography>
            </ListItemText>
          </MenuItem>
          
          <MenuItem onClick={() => { handleUserMenuClose(); setActiveView('dashboard'); }}>
            <ListItemIcon>
              <SettingsIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>
              <Typography variant="body2">Configuración</Typography>
            </ListItemText>
          </MenuItem>
          
          <Divider />
          
          <MenuItem onClick={handleLogout} sx={{ color: 'error.main' }}>
            <ListItemIcon>
              <LogoutIcon fontSize="small" sx={{ color: 'error.main' }} />
            </ListItemIcon>
            <ListItemText>
              <Typography variant="body2">Cerrar Sesión</Typography>
            </ListItemText>
          </MenuItem>
        </Menu>

        {/* Backend Status Banner */}
        {backendStatus === 'loading' && (
          <Box sx={{ width: '100%' }}>
            <LinearProgress color="primary" />
          </Box>
        )}

        <Container maxWidth="xl" sx={{ mt: 3, mb: 3 }}>
          <Box sx={{ display: 'flex', gap: 3, flexDirection: { xs: 'column', md: 'row' } }}>
            {/* Modern Sidebar Navigation */}
            <Box sx={{ width: { xs: '100%', md: '25%' }, position: 'sticky', top: 24 }}>
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
                    selected={activeView === 'consultations'}
                    onClick={() => setActiveView('consultations')}
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
                        <MedicalIcon />
                    </ListItemIcon>
                      <ListItemText 
                        primary="Consultas" 
                        primaryTypographyProps={{ fontWeight: 500 }}
                      />
                  </MenuItem>
                  
                  <MenuItem 
                    selected={activeView === 'agenda'}
                    onClick={() => setActiveView('agenda')}
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
                        <CalendarIcon />
                    </ListItemIcon>
                      <ListItemText 
                        primary="Agenda" 
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
                      onClick={handleNewPatient}
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

            {/* Main Content Area */}
            <Box sx={{ width: { xs: '100%', md: '75%' } }}>
              {activeView === 'dashboard' && (
                <Suspense fallback={<LoadingFallback message="Cargando dashboard..." />}>
                  <DashboardView dashboardData={dashboardData} />
                </Suspense>
              )}

              {activeView === 'patients' && (
                <Suspense fallback={<LoadingFallback message="Cargando pacientes..." />}>
                  <PatientsView
                    patients={patients}
                    patientSearchTerm={patientSearchTerm}
                    setPatientSearchTerm={setPatientSearchTerm}
                    successMessage={successMessage}
                    setSuccessMessage={setSuccessMessage}
                    handleNewPatient={handleNewPatient}
                    handleEditPatient={handleEditPatient}
                  />
                </Suspense>
              )}

              {activeView === 'consultations' && !consultationDetailView && (
                <Suspense fallback={<LoadingFallback message="Cargando consultas..." />}>
                  <ConsultationsView
                    consultations={consultations}
                    consultationSearchTerm={consultationSearchTerm}
                    setConsultationSearchTerm={setConsultationSearchTerm}
                    handleNewConsultation={handleNewConsultation}
                    handleEditConsultation={handleEditConsultation}
                    handleViewConsultation={handleViewConsultation}
                    handlePrintConsultation={handlePrintConsultation}
                    handleDeleteConsultation={handleDeleteConsultation}
                  />
                </Suspense>
              )}

              {activeView === 'consultations' && consultationDetailView && selectedConsultation && (
                <Suspense fallback={<LoadingFallback message="Cargando detalles..." />}>
                  <ConsultationDetailView
                    consultation={selectedConsultation}
                    onBack={handleBackFromConsultationDetail}
                    onEdit={handleEditConsultation}
                    onPrint={handlePrintConsultation}
                  />
                </Suspense>
              )}

              {activeView === 'agenda' && (
                <Suspense fallback={<LoadingFallback message="Cargando agenda..." />}>
                  <AgendaView
                    appointments={appointments}
                    selectedDate={selectedDate}
                    setSelectedDate={setSelectedDate}
                    agendaView={agendaView}
                    setAgendaView={setAgendaView}
                    handleNewAppointment={handleNewAppointment}
                    handleEditAppointment={handleEditAppointment}
                  />
                </Suspense>
              )}

              {activeView === 'profile' && (
                <Suspense fallback={<LoadingFallback message="Cargando perfil..." />}>
                  <DoctorProfileView
                    doctorProfile={doctorProfile}
                    isLoading={isDoctorProfileLoading}
                    onEdit={handleEditDoctorProfile}
                    onSave={handleSubmitDoctorProfile}
                    isEditing={isEditingDoctorProfile}
                    formData={doctorProfileFormData}
                    setFormData={setDoctorProfileFormData}
                    onCancel={handleCancelDoctorProfile}
                    successMessage={doctorProfileSuccessMessage}
                    errorMessage={doctorProfileFormErrorMessage}
                  />
                </Suspense>
              )}

              {/* Keep the rest of the original dashboard content as fallback */}
              {false && activeView === 'dashboard' && (
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
                  <Box sx={{ display: 'flex', gap: 2, mb: 4, flexWrap: 'wrap' }}>
                    <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 45%', md: '1 1 22%' } }}>
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
                    </Box>
                    
                    <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 45%', md: '1 1 22%' } }}>
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
                    </Box>
                    
                    <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 45%', md: '1 1 22%' } }}>
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
                    </Box>
                    
                    <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 45%', md: '1 1 22%' } }}>
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
                    </Box>
                  </Box>

                  {/* Main Content Row */}
                  <Box sx={{ display: 'flex', gap: 3, flexDirection: { xs: 'column', md: 'row' } }}>
                    {/* Today's Schedule */}
                    <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 65%' } }}>
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
                    </Box>
                    
                    {/* Revenue & Efficiency Panel */}
                    <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 30%' } }}>
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
                    </Box>
                  </Box>
                </Box>
              )}
            </Box>
          </Box>
        </Container>

        {/* Patient Dialog */}
        <Suspense fallback={<LoadingFallback message="Cargando formulario..." />}>
          <PatientDialog
            open={patientDialogOpen}
            onClose={() => {
              setPatientDialogOpen(false);
              setFormErrorMessage('');
              setFieldErrors({});
            }}
            isEditing={isEditingPatient}
            formData={patientFormData}
            onFormDataChange={handleFieldChange}
            onSubmit={handlePatientSubmit}
            fieldErrors={fieldErrors}
            formErrorMessage={formErrorMessage}
            setFormErrorMessage={setFormErrorMessage}
            isSubmitting={isSubmitting}
            onDelete={isEditingPatient ? handleDeletePatient : undefined}
          />
        </Suspense>

        {/* Consultation Dialog */}
        <Suspense fallback={<LoadingFallback message="Cargando formulario de consulta..." />}>
          <ConsultationDialog
            open={consultationDialogOpen}
            onClose={() => {
              setConsultationDialogOpen(false);
              setFormErrorMessage('');
              setFieldErrors({});
            }}
            isEditing={isEditingConsultation}
            formData={consultationFormData}
            setFormData={setConsultationFormData}
            onSubmit={handleConsultationSubmit}
            patients={patients}
            formErrorMessage={formErrorMessage}
            setFormErrorMessage={setFormErrorMessage}
            isSubmitting={isSubmitting}
            fieldErrors={fieldErrors}
          />
        </Suspense>

        {/* Doctor Profile Dialog */}
        <Suspense fallback={<LoadingFallback message="Cargando perfil..." />}>
          <DoctorProfileDialog
            open={doctorProfileDialogOpen}
            onClose={handleCancelDoctorProfile}
            isEditing={isEditingDoctorProfile}
            formData={doctorProfileFormData}
            setFormData={setDoctorProfileFormData}
            onSubmit={handleSubmitDoctorProfile}
            formErrorMessage={doctorProfileFormErrorMessage}
            setFormErrorMessage={setDoctorProfileFormErrorMessage}
            isSubmitting={isDoctorProfileSubmitting}
            fieldErrors={doctorProfileFieldErrors}
          />
        </Suspense>
      </Box>
    </ThemeProvider>
  );
}

export default App;
