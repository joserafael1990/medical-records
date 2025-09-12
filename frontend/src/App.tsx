
import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/auth/ProtectedRoute';
import { formatDateTime } from './utils/formatters';

// Debug helper - only logs in development
const debugLog = (message: string, data?: any) => {
  if (process.env.NODE_ENV === 'development') {
    console.log(message, data || '');
  }
};
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
// Removed unused Table-related imports

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
  MedicalRecordsView,
  PatientDialog,
  ConsultationDialog,
  AppointmentDialog,
  ClinicalStudyDialog,
  DoctorProfileView,
  DoctorProfileDialog
} from './components/lazy';
import { ConsultationDetailView } from './components';
import { LoadingFallback } from './components';
// SmartTableDemo removed - demo component deleted
import { 
  Patient, 
  // Removed unused DoctorFormData 
  ConsultationFormData, 
  // Removed unused AppointmentFormData 
  ClinicalStudy, 
  ClinicalStudyFormData, 
  StudyType, 
  StudyStatus,
  // Removed unused types: MedicalHistory, Prescription, VitalSigns, Appointment
  CompletePatientData,
  DashboardData,
  PatientFormData
} from './types';
// Removed unused API_CONFIG import
import { apiService } from './services/api';
import { useDoctorProfileCache as useDoctorProfile } from './hooks/useDoctorProfileCache';
import { useAppState, useAppointmentManager, usePatientManagement, useConsultationManagement } from './hooks';
// Removed unused AppHeader, AppSidebar imports
import {
  MedicalServices as MedicalIcon,
  Dashboard as DashboardIcon,
  Description as DocumentIcon,
  People as PatientIcon,
  Assignment as AssignmentIcon,
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
import { submitConsultation } from './utils/consultationHelpers';
// networkDiagnostic utility removed to reduce bundle size

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

// DashboardData interface moved to types/index.ts

// Patient interface imported from types

// VitalSigns interface moved to types/index.ts

// ============================================================================
// INTERFACES CONSOLIDATED - All moved to types/index.ts
// ============================================================================
// 
// The following interfaces have been moved to types/index.ts to avoid duplication:
// - MedicalHistory
// - Prescription  
// - Appointment
// - CompletePatientData
// - VitalSigns
//
// They are now imported from './types' at the top of this file.

function AppContent() {
  // Clean slate - clear any residual clinical studies data AND problematic cached data
  useEffect(() => {
    console.log('🧹 Limpiando datos residuales y cache corrupto...');
    
    // localStorage cleanup removed - backend-only approach
    console.log('✅ Sistema configurado para usar exclusivamente backend');
  }, []);

  // Authentication
  const { user, logout, isAuthenticated } = useAuth();
  
  // Global app state using extracted hook
  const {
    activeView,
    setActiveView,
    successMessage,
    formErrorMessage,
    fieldErrors,
    isSubmitting,
    showSuccessMessage,
    setFormErrorMessage,
    setFieldErrors,
    setIsSubmitting,
    clearMessages
  } = useAppState();

  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [todayAppointments, setTodayAppointments] = useState<any[]>([]);

  // localStorage functions removed - backend-only approach

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

  // Patient management - using refactored hook
  const patientManagement = usePatientManagement();

  // Consultation management - using refactored hook  
  const consultationManagement = useConsultationManagement();

  // loadStudiesFromStorage removed - backend-only approach
  
  // State for clinical studies from backend
  const [consultationStudies, setConsultationStudies] = useState<ClinicalStudy[]>([]);

  // Helper function to get clinical studies for current consultation
  const getCurrentConsultationStudies = (): ClinicalStudy[] => {
    // Use consultation studies from backend only
    return consultationManagement.consultationStudies || [];
  };

  // Load clinical studies from backend for selected consultation
  // loadConsultationStudies removed - now using consultationManagement.loadConsultationStudies

  // Helper function to update clinical studies for current consultation
  const updateCurrentConsultationStudies = (studies: ClinicalStudy[]) => {
    // Update studies in consultation management only
    consultationManagement.setConsultationStudies(studies);
  };
  const [clinicalStudyDialogOpen, setClinicalStudyDialogOpen] = useState(false);
  const [isEditingClinicalStudy, setIsEditingClinicalStudy] = useState(false);
  const [selectedClinicalStudy, setSelectedClinicalStudy] = useState<ClinicalStudy | null>(null);
  const [clinicalStudyFormData, setClinicalStudyFormData] = useState<ClinicalStudyFormData>({
    consultation_id: 0,
    patient_id: 0,
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

  // Doctor profile management - moved to top of component

  // Agenda management using extracted hook
  const appointmentManager = useAppointmentManager(patientManagement.patients, doctorProfile);
  const {
    appointments,
    setAppointments,
    selectedDate,
    setSelectedDate,
    agendaView,
    setAgendaView,
    appointmentDialogOpen,
    setAppointmentDialogOpen,
    isEditingAppointment,
    setIsEditingAppointment,
    appointmentFormData,
    setAppointmentFormData,
    handleNewAppointment,
    handleEditAppointment,
    handleAppointmentSubmit,
    handleCancelAppointment,
    fetchAppointments
  } = appointmentManager;
  
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
  
  // Logout dialog state
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);

  // User menu state
  const [userMenuAnchor, setUserMenuAnchor] = useState<null | HTMLElement>(null);
  const userMenuOpen = Boolean(userMenuAnchor);

  
  const [patientFormData, setPatientFormData] = useState<PatientFormData>({
    // ===== CAMPOS OBLIGATORIOS (NOM-004) =====
    first_name: '',
    paternal_surname: '',
    maternal_surname: '',
    birth_date: '',
    gender: '',
    
    // ===== IDENTIFICACIÓN =====
    curp: '',
    rfc: '',
    civil_status: '',
    nationality_id: 1,
    birth_place: '',
    
    // ===== LUGAR DE NACIMIENTO (NOM-024) =====
    birth_state_id: null,
    foreign_birth_place: '',
    
    // ===== CONTACTOS =====
    email: '',
    primary_phone: '',
    
    // ===== DIRECCIÓN PERSONAL COMPLETA =====
    address_street: '',
    address_ext_number: '',
    address_int_number: '',
    address_neighborhood: '',
    city_id: null,
    address_postal_code: '',
    
    // ===== DATOS MÉDICOS =====
    blood_type: '',
    allergies: '',
    chronic_conditions: '',
    current_medications: '',
    
    // ===== SEGURO MÉDICO =====
    insurance_provider: '',
    insurance_number: '',
    
    // ===== CONTACTO DE EMERGENCIA =====
    emergency_contact_name: '',
    emergency_contact_phone: '',
    emergency_contact_relationship: '',
    
    is_active: true
  });

  // Global error handler to catch runtime errors
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      // Filter out extension-related errors
      if (event.message?.includes('runtime.lastError') || 
          event.message?.includes('Extension context invalidated') ||
          event.message?.includes('message channel closed')) {
        console.warn('Browser extension error (can be ignored):', event.message);
        return;
      }
      
      // Filter out [object Object] errors - these should be fixed now
      if (event.message?.includes('[object Object]')) {
        console.warn('🚫 [object Object] error detected - this should be fixed now');
        return;
      }
      
      // Better error formatting
      const errorMessage = event.error?.message || event.message || 'Unknown error';
      const errorStack = event.error?.stack || 'No stack trace available';
      
      // Only log significant errors
      if (errorMessage !== 'Unknown error' && !errorMessage.includes('Script error')) {
        console.error('Application error:', {
          message: errorMessage,
          stack: errorStack,
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno
        });
      }
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      // Prevent the default error display
      event.preventDefault();
      
      // Better promise rejection formatting
      const reason = event.reason;
      if (reason && typeof reason === 'object') {
        // Only log errors that aren't auth-related (to avoid spam)
        if (!reason.detail?.includes('authentication') && reason.status !== 401 && reason.status !== 403) {
          console.error('Unhandled promise rejection:', {
            message: reason.message || 'Promise rejection',
            details: reason.detail || reason.response?.data?.detail || 'No details available',
            status: reason.status || reason.response?.status || 'Unknown status',
            stack: reason.stack || 'No stack trace'
          });
        } else {
          // Auth errors are expected during logout/session expiry
          console.warn('Auth-related error (expected during logout):', {
            status: reason.status,
            detail: reason.detail
          });
        }
      } else {
        console.error('Unhandled promise rejection:', reason);
      }
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  // Load appointments when active view is agenda or when selected date changes
  useEffect(() => {
    if (!user || !isAuthenticated) {
      console.log('🔒 AppContent - User not authenticated, skipping appointments fetch');
      return;
    }
    
    if (activeView === 'agenda') {
      fetchAppointments();
    }
  }, [activeView, selectedDate, user, isAuthenticated]); // Remove fetchAppointments dependency to avoid infinite loop

  // Patient management functions
  // fetchPatients removed - now using patientManagement.fetchPatients from hook

  // resetPatientForm removed - now using patientManagement.resetPatientForm from hook

// Fetch complete patient data
const fetchCompletePatientData = async (patientId: string) => {
  try {
    const data = await apiService.getCompletePatientInfo(patientId);
    patientManagement.setSelectedPatientData(data as unknown as CompletePatientData);
  } catch (error) {
    console.error('Error fetching complete patient data:', error);
  }
};

// Handle patient detail view
const handleViewPatientDetails = (patient: Patient) => {
  patientManagement.setSelectedPatient(patient);
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
const handleNewConsultation = useCallback(() => { consultationManagement.openConsultationDialog(); }, [consultationManagement]);

const handleEditConsultation = useCallback(async (consultation: any) => {
  consultationManagement.setSelectedConsultation(consultation);
  consultationManagement.setIsEditingConsultation(true);
  consultationManagement.setConsultationFormData({
    patient_id: consultation.patient_id || 0,
    date: consultation.date || '',
    chief_complaint: consultation.chief_complaint || '',
    history_present_illness: consultation.history_present_illness || '',
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
  
  // Load patients when opening consultation dialog (only if authenticated)
  if (isAuthenticated) {
    patientManagement.fetchPatients();
  }
  
  // Load clinical studies for this consultation when editing
  if (consultation?.id) {
    await consultationManagement.loadConsultationStudies(consultation.id);
  }
  
  consultationManagement.setConsultationDialogOpen(true);
  setFormErrorMessage('');
  consultationManagement.setConsultationDetailView(false);
}, [patientManagement.fetchPatients, consultationManagement.loadConsultationStudies]);

// Medical Records handlers for new component
const onCreateRecord = useCallback(async (data: ConsultationFormData): Promise<void> => {
  try {
    setIsSubmitting(true);
    await apiService.createConsultation(data.patient_id.toString(), data);
    showSuccessMessage('Expediente médico creado exitosamente');
  } catch (error: any) {
    console.error('Error creating medical record:', error);
    setFormErrorMessage(error.response?.data?.detail || 'Error al crear el expediente médico');
    throw error;
  } finally {
    setIsSubmitting(false);
  }
}, [showSuccessMessage, setFormErrorMessage, setIsSubmitting]);

const onUpdateRecord = useCallback(async (id: string, data: ConsultationFormData): Promise<void> => {
  try {
    setIsSubmitting(true);
    await apiService.updateConsultation(id, data);
    showSuccessMessage('Expediente médico actualizado exitosamente');
  } catch (error: any) {
    console.error('Error updating medical record:', error);
    setFormErrorMessage(error.response?.data?.detail || 'Error al actualizar el expediente médico');
    throw error;
  } finally {
    setIsSubmitting(false);
  }
}, [showSuccessMessage, setFormErrorMessage, setIsSubmitting]);

// Handle view consultation
const handleViewConsultation = useCallback(async (consultation: any) => {
  consultationManagement.setSelectedConsultation(consultation);
  consultationManagement.setConsultationDetailView(true);
  
  // Load clinical studies for this consultation
  if (consultation?.id) {
    await consultationManagement.loadConsultationStudies(consultation.id);
  }
}, [consultationManagement.loadConsultationStudies]);

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
// fetchConsultations removed - now using consultationManagement.fetchConsultations

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
      // No fallback logic - backend is required
      console.error('❌ Error creating appointment:', apiError);
      throw apiError;
    }
    
  } catch (error) {
    console.error('Error creating follow-up appointment:', error);
    throw error; // Re-throw so the calling function can handle it
  }
}, [activeView, selectedDate, patientManagement.patients, doctorProfile]);

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
  try {
  setLogoutDialogOpen(false);
  logout();
  console.log('✅ Sesión cerrada exitosamente');
  } catch (error) {
    console.error('❌ Error during logout:', error);
    // Ensure dialog is closed even if logout fails
    setLogoutDialogOpen(false);
  }
}, [logout]);

const cancelLogout = useCallback(() => {
  setLogoutDialogOpen(false);
}, []);

// Handle consultation form submission using centralized utility (eliminates 184 lines of duplicated code)
const handleConsultationSubmit = useCallback(async () => {
  setIsSubmitting(true);
  setFormErrorMessage('');
  
  try {
    await submitConsultation({
      consultationFormData: consultationManagement.consultationFormData,
      isEditing: consultationManagement.isEditingConsultation,
      selectedConsultation: consultationManagement.selectedConsultation,
      doctorProfile,
      tempConsultationId: consultationManagement.tempConsultationId,
      tempClinicalStudies: consultationManagement.tempClinicalStudies,
      setTempConsultationId: consultationManagement.setTempConsultationId,
      setTempClinicalStudies: consultationManagement.setTempClinicalStudies,
      showSuccessMessage,
      onSuccess: async () => {
        consultationManagement.setConsultationDialogOpen(false);
        await consultationManagement.loadConsultations(); // Refresh consultations list
      }
    });
    
  } catch (error: any) {
    console.error('Error saving consultation:', error);
    
    // No fallback logic - backend is required
    
    // Standard error handling
    if (error.response?.data?.detail) {
      const detail = error.response.data.detail;
      if (typeof detail === 'string') {
        setFormErrorMessage(detail);
      } else {
        setFormErrorMessage('Error al guardar la consulta');
      }
    } else {
      setFormErrorMessage('Error de conexión al guardar la consulta');
    }
  } finally {
    setIsSubmitting(false);
  }
}, [consultationManagement.consultationFormData, consultationManagement.isEditingConsultation, consultationManagement.selectedConsultation, consultationManagement.loadConsultations, doctorProfile, consultationManagement.tempConsultationId, consultationManagement.tempClinicalStudies, patientManagement.patients]);

// Clinical Studies handlers
const handleAddClinicalStudy = useCallback(() => {
  let consultationId: number;
  let patientId: number;
  
  if (consultationManagement.selectedConsultation) {
    // Existing consultation
    consultationId = consultationManagement.selectedConsultation.id;
    patientId = consultationManagement.selectedConsultation.patient_id;
  } else {
    // New consultation - generate temporary ID if not exists
    if (!consultationManagement.tempConsultationId) {
      const newTempId = Date.now(); // Usar timestamp como ID temporal numérico
      consultationManagement.setTempConsultationId(newTempId.toString());
      consultationId = newTempId;
    } else {
      consultationId = parseInt(consultationManagement.tempConsultationId);
    }
    patientId = consultationManagement.consultationFormData.patient_id;
    
    if (!patientId) {
      console.error('❌ No hay paciente seleccionado para agregar estudio');
      return;
    }
  }
  
  console.log('📋 Agregando estudio clínico a:', {
    consultationId,
    patientId,
    isNewConsultation: !consultationManagement.selectedConsultation
  });
  
  setSelectedClinicalStudy(null);
  setIsEditingClinicalStudy(false);
  
  const orderingDoctor = doctorProfile?.full_name || user?.persona?.full_name || 'Dr. Usuario Sistema';
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
}, [consultationManagement.selectedConsultation, consultationManagement.tempConsultationId, consultationManagement.consultationFormData.patient_id, doctorProfile, user]);

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
    status: study.is_active ? 'completed' : 'pending',
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

const handleDeleteClinicalStudy = useCallback((studyId: number) => {
  if (!consultationManagement.selectedConsultation) {
    console.error('❌ No hay consulta seleccionada para eliminar estudio');
    return;
  }
  
  console.log('🗑️ Eliminando estudio clínico:', studyId, 'de consulta:', consultationManagement.selectedConsultation.id);
  const currentStudies = getCurrentConsultationStudies();
  const updatedStudies = currentStudies.filter(study => study.id !== studyId);
  updateCurrentConsultationStudies(updatedStudies);
  

}, [consultationManagement.selectedConsultation, getCurrentConsultationStudies, updateCurrentConsultationStudies]);

const handleClinicalStudySubmit = useCallback(async () => {
  if (!consultationManagement.selectedConsultation && !consultationManagement.tempConsultationId) {
    console.error('❌ No hay consulta seleccionada ni ID temporal');
    setClinicalStudyFormErrorMessage('Error: No hay consulta disponible');
    return;
  }

  setIsClinicalStudySubmitting(true);
  setClinicalStudyFormErrorMessage('');
  
  try {
    const consultationId = consultationManagement.selectedConsultation?.id || consultationManagement.tempConsultationId;
    const patientId = consultationManagement.selectedConsultation?.patient_id || clinicalStudyFormData.patient_id;
    
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
      status: clinicalStudyFormData.status || 'pending',
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
        await apiService.updateClinicalStudy(selectedClinicalStudy.id.toString(), studyData);
        console.log('✅ Estudio clínico actualizado en backend');
      } catch (error) {
        console.error('❌ Error updating clinical study:', error);
        throw error; // No fallback - backend required
      }
    } else {
      // Create new study
      if (consultationManagement.selectedConsultation?.id) {
        // Existing consultation - use backend
        try {
          const newStudy = await apiService.createClinicalStudy(studyData);
          console.log('✅ Estudio clínico creado en backend:', newStudy);
          
          // Reload studies from backend to get updated list
          await consultationManagement.loadConsultationStudies(consultationManagement.selectedConsultation.id);
        } catch (error) {
          console.error('❌ Error creating clinical study:', error);
          throw error; // No fallback - backend required
        }
      } else {
        // New consultation - require backend for all operations
        throw new Error('Cannot create clinical study: Consultation must be saved to backend first');
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
}, [isEditingClinicalStudy, selectedClinicalStudy, clinicalStudyFormData, consultationManagement.selectedConsultation, consultationManagement.tempConsultationId, doctorProfile, getCurrentConsultationStudies, updateCurrentConsultationStudies, consultationManagement.loadConsultationStudies]);

// REMOVED: Duplicate handleAppointmentSubmit function
// Using hook version instead
/* const handleAppointmentSubmit = useCallback(async () => {
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
      console.error('Error message:', error?.message || 'Unknown error');
      console.error('Error details:', error?.detail || error?.response?.data?.detail);
      console.error('Response data:', error.response?.data);
      console.error('Response status:', error.response?.status);
      console.error('Form data that caused error:', appointmentFormData);
      console.groupEnd();
    }
    
    // User-friendly error message
    let errorMessage = 'Error al guardar la cita';
    if (error.response?.data?.detail) {
      const detail = error.response.data.detail;
      if (typeof detail === 'string') {
        errorMessage = detail;
        if (detail.includes('foreign key')) {
          errorMessage = 'Error: Paciente o médico no válido. Por favor, selecciona un paciente válido.';
        }
      } else if (Array.isArray(detail) && detail.some && detail.some(item => 
        typeof item === 'string' && item.includes('foreign key')
      )) {
        errorMessage = 'Error: Paciente o médico no válido. Por favor, selecciona un paciente válido.';
      }
    }
    
    setFormErrorMessage(errorMessage);
  } finally {
    setIsSubmitting(false);
  }
}, [appointmentFormData, isEditingAppointment, selectedAppointment, fetchAppointments, doctorProfile]); */

// Validation function for required fields
const validatePatientForm = () => {
  const errors: {[key: string]: string} = {};
  
  // Mandatory fields according to NOM-004
  // Use safe string checks to avoid errors with undefined/null values
  if (!patientFormData.first_name || !patientFormData.first_name.trim()) {
    errors.first_name = 'Este campo es obligatorio';
  }
  if (!patientFormData.paternal_surname || !patientFormData.paternal_surname.trim()) {
    errors.paternal_surname = 'Este campo es obligatorio';
  }
  if (!patientFormData.maternal_surname || !patientFormData.maternal_surname.trim()) {
    errors.maternal_surname = 'Este campo es obligatorio';
  }
  if (!patientFormData.birth_date) {
    errors.birth_date = 'Este campo es obligatorio';
  }
  if (!patientFormData.gender) {
    errors.gender = 'Este campo es obligatorio';
  }
  if (!patientFormData.primary_phone || !patientFormData.primary_phone.trim()) {
    errors.primary_phone = 'Este campo es obligatorio';
  }
  if (!patientFormData.address_street || !patientFormData.address_street.trim()) {
    errors.address_street = 'Este campo es obligatorio';
  }
  
  return errors;
};

// Clear error for a specific field when user starts typing
const clearFieldError = useCallback((fieldName: string) => {
  setFieldErrors((prev: { [key: string]: string }) => {
    if (prev[fieldName]) {
      const newErrors = { ...prev };
      delete newErrors[fieldName];
      return newErrors;
    }
    return prev; // Return same object if no changes needed
  });
}, [setFieldErrors]);

// Optimized handler for field changes with debouncing
const handleFieldChange = useCallback((fieldName: string, value: string) => {
  // Update form data immediately for UI responsiveness
  setPatientFormData(prev => ({
    ...prev,
    [fieldName]: value
  }));
  
  // Clear error if exists (debounced to avoid excessive re-renders)
  if (fieldErrors[fieldName]) {
    setFieldErrors((prev: { [key: string]: string }) => {
      if (!prev[fieldName]) return prev; // No change needed
      const newErrors = { ...prev };
      delete newErrors[fieldName];
      return newErrors;
    });
  }
}, [fieldErrors, setFieldErrors]);

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
    // ✅ UNIFICADO: Usar directamente los nombres del frontend (ahora coinciden con backend)
    const transformedData = {
      first_name: patientFormData.first_name,
      paternal_surname: patientFormData.paternal_surname,
      maternal_surname: patientFormData.maternal_surname,
      birth_date: patientFormData.birth_date,
      gender: patientFormData.gender,
      curp: patientFormData.curp || null,
      rfc: null,
      civil_status: patientFormData.civil_status || '',
      nationality_id: 1, // Default to Mexico (ID 1)
      birth_place: null,
      birth_state_id: null,
      foreign_birth_place: null,
      email: patientFormData.email || null,
      primary_phone: patientFormData.primary_phone || null,  // ✅ CORREGIDO
      address_street: patientFormData.address_street || null,
      address_ext_number: patientFormData.address_ext_number || null,
      address_int_number: patientFormData.address_int_number || null,
      address_neighborhood: patientFormData.address_neighborhood || null,        // ✅ CORREGIDO
      city_id: patientFormData.city_id,                                // ✅ CORREGIDO
      address_postal_code: patientFormData.address_postal_code || null,                  // ✅ CORREGIDO
      blood_type: patientFormData.blood_type || null,  // ✅ Ya unificado
      allergies: patientFormData.allergies || null,  // ✅ Ya unificado
      chronic_conditions: patientFormData.chronic_conditions || null,
      current_medications: patientFormData.current_medications || null,
      insurance_provider: patientFormData.insurance_provider || null,  // ✅ CORREGIDO
      insurance_number: patientFormData.insurance_number || null,
      emergency_contact_name: patientFormData.emergency_contact_name || null,      // ✅ CORREGIDO
      emergency_contact_phone: patientFormData.emergency_contact_phone || null,  // ✅ CORREGIDO
      emergency_contact_relationship: patientFormData.emergency_contact_relationship || null,  // ✅ CORREGIDO
      title: null
    };
    
    if (patientManagement.isEditingPatient && patientManagement.selectedPatient) {
      // Update existing patient
      console.log('🔄 App: About to update patient', { 
        patientId: patientManagement.selectedPatient.id, 
        transformedData,
        originalFormData: patientFormData 
      });
      
      // ✅ UNIFICADO: Logging con nombres consistentes
      console.log('🔍 App: Checking unified fields:', {
        'address_street (frontend)': patientFormData.address_street,
        'allergies (frontend)': patientFormData.allergies,
        'blood_type (frontend)': patientFormData.blood_type,
        'address_street (backend)': transformedData.address_street,
        'allergies (backend)': transformedData.allergies,
        'blood_type (backend)': transformedData.blood_type
      });
      
      // Additional detailed check
      console.log('🔍 App: Form data types:', {
        'address_street type': typeof patientFormData.address_street,
        'allergies type': typeof patientFormData.allergies,
        'blood_type type': typeof patientFormData.blood_type,
        'address_street empty?': !patientFormData.address_street,
        'allergies empty?': !patientFormData.allergies,
        'blood_type empty?': !patientFormData.blood_type
      });
      
      const updateResult = await apiService.updatePatient(patientManagement.selectedPatient.id, transformedData);
      console.log('✅ App: Patient update result:', updateResult);
      
      // ✅ UNIFICADO: Check unified field names in response
      console.log('🔍 App: Updated patient unified fields:', {
        'address_street (response)': updateResult.address_street,
        'allergies (response)': updateResult.allergies,
        'blood_type (response)': updateResult.blood_type
      });
      
      const patientName = `${patientFormData.first_name} ${patientFormData.paternal_surname} ${patientFormData.maternal_surname}`;
      
      // Refresh patient list to verify changes
      console.log('🔄 App: Refreshing patient list...');
      await patientManagement.fetchPatients();
      console.log('✅ App: Patient list refreshed');
      
      patientManagement.setPatientDialogOpen(false);
      patientManagement.resetPatientForm();
      setFieldErrors({});
      showSuccessMessage(`✅ El paciente ${patientName} fue actualizado exitosamente`);
    } else {
      // Create new patient
      // Sending patient data to API
      await apiService.createPatient(transformedData as any);
      // API response received successfully
        const patientName = `${patientFormData.first_name} ${patientFormData.paternal_surname} ${patientFormData.maternal_surname}`;
        // Success: dialog closed and view changed
        
        // Immediate UI updates
        patientManagement.setPatientDialogOpen(false);
        
        if (consultationManagement.creatingPatientFromConsultation) {
          // If creating patient from consultation, return to consultation dialog
          consultationManagement.setCreatingPatientFromConsultation(false);
          consultationManagement.setConsultationDialogOpen(true);
          
          // Batch state updates to avoid multiple re-renders  
          setTimeout(() => {
            setFormErrorMessage('');
            setFieldErrors({});
            patientManagement.resetPatientForm();
            showSuccessMessage(`✅ El paciente ${patientName} fue agregado con éxito. Ahora puedes seleccionarlo en la consulta.`);
            patientManagement.fetchPatients(); // This will make the new patient available in the consultation dialog
          }, 10);
        } else {
          // Normal patient creation flow
          setActiveView('patients');
          
          // Batch state updates to avoid multiple re-renders
          setTimeout(() => {
            setFormErrorMessage('');
            setFieldErrors({});
            patientManagement.resetPatientForm();
            showSuccessMessage(`✅ El paciente ${patientName} fue agregado con éxito`);
            patientManagement.fetchPatients();
          }, 10);
        }

    }
  } catch (error: any) {
    console.error('Error saving patient:', error);
    console.error('Error response status:', error.response?.is_active);
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
        errorMessage = `Error ${error.response.is_active}: ${JSON.stringify(error.response.data)}`;
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
    first_name: patient.first_name || '',
    paternal_surname: patient.paternal_surname || '',
    maternal_surname: patient.maternal_surname || '',
    birth_date: patient.birth_date || '',
    gender: patient.gender || '',
    // ===== IDENTIFICACIÓN =====
    curp: patient.curp || '',
    rfc: patient.rfc || '',
    civil_status: patient.civil_status || '',
    nationality_id: patient.nationality_id || 1,
    birth_place: patient.birth_place || '',
    
    // ===== LUGAR DE NACIMIENTO (NOM-024) =====
    birth_state_id: patient.birth_state_id || null,
    foreign_birth_place: patient.foreign_birth_place || '',
    
    // ===== CONTACTOS =====
    email: patient.email || '',
    primary_phone: patient.primary_phone || '',  // ✅ CORREGIDO
    
    // ===== DIRECCIÓN PERSONAL =====
    address_street: patient.address_street || '',
    address_ext_number: patient.address_ext_number || '',
    address_int_number: patient.address_int_number || '',
    address_neighborhood: patient.address_neighborhood || '',
    city_id: patient.city_id || null,
    address_postal_code: patient.address_postal_code || '',
    
    // ===== DATOS MÉDICOS =====
    blood_type: patient.blood_type || '',
    allergies: patient.allergies || '',
    chronic_conditions: patient.chronic_conditions || '',
    current_medications: patient.current_medications || '',
    
    // ===== SEGURO MÉDICO =====
    insurance_provider: patient.insurance_provider || '',  // ✅ CORREGIDO
    insurance_number: patient.insurance_number || '',
    
    // ===== CONTACTO DE EMERGENCIA =====
    emergency_contact_name: patient.emergency_contact_name || '',      // ✅ CORREGIDO
    emergency_contact_phone: patient.emergency_contact_phone || '',  // ✅ CORREGIDO
    emergency_contact_relationship: patient.emergency_contact_relationship || '',  // ✅ CORREGIDO
    
    // Estado del paciente
    is_active: patient.is_active || true
  });
  
  patientManagement.setSelectedPatient(patient);
  patientManagement.setIsEditingPatient(true);
  patientManagement.setPatientDialogOpen(true);
};

// Handle new patient
const handleNewPatient = useCallback(() => {
  patientManagement.resetPatientForm();
  patientManagement.setIsEditingPatient(false);
  setFormErrorMessage('');
  patientManagement.setPatientDialogOpen(true);
}, []);

// Handle deactivate patient (soft delete)
const handleDeletePatient = useCallback(async () => {
  if (!patientManagement.selectedPatient) return;
  
  const patientName = `${patientManagement.selectedPatient.first_name} ${patientManagement.selectedPatient.paternal_surname} ${patientManagement.selectedPatient.maternal_surname}`;
  
  // Confirmation dialog
  const confirmDeactivate = window.confirm(
    `⚠️ ¿Estás seguro de que deseas desactivar al paciente ${patientName}?\n\n` +
    `Al desactivar un paciente:\n` +
    `• El paciente pasará a estado INACTIVO\n` +
    `• No aparecerá en las listas de pacientes activos\n` +
    `• No se podrán crear nuevas consultas o citas\n` +
    `• El historial médico se conserva\n` +
    `• La acción se puede revertir reactivando el paciente\n\n` +
    `¿Deseas continuar?`
  );
  
  if (!confirmDeactivate) return;
  
  try {
    setIsSubmitting(true);
    await apiService.deletePatient(patientManagement.selectedPatient.id);
    
    patientManagement.setPatientDialogOpen(false);
    patientManagement.resetPatientForm();
    setFieldErrors({});
    setActiveView('patients');
    patientManagement.fetchPatients();
    showSuccessMessage(`🔒 El paciente ${patientName} fue desactivado exitosamente`);
  } catch (error: any) {
    console.error('Error deactivating patient:', error);
    const errorMessage = error.response?.data?.detail || 'Error al desactivar el paciente. Por favor, intenta nuevamente.';
    alert(`❌ Error: ${errorMessage}`);
  } finally {
    setIsSubmitting(false);
  }
}, [patientManagement.selectedPatient, patientManagement.fetchPatients]);

// formatDateTime moved to utils/formatters.ts to avoid duplication

  // Load dashboard data
  useEffect(() => {
    if (!user || !isAuthenticated) {
      console.log('🔒 AppContent - User not authenticated, skipping dashboard data load');
      return;
    }
    
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
  }, [user, isAuthenticated]);

  // Fetch patients when view changes to patients
  useEffect(() => {
    if (!user || !isAuthenticated) {
      console.log('🔒 AppContent - User not authenticated, skipping patients fetch');
      return;
    }
    
    if (activeView === 'patients' && isAuthenticated) {
      patientManagement.fetchPatients();
    }
  }, [activeView, user, isAuthenticated]); // Remove fetchPatients dependency to avoid loops

  // Search patients with debounce
  useEffect(() => {
    if (!user || !isAuthenticated) {
      return;
    }
    
    if (activeView === 'patients' && patientManagement.patientSearchTerm !== undefined && isAuthenticated) {
      const timeoutId = setTimeout(() => {
        patientManagement.fetchPatients();
      }, 500); // Increased debounce to 500ms to reduce API calls
      
      return () => clearTimeout(timeoutId);
    }
  }, [patientManagement.patientSearchTerm, activeView, user, isAuthenticated]); // Remove fetchPatients dependency

  // Fetch consultations when view changes to consultations
  useEffect(() => {
    if (!user || !isAuthenticated) {
      console.log('🔒 AppContent - User not authenticated, skipping consultations fetch');
      return;
    }
    
    if (activeView === 'consultations') {
      consultationManagement.fetchConsultations();
    }
  }, [activeView, consultationManagement.fetchConsultations, user, isAuthenticated]);

  // Debounced consultation search
  useEffect(() => {
    if (!user || !isAuthenticated) {
      return;
    }
    
    if (activeView === 'consultations' && consultationManagement.consultationSearchTerm !== undefined) {
      const timeoutId = setTimeout(() => {
        consultationManagement.loadConsultations();
      }, 500); // 500ms debounce
      
      return () => clearTimeout(timeoutId);
    }
  }, [consultationManagement.consultationSearchTerm, activeView, user, isAuthenticated]);

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
                    {doctorProfile?.full_name || 
                     (user?.persona?.first_name && user?.persona?.paternal_surname
                      ? `${user?.persona?.first_name} ${user?.persona?.paternal_surname}` 
                      : (user?.persona?.full_name || dashboardData?.physician || 'Dr. García'))
                    }
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                    {doctorProfile?.specialty || user?.persona?.specialty || 'Médico General'}
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
                    {doctorProfile?.first_name && doctorProfile.first_name.length > 0 && 
                     doctorProfile?.paternal_surname && doctorProfile.paternal_surname.length > 0 ? 
                      `${doctorProfile.first_name[0]}${doctorProfile.paternal_surname[0]}` :
                      (user?.persona?.first_name && user.persona.first_name.length > 0 && 
                       user?.persona?.paternal_surname && user.persona.paternal_surname.length > 0 ? 
                        `${user.persona.first_name[0]}${user.persona.paternal_surname[0]}` :
                        <ProfileIcon sx={{ color: 'white' }} />
                      )
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
                {user?.persona?.first_name && user.persona.first_name.length > 0 && 
                 user?.persona?.paternal_surname && user.persona.paternal_surname.length > 0 ? 
                  `${user.persona.first_name[0]}${user.persona.paternal_surname[0]}` :
                  (doctorProfile?.first_name && doctorProfile.first_name.length > 0 && 
                   doctorProfile?.paternal_surname && doctorProfile.paternal_surname.length > 0 ? 
                    `${doctorProfile.first_name[0]}${doctorProfile.paternal_surname[0]}` :
                    'A'
                  )
                }
              </Avatar>
              <Box sx={{ flex: 1 }}>
                                <Typography variant="subtitle2" sx={{ fontWeight: 600, lineHeight: 1.2 }}>
                  {user?.persona?.full_name || 
                   (user?.persona?.first_name && user?.persona?.paternal_surname
                ? `${user?.persona?.first_name} ${user?.persona?.paternal_surname}` 
                : (dashboardData?.physician || 'Dr. García')
                   )
              }
            </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.2 }}>
                  {doctorProfile?.specialty || user?.persona?.specialty || 'Médico General'}
            </Typography>
                {(doctorProfile?.professional_license || user?.persona?.professional_license) && (
                  <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.2 }}>
                    Cédula: {doctorProfile?.professional_license || user?.persona?.professional_license}
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
          
          <MenuItem onClick={() => { handleUserMenuClose(); setActiveView('profile'); }}>
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
                    selected={activeView === 'medical-records'}
                    onClick={() => setActiveView('medical-records')}
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
                        <AssignmentIcon />
                    </ListItemIcon>
                      <ListItemText 
                        primary="Expedientes Médicos" 
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
                    patients={patientManagement.patients}
                    consultations={consultationManagement.consultations}
                    successMessage={successMessage}
                    setSuccessMessage={showSuccessMessage}
                    handleNewPatient={handleNewPatient}
                    handleEditPatient={handleEditPatient}
                    patientSearchTerm={patientManagement.patientSearchTerm}
                    setPatientSearchTerm={patientManagement.setPatientSearchTerm}
                  />
                </Suspense>
              )}

              {activeView === 'consultations' && !consultationManagement.consultationDetailView && (
                <Suspense fallback={<LoadingFallback message="Cargando consultas..." />}>
                  <ConsultationsViewSmart
                    consultations={consultationManagement.consultations as any}
                    handleNewConsultation={consultationManagement.handleNewConsultation}
                    handleEditConsultation={consultationManagement.handleEditConsultation}
                    consultationSearchTerm={consultationManagement.consultationSearchTerm}
                    setConsultationSearchTerm={consultationManagement.setConsultationSearchTerm}
                  />
                </Suspense>
              )}

              {activeView === 'consultations' && consultationManagement.consultationDetailView && consultationManagement.selectedConsultation && (
                <Suspense fallback={<LoadingFallback message="Cargando detalles..." />}>
                  <ConsultationDetailView
                    consultation={consultationManagement.selectedConsultation as any}
                    onBack={consultationManagement.handleBackFromConsultationDetail}
                    onEdit={consultationManagement.handleEditConsultation}
                    onPrint={handlePrintConsultation}
                    clinicalStudies={getCurrentConsultationStudies()}
                    onEditClinicalStudy={handleEditClinicalStudy}
                  />
                </Suspense>
              )}

              {activeView === 'medical-records' && (
                <Suspense fallback={<LoadingFallback message="Cargando expedientes médicos..." />}>
                  <MedicalRecordsView
                    patients={patientManagement.patients}
                    onCreateRecord={onCreateRecord}
                    onUpdateRecord={onUpdateRecord}
                    isLoading={false}
                    onRefresh={() => {}}
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

              {/* Demo section removed - SmartTableDemo component was deleted */}

              {/* Keep the rest of the original dashboard content as fallback */}
              {false && activeView === 'dashboard' && (
                <Box>
                  {/* Welcome Header */}
                  <Box sx={{ mb: 4 }}>
                    <Typography variant="h4" sx={{ mb: 1, fontWeight: 600 }}>
                      Buenos días, {user?.persona?.first_name ? `Dr. ${user?.persona?.first_name}` : (dashboardData?.physician || 'Dr. García')}
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
            open={patientManagement.patientDialogOpen}
            onClose={() => {
              patientManagement.setPatientDialogOpen(false);
              setFormErrorMessage('');
              setFieldErrors({});
            }}
            isEditing={patientManagement.isEditingPatient}
            formData={patientFormData}
            onFormDataChange={handleFieldChange}
            onSubmit={handlePatientSubmit}
            fieldErrors={fieldErrors}
            formErrorMessage={formErrorMessage}
            setFormErrorMessage={setFormErrorMessage}
            isSubmitting={isSubmitting}
            onDelete={patientManagement.isEditingPatient ? handleDeletePatient : undefined}
          />
        </Suspense>

        {/* Consultation Dialog */}
        <Suspense fallback={<LoadingFallback message="Cargando formulario de consulta..." />}>
          <ConsultationDialog
            open={consultationManagement.consultationDialogOpen}
            onClose={() => {
              consultationManagement.setConsultationDialogOpen(false);
              setFormErrorMessage('');
              setFieldErrors({});
            }}
            isEditing={consultationManagement.isEditingConsultation}
            formData={consultationManagement.consultationFormData}
            setFormData={consultationManagement.setConsultationFormData}
            onSubmit={handleConsultationSubmit}
            patients={patientManagement.patients}
            formErrorMessage={formErrorMessage}
            setFormErrorMessage={setFormErrorMessage}
            isSubmitting={isSubmitting}
            fieldErrors={fieldErrors}
            onCreateNewPatient={() => {
              consultationManagement.setConsultationDialogOpen(false);
              patientManagement.setIsEditingPatient(false);
              consultationManagement.setCreatingPatientFromConsultation(true);
              patientManagement.setPatientDialogOpen(true);
            }}
            clinicalStudies={getCurrentConsultationStudies()}
            onAddClinicalStudy={handleAddClinicalStudy}
            onEditClinicalStudy={handleEditClinicalStudy}
            onDeleteClinicalStudy={(studyId: string | number) => handleDeleteClinicalStudy(typeof studyId === 'string' ? parseInt(studyId) : studyId)}
            selectedConsultation={consultationManagement.selectedConsultation}
            tempConsultationId={consultationManagement.tempConsultationId}
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
              patientManagement.setIsEditingPatient(false);
              consultationManagement.setCreatingPatientFromConsultation(true);
              patientManagement.setPatientDialogOpen(true);
            }}
            formData={appointmentFormData}
            patients={patientManagement.patients}
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
          userName={user?.persona?.full_name || 'Usuario'}
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
