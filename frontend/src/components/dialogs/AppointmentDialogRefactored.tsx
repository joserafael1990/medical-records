import React, { memo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  IconButton,
  CircularProgress,
  Alert,
  Collapse
} from '@mui/material';
import {
  Close as CloseIcon,
  Save as SaveIcon
} from '@mui/icons-material';

import { useAppointmentDialog } from '../../hooks/useAppointmentDialog';
import { PatientSelector } from './AppointmentDialog/PatientSelector';
import { DateTimeSelector } from './AppointmentDialog/DateTimeSelector';
import { NotesSection } from './AppointmentDialog/NotesSection';

interface AppointmentDialogRefactoredProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (formData: any) => Promise<void>;
  onNewPatient: () => void;
  onEditPatient?: (patient: any) => void;
  formData: any;
  patients: any[];
  isEditing: boolean;
  loading?: boolean;
  formErrorMessage?: string;
  fieldErrors?: Record<string, string>;
  onFormDataChange?: (formData: any) => void;
  doctorProfile?: any;
}

const AppointmentDialogRefactored: React.FC<AppointmentDialogRefactoredProps> = memo(({
  open,
  onClose,
  onSubmit,
  onNewPatient,
  onEditPatient,
  formData,
  patients,
  isEditing,
  loading = false,
  formErrorMessage = '',
  fieldErrors = {},
  onFormDataChange,
  doctorProfile
}) => {
  const {
    localFormData,
    availableTimes,
    selectedDate,
    selectedTime,
    loadingTimes,
    selectedPatient,
    validationError,
    setValidationError,
    handleDateChange,
    handleTimeChange,
    handlePatientChange,
    handleInputChange,
    handleSubmit,
    handleReset,
    formatTimeToAMPM,
    formatPatientNameWithAge,
    validationErrorRef,
    formErrorRef
  } = useAppointmentDialog({
    formData,
    patients,
    isEditing,
    doctorProfile,
    onFormDataChange
  });

  const appointmentTypes = [
    'Consulta General',
    'Seguimiento',
    'Primera Vez',
    'Urgencia',
    'Control',
    'Revisión'
  ];

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const handleSave = async () => {
    await handleSubmit(onSubmit);
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleClose} 
      maxWidth="md" 
      fullWidth
      PaperProps={{
        sx: { minHeight: '600px' }
      }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6">
            {isEditing ? 'Editar Cita' : 'Nueva Cita'}
          </Typography>
          <IconButton onClick={handleClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {/* Validation Error */}
          <Collapse in={!!validationError}>
            <Alert 
              severity="error" 
              ref={validationErrorRef}
              sx={{ mb: 2 }}
            >
              {validationError}
            </Alert>
          </Collapse>

          {/* Form Error */}
          <Collapse in={!!formErrorMessage}>
            <Alert 
              severity="error" 
              ref={formErrorRef}
              sx={{ mb: 2 }}
            >
              {formErrorMessage}
            </Alert>
          </Collapse>

          {/* Patient Selector */}
          <PatientSelector
            patients={patients}
            selectedPatient={selectedPatient}
            onPatientChange={handlePatientChange}
            onNewPatient={onNewPatient}
            onEditPatient={onEditPatient}
            formatPatientNameWithAge={formatPatientNameWithAge}
            errors={fieldErrors}
          />

          {/* Date and Time Selector */}
          <DateTimeSelector
            selectedDate={selectedDate}
            selectedTime={selectedTime}
            availableTimes={availableTimes}
            loadingTimes={loadingTimes}
            onDateChange={handleDateChange}
            onTimeChange={handleTimeChange}
            formatTimeToAMPM={formatTimeToAMPM}
            errors={fieldErrors}
            appointmentTypes={appointmentTypes}
            appointmentType={localFormData.appointment_type || ''}
            onAppointmentTypeChange={(type) => handleInputChange('appointment_type', type)}
          />

          {/* Notes Section */}
          <NotesSection
            notes={localFormData.notes || ''}
            onNotesChange={(notes) => handleInputChange('notes', notes)}
            errors={fieldErrors}
          />
        </Box>
      </DialogContent>

      <DialogActions>
        <Button 
          onClick={handleClose} 
          disabled={loading}
        >
          Cancelar
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          startIcon={loading ? <CircularProgress size={20} /> : <SaveIcon />}
          disabled={loading}
        >
          {loading ? 'Guardando...' : (isEditing ? 'Actualizar Cita' : 'Crear Cita')}
        </Button>
      </DialogActions>
    </Dialog>
  );
});

AppointmentDialogRefactored.displayName = 'AppointmentDialogRefactored';

export default AppointmentDialogRefactored;
