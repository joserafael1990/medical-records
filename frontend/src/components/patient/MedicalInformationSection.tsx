import React from 'react';
import { Box, Typography, TextField } from '@mui/material';
import { Badge as BadgeIcon } from '@mui/icons-material';

interface MedicalInformationSectionProps {
    formData: {
        insurance_provider?: string;
        insurance_number?: string;
    };
    errors: { [key: string]: string };
    onChange: (field: string) => (event: any) => void;
}

export const MedicalInformationSection: React.FC<MedicalInformationSectionProps> = ({
    formData,
    errors,
    onChange
}) => {
    return (
        <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <BadgeIcon sx={{ fontSize: 20 }} />
                Información Médica
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                <TextField
                    label="Proveedor de Seguro - opcional"
                    name="insurance_provider"
                    value={formData.insurance_provider}
                    onChange={onChange('insurance_provider')}
                    size="small"
                    placeholder="Proveedor de Seguro - opcional"
                    error={!!errors.insurance_provider}
                    helperText={errors.insurance_provider}
                />
                <TextField
                    label="Código de Seguro - opcional"
                    name="insurance_number"
                    value={formData.insurance_number}
                    onChange={onChange('insurance_number')}
                    size="small"
                    placeholder="Código de Seguro - opcional"
                    error={!!errors.insurance_number}
                    helperText={errors.insurance_number}
                    inputProps={{
                        autoComplete: 'new-password',
                        'data-form-type': 'other',
                        'data-lpignore': 'true',
                        'data-1p-ignore': 'true',
                        'data-bwignore': 'true',
                        'data-autofill': 'off',
                        autoCapitalize: 'off',
                        autoCorrect: 'off',
                        spellCheck: false,
                        'name': 'medical_insurance_code',
                        'id': 'medical_insurance_code',
                        'type': 'text',
                        'role': 'textbox',
                        'aria-label': 'Código de seguro médico'
                    }}
                />
            </Box>
        </Box>
    );
};
