import React from 'react';
import { Box, Typography, TextField, FormControl, InputLabel, Select, MenuItem, FormHelperText } from '@mui/material';
import { Person as PersonIcon } from '@mui/icons-material';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { es } from 'date-fns/locale';

interface BasicInformationSectionProps {
    formData: {
        name: string;
        birth_date?: string;
        gender?: string;
    };
    errors: { [key: string]: string };
    onChange: (field: string) => (event: any) => void;
}

export const BasicInformationSection: React.FC<BasicInformationSectionProps> = ({
    formData,
    errors,
    onChange
}) => {
    return (
        <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <PersonIcon sx={{ fontSize: 20 }} />
                Información Básica
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: '1fr 1fr' }, gap: 2 }}>
                <TextField
                    label="Nombre Completo"
                    name="name"
                    value={formData.name}
                    onChange={onChange('name')}
                    size="small"
                    required
                    placeholder="Ingresa el nombre completo (nombre y apellidos)"
                    error={!!errors.name}
                    helperText={errors.name || 'Ingresa al menos nombre y apellido'}
                    sx={{ gridColumn: { xs: '1', sm: '1 / -1' } }}
                />

                <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={es}>
                    <DatePicker
                        label="Fecha de Nacimiento - opcional"
                        value={formData.birth_date ? new Date(formData.birth_date) : null}
                        onChange={(newValue) => {
                            if (newValue) {
                                const formattedDate = newValue.toISOString().split('T')[0];
                                onChange('birth_date')({ target: { value: formattedDate } } as any);
                            } else {
                                onChange('birth_date')({ target: { value: '' } } as any);
                            }
                        }}
                        slotProps={{
                            textField: {
                                size: "small",
                                error: !!errors.birth_date,
                                helperText: errors.birth_date,
                                fullWidth: true
                            }
                        }}
                    />
                </LocalizationProvider>
                <FormControl size="small" error={!!errors.gender} fullWidth>
                    <InputLabel id="gender-label">Género - obligatorio</InputLabel>
                    <Select
                        name="gender"
                        value={formData.gender}
                        labelId="gender-label"
                        label="Género - obligatorio"
                        required
                        onChange={onChange('gender')}
                        sx={{ minWidth: 120 }}
                    >
                        <MenuItem value=""><em>Seleccione</em></MenuItem>
                        <MenuItem value="Masculino">Masculino</MenuItem>
                        <MenuItem value="Femenino">Femenino</MenuItem>
                        <MenuItem value="Otro">Otro</MenuItem>
                    </Select>
                    {errors.gender && <FormHelperText>{errors.gender}</FormHelperText>}
                </FormControl>
            </Box>
        </Box>
    );
};
