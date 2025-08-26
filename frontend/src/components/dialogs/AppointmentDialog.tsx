import React, { memo, useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Divider,
  Chip,
  Avatar,
  IconButton,
  Autocomplete,
  Alert,
  Collapse
} from '@mui/material';
import {
  Close as CloseIcon,
  Person as PersonIcon,
  PersonAdd as PersonAddIcon,
  Schedule as ScheduleIcon,
  AccessTime as TimeIcon,
  Event as EventIcon,
  Notes as NotesIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon
} from '@mui/icons-material';
import { Patient, AppointmentFormData } from '../../types';
import { ErrorRibbon } from '../common/ErrorRibbon';

interface AppointmentDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (formData: AppointmentFormData) => void;
  onNewPatient: () => void;
  formData: AppointmentFormData;
  patients: Patient[];
  isEditing: boolean;
  loading?: boolean;
  formErrorMessage?: string;
  fieldErrors?: Record<string, string>;
}

const AppointmentDialog: React.FC<AppointmentDialogProps> = memo(({
  open,
  onClose,
  onSubmit,
  onNewPatient,
  formData,
  patients,
  isEditing,
  loading = false,
  formErrorMessage = '',
  fieldErrors = {}
}) => {
  const [localFormData, setLocalFormData] = useState<AppointmentFormData>(formData);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Update local form data when props change
  useEffect(() => {
    setLocalFormData(formData);
    if (formData.patient_id && patients.length > 0) {
      const patient = patients.find(p => p.id === formData.patient_id);
      setSelectedPatient(patient || null);
    } else {
      setSelectedPatient(null);
    }
  }, [formData, patients]);

  const handleFieldChange = (field: keyof AppointmentFormData) => (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | any
  ) => {
    const value = event.target ? event.target.value : event;
    setLocalFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handlePatientChange = (patient: Patient | null) => {
    setSelectedPatient(patient);
    setLocalFormData(prev => ({
      ...prev,
      patient_id: patient?.id || ''
    }));
  };

  const handleSubmit = () => {
    onSubmit(localFormData);
  };

  const getFieldError = (field: string): string => {
    return fieldErrors[field] || '';
  };

  const hasFieldError = (field: string): boolean => {
    return Boolean(getFieldError(field));
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
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
            {isEditing ? 'Editar Cita' : 'Nueva Cita'}
          </Typography>
        </Box>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <Divider />

      <DialogContent sx={{ pt: 2 }}>
        {/* Error Messages */}
        <Collapse in={!!formErrorMessage}>
          <Box sx={{ mb: 2 }}>
            <ErrorRibbon message={formErrorMessage} />
          </Box>
        </Collapse>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* Patient Selection */}
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
              <PersonIcon sx={{ fontSize: 20 }} />
              Paciente
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-end' }}>
              <Autocomplete
                fullWidth
                options={patients}
                value={selectedPatient}
                onChange={(_, value) => handlePatientChange(value)}
                getOptionLabel={(option) => `${option.full_name} - ${option.phone}`}
                renderOption={(props, option) => (
                  <Box component="li" {...props} sx={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                      {option.full_name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      📞 {option.phone} | 🆔 {option.id}
                    </Typography>
                  </Box>
                )}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Buscar paciente"
                    placeholder="Escribe para buscar..."
                    variant="outlined"
                    size="small"
                    error={hasFieldError('patient_id')}
                    helperText={getFieldError('patient_id')}
                  />
                )}
                loading={patients.length === 0}
                loadingText="Cargando pacientes..."
                noOptionsText="No se encontraron pacientes"
                sx={{ flex: 1 }}
              />
              <Button
                variant="outlined"
                onClick={onNewPatient}
                startIcon={<PersonAddIcon />}
                sx={{ whiteSpace: 'nowrap', height: 40 }}
              >
                Nuevo
              </Button>
            </Box>
          </Box>

          {/* Date and Time Row */}
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            {/* Date and Time */}
            <Box sx={{ flex: 1, minWidth: 250 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                <EventIcon sx={{ fontSize: 20 }} />
                Fecha y Hora
              </Typography>
              <TextField
                fullWidth
                type="datetime-local"
                value={localFormData.date_time || ''}
                onChange={handleFieldChange('date_time')}
                size="small"
                error={hasFieldError('date_time')}
                helperText={getFieldError('date_time')}
                InputLabelProps={{ shrink: true }}
              />
            </Box>

            {/* Duration */}
            <Box sx={{ flex: 1, minWidth: 200 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                <TimeIcon sx={{ fontSize: 20 }} />
                Duración
              </Typography>
              <TextField
                fullWidth
                type="number"
                label="Minutos"
                value={localFormData.duration_minutes || 30}
                onChange={handleFieldChange('duration_minutes')}
                size="small"
                inputProps={{ min: 5, max: 480, step: 5 }}
                error={hasFieldError('duration_minutes')}
                helperText={getFieldError('duration_minutes')}
              />
            </Box>
          </Box>

          {/* Type and Status Row */}
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            {/* Appointment Type */}
            <Box sx={{ flex: 1, minWidth: 200 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                Tipo de Cita
              </Typography>
              <FormControl fullWidth size="small" error={hasFieldError('appointment_type')}>
                <InputLabel>Tipo</InputLabel>
                <Select
                  value={localFormData.appointment_type || ''}
                  onChange={handleFieldChange('appointment_type')}
                  label="Tipo"
                >
                  <MenuItem value="consultation">Consulta</MenuItem>
                  <MenuItem value="follow_up">Seguimiento</MenuItem>
                  <MenuItem value="emergency">Emergencia</MenuItem>
                  <MenuItem value="routine_check">Revisión de Rutina</MenuItem>
                </Select>
              </FormControl>
            </Box>

            {/* Status */}
            <Box sx={{ flex: 1, minWidth: 200 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                Estado
              </Typography>
              <FormControl fullWidth size="small" error={hasFieldError('status')}>
                <InputLabel>Estado</InputLabel>
                <Select
                  value={localFormData.status || 'scheduled'}
                  onChange={handleFieldChange('status')}
                  label="Estado"
                >
                  <MenuItem value="scheduled">Programada</MenuItem>
                  <MenuItem value="confirmed">Confirmada</MenuItem>
                  <MenuItem value="in_progress">En Progreso</MenuItem>
                  <MenuItem value="completed">Completada</MenuItem>
                  <MenuItem value="cancelled">Cancelada</MenuItem>
                  <MenuItem value="no_show">No Asistió</MenuItem>
                </Select>
              </FormControl>
            </Box>
          </Box>

          {/* Reason */}
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
              <NotesIcon sx={{ fontSize: 20 }} />
              Motivo de la Consulta
            </Typography>
            <TextField
              fullWidth
              multiline
              rows={2}
              label="Describe el motivo de la cita"
              value={localFormData.reason || ''}
              onChange={handleFieldChange('reason')}
              size="small"
              error={hasFieldError('reason')}
              helperText={getFieldError('reason')}
            />
          </Box>

          {/* Notes */}
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
              Notas Adicionales
            </Typography>
            <TextField
              fullWidth
              multiline
              rows={2}
              label="Notas opcionales"
              value={localFormData.notes || ''}
              onChange={handleFieldChange('notes')}
              size="small"
              error={hasFieldError('notes')}
              helperText={getFieldError('notes')}
            />
          </Box>

          {/* Advanced Options Toggle */}
          <Box>
            <Button
              variant="text"
              onClick={() => setShowAdvanced(!showAdvanced)}
              startIcon={showAdvanced ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              sx={{ textTransform: 'none' }}
            >
              Opciones Avanzadas
            </Button>
            
            <Collapse in={showAdvanced}>
              <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                {/* Priority and Room */}
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                  <Box sx={{ flex: 1, minWidth: 200 }}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Prioridad</InputLabel>
                      <Select
                        value={localFormData.priority || 'normal'}
                        onChange={handleFieldChange('priority')}
                        label="Prioridad"
                      >
                        <MenuItem value="low">Baja</MenuItem>
                        <MenuItem value="normal">Normal</MenuItem>
                        <MenuItem value="high">Alta</MenuItem>
                        <MenuItem value="urgent">Urgente</MenuItem>
                      </Select>
                    </FormControl>
                  </Box>
                  
                  <Box sx={{ flex: 1, minWidth: 200 }}>
                    <TextField
                      fullWidth
                      label="Número de Consultorio"
                      value={localFormData.room_number || ''}
                      onChange={handleFieldChange('room_number')}
                      size="small"
                    />
                  </Box>
                </Box>

                {/* Cost and Insurance */}
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                  <Box sx={{ flex: 1, minWidth: 200 }}>
                    <TextField
                      fullWidth
                      type="number"
                      label="Costo Estimado"
                      value={localFormData.estimated_cost || ''}
                      onChange={handleFieldChange('estimated_cost')}
                      size="small"
                      inputProps={{ min: 0, step: 0.01 }}
                    />
                  </Box>
                  
                  <Box sx={{ flex: 1, minWidth: 200 }}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Seguro Cubre</InputLabel>
                      <Select
                        value={localFormData.insurance_covered ? 'yes' : 'no'}
                        onChange={(e) => handleFieldChange('insurance_covered')(e.target.value === 'yes')}
                        label="Seguro Cubre"
                      >
                        <MenuItem value="no">No</MenuItem>
                        <MenuItem value="yes">Sí</MenuItem>
                      </Select>
                    </FormControl>
                  </Box>
                </Box>

                {/* Preparation Instructions */}
                <TextField
                  fullWidth
                  multiline
                  rows={2}
                  label="Instrucciones de Preparación"
                  value={localFormData.preparation_instructions || ''}
                  onChange={handleFieldChange('preparation_instructions')}
                  size="small"
                  placeholder="Ej: Ayuno de 12 horas, traer estudios previos..."
                />

                {/* Equipment Needed */}
                <TextField
                  fullWidth
                  label="Equipo Necesario"
                  value={localFormData.equipment_needed || ''}
                  onChange={handleFieldChange('equipment_needed')}
                  size="small"
                  placeholder="Ej: Electrocardiógrafo, rayos X..."
                />
              </Box>
            </Collapse>
          </Box>
        </Box>
      </DialogContent>

      <Divider />

      <DialogActions sx={{ p: 2, gap: 1 }}>
        <Button 
          onClick={onClose} 
          color="inherit"
          disabled={loading}
        >
          Cancelar
        </Button>
        <Button 
          onClick={handleSubmit}
          variant="contained"
          disabled={loading || !localFormData.patient_id || !localFormData.date_time}
          sx={{ minWidth: 120 }}
        >
          {loading ? 'Guardando...' : (isEditing ? 'Actualizar' : 'Crear Cita')}
        </Button>
      </DialogActions>
    </Dialog>
  );
});

AppointmentDialog.displayName = 'AppointmentDialog';

export default AppointmentDialog;