import React from 'react';
import {
    Box,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Typography,
    CircularProgress,
    Alert
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { Language as LanguageIcon, LocationOn as LocationIcon } from '@mui/icons-material';
import { getMediumSelectMenuProps } from '../../utils/selectMenuProps';
import { AppointmentFormData, Office, TimeSlot } from '../../types';

interface AppointmentFormFieldsProps {
    formData: AppointmentFormData;
    offices: Office[];
    availableTimes: TimeSlot[];
    loadingTimes: boolean;
    selectedDate: string | null;
    selectedTime: string | null;
    onFieldChange: (field: keyof AppointmentFormData) => (event: any) => void;
    onDateChange: (date: Date | null) => void;
    onTimeChange: (time: string) => void;
    disabled?: boolean;
}

export const AppointmentFormFields: React.FC<AppointmentFormFieldsProps> = ({
    formData,
    offices,
    availableTimes,
    loadingTimes,
    selectedDate,
    selectedTime,
    onFieldChange,
    onDateChange,
    onTimeChange,
    disabled
}) => {
    return (
        <>
            {/* 1. TIPO DE CONSULTA */}
            <FormControl fullWidth required disabled={disabled}>
                <InputLabel>Tipo de Consulta</InputLabel>
                <Select
                    value={formData.consultation_type || ''}
                    onChange={onFieldChange('consultation_type')}
                    label="Tipo de Consulta"
                    MenuProps={getMediumSelectMenuProps()}
                >
                    <MenuItem value=""><em>Seleccione un tipo</em></MenuItem>
                    <MenuItem value="Primera vez">Primera vez</MenuItem>
                    <MenuItem value="Seguimiento">Seguimiento</MenuItem>
                </Select>
            </FormControl>

            {/* 2. CONSULTORIO */}
            <FormControl size="small" fullWidth required disabled={disabled}>
                <InputLabel>Consultorio</InputLabel>
                <Select
                    value={(offices.some(o => o.id === (formData.office_id as any)) ? formData.office_id : 0) || 0}
                    onChange={onFieldChange('office_id')}
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

            {/* 3. FECHA Y HORA */}
            <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
                <DatePicker
                    label="Fecha de la cita"
                    value={formData.appointment_date ? new Date(formData.appointment_date) : new Date()}
                    onChange={onDateChange}
                    disabled={disabled}
                    slotProps={{
                        textField: {
                            fullWidth: true,
                            required: true
                        }
                    }}
                />

                <FormControl fullWidth required disabled={disabled}>
                    <InputLabel>Hora de la cita</InputLabel>
                    <Select
                        value={selectedTime || ''}
                        onChange={(e) => onTimeChange(e.target.value as string)}
                        disabled={loadingTimes || disabled}
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
        </>
    );
};
