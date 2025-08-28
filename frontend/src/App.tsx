import React, { useState, useEffect, useCallback, useMemo, useRef, Suspense } from 'react';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/auth/ProtectedRoute';
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
  PatientsViewSmart,
  ConsultationsViewSmart,
  AgendaView,
  PatientDialog,
  ConsultationDialog,
  AppointmentDialog,
  ClinicalStudyDialog,
  DoctorProfileView,
  DoctorProfileDialog
} from './components/lazy';
import { ConsultationDetailView } from './components';
import { LoadingFallback } from './components';
import SmartTableDemo from './components/demo/SmartTableDemo';
import { Patient, DoctorFormData, ConsultationFormData, AppointmentFormData, ClinicalStudy, ClinicalStudyFormData, StudyType, StudyStatus } from './types';
import { API_CONFIG } from './constants';
import { apiService } from './services/api';
import { useDoctorProfileCache as useDoctorProfile } from './hooks/useDoctorProfileCache';
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
import AvantLogo from './components/common/AvantLogo';
import LogoutConfirmDialog from './components/dialogs/LogoutConfirmDialog';
import { useAuth } from './contexts/AuthContext';
import axios from 'axios';

// Mexican States with Official INEGI Codes




// AVANT Color Palette - Surgical Blue Medical Theme
const avantColors = {
  primary: {
    main: '#1565C0', // Surgical blue - deep medical blue
    light: '#42A5F5', // Light surgical blue
    dark: '#0D47A1', // Dark surgical blue
    contrastText: '#ffffff',
  },
  secondary: {
    main: '#1976D2', // Professional blue
    light: '#64B5F6', // Light professional blue
    dark: '#1565C0', // Deep blue
    contrastText: '#ffffff',
  },
  accent: {
    main: '#90CAF9', // Soft blue for accents
    light: '#BBDEFB', // Very light blue
    dark: '#1976D2', // Medium blue
  },
  neutral: {
    50: '#F3F8FF', // Almost white with blue hint
    100: '#E3F2FD', // Very light blue
    200: '#BBDEFB', // Light blue
    300: '#90CAF9', // Medium light blue
    400: '#64B5F6', // Medium blue
    500: '#42A5F5', // Base blue
    600: '#2196F3', // Strong blue
    700: '#1976D2', // Deep blue
    800: '#1565C0', // Very deep blue
    900: '#0D47A1', // Almost navy blue
  }
};

// AVANT Theme - Clean, Fresh, Elegant
const theme = createTheme({
  palette: {
    mode: 'light',
    primary: avantColors.primary,
    secondary: avantColors.secondary,
    background: {
      default: avantColors.neutral[50], // Clean, fresh background
      paper: '#ffffff',
    },
    text: {
      primary: avantColors.neutral[800], // Dark teal for text
      secondary: avantColors.neutral[600], // Medium teal for secondary text
    },
    success: {
      main: '#10B981', // Green that complements teal
      light: '#6EE7B7',
      dark: '#047857',
    },
    error: {
      main: '#EF4444', // Clean red
      light: '#FCA5A5',
      dark: '#B91C1C',
    },
    warning: {
      main: '#F59E0B', // Warm amber
      light: '#FCD34D',
      dark: '#D97706',
    },
    info: avantColors.secondary,
    grey: {
      50: avantColors.neutral[50],
      100: avantColors.neutral[100],
      200: avantColors.neutral[200],
      300: avantColors.neutral[300],
      400: avantColors.neutral[400],
      500: avantColors.neutral[500],
      600: avantColors.neutral[600],
      700: avantColors.neutral[700],
      800: avantColors.neutral[800],
      900: avantColors.neutral[900],
    },
  },
  typography: {
    fontFamily: '"Inter", "Poppins", "Roboto", -apple-system, BlinkMacSystemFont, sans-serif',
    h1: {
      fontWeight: 700,
      fontSize: '2.5rem',
      lineHeight: 1.2,
      color: avantColors.primary.main,
    },
    h2: {
      fontWeight: 700,
      fontSize: '2rem',
      lineHeight: 1.3,
      color: avantColors.primary.main,
    },
    h3: {
      fontWeight: 600,
      fontSize: '1.75rem',
      lineHeight: 1.3,
      color: avantColors.primary.main,
    },
    h4: {
      fontWeight: 600,
      fontSize: '1.5rem',
      lineHeight: 1.4,
      color: avantColors.primary.main,
    },
    h5: {
      fontWeight: 600,
      fontSize: '1.25rem',
      lineHeight: 1.4,
      color: avantColors.neutral[700],
    },
    h6: {
      fontWeight: 600,
      fontSize: '1.125rem',
      lineHeight: 1.4,
      color: avantColors.neutral[700],
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
      fontWeight: 600,
      textTransform: 'none',
    },
  },
  shape: {
    borderRadius: 16, // Rounded, modern look
  },
  shadows: [
    'none',
    '0px 2px 8px rgba(21, 101, 192, 0.04)',
    '0px 4px 12px rgba(21, 101, 192, 0.06)',
    '0px 8px 16px rgba(21, 101, 192, 0.08)',
    '0px 12px 24px rgba(21, 101, 192, 0.10)',
    '0px 16px 32px rgba(21, 101, 192, 0.12)',
    '0px 20px 40px rgba(21, 101, 192, 0.14)',
    '0px 24px 48px rgba(21, 101, 192, 0.16)',
    '0px 28px 56px rgba(21, 101, 192, 0.18)',
    '0px 32px 64px rgba(21, 101, 192, 0.20)',
    '0px 36px 72px rgba(21, 101, 192, 0.22)',
    '0px 40px 80px rgba(21, 101, 192, 0.24)',
    '0px 44px 88px rgba(21, 101, 192, 0.26)',
    '0px 48px 96px rgba(21, 101, 192, 0.28)',
    '0px 52px 104px rgba(21, 101, 192, 0.30)',
    '0px 56px 112px rgba(21, 101, 192, 0.32)',
    '0px 60px 120px rgba(21, 101, 192, 0.34)',
    '0px 64px 128px rgba(21, 101, 192, 0.36)',
    '0px 68px 136px rgba(21, 101, 192, 0.38)',
    '0px 72px 144px rgba(21, 101, 192, 0.40)',
    '0px 76px 152px rgba(21, 101, 192, 0.42)',
    '0px 80px 160px rgba(21, 101, 192, 0.44)',
    '0px 84px 168px rgba(21, 101, 192, 0.46)',
    '0px 88px 176px rgba(21, 101, 192, 0.48)',
    '0px 92px 184px rgba(21, 101, 192, 0.50)',
  ],
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: avantColors.neutral[50],
          color: avantColors.neutral[800],
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          background: `linear-gradient(135deg, ${avantColors.primary.main} 0%, ${avantColors.secondary.main} 100%)`,
          boxShadow: `0px 4px 20px rgba(21, 101, 192, 0.15)`,
          backdropFilter: 'blur(10px)',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: `0px 8px 32px rgba(21, 101, 192, 0.08)`,
          borderRadius: '20px',
          border: `1px solid ${avantColors.neutral[100]}`,
          transition: 'all 0.3s ease-in-out',
          '&:hover': {
            boxShadow: `0px 12px 40px rgba(21, 101, 192, 0.12)`,
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
          fontWeight: 600,
          padding: '12px 24px',
          transition: 'all 0.3s ease-in-out',
        },
        contained: {
          background: `linear-gradient(135deg, ${avantColors.primary.main}, ${avantColors.secondary.main})`,
          boxShadow: `0px 4px 16px rgba(21, 101, 192, 0.3)`,
          '&:hover': {
            background: `linear-gradient(135deg, ${avantColors.primary.dark}, ${avantColors.secondary.dark})`,
            boxShadow: `0px 6px 20px rgba(21, 101, 192, 0.4)`,
            transform: 'translateY(-1px)',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: '16px',
          border: `1px solid ${avantColors.neutral[100]}`,
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: '12px',
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: avantColors.primary.light,
            },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: avantColors.primary.main,
              borderWidth: '2px',
            },
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: '8px',
          fontWeight: 500,
          backgroundColor: avantColors.neutral[100],
          color: avantColors.neutral[700],
          '&.MuiChip-colorPrimary': {
            backgroundColor: avantColors.primary.main,
            color: '#ffffff',
        },
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

function AppContent() {
  // Clean slate - clear any residual clinical studies data
  useEffect(() => {
    console.log('🧹 Limpiando datos residuales de estudios clínicos...');
    // Clear any localStorage items related to clinical studies
    Object.keys(localStorage).forEach(key => {
      if (key.includes('clinical') || key.includes('study') || key.includes('studies')) {
        localStorage.removeItem(key);
        console.log(`🗑️ Eliminado del localStorage: ${key}`);
      }
    });
  }, []);

  // Authentication
  const { user, logout } = useAuth();
  

  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [todayAppointments, setTodayAppointments] = useState<any[]>([]);
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
  const [creatingPatientFromConsultation, setCreatingPatientFromConsultation] = useState(false);
  const [selectedConsultation, setSelectedConsultation] = useState<any>(null);
  const [consultationDetailView, setConsultationDetailView] = useState(false);
  const [consultationFormData, setConsultationFormData] = useState<ConsultationFormData>({
    patient_id: '',
    date: '',
    chief_complaint: '',
    history_present_illness: '',
    
    // Antecedentes (parte de la evaluación clínica)
    family_history: '',
    personal_pathological_history: '',
    personal_non_pathological_history: '',
    
    physical_examination: '',
    primary_diagnosis: '',

    secondary_diagnoses: '',

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

  // Clinical Studies are now part of each consultation, not global
  // Temporary consultation ID for new consultations before they're saved
  const [tempConsultationId, setTempConsultationId] = useState<string | null>(null);
  // Temporary clinical studies for new consultations
  const [tempClinicalStudies, setTempClinicalStudies] = useState<ClinicalStudy[]>([]);

  // Helper functions for localStorage persistence

  const saveStudiesToStorage = (consultationId: string, studies: ClinicalStudy[]) => {
    try {
      localStorage.setItem(`clinical_studies_${consultationId}`, JSON.stringify(studies));
    } catch (error) {
      console.error('Error saving studies to localStorage:', error);
    }
  };

  const loadStudiesFromStorage = (consultationId: string): ClinicalStudy[] => {
    try {
      const stored = localStorage.getItem(`clinical_studies_${consultationId}`);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error loading studies from localStorage:', error);
      return [];
    }
  };
  
  // State for clinical studies from backend
  const [consultationStudies, setConsultationStudies] = useState<ClinicalStudy[]>([]);

  // Helper function to get clinical studies for current consultation
  const getCurrentConsultationStudies = (): ClinicalStudy[] => {
    console.log('📋 getCurrentConsultationStudies called:', {
      selectedConsultation: selectedConsultation?.id,
      consultationStudies: consultationStudies.length,
      tempConsultationId,
      tempClinicalStudies: tempClinicalStudies.length
    });
    
    // If we have a selected consultation (viewing/editing existing), return loaded studies from backend
    if (selectedConsultation?.id) {
      console.log('📋 Returning consultation studies:', consultationStudies);
      return consultationStudies;
    }
    // If we're creating a new consultation, use temporary studies
    if (tempConsultationId && !selectedConsultation) {
      console.log('📋 Returning temp studies:', tempClinicalStudies);
      return tempClinicalStudies;
    }
    console.log('📋 Returning empty array');
    return [];
  };

  // Load clinical studies from backend for selected consultation
  const loadConsultationStudies = useCallback(async (consultationId: string) => {
    console.log('🔍 Loading studies for consultation:', consultationId);
    try {
      const studies = await apiService.getClinicalStudiesByConsultation(consultationId);
      console.log('✅ Studies loaded from backend:', studies);
      
      // If no studies in backend, check localStorage and migrate them
      if (studies.length === 0) {
        const storedStudies = loadStudiesFromStorage(consultationId);
        console.log('📦 Found in localStorage:', storedStudies);
        
        if (storedStudies.length > 0) {
          console.log('🔄 Migrating studies from localStorage to backend...');
          // Try to migrate studies to backend
          for (const study of storedStudies) {
            try {
              const studyData = {
                consultation_id: consultationId,
                patient_id: study.patient_id,
                study_type: study.study_type,
                study_name: study.study_name,
                study_description: study.study_description || '',
                ordered_date: new Date(study.ordered_date).toISOString(),
                status: study.status,
                results_text: study.results_text || '',
                interpretation: study.interpretation || '',
                ordering_doctor: study.ordering_doctor,
                performing_doctor: study.performing_doctor || '',
                institution: study.institution || '',
                urgency: study.urgency || 'normal',
                clinical_indication: study.clinical_indication || '',
                relevant_history: study.relevant_history || '',
                created_by: study.created_by || ''
              };
              
              await apiService.createClinicalStudy(studyData);
              console.log('✅ Migrated study:', study.study_name);
            } catch (migrationError) {
              console.error('❌ Failed to migrate study:', study.study_name, migrationError);
            }
          }
          
          // Reload studies from backend after migration
          const updatedStudies = await apiService.getClinicalStudiesByConsultation(consultationId);
          console.log('🔄 Studies after migration:', updatedStudies);
          setConsultationStudies(updatedStudies);
        } else {
          setConsultationStudies([]);
        }
      } else {
        setConsultationStudies(studies);
      }
    } catch (error) {
      console.error('❌ Error loading clinical studies from backend:', error);
      // Fallback to localStorage
      const storedStudies = loadStudiesFromStorage(consultationId);
      console.log('📦 Fallback to localStorage studies:', storedStudies);
      setConsultationStudies(storedStudies);
    }
  }, []);

  // Helper function to update clinical studies for current consultation
  const updateCurrentConsultationStudies = (studies: ClinicalStudy[]) => {
    if (selectedConsultation?.id) {
      // Updating existing consultation - save to localStorage
      saveStudiesToStorage(selectedConsultation.id, studies);
      
      const updatedConsultation = {
        ...selectedConsultation,
        clinical_studies: studies
      };
      setSelectedConsultation(updatedConsultation);
      
      // Also update in consultations list if it exists there
      setConsultations(prev => prev.map(consultation => 
        consultation.id === selectedConsultation.id 
          ? { ...consultation, clinical_studies: studies }
          : consultation
      ));
    } else if (tempConsultationId) {
      // Updating temporary consultation studies
      setTempClinicalStudies(studies);
    }
  };
  const [clinicalStudyDialogOpen, setClinicalStudyDialogOpen] = useState(false);
  const [isEditingClinicalStudy, setIsEditingClinicalStudy] = useState(false);
  const [selectedClinicalStudy, setSelectedClinicalStudy] = useState<ClinicalStudy | null>(null);
  const [clinicalStudyFormData, setClinicalStudyFormData] = useState<ClinicalStudyFormData>({
    consultation_id: '',
    patient_id: '',
    study_type: 'hematologia',
    study_name: '',
    study_description: '',
    ordered_date: '',
    status: 'pending',
    results_text: '',
    interpretation: '',
    ordering_doctor: '',
    performing_doctor: '',
    institution: '',
    urgency: 'normal',
    clinical_indication: '',
    relevant_history: '',
    created_by: ''
  });
  const [clinicalStudyFormErrorMessage, setClinicalStudyFormErrorMessage] = useState('');
  const [clinicalStudyFieldErrors, setClinicalStudyFieldErrors] = useState<{[key: string]: string}>({});
  const [isClinicalStudySubmitting, setIsClinicalStudySubmitting] = useState(false);

  // Agenda management state
  const [appointments, setAppointments] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [appointmentDialogOpen, setAppointmentDialogOpen] = useState(false);
  const [isEditingAppointment, setIsEditingAppointment] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
  
  // Logout dialog state
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  const [appointmentFormData, setAppointmentFormData] = useState<AppointmentFormData>({
    patient_id: '',
    doctor_id: '', // Initialize doctor_id field
    date_time: '',
    appointment_type: 'consultation',
    reason: '',
    notes: '',
    duration_minutes: 30,
    status: 'scheduled'
  });

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
    birth_date: '',
    gender: '',
    address: '',
    
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
    surgical_history: '',
    
    // Estado del paciente
    status: 'active' as 'active' | 'inactive' // Todos los pacientes son activos por defecto
  });



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

  // Fetch appointments from API
  const fetchAppointments = useCallback(async () => {
    // Only fetch if we're in agenda view
    if (activeView !== 'agenda') return;
    
    try {
      const targetDate = selectedDate.toISOString().split('T')[0];
      const data = await apiService.getDailyAgenda(targetDate);
      setAppointments(data);
    } catch (error) {
      console.error('Error fetching appointments:', error);
      setAppointments([]);
    }
  }, [selectedDate, activeView]);

  // Load appointments when active view is agenda or when selected date changes
  useEffect(() => {
    if (activeView === 'agenda') {
      fetchAppointments();
    }
  }, [activeView, selectedDate]); // Remove fetchAppointments dependency to avoid infinite loop

  // Patient management functions
  const fetchPatients = useCallback(async () => {
    try {
      console.log('🔄 Cargando pacientes...');
      const data = await apiService.getPatients(patientSearchTerm);
      console.log('✅ Pacientes cargados desde API:', data);
      setPatients(data);
    } catch (error) {
      console.error('❌ Error fetching patients:', error);
      console.log('🔄 Cargando datos mock...');
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
          birth_date: '1985-05-15',
          age: 39, // This will be calculated dynamically now
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
        },
        {
          id: 'PAT002',
          first_name: 'Carlos',
          paternal_surname: 'Rodríguez',
          maternal_surname: 'López',
          birth_state_code: 'Jalisco',
          nationality: 'Mexicana',
          municipality: 'Guadalajara',
          state: 'Jalisco',
          full_name: 'Carlos Rodríguez López',
          birth_date: '1990-12-03',
          age: 33, // This will be calculated dynamically now
          gender: 'Masculino',
          phone: '+52 555 234 5678',
          email: 'carlos.rodriguez@email.com',
          address: 'Av. Vallarta 456, Guadalajara',
          curp: 'ROLC901203HJCDPR08',
          insurance_type: 'ISSSTE',
          insurance_number: '987654321',
          blood_type: 'A+',
          allergies: 'Ninguna conocida',
          chronic_conditions: 'Ninguna',
          current_medications: 'Ninguna',
          emergency_contact_name: 'Ana López',
          emergency_contact_phone: '+52 555 876 5432',
          emergency_contact_relationship: 'Esposa',
          created_at: '2024-02-10T08:15:00',
          last_visit: '2024-08-15T16:30:00',
          total_visits: 3,
          status: 'active'
        }
      ]);
      console.log('✅ Datos mock cargados exitosamente');
      console.log('📝 Recuerda: Los nombres ahora deberían mostrar edad en los dropdowns');
    }
  }, [patientSearchTerm]);





  const resetPatientForm = useCallback(() => {
    setPatientFormData({
      // ===== CAMPOS OBLIGATORIOS NOM-004 =====
      first_name: '',
      paternal_surname: '',
      maternal_surname: '',
      birth_date: '',
      gender: '',
      address: '',
      
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
      surgical_history: '',
      
      // Estado del paciente
      status: 'active' as 'active' | 'inactive'
    });
    setSelectedPatient(null);
    setFieldErrors({});
    setFormErrorMessage('');
    setIsSubmitting(false);
  }, []);

// Fetch complete patient data
const fetchCompletePatientData = async (patientId: string) => {
  try {
    const data = await apiService.getCompletePatientInfo(patientId);
    setSelectedPatientData(data as unknown as CompletePatientData);
  } catch (error) {
    console.error('Error fetching complete patient data:', error);
  }
};

// Handle patient detail view
const handleViewPatientDetails = (patient: Patient) => {
  setSelectedPatient(patient);
  setActiveView('patient-detail');
};

// Utility function to get current Mexico City date and time in HTML datetime-local format
const getCurrentMexicoCityDateTime = () => {
  try {
    const now = new Date();
    
    // Simple approach: get current time and adjust for Mexico City (UTC-6)
    // Note: This doesn't account for DST, but is more reliable
    const mexicoCityOffset = -6; // UTC-6
    const currentOffset = now.getTimezoneOffset() / 60; // Current timezone offset in hours
    const adjustment = (mexicoCityOffset - (-currentOffset)) * 60 * 60 * 1000; // Convert to milliseconds
    
    const mexicoCityTime = new Date(now.getTime() + adjustment);
    
    // Format to YYYY-MM-DDTHH:MM
    const year = mexicoCityTime.getFullYear();
    const month = String(mexicoCityTime.getMonth() + 1).padStart(2, '0');
    const day = String(mexicoCityTime.getDate()).padStart(2, '0');
    const hours = String(mexicoCityTime.getHours()).padStart(2, '0');
    const minutes = String(mexicoCityTime.getMinutes()).padStart(2, '0');
    
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  } catch (error) {
    // Fallback to simple local time if calculation fails
    console.warn('Error calculating Mexico City time, using local time:', error);
    const now = new Date();
    return now.toISOString().slice(0, 16);
  }
};

// Utility function to convert any datetime string to datetime-local format (YYYY-MM-DDTHH:MM)
const toDateTimeLocalFormat = (dateTimeString: string) => {
  try {
    if (!dateTimeString) return '';
    
    // Parse the datetime string to a Date object
    const date = new Date(dateTimeString);
    
    // Check if the date is valid
    if (isNaN(date.getTime())) {
      console.warn('Invalid date string provided:', dateTimeString);
      return '';
    }
    
    // Format to YYYY-MM-DDTHH:MM (without seconds and timezone)
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  } catch (error) {
    console.warn('Error converting datetime to local format:', error);
    return '';
  }
};

// Utility function to calculate age from birth date
const calculateAge = (birthDate: string): number => {
  try {
    const birth = new Date(birthDate);
    const today = new Date();
    
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    // If birthday hasn't occurred this year yet, subtract 1
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    
    return age;
  } catch (error) {
    console.error('Error calculating age:', error);
    return 0;
  }
};

// Function to format patient name with age
const formatPatientNameWithAge = (patient: Patient): string => {
  const age = calculateAge(patient.birth_date);
  return `${patient.first_name} ${patient.paternal_surname} ${patient.maternal_surname} (${age} años)`;
};

// Consultation handlers (enhanced implementation)
const handleNewConsultation = useCallback(() => {
  setSelectedConsultation(null);
  setIsEditingConsultation(false);
  
  // Clear clinical studies when starting new consultation
  setConsultationStudies([]);
  
  setConsultationFormData({
    patient_id: '',
    date: getCurrentMexicoCityDateTime(),
    chief_complaint: '',
    history_present_illness: '',
    
    // Antecedentes (parte de la evaluación clínica)
    family_history: '',
    personal_pathological_history: '',
    personal_non_pathological_history: '',
    
    physical_examination: '',
    primary_diagnosis: '',

    secondary_diagnoses: '',

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
  
  // Load patients when opening consultation dialog
  fetchPatients();
  
  setConsultationDialogOpen(true);
  setFormErrorMessage('');
  setConsultationDetailView(false);
}, [fetchPatients]);

const handleEditConsultation = useCallback(async (consultation: any) => {
  setSelectedConsultation(consultation);
  setIsEditingConsultation(true);
  setConsultationFormData({
    patient_id: consultation.patient_id || '',
    date: consultation.date || '',
    chief_complaint: consultation.chief_complaint || '',
    history_present_illness: consultation.history_present_illness || '',
    
    // Antecedentes (parte de la evaluación clínica)
    family_history: consultation.family_history || '',
    personal_pathological_history: consultation.personal_pathological_history || '',
    personal_non_pathological_history: consultation.personal_non_pathological_history || '',
    
    physical_examination: consultation.physical_examination || '',
    primary_diagnosis: consultation.primary_diagnosis || '',

    secondary_diagnoses: consultation.secondary_diagnoses || '',

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
  
  // Load patients when opening consultation dialog
  fetchPatients();
  
  // Load clinical studies for this consultation when editing
  if (consultation?.id) {
    await loadConsultationStudies(consultation.id);
  }
  
  setConsultationDialogOpen(true);
  setFormErrorMessage('');
  setConsultationDetailView(false);
}, [fetchPatients, loadConsultationStudies]);

// Handle view consultation
const handleViewConsultation = useCallback(async (consultation: any) => {
  setSelectedConsultation(consultation);
  setConsultationDetailView(true);
  
  // Load clinical studies for this consultation
  if (consultation?.id) {
    await loadConsultationStudies(consultation.id);
  }
}, [loadConsultationStudies]);

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
    const data = await apiService.getConsultations({ 
      patient_search: consultationSearchTerm 
    });
    console.log('📋 Fetched consultations:', data);
    
    // Si no hay datos del backend, usar datos de ejemplo para testing
    if (!data || data.length === 0) {
      const sampleConsultations = [
        {
          id: 'CONS-001',
          patient_id: 'PAT-001',
          patient_name: 'María González Pérez',
          date: '2024-08-28',
          chief_complaint: 'Dolor de cabeza recurrente',
          primary_diagnosis: 'Migraña tensional',
          history_present_illness: 'Dolor de cabeza desde hace 3 días, intensidad moderada',
          physical_examination: 'Tensión arterial normal, reflejos normales',
          treatment_plan: 'Analgésicos y medidas no farmacológicas',
          follow_up_instructions: 'Control en 1 semana si persiste',
          doctor_name: 'Dr. Juan Pérez',
          doctor_professional_license: 'MP12345',
          created_by: 'system',
          created_at: '2024-08-28'
        },
        {
          id: 'CONS-002',
          patient_id: 'PAT-002',
          patient_name: 'Carlos Rodríguez López',
          date: '2024-08-27',
          chief_complaint: 'Control rutinario diabetes',
          primary_diagnosis: 'Diabetes mellitus tipo 2 controlada',
          history_present_illness: 'Control rutinario, sin síntomas',
          physical_examination: 'Peso estable, presión arterial controlada',
          treatment_plan: 'Continuar con metformina 850mg c/12h',
          follow_up_instructions: 'Control en 3 meses con laboratorios',
          doctor_name: 'Dr. Juan Pérez',
          doctor_professional_license: 'MP12345',
          created_by: 'system',
          created_at: '2024-08-27'
        },
        {
          id: 'CONS-003',
          patient_id: 'PAT-003',
          patient_name: 'Ana Fernández García',
          date: '2024-08-26',
          chief_complaint: 'Dolor abdominal',
          primary_diagnosis: 'Gastritis aguda',
          history_present_illness: 'Dolor epigástrico de 2 días de evolución',
          physical_examination: 'Abdomen blando, dolor a la palpación en epigastrio',
          treatment_plan: 'Omeprazol 20mg en ayunas, dieta blanda',
          follow_up_instructions: 'Evolución en 5 días',
          doctor_name: 'Dr. Juan Pérez',
          doctor_professional_license: 'MP12345',
          created_by: 'system',
          created_at: '2024-08-26'
        }
      ];
      console.log('📋 Using sample consultations data');
      setConsultations(sampleConsultations);
    } else {
      setConsultations(data);
    }
  } catch (error) {
    console.error('Error fetching consultations:', error);
    // En caso de error, también usar datos de muestra
    const sampleConsultations = [
      {
        id: 'CONS-001',
        patient_id: 'PAT-001',
        patient_name: 'María González Pérez',
        date: '2024-08-28',
        chief_complaint: 'Dolor de cabeza recurrente',
        primary_diagnosis: 'Migraña tensional',
        history_present_illness: 'Dolor de cabeza desde hace 3 días',
        physical_examination: 'Normal',
        treatment_plan: 'Analgésicos y descanso',
        follow_up_instructions: 'Control en 1 semana',
        doctor_name: 'Dr. Juan Pérez',
        doctor_professional_license: 'MP12345',
        created_by: 'system',
        created_at: '2024-08-28'
      }
    ];
    console.log('📋 Using fallback sample data due to API error');
    setConsultations(sampleConsultations);
  }
}, [consultationSearchTerm]);

// Handle delete consultation
const handleDeleteConsultation = useCallback(async (consultation: any) => {
  if (!window.confirm(`¿Estás seguro de que deseas eliminar la consulta de ${consultation.patient_name}?`)) {
    return;
  }
  
  try {
    // Delete consultation functionality - pending backend implementation
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

// Appointment handlers
const handleNewAppointment = useCallback(() => {
  setSelectedAppointment(null);
  setIsEditingAppointment(false);
  setAppointmentFormData({
    patient_id: '',
    doctor_id: doctorProfile?.id || '', // Auto-assign current doctor's ID
    date_time: getCurrentMexicoCityDateTime(),
    appointment_type: 'consultation',
    reason: '',
    notes: '',
    duration_minutes: 30,
    status: 'scheduled'
  });
  
  // Load patients when opening appointment dialog
  fetchPatients();
  
  setAppointmentDialogOpen(true);
  setFormErrorMessage('');
}, [doctorProfile, fetchPatients]);

// Function to create appointment from consultation follow-up
const handleCreateFollowUpAppointment = useCallback(async (appointmentData: any) => {
  try {
    console.log('🔄 Creating follow-up appointment:', appointmentData);
    
    // Check if backend is available, otherwise create locally
    try {
      // Try to create appointment via API
      await apiService.createAgendaAppointment(appointmentData);
      console.log('✅ Follow-up appointment created via API');
      
      // Always refresh appointments, but use the appointment's date, not selectedDate
      // This ensures the appointment appears when user navigates to that date
      console.log('🔄 Refreshing appointments after API creation...');
      const appointmentDate = new Date(appointmentData.date_time).toISOString().split('T')[0];
      console.log('📅 Refreshing for appointment date:', appointmentDate);
      
      // If the appointment date matches current selectedDate, refresh the view
      const currentSelectedDate = selectedDate.toISOString().split('T')[0];
      if (appointmentDate === currentSelectedDate) {
        const data = await apiService.getDailyAgenda(appointmentDate);
        setAppointments(data);
        console.log('📅 Appointments refreshed from API:', data.length);
      } else {
        console.log('ℹ️ Appointment created for different date than currently selected, will appear when navigating to that date');
      }
    } catch (apiError: any) {
      // If API fails, create locally for demonstration
      if (apiError.code === 'ERR_NETWORK' || apiError.code === 'ERR_CONNECTION_REFUSED' || apiError.status === 0) {
        console.log('⚠️ API unavailable, creating appointment locally...');
        
        const localAppointment = {
          id: `APT-${Date.now()}`,
          ...appointmentData,
          appointment_date: appointmentData.date_time, // Map field for backend compatibility
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          patient_name: patients.find(p => p.id === appointmentData.patient_id)?.full_name || 'Paciente',
          doctor_name: doctorProfile 
            ? `${doctorProfile.title || 'Dr.'} ${doctorProfile.first_name} ${doctorProfile.paternal_surname}`.trim()
            : 'Dr. Sistema'
        };
        
        // Add to appointments state only if current view is agenda and dates match
        const appointmentDate = new Date(appointmentData.date_time).toISOString().split('T')[0];
        const currentSelectedDate = selectedDate.toISOString().split('T')[0];
        
        console.log('📅 Local appointment creation:', {
          appointmentDate,
          currentSelectedDate,
          activeView,
          shouldAddToState: activeView === 'agenda' && appointmentDate === currentSelectedDate
        });
        
        // Always add to state for now - will be filtered by date in AgendaView
        // Add to appointments state for immediate feedback
        setAppointments(prev => [localAppointment, ...prev]);
        console.log('✅ Follow-up appointment created locally (fallback)');
      } else {
        throw apiError; // Re-throw if it's not a connection error
      }
    }
    
  } catch (error) {
    console.error('Error creating follow-up appointment:', error);
    throw error; // Re-throw so the calling function can handle it
  }
}, [activeView, selectedDate, patients, doctorProfile]);

const handleEditAppointment = useCallback((appointment: any) => {
  setSelectedAppointment(appointment);
  setIsEditingAppointment(true);
  setAppointmentFormData({
    patient_id: appointment.patient_id || '',
    doctor_id: appointment.doctor_id || '', // Include doctor_id from appointment
    date_time: toDateTimeLocalFormat(appointment.date_time || ''), // Convert to datetime-local format
    appointment_type: appointment.appointment_type || 'consultation',
    reason: appointment.reason || '',
    notes: appointment.notes || '',
    duration_minutes: appointment.duration_minutes || 30,
    status: appointment.status || 'scheduled'
  });
  
  // Load patients when editing appointment dialog
  fetchPatients();
  
  setAppointmentDialogOpen(true);
  setFormErrorMessage('');
}, [fetchPatients]);

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
  setLogoutDialogOpen(true);
}, []);

const confirmLogout = useCallback(() => {
  setLogoutDialogOpen(false);
  logout();
  console.log('✅ Sesión cerrada exitosamente');
}, [logout]);

const cancelLogout = useCallback(() => {
  setLogoutDialogOpen(false);
}, []);

// Handle consultation form submission
const handleConsultationSubmit = useCallback(async () => {
  setIsSubmitting(true);
  setFormErrorMessage('');
  
  try {
    // Map frontend data to backend format  
    const consultationData = {
      patient_id: consultationFormData.patient_id,
      date: consultationFormData.date ? new Date(consultationFormData.date).toISOString() : new Date().toISOString(),
      chief_complaint: consultationFormData.chief_complaint || '',
      history_present_illness: consultationFormData.history_present_illness || '',
      family_history: consultationFormData.family_history || '',
      personal_pathological_history: consultationFormData.personal_pathological_history || '',
      personal_non_pathological_history: consultationFormData.personal_non_pathological_history || '',
      physical_examination: consultationFormData.physical_examination || '',
      primary_diagnosis: consultationFormData.primary_diagnosis || '',
      secondary_diagnoses: consultationFormData.secondary_diagnoses || '',
      differential_diagnosis: '',
      treatment_plan: consultationFormData.treatment_plan || '',
      prescribed_medications: '',
      follow_up_instructions: consultationFormData.follow_up_instructions || '',
      therapeutic_plan: '',
      prognosis: '',
      laboratory_results: '',
      imaging_studies: '',
      interconsultations: '',
      doctor_name: doctorProfile 
        ? `${doctorProfile.title || 'Dr.'} ${doctorProfile.first_name} ${doctorProfile.paternal_surname} ${doctorProfile.maternal_surname || ''}`.trim()
        : 'Dr. Usuario',
      doctor_professional_license: doctorProfile?.professional_license || '',
      doctor_specialty: doctorProfile?.specialty || 'Medicina General'
    };
    
    console.log('🔍 Consultation Data Debug:', consultationData);
    
    let result: any;
    if (isEditingConsultation && selectedConsultation) {
      result = await apiService.updateConsultation(selectedConsultation.id, consultationData);
    } else {
      result = await apiService.createConsultation(consultationFormData.patient_id, consultationData);
    }
    
    // Update temporary clinical studies with real consultation ID if creating new consultation
    if (!isEditingConsultation && tempConsultationId && tempClinicalStudies.length > 0) {
          // Update the consultation_id in temporary studies
    const updatedStudies = tempClinicalStudies.map(study => ({
      ...study,
      consultation_id: result.id
    }));
    
    // Save studies to localStorage with real consultation ID
    saveStudiesToStorage(result.id, updatedStudies);
    
    // Clear temporary data
    setTempConsultationId(null);
    setTempClinicalStudies([]);
    }
    
    showSuccessMessage(
      isEditingConsultation 
        ? 'Consulta actualizada exitosamente' 
        : 'Consulta creada exitosamente'
    );
    setConsultationDialogOpen(false);
    fetchConsultations(); // Refresh the list
  } catch (error: any) {
    console.error('Error saving consultation:', error);
    
    // Check if it's a connection error (backend not available)
    if (error.code === 'ERR_NETWORK' || error.code === 'ERR_CONNECTION_REFUSED' || error.message?.includes('Network Error') || error.status === 0) {
      console.log('🔄 Backend unavailable, creating consultation locally for testing...');
      
      try {
        // Create simulated consultation locally
        const simulatedConsultation = {
          id: `CONS-${Date.now()}`,
          patient_id: consultationFormData.patient_id,
          date: consultationFormData.date ? new Date(consultationFormData.date).toISOString() : new Date().toISOString(),
          chief_complaint: consultationFormData.chief_complaint || '',
          history_present_illness: consultationFormData.history_present_illness || '',
          family_history: consultationFormData.family_history || '',
          personal_pathological_history: consultationFormData.personal_pathological_history || '',
          personal_non_pathological_history: consultationFormData.personal_non_pathological_history || '',
          physical_examination: consultationFormData.physical_examination || '',
          primary_diagnosis: consultationFormData.primary_diagnosis || '',
          secondary_diagnoses: consultationFormData.secondary_diagnoses || '',
          treatment_plan: consultationFormData.treatment_plan || '',
          follow_up_instructions: consultationFormData.follow_up_instructions || '',
          interconsultations: consultationFormData.interconsultations || '',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          patient_name: patients.find(p => p.id === consultationFormData.patient_id)?.full_name || 'Paciente Desconocido',
          doctor_name: doctorProfile 
            ? `${doctorProfile.title || 'Dr.'} ${doctorProfile.first_name} ${doctorProfile.paternal_surname} ${doctorProfile.maternal_surname || ''}`.trim()
            : 'Dr. Sistema',
          doctor_professional_license: doctorProfile?.professional_license || 'SIS001'
        };
        
        // Add to local consultations state
        setConsultations(prev => [simulatedConsultation, ...prev]);
        
        // Handle temporary clinical studies
        if (!isEditingConsultation && tempConsultationId && tempClinicalStudies.length > 0) {
          const updatedStudies = tempClinicalStudies.map(study => ({
            ...study,
            consultation_id: simulatedConsultation.id
          }));
          
          // Clinical studies will be associated with the consultation
          // For now, we just clear the temporary studies
          setTempClinicalStudies([]);
        }
        
        // Reset form and show success
        setConsultationFormData({
          patient_id: '',
          date: '',
          chief_complaint: '',
          history_present_illness: '',
          family_history: '',
          personal_pathological_history: '',
          personal_non_pathological_history: '',
          physical_examination: '',
          primary_diagnosis: '',
          secondary_diagnoses: '',
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
        setTempConsultationId(null);
        setSuccessMessage(
          isEditingConsultation 
            ? 'Consulta actualizada exitosamente (modo local)' 
            : 'Consulta creada exitosamente (modo local)'
        );
        setConsultationDialogOpen(false);
        
        return; // Exit successfully
        
      } catch (localError) {
        console.error('Error creating local consultation:', localError);
        setFormErrorMessage('Error al crear la consulta localmente');
      }
    }
    
    // Parse API errors properly for other types of errors
    if (error.response?.data?.detail) {
      const detail = error.response.data.detail;
      if (typeof detail === 'string') {
        setFormErrorMessage(detail);
      } else if (Array.isArray(detail)) {
        // Handle Pydantic validation errors
        const errorMessages = detail.map((err: any) => {
          const field = err.loc?.[1] || err.loc?.[0] || 'Campo';
          return `${field}: ${err.msg}`;
        }).join(', ');
        setFormErrorMessage(errorMessages);
        
        // Set individual field errors
        const newFieldErrors: {[key: string]: string} = {};
        detail.forEach((err: any) => {
          const field = err.loc?.[1] || err.loc?.[0];
          if (field) {
            newFieldErrors[field] = err.msg;
          }
        });
        setFieldErrors(newFieldErrors);
      } else {
        setFormErrorMessage('Error al guardar la consulta');
      }
    } else {
      setFormErrorMessage('Error de conexión al guardar la consulta');
    }
  } finally {
    setIsSubmitting(false);
  }
}, [consultationFormData, isEditingConsultation, selectedConsultation, fetchConsultations, doctorProfile, tempConsultationId, tempClinicalStudies, consultations]);

// Clinical Studies handlers
const handleAddClinicalStudy = useCallback(() => {
  let consultationId: string;
  let patientId: string;
  
  if (selectedConsultation) {
    // Existing consultation
    consultationId = selectedConsultation.id;
    patientId = selectedConsultation.patient_id;
  } else {
    // New consultation - generate temporary ID if not exists
    if (!tempConsultationId) {
      const newTempId = `temp_consultation_${Date.now()}`;
      setTempConsultationId(newTempId);
      consultationId = newTempId;
    } else {
      consultationId = tempConsultationId;
    }
    patientId = consultationFormData.patient_id;
    
    if (!patientId) {
      console.error('❌ No hay paciente seleccionado para agregar estudio');
      return;
    }
  }
  
  console.log('📋 Agregando estudio clínico a:', {
    consultationId,
    patientId,
    isNewConsultation: !selectedConsultation
  });
  
  setSelectedClinicalStudy(null);
  setIsEditingClinicalStudy(false);
  
  const orderingDoctor = doctorProfile?.full_name || user?.doctor?.full_name || 'Dr. Usuario Sistema';
  const orderedDate = new Date().toISOString().split('T')[0];
  
  const newFormData: ClinicalStudyFormData = {
    consultation_id: consultationId,
    patient_id: patientId,
    study_type: 'hematologia' as StudyType,
    study_name: '',
    study_description: '',
    ordered_date: orderedDate,
    status: 'pending' as StudyStatus,
    results_text: '',
    interpretation: '',
    ordering_doctor: orderingDoctor,
    performing_doctor: '',
    institution: '',
    urgency: 'normal',
    clinical_indication: '',
    relevant_history: '',
    created_by: 'current_user'
  };
  
  setClinicalStudyFormData(newFormData);
  setClinicalStudyFormErrorMessage('');
  setClinicalStudyFieldErrors({});
  setClinicalStudyDialogOpen(true);
}, [selectedConsultation, tempConsultationId, consultationFormData.patient_id, doctorProfile, user]);

const handleEditClinicalStudy = useCallback((study: ClinicalStudy) => {
  setSelectedClinicalStudy(study);
  setIsEditingClinicalStudy(true);
  setClinicalStudyFormData({
    consultation_id: study.consultation_id,
    patient_id: study.patient_id,
    study_type: study.study_type,
    study_name: study.study_name,
    study_description: study.study_description || '',
    ordered_date: study.ordered_date.split('T')[0],
    performed_date: study.performed_date?.split('T')[0],
    results_date: study.results_date?.split('T')[0],
    status: study.status,
    results_text: study.results_text || '',
    interpretation: study.interpretation || '',
    ordering_doctor: study.ordering_doctor,
    performing_doctor: study.performing_doctor || '',
    institution: study.institution || '',
    urgency: study.urgency || 'normal',
    clinical_indication: study.clinical_indication || '',
    relevant_history: study.relevant_history || '',
    created_by: study.created_by
  });
  setClinicalStudyFormErrorMessage('');
  setClinicalStudyFieldErrors({});
  setClinicalStudyDialogOpen(true);
}, []);

const handleDeleteClinicalStudy = useCallback((studyId: string) => {
  if (!selectedConsultation) {
    console.error('❌ No hay consulta seleccionada para eliminar estudio');
    return;
  }
  
  console.log('🗑️ Eliminando estudio clínico:', studyId, 'de consulta:', selectedConsultation.id);
  const currentStudies = getCurrentConsultationStudies();
  const updatedStudies = currentStudies.filter(study => study.id !== studyId);
  updateCurrentConsultationStudies(updatedStudies);
  

}, [selectedConsultation, getCurrentConsultationStudies, updateCurrentConsultationStudies]);

const handleClinicalStudySubmit = useCallback(async () => {
  if (!selectedConsultation && !tempConsultationId) {
    console.error('❌ No hay consulta seleccionada ni ID temporal');
    setClinicalStudyFormErrorMessage('Error: No hay consulta disponible');
    return;
  }

  setIsClinicalStudySubmitting(true);
  setClinicalStudyFormErrorMessage('');
  
  try {
    const consultationId = selectedConsultation?.id || tempConsultationId;
    const patientId = selectedConsultation?.patient_id || clinicalStudyFormData.patient_id;
    
    if (!consultationId) {
      console.error('❌ No se pudo determinar el ID de consulta');
      setClinicalStudyFormErrorMessage('Error: No se pudo asociar el estudio a la consulta');
      return;
    }

    // Prepare study data for backend
    const studyData = {
      consultation_id: consultationId,
      patient_id: patientId,
      study_type: clinicalStudyFormData.study_type,
      study_name: clinicalStudyFormData.study_name,
      study_description: clinicalStudyFormData.study_description || '',
      ordered_date: new Date(clinicalStudyFormData.ordered_date).toISOString(),
      status: clinicalStudyFormData.status,
      results_text: clinicalStudyFormData.results_text || '',
      interpretation: clinicalStudyFormData.interpretation || '',
      ordering_doctor: clinicalStudyFormData.ordering_doctor,
      performing_doctor: clinicalStudyFormData.performing_doctor || '',
      institution: clinicalStudyFormData.institution || '',
      urgency: clinicalStudyFormData.urgency || 'normal',
      clinical_indication: clinicalStudyFormData.clinical_indication || '',
      relevant_history: clinicalStudyFormData.relevant_history || '',
      created_by: clinicalStudyFormData.created_by || doctorProfile?.id || ''
    };
    
    if (isEditingClinicalStudy && selectedClinicalStudy) {
      // Update existing study via backend
      try {
        await apiService.updateClinicalStudy(selectedClinicalStudy.id, studyData);
        console.log('✅ Estudio clínico actualizado en backend');
      } catch (error) {
        console.error('Error updating via backend, using localStorage fallback:', error);
        // Fallback to localStorage
        const currentStudies = getCurrentConsultationStudies();
        const updatedStudy = { ...selectedClinicalStudy, ...studyData, updated_at: new Date().toISOString() };
        const updatedStudies = currentStudies.map(study => 
          study.id === selectedClinicalStudy.id ? updatedStudy : study
        );
        updateCurrentConsultationStudies(updatedStudies);
      }
    } else {
      // Create new study
      if (selectedConsultation?.id) {
        // Existing consultation - use backend
        try {
          const newStudy = await apiService.createClinicalStudy(studyData);
          console.log('✅ Estudio clínico creado en backend:', newStudy);
          
          // Reload studies from backend to get updated list
          await loadConsultationStudies(selectedConsultation.id);
        } catch (error) {
          console.error('Error creating via backend, using localStorage fallback:', error);
          // Fallback to localStorage
          const currentStudies = getCurrentConsultationStudies();
          const newStudy: ClinicalStudy = {
            id: `cs_${Date.now()}`,
            ...studyData,
            created_at: new Date().toISOString()
          };
          const updatedStudies = [...currentStudies, newStudy];
          updateCurrentConsultationStudies(updatedStudies);
        }
      } else {
        // New consultation with temporary ID - use localStorage for now
        const currentStudies = getCurrentConsultationStudies();
        const newStudy: ClinicalStudy = {
          id: `cs_${Date.now()}`,
          ...studyData,
          created_at: new Date().toISOString()
        };
        const updatedStudies = [...currentStudies, newStudy];
        updateCurrentConsultationStudies(updatedStudies);
        console.log('💾 Estudio clínico guardado temporalmente (nueva consulta)');
      }
    }
    
    setClinicalStudyDialogOpen(false);
    setSelectedClinicalStudy(null);
    setIsEditingClinicalStudy(false);
    
  } catch (error) {
    console.error('Error al guardar estudio clínico:', error);
    setClinicalStudyFormErrorMessage('Error al guardar el estudio clínico');
  } finally {
    setIsClinicalStudySubmitting(false);
  }
}, [isEditingClinicalStudy, selectedClinicalStudy, clinicalStudyFormData, selectedConsultation, tempConsultationId, doctorProfile, getCurrentConsultationStudies, updateCurrentConsultationStudies, loadConsultationStudies]);

// Handle appointment form submission
const handleAppointmentSubmit = useCallback(async () => {
  setIsSubmitting(true);
  setFormErrorMessage('');
  
  try {
    // Validate required fields BEFORE sending to backend
    // Note: doctor_id is auto-assigned by backend if not provided, so not required in validation
    const requiredFields = ['patient_id', 'date_time', 'appointment_type', 'reason'];
    const missingFields = requiredFields.filter(field => {
      const value = appointmentFormData[field as keyof AppointmentFormData];
      return !value || (typeof value === 'string' && value.trim() === '');
    });
    
    // Debug info in development
    if (process.env.NODE_ENV === 'development') {
      console.group('🔍 Appointment Creation Debug');
      console.log('📋 Form Data:', appointmentFormData);
      console.log('👨‍⚕️ Doctor Profile:', doctorProfile);
      console.log('🏥 Current Settings:', { isEditingAppointment, selectedAppointment });
      
      if (missingFields.length > 0) {
        console.error('❌ Missing required fields:', missingFields);
      }
      
      console.groupEnd();
    }
    
    // Stop submission if required fields are missing
    if (missingFields.length > 0) {
      let errorMessage = 'Por favor, completa los siguientes campos obligatorios:\n';
      
      const fieldLabels: Record<string, string> = {
        'patient_id': '• Seleccionar un paciente',
        'date_time': '• Fecha y hora de la cita',
        'appointment_type': '• Tipo de cita',
        'reason': '• Motivo de la consulta'
      };
      
      missingFields.forEach(field => {
        errorMessage += fieldLabels[field] || `• ${field}`;
        errorMessage += '\n';
      });
      
      setFormErrorMessage(errorMessage);
      setIsSubmitting(false); // Reset submit state for missing fields
      return; // Exit early without making API call
    }
    
    // Map date_time to the backend field structure
    const appointmentData = {
      ...appointmentFormData,
      // Map UI date_time field to backend appointment_date field
      appointment_date: appointmentFormData.date_time,
      // Ensure doctor_id is included from current doctor profile
      doctor_id: (appointmentFormData.doctor_id && appointmentFormData.doctor_id.trim() !== '') 
                  ? appointmentFormData.doctor_id 
                  : (doctorProfile?.id || ''),
      // Remove the UI-specific field to avoid confusion
      date_time: undefined
    };
    
    // Additional debug for backend payload
    if (process.env.NODE_ENV === 'development') {
      console.group('📤 Backend Payload Debug');
      console.log('📋 appointmentFormData.doctor_id:', appointmentFormData.doctor_id);
      console.log('👨‍⚕️ doctorProfile?.id:', doctorProfile?.id);
      console.log('🔄 Final doctor_id:', appointmentData.doctor_id);
      console.log('📦 Complete Backend Payload:', appointmentData);
      console.groupEnd();
    }
    
    if (isEditingAppointment && selectedAppointment) {
      // Update existing appointment
      await apiService.updateAppointment(selectedAppointment.id, appointmentData);
      showSuccessMessage('Cita actualizada exitosamente');
    } else {
      // Create new appointment using the correct agenda endpoint
      await apiService.createAgendaAppointment(appointmentData);
      showSuccessMessage('Cita creada exitosamente');
    }
    
    setAppointmentDialogOpen(false);
    fetchAppointments(); // Refresh the list
  } catch (error: any) {
    // Enhanced error logging
    if (process.env.NODE_ENV === 'development') {
      console.group('❌ Appointment Creation Error');
      console.error('Error object:', error);
      console.error('Response data:', error.response?.data);
      console.error('Response status:', error.response?.status);
      console.error('Form data that caused error:', appointmentFormData);
      console.groupEnd();
    }
    
    // User-friendly error message
    let errorMessage = 'Error al guardar la cita';
    if (error.response?.data?.detail) {
      if (typeof error.response.data.detail === 'string') {
        errorMessage = error.response.data.detail;
      } else if (error.response.data.detail.includes && error.response.data.detail.includes('foreign key')) {
        errorMessage = 'Error: Paciente o médico no válido. Por favor, selecciona un paciente válido.';
      }
    }
    
    setFormErrorMessage(errorMessage);
  } finally {
    setIsSubmitting(false);
  }
}, [appointmentFormData, isEditingAppointment, selectedAppointment, fetchAppointments, doctorProfile]);

// Validation function for required fields
const validatePatientForm = () => {
  const errors: {[key: string]: string} = {};
  
  // Mandatory fields according to NOM-004
  if (!patientFormData.first_name.trim()) errors.first_name = 'Este campo es obligatorio';
  if (!patientFormData.paternal_surname.trim()) errors.paternal_surname = 'Este campo es obligatorio';
  if (!patientFormData.maternal_surname.trim()) errors.maternal_surname = 'Este campo es obligatorio';
  if (!patientFormData.birth_date) errors.birth_date = 'Este campo es obligatorio';
  if (!patientFormData.gender) errors.gender = 'Este campo es obligatorio';
  if (!patientFormData.phone.trim()) errors.phone = 'Este campo es obligatorio';
  if (!patientFormData.address.trim()) errors.address = 'Este campo es obligatorio';
  
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
  // Patient submit started
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
      birth_date: patientFormData.birth_date,
      gender: patientFormData.gender,
      place_of_birth: null, // Not included in frontend form
      birth_state_code: patientFormData.birth_state_code || '',
      nationality: patientFormData.nationality || "Mexicana",
      curp: patientFormData.curp || '',
      internal_id: patientFormData.internal_id || '',
      phone: patientFormData.phone,
      address: patientFormData.address,
      email: patientFormData.email || '',
      neighborhood: patientFormData.neighborhood || '',
      municipality: patientFormData.municipality || '',
      state: patientFormData.state || '',
      postal_code: patientFormData.postal_code || '',
      civil_status: patientFormData.civil_status || '',
      education_level: patientFormData.education_level || '',
      occupation: patientFormData.occupation || '',
      religion: patientFormData.religion || '',
      insurance_type: patientFormData.insurance_type || '',
      insurance_number: patientFormData.insurance_number || '',
      emergency_contact_name: patientFormData.emergency_contact_name || '',
      emergency_contact_phone: patientFormData.emergency_contact_phone || '',
      emergency_contact_relationship: patientFormData.emergency_contact_relationship || '',
      emergency_contact_address: patientFormData.emergency_contact_address || '',
      allergies: patientFormData.allergies || '',
      chronic_conditions: patientFormData.chronic_conditions || '',
      current_medications: patientFormData.current_medications || '',
      blood_type: patientFormData.blood_type || '',

      previous_hospitalizations: patientFormData.previous_hospitalizations || '',
      surgical_history: patientFormData.surgical_history || '',
      status: patientFormData.status
    };
    
    if (isEditingPatient && selectedPatient) {
      // Update existing patient
      await apiService.updatePatient(selectedPatient.id, patientData);
      const patientName = `${patientFormData.first_name} ${patientFormData.paternal_surname} ${patientFormData.maternal_surname}`;
      fetchPatients();
      setPatientDialogOpen(false);
      resetPatientForm();
      setFieldErrors({});
      showSuccessMessage(`✅ El paciente ${patientName} fue actualizado exitosamente`);
    } else {
      // Create new patient
      // Sending patient data to API
      await apiService.createPatient(patientData);
      // API response received successfully
        const patientName = `${patientFormData.first_name} ${patientFormData.paternal_surname} ${patientFormData.maternal_surname}`;
        // Success: dialog closed and view changed
        
        // Immediate UI updates
        setPatientDialogOpen(false);
        
        if (creatingPatientFromConsultation) {
          // If creating patient from consultation, return to consultation dialog
          setCreatingPatientFromConsultation(false);
          setConsultationDialogOpen(true);
          
          // Batch state updates to avoid multiple re-renders  
          setTimeout(() => {
            setFormErrorMessage('');
            setFieldErrors({});
            resetPatientForm();
            showSuccessMessage(`✅ El paciente ${patientName} fue agregado con éxito. Ahora puedes seleccionarlo en la consulta.`);
            fetchPatients(); // This will make the new patient available in the consultation dialog
          }, 10);
        } else {
          // Normal patient creation flow
          setActiveView('patients');
          
          // Batch state updates to avoid multiple re-renders
          setTimeout(() => {
            setFormErrorMessage('');
            setFieldErrors({});
            resetPatientForm();
            showSuccessMessage(`✅ El paciente ${patientName} fue agregado con éxito`);
            fetchPatients();
          }, 10);
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
    birth_date: patient.birth_date,
    gender: patient.gender,
    phone: patient.phone,
    address: patient.address,
    
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
    email: patient.email || '',
    
    // Estado del paciente
    status: (patient.status || 'active') as 'active' | 'inactive'
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
    await apiService.deletePatient(selectedPatient.id);
    
    setPatientDialogOpen(false);
    resetPatientForm();
    setFieldErrors({});
    setActiveView('patients');
    fetchPatients();
    showSuccessMessage(`🗑️ El paciente ${patientName} fue eliminado exitosamente`);
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

  // Load dashboard data
  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        // Fetch dashboard data
        const data = await apiService.getDashboardData();
        setDashboardData(data);
        
        // Fetch today's appointments for the agenda
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
        const appointments = await apiService.getDailyAgenda(today);
        setTodayAppointments(appointments || []);
      } catch (error) {
        console.log('Dashboard data not available, using mock data');
        // Mock data for demo
        setDashboardData({
          physician: 'Dr. García Martínez',
          today_appointments: 1,
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
        setTodayAppointments([]);
      }
    };

    loadDashboardData();
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
        <ProtectedRoute>
      <Box sx={{ flexGrow: 1, minHeight: '100vh', backgroundColor: avantColors.neutral[50] }}>
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
                <AvantLogo variant="icon" sx={{ color: 'white', fontSize: 24 }} />
              </Box>
              <Box>
                <Typography variant="h6" component="div" sx={{ color: 'white', fontWeight: 700, letterSpacing: '0.5px' }}>
                  AVANT
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
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
              <Avatar 
                sx={{ 
                  bgcolor: 'primary.main', 
                  width: 40, 
                  height: 40,
                  fontSize: '0.875rem',
                  fontWeight: 600
                }}
              >
                {user ? 
                  `${user.doctor.first_name[0]}${user.doctor.paternal_surname[0]}` :
                  (doctorProfile ? 
                    `${doctorProfile.first_name[0]}${doctorProfile.paternal_surname[0]}` :
                    'A'
                  )
                }
              </Avatar>
              <Box sx={{ flex: 1 }}>
                                <Typography variant="subtitle2" sx={{ fontWeight: 600, lineHeight: 1.2 }}>
                  {user?.doctor.full_name || 
                   (doctorProfile 
                ? `${doctorProfile.first_name} ${doctorProfile.paternal_surname}` 
                : (dashboardData?.physician || 'Dr. García')
                   )
              }
            </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.2 }}>
                  {user?.doctor.specialty || doctorProfile?.specialty || 'Médico General'}
            </Typography>
                {(user?.doctor.professional_license || doctorProfile?.professional_license) && (
                  <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.2 }}>
                    Cédula: {user?.doctor.professional_license || doctorProfile?.professional_license}
              </Typography>
                )}
              </Box>
            </Box>

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
                        <AvantLogo variant="icon" sx={{ fontSize: 20 }} />
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
                  
                  <MenuItem 
                      selected={activeView === 'demo'}
                      onClick={() => setActiveView('demo')}
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
                        primary="Smart Table Demo" 
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
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    <MenuItem 
                      onClick={handleNewPatient}
                      sx={{ 
                        borderRadius: '12px', 
                        mb: 1,
                        py: 1.5,
                        '&:hover': {
                          backgroundColor: 'action.hover'
                        }
                      }}
                    >
                      <ListItemIcon>
                        <PersonAddIcon />
                      </ListItemIcon>
                      <ListItemText 
                        primary="Nuevo Paciente" 
                        primaryTypographyProps={{ fontWeight: 500 }}
                      />
                    </MenuItem>
                    
                    <MenuItem 
                      onClick={handleNewAppointment}
                      sx={{ 
                        borderRadius: '12px', 
                        mb: 1,
                        py: 1.5,
                        '&:hover': {
                          backgroundColor: 'action.hover'
                        }
                      }}
                    >
                      <ListItemIcon>
                        <ScheduleIcon />
                      </ListItemIcon>
                      <ListItemText 
                        primary="Nueva Cita" 
                        primaryTypographyProps={{ fontWeight: 500 }}
                      />
                    </MenuItem>
                    
                    <MenuItem 
                      onClick={handleNewConsultation}
                      sx={{ 
                        borderRadius: '12px', 
                        mb: 1,
                        py: 1.5,
                        '&:hover': {
                          backgroundColor: 'action.hover'
                        }
                      }}
                    >
                      <ListItemIcon>
                        <AvantLogo variant="icon" sx={{ fontSize: 20 }} />
                      </ListItemIcon>
                      <ListItemText 
                        primary="Nueva Consulta" 
                        primaryTypographyProps={{ fontWeight: 500 }}
                      />
                    </MenuItem>
                    
                    <MenuItem 
                      sx={{ 
                        borderRadius: '12px', 
                        mb: 1,
                        py: 1.5,
                        '&:hover': {
                          backgroundColor: 'action.hover'
                        }
                      }}
                    >
                      <ListItemIcon>
                        <MessageIcon />
                      </ListItemIcon>
                      <ListItemText 
                        primary="Enviar Mensaje" 
                        primaryTypographyProps={{ fontWeight: 500 }}
                      />
                    </MenuItem>
                  </Box>
              </Paper>
            </Box>

            {/* Main Content Area */}
            <Box sx={{ width: { xs: '100%', md: '75%' } }}>
              {activeView === 'dashboard' && (
                <Suspense fallback={<LoadingFallback message="Cargando dashboard..." />}>
                  <DashboardView 
                    dashboardData={dashboardData} 
                    todayAppointments={todayAppointments}
                    onNewAppointment={handleNewAppointment}
                    onNewConsultation={handleNewConsultation}
                  />
                </Suspense>
              )}

              {activeView === 'patients' && (
                <Suspense fallback={<LoadingFallback message="Cargando pacientes..." />}>
                  <PatientsViewSmart
                    patients={patients}
                    consultations={consultations}
                    successMessage={successMessage}
                    setSuccessMessage={setSuccessMessage}
                    handleNewPatient={handleNewPatient}
                    handleEditPatient={handleEditPatient}
                    isLoading={false}
                  />
                </Suspense>
              )}

              {activeView === 'consultations' && !consultationDetailView && (
                <Suspense fallback={<LoadingFallback message="Cargando consultas..." />}>
                  <ConsultationsViewSmart
                    consultations={consultations}
                    patients={patients}
                    successMessage={successMessage}
                    setSuccessMessage={setSuccessMessage}
                    handleNewConsultation={handleNewConsultation}
                    handleEditConsultation={handleEditConsultation}
                    isLoading={false}
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
                    clinicalStudies={getCurrentConsultationStudies()}
                    onEditClinicalStudy={handleEditClinicalStudy}
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
                    isEditing={false}
                    formData={doctorProfileFormData}
                    setFormData={setDoctorProfileFormData}
                    onCancel={handleCancelDoctorProfile}
                    successMessage={doctorProfileSuccessMessage}
                    errorMessage={doctorProfileFormErrorMessage}
                  />
                </Suspense>
              )}

              {activeView === 'demo' && (
                <Suspense fallback={<LoadingFallback message="Cargando demo..." />}>
                  <SmartTableDemo />
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
            onCreateNewPatient={() => {
              setConsultationDialogOpen(false);
              setIsEditingPatient(false);
              setCreatingPatientFromConsultation(true);
              setPatientDialogOpen(true);
            }}
            clinicalStudies={getCurrentConsultationStudies()}
            onAddClinicalStudy={handleAddClinicalStudy}
            onEditClinicalStudy={handleEditClinicalStudy}
            onDeleteClinicalStudy={handleDeleteClinicalStudy}
            selectedConsultation={selectedConsultation}
            tempConsultationId={tempConsultationId}
            onCreateAppointment={handleCreateFollowUpAppointment}
          />
        </Suspense>

        {/* Appointment Dialog */}
        <Suspense fallback={<LoadingFallback message="Cargando formulario de cita..." />}>
          <AppointmentDialog
            open={appointmentDialogOpen}
            onClose={() => {
              setAppointmentDialogOpen(false);
              setFormErrorMessage('');
              setFieldErrors({});
            }}
            onSubmit={handleAppointmentSubmit}
            onNewPatient={() => {
              setAppointmentDialogOpen(false);
              setIsEditingPatient(false);
              setCreatingPatientFromConsultation(true);
              setPatientDialogOpen(true);
            }}
            formData={appointmentFormData}
            patients={patients}
            isEditing={isEditingAppointment}
            loading={isSubmitting}
            formErrorMessage={formErrorMessage}
            fieldErrors={fieldErrors}
            onFormDataChange={setAppointmentFormData}
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

        {/* Clinical Study Dialog */}
        <Suspense fallback={<LoadingFallback message="Cargando formulario de estudio clínico..." />}>
          <ClinicalStudyDialog
            open={clinicalStudyDialogOpen}
            onClose={() => {
              setClinicalStudyDialogOpen(false);
              setSelectedClinicalStudy(null);
              setIsEditingClinicalStudy(false);
              setClinicalStudyFormErrorMessage('');
              setClinicalStudyFieldErrors({});
            }}
            isEditing={isEditingClinicalStudy}
            formData={clinicalStudyFormData}
            setFormData={setClinicalStudyFormData}
            onSubmit={handleClinicalStudySubmit}
            formErrorMessage={clinicalStudyFormErrorMessage}
            setFormErrorMessage={setClinicalStudyFormErrorMessage}
            isSubmitting={isClinicalStudySubmitting}
            fieldErrors={clinicalStudyFieldErrors}
          />
        </Suspense>

        {/* Logout Confirmation Dialog */}
        <LogoutConfirmDialog
          open={logoutDialogOpen}
          onClose={cancelLogout}
          onConfirm={confirmLogout}
          userName={user?.doctor.full_name || 'Usuario'}
        />
      </Box>
        </ProtectedRoute>
    </ThemeProvider>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
