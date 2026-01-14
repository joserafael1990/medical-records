import React from 'react';
import { Box, Typography, TextField, FormControl, InputLabel, Select, MenuItem, FormHelperText } from '@mui/material';
import { Phone as PhoneIcon } from '@mui/icons-material';

interface EmergencyContactSectionProps {
    formData: {
        emergency_contact_name?: string;
        emergency_contact_phone?: string;
        emergency_contact_relationship?: string;
    };
    errors: { [key: string]: string };
    emergencyRelationships: Array<{ code: string; name: string }>;
    onChange: (field: string) => (event: any) => void;
}

export const EmergencyContactSection: React.FC<EmergencyContactSectionProps> = ({
    formData,
    errors,
    emergencyRelationships,
    onChange
}) => {
    return (
        <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <PhoneIcon sx={{ fontSize: 20 }} />
                Contacto de Emergencia
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                <TextField
                    label="Nombre del Contacto - opcional"
                    name="emergency_contact_name"
                    value={formData.emergency_contact_name}
                    onChange={onChange('emergency_contact_name')}
                    size="small"
                    placeholder="Nombre del Contacto - opcional"
                    error={!!errors.emergency_contact_name}
                    helperText={errors.emergency_contact_name}
                />
                <TextField
                    label="Teléfono del Contacto - opcional"
                    name="emergency_contact_phone"
                    value={formData.emergency_contact_phone}
                    onChange={onChange('emergency_contact_phone')}
                    size="small"
                    placeholder="Teléfono del Contacto - opcional"
                    error={!!errors.emergency_contact_phone}
                    helperText={errors.emergency_contact_phone}
                />
                <FormControl size="small" error={!!errors.emergency_contact_relationship} fullWidth>
                    <InputLabel id="emergency-relationship-label">Relación con el Paciente - opcional</InputLabel>
                    <Select
                        name="emergency_contact_relationship"
                        value={formData.emergency_contact_relationship}
                        labelId="emergency-relationship-label"
                        label="Relación con el Paciente - opcional"
                        onChange={onChange('emergency_contact_relationship')}
                        sx={{ gridColumn: '1 / -1' }}
                    >
                        <MenuItem value=""><em>Seleccione</em></MenuItem>
                        {emergencyRelationships.map((relationship) => (
                            <MenuItem key={relationship.code} value={relationship.code}>
                                {relationship.name}
                            </MenuItem>
                        ))}
                    </Select>
                    {errors.emergency_contact_relationship && <FormHelperText>{errors.emergency_contact_relationship}</FormHelperText>}
                </FormControl>
            </Box>
        </Box>
    );
};
