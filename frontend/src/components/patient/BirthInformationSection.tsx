import React from 'react';
import { Box, Typography, TextField, FormControl, InputLabel, Select, MenuItem, FormHelperText } from '@mui/material';
import { Person as PersonIcon } from '@mui/icons-material';

interface BirthInformationSectionProps {
    formData: {
        birth_city?: string;
        birth_country_id?: string;
        birth_state_id?: string;
    };
    errors: { [key: string]: string };
    countries: Array<{ id: number; name: string }>;
    birthStates: Array<{ id: number; name: string }>;
    onChange: (field: string) => (event: any) => void;
    onCountryChange: (field: string, value: string) => void;
}

export const BirthInformationSection: React.FC<BirthInformationSectionProps> = ({
    formData,
    errors,
    countries,
    birthStates,
    onChange,
    onCountryChange
}) => {
    return (
        <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <PersonIcon sx={{ fontSize: 20 }} />
                Información de Nacimiento
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                <TextField
                    label="Ciudad de Nacimiento - opcional"
                    name="birth_city"
                    value={formData.birth_city}
                    onChange={onChange('birth_city')}
                    size="small"
                    placeholder="Ciudad de Nacimiento - opcional"
                    error={!!errors.birth_city}
                    helperText={errors.birth_city}
                />

                <FormControl size="small" error={!!errors.birth_country_id}>
                    <InputLabel>País de Nacimiento - opcional</InputLabel>
                    <Select
                        value={formData.birth_country_id}
                        onChange={(e) => onCountryChange('birth_country_id', e.target.value as string)}
                        label="País de Nacimiento - opcional"
                    >
                        {countries.map((country) => (
                            <MenuItem key={country.id} value={country.id.toString()}>
                                {country.name}
                            </MenuItem>
                        ))}
                    </Select>
                    {errors.birth_country_id && <FormHelperText>{errors.birth_country_id}</FormHelperText>}
                </FormControl>

                <FormControl size="small" error={!!errors.birth_state_id}>
                    <InputLabel>Estado de Nacimiento - opcional</InputLabel>
                    <Select
                        value={formData.birth_state_id}
                        onChange={onChange('birth_state_id')}
                        label="Estado de Nacimiento - opcional"
                        disabled={!formData.birth_country_id}
                    >
                        {birthStates.map((state) => (
                            <MenuItem key={state.id} value={state.id.toString()}>
                                {state.name}
                            </MenuItem>
                        ))}
                    </Select>
                    {errors.birth_state_id && <FormHelperText>{errors.birth_state_id}</FormHelperText>}
                </FormControl>
            </Box>
        </Box>
    );
};
