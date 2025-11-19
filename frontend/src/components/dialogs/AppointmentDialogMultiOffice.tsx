import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Alert,
  CircularProgress,
  Typography,
  Autocomplete,
  Avatar
} from '@mui/material';
import { Person as PersonIcon } from '@mui/icons-material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { es } from 'date-fns/locale';
import { AppointmentFormData, Patient, AppointmentReminderFormData } from '../../types';
import { getMediumSelectMenuProps } from '../../utils/selectMenuProps';
import { useScrollToErrorInDialog } from '../../hooks/useScrollToError';
import { PhoneNumberInput } from '../common/PhoneNumberInput';
import { useAppointmentMultiOfficeForm, formatPatientNameWithAge } from '../../hooks/useAppointmentMultiOfficeForm';
import { preventBackdropClose } from '../../utils/dialogHelpers';
import { RemindersConfig } from '../common/RemindersConfig';
import { logger } from '../../utils/logger';

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
  // State for reminders - must be defined before onSubmitWithReminders
  const [reminders, setReminders] = useState<AppointmentReminderFormData[]>([]);
  // Use ref to always have the latest reminders value
  const remindersRef = useRef<AppointmentReminderFormData[]>([]);
  
  // Update ref whenever reminders change - this ensures ref is always in sync
  useEffect(() => {
    remindersRef.current = reminders;
  }, [reminders]);

  // Create a wrapper for onSubmit that always includes reminders
  const onSubmitWithReminders = useCallback((formData: AppointmentFormData) => {
    // ALWAYS use reminders from ref (which is always up-to-date) instead of formData
    // This ensures we have the latest reminders even if formData is stale
    const currentReminders = remindersRef.current;
    
    // Build formData with reminders - remove reminders from formData first to avoid undefined
    // Then add it back only if there are actual reminders
    const { reminders: _, ...formDataWithoutReminders } = formData as any;
    const formDataWithReminders: any = {
      ...formDataWithoutReminders
    };
    
    // Only add reminders property if there are actual reminders
    // This prevents undefined from being serialized to null
    if (currentReminders.length > 0) {
      formDataWithReminders.reminders = currentReminders;
      logger.debug('✅ Added reminders to formDataWithReminders', {
        reminders_count: currentReminders.length,
        reminders: currentReminders
      }, 'ui');
    } else {
      logger.debug('⚠️ No reminders to add (currentReminders.length is 0)', {
        currentReminders_length: currentReminders.length,
        ref_length: remindersRef.current.length
      }, 'ui');
    }
    // If no reminders, don't include the property at all (not even as undefined)
    
    logger.debug('onSubmitWithReminders called', {
      reminders_count: currentReminders.length,
      reminders: currentReminders,
      formData_has_reminders: !!formData.reminders,
      formData_reminders_count: formData.reminders?.length || 0,
      ref_reminders_count: remindersRef.current.length,
      final_reminders_count: formDataWithReminders.reminders?.length || 0,
      final_reminders: formDataWithReminders.reminders,
      formDataWithReminders_keys: Object.keys(formDataWithReminders),
      has_reminders_property: 'reminders' in formDataWithReminders,
      formDataWithReminders_reminders_direct: formDataWithReminders.reminders
    }, 'ui');
    
    // Log right before calling onSubmit to see what we're passing
    logger.debug('📤 About to call onSubmit with', {
      has_reminders: 'reminders' in formDataWithReminders,
      reminders_value: formDataWithReminders.reminders,
      reminders_type: typeof formDataWithReminders.reminders,
      reminders_is_array: Array.isArray(formDataWithReminders.reminders),
      all_keys: Object.keys(formDataWithReminders)
    }, 'ui');
    
    onSubmit(formDataWithReminders);
  }, [onSubmit]);

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
    appointmentTypes,
    offices,
    patients,
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

  // Track if we've initialized reminders for this dialog session
  const remindersInitializedRef = useRef(false);
  const previousExternalFormDataRef = useRef<AppointmentFormData | undefined>(undefined);
  
  // Load reminders when dialog opens or when editing
  useEffect(() => {
    // Only initialize when dialog opens
    if (!open) {
      remindersInitializedRef.current = false;
      previousExternalFormDataRef.current = undefined;
      return;
    }
    
    // Check if externalFormData has actually changed (by comparing reminders)
    const currentReminders = externalFormData?.reminders;
    const previousReminders = previousExternalFormDataRef.current?.reminders;
    const remindersChanged = JSON.stringify(currentReminders) !== JSON.stringify(previousReminders);
    
    // Update the ref to track current externalFormData
    previousExternalFormDataRef.current = externalFormData;
    
    // Initialize reminders based on editing state
    if (isEditing && externalFormData?.reminders && Array.isArray(externalFormData.reminders)) {
      const loadedReminders = externalFormData.reminders.map((r: any) => ({
        reminder_number: r.reminder_number,
        offset_minutes: r.offset_minutes,
        enabled: r.enabled
      }));
      // Only update if reminders actually changed or if not yet initialized
      if (remindersChanged || !remindersInitializedRef.current) {
        setReminders(loadedReminders);
        remindersInitializedRef.current = true;
      }
    } else if (!isEditing) {
      // Only reset if we're creating a new appointment (not editing) and not yet initialized
      if (!remindersInitializedRef.current) {
        setReminders([]);
        remindersInitializedRef.current = true;
      }
    }
  }, [open, isEditing, externalFormData?.reminders]);

  // Hook para scroll automático a errores
  const { errorRef } = useScrollToErrorInDialog(currentError);

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
          '&::-webkit-scrollbar': {
            width: '6px',
          },
          '&::-webkit-scrollbar-track': {
            background: '#f1f1f1',
            borderRadius: '3px',
          },
          '&::-webkit-scrollbar-thumb': {
            background: '#c1c1c1',
            borderRadius: '3px',
          },
          '&::-webkit-scrollbar-thumb:hover': {
            background: '#a8a8a8',
          },
        }}
      >
        {currentError && (
          <Alert severity="error" sx={{ mb: 2 }} ref={errorRef}>
            {currentError}
          </Alert>
        )}

        <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={es}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            
            {/* 1. TIPO DE CONSULTA (PRIMERO) */}
            <FormControl fullWidth required>
              <InputLabel>Tipo de Consulta</InputLabel>
              <Select
                value={currentFormData.consultation_type || ''}
                onChange={handleChange('consultation_type')}
                label="Tipo de Consulta"
                MenuProps={getMediumSelectMenuProps()}
              >
                <MenuItem value=""><em>Seleccione un tipo</em></MenuItem>
                <MenuItem value="Primera vez">Primera vez</MenuItem>
                <MenuItem value="Seguimiento">Seguimiento</MenuItem>
              </Select>
            </FormControl>

            {/* 2. SELECCIÓN DE PACIENTE - Solo si es "Primera vez" */}
            {!isEditing && currentFormData.consultation_type === 'Primera vez' && (
              <>
                <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>
                  Datos del Nuevo Paciente
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Como es una consulta de primera vez, complete los datos básicos del nuevo paciente:
                </Typography>
              </>
            )}

            {/* Si es "Seguimiento", automáticamente es paciente existente */}
            {!isEditing && currentFormData.consultation_type === 'Seguimiento' && (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Para citas de seguimiento, debe seleccionar un paciente existente
              </Typography>
            )}

            {/* 3A. SELECCIÓN DE PACIENTE EXISTENTE */}
            {(isExistingPatient === true || currentFormData.consultation_type === 'Seguimiento') && (
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <PersonIcon sx={{ fontSize: 20 }} />
                  Paciente
                  <Typography component="span" sx={{ color: 'error.main', ml: 0.5 }}>*</Typography>
                </Typography>
                
                {currentPatients.length === 0 ? (
                  <Box sx={{ 
                    border: '1px dashed', 
                    borderColor: 'grey.300', 
                    borderRadius: 1, 
                    p: 3, 
                    textAlign: 'center',
                    bgcolor: 'grey.50'
                  }}>
                    <PersonIcon sx={{ fontSize: 48, color: 'grey.400', mb: 2 }} />
                    <Typography variant="h6" color="text.secondary" gutterBottom>
                      No hay pacientes registrados
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      Para crear una nueva cita, primero debe registrar un paciente
                    </Typography>
                  </Box>
                ) : (
                  <Autocomplete
                    options={currentPatients || []}
                    getOptionLabel={(option: any) => formatPatientNameWithAge(option)}
                    isOptionEqualToValue={(option, value) => option.id === value.id}
                    value={currentPatients.find(p => p.id === currentFormData.patient_id) || null}
                    onChange={(_: any, newValue: any) => {
                      if (newValue) {
                        handleChange('patient_id')({ target: { value: newValue.id } });
                      }
                    }}
                    renderInput={(params: any) => (
                      <TextField
                        {...params}
                        label="Seleccionar Paciente"
                        required
                        error={!!currentError && !currentFormData.patient_id}
                        helperText={currentError && !currentFormData.patient_id ? 'Campo requerido' : ''}
                      />
                    )}
                    renderOption={(props: any, option: any) => {
                      const { key, ...otherProps } = props;
                      return (
                        <Box 
                          component="li" 
                          key={option.id || `patient-${option.name}`}
                          {...otherProps}
                        >
                          <Avatar sx={{ mr: 2, bgcolor: 'primary.main' }}>
                            {option.name?.split(' ').slice(0, 2).map((n: string) => n[0]).join('') || 'P'}
                          </Avatar>
                          <Box>
                            <Typography variant="body1">
                              {formatPatientNameWithAge(option)}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {option.primary_phone} • {option.email}
                            </Typography>
                          </Box>
                        </Box>
                      );
                    }}
                    loading={currentPatients.length === 0}
                    loadingText="Cargando pacientes..."
                    noOptionsText="No se encontraron pacientes"
                  />
                )}
              </Box>
            )}

            {/* 3B. DATOS BÁSICOS DE NUEVO PACIENTE */}
            {isExistingPatient === false && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, p: 2, border: 1, borderColor: 'divider', borderRadius: 1 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                  Datos básicos del nuevo paciente
                </Typography>
                
                <TextField
                  fullWidth
                  label="Nombre Completo *"
                  value={newPatientData.name}
                  onChange={(e) => setNewPatientData(prev => ({ ...prev, name: e.target.value }))}
                  required
                  size="small"
                  placeholder="Ingresa el nombre completo (nombre y apellidos)"
                  helperText="Ingresa al menos nombre y apellido"
                />

                <PhoneNumberInput
                  countryCode={newPatientData.phone_country_code}
                  phoneNumber={newPatientData.phone_number}
                  onCountryCodeChange={(code) => setNewPatientData(prev => ({ ...prev, phone_country_code: code }))}
                  onPhoneNumberChange={(number) => {
                    const value = number.replace(/\D/g, '');
                    setNewPatientData(prev => ({ ...prev, phone_number: value }));
                  }}
                  label="Número telefónico *"
                  required
                  placeholder="Ej: 222 123 4567"
                  fullWidth
                />
              </Box>
            )}

            {/* 4. CONSULTORIO */}
            <FormControl size="small" fullWidth required>
              <InputLabel>Consultorio</InputLabel>
              <Select
                value={(offices.some(o => o.id === (currentFormData.office_id as any)) ? currentFormData.office_id : 0) || 0}
                onChange={handleChange('office_id')}
                label="Consultorio"
                MenuProps={getMediumSelectMenuProps()}
              >
                <MenuItem value={0} disabled>
                  Seleccionar consultorio
                </MenuItem>
                {offices.map((office) => (
                  <MenuItem key={office.id} value={office.id}>
                    <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                          {office.name}
                        </Typography>
                        {office.is_virtual && office.virtual_url && (
                          <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                            <Typography variant="caption" sx={{ color: '#1976d2', fontSize: '0.75rem' }}>
                              💻 {office.virtual_url}
                            </Typography>
                          </Box>
                        )}
                        {!office.is_virtual && office.address && (
                          <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                            <Typography variant="caption" sx={{ color: '#666', fontSize: '0.75rem' }}>
                              📍 {office.address}
                            </Typography>
                          </Box>
                        )}
                      </Box>
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* 6. FECHA Y HORA */}
            <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
              <DatePicker
                label="Fecha de la cita"
                value={currentFormData.appointment_date ? new Date(currentFormData.appointment_date) : new Date()}
                onChange={(date) => {
                  const dateString = date ? date.toISOString() : '';
                  const newFormData = {
                    ...currentFormData,
                    appointment_date: dateString
                  };
                  setFormData(newFormData);
                  if (onFormDataChange) {
                    onFormDataChange(newFormData);
                  }
                  
                  if (date) {
                    handleDateChange(dateString);
                  } else {
                    // Clear available times when date is cleared
                    formHook.setAvailableTimes([]);
                  }
                }}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    required: true
                  }
                }}
              />

              <FormControl fullWidth required>
                <InputLabel>Hora de la cita</InputLabel>
                <Select
                  value={selectedTime || ''}
                  onChange={(e) => handleTimeChange(e.target.value)}
                  disabled={loadingTimes}
                  label="Hora de la cita"
                >
                  {selectedTime && (
                    <MenuItem value={selectedTime}>
                      {selectedTime} (Horario actual)
                    </MenuItem>
                  )}
                  {loadingTimes ? (
                    <MenuItem disabled>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <CircularProgress size={16} />
                        <Typography variant="body2">Cargando horarios...</Typography>
                      </Box>
                    </MenuItem>
                  ) : availableTimes.length === 0 ? (
                    <MenuItem disabled>
                      <Typography variant="body2" color="text.secondary">
                        {selectedDate ? 'No hay horarios disponibles' : 'Selecciona una fecha primero'}
                      </Typography>
                    </MenuItem>
                  ) : (
                    availableTimes.map((timeSlot) => (
                      <MenuItem key={timeSlot.time} value={timeSlot.time}>
                        {timeSlot.display} ({timeSlot.duration_minutes} min)
                      </MenuItem>
                    ))
                  )}
                </Select>
              </FormControl>
            </Box>
            
            {/* Show informative message when no times are available */}
            {availableTimes.length === 0 && !loadingTimes && (
              <Alert severity="info" sx={{ mt: 1 }}>
                No hay horarios disponibles para esta fecha. El doctor no tiene horarios configurados para este día.
              </Alert>
            )}

            {/* 7. RECORDATORIOS AUTOMÁTICOS POR WHATSAPP */}
            {selectedDate && selectedTime && (
              <Box sx={{ mt: 2 }}>
                <RemindersConfig
                  reminders={reminders}
                  onChange={(newReminders) => {
                    setReminders(newReminders);
                    // Update formData with reminders
                    const updated = {
                      ...currentFormData,
                      reminders: newReminders.length > 0 ? newReminders : undefined
                    };
                    setFormData(updated);
                    if (onFormDataChange) {
                      onFormDataChange(updated);
                    }
                  }}
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
          Cancelar
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
