import React from 'react';
import {
    Card,
    CardContent,
    Typography,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
    Divider
} from '@mui/material';
import {
    Work as WorkIcon,
    School as SchoolIcon,
    Badge as BadgeIcon,
    LocalHospital as HospitalIcon,
    Schedule as ScheduleIcon
} from '@mui/icons-material';

interface ProfessionalDocument {
    document_name?: string;
    document_value?: string;
}

interface ProfessionalInfoCardProps {
    doctorProfile: {
        title?: string;
        specialty_name?: string;
        professional_license?: string;
        professional_documents?: ProfessionalDocument[];
        university?: string;
        institution?: string;
        appointment_duration?: number;
    };
}

export const ProfessionalInfoCard: React.FC<ProfessionalInfoCardProps> = ({ doctorProfile }) => {
    const docs = doctorProfile.professional_documents ?? [];

    // If professional_license exists but isn't already listed in professional_documents, show it explicitly
    const licenseAlreadyInDocs = docs.some(
        d => d.document_value && d.document_value === doctorProfile.professional_license
    );
    const showLicenseFallback = !!doctorProfile.professional_license && !licenseAlreadyInDocs;

    return (
        <Card sx={{ height: 'fit-content' }}>
            <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <WorkIcon color="primary" />
                    Información Profesional
                </Typography>

                <List dense>
                    <ListItem sx={{ px: 0 }}>
                        <ListItemIcon><WorkIcon color="action" /></ListItemIcon>
                        <ListItemText primary="Título Profesional" secondary={doctorProfile.title || 'No especificado'} />
                    </ListItem>

                    <ListItem sx={{ px: 0 }}>
                        <ListItemIcon><SchoolIcon color="action" /></ListItemIcon>
                        <ListItemText primary="Especialidad" secondary={doctorProfile.specialty_name || 'No especificada'} />
                    </ListItem>

                    <ListItem sx={{ px: 0 }}>
                        <ListItemIcon><HospitalIcon color="action" /></ListItemIcon>
                        <ListItemText
                            primary="Universidad / Institución"
                            secondary={doctorProfile.university || doctorProfile.institution || 'No especificada'}
                        />
                    </ListItem>

                    <ListItem sx={{ px: 0 }}>
                        <ListItemIcon><ScheduleIcon color="action" /></ListItemIcon>
                        <ListItemText
                            primary="Duración de consulta"
                            secondary={doctorProfile.appointment_duration ? `${doctorProfile.appointment_duration} minutos` : 'No especificada'}
                        />
                    </ListItem>

                    {/* Professional documents (cédula, matrícula, etc.) */}
                    <Divider sx={{ my: 1 }} />
                    <Typography variant="caption" color="text.secondary" sx={{ px: 0, pb: 0.5, display: 'block' }}>
                        Documentos profesionales
                    </Typography>

                    {showLicenseFallback && (
                        <ListItem sx={{ px: 0 }}>
                            <ListItemIcon><BadgeIcon color="action" /></ListItemIcon>
                            <ListItemText primary="Cédula / Licencia Profesional" secondary={doctorProfile.professional_license} />
                        </ListItem>
                    )}

                    {docs.length > 0 ? (
                        docs.map((doc, index) => (
                            <ListItem key={index} sx={{ px: 0 }}>
                                <ListItemIcon><BadgeIcon color="action" /></ListItemIcon>
                                <ListItemText
                                    primary={doc.document_name || 'Documento Profesional'}
                                    secondary={doc.document_value || 'No especificado'}
                                />
                            </ListItem>
                        ))
                    ) : !showLicenseFallback && (
                        <ListItem sx={{ px: 0 }}>
                            <ListItemIcon><BadgeIcon color="action" /></ListItemIcon>
                            <ListItemText primary="Cédula Profesional" secondary="No registrada — agrégala con Editar Datos" />
                        </ListItem>
                    )}
                </List>
            </CardContent>
        </Card>
    );
};
