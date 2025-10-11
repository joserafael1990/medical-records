import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Typography,
  IconButton,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Alert,
  FormHelperText,
  Autocomplete,
  Avatar,
  Paper
} from '@mui/material';
import {
  Close as CloseIcon,
  Person as PersonIcon,
  PersonAdd as PersonAddIcon,
  CalendarToday as CalendarIcon,
  LocalHospital as HospitalIcon,
  MedicalServices as MedicalServicesIcon,
  Notes as NotesIcon,
  Edit as EditIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  Badge as BadgeIcon
} from '@mui/icons-material';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { es } from 'date-fns/locale';
import { Patient } from '../../types';
import { MEDICAL_VALIDATION_RULES, validateForm } from '../../utils/validation';
import { apiService } from '../../services/api';
// import { useSnackbar } from '../../contexts/SnackbarContext';

// Define ConsultationFormData interface based on the hook
interface ConsultationFormData {
  patient_id: string;
  date: string;
  chief_complaint: string;
  history_present_illness: string;
  family_history: string;
  personal_pathological_history: string;
  personal_non_pathological_history: string;
  physical_examination: string;
  primary_diagnosis: string;
  secondary_diagnoses: string;
  treatment_plan: string;
  therapeutic_plan: string;
  follow_up_instructions: string;
  prognosis: string;
  laboratory_results: string;
  imaging_studies: string;
  interconsultations: string;
  doctor_name: string;
  doctor_professional_license: string;
  doctor_specialty: string;
}

interface ConsultationDialogProps {
  open: boolean;
  onClose: () => void;
  consultation?: any | null;
  onSubmit: (data: ConsultationFormData) => Promise<void>;
  patients: Patient[];
  doctorProfile?: any;
}

// Utility function to calculate age from birth date
const calculateAge = (birthDate: string): number => {
  try {
    const birth = new Date(birthDate);
    const today = new Date();
    
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
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
  const fullName = [
    patient.first_name,
    patient.paternal_surname,
    patient.maternal_surname && patient.maternal_surname !== 'null' ? patient.maternal_surname : ''
  ].filter(part => part && part.trim()).join(' ');
  return `${fullName} (${age} años)`;
};

const ConsultationDialog: React.FC<ConsultationDialogProps> = ({
  open,
  onClose,
  consultation,
  onSubmit,
  patients,
  doctorProfile
}) => {
  const isEditing = !!consultation;
  // Temporary fallback functions until SnackbarContext is implemented
  const showSuccessMessage = (message: string) => {
    // TODO: Replace with actual snackbar when implemented
    alert(message); // Temporary user feedback
  };
  const showErrorMessage = (message: string) => {
    // TODO: Replace with actual snackbar when implemented
    alert(message); // Temporary user feedback
  };

  const initialFormData: ConsultationFormData = {
    patient_id: '',
    date: new Date().toISOString().split('T')[0],
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
    doctor_name: doctorProfile?.first_name && doctorProfile?.last_name 
      ? `Dr. ${doctorProfile.first_name} ${doctorProfile.last_name}`.trim()
      : '',
    doctor_professional_license: doctorProfile?.professional_license || '',
    doctor_specialty: doctorProfile?.specialty || ''
  };

  const [formData, setFormData] = useState<ConsultationFormData>(initialFormData);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setError(null);
      setErrors({});
      if (consultation) {
        // Map consultation data to form data
        setFormData({
          ...initialFormData,
          patient_id: consultation.patient_id || '',
          date: consultation.date ? consultation.date.split('T')[0] : new Date().toISOString().split('T')[0],
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
          doctor_name: consultation.doctor_name || initialFormData.doctor_name,
          doctor_professional_license: consultation.doctor_professional_license || initialFormData.doctor_professional_license,
          doctor_specialty: consultation.doctor_specialty || initialFormData.doctor_specialty
        });

        // Find and set selected patient
        if (consultation.patient_id && patients.length > 0) {
          const patient = patients.find(p => p.id === consultation.patient_id);
          setSelectedPatient(patient || null);
        }
      } else {
        setFormData(initialFormData);
        setSelectedPatient(null);
      }
    }
  }, [open, consultation, patients, doctorProfile]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | { name?: string; value: unknown }>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name as string]: value }));
    if (errors[name as string]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name as string];
        return newErrors;
      });
    }
  };

  const handleDateChange = (newValue: Date | null) => {
    const dateString = newValue ? newValue.toISOString().split('T')[0] : '';
    setFormData(prev => ({ ...prev, date: dateString }));
    if (errors.date) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.date;
        return newErrors;
      });
    }
  };

  const handlePatientChange = (patient: Patient | null) => {
    setSelectedPatient(patient);
    setFormData(prev => ({ ...prev, patient_id: patient?.id || '' }));
    if (errors.patient_id) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.patient_id;
        return newErrors;
      });
    }
  };

  const handleSubmit = async () => {
    setError(null);
    
    // Basic validation
    if (!selectedPatient) {
      setError('Por favor, selecciona un paciente');
      return;
    }

    if (!formData.chief_complaint.trim()) {
      setError('El motivo de consulta es requerido');
      return;
    }

    setLoading(true);
    try {
      await onSubmit(formData);
      showSuccessMessage(`Consulta ${isEditing ? 'actualizada' : 'creada'} exitosamente`);
    } catch (err: any) {
      console.error('Error saving consultation:', err);
      setError(err.message || 'Error al guardar consulta');
      showErrorMessage(err.message || 'Error al guardar consulta');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="lg" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <HospitalIcon color="primary" />
          <Typography variant="h6">
            {isEditing ? 'Editar Consulta' : 'Nueva Consulta'}
          </Typography>
        </Box>
        <IconButton onClick={handleClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <Divider />

      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        
        <Box component="form" sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* Patient Selection */}
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
              <PersonIcon sx={{ fontSize: 20 }} />
              Paciente
              <Typography component="span" sx={{ color: 'error.main', ml: 0.5 }}>*</Typography>
            </Typography>
            <Autocomplete
              options={patients}
              getOptionLabel={(option) => formatPatientNameWithAge(option)}
              value={selectedPatient}
              onChange={(_, newValue) => handlePatientChange(newValue)}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Seleccionar Paciente"
                  required
                  error={!!error && !selectedPatient}
                  helperText={error && !selectedPatient ? 'Campo requerido' : ''}
                />
              )}
              renderOption={(props, option) => (
                <Box component="li" {...props}>
                  <Avatar sx={{ mr: 2, bgcolor: 'primary.main' }}>
                    {option.first_name[0]}{option.paternal_surname[0]}
                  </Avatar>
                  <Box>
                    <Typography variant="body1">{formatPatientNameWithAge(option)}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {option.primary_phone} • {option.email}
                    </Typography>
                  </Box>
                </Box>
              )}
              loading={patients.length === 0}
              loadingText="Cargando pacientes..."
              noOptionsText="No se encontraron pacientes"
            />
          </Box>

          {/* Date */}
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
              <CalendarIcon sx={{ fontSize: 20 }} />
              Fecha de Consulta
            </Typography>
            <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={es}>
              <DatePicker
                label="Fecha"
                value={formData.date ? new Date(formData.date) : null}
                maxDate={new Date()}
                onChange={handleDateChange}
                slotProps={{
                  textField: {
                    size: 'small',
                    fullWidth: true
                  }
                }}
              />
            </LocalizationProvider>
          </Box>

          {/* Chief Complaint */}
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
              <NotesIcon sx={{ fontSize: 20 }} />
              Motivo de Consulta
              <Typography component="span" sx={{ color: 'error.main', ml: 0.5 }}>*</Typography>
            </Typography>
            <TextField
              name="chief_complaint"
              label="Motivo de consulta"
              value={formData.chief_complaint}
              onChange={handleChange}
              size="small"
              fullWidth
              multiline
              rows={2}
              required
              error={!!error && !formData.chief_complaint.trim()}
              helperText={error && !formData.chief_complaint.trim() ? 'Campo requerido' : ''}
            />
          </Box>

          {/* History of Present Illness */}
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
              <MedicalServicesIcon sx={{ fontSize: 20 }} />
              Historia de la Enfermedad Actual
            </Typography>
            <TextField
              name="history_present_illness"
              label="Historia de la enfermedad actual"
              value={formData.history_present_illness}
              onChange={handleChange}
              size="small"
              fullWidth
              multiline
              rows={3}
            />
          </Box>

          {/* Physical Examination */}
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
              <HospitalIcon sx={{ fontSize: 20 }} />
              Exploración Física
            </Typography>
            <TextField
              name="physical_examination"
              label="Exploración física"
              value={formData.physical_examination}
              onChange={handleChange}
              size="small"
              fullWidth
              multiline
              rows={3}
            />
          </Box>

          {/* Primary Diagnosis */}
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
              <MedicalServicesIcon sx={{ fontSize: 20 }} />
              Diagnóstico Principal
            </Typography>
            <TextField
              name="primary_diagnosis"
              label="Diagnóstico principal"
              value={formData.primary_diagnosis}
              onChange={handleChange}
              size="small"
              fullWidth
              multiline
              rows={2}
            />
          </Box>

          {/* Treatment Plan */}
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
              <NotesIcon sx={{ fontSize: 20 }} />
              Plan de Tratamiento
            </Typography>
            <TextField
              name="treatment_plan"
              label="Plan de tratamiento"
              value={formData.treatment_plan}
              onChange={handleChange}
              size="small"
              fullWidth
              multiline
              rows={3}
            />
          </Box>

          {/* Follow-up Instructions */}
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
              <CalendarIcon sx={{ fontSize: 20 }} />
              Instrucciones de Seguimiento
            </Typography>
            <TextField
              name="follow_up_instructions"
              label="Instrucciones de seguimiento"
              value={formData.follow_up_instructions}
              onChange={handleChange}
              size="small"
              fullWidth
              multiline
              rows={2}
            />
          </Box>
        </Box>
      </DialogContent>

      <Divider />

      <DialogActions sx={{ p: 2 }}>
        <Button onClick={handleClose} color="inherit" disabled={loading}>
          Cancelar
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={loading || !selectedPatient || !formData.chief_complaint.trim()}
        >
          {loading ? 'Guardando...' : (isEditing ? 'Actualizar Consulta' : 'Crear Consulta')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ConsultationDialog;
