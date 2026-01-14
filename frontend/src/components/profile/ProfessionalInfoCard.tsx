import React from 'react';
import {
    Card,
    CardContent,
    Typography,
    List,
    ListItem,
    ListItemIcon,
    ListItemText
} from '@mui/material';
import {
    Work as WorkIcon,
    School as SchoolIcon,
    Badge as BadgeIcon,
    LocalHospital as HospitalIcon
} from '@mui/icons-material';

interface ProfessionalDocument {
    document_name?: string;
    document_value?: string;
}

interface ProfessionalInfoCardProps {
    doctorProfile: {
        title?: string;
        specialty_name?: string;
        professional_documents?: ProfessionalDocument[];
        university?: string;
        institution?: string;
    };
}

export const ProfessionalInfoCard: React.FC<ProfessionalInfoCardProps> = ({ doctorProfile }) => {
    return (
        <Card sx={{ height: 'fit-content' }}>
            <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <WorkIcon color="primary" />
                    Información Profesional
                </Typography>

                <List dense>
                    <ListItem sx={{ px: 0 }}>
                        <ListItemIcon>
                            <WorkIcon color="action" />
                        </ListItemIcon>
                        <ListItemText
                            primary="Título Profesional"
                            secondary={doctorProfile.title || "No especificado"}
                        />
                    </ListItem>

                    <ListItem sx={{ px: 0 }}>
                        <ListItemIcon>
                            <SchoolIcon color="action" />
                        </ListItemIcon>
                        <ListItemText
                            primary="Especialidad"
                            secondary={doctorProfile.specialty_name || "No especificada"}
                        />
                    </ListItem>

                    {/* Professional Documents */}
                    {doctorProfile.professional_documents && doctorProfile.professional_documents.length > 0 ? (
                        doctorProfile.professional_documents.map((doc, index) => (
                            <ListItem key={index} sx={{ px: 0 }}>
                                <ListItemIcon>
                                    <BadgeIcon color="action" />
                                </ListItemIcon>
                                <ListItemText
                                    primary={doc.document_name || "Documento Profesional"}
                                    secondary={doc.document_value || "No especificado"}
                                />
                            </ListItem>
                        ))
                    ) : (
                        <ListItem sx={{ px: 0 }}>
                            <ListItemIcon>
                                <BadgeIcon color="action" />
                            </ListItemIcon>
                            <ListItemText
                                primary="Documento Profesional"
                                secondary="No especificado"
                            />
                        </ListItem>
                    )}

                    <ListItem sx={{ px: 0 }}>
                        <ListItemIcon>
                            <HospitalIcon color="action" />
                        </ListItemIcon>
                        <ListItemText
                            primary="Institución"
                            secondary={doctorProfile.university || doctorProfile.institution || "No especificada"}
                        />
                    </ListItem>
                </List>
            </CardContent>
        </Card>
    );
};
