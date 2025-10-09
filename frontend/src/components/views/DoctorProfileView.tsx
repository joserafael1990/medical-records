import React, { memo, useState, useEffect } from 'react';
import {
  Box,
  Typography,
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
  IconButton
} from '@mui/material';
import {
  Person as PersonIcon,
  Edit as EditIcon,
  School as SchoolIcon,
  ContactMail as ContactIcon,
  LocationOn as LocationIcon,
  Security as CertificateIcon,
  Verified as VerifiedIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  Badge as BadgeIcon,
  CalendarToday as CalendarIcon,
  Star as StarIcon,
  CheckCircle as CheckCircleIcon,
  VpnKey as KeyIcon,
  Schedule as ScheduleIcon
} from '@mui/icons-material';
import { DoctorProfile, DoctorFormData } from '../../types';
import DigitalSignatureDialog from '../dialogs/DigitalSignatureDialog';
import ScheduleConfigDialog from '../dialogs/ScheduleConfigDialog';

interface DoctorProfileViewProps {
  doctorProfile: DoctorProfile | null;
  isLoading: boolean;
  onEdit: (section?: string) => void;
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
  
  // Debug: log doctor profile data
  useEffect(() => {
    console.log('🩺 DoctorProfileView component mounted/updated');
    console.log('🩺 DoctorProfileView received data:', doctorProfile);
    console.log('🩺 isLoading:', isLoading);
    if (doctorProfile) {
      console.log('📋 FULL OBJECT:', JSON.stringify(doctorProfile, null, 2));
      console.log('📋 Key fields:', {
        university: doctorProfile.university,
        graduation_year: doctorProfile.graduation_year,
        professional_license: doctorProfile.professional_license,
        specialty_name: doctorProfile.specialty_name,
        specialty: doctorProfile.specialty,
        office_phone: doctorProfile.office_phone,
        primary_phone: doctorProfile.primary_phone
      });
      
      // Check which fields are empty
      const emptyFields = Object.entries(doctorProfile).filter(([key, value]) => 
        value === '' || value === null || value === undefined
      );
      console.log('🔍 Empty fields:', emptyFields);
    } else {
      console.log('❌ No doctor profile data received');
    }
  }, [doctorProfile, isLoading]);
  const [digitalSignatureDialogOpen, setDigitalSignatureDialogOpen] = useState(false);
  const [digitalSignatureMode, setDigitalSignatureMode] = useState<'generate' | 'info' | 'sign'>('info');
  const [scheduleConfigDialogOpen, setScheduleConfigDialogOpen] = useState(false);
  
  // Debug logging for dialog state
  useEffect(() => {
    console.log('🔧 DoctorProfileView - scheduleConfigDialogOpen changed to:', scheduleConfigDialogOpen);
  }, [scheduleConfigDialogOpen]);

  // Calculate profile completeness
  useEffect(() => {
    if (doctorProfile) {
      // Campos obligatorios (peso: 70% del total)
      const requiredFields = [
        'first_name', 'paternal_surname', 'maternal_surname', 'email', 'primary_phone', 'curp',
        'professional_license', 'university', 'specialty_name',
        'office_address', 'office_city', 'office_state_id'
      ];
      
      // Campos opcionales importantes (peso: 30% del total)
      const optionalFields = [
        'birth_date', 'gender', 'rfc', 'graduation_year', 'specialty_license', 'subspecialty',
        'office_postal_code', 'professional_email', 'office_phone'
      ];
      
      const completedRequired = requiredFields.filter(field => 
        doctorProfile[field as keyof DoctorProfile] && 
        String(doctorProfile[field as keyof DoctorProfile]).trim() !== ''
      );
      
      const completedOptional = optionalFields.filter(field => 
        doctorProfile[field as keyof DoctorProfile] && 
        String(doctorProfile[field as keyof DoctorProfile]).trim() !== ''
      );
      
      const missingRequired = requiredFields.filter(field => 
        !doctorProfile[field as keyof DoctorProfile] || 
        String(doctorProfile[field as keyof DoctorProfile]).trim() === ''
      );
      
      const missingOptional = optionalFields.filter(field => 
        !doctorProfile[field as keyof DoctorProfile] || 
        String(doctorProfile[field as keyof DoctorProfile]).trim() === ''
      );
      
      // Cálculo ponderado: 70% obligatorios + 30% opcionales
      const requiredScore = (completedRequired.length / requiredFields.length) * 70;
      const optionalScore = (completedOptional.length / optionalFields.length) * 30;
      const totalScore = requiredScore + optionalScore;
      
      setProfileCompleteness(totalScore);
      setMissingFields([...missingRequired, ...missingOptional]);
    }
  }, [doctorProfile]);

  const getFieldLabel = (field: string): string => {
    const labels: { [key: string]: string } = {
      // Campos obligatorios
      'first_name': 'Nombre(s)',
      'paternal_surname': 'Apellido Paterno',
      'maternal_surname': 'Apellido Materno',
      'email': 'Correo Electrónico',
      'primary_phone': 'Teléfono',
      'curp': 'CURP',
      'professional_license': 'Cédula Profesional',
      'university': 'Universidad',
      'specialty_name': 'Especialidad',
      'office_address': 'Dirección del Consultorio',
      'office_city': 'Ciudad',
      'office_state_id': 'Estado',
      // Campos opcionales
      'birth_date': 'Fecha de Nacimiento',
      'gender': 'Género',
      'rfc': 'RFC',
      'graduation_year': 'Año de Graduación',
      'specialty_license': 'Cédula de Especialidad',
      'subspecialty': 'Subespecialidad',
      'office_postal_code': 'Código Postal',
      'professional_email': 'Correo Profesional',
      'office_phone': 'Teléfono del Consultorio',
    };
    return labels[field] || field;
  };

  const getCompletenessColor = () => {
    if (profileCompleteness >= 85) return 'success';
    if (profileCompleteness >= 70) return 'warning';
    if (profileCompleteness >= 50) return 'info';
    return 'error';
  };

  const getCompletenessMessage = () => {
    if (profileCompleteness >= 95) return '¡Perfil completo al 100%! Toda la información está actualizada.';
    if (profileCompleteness >= 85) return '¡Excelente! Solo faltan algunos campos opcionales.';
    if (profileCompleteness >= 70) return 'Buen progreso. Los campos obligatorios están completos.';
    if (profileCompleteness >= 50) return 'Avance moderado. Completa los campos obligatorios restantes.';
    return 'Tu perfil necesita más información para cumplir con las normas médicas.';
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
          onClick={() => onEdit()}
          size="large"
          sx={{ borderRadius: '12px' }}
        >
          Crear Perfil
        </Button>
      </Box>
    );
  }

  return (
    <React.Fragment>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 600, mb: 1 }}>
            Mi Perfil Profesional
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Gestiona tu información profesional
          </Typography>
        </Box>KPIs         <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="contained"
            size="large"
            startIcon={<EditIcon />}
            onClick={() => {
              console.log('🔍 BUTTON: Edit button clicked, calling onEdit()');
              onEdit();
            }}
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
            {isEditing ? 'Cancelar Edición' : 'Editar Datos'}
          </Button>
        </Box>
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
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    Campos faltantes:
                  </Typography>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<EditIcon />}
                    onClick={() => onEdit()}
                    sx={{ 
                      borderRadius: '8px',
                      fontSize: '0.75rem',
                      fontWeight: 500,
                      textTransform: 'none',
                      px: 2,
                      py: 0.5,
                      border: '1.5px solid',
                      borderColor: 'warning.main',
                      color: 'warning.main',
                      '&:hover': {
                        backgroundColor: 'warning.main',
                        color: 'white',
                        borderColor: 'warning.main',
                        transform: 'translateY(-1px)',
                        boxShadow: 1
                      },
                      transition: 'all 0.2s ease-in-out'
                    }}
                  >
                    Completar
                  </Button>
                </Box>
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
            <CardContent sx={{ position: 'relative' }}>
              {!isEditing && (
                <IconButton
                  onClick={() => onEdit()}
                  sx={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    backgroundColor: 'rgba(255,255,255,0.9)',
                    '&:hover': {
                      backgroundColor: 'primary.main',
                      color: 'white'
                    },
                    transition: 'all 0.2s ease-in-out'
                  }}
                  size="small"
                >
                  <EditIcon fontSize="small" />
                </IconButton>
              )}
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
                    `${doctorProfile.first_name} ${doctorProfile.paternal_surname}${doctorProfile.maternal_surname ? ` ${doctorProfile.maternal_surname}` : ''}` : 
                    'Nombre del Doctor'
                  }
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  {doctorProfile?.specialty_name || doctorProfile?.specialty || 'Especialidad'}
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
                    secondary={doctorProfile?.primary_phone || 'No especificado'}
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

              <Divider sx={{ my: 2 }} />

              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>
                Identificación Legal
              </Typography>
              <List dense>
                <ListItem>
                  <ListItemIcon>
                    <VerifiedIcon color="success" />
                  </ListItemIcon>
                  <ListItemText
                    primary="CURP"
                    secondary={doctorProfile?.curp || 'No especificada'}
                  />
                </ListItem>
                {doctorProfile?.rfc && (
                  <ListItem>
                    <ListItemIcon>
                      <BadgeIcon color="info" />
                    </ListItemIcon>
                    <ListItemText
                      primary="RFC"
                      secondary={doctorProfile.rfc}
                    />
                  </ListItem>
                )}
              </List>

              <Divider sx={{ my: 2 }} />

              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>
                Firma Digital
              </Typography>
              <List dense>
                <ListItem>
                  <ListItemIcon>
                    <CertificateIcon color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Certificado Digital"
                    secondary="Configura tu certificado para firmar documentos"
                  />
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<VerifiedIcon />}
                    onClick={() => {
                      setDigitalSignatureMode('info');
                      setDigitalSignatureDialogOpen(true);
                    }}
                    sx={{ 
                      ml: 1,
                      minWidth: '120px',
                      borderRadius: '8px',
                      fontWeight: 500,
                      textTransform: 'none',
                      px: 2,
                      py: 0.75,
                      border: '1.5px solid',
                      '&:hover': {
                        backgroundColor: 'primary.main',
                        color: 'white',
                        borderColor: 'primary.main',
                        transform: 'translateY(-1px)',
                        boxShadow: 2
                      },
                      transition: 'all 0.2s ease-in-out'
                    }}
                  >
                    Ver Certificado
                  </Button>
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <KeyIcon color="secondary" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Generar Certificado"
                    secondary="Crear nuevo certificado digital"
                  />
                  <Button
                    size="small"
                    variant="contained"
                    startIcon={<KeyIcon />}
                    onClick={() => {
                      setDigitalSignatureMode('generate');
                      setDigitalSignatureDialogOpen(true);
                    }}
                    sx={{ 
                      ml: 1,
                      minWidth: '120px',
                      borderRadius: '8px',
                      fontWeight: 500,
                      textTransform: 'none',
                      px: 2,
                      py: 0.75,
                      backgroundColor: 'secondary.main',
                      '&:hover': {
                        backgroundColor: 'secondary.dark',
                        transform: 'translateY(-1px)',
                        boxShadow: 4
                      },
                      transition: 'all 0.2s ease-in-out'
                    }}
                  >
                    Generar
                  </Button>
                </ListItem>
              </List>

              <Divider sx={{ my: 2 }} />

              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>
                Horarios de Consulta
              </Typography>
              <List dense>
                <ListItem>
                  <ListItemIcon>
                    <ScheduleIcon color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Configuración de Horarios"
                    secondary="Define tus horarios de trabajo para cada día de la semana"
                  />
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<CalendarIcon />}
                    onClick={() => {
                      console.log('🔧 Schedule config button clicked');
                      setScheduleConfigDialogOpen(true);
                      console.log('🔧 setScheduleConfigDialogOpen(true) called');
                    }}
                    sx={{ 
                      ml: 1,
                      minWidth: '120px',
                      borderRadius: '8px',
                      fontWeight: 500,
                      textTransform: 'none',
                      px: 2,
                      py: 0.75,
                      border: '1.5px solid',
                      borderColor: 'primary.main',
                      color: 'primary.main',
                      '&:hover': {
                        backgroundColor: 'primary.main',
                        color: 'white',
                        borderColor: 'primary.main',
                        transform: 'translateY(-1px)',
                        boxShadow: 2
                      },
                      transition: 'all 0.2s ease-in-out'
                    }}
                  >
                    Configurar
                  </Button>
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
              <CardContent sx={{ position: 'relative' }}>
                {!isEditing && (
                  <IconButton
                    onClick={() => onEdit('academic')}
                    sx={{
                      position: 'absolute',
                      top: 8,
                      right: 8,
                      backgroundColor: 'rgba(255,255,255,0.9)',
                      '&:hover': {
                        backgroundColor: 'primary.main',
                        color: 'white'
                      },
                      transition: 'all 0.2s ease-in-out'
                    }}
                    size="small"
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                )}
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
              <CardContent sx={{ position: 'relative' }}>
                {!isEditing && (
                  <IconButton
                    onClick={() => onEdit('licenses')}
                    sx={{
                      position: 'absolute',
                      top: 8,
                      right: 8,
                      backgroundColor: 'rgba(255,255,255,0.9)',
                      '&:hover': {
                        backgroundColor: 'primary.main',
                        color: 'white'
                      },
                      transition: 'all 0.2s ease-in-out'
                    }}
                    size="small"
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                )}
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
                      label={doctorProfile?.specialty_name || doctorProfile?.specialty || 'No especificada'}
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
              <CardContent sx={{ position: 'relative' }}>
                {!isEditing && (
                  <IconButton
                    onClick={() => onEdit('office')}
                    sx={{
                      position: 'absolute',
                      top: 8,
                      right: 8,
                      backgroundColor: 'rgba(255,255,255,0.9)',
                      '&:hover': {
                        backgroundColor: 'primary.main',
                        color: 'white'
                      },
                      transition: 'all 0.2s ease-in-out'
                    }}
                    size="small"
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                )}
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                  <LocationIcon sx={{ color: 'primary.main', mr: 2 }} />
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    Información del Consultorio
                  </Typography>
                </Box>
                
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  {/* 1. Dirección */}
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                      Dirección
                    </Typography>
                    <Typography variant="body1">
                      {doctorProfile?.office_address || 'No especificada'}
                    </Typography>
                  </Box>
                  
                  {/* 2. Ciudad, 3. Estado, 4. Código Postal */}
                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 3 }}>
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                        Ciudad
                      </Typography>
                      <Typography variant="body1">
                        {(doctorProfile as any)?.office_city || doctorProfile?.office_city || 'No especificada'}
                      </Typography>
                    </Box>
                    
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                        Estado
                      </Typography>
                      <Typography variant="body1">
                        {(doctorProfile as any)?.office_state_name || 'No especificado'}
                      </Typography>
                    </Box>
                    
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                        Código Postal
                      </Typography>
                      <Typography variant="body1">
                        {(doctorProfile as any)?.office_postal_code || doctorProfile?.office_postal_code || 'No especificado'}
                      </Typography>
                    </Box>
                  </Box>
                  
                  {/* 5. País, 6. Teléfono y 7. Duración de Citas */}
                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 3 }}>
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                        País
                      </Typography>
                      <Typography variant="body1">
                        {(doctorProfile as any)?.office_country_name || 'No especificado'}
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
                    
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                        Duración de Citas
                      </Typography>
                      <Typography variant="body1">
                        {(doctorProfile as any)?.appointment_duration 
                          ? `${(doctorProfile as any).appointment_duration} minutos`
                          : 'No especificada'}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              </CardContent>
            </Card>

            {/* Contact Information */}
            <Card sx={{ borderRadius: '16px' }}>
              <CardContent sx={{ position: 'relative' }}>
                {!isEditing && (
                  <IconButton
                    onClick={() => onEdit('contact')}
                    sx={{
                      position: 'absolute',
                      top: 8,
                      right: 8,
                      backgroundColor: 'rgba(255,255,255,0.9)',
                      '&:hover': {
                        backgroundColor: 'primary.main',
                        color: 'white'
                      },
                      transition: 'all 0.2s ease-in-out'
                    }}
                    size="small"
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                )}
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                  <ContactIcon sx={{ color: 'primary.main', mr: 2 }} />
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    Contacto Profesional
                  </Typography>
                </Box>
                
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                      Correo Profesional
                    </Typography>
                    <Typography variant="body1">
                      {doctorProfile?.professional_email || 'No especificado'}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>

          </Box>
        </Box>
      </Box>

      {/* Digital Signature Dialog */}
      <DigitalSignatureDialog
        open={digitalSignatureDialogOpen}
        onClose={() => setDigitalSignatureDialogOpen(false)}
        mode={digitalSignatureMode}
        onSignatureComplete={(signatureData) => {
          console.log('Signature completed:', signatureData);
          setDigitalSignatureDialogOpen(false);
        }}
      />

      {/* Schedule Configuration Dialog */}
      <ScheduleConfigDialog
        open={scheduleConfigDialogOpen}
        onClose={() => {
          console.log('🔧 ScheduleConfigDialog - onClose called');
          setScheduleConfigDialogOpen(false);
        }}
        onSave={() => {
          console.log('🔧 ScheduleConfigDialog - onSave called');
          setScheduleConfigDialogOpen(false);
          // Force reload the dialog when it opens again
          setTimeout(() => {
            console.log('🔧 Schedule saved - data will refresh when dialog reopens');
          }, 100);
        }}
      />

    </React.Fragment>
  );
};

export default memo(DoctorProfileView);

