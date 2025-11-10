import React from 'react';
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
  Avatar,
  Switch,
  FormControlLabel
} from '@mui/material';
import { Person as PersonIcon } from '@mui/icons-material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { es } from 'date-fns/locale';
import { AppointmentFormData, Patient } from '../../types';
import { getMediumSelectMenuProps } from '../../utils/selectMenuProps';
import { useScrollToErrorInDialog } from '../../hooks/useScrollToError';
import { PhoneNumberInput } from '../common/PhoneNumberInput';
import { useAppointmentMultiOfficeForm, formatPatientNameWithAge } from '../../hooks/useAppointmentMultiOfficeForm';
import { preventBackdropClose } from '../../utils/dialogHelpers';

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
  const formHook = useAppointmentMultiOfficeForm({
    open,
    formData: externalFormData,
    patients: externalPatients,
    isEditing,
    doctorProfile,
    onFormDataChange,
    onSubmit,
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

            {/* 7. MOTIVO */}
            <TextField
              fullWidth
              label="Motivo de la cita"
              value={currentFormData.reason}
              onChange={handleChange('reason')}
              required
              multiline
              rows={2}
            />

            {/* 8. NOTAS */}
            <TextField
              fullWidth
              label="Notas adicionales"
              value={currentFormData.notes || ''}
              onChange={handleChange('notes')}
              multiline
              rows={3}
            />

            {/* 9. RECORDATORIO AUTOMÁTICO POR WHATSAPP */}
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                Recordatorio automático por WhatsApp
              </Typography>
              <FormControlLabel
                control={
                  <Switch
                    checked={!!currentFormData.auto_reminder_enabled}
                    onChange={(_, checked) => {
                      const updated = {
                        ...currentFormData,
                        auto_reminder_enabled: checked,
                        auto_reminder_offset_minutes: checked
                          ? (currentFormData.auto_reminder_offset_minutes ?? 360)
                          : currentFormData.auto_reminder_offset_minutes
                      };
                      setFormData(updated);
                      onFormDataChange && onFormDataChange(updated);
                    }}
                  />
                }
                label="Enviar recordatorio automático"
              />

              {currentFormData.auto_reminder_enabled && (
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: '160px 160px' }, gap: 2, mt: 1 }}>
                  <TextField
                    type="number"
                    size="small"
                    label="Horas antes"
                    inputProps={{ min: 0, max: 168 }}
                    value={Math.floor(((currentFormData.auto_reminder_offset_minutes ?? 360) / 60))}
                    onChange={(e) => {
                      const hours = Math.max(0, Math.min(168, parseInt(e.target.value || '0', 10)));
                      const minutes = (currentFormData.auto_reminder_offset_minutes ?? 360) % 60;
                      const updated = {
                        ...currentFormData,
                        auto_reminder_offset_minutes: hours * 60 + minutes
                      };
                      setFormData(updated);
                      onFormDataChange && onFormDataChange(updated);
                    }}
                  />
                  <TextField
                    type="number"
                    size="small"
                    label="Minutos antes"
                    inputProps={{ min: 0, max: 59 }}
                    value={(currentFormData.auto_reminder_offset_minutes ?? 360) % 60}
                    onChange={(e) => {
                      const mins = Math.max(0, Math.min(59, parseInt(e.target.value || '0', 10)));
                      const hours = Math.floor(((currentFormData.auto_reminder_offset_minutes ?? 360) / 60));
                      const updated = {
                        ...currentFormData,
                        auto_reminder_offset_minutes: hours * 60 + mins
                      };
                      setFormData(updated);
                      onFormDataChange && onFormDataChange(updated);
                    }}
                  />
                </Box>
              )}
            </Box>
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
