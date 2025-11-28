import React from 'react';
import {
    Card,
    Box,
    Avatar,
    Typography,
    Chip,
    IconButton,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
    Button
} from '@mui/material';
import {
    LocationOn as LocationIcon,
    Phone as PhoneIcon,
    Delete as DeleteIcon,
    Language as LanguageIcon,
    AccessTime as AccessTimeIcon
} from '@mui/icons-material';

interface Office {
    id: number;
    name: string;
    is_virtual: boolean;
    virtual_url?: string;
    address?: string;
    city?: string;
    phone?: string;
    maps_url?: string;
    timezone?: string;
}

interface OfficeCardProps {
    office: Office;
    onEdit: (office: Office) => void;
    onDelete: (office: Office) => void;
}

export const OfficeCard: React.FC<OfficeCardProps> = ({ office, onEdit, onDelete }) => {
    return (
        <Card
            variant="outlined"
            sx={{
                p: 2,
                bgcolor: 'primary.50',
                cursor: 'pointer',
                '&:hover': {
                    bgcolor: 'primary.100',
                    transform: 'translateY(-2px)',
                    boxShadow: 2
                },
                transition: 'all 0.2s ease-in-out'
            }}
            onClick={() => onEdit(office)}
        >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Avatar sx={{ bgcolor: 'primary.main' }}>
                        <LocationIcon />
                    </Avatar>
                    <Box>
                        <Typography variant="h6" sx={{ fontWeight: 600 }}>
                            {office.name}
                        </Typography>
                        <Chip
                            label={office.is_virtual ? "Virtual" : "Presencial"}
                            color={office.is_virtual ? "primary" : "success"}
                            size="small"
                            icon={office.is_virtual ? <LanguageIcon sx={{ fontSize: 16 }} /> : <LocationIcon sx={{ fontSize: 16 }} />}
                        />
                    </Box>
                </Box>
                <IconButton
                    size="small"
                    onClick={(e) => {
                        e.stopPropagation();
                        onDelete(office);
                    }}
                    sx={{ color: 'error.main' }}
                >
                    <DeleteIcon />
                </IconButton>
            </Box>

            <List dense>
                {office.is_virtual ? (
                    <>
                        {office.virtual_url && (
                            <ListItem sx={{ px: 0 }}>
                                <ListItemIcon>
                                    <LanguageIcon color="action" />
                                </ListItemIcon>
                                <ListItemText
                                    primary="URL de Consultorio"
                                    secondary={
                                        <Button
                                            size="small"
                                            variant="text"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                window.open(office.virtual_url, "_blank");
                                            }}
                                            sx={{ p: 0, textTransform: "none" }}
                                        >
                                            {office.virtual_url}
                                        </Button>
                                    }
                                />
                            </ListItem>
                        )}
                        <ListItem sx={{ px: 0 }}>
                            <ListItemIcon>
                                <PhoneIcon color="action" />
                            </ListItemIcon>
                            <ListItemText
                                primary="Teléfono"
                                secondary={office.phone || "No especificado"}
                            />
                        </ListItem>
                    </>
                ) : (
                    <>
                        <ListItem sx={{ px: 0 }}>
                            <ListItemIcon>
                                <LocationIcon color="action" />
                            </ListItemIcon>
                            <ListItemText
                                primary="Dirección"
                                secondary={office.address || "No especificada"}
                            />
                        </ListItem>
                        <ListItem sx={{ px: 0 }}>
                            <ListItemIcon>
                                <LocationIcon color="action" />
                            </ListItemIcon>
                            <ListItemText
                                primary="Ciudad"
                                secondary={office.city || "No especificada"}
                            />
                        </ListItem>
                        <ListItem sx={{ px: 0 }}>
                            <ListItemIcon>
                                <PhoneIcon color="action" />
                            </ListItemIcon>
                            <ListItemText
                                primary="Teléfono"
                                secondary={office.phone || "No especificado"}
                            />
                        </ListItem>
                        {office.maps_url && (
                            <ListItem sx={{ px: 0 }}>
                                <ListItemIcon>
                                    <LocationIcon color="action" />
                                </ListItemIcon>
                                <ListItemText
                                    primary="Google Maps"
                                    secondary={
                                        <Button
                                            size="small"
                                            variant="text"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                window.open(office.maps_url, "_blank");
                                            }}
                                            sx={{ p: 0, textTransform: "none" }}
                                        >
                                            Ver en Maps
                                        </Button>
                                    }
                                />
                            </ListItem>
                        )}
                    </>
                )}
                <ListItem sx={{ px: 0 }}>
                    <ListItemIcon>
                        <AccessTimeIcon color="action" />
                    </ListItemIcon>
                    <ListItemText
                        primary="Zona Horaria"
                        secondary={office.timezone || "America/Mexico_City"}
                    />
                </ListItem>
            </List>
        </Card>
    );
};
