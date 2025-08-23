import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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

  Phone as PhoneIcon,
  Email as EmailIcon,
  LocationOn as LocationIcon,
  LocalHospital as HospitalIcon,
  Warning as WarningIcon,
  ArrowBack as ArrowBackIcon,
  Medication as MedicationIcon,
  Close as CloseIcon,
  Delete as DeleteIcon
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

// Patient interface
interface Patient {
  id: string;
  first_name: string;
  paternal_surname: string;
  maternal_surname: string;
  full_name: string;
  date_of_birth: string;
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
  postal_code?: string;
  civil_status?: string;
  education_level?: string;
  occupation?: string;
  religion?: string;
  insurance_type?: string;
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
  family_history: string;  // OBLIGATORIO NOM-004
  personal_pathological_history: string;  // OBLIGATORIO NOM-004
  personal_non_pathological_history: string;  // OBLIGATORIO NOM-004
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
  const [fieldErrors, setFieldErrors] = useState<{[key: string]: string}>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [formErrorMessage, setFormErrorMessage] = useState<string>('');
  const successTimeoutRef = useRef<NodeJS.Timeout | null>(null);
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
  fetchCompletePatientData(patient.id);
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

                  {/* Success Message Ribbon */}
                  {successMessage && (
                    <Paper 
                      sx={{ 
                        p: 2, 
                        mb: 3, 
                        backgroundColor: '#d4edda',
                        borderColor: '#c3e6cb',
                        color: '#155724',
                        border: '1px solid #c3e6cb',
                        borderRadius: 2,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <CheckIcon sx={{ color: '#155724' }} />
                        <Typography variant="body1" sx={{ fontWeight: 500 }}>
                          {successMessage}
                        </Typography>
                      </Box>
                      <IconButton 
                        size="small" 
                        onClick={() => setSuccessMessage('')}
                        sx={{ color: '#155724' }}
                      >
                        <CloseIcon fontSize="small" />
                      </IconButton>
                    </Paper>
                  )}

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
                            <TableCell sx={{ fontWeight: 600 }}>Última Visita</TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>Estado</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {patients && Array.isArray(patients) && patients.map((patient) => (
                            <TableRow 
                              key={patient.id} 
                              hover
                              onClick={() => handleEditPatient(patient)}
                              sx={{ cursor: 'pointer' }}
                            >
                              <TableCell>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                  <Avatar sx={{ bgcolor: 'primary.main' }}>
                                    {patient.first_name[0]}{patient.paternal_surname[0]}
                                  </Avatar>
                                  <Box>
                                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                                      {patient.full_name} ({calculateAge(patient.date_of_birth)})
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                      {patient.gender}
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
                            </TableRow>
                          ))}
                          {(!patients || !Array.isArray(patients) || patients.length === 0) && (
                            <TableRow>
                              <TableCell colSpan={4} align="center" sx={{ py: 4 }}>
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
                        {selectedPatientData.patient.insurance_type || 'Sin seguro'} • 
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
                  <Box sx={{ display: 'flex', gap: 3, mb: 4, flexDirection: { xs: 'column', md: 'row' } }}>
                    <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 30%' } }}>
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
                    </Box>

                    <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 30%' } }}>
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
                    </Box>

                    <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 30%' } }}>
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
                    </Box>
                  </Box>

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
            </Box>
          </Box>
        </Container>

        {/* Patient Dialog */}
        <Dialog 
          open={patientDialogOpen} 
          onClose={() => {
            setPatientDialogOpen(false);
            setFormErrorMessage('');
            setFieldErrors({});
          }}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            {isEditingPatient ? 'Editar Paciente' : 'Nuevo Paciente'}
          </DialogTitle>

          {/* Error Message Ribbon */}
          {formErrorMessage && (
            <Paper 
              sx={{ 
                p: 2, 
                mx: 3,
                mb: 2,
                backgroundColor: '#ffebee',
                borderColor: '#f44336',
                color: '#c62828',
                border: '1px solid #f44336',
                borderRadius: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <WarningIcon sx={{ color: '#c62828' }} />
                <Typography variant="body1" sx={{ fontWeight: 500 }}>
                  {formErrorMessage}
                </Typography>
              </Box>
              <IconButton 
                size="small" 
                onClick={() => setFormErrorMessage('')}
                sx={{ color: '#c62828' }}
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            </Paper>
          )}

          <DialogContent>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mt: 1 }}>
              {/* SECCIÓN: INFORMACIÓN PERSONAL OBLIGATORIA - NOM-004 */}
              <Box sx={{ width: '100%' }}>
                <Typography variant="h6" sx={{ color: '#d32f2f', fontWeight: 'bold', mb: 2 }}>
                  📋 DATOS OBLIGATORIOS
                </Typography>
              </Box>
              <Box sx={{ width: { xs: '100%', sm: '48%' } }}>
                <TextField
                  fullWidth
                  label="Nombre(s)"
                  value={patientFormData.first_name}
                  onChange={(e) => handleFieldChange('first_name', e.target.value)}
                  error={!!fieldErrors.first_name}
                  helperText={fieldErrors.first_name}
                  required
                />
              </Box>
              <Box sx={{ width: { xs: '100%', sm: '48%' } }}>
                <TextField
                  fullWidth
                  label="Apellido Paterno"
                  value={patientFormData.paternal_surname}
                  onChange={(e) => handleFieldChange('paternal_surname', e.target.value)}
                  error={!!fieldErrors.paternal_surname}
                  helperText={fieldErrors.paternal_surname}
                  required
                />
              </Box>
              <Box sx={{ width: { xs: '100%', sm: '48%' } }}>
                <TextField
                  fullWidth
                  label="Apellido Materno"
                  value={patientFormData.maternal_surname}
                  onChange={(e) => handleFieldChange('maternal_surname', e.target.value)}
                  error={!!fieldErrors.maternal_surname}
                  helperText={fieldErrors.maternal_surname}
                  required
                />
              </Box>
              <Box sx={{ width: { xs: '100%', sm: '48%' } }}>
                <TextField
                  fullWidth
                  label="Fecha de Nacimiento"
                  type="date"
                  value={patientFormData.date_of_birth}
                  onChange={(e) => handleFieldChange('date_of_birth', e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  error={!!fieldErrors.date_of_birth}
                  helperText={fieldErrors.date_of_birth}
                  required
                />
              </Box>
              <Box sx={{ width: { xs: '100%', sm: '48%' } }}>
                <FormControl fullWidth required error={!!fieldErrors.gender}>
                  <InputLabel>Género</InputLabel>
                  <Select
                    value={patientFormData.gender}
                    onChange={(e) => handleFieldChange('gender', e.target.value)}
                    label="Género"
                  >
                    <MenuItem value="Masculino">Masculino</MenuItem>
                    <MenuItem value="Femenino">Femenino</MenuItem>
                  </Select>
                  {fieldErrors.gender && (
                    <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1.75 }}>
                      {fieldErrors.gender}
                    </Typography>
                  )}
                </FormControl>
              </Box>
              <Box sx={{ width: { xs: '100%', sm: '48%' } }}>
                <TextField
                  fullWidth
                  label="Teléfono"
                  placeholder="Ej: +52 555 123 4567 o 5551234567"
                  value={patientFormData.phone}
                  onChange={(e) => handleFieldChange('phone', e.target.value)}
                  error={!!fieldErrors.phone}
                  helperText={fieldErrors.phone || "Formato México: +52 555 123 4567 o 5551234567 (10 dígitos mínimo)"}
                  required
                />
              </Box>
              <Box sx={{ width: '100%' }}>
                <TextField
                  fullWidth
                  label="Domicilio de Residencia"
                  value={patientFormData.address}
                  onChange={(e) => handleFieldChange('address', e.target.value)}
                  multiline
                  rows={2}
                  error={!!fieldErrors.address}
                  helperText={fieldErrors.address || "Dirección completa donde reside actualmente (calle, número, colonia, localidad, municipio, estado)"}
                  required
                />
              </Box>
              
              {/* Antecedentes Médicos - NOM-004 Obligatorio */}
              <Box sx={{ width: '100%' }}>
                <TextField
                  fullWidth
                  label="Antecedentes Heredofamiliares"
                  value={patientFormData.family_history}
                  onChange={(e) => handleFieldChange('family_history', e.target.value)}
                  multiline
                  rows={3}
                  error={!!fieldErrors.family_history}
                  helperText={fieldErrors.family_history || "Enfermedades presentes en familiares directos"}
                  required
                />
              </Box>
              <Box sx={{ width: '100%' }}>
                <TextField
                  fullWidth
                  label="Antecedentes Personales Patológicos"
                  value={patientFormData.personal_pathological_history}
                  onChange={(e) => handleFieldChange('personal_pathological_history', e.target.value)}
                  multiline
                  rows={3}
                  error={!!fieldErrors.personal_pathological_history}
                  helperText={fieldErrors.personal_pathological_history || "Enfermedades, cirugías, hospitalizaciones previas"}
                  required
                />
              </Box>
              <Box sx={{ width: '100%' }}>
                <TextField
                  fullWidth
                  label="Antecedentes Personales No Patológicos"
                  value={patientFormData.personal_non_pathological_history}
                  onChange={(e) => handleFieldChange('personal_non_pathological_history', e.target.value)}
                  multiline
                  rows={3}
                  error={!!fieldErrors.personal_non_pathological_history}
                  helperText={fieldErrors.personal_non_pathological_history || "Hábitos: tabaquismo, alcoholismo, ejercicio, alimentación"}
                  required
                />
              </Box>
              
              {/* SECCIÓN: INFORMACIÓN OPCIONAL */}
              <Box sx={{ width: '100%' }}>
                <Typography variant="h6" sx={{ color: '#1976d2', fontWeight: 'bold', mt: 3, mb: 2 }}>
                  📝 DATOS OPCIONALES
                </Typography>
              </Box>

              {/* Identificación Adicional */}
              <Box sx={{ width: '100%' }}>
                <Typography variant="subtitle1" sx={{ color: '#1976d2', fontWeight: 'bold', mb: 1 }}>
                  Identificación Adicional
                </Typography>
              </Box>
              
              {/* 1. Nacionalidad */}
              <Box sx={{ width: { xs: '100%', sm: '48%' } }}>
                <FormControl fullWidth>
                  <InputLabel>Nacionalidad</InputLabel>
                  <Select
                    value={patientFormData.nationality}
                    onChange={(e) => setPatientFormData({...patientFormData, nationality: e.target.value})}
                    label="Nacionalidad"
                  >
                    <MenuItem value="Mexicana">Mexicana</MenuItem>
                    <MenuItem value="Extranjera">Extranjera</MenuItem>
                  </Select>
                </FormControl>
              </Box>
              
              {/* 2. Estado de Nacimiento */}
              <Box sx={{ width: { xs: '100%', sm: '48%' } }}>
                <FormControl fullWidth>
                  <InputLabel>Estado de Nacimiento</InputLabel>
                  <Select
                    value={patientFormData.birth_state_code}
                    onChange={(e) => setPatientFormData({...patientFormData, birth_state_code: e.target.value})}
                    label="Estado de Nacimiento"
                  >
                    <MenuItem value="">--Seleccionar--</MenuItem>
                    <MenuItem value="Aguascalientes">Aguascalientes</MenuItem>
                    <MenuItem value="Baja California">Baja California</MenuItem>
                    <MenuItem value="Baja California Sur">Baja California Sur</MenuItem>
                    <MenuItem value="Campeche">Campeche</MenuItem>
                    <MenuItem value="Chiapas">Chiapas</MenuItem>
                    <MenuItem value="Chihuahua">Chihuahua</MenuItem>
                    <MenuItem value="Ciudad de México">Ciudad de México</MenuItem>
                    <MenuItem value="Coahuila">Coahuila</MenuItem>
                    <MenuItem value="Colima">Colima</MenuItem>
                    <MenuItem value="Durango">Durango</MenuItem>
                    <MenuItem value="Estado de México">Estado de México</MenuItem>
                    <MenuItem value="Guanajuato">Guanajuato</MenuItem>
                    <MenuItem value="Guerrero">Guerrero</MenuItem>
                    <MenuItem value="Hidalgo">Hidalgo</MenuItem>
                    <MenuItem value="Jalisco">Jalisco</MenuItem>
                    <MenuItem value="Michoacán">Michoacán</MenuItem>
                    <MenuItem value="Morelos">Morelos</MenuItem>
                    <MenuItem value="Nayarit">Nayarit</MenuItem>
                    <MenuItem value="Nuevo León">Nuevo León</MenuItem>
                    <MenuItem value="Oaxaca">Oaxaca</MenuItem>
                    <MenuItem value="Puebla">Puebla</MenuItem>
                    <MenuItem value="Querétaro">Querétaro</MenuItem>
                    <MenuItem value="Quintana Roo">Quintana Roo</MenuItem>
                    <MenuItem value="San Luis Potosí">San Luis Potosí</MenuItem>
                    <MenuItem value="Sinaloa">Sinaloa</MenuItem>
                    <MenuItem value="Sonora">Sonora</MenuItem>
                    <MenuItem value="Tabasco">Tabasco</MenuItem>
                    <MenuItem value="Tamaulipas">Tamaulipas</MenuItem>
                    <MenuItem value="Tlaxcala">Tlaxcala</MenuItem>
                    <MenuItem value="Veracruz">Veracruz</MenuItem>
                    <MenuItem value="Yucatán">Yucatán</MenuItem>
                    <MenuItem value="Zacatecas">Zacatecas</MenuItem>
                    <MenuItem value="Extranjero">Extranjero</MenuItem>
                  </Select>
                </FormControl>
              </Box>
              
              {/* 3. Estado de Residencia */}
              <Box sx={{ width: { xs: '100%', sm: '48%' } }}>
                <FormControl fullWidth>
                  <InputLabel>Estado de Residencia</InputLabel>
                  <Select
                    value={patientFormData.state}
                    onChange={(e) => setPatientFormData({...patientFormData, state: e.target.value})}
                    label="Estado de Residencia"
                  >
                    <MenuItem value="Aguascalientes">Aguascalientes</MenuItem>
                    <MenuItem value="Baja California">Baja California</MenuItem>
                    <MenuItem value="Baja California Sur">Baja California Sur</MenuItem>
                    <MenuItem value="Campeche">Campeche</MenuItem>
                    <MenuItem value="Chiapas">Chiapas</MenuItem>
                    <MenuItem value="Chihuahua">Chihuahua</MenuItem>
                    <MenuItem value="Ciudad de México">Ciudad de México</MenuItem>
                    <MenuItem value="Coahuila">Coahuila</MenuItem>
                    <MenuItem value="Colima">Colima</MenuItem>
                    <MenuItem value="Durango">Durango</MenuItem>
                    <MenuItem value="Estado de México">Estado de México</MenuItem>
                    <MenuItem value="Guanajuato">Guanajuato</MenuItem>
                    <MenuItem value="Guerrero">Guerrero</MenuItem>
                    <MenuItem value="Hidalgo">Hidalgo</MenuItem>
                    <MenuItem value="Jalisco">Jalisco</MenuItem>
                    <MenuItem value="Michoacán">Michoacán</MenuItem>
                    <MenuItem value="Morelos">Morelos</MenuItem>
                    <MenuItem value="Nayarit">Nayarit</MenuItem>
                    <MenuItem value="Nuevo León">Nuevo León</MenuItem>
                    <MenuItem value="Oaxaca">Oaxaca</MenuItem>
                    <MenuItem value="Puebla">Puebla</MenuItem>
                    <MenuItem value="Querétaro">Querétaro</MenuItem>
                    <MenuItem value="Quintana Roo">Quintana Roo</MenuItem>
                    <MenuItem value="San Luis Potosí">San Luis Potosí</MenuItem>
                    <MenuItem value="Sinaloa">Sinaloa</MenuItem>
                    <MenuItem value="Sonora">Sonora</MenuItem>
                    <MenuItem value="Tabasco">Tabasco</MenuItem>
                    <MenuItem value="Tamaulipas">Tamaulipas</MenuItem>
                    <MenuItem value="Tlaxcala">Tlaxcala</MenuItem>
                    <MenuItem value="Veracruz">Veracruz</MenuItem>
                    <MenuItem value="Yucatán">Yucatán</MenuItem>
                    <MenuItem value="Zacatecas">Zacatecas</MenuItem>
                  </Select>
                  <Typography variant="caption" sx={{ mt: 0.5, color: 'text.secondary', fontSize: '0.75rem' }}>
                    Estado donde reside actualmente
                  </Typography>
                </FormControl>
              </Box>
              
              {/* 4. CURP */}
              <Box sx={{ width: { xs: '100%', sm: '48%' } }}>
                <TextField
                  fullWidth
                  label="CURP"
                  value={patientFormData.curp}
                  onChange={(e) => setPatientFormData({...patientFormData, curp: e.target.value})}
                  helperText="Clave Única de Registro de Población"
                />
              </Box>

              {/* 5. Tipo de Seguro */}
              <Box sx={{ width: { xs: '100%', sm: '48%' } }}>
                <FormControl fullWidth>
                  <InputLabel>Tipo de Seguro</InputLabel>
                  <Select
                    value={patientFormData.insurance_type}
                    onChange={(e) => setPatientFormData({...patientFormData, insurance_type: e.target.value})}
                    label="Tipo de Seguro"
                  >
                    <MenuItem value="">--Sin seguro--</MenuItem>
                    <MenuItem value="IMSS">IMSS (Instituto Mexicano del Seguro Social)</MenuItem>
                    <MenuItem value="ISSSTE">ISSSTE (Instituto de Seguridad y Servicios Sociales de los Trabajadores del Estado)</MenuItem>
                    <MenuItem value="PEMEX">PEMEX</MenuItem>
                    <MenuItem value="SEDENA">SEDENA (Secretaría de la Defensa Nacional)</MenuItem>
                    <MenuItem value="SEMAR">SEMAR (Secretaría de Marina)</MenuItem>
                    <MenuItem value="Seguro Popular">Seguro Popular</MenuItem>
                    <MenuItem value="INSABI">INSABI (Instituto de Salud para el Bienestar)</MenuItem>
                    <MenuItem value="Privado">Seguro Privado</MenuItem>
                    <MenuItem value="Otro">Otro</MenuItem>
                  </Select>
                </FormControl>
              </Box>

              {/* Contacto de Emergencia */}
              <Box sx={{ width: '100%' }}>
                <Typography variant="subtitle1" sx={{ color: '#1976d2', fontWeight: 'bold', mt: 2, mb: 1 }}>
                  Contacto de Emergencia
                </Typography>
              </Box>
              <Box sx={{ width: { xs: '100%', sm: '48%' } }}>
                <TextField
                  fullWidth
                  label="Nombre del Contacto"
                  value={patientFormData.emergency_contact_name}
                  onChange={(e) => setPatientFormData({...patientFormData, emergency_contact_name: e.target.value})}
                />
              </Box>
              <Box sx={{ width: { xs: '100%', sm: '48%' } }}>
                <TextField
                  fullWidth
                  label="Teléfono del Contacto"
                  value={patientFormData.emergency_contact_phone}
                  onChange={(e) => setPatientFormData({...patientFormData, emergency_contact_phone: e.target.value})}
                />
              </Box>
              <Box sx={{ width: { xs: '100%', sm: '48%' } }}>
                <FormControl fullWidth>
                  <InputLabel>Relación</InputLabel>
                  <Select
                    value={patientFormData.emergency_contact_relationship}
                    onChange={(e) => setPatientFormData({...patientFormData, emergency_contact_relationship: e.target.value})}
                    label="Relación"
                  >
                    <MenuItem value="Padre">Padre</MenuItem>
                    <MenuItem value="Madre">Madre</MenuItem>
                    <MenuItem value="Esposo">Esposo</MenuItem>
                    <MenuItem value="Esposa">Esposa</MenuItem>
                    <MenuItem value="Hijo">Hijo</MenuItem>
                    <MenuItem value="Hija">Hija</MenuItem>
                    <MenuItem value="Hermano">Hermano</MenuItem>
                    <MenuItem value="Hermana">Hermana</MenuItem>
                    <MenuItem value="Abuelo">Abuelo</MenuItem>
                    <MenuItem value="Abuela">Abuela</MenuItem>
                    <MenuItem value="Amigo">Amigo</MenuItem>
                    <MenuItem value="Otro">Otro</MenuItem>
                  </Select>
                </FormControl>
              </Box>

              {/* Información Médica Adicional */}
              <Box sx={{ width: '100%' }}>
                <Typography variant="subtitle1" sx={{ color: '#1976d2', fontWeight: 'bold', mt: 2, mb: 1 }}>
                  Información Médica Adicional
                </Typography>
              </Box>
              <Box sx={{ width: { xs: '100%', sm: '48%' } }}>
                <FormControl fullWidth>
                  <InputLabel>Tipo de Sangre</InputLabel>
                  <Select
                    value={patientFormData.blood_type}
                    onChange={(e) => setPatientFormData({...patientFormData, blood_type: e.target.value})}
                    label="Tipo de Sangre"
                  >
                    <MenuItem value="A+">A+</MenuItem>
                    <MenuItem value="A-">A-</MenuItem>
                    <MenuItem value="B+">B+</MenuItem>
                    <MenuItem value="B-">B-</MenuItem>
                    <MenuItem value="AB+">AB+</MenuItem>
                    <MenuItem value="AB-">AB-</MenuItem>
                    <MenuItem value="O+">O+</MenuItem>
                    <MenuItem value="O-">O-</MenuItem>
                  </Select>
                </FormControl>
              </Box>
              <Box sx={{ width: { xs: '100%', sm: '48%' } }}>
                <TextField
                  fullWidth
                  label="Alergias"
                  value={patientFormData.allergies}
                  onChange={(e) => setPatientFormData({...patientFormData, allergies: e.target.value})}
                  multiline
                  rows={2}
                />
              </Box>

            </Box>
          </DialogContent>
          <DialogActions sx={{ justifyContent: 'flex-end', gap: 1, p: 3 }}>
            {/* Delete button - only show when editing existing patient */}
            {isEditingPatient && selectedPatient && (
              <Button 
                onClick={handleDeletePatient}
                variant="contained"
                color="error"
                startIcon={<DeleteIcon />}
                disabled={isSubmitting}
              >
                Eliminar Paciente
              </Button>
            )}
            
            <Button 
              onClick={() => {
                setPatientDialogOpen(false);
                setFieldErrors({});
                setFormErrorMessage('');
              }}
              disabled={isSubmitting}
              variant="outlined"
            >
              Cancelar
            </Button>
            
            <Button 
              onClick={handlePatientSubmit} 
              variant="contained"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Guardando...' : (isEditingPatient ? 'Actualizar' : 'Crear')} Paciente
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </ThemeProvider>
  );
}

export default App;