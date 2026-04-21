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
    Person as PersonIcon,
    Email as EmailIcon,
    Phone as PhoneIcon,
    Badge as BadgeIcon,
    Cake as CakeIcon,
    Wc as GenderIcon,
    Favorite as CivilIcon,
    Home as HomeIcon
} from '@mui/icons-material';

interface PersonalInfoCardProps {
    doctorProfile: {
        name?: string;
        email?: string;
        primary_phone?: string;
        phone?: string;
        birth_date?: string;
        gender?: string;
        civil_status?: string;
        home_address?: string;
        address_city?: string;
        address_state_name?: string;
        address_postal_code?: string;
        curp?: string;
        personal_documents?: Record<string, any>;
    };
}

const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'No especificado';
    try {
        return new Date(dateStr).toLocaleDateString('es-MX', {
            year: 'numeric', month: 'long', day: 'numeric'
        });
    } catch {
        return dateStr;
    }
};

const GENDER_LABELS: Record<string, string> = {
    M: 'Masculino', F: 'Femenino', O: 'Otro',
    male: 'Masculino', female: 'Femenino', other: 'Otro'
};

export const PersonalInfoCard: React.FC<PersonalInfoCardProps> = ({ doctorProfile }) => {
    const phone = doctorProfile.primary_phone || doctorProfile.phone;

    const addressParts = [
        doctorProfile.home_address,
        doctorProfile.address_city,
        doctorProfile.address_state_name,
        doctorProfile.address_postal_code
    ].filter(Boolean);
    const address = addressParts.join(', ');

    // personal_documents is a dict from the backend (e.g. {"CURP": "...", "RFC": "..."})
    const personalDocs = doctorProfile.personal_documents ?? {};
    const docEntries = Object.entries(personalDocs).filter(([, v]) => v);
    const curpInDocs = Object.keys(personalDocs).some(k => k.toUpperCase() === 'CURP');
    const showCurpFallback = !curpInDocs && !!doctorProfile.curp;

    return (
        <Card sx={{ height: 'fit-content' }}>
            <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <PersonIcon color="primary" />
                    Información Personal
                </Typography>

                <List dense>
                    <ListItem sx={{ px: 0 }}>
                        <ListItemIcon><PersonIcon color="action" /></ListItemIcon>
                        <ListItemText primary="Nombre Completo" secondary={doctorProfile.name || 'No especificado'} />
                    </ListItem>

                    <ListItem sx={{ px: 0 }}>
                        <ListItemIcon><EmailIcon color="action" /></ListItemIcon>
                        <ListItemText primary="Email" secondary={doctorProfile.email || 'No especificado'} />
                    </ListItem>

                    <ListItem sx={{ px: 0 }}>
                        <ListItemIcon><PhoneIcon color="action" /></ListItemIcon>
                        <ListItemText primary="Teléfono" secondary={phone || 'No especificado'} />
                    </ListItem>

                    <ListItem sx={{ px: 0 }}>
                        <ListItemIcon><CakeIcon color="action" /></ListItemIcon>
                        <ListItemText primary="Fecha de nacimiento" secondary={formatDate(doctorProfile.birth_date)} />
                    </ListItem>

                    <ListItem sx={{ px: 0 }}>
                        <ListItemIcon><GenderIcon color="action" /></ListItemIcon>
                        <ListItemText
                            primary="Género"
                            secondary={GENDER_LABELS[doctorProfile.gender ?? ''] || doctorProfile.gender || 'No especificado'}
                        />
                    </ListItem>

                    <ListItem sx={{ px: 0 }}>
                        <ListItemIcon><CivilIcon color="action" /></ListItemIcon>
                        <ListItemText primary="Estado civil" secondary={doctorProfile.civil_status || 'No especificado'} />
                    </ListItem>

                    {address && (
                        <ListItem sx={{ px: 0 }}>
                            <ListItemIcon><HomeIcon color="action" /></ListItemIcon>
                            <ListItemText primary="Domicilio" secondary={address} />
                        </ListItem>
                    )}

                    {/* Personal documents (CURP, RFC, C.I, etc.) */}
                    {(docEntries.length > 0 || showCurpFallback) && (
                        <>
                            <Divider sx={{ my: 1 }} />
                            {showCurpFallback && (
                                <ListItem sx={{ px: 0 }}>
                                    <ListItemIcon><BadgeIcon color="action" /></ListItemIcon>
                                    <ListItemText primary="CURP" secondary={doctorProfile.curp} />
                                </ListItem>
                            )}
                            {docEntries.map(([docName, docValue]) => (
                                <ListItem key={docName} sx={{ px: 0 }}>
                                    <ListItemIcon><BadgeIcon color="action" /></ListItemIcon>
                                    <ListItemText primary={docName} secondary={String(docValue)} />
                                </ListItem>
                            ))}
                        </>
                    )}
                </List>
            </CardContent>
        </Card>
    );
};
