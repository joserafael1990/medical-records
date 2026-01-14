import React from 'react';
import { Box, Typography, TextField, FormControl, InputLabel, Select, MenuItem, FormHelperText } from '@mui/material';
import { Phone as PhoneIcon } from '@mui/icons-material';
import { PhoneNumberInput } from '../common/PhoneNumberInput';

interface ContactInformationSectionProps {
    formData: {
        email?: string;
        home_address?: string;
        address_city?: string;
        address_postal_code?: string;
        address_country_id?: string;
        address_state_id?: string;
    };
    phoneCountryCode: string;
    phoneNumber: string;
    errors: { [key: string]: string };
    countries: Array<{ id: number; name: string }>;
    states: Array<{ id: number; name: string }>;
    onChange: (field: string) => (event: any) => void;
    onPhoneChange: (countryCode: string, phoneNumber: string) => void;
    onCountryChange: (field: string, value: string) => void;
}

export const ContactInformationSection: React.FC<ContactInformationSectionProps> = ({
    formData,
    phoneCountryCode,
    phoneNumber,
    errors,
    countries,
    states,
    onChange,
    onPhoneChange,
    onCountryChange
}) => {
    return (
        <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <PhoneIcon sx={{ fontSize: 20 }} />
                Información de Contacto
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                <Box sx={{ gridColumn: { xs: '1 / -1', sm: '1' } }}>
                    <PhoneNumberInput
                        countryCode={phoneCountryCode}
                        phoneNumber={phoneNumber}
                        onCountryCodeChange={(code) => onPhoneChange(code, phoneNumber)}
                        onPhoneNumberChange={(number) => onPhoneChange(phoneCountryCode, number)}
                        label="Número telefónico *"
                        required
                        placeholder="Ej: 222 123 4567"
                        fullWidth
                        error={!!errors.primary_phone}
                        helperText={errors.primary_phone}
                    />
                </Box>
                <TextField
                    label="Email - opcional"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={onChange('email')}
                    size="small"
                    placeholder="Email - opcional"
                    error={!!errors.email}
                    helperText={errors.email}
                />

                <TextField
                    label="Dirección - opcional"
                    name="home_address"
                    value={formData.home_address}
                    onChange={onChange('home_address')}
                    size="small"
                    fullWidth
                    sx={{ gridColumn: '1 / -1' }}
                    placeholder="Dirección - opcional"
                    error={!!errors.home_address}
                    helperText={errors.home_address}
                />

                <TextField
                    label="Ciudad - opcional"
                    name="address_city"
                    value={formData.address_city}
                    onChange={onChange('address_city')}
                    size="small"
                    placeholder="Ciudad - opcional"
                    error={!!errors.address_city}
                    helperText={errors.address_city}
                />

                <TextField
                    label="Código Postal - opcional"
                    name="address_postal_code"
                    value={formData.address_postal_code}
                    onChange={onChange('address_postal_code')}
                    size="small"
                    inputProps={{ maxLength: 5 }}
                    placeholder="Código Postal - opcional"
                    error={!!errors.address_postal_code}
                    helperText={errors.address_postal_code}
                />

                <FormControl size="small" error={!!errors.address_country_id}>
                    <InputLabel>País - opcional</InputLabel>
                    <Select
                        value={formData.address_country_id}
                        onChange={(e) => onCountryChange('address_country_id', e.target.value as string)}
                        label="País - opcional"
                    >
                        {countries.map((country) => (
                            <MenuItem key={country.id} value={country.id.toString()}>
                                {country.name}
                            </MenuItem>
                        ))}
                    </Select>
                    {errors.address_country_id && <FormHelperText>{errors.address_country_id}</FormHelperText>}
                </FormControl>

                <FormControl size="small" error={!!errors.address_state_id}>
                    <InputLabel>Estado - opcional</InputLabel>
                    <Select
                        value={formData.address_state_id}
                        onChange={onChange('address_state_id')}
                        label="Estado - opcional"
                        disabled={!formData.address_country_id}
                    >
                        {states.map((state) => (
                            <MenuItem key={state.id} value={state.id.toString()}>
                                {state.name}
                            </MenuItem>
                        ))}
                    </Select>
                    {errors.address_state_id && <FormHelperText>{errors.address_state_id}</FormHelperText>}
                </FormControl>
            </Box>
        </Box>
    );
};
