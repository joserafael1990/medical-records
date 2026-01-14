import React from 'react';
import { Box, Typography, Avatar, Button, Chip } from '@mui/material';
import { Edit as EditIcon } from '@mui/icons-material';
import { useAvatarUrl, getInitials } from '../../hooks/useAvatarUrl';

interface ProfessionalDocument {
    document_name?: string;
    document_value?: string;
}

interface ProfileHeaderProps {
    doctorProfile: {
        title?: string;
        name?: string;
        specialty_name?: string;
        avatar?: {
            avatar_url?: string;
            url?: string;
        };
        avatar_url?: string;
        avatarUrl?: string;
        avatar_file_path?: string;
        avatar_template_key?: string;
        updated_at?: string;
        professional_documents?: ProfessionalDocument[];
    };
    onEdit: () => void;
}

export const ProfileHeader: React.FC<ProfileHeaderProps> = ({ doctorProfile, onEdit }) => {
    const avatarUrl = doctorProfile?.avatar?.avatar_url ||
        doctorProfile?.avatar?.url ||
        doctorProfile?.avatar_url ||
        doctorProfile?.avatarUrl;

    const resolvedAvatarUrl = useAvatarUrl({
        avatarUrl,
        avatarFilePath: doctorProfile?.avatar_file_path,
        avatarTemplateKey: doctorProfile?.avatar_template_key,
        updatedAt: doctorProfile?.updated_at
    });

    const avatarInitials = getInitials(doctorProfile?.name);

    return (
        <Box sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            mb: 4,
            flexWrap: 'wrap',
            gap: 2
        }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar
                    src={resolvedAvatarUrl}
                    sx={{
                        width: 80,
                        height: 80,
                        bgcolor: resolvedAvatarUrl ? 'transparent' : 'primary.main',
                        fontSize: '2rem'
                    }}
                >
                    {avatarInitials}
                </Avatar>

                <Box>
                    <Typography variant="h4" component="h1" gutterBottom>
                        {doctorProfile.title && doctorProfile.name
                            ? `${doctorProfile.title} ${doctorProfile.name}`
                            : doctorProfile.name || 'Usuario'}
                    </Typography>

                    <Typography variant="h6" color="text.secondary" gutterBottom>
                        {doctorProfile.specialty_name || 'Especialidad no especificada'}
                    </Typography>

                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        <Chip size="small" />
                        {doctorProfile.professional_documents?.map((doc, index) => (
                            <Chip
                                key={index}
                                label={`${doc.document_name || 'Documento'}: ${doc.document_value || ''}`}
                                color="primary"
                                variant="outlined"
                                size="small"
                            />
                        ))}
                    </Box>
                </Box>
            </Box>

            <Box sx={{ display: 'flex', gap: 2 }}>
                <Button
                    variant="contained"
                    size="large"
                    startIcon={<EditIcon />}
                    onClick={onEdit}
                    sx={{
                        borderRadius: '12px',
                        px: 4,
                        py: 1.5,
                        fontSize: '1.1rem',
                        fontWeight: 600,
                        boxShadow: 3,
                        '&:hover': {
                            boxShadow: 6,
                            transform: 'translateY(-2px)'
                        },
                        transition: 'all 0.2s ease-in-out'
                    }}
                >
                    Editar Datos
                </Button>
            </Box>
        </Box>
    );
};
