import React from 'react';
import { Box, Button } from '@mui/material';
import { Security as SecurityIcon, Gavel as GavelIcon } from '@mui/icons-material';
import { PrintCertificateButtonPatient } from '../common/PrintCertificateButtonPatient';
import type { Patient } from '../../types';

interface PatientActionsProps {
    patient: Patient;
    doctorProfile: any;
    formData: any;
    onPrivacyConsentClick: () => void;
    onArcoRequestClick: () => void;
}

export const PatientActions: React.FC<PatientActionsProps> = ({
    patient,
    doctorProfile,
    formData,
    onPrivacyConsentClick,
    onArcoRequestClick
}) => {
    return (
        <Box sx={{ width: '100%', borderBottom: '1px solid #e0e0e0', pb: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
            {/* Privacy Consent Button */}
            <Button
                variant="outlined"
                color="primary"
                startIcon={<SecurityIcon />}
                onClick={onPrivacyConsentClick}
                size="medium"
                fullWidth
            >
                Consentimiento de Privacidad
            </Button>

            {/* ARCO Rights Button */}
            <Button
                variant="outlined"
                color="secondary"
                startIcon={<GavelIcon />}
                onClick={onArcoRequestClick}
                size="medium"
                fullWidth
            >
                Derechos ARCO
            </Button>

            {/* Generate Certificate Button */}
            {doctorProfile && (
                <PrintCertificateButtonPatient
                    patient={{
                        id: patient.id,
                        name: patient.name || 'Paciente',
                        dateOfBirth: patient.birth_date || '',
                        gender: patient.gender || '',
                        phone: patient.primary_phone || '',
                        email: patient.email || '',
                        address: formData?.home_address || '',
                        city: formData?.address_city || '',
                        state: '',
                        country: ''
                    }}
                    doctor={{
                        id: doctorProfile?.id || 0,
                        name: doctorProfile?.name || `${doctorProfile?.title || 'Dr.'} Usuario`,
                        title: doctorProfile?.title || 'Médico',
                        specialty: doctorProfile?.specialty_name || 'No especificada',
                        license: doctorProfile?.professional_license || 'No especificada',
                        university: doctorProfile?.university || 'No especificada',
                        phone: doctorProfile?.office_phone || doctorProfile?.phone || 'No especificado',
                        email: doctorProfile?.email || 'No especificado',
                        avatarType: doctorProfile?.avatar_type || doctorProfile?.avatar?.avatar_type || 'initials',
                        avatarUrl: doctorProfile?.avatar_url || doctorProfile?.avatar?.avatar_url,
                        avatarTemplateKey: doctorProfile?.avatar_template_key || doctorProfile?.avatar?.avatar_template_key,
                        avatarFilePath: doctorProfile?.avatar_file_path || doctorProfile?.avatar?.avatar_file_path,
                        avatar: doctorProfile?.avatar || {
                            avatar_type: doctorProfile?.avatar_type || 'initials',
                            avatar_template_key: doctorProfile?.avatar_template_key,
                            avatar_file_path: doctorProfile?.avatar_file_path,
                            avatar_url: doctorProfile?.avatar_url,
                            url: doctorProfile?.avatar_url
                        }
                    }}
                    variant="outlined"
                    size="medium"
                    fullWidth
                />
            )}
        </Box>
    );
};
