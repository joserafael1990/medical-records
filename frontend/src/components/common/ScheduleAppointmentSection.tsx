import React, { useState, useEffect } from 'react';
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
  Divider
} from '@mui/material';
import {
  CalendarToday as CalendarIcon,
  AccessTime as TimeIcon,
  LocationOn as LocationIcon
} from '@mui/icons-material';
import { apiService } from '../../services';
import { AppointmentFormData, AppointmentType, Office } from '../../types';
import { useToast } from '../common/ToastNotification';
import { useAuth } from '../../contexts/AuthContext';

interface ScheduleAppointmentSectionProps {
  patientId: number;
  doctorProfile?: any;
}

const ScheduleAppointmentSection: React.FC<ScheduleAppointmentSectionProps> = ({
  patientId,
  doctorProfile
}) => {
  const { showSuccess, showError } = useToast();
  const { user } = useAuth();
  const [appointmentFormData, setAppointmentFormData] = useState<Partial<AppointmentFormData>>({
    appointment_date: '',
    appointment_type_id: 0,
    office_id: 0,
    reason: '',
    notes: '',
    consultation_type: 'Seguimiento',
    status: 'confirmed',
    priority: 'normal'
  });
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [availableTimes, setAvailableTimes] = useState<any[]>([]);
  const [loadingTimes, setLoadingTimes] = useState(false);
  const [appointmentTypes, setAppointmentTypes] = useState<AppointmentType[]>([]);
  const [offices, setOffices] = useState<Office[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
          setAppointmentFormData(prev => ({ ...prev, office_id: officesData[0].id || 0 }));
        }
      } catch (err) {
        console.error('Error loading appointment data:', err);
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
        console.error('Error loading available times:', err);
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
    
    if (!appointmentFormData.appointment_type_id || appointmentFormData.appointment_type_id === 0) {
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
      const doctorId = user?.doctor?.id || doctorProfile?.id || user?.id || 0;
      
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
        status: 'confirmed',
        priority: 'normal',
        reason: appointmentFormData.reason || 'Consulta de seguimiento',
        notes: appointmentFormData.notes || '',
        // WhatsApp auto reminder fields (include if present in form data)
        auto_reminder_enabled: appointmentFormData.auto_reminder_enabled || false,
        auto_reminder_offset_minutes: appointmentFormData.auto_reminder_offset_minutes || 360
      };
      
      await apiService.appointments.createAgendaAppointment(appointmentData);
      showSuccess('Cita agendada exitosamente');
      
      // Clear form
      setAppointmentFormData({
        appointment_date: '',
        appointment_type_id: appointmentFormData.appointment_type_id, // Keep type
        office_id: appointmentFormData.office_id, // Keep office
        reason: '',
        notes: '',
        consultation_type: 'Seguimiento',
        status: 'confirmed',
        priority: 'normal'
      });
      setSelectedDate('');
      setSelectedTime('');
      setAvailableTimes([]);
    } catch (err: any) {
      console.error('Error creating appointment:', err);
      setError(err.message || 'Error al agendar la cita');
      showError(err.message || 'Error al agendar la cita');
    } finally {
      setIsSubmitting(false);
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
            <Grid item xs={12} sm={6} md={3}>
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
            <Grid item xs={12} sm={6} md={2}>
              <FormControl fullWidth size="small">
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
            <Grid item xs={12} sm={6} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Tipo</InputLabel>
                <Select
                  value={appointmentFormData.appointment_type_id || 0}
                  onChange={(e) => setAppointmentFormData(prev => ({ ...prev, appointment_type_id: e.target.value as number }))}
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
              <Grid item xs={12} sm={6} md={2}>
                <FormControl fullWidth size="small">
                  <InputLabel>Oficina</InputLabel>
                  <Select
                    value={appointmentFormData.office_id || 0}
                    onChange={(e) => setAppointmentFormData(prev => ({ ...prev, office_id: e.target.value as number }))}
                    label="Oficina"
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
            <Grid item xs={12} sm={6} md={offices.length > 0 ? 3 : 5}>
              <TextField
                placeholder="Motivo (opcional)"
                value={appointmentFormData.reason || ''}
                onChange={(e) => setAppointmentFormData(prev => ({ ...prev, reason: e.target.value }))}
                size="small"
                fullWidth
              />
            </Grid>
            <Grid item xs={12} md={2}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<CalendarIcon />}
                  onClick={handleSave}
                  disabled={isSubmitting || !selectedDate || !selectedTime || !appointmentFormData.appointment_type_id}
                  sx={{ minWidth: '140px' }}
                >
                  {isSubmitting ? <CircularProgress size={20} /> : 'Agendar'}
                </Button>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </Box>
  );
};

export default ScheduleAppointmentSection;

