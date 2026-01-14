import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  CircularProgress,
  Alert,
  Divider,
  Chip
} from '@mui/material';
import {
  CalendarToday as CalendarIcon
} from '@mui/icons-material';
import { apiService } from '../../services';
import { AppointmentFormData, AppointmentType, Office, AppointmentReminderFormData } from '../../types';
import { useToast } from '../common/ToastNotification';
import { useAuth } from '../../contexts/AuthContext';
import { APPOINTMENT_STATUS_LABELS } from '../../constants';
import { logger } from '../../utils/logger';
import { RemindersConfig } from './RemindersConfig';

interface ScheduleAppointmentSectionProps {
  patientId: number;
  doctorProfile?: any;
  onAppointmentsChange?: (appointments: any[]) => void;
  initialAppointments?: any[];
}

const ScheduleAppointmentSection: React.FC<ScheduleAppointmentSectionProps> = ({
  patientId,
  doctorProfile,
  onAppointmentsChange,
  initialAppointments = []
}) => {
  const { showSuccess, showError } = useToast();
  const { user } = useAuth();
  const [appointmentFormData, setAppointmentFormData] = useState<Partial<AppointmentFormData>>({
    appointment_date: '',
    appointment_type_id: undefined,
    office_id: undefined,
    consultation_type: 'Seguimiento',
    status: 'por_confirmar'
  });
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [availableTimes, setAvailableTimes] = useState<any[]>([]);
  const [loadingTimes, setLoadingTimes] = useState(false);
  const [appointmentTypes, setAppointmentTypes] = useState<AppointmentType[]>([]);
  const [offices, setOffices] = useState<Office[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scheduledAppointments, setScheduledAppointments] = useState<any[]>(initialAppointments);
  const [editingAppointmentId, setEditingAppointmentId] = useState<number | null>(null);
  const [reminders, setReminders] = useState<AppointmentReminderFormData[]>([]);

  // Use refs to track previous values and prevent infinite loops
  const prevScheduledAppointmentsRef = useRef<any[]>(scheduledAppointments);
  const onAppointmentsChangeRef = useRef(onAppointmentsChange);
  const allowedStatuses = ['confirmada', 'por_confirmar'];

  // Update ref when callback changes
  useEffect(() => {
    onAppointmentsChangeRef.current = onAppointmentsChange;
  }, [onAppointmentsChange]);

  // Notify parent of changes, but only when scheduledAppointments actually changes
  useEffect(() => {
    // Only notify if the array reference or content actually changed
    const hasChanged =
      prevScheduledAppointmentsRef.current.length !== scheduledAppointments.length ||
      prevScheduledAppointmentsRef.current.some((app, index) => {
        const newApp = scheduledAppointments[index];
        return !newApp || app.id !== newApp.id || app.status !== newApp.status;
      });

    if (hasChanged) {
      prevScheduledAppointmentsRef.current = scheduledAppointments;
      onAppointmentsChangeRef.current?.(scheduledAppointments);
    }
  }, [scheduledAppointments]);

  // Update scheduled appointments when initialAppointments changes
  useEffect(() => {
    const filtered = (initialAppointments || []).filter(app => allowedStatuses.includes(app.status));
    // Only update if the filtered result is actually different
    const currentIds = scheduledAppointments.map(app => app.id).sort().join(',');
    const newIds = filtered.map(app => app.id).sort().join(',');

    if (currentIds !== newIds) {
      setScheduledAppointments(filtered);
    }
  }, [initialAppointments]);

  const resetForm = (keepSelections = true) => {
    setAppointmentFormData(prev => ({
      appointment_date: keepSelections ? prev.appointment_date : '',
      appointment_type_id: prev.appointment_type_id,
      office_id: prev.office_id,
      consultation_type: 'Seguimiento',
      status: 'por_confirmar'
    }));

    if (!keepSelections) {
      setSelectedDate('');
      setSelectedTime('');
      setAvailableTimes([]);
      setReminders([]);
    }
  };

  const populateFormFromAppointment = (appointment: any) => {
    setAppointmentFormData(prev => ({
      ...prev,
      appointment_date: appointment.appointment_date,
      appointment_type_id: appointment.appointment_type_id,
      office_id: appointment.office_id,
      consultation_type: appointment.consultation_type,
      status: appointment.status
    }));

    setSelectedDate(appointment.appointment_date?.split('T')[0] || '');
    const timePart = appointment.appointment_date?.split('T')[1]?.substring(0, 5) || '';
    setSelectedTime(timePart);

    // Load reminders if they exist
    if (appointment.reminders && Array.isArray(appointment.reminders) && appointment.reminders.length > 0) {
      const loadedReminders = appointment.reminders.map((r: any) => ({
        reminder_number: r.reminder_number,
        offset_minutes: r.offset_minutes,
        enabled: r.enabled
      }));
      setReminders(loadedReminders);
    } else {
      setReminders([]);
    }
  };

  // Load appointment types and offices on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const [typesData, officesData] = await Promise.all([
          apiService.appointments.getAppointmentTypes(),
          doctorProfile?.id ? apiService.offices.getOffices(doctorProfile.id) : Promise.resolve([])
        ]);
        setAppointmentTypes(typesData);
        setOffices(officesData);

        // Set default appointment type to "Seguimiento" if available
        const seguimientoType = typesData.find(type =>
          type.name.toLowerCase().includes('seguimiento') ||
          type.code?.toLowerCase().includes('seguimiento')
        );
        if (seguimientoType) {
          setAppointmentFormData(prev => ({ ...prev, appointment_type_id: seguimientoType.id }));
        } else if (typesData.length > 0) {
          // Use first available type if no "Seguimiento" found
          setAppointmentFormData(prev => ({ ...prev, appointment_type_id: typesData[0].id }));
        }

        // Set default office if available
        if (officesData.length > 0 && officesData[0].id) {
          setAppointmentFormData(prev => ({ ...prev, office_id: officesData[0].id || undefined }));
        }
      } catch (err) {
        logger.error('Error loading appointment data', err, 'api');
        setError('Error al cargar tipos de cita y oficinas');
      }
    };

    if (patientId && patientId > 0) {
      loadData();
    }
  }, [patientId, doctorProfile?.id]);

  // Load available times when date is selected
  useEffect(() => {
    const loadTimes = async () => {
      if (!selectedDate) {
        setAvailableTimes([]);
        return;
      }

      try {
        setLoadingTimes(true);
        const dateOnly = selectedDate.split('T')[0];
        const response = await apiService.appointments.getAvailableTimesForBooking(dateOnly);
        setAvailableTimes(response.available_times || []);
      } catch (err) {
        logger.error('Error loading available times', err, 'api');
        setAvailableTimes([]);
      } finally {
        setLoadingTimes(false);
      }
    };

    loadTimes();
  }, [selectedDate]);

  const handleSave = async () => {
    if (!patientId || patientId === 0) {
      setError('Se debe seleccionar un paciente');
      return;
    }

    if (!selectedDate || !selectedTime) {
      setError('Debe seleccionar fecha y hora');
      return;
    }

    if (!appointmentFormData.appointment_type_id) {
      setError('Debe seleccionar un tipo de cita');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      // Combine date and time
      const appointmentDateTime = new Date(`${selectedDate.split('T')[0]}T${selectedTime}`);
      if (isNaN(appointmentDateTime.getTime())) {
        setError('Fecha y hora inválidas');
        return;
      }

      // Get doctor's appointment duration
      const doctorDuration = doctorProfile?.appointment_duration || 30;
      const endTime = new Date(appointmentDateTime.getTime() + doctorDuration * 60000);

      // Get doctor_id from user context or doctorProfile
      // Note: user?.doctor?.id is a string, doctorProfile?.id is a number
      const doctorId = doctorProfile?.id || (user?.doctor?.id ? Number(user.doctor.id) : 0);

      if (!doctorId || doctorId === 0) {
        setError('No se pudo identificar al doctor');
        return;
      }

      const appointmentData: AppointmentFormData = {
        patient_id: patientId,
        doctor_id: doctorId,
        appointment_date: appointmentDateTime.toISOString(),
        end_time: endTime.toISOString(),
        appointment_type_id: appointmentFormData.appointment_type_id || 1,
        office_id: appointmentFormData.office_id || undefined,
        consultation_type: 'Seguimiento',
        status: 'por_confirmar',
        // Legacy fields (deprecated)
        auto_reminder_enabled: appointmentFormData.auto_reminder_enabled || false,
        auto_reminder_offset_minutes: appointmentFormData.auto_reminder_offset_minutes || 360,
        // New multiple reminders system
        reminders: reminders.length > 0 ? reminders : undefined
      };

      if (editingAppointmentId) {
        const updated = await apiService.appointments.updateAgendaAppointment(
          String(editingAppointmentId),
          appointmentData
        );
        const normalizedUpdated = {
          ...updated,
          appointment_type_name: updated.appointment_type_rel?.name || appointmentTypes.find(type => type.id === updated.appointment_type_id)?.name || 'Seguimiento'
        };
        if (allowedStatuses.includes(normalizedUpdated.status)) {
          showSuccess('Cita actualizada exitosamente');
          setScheduledAppointments(prev => prev.map(item => (item.id === normalizedUpdated.id ? normalizedUpdated : item)));
        } else {
          setScheduledAppointments(prev => prev.filter(item => item.id !== normalizedUpdated.id));
        }
        setEditingAppointmentId(null);
        resetForm(false);
      } else {
        const created = await apiService.appointments.createAgendaAppointment(appointmentData);
        const normalizedCreated = {
          ...created,
          appointment_type_name: created.appointment_type_rel?.name || appointmentTypes.find(type => type.id === created.appointment_type_id)?.name || 'Seguimiento'
        };
        if (allowedStatuses.includes(normalizedCreated.status)) {
          showSuccess('Cita agendada exitosamente');
          setScheduledAppointments(prev => [...prev, normalizedCreated]);
        } else {
          showSuccess('Cita agendada exitosamente');
        }
        resetForm(false);
      }
    } catch (err: any) {
      logger.error('Error creating appointment', err, 'api');
      setError(err.message || 'Error al agendar la cita');
      showError(err.message || 'Error al agendar la cita');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditAppointment = (appointment: any) => {
    setEditingAppointmentId(appointment.id);
    populateFormFromAppointment(appointment);
  };

  const handleDeleteAppointment = async (appointmentId: number) => {
    try {
      await apiService.appointments.deleteAgendaAppointment(String(appointmentId));
      setScheduledAppointments(prev => prev.filter(item => item.id !== appointmentId));
      if (editingAppointmentId === appointmentId) {
        setEditingAppointmentId(null);
        resetForm(false);
      }
      showSuccess('Cita eliminada exitosamente');
    } catch (err: any) {
      logger.error('Error deleting appointment', err, 'api');
      showError(err.message || 'Error al eliminar la cita');
    }
  };

  return (
    <Box sx={{ mt: 3 }}>
      <Divider sx={{ mb: 2 }} />
      <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
        <CalendarIcon sx={{ fontSize: 20 }} />
        Agendar Cita de Seguimiento
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Card sx={{ border: '1px dashed', borderColor: 'grey.300', backgroundColor: '#fafafa' }}>
        <CardContent sx={{ p: 2 }}>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <TextField
                type="date"
                label="Fecha"
                value={selectedDate}
                onChange={(e) => {
                  setSelectedDate(e.target.value);
                  setSelectedTime(''); // Reset time when date changes
                }}
                size="small"
                fullWidth
                InputLabelProps={{ shrink: true }}
                required
              />
            </Grid>
            <Grid
              size={{ xs: 12, sm: 6, md: 3 }}
              sx={{
                flexGrow: 1,
                minWidth: { xs: '100%', sm: 200, md: 240 }
              }}
            >
              <FormControl fullWidth size="small" sx={{ minWidth: { sm: 200, md: 240 } }}>
                <InputLabel>Hora</InputLabel>
                <Select
                  value={selectedTime}
                  onChange={(e) => setSelectedTime(e.target.value)}
                  label="Hora"
                  disabled={!selectedDate || loadingTimes}
                  required
                >
                  {loadingTimes ? (
                    <MenuItem disabled>
                      <CircularProgress size={20} />
                    </MenuItem>
                  ) : availableTimes.length === 0 ? (
                    <MenuItem disabled>Sin horarios disponibles</MenuItem>
                  ) : (
                    availableTimes.map((timeSlot) => (
                      <MenuItem key={timeSlot.time} value={timeSlot.time}>
                        {timeSlot.time}
                      </MenuItem>
                    ))
                  )}
                </Select>
              </FormControl>
            </Grid>
            <Grid
              size={{ xs: 12, sm: 6, md: offices.length > 0 ? 2 : 3 }}
              sx={{ minWidth: { xs: '100%', sm: 200, md: 220 } }}
            >
              <FormControl fullWidth size="small" sx={{ minWidth: { sm: 200, md: 220 } }}>
                <InputLabel>Tipo</InputLabel>
                <Select
                  value={appointmentFormData.appointment_type_id || ''}
                  onChange={(e) => setAppointmentFormData(prev => ({ ...prev, appointment_type_id: e.target.value ? (e.target.value as number) : undefined }))}
                  label="Tipo"
                  required
                >
                  {appointmentTypes.map((type) => (
                    <MenuItem key={type.id} value={type.id}>
                      {type.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            {offices.length > 0 && (
              <Grid
                size={{ xs: 12, sm: 6, md: 2 }}
                sx={{ minWidth: { xs: '100%', sm: 200, md: 220 } }}
              >
                <FormControl fullWidth size="small" sx={{ minWidth: { sm: 200, md: 220 } }}>
                  <InputLabel>Consultorio</InputLabel>
                  <Select
                    value={appointmentFormData.office_id || ''}
                    onChange={(e) => setAppointmentFormData(prev => ({ ...prev, office_id: e.target.value ? (e.target.value as number) : undefined }))}
                    label="Consultorio"
                  >
                    {offices.map((office) => (
                      <MenuItem key={office.id} value={office.id}>
                        {office.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            )}

            {/* Reminders Configuration */}
            {selectedDate && selectedTime && (
              <Grid size={{ xs: 12 }}>
                <RemindersConfig
                  reminders={reminders}
                  onChange={setReminders}
                  appointmentDate={selectedDate && selectedTime ? `${selectedDate}T${selectedTime}` : undefined}
                  disabled={isSubmitting}
                  renderActionButton={(addReminderButton) => (
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 1,
                        mb: 2
                      }}
                    >
                      {addReminderButton}
                      <Button
                        variant="contained"
                        color="primary"
                        startIcon={<CalendarIcon />}
                        onClick={handleSave}
                        disabled={isSubmitting || !selectedDate || !selectedTime || !appointmentFormData.appointment_type_id}
                        sx={{ minWidth: '140px' }}
                      >
                        {isSubmitting ? <CircularProgress size={20} /> : (editingAppointmentId ? 'Actualizar' : 'Agendar')}
                      </Button>
                    </Box>
                  )}
                />
              </Grid>
            )}

            {/* Agendar button when reminders are not shown */}
            {(!selectedDate || !selectedTime) && (
              <Grid size={{ xs: 12 }}>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    gap: 1
                  }}
                >
                  <Button
                    variant="contained"
                    color="primary"
                    startIcon={<CalendarIcon />}
                    onClick={handleSave}
                    disabled={isSubmitting || !selectedDate || !selectedTime || !appointmentFormData.appointment_type_id}
                    sx={{ minWidth: '140px' }}
                  >
                    {isSubmitting ? <CircularProgress size={20} /> : (editingAppointmentId ? 'Actualizar' : 'Agendar')}
                  </Button>
                </Box>
              </Grid>
            )}
          </Grid>
        </CardContent>
      </Card>
      {scheduledAppointments.length > 0 && (
        <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {scheduledAppointments.map(appointment => {
            const appointmentDate = new Date(appointment.appointment_date);
            const formattedDate = appointmentDate.toLocaleDateString('es-MX', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            });
            const formattedTime = appointmentDate.toLocaleTimeString('es-MX', {
              hour: '2-digit',
              minute: '2-digit'
            });
            const appointmentTypeName = appointment.appointment_type_rel?.name || appointmentTypes.find(type => type.id === appointment.appointment_type_id)?.name || 'Seguimiento';
            const statusLabel = appointment.status === 'confirmada' ? 'Confirmada' : appointment.status === 'por_confirmar' ? 'Por confirmar' : appointment.status;
            const statusColor = appointment.status === 'confirmada' ? 'success' : 'primary';

            return (
              <Card key={appointment.id} sx={{ border: '1px solid', borderColor: 'primary.light' }}>
                <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                    {formattedDate} · {formattedTime}
                  </Typography>
                  <Chip label={statusLabel} color={statusColor as any} size="small" sx={{ alignSelf: 'flex-start' }} />
                  <Typography variant="body2" color="text.secondary">
                    Tipo: {appointmentTypeName}
                  </Typography>
                  {appointment.office_id && (
                    <Typography variant="body2" color="text.secondary">
                      Consultorio: {offices.find(office => office.id === appointment.office_id)?.name}
                    </Typography>
                  )}
                  <Typography variant="body2" color="text.secondary">
                    Estado: {APPOINTMENT_STATUS_LABELS[appointment.status as keyof typeof APPOINTMENT_STATUS_LABELS] || appointment.status}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => handleEditAppointment(appointment)}
                    >
                      Editar
                    </Button>
                    <Button
                      variant="text"
                      size="small"
                      color="error"
                      onClick={() => handleDeleteAppointment(appointment.id)}
                    >
                      Eliminar
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            );
          })}
        </Box>
      )}
    </Box>
  );
};

export default ScheduleAppointmentSection;

