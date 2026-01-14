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
    Person as PersonIcon,
    Email as EmailIcon,
    Phone as PhoneIcon,
    Badge as BadgeIcon
} from '@mui/icons-material';

interface PersonalInfoCardProps {
    doctorProfile: {
        name?: string;
        email?: string;
        primary_phone?: string;
        phone?: string;
        personal_documents?: Record<string, any>;
        curp?: string;
    };
}

export const PersonalInfoCard: React.FC<PersonalInfoCardProps> = ({ doctorProfile }) => {
    return (
        <Card sx={{ height: 'fit-content' }}>
            <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <PersonIcon color="primary" />
                    Información Personal
                </Typography>

                <List dense>
                    <ListItem sx={{ px: 0 }}>
                        <ListItemIcon>
                            <PersonIcon color="action" />
                        </ListItemIcon>
                        <ListItemText
                            primary="Nombre Completo"
                            secondary={doctorProfile.name || 'No especificado'}
                        />
                    </ListItem>

                    <ListItem sx={{ px: 0 }}>
                        <ListItemIcon>
                            <EmailIcon color="action" />
                        </ListItemIcon>
                        <ListItemText
                            primary="Email"
                            secondary={doctorProfile.email || "No especificado"}
                        />
                    </ListItem>

                    <ListItem sx={{ px: 0 }}>
                        <ListItemIcon>
                            <PhoneIcon color="action" />
                        </ListItemIcon>
                        <ListItemText
                            primary="Teléfono"
                            secondary={doctorProfile.primary_phone || doctorProfile.phone || "No especificado"}
                        />
                    </ListItem>

                    {/* Personal Documents */}
                    {doctorProfile.personal_documents && Object.keys(doctorProfile.personal_documents).length > 0 ? (
                        Object.entries(doctorProfile.personal_documents).map(([docName, docValue]: [string, any]) => (
                            <ListItem key={docName} sx={{ px: 0 }}>
                                <ListItemIcon>
                                    <BadgeIcon color="action" />
                                </ListItemIcon>
                                <ListItemText
                                    primary={docName}
                                    secondary={docValue || "No especificado"}
                                />
                            </ListItem>
                        ))
                    ) : doctorProfile.curp ? (
                        <ListItem sx={{ px: 0 }}>
                            <ListItemIcon>
                                <BadgeIcon color="action" />
                            </ListItemIcon>
                            <ListItemText
                                primary="CURP"
                                secondary={doctorProfile.curp}
                            />
                        </ListItem>
                    ) : null}
                </List>
            </CardContent>
        </Card>
    );
};
