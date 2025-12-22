import React from 'react';
import {
    Box,
    Typography,
    Autocomplete,
    TextField,
    Avatar
} from '@mui/material';
import { Person as PersonIcon } from '@mui/icons-material';
import { Patient } from '../../types';
import { formatPatientNameWithAge } from '../../hooks/useAppointmentMultiOfficeForm';

interface PatientSelectorProps {
    patients: Patient[];
    selectedPatientId?: number;
    onPatientSelect: (patientId: number) => void;
    error?: string;
    disabled?: boolean;
}

export const PatientSelector: React.FC<PatientSelectorProps> = ({
    patients,
    selectedPatientId,
    onPatientSelect,
    error,
    disabled
}) => {
    const selectedPatient = patients.find(p => p.id === selectedPatientId) || null;

    // Debug logging
    console.log('🔍 PatientSelector:', {
        selectedPatientId,
        selectedPatientId_type: typeof selectedPatientId,
        patientsCount: patients.length,
        patientIds: patients.slice(0, 5).map(p => ({ id: p.id, id_type: typeof p.id })),
        selectedPatient: selectedPatient ? { id: selectedPatient.id, name: selectedPatient.name } : null
    });

    return (
        <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                <PersonIcon sx={{ fontSize: 20 }} />
                Paciente
                <Typography component="span" sx={{ color: 'error.main', ml: 0.5 }}>*</Typography>
            </Typography>

            {patients.length === 0 ? (
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
                    options={patients}
                    getOptionLabel={(option) => formatPatientNameWithAge(option)}
                    isOptionEqualToValue={(option, value) => option.id === value.id}
                    value={selectedPatient}
                    onChange={(_, newValue) => {
                        if (newValue) {
                            onPatientSelect(newValue.id);
                        }
                    }}
                    disabled={disabled}
                    renderInput={(params) => (
                        <TextField
                            {...params}
                            label="Seleccionar Paciente"
                            required
                            error={!!error && !selectedPatientId}
                            helperText={error && !selectedPatientId ? 'Campo requerido' : ''}
                        />
                    )}
                    renderOption={(props, option) => {
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
                    loading={patients.length === 0}
                    loadingText="Cargando pacientes..."
                    noOptionsText="No se encontraron pacientes"
                />
            )}
        </Box>
    );
};
