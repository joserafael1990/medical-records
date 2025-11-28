import React from 'react';
import { Card, Box, Typography, Chip } from '@mui/material';
import { Schedule as ScheduleIcon } from '@mui/icons-material';

interface TimeBlock {
    start_time: string;
    end_time: string;
}

interface ScheduleData {
    is_active: boolean;
    time_blocks?: TimeBlock[];
}

interface ScheduleCardProps {
    day: string;
    schedule: ScheduleData;
    onClick: () => void;
}

const DAY_NAMES: Record<string, string> = {
    monday: 'Lunes',
    tuesday: 'Martes',
    wednesday: 'Miércoles',
    thursday: 'Jueves',
    friday: 'Viernes',
    saturday: 'Sábado',
    sunday: 'Domingo'
};

export const ScheduleCard: React.FC<ScheduleCardProps> = ({ day, schedule, onClick }) => {
    const timeBlocks = schedule.time_blocks || [];

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
            onClick={onClick}
        >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <ScheduleIcon color="primary" sx={{ fontSize: 20 }} />
                <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '1rem' }}>
                    {DAY_NAMES[day] || day}
                </Typography>
            </Box>

            {timeBlocks.length > 0 ? (
                <Box>
                    {timeBlocks.map((block, index) => (
                        <Chip
                            key={index}
                            label={`${block.start_time} - ${block.end_time}`}
                            color="primary"
                            size="small"
                            variant="outlined"
                            sx={{ mr: 0.5, mb: 0.5 }}
                        />
                    ))}
                </Box>
            ) : (
                <Typography variant="body2" color="text.secondary">
                    Sin horarios configurados
                </Typography>
            )}
        </Card>
    );
};
