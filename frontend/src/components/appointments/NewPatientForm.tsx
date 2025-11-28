import React from 'react';
import { Box, Typography, TextField } from '@mui/material';
import { PhoneNumberInput } from '../common/PhoneNumberInput';

interface NewPatientData {
    name: string;
    phone_number: string;
    phone_country_code: string;
}

interface NewPatientFormProps {
    data: NewPatientData;
    onChange: (data: NewPatientData) => void;
    disabled?: boolean;
}

export const NewPatientForm: React.FC<NewPatientFormProps> = ({
    data,
    onChange,
    disabled
}) => {
    const handleChange = (field: keyof NewPatientData, value: string) => {
        onChange({
            ...data,
            [field]: value
        });
    };

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, p: 2, border: 1, borderColor: 'divider', borderRadius: 1 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                Datos básicos del nuevo paciente
            </Typography>

            <TextField
                fullWidth
                label="Nombre Completo *"
                value={data.name}
                onChange={(e) => handleChange('name', e.target.value)}
                required
                size="small"
                placeholder="Ingresa el nombre completo (nombre y apellidos)"
                helperText="Ingresa al menos nombre y apellido"
                disabled={disabled}
            />

            <PhoneNumberInput
                countryCode={data.phone_country_code}
                phoneNumber={data.phone_number}
                onCountryCodeChange={(code) => handleChange('phone_country_code', code)}
                onPhoneNumberChange={(number) => {
                    const value = number.replace(/\D/g, '');
                    handleChange('phone_number', value);
                }}
                label="Número telefónico *"
                required
                placeholder="Ej: 222 123 4567"
                fullWidth
                disabled={disabled}
            />
        </Box>
    );
};
