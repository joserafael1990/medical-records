import React, { memo, useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Card,
  CardContent,
  Divider,
  Avatar,
  Button,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Alert,
  LinearProgress,
  Stepper,
  Step,
  StepLabel,
  IconButton
} from '@mui/material';
import {
  Person as PersonIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  School as SchoolIcon,
  LocalHospital as HospitalIcon,
  Work as WorkIcon,
  ContactMail as ContactIcon,
  LocationOn as LocationIcon,
  Security as CertificateIcon,
  Verified as VerifiedIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  Badge as BadgeIcon,
  Business as BusinessIcon,
  CalendarToday as CalendarIcon,
  Star as StarIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon
} from '@mui/icons-material';
import { DoctorProfile, DoctorFormData } from '../../types';

interface DoctorProfileViewProps {
  doctorProfile: DoctorProfile | null;
  isLoading: boolean;
  onEdit: () => void;
  onSave: (data: DoctorFormData) => void;
  isEditing: boolean;
  formData: DoctorFormData;
  setFormData: (data: DoctorFormData | ((prev: DoctorFormData) => DoctorFormData)) => void;
  onCancel: () => void;
  successMessage?: string;
  errorMessage?: string;
}

const DoctorProfileView: React.FC<DoctorProfileViewProps> = ({
  doctorProfile,
  isLoading,
  onEdit,
  onSave,
  isEditing,
  formData,
  setFormData,
  onCancel,
  successMessage,
  errorMessage
}) => {
  const [profileCompleteness, setProfileCompleteness] = useState(0);
  const [missingFields, setMissingFields] = useState<string[]>([]);

  // Calculate profile completeness
  useEffect(() => {
    if (doctorProfile) {
      const requiredFields = [
        'first_name', 'paternal_surname', 'maternal_surname', 'email', 'phone',
        'professional_license', 'university', 'specialty',
        'office_address', 'office_city', 'office_state'
      ];
      
      const completedFields = requiredFields.filter(field => 
        doctorProfile[field as keyof DoctorProfile] && 
        String(doctorProfile[field as keyof DoctorProfile]).trim() !== ''
      );
      
      const missing = requiredFields.filter(field => 
        !doctorProfile[field as keyof DoctorProfile] || 
        String(doctorProfile[field as keyof DoctorProfile]).trim() === ''
      );
      
      setProfileCompleteness((completedFields.length / requiredFields.length) * 100);
      setMissingFields(missing);
    }
  }, [doctorProfile]);

  const getFieldLabel = (field: string): string => {
    const labels: { [key: string]: string } = {
      'first_name': 'Nombre(s)',
      'paternal_surname': 'Apellido Paterno',
      'maternal_surname': 'Apellido Materno',
      'email': 'Correo Electrónico',
      'phone': 'Teléfono',
      'professional_license': 'Cédula Profesional',
      'university': 'Universidad',
      'specialty': 'Especialidad',
      // 'medical_school': 'Escuela de Medicina', // removed per user request
      'office_address': 'Dirección del Consultorio',
      'office_city': 'Ciudad',
      'office_state': 'Estado'
    };
    return labels[field] || field;
  };

  const getCompletenessColor = () => {
    if (profileCompleteness >= 90) return 'success';
    if (profileCompleteness >= 70) return 'warning';
    return 'error';
  };

  const getCompletenessMessage = () => {
    if (profileCompleteness >= 90) return '¡Perfil casi completo! Excelente trabajo.';
    if (profileCompleteness >= 70) return 'Buen progreso. Completa los campos restantes.';
    return 'Tu perfil necesita más información para cumplir con las normas.';
  };

  if (isLoading) {
    return (
      <Box sx={{ width: '100%', p: 3 }}>
        <Typography variant="h6" gutterBottom>Cargando perfil...</Typography>
        <LinearProgress />
      </Box>
    );
  }

  if (!doctorProfile && !isEditing) {
    return (
      <Box sx={{ textAlign: 'center', p: 6 }}>
        <PersonIcon sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }} />
        <Typography variant="h5" gutterBottom>
          Configura tu Perfil Profesional
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          Para cumplir con las normativas mexicanas (NOM-004), necesitas completar tu información profesional.
        </Typography>
        <Button
          variant="contained"
          startIcon={<EditIcon />}
          onClick={onEdit}
          size="large"
          sx={{ borderRadius: '12px' }}
        >
          Crear Perfil
        </Button>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 600, mb: 1 }}>
            Mi Perfil Profesional
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Información requerida según NOM-004-SSA3-2012
          </Typography>
        </Box>
        {!isEditing && (
          <Button
            variant="contained"
            startIcon={<EditIcon />}
            onClick={onEdit}
            sx={{ borderRadius: '12px' }}
          >
            Editar Perfil
          </Button>
        )}
      </Box>

      {/* Messages */}
      {successMessage && (
        <Alert severity="success" sx={{ mb: 3 }}>
          {successMessage}
        </Alert>
      )}
      {errorMessage && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {errorMessage}
        </Alert>
      )}

      {/* Profile Completeness */}
      {doctorProfile && (
        <Card sx={{ mb: 3, borderRadius: '16px' }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <CheckCircleIcon color={getCompletenessColor()} />
              <Typography variant="h6">Completitud del Perfil</Typography>
              <Chip
                label={`${Math.round(profileCompleteness)}%`}
                color={getCompletenessColor()}
                variant="filled"
              />
            </Box>
            <LinearProgress
              variant="determinate"
              value={profileCompleteness}
              color={getCompletenessColor()}
              sx={{ height: 8, borderRadius: 4, mb: 2 }}
            />
            <Typography variant="body2" color="text.secondary">
              {getCompletenessMessage()}
            </Typography>
            {missingFields.length > 0 && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                  Campos faltantes:
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {missingFields.map((field) => (
                    <Chip
                      key={field}
                      label={getFieldLabel(field)}
                      size="small"
                      color="warning"
                      variant="outlined"
                    />
                  ))}
                </Box>
              </Box>
            )}
          </CardContent>
        </Card>
      )}

      <Box sx={{ display: 'flex', gap: 3, flexDirection: { xs: 'column', md: 'row' } }}>
        {/* Personal Information */}
        <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 33%' } }}>
          <Card sx={{ borderRadius: '16px', height: 'fit-content' }}>
            <CardContent>
              <Box sx={{ textAlign: 'center', mb: 3 }}>
                <Avatar
                  sx={{
                    width: 100,
                    height: 100,
                    mx: 'auto',
                    mb: 2,
                    bgcolor: 'primary.main',
                    fontSize: '2rem'
                  }}
                >
                  {doctorProfile ? 
                    `${doctorProfile.first_name[0]}${doctorProfile.paternal_surname[0]}` : 
                    <PersonIcon fontSize="large" />
                  }
                </Avatar>
                <Typography variant="h5" sx={{ fontWeight: 600 }}>
                  {doctorProfile ? 
                    `${doctorProfile.first_name} ${doctorProfile.paternal_surname}` : 
                    'Nombre del Doctor'
                  }
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  {doctorProfile?.specialty || 'Especialidad'}
                </Typography>
                {doctorProfile?.professional_license && (
                  <Chip
                    icon={<VerifiedIcon />}
                    label={`Cédula: ${doctorProfile.professional_license}`}
                    color="primary"
                    variant="outlined"
                    size="small"
                    sx={{ mt: 1 }}
                  />
                )}
              </Box>

              <Divider sx={{ mb: 2 }} />

              <List dense>
                <ListItem>
                  <ListItemIcon>
                    <EmailIcon color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Correo"
                    secondary={doctorProfile?.email || 'No especificado'}
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <PhoneIcon color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Teléfono"
                    secondary={doctorProfile?.phone || 'No especificado'}
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <CalendarIcon color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Fecha de Nacimiento"
                    secondary={doctorProfile?.birth_date ? 
                      new Date(doctorProfile.birth_date).toLocaleDateString('es-MX') : 
                      'No especificada'
                    }
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Box>

        {/* Professional Information */}
        <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 67%' } }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            
            {/* Education */}
            <Card sx={{ borderRadius: '16px' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                  <SchoolIcon sx={{ color: 'primary.main', mr: 2 }} />
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    Formación Académica
                  </Typography>
                </Box>
                
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 3 }}>
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                      Universidad de Egreso
                    </Typography>
                    <Typography variant="body1">
                      {doctorProfile?.university || 'No especificada'}
                    </Typography>
                  </Box>
                  
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                      Año de Graduación
                    </Typography>
                    <Typography variant="body1">
                      {doctorProfile?.graduation_year || 'No especificado'}
                    </Typography>
                  </Box>
                  
                  {/* medical_school and internship_hospital fields removed per user request */}
                </Box>
              </CardContent>
            </Card>

            {/* Professional Licenses */}
            <Card sx={{ borderRadius: '16px' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                  <BadgeIcon sx={{ color: 'primary.main', mr: 2 }} />
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    Licencias y Certificaciones
                  </Typography>
                </Box>
                
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 3 }}>
                    <Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <VerifiedIcon color="success" fontSize="small" />
                        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                          Cédula Profesional
                        </Typography>
                      </Box>
                      <Typography variant="body1">
                        {doctorProfile?.professional_license || 'No especificada'}
                      </Typography>
                    </Box>
                    
                    <Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <StarIcon color="warning" fontSize="small" />
                        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                          Cédula de Especialidad
                        </Typography>
                      </Box>
                      <Typography variant="body1">
                        {doctorProfile?.specialty_license || 'No especificada'}
                      </Typography>
                    </Box>
                  </Box>
                  
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                      Especialidad
                    </Typography>
                    <Chip
                      label={doctorProfile?.specialty || 'No especificada'}
                      color="primary"
                      variant="outlined"
                    />
                    {doctorProfile?.subspecialty && (
                      <Chip
                        label={doctorProfile.subspecialty}
                        color="secondary"
                        variant="outlined"
                        sx={{ ml: 1 }}
                      />
                    )}
                  </Box>
                </Box>
              </CardContent>
            </Card>

            {/* Office Information */}
            <Card sx={{ borderRadius: '16px' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                  <LocationIcon sx={{ color: 'primary.main', mr: 2 }} />
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    Información del Consultorio
                  </Typography>
                </Box>
                
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                      Dirección
                    </Typography>
                    <Typography variant="body1">
                      {doctorProfile?.office_address || 'No especificada'}
                    </Typography>
                  </Box>
                  
                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 3 }}>
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                        Ciudad
                      </Typography>
                      <Typography variant="body1">
                        {doctorProfile?.office_city || 'No especificada'}
                      </Typography>
                    </Box>
                    
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                        Estado
                      </Typography>
                      <Typography variant="body1">
                        {doctorProfile?.office_state || 'No especificado'}
                      </Typography>
                    </Box>
                    
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                        Código Postal
                      </Typography>
                      <Typography variant="body1">
                        {doctorProfile?.office_postal_code || 'No especificado'}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              </CardContent>
            </Card>

            {/* Contact Information */}
            <Card sx={{ borderRadius: '16px' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                  <ContactIcon sx={{ color: 'primary.main', mr: 2 }} />
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    Contacto Profesional
                  </Typography>
                </Box>
                
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 3 }}>
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                      Correo Profesional
                    </Typography>
                    <Typography variant="body1">
                      {doctorProfile?.professional_email || 'No especificado'}
                    </Typography>
                  </Box>
                  
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                      Teléfono del Consultorio
                    </Typography>
                    <Typography variant="body1">
                      {doctorProfile?.office_phone || 'No especificado'}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>

          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default memo(DoctorProfileView);
