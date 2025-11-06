import React, { memo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Box,
  Typography,
  IconButton,
  Divider,
  Collapse,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Autocomplete,
  Avatar,
  Alert
} from '@mui/material';
import {
  Close as CloseIcon,
  Person as PersonIcon,
  Schedule as ScheduleIcon,
  Event as EventIcon,
  Notes as NotesIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import { Patient, AppointmentFormData as BaseAppointmentFormData } from '../../types';
import { AppointmentFormData } from '../../hooks/useAppointmentForm';
import { ErrorRibbon } from '../common/ErrorRibbon';
import { useScrollToErrorInDialog } from '../../hooks/useScrollToError';
import { AppointmentTypeSection } from './AppointmentDialog/AppointmentTypeSection';
import { DateTimeSection } from './AppointmentDialog/DateTimeSection';
import { NotesSection } from './AppointmentDialog/NotesSection';
import { AutoReminderSection } from './AppointmentDialog/AutoReminderSection';
import { AppointmentActions } from './AppointmentDialog/AppointmentActions';
import { InlinePatientCreation } from './AppointmentDialog/InlinePatientCreation';
import { useAppointmentForm } from '../../hooks/useAppointmentForm';
import { logger } from '../../utils/logger';

interface AppointmentDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (formData: BaseAppointmentFormData) => Promise<void>;
  onNewPatient: () => void;
  onEditPatient?: (patient: Patient) => void;
  formData: BaseAppointmentFormData;
  patients: Patient[];
  isEditing: boolean;
  loading?: boolean;
  formErrorMessage?: string;
  fieldErrors?: Record<string, string>;
  onFormDataChange?: (formData: BaseAppointmentFormData) => void;
  doctorProfile?: any;
}

const AppointmentDialog: React.FC<AppointmentDialogProps> = memo(({
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
  const formHook = useAppointmentForm({
    formData: formData as AppointmentFormData,
    patients,
    isEditing,
    doctorProfile,
    onFormDataChange: onFormDataChange ? (data) => onFormDataChange(data as BaseAppointmentFormData) : undefined,
    onSubmit: async (finalFormData) => {
      await onSubmit(finalFormData as BaseAppointmentFormData);
      // Close dialog after successful submission (handled in hook)
    },
    onSuccess: () => {
      onClose();
    },
    open,
    fieldErrors
  });

  const {
    localFormData,
    validationError,
    loading: formLoading,
    availableTimes,
    loadingTimes,
    selectedDate,
    selectedTime,
    selectedPatient,
    newPatientData,
    personalDocument,
    showAdvancedPatientData,
    countries,
    states,
    birthStates,
    emergencyRelationships,
    handleDateChange,
    handleTimeChange,
    handlePatientChange,
    handleFieldChange,
    handleNewPatientFieldChange,
    handleNewPatientCountryChange,
    handleSubmit,
    setPersonalDocument,
    setShowAdvancedPatientData,
    isFormComplete,
    getValidationErrorMessage,
    isPatientSelectionEnabled,
    getFieldError,
    hasFieldError,
    formatTimeToAMPM,
    formatPatientNameWithAge,
    isReadOnly,
    computedIsEditing,
    shouldShowPatientSection,
    shouldShowNewPatientForm
  } = formHook;

  // Auto-scroll to error when it appears
  const { errorRef: validationErrorRef } = useScrollToErrorInDialog(validationError);
  const { errorRef: formErrorRef } = useScrollToErrorInDialog(formErrorMessage);

  const handleClose = () => {
    onClose();
  };

  const isLoading = loading || formLoading;

  return (
    <Dialog 
      open={open} 
      onClose={handleClose} 
      maxWidth="md" 
      fullWidth
      PaperProps={{
        sx: { 
          borderRadius: 2,
          maxHeight: '90vh'
        }
      }}
    >
      <DialogTitle sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        pb: 1
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ScheduleIcon color="primary" />
          <Typography variant="h6" component="span">
            {computedIsEditing ? 'Editar Cita' : 'Nueva Cita'}
          </Typography>
        </Box>
        <IconButton onClick={handleClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <Divider />

      <DialogContent sx={{ pt: 2 }}>
        {/* Error Messages */}
        <Collapse in={!!formErrorMessage}>
          <Box ref={formErrorRef} sx={{ mb: 2 }}>
            <ErrorRibbon message={formErrorMessage} />
          </Box>
        </Collapse>
        
        {/* Validation Error Messages */}
        {validationError && (
          <Box 
            ref={validationErrorRef}
            data-testid="validation-error-message"
            sx={{ 
              mb: 2, 
              p: 2, 
              bgcolor: 'error.main', 
              borderRadius: 1,
              backgroundColor: '#d32f2f !important'
            }}
          >
            <Typography color="white" sx={{ color: 'white !important' }}>
              {validationError}
            </Typography>
          </Box>
        )}

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* STEP 1: Appointment Type - Only show if there are existing patients */}
          <AppointmentTypeSection
            appointmentType={localFormData.appointment_type || ''}
            onAppointmentTypeChange={(value) => handleFieldChange('appointment_type')({ target: { value } } as any)}
            hasError={hasFieldError('appointment_type')}
            errorMessage={getFieldError('appointment_type')}
            isReadOnly={isReadOnly}
            show={patients.length > 0}
          />

          {/* STEP 2: Patient Section - Conditional based on appointment type or no patients */}
          {shouldShowPatientSection && (
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                <PersonIcon sx={{ fontSize: 20 }} />
                Seleccionar Paciente
                <Typography component="span" sx={{ color: 'error.main', ml: 0.5 }}>*</Typography>
              </Typography>
              
              {/* Patient Selection Logic */}
              {shouldShowNewPatientForm ? (
                <InlinePatientCreation
                  newPatientData={newPatientData}
                  personalDocument={personalDocument}
                  countries={countries}
                  states={states}
                  birthStates={birthStates}
                  emergencyRelationships={emergencyRelationships}
                  showAdvancedPatientData={showAdvancedPatientData}
                  isReadOnly={isReadOnly}
                  patientsCount={patients.length}
                  onFieldChange={handleNewPatientFieldChange}
                  onCountryChange={handleNewPatientCountryChange}
                  onPersonalDocumentChange={setPersonalDocument}
                  onShowAdvancedData={() => setShowAdvancedPatientData(true)}
                  getFieldError={getFieldError}
                  hasFieldError={hasFieldError}
                />
              ) : (
                // Show patient selection for "seguimiento" or when patient is selected
                <>
                  {localFormData.appointment_type === 'seguimiento' && (
                    <Box sx={{ mb: 2, p: 2, bgcolor: 'info.50', borderRadius: 1, border: '1px solid', borderColor: 'info.200' }}>
                      <Typography variant="body2" color="info.main" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <InfoIcon sx={{ fontSize: 16 }} />
                        Para citas de seguimiento, debe seleccionar un paciente existente
                      </Typography>
                    </Box>
                  )}
                  <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                    <Box sx={{ flex: 1 }}>
                      <Autocomplete
                        options={patients || []}
                        getOptionLabel={(option) => formatPatientNameWithAge(option)}
                        value={selectedPatient}
                        onChange={(_, newValue) => handlePatientChange(newValue)}
                        disabled={isReadOnly || !isPatientSelectionEnabled()}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            label="Seleccionar Paciente"
                            required
                            error={hasFieldError('patient_id') || (!localFormData.patient_id)}
                            helperText={getFieldError('patient_id') || (!localFormData.patient_id ? 'Campo requerido' : '')}
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
                  </Box>
                </>
              )}
            </Box>
          )}
          
          {/* STEP 3: Date, Time and Other Fields */}
          <DateTimeSection
            selectedDate={selectedDate}
            selectedTime={selectedTime}
            availableTimes={availableTimes}
            loadingTimes={loadingTimes}
            onDateChange={handleDateChange}
            onTimeChange={handleTimeChange}
            hasDateError={hasFieldError('date_time')}
            dateErrorMessage={getFieldError('date_time')}
            validationError={validationError}
            isReadOnly={isReadOnly}
            formatTimeToAMPM={formatTimeToAMPM}
          />
          
          {/* Cancellation Reason - Only show when status is 'cancelled' */}
          {localFormData.status === 'cancelled' && (
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                <NotesIcon sx={{ fontSize: 20 }} />
                Razón de Cancelación
                <Typography component="span" sx={{ color: 'error.main', ml: 0.5 }}>*</Typography>
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="Describe la razón de la cancelación"
                value={localFormData.cancelled_reason || ''}
                onChange={handleFieldChange('cancelled_reason')}
                size="small"
                error={hasFieldError('cancelled_reason') || (localFormData.status === 'cancelled' && (!localFormData.cancelled_reason || localFormData.cancelled_reason.trim() === ''))}
                helperText={getFieldError('cancelled_reason') || (localFormData.status === 'cancelled' && (!localFormData.cancelled_reason || localFormData.cancelled_reason.trim() === '') ? 'Campo requerido para citas canceladas' : '')}
                placeholder="Ej: Enfermedad del paciente, emergencia familiar, reagendamiento, etc."
                InputProps={{
                  readOnly: false
                }}
              />
            </Box>
          )}
          
          {/* Priority */}
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
              <EventIcon sx={{ fontSize: 20 }} />
              Prioridad - opcional
            </Typography>
            <FormControl fullWidth size="small">
              <InputLabel>Prioridad - opcional</InputLabel>
              <Select
                value={localFormData.priority || 'normal'}
                onChange={handleFieldChange('priority')}
                label="Prioridad - opcional"
                disabled={isReadOnly}
              >
                <MenuItem value="normal">Normal</MenuItem>
                <MenuItem value="high">Alta</MenuItem>
              </Select>
            </FormControl>
          </Box>

          <NotesSection
            preparationInstructions={localFormData.preparation_instructions || ''}
            notes={localFormData.notes || ''}
            onPreparationInstructionsChange={(value) => handleFieldChange('preparation_instructions')({ target: { value } } as any)}
            onNotesChange={(value) => handleFieldChange('notes')({ target: { value } } as any)}
            hasNotesError={hasFieldError('notes')}
            notesErrorMessage={getFieldError('notes')}
            isReadOnly={isReadOnly}
          />

          <AutoReminderSection
            autoReminderEnabled={!!localFormData.auto_reminder_enabled}
            autoReminderOffsetMinutes={localFormData.auto_reminder_offset_minutes ?? 360}
            onAutoReminderToggle={(enabled) => {
              const updated = {
                ...localFormData,
                auto_reminder_enabled: enabled,
                auto_reminder_offset_minutes: enabled
                  ? (localFormData.auto_reminder_offset_minutes ?? 360)
                  : localFormData.auto_reminder_offset_minutes
              };
              formHook.setLocalFormData(updated);
              onFormDataChange?.(updated);
            }}
            onHoursChange={(hours) => {
              const minutes = (localFormData.auto_reminder_offset_minutes ?? 360) % 60;
              const updated = {
                ...localFormData,
                auto_reminder_offset_minutes: hours * 60 + minutes
              };
              formHook.setLocalFormData(updated);
              onFormDataChange?.(updated);
            }}
            onMinutesChange={(mins) => {
              const hours = Math.floor(((localFormData.auto_reminder_offset_minutes ?? 360) / 60));
              const updated = {
                ...localFormData,
                auto_reminder_offset_minutes: hours * 60 + mins
              };
              formHook.setLocalFormData(updated);
              onFormDataChange?.(updated);
            }}
          />
        </Box>
      </DialogContent>

      <Divider />

      <AppointmentActions
        onClose={handleClose}
        onSubmit={handleSubmit}
        loading={isLoading}
        isEditing={computedIsEditing}
        isReadOnly={isReadOnly}
        status={localFormData.status}
        cancelledReason={localFormData.cancelled_reason}
      />
    </Dialog>
  );
});

AppointmentDialog.displayName = 'AppointmentDialog';

export default AppointmentDialog;
