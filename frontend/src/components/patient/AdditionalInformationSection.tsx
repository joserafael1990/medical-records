import React from 'react';
import { Box, Typography, Button, FormControl, InputLabel, Select, MenuItem, FormHelperText } from '@mui/material';
import { Badge as BadgeIcon } from '@mui/icons-material';
import { DocumentSelector } from '../common/DocumentSelector';

interface AdditionalInformationSectionProps {
    formData: {
        civil_status?: string;
    };
    personalDocuments: Array<{ document_id: number | null; document_value: string }>;
    errors: { [key: string]: string };
    onChange: (field: string) => (event: any) => void;
    onDocumentsChange: (documents: Array<{ document_id: number | null; document_value: string }>) => void;
}

export const AdditionalInformationSection: React.FC<AdditionalInformationSectionProps> = ({
    formData,
    personalDocuments,
    errors,
    onChange,
    onDocumentsChange
}) => {
    return (
        <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <BadgeIcon sx={{ fontSize: 20 }} />
                Información Adicional
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {/* Documentos Personales */}
                {personalDocuments.map((doc, index) => (
                    <Box key={index} sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                        <Box sx={{ flex: 1 }}>
                            <DocumentSelector
                                documentType="personal"
                                value={doc}
                                onChange={(docValue) => {
                                    const newDocs = [...personalDocuments];
                                    newDocs[index] = docValue;
                                    onDocumentsChange(newDocs);
                                }}
                                label="Documento Personal"
                                helperText="Opcional"
                            />
                        </Box>
                        {personalDocuments.length > 1 && (
                            <Button
                                size="small"
                                onClick={() => {
                                    const newDocs = personalDocuments.filter((_, i) => i !== index);
                                    if (newDocs.length === 0) {
                                        onDocumentsChange([{ document_id: null, document_value: '' }]);
                                    } else {
                                        onDocumentsChange(newDocs);
                                    }
                                }}
                                sx={{ mt: '32px' }}
                            >
                                Eliminar
                            </Button>
                        )}
                    </Box>
                ))}

                {/* Botón para agregar más documentos */}
                <Button
                    size="small"
                    variant="outlined"
                    onClick={() => {
                        onDocumentsChange([...personalDocuments, { document_id: null, document_value: '' }]);
                    }}
                >
                    + Agregar otro documento personal
                </Button>
            </Box>

            <FormControl size="small" error={!!errors.civil_status} fullWidth sx={{ mt: 2 }}>
                <InputLabel id="civil-status-label">Estado Civil - opcional</InputLabel>
                <Select
                    name="civil_status"
                    value={formData.civil_status}
                    labelId="civil-status-label"
                    label="Estado Civil - opcional"
                    onChange={onChange('civil_status')}
                >
                    <MenuItem value=""><em>Seleccione</em></MenuItem>
                    <MenuItem value="single">Soltero(a)</MenuItem>
                    <MenuItem value="married">Casado(a)</MenuItem>
                    <MenuItem value="divorced">Divorciado(a)</MenuItem>
                    <MenuItem value="widowed">Viudo(a)</MenuItem>
                    <MenuItem value="free_union">Unión libre</MenuItem>
                </Select>
                {errors.civil_status && <FormHelperText>{errors.civil_status}</FormHelperText>}
            </FormControl>
        </Box>
    );
};
