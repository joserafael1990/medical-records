import React, { useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Alert,
  CircularProgress,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { es } from 'date-fns/locale';
import { AppointmentFormData, Patient } from '../../types';
import { useScrollToErrorInDialog } from '../../hooks/useScrollToError';
import { useAppointmentMultiOfficeForm } from '../../hooks/useAppointmentMultiOfficeForm';
import { preventBackdropClose } from '../../utils/dialogHelpers';
import { RemindersConfig } from '../common/RemindersConfig';
import { PatientSelector } from '../appointments/PatientSelector';
import { NewPatientForm } from '../appointments/NewPatientForm';
import { AppointmentFormFields } from '../appointments/AppointmentFormFields';
import { useAppointmentReminders } from '../../hooks/useAppointmentReminders';

interface AppointmentDialogMultiOfficeProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (appointment: AppointmentFormData) => void;
  onNewPatient?: () => void;
  onEditPatient?: (patient: Patient) => void;
  formData?: AppointmentFormData;
  patients?: Patient[];
  isEditing?: boolean;
  loading?: boolean;
  formErrorMessage?: string | null;
  fieldErrors?: Record<string, string>;
  onFormDataChange?: (data: AppointmentFormData) => void;
  doctorProfile?: any;
}

const AppointmentDialogMultiOffice: React.FC<AppointmentDialogMultiOfficeProps> = ({
  open,
  onClose,
  onSubmit,
  onNewPatient,
  onEditPatient,
  formData: externalFormData,
  patients: externalPatients,
  isEditing = false,
  loading: externalLoading = false,
  formErrorMessage,
  fieldErrors,
  onFormDataChange,
  doctorProfile
}) => {
  // Use extracted hook for reminders logic
  const {
    reminders,
    onSubmitWithReminders,
    handleRemindersChange
  } = useAppointmentReminders({
    open,
    isEditing,
    externalFormData,
    onSubmit,
    onFormDataChange
  });

  const formHook = useAppointmentMultiOfficeForm({
    open,
    formData: externalFormData,
    patients: externalPatients,
    isEditing,
    doctorProfile,
    onFormDataChange,
    onSubmit: onSubmitWithReminders, // Use the wrapper that includes reminders
    onClose,
    formErrorMessage,
    fieldErrors
  });

  const {
    formData,
    setFormData,
    loading,
    error,
    isExistingPatient,
    setIsExistingPatient,
    newPatientData,
    setNewPatientData,
    offices,
    availableTimes,
    setAvailableTimes,
    loadingTimes,
    selectedDate,
    selectedTime,
    handleChange,
    handleDateChange,
    handleTimeChange,
    handleSubmit,
    currentFormData,
    currentPatients,
    currentLoading,
    currentError
  } = formHook;

  // Hook para scroll automático a errores
  const { errorRef } = useScrollToErrorInDialog(currentError);

  // Track appointment form opened
  useEffect(() => {
    if (open) {
      try {
        const { trackAmplitudeEvent } = require('../../utils/amplitudeHelper');
        trackAmplitudeEvent('appointment_form_opened', {
          is_editing: isEditing
        });
      } catch (error) {
        // Silently fail
      }
    }
  }, [open, isEditing]);

  const handleDateChangeWrapper = (date: Date | null) => {
    // Force reload by always calling handleDateChange, even if date appears unchanged
    if (!date) {
      // Clear available times when date is cleared
      setAvailableTimes([]);
      setFormData({
        ...currentFormData,
        appointment_date: ''
      });
      if (onFormDataChange) {
        onFormDataChange({
          ...currentFormData,
          appointment_date: ''
        });
      }
      handleDateChange('');
      return;
    }

    // Always create a date string with just the date part (no time)
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateOnlyString = `${year}-${month}-${day}`;

    // Create ISO string for form data (with time set to start of day in local timezone)
    const dateWithTime = new Date(date);
    dateWithTime.setHours(0, 0, 0, 0);
    const dateString = dateWithTime.toISOString();

    const newFormData = {
      ...currentFormData,
      appointment_date: dateString
    };
    setFormData(newFormData);
    if (onFormDataChange) {
      onFormDataChange(newFormData);
    }

    // Always call handleDateChange with date-only string to ensure times are loaded
    handleDateChange(dateOnlyString);
  };

  return (
    <Dialog
      open={open}
      onClose={preventBackdropClose(onClose)}
      maxWidth="sm"
      fullWidth
      fullScreen={window.innerWidth < 600}
      sx={{
        '& .MuiDialog-paper': {
          margin: { xs: 0, sm: 2 },
          maxHeight: { xs: '100vh', sm: '90vh' },
          height: { xs: '100vh', sm: 'auto' },
          borderRadius: { xs: 0, sm: 2 }
        }
      }}
    >
      <DialogTitle>
        {isEditing ? 'Editar Cita' : 'Nueva Cita'}
      </DialogTitle>

      <DialogContent
        sx={{
          px: { xs: 2, sm: 3 },
          py: { xs: 2, sm: 3 },
          overflow: 'auto',
          flex: 1,
          minHeight: { xs: '60vh', sm: 'auto' },
          '&::-webkit-scrollbar': { width: '6px' },
          '&::-webkit-scrollbar-track': { background: '#f1f1f1', borderRadius: '3px' },
          '&::-webkit-scrollbar-thumb': { background: '#c1c1c1', borderRadius: '3px' },
          '&::-webkit-scrollbar-thumb:hover': { background: '#a8a8a8' },
        }}
      >
        {currentError && (
          <Alert severity="error" sx={{ mb: 2 }} ref={errorRef}>
            {currentError}
          </Alert>
        )}

        <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={es}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>

            {/* 1-3. APPOINTMENT FIELDS (Type, Office, Date, Time) */}
            <AppointmentFormFields
              formData={currentFormData}
              offices={offices}
              availableTimes={availableTimes}
              loadingTimes={loadingTimes}
              selectedDate={selectedDate}
              selectedTime={selectedTime}
              onFieldChange={handleChange}
              onDateChange={handleDateChangeWrapper}
              onTimeChange={handleTimeChange}
              disabled={currentLoading}
            />

            {/* 4. PATIENT SELECTION LOGIC */}
            
            {/* For "Primera vez" - Show patient type selector when not yet selected */}
            {!isEditing && currentFormData.consultation_type === 'Primera vez' && isExistingPatient === null && (
              <FormControl fullWidth sx={{ mt: 2 }}>
                <InputLabel>¿Es un paciente nuevo o existente?</InputLabel>
                <Select
                  value=""
                  onChange={(e) => setIsExistingPatient(e.target.value === 'existing')}
                  label="¿Es un paciente nuevo o existente?"
                >
                  <MenuItem value="new">Paciente nuevo (primera consulta)</MenuItem>
                  <MenuItem value="existing">Paciente existente (reagendar primera vez)</MenuItem>
                </Select>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                  Seleccione "Paciente existente" si el paciente tuvo una cita de primera vez cancelada y necesita reagendarla.
                </Typography>
              </FormControl>
            )}

            {/* For "Primera vez" with new patient selected */}
            {!isEditing && currentFormData.consultation_type === 'Primera vez' && isExistingPatient === false && (
              <>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2, mb: 1 }}>
                  <Typography variant="h6">
                    Datos del Nuevo Paciente
                  </Typography>
                  <Button 
                    size="small" 
                    onClick={() => setIsExistingPatient(null)}
                    sx={{ textTransform: 'none' }}
                  >
                    Cambiar selección
                  </Button>
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Complete los datos básicos del nuevo paciente:
                </Typography>
              </>
            )}

            {/* For "Primera vez" with existing patient selected */}
            {!isEditing && currentFormData.consultation_type === 'Primera vez' && isExistingPatient === true && (
              <>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2, mb: 1 }}>
                  <Typography variant="h6">
                    Seleccionar Paciente Existente
                  </Typography>
                  <Button 
                    size="small" 
                    onClick={() => setIsExistingPatient(null)}
                    sx={{ textTransform: 'none' }}
                  >
                    Cambiar selección
                  </Button>
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Seleccione el paciente que necesita reagendar su cita de primera vez. Solo se muestran pacientes que no tienen consultas previas con este doctor.
                </Typography>
              </>
            )}

            {!isEditing && currentFormData.consultation_type === 'Seguimiento' && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2, mb: 2 }}>
                Para citas de seguimiento, debe seleccionar un paciente existente
              </Typography>
            )}

            {/* Existing Patient Selector - Show when editing, or when existing patient is selected, or for Seguimiento */}
            {(isEditing || isExistingPatient === true || currentFormData.consultation_type === 'Seguimiento') && (
              <PatientSelector
                patients={currentPatients}
                selectedPatientId={currentFormData.patient_id}
                onPatientSelect={(id) => handleChange('patient_id')({ target: { value: id } })}
                error={currentError}
                disabled={currentLoading || isEditing} // Disable when editing to prevent changing patient
              />
            )}

            {/* New Patient Form */}
            {isExistingPatient === false && (
              <NewPatientForm
                data={newPatientData}
                onChange={(updatedData) => setNewPatientData(prev => ({ ...prev, ...updatedData }))}
                disabled={currentLoading}
              />
            )}

            {/* 5. REMINDERS CONFIG */}
            {selectedDate && selectedTime && (
              <Box sx={{ mt: 2 }}>
                <RemindersConfig
                  reminders={reminders}
                  onChange={(newReminders) => handleRemindersChange(newReminders, currentFormData, setFormData)}
                  appointmentDate={currentFormData.appointment_date || (selectedDate && selectedTime ? `${selectedDate.split('T')[0]}T${selectedTime}:00` : undefined)}
                  disabled={currentLoading}
                />
              </Box>
            )}
          </Box>
        </LocalizationProvider>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={currentLoading}>
          Cerrar
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={currentLoading}
        >
          {currentLoading ? (
            <CircularProgress size={20} />
          ) : (
            isEditing ? 'Actualizar' : 'Crear'
          )}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AppointmentDialogMultiOffice;
