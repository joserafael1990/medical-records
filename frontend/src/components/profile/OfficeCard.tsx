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
    Button,
    Divider,
    CircularProgress
} from '@mui/material';
import {
    LocationOn as LocationIcon,
    Phone as PhoneIcon,
    Delete as DeleteIcon,
    Language as LanguageIcon,
    AccessTime as AccessTimeIcon,
    Schedule as ScheduleIcon,
    Edit as EditIcon
} from '@mui/icons-material';
import { useScheduleData } from '../../hooks/useScheduleData';

const DAY_LABELS: Record<string, string> = {
    monday: 'Lun',
    tuesday: 'Mar',
    wednesday: 'Mié',
    thursday: 'Jue',
    friday: 'Vie',
    saturday: 'Sáb',
    sunday: 'Dom',
};

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
    onEditSchedule?: (officeId: number) => void;
    /** Bumped by the parent after a schedule save to force a refetch here. */
    scheduleRefreshKey?: number;
}

export const OfficeCard: React.FC<OfficeCardProps> = ({ office, onEdit, onDelete, onEditSchedule, scheduleRefreshKey }) => {
    return (
        <OfficeCardInner
            key={`${office.id}:${scheduleRefreshKey ?? 0}`}
            office={office}
            onEdit={onEdit}
            onDelete={onDelete}
            onEditSchedule={onEditSchedule}
        />
    );
};

const OfficeCardInner: React.FC<Omit<OfficeCardProps, 'scheduleRefreshKey'>> = ({ office, onEdit, onDelete, onEditSchedule }) => {
    const { scheduleData, loading: scheduleLoading } = useScheduleData(office.id);
    const activeDays = scheduleData
        ? (Object.entries(scheduleData) as [string, any][])
              .filter(([, day]) => day && day.is_active)
              .map(([key, day]) => ({ key, day }))
        : [];
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
                <IconButton aria-label="Eliminar"
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

            {onEditSchedule && (
                <>
                    <Divider sx={{ my: 1.5 }} />
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1, gap: 1, flexWrap: 'wrap' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <ScheduleIcon color="primary" fontSize="small" />
                            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                                Horario
                            </Typography>
                        </Box>
                        <Button
                            size="small"
                            variant="outlined"
                            startIcon={<EditIcon />}
                            onClick={(e) => {
                                e.stopPropagation();
                                onEditSchedule(office.id);
                            }}
                        >
                            Editar horario
                        </Button>
                    </Box>

                    {scheduleLoading ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', py: 1 }}>
                            <CircularProgress size={20} />
                        </Box>
                    ) : activeDays.length === 0 ? (
                        <Typography variant="body2" color="text.secondary" sx={{ pl: 0.5 }}>
                            Sin horarios configurados.
                        </Typography>
                    ) : (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                            {activeDays.map(({ key, day }) => {
                                const blocks: { start_time: string; end_time: string }[] =
                                    (day.time_blocks && day.time_blocks.length > 0)
                                        ? day.time_blocks
                                        : (day.start_time && day.end_time
                                            ? [{ start_time: day.start_time, end_time: day.end_time }]
                                            : []);
                                return (
                                    <Box key={key} sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                                        <Typography variant="body2" sx={{ minWidth: 36, fontWeight: 600 }}>
                                            {DAY_LABELS[key] ?? key}
                                        </Typography>
                                        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                                            {blocks.map((b, i) => (
                                                <Chip
                                                    key={i}
                                                    label={`${b.start_time} – ${b.end_time}`}
                                                    size="small"
                                                    variant="outlined"
                                                    sx={{ backgroundColor: 'background.paper' }}
                                                />
                                            ))}
                                        </Box>
                                    </Box>
                                );
                            })}
                        </Box>
                    )}
                </>
            )}
        </Card>
    );
};
