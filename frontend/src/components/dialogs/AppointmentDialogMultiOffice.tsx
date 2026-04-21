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
  MenuItem,
  Divider,
  DialogContentText
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
import { useProfileCompletion } from '../../hooks/useProfileCompletion';
import { useUnsavedChangesGuard } from '../../hooks/useUnsavedChangesGuard';
import { DoctorIntakePanel } from '../intake/DoctorIntakePanel';

interface AppointmentDialogMultiOfficeProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (appointment: AppointmentFormData) => void;
  onNewPatient?: () => void;
  onEditPatient?: (patient: Patient) => void;
  formData?: AppointmentFormData;
  patients?: Patient[];
  isEditing?: boolean;
  /**
   * ID of the appointment being edited. Required to render the
   * pre-consultation intake panel (which talks to the backend by id).
   * Ignored when creating a new appointment.
   */
  appointmentId?: number | null;
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
  appointmentId = null,
  loading: externalLoading = false,
  formErrorMessage,
  fieldErrors,
  onFormDataChange,
  doctorProfile
}) => {
  // Profile-completion gate: block appointment creation when the doctor hasn't
  // configured at least one office and a weekly schedule. The banner on the
  // dashboard nudges them to complete; this is the defensive check at the
  // point of action.
  const { missing } = useProfileCompletion(doctorProfile);
  const appointmentBlockers = missing.filter(
    m => m.id === 'office' || m.id === 'schedule' || m.id === 'specialty' || m.id === 'cedula'
  );
  const isBlocked = !isEditing && appointmentBlockers.length > 0;

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

  // Guard: warn before closing if the user has made meaningful selections
  const isDirtyAppointment = !isEditing && !!(
    currentFormData?.appointment_date || currentFormData?.patient_id || newPatientData?.name
  );
  const { confirmDialogOpen: apptConfirmOpen, requestClose: requestApptClose, confirmClose: confirmApptClose, cancelClose: cancelApptClose } = useUnsavedChangesGuard({
    isDirty: isDirtyAppointment,
    onConfirmedClose: onClose
  });

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
    <>
    <Dialog
      open={open}
      onClose={preventBackdropClose(requestApptClose)}
      maxWidth="sm"
      fullWidth
      fullScreen={window.innerWidth < 600}
      aria-labelledby="appointment-dialog-title"
      sx={{
        '& .MuiDialog-paper': {
          margin: { xs: 0, sm: 2 },
          maxHeight: { xs: '100vh', sm: '90vh' },
          height: { xs: '100vh', sm: 'auto' },
          borderRadius: { xs: 0, sm: 2 }
        }
      }}
    >
      <DialogTitle id="appointment-dialog-title">
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

        {isBlocked && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
              Completa tu perfil para agendar citas
            </Typography>
            <Typography variant="body2">
              Te falta configurar:{' '}
              {appointmentBlockers.map((b, i) => (
                <span key={b.id}>
                  <strong>{b.label.toLowerCase()}</strong>
                  {i < appointmentBlockers.length - 1 ? ', ' : ''}
                </span>
              ))}
              .
            </Typography>
          </Alert>
        )}

        <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={es}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>

            {/* ── Paso 1 · Tipo y horario ─────────────────────────────── */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ width: 22, height: 22, borderRadius: '50%', bgcolor: 'primary.main', color: 'primary.contrastText', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Typography variant="caption" sx={{ fontWeight: 700, lineHeight: 1 }}>1</Typography>
              </Box>
              <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Tipo y horario
              </Typography>
              <Divider sx={{ flex: 1 }} />
            </Box>

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

            {/* ── Paso 2 · Paciente ───────────────────────────────────── */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ width: 22, height: 22, borderRadius: '50%', bgcolor: 'primary.main', color: 'primary.contrastText', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Typography variant="caption" sx={{ fontWeight: 700, lineHeight: 1 }}>2</Typography>
              </Box>
              <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Paciente
              </Typography>
              <Divider sx={{ flex: 1 }} />
            </Box>

            {/* For "Primera vez" - Show patient type selector when not yet selected */}
            {!isEditing && currentFormData.consultation_type === 'Primera vez' && isExistingPatient === null && (
              <FormControl fullWidth sx={{ mt: 2 }}>
                <InputLabel>¿Es un paciente nuevo o existente?</InputLabel>
                <Select
                  value={isExistingPatient === null ? '' : (isExistingPatient ? 'existing' : 'new')}
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

            {/* ── Paso 3 · Recordatorios ─────────────────────────────── */}
            {selectedDate && selectedTime && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ width: 22, height: 22, borderRadius: '50%', bgcolor: 'primary.main', color: 'primary.contrastText', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Typography variant="caption" sx={{ fontWeight: 700, lineHeight: 1 }}>3</Typography>
                </Box>
                <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Recordatorios
                </Typography>
                <Divider sx={{ flex: 1 }} />
              </Box>
            )}

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

            {/* 6. PRE-CONSULTATION INTAKE QUESTIONNAIRE — only for existing appointments */}
            {isEditing && appointmentId && currentFormData.patient_id && (
              <Box sx={{ mt: 2 }}>
                <DoctorIntakePanel
                  appointmentId={appointmentId}
                  patientHasPhone={Boolean(
                    currentPatients.find((p) => p.id === currentFormData.patient_id)?.primary_phone
                  )}
                />
              </Box>
            )}
          </Box>
        </LocalizationProvider>
      </DialogContent>

      <DialogActions>
        <Button onClick={requestApptClose} disabled={currentLoading}>
          Cerrar
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={currentLoading || isBlocked}
        >
          {currentLoading ? (
            <CircularProgress size={20} />
          ) : (
            isEditing ? 'Actualizar' : 'Crear'
          )}
        </Button>
      </DialogActions>
    </Dialog>

    <Dialog open={apptConfirmOpen} onClose={cancelApptClose} maxWidth="xs" fullWidth>
      <DialogTitle>¿Descartar esta cita?</DialogTitle>
      <DialogContent>
        <DialogContentText>
          Ya seleccionaste fecha o paciente. Si cierras ahora se perderán los datos ingresados.
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={cancelApptClose} color="inherit">Seguir editando</Button>
        <Button onClick={confirmApptClose} color="error" variant="contained">Descartar</Button>
      </DialogActions>
    </Dialog>
    </>
  );
};

export default AppointmentDialogMultiOffice;
