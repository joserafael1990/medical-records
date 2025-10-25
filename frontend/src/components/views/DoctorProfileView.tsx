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
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress
} from '@mui/material';
import {
  Person as PersonIcon,
  Edit as EditIcon,
  Schedule as ScheduleIcon,
  LocationOn as LocationIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  Badge as BadgeIcon,
  School as SchoolIcon,
  Work as WorkIcon,
  LocalHospital as HospitalIcon,
  Settings as SettingsIcon,
  AccessTime as AccessTimeIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Close as CloseIcon,
  Language as LanguageIcon
} from '@mui/icons-material';
import DoctorProfileDialog from '../dialogs/DoctorProfileDialog';
import ScheduleConfigDialog from '../dialogs/ScheduleConfigDialog';
import OfficeDialog from '../dialogs/OfficeDialog';
import { useOfficeManagement } from '../../hooks/useOfficeManagement';
import { useScheduleData } from '../../hooks/useScheduleData';

interface DoctorProfileViewProps {
  doctorProfile: any;
  isLoading: boolean;
  onEdit: () => void;
  onSave: (profile: any) => void;
  isEditing: boolean;
  dialogOpen: boolean;
  formData: any;
  setFormData: (data: any) => void;
  onCancel: () => void;
  successMessage: string;
  errorMessage: string;
  formErrorMessage: string;
  setFormErrorMessage: (message: string) => void;
  isSubmitting: boolean;
  fieldErrors: any;
}

const DoctorProfileView: React.FC<DoctorProfileViewProps> = ({
  doctorProfile,
  isLoading,
  onEdit,
  onSave,
  isEditing,
  dialogOpen,
  formData,
  setFormData,
  onCancel,
  successMessage,
  errorMessage,
  formErrorMessage,
  setFormErrorMessage,
  isSubmitting,
  fieldErrors
}) => {
  const [scheduleConfigDialogOpen, setScheduleConfigDialogOpen] = useState(false);
  const [officeDialogOpen, setOfficeDialogOpen] = useState(false);
  const [editingOffice, setEditingOffice] = useState<any>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [officeToDelete, setOfficeToDelete] = useState<any>(null);

  // Office management hook
  const { 
    offices, 
    isLoading: officesLoading, 
    error: officesError, 
    deleteOffice,
    fetchOffices,
    createOffice,
    updateOffice
  } = useOfficeManagement();

  // Schedule data hook
  const { 
    scheduleData, 
    loading: scheduleLoading, 
    error: scheduleError,
    refetch: refetchSchedule
  } = useScheduleData();

  // Office management functions
  const handleNewOffice = () => {
    console.log('🏢 Opening new office dialog');
    setEditingOffice(null);
    setOfficeDialogOpen(true);
  };

  const handleEditOffice = (office: any) => {
    console.log('🏢 Opening edit office dialog for:', office);
    setEditingOffice(office);
    setOfficeDialogOpen(true);
  };

  const handleDeleteOffice = (office: any) => {
    setOfficeToDelete(office);
    setDeleteConfirmOpen(true);
  };

  const confirmDeleteOffice = async () => {
    if (officeToDelete) {
      try {
        await deleteOffice(officeToDelete.id);
        setDeleteConfirmOpen(false);
        setOfficeToDelete(null);
      } catch (error) {
        console.error('Error deleting office:', error);
      }
    }
  };

  const handleSaveOffice = async (office: any) => {
    try {
      console.log('🏢 Saving office:', office);
      if (editingOffice) {
        console.log('🏢 Updating existing office:', editingOffice.id);
        await updateOffice(editingOffice.id, office);
      } else {
        console.log('🏢 Creating new office');
        await createOffice(office);
      }
      setOfficeDialogOpen(false);
      setEditingOffice(null);
      // Refresh the offices list
      fetchOffices();
    } catch (err) {
      console.error('Error saving office:', err);
    }
  };
  

  if (isLoading) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Cargando perfil del médico...
        </Typography>
        <LinearProgress />
      </Box>
    );
  }

  if (!doctorProfile) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="info">
          No se encontró perfil del médico. Haz clic en "Crear Perfil" para comenzar.
        </Alert>
        <Button
          variant="contained"
          startIcon={<PersonIcon />}
          onClick={onEdit}
          sx={{ mt: 2 }}
        >
          Crear Perfil
        </Button>
      </Box>
    );
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return 'No especificada';
    try {
      return new Date(dateString).toLocaleDateString('es-ES');
    } catch {
      return 'Fecha inválida';
    }
  };

  const getEmptyFieldsCount = () => {
    const fields = [
      'university', 'graduation_year', 'specialty_license', 'office_address',
      'office_city', 'office_state_id', 'office_country', 'office_phone', 'appointment_duration', 'office_timezone', 'gender'
    ];
    return fields.filter(field => !doctorProfile[field]).length;
  };

  const emptyFieldsCount = getEmptyFieldsCount();
  const completionPercentage = Math.round(((11 - emptyFieldsCount) / 11) * 100);

  return (
    <React.Fragment>
      <Box sx={{ p: 3 }}>
      {/* Header */}
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
              sx={{ 
                width: 80, 
                height: 80, 
                bgcolor: 'primary.main',
                fontSize: '2rem'
              }}
            >
              {doctorProfile.first_name?.[0]}{doctorProfile.paternal_surname?.[0]}
            </Avatar>
        <Box>
              <Typography variant="h4" component="h1" gutterBottom>
                {doctorProfile.full_name || `${doctorProfile.title || ''} ${doctorProfile.first_name} ${doctorProfile.paternal_surname}`.trim()}
          </Typography>
              <Typography variant="h6" color="text.secondary" gutterBottom>
                {doctorProfile.specialty_name || 'Especialidad no especificada'}
          </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Chip 
                  label={`${completionPercentage}% Completo`}
                  color={completionPercentage >= 80 ? 'success' : completionPercentage >= 60 ? 'warning' : 'error'}
                  size="small"
                />
                {doctorProfile.professional_license && (
                  <Chip 
                    label={`Cédula: ${doctorProfile.professional_license}`}
                    color="primary"
                    variant="outlined"
                    size="small"
                  />
                )}
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

      {/* Messages */}
      {successMessage && (
        <Alert severity="success" sx={{ mb: 3 }}>
          {successMessage}
        </Alert>
      )}
      {errorMessage && (
        <Box sx={{ mb: 3, p: 2, bgcolor: 'error.main', borderRadius: 1 }}>
          <Typography color="white">{errorMessage}</Typography>
        </Box>
      )}

        {/* Profile Information Cards */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 3 }}>
          {/* Personal Information */}
          <Card sx={{ height: 'fit-content' }}>
          <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <PersonIcon color="primary" />
                Información Personal
                </Typography>
              <List dense>
                <ListItem>
                  <ListItemIcon>
                    <BadgeIcon color="action" />
                  </ListItemIcon>
                  <ListItemText 
                    primary="CURP" 
                    secondary={doctorProfile.curp || 'No especificada'} 
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <EmailIcon color="action" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Email" 
                    secondary={doctorProfile.email || 'No especificado'} 
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <PhoneIcon color="action" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Teléfono"
                    secondary={doctorProfile.primary_phone || 'No especificado'} 
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <PersonIcon color="action" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Fecha de Nacimiento"
                    secondary={formatDate(doctorProfile.birth_date)} 
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <PersonIcon color="action" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Género"
                    secondary={doctorProfile.gender === 'M' ? 'Masculino' : doctorProfile.gender === 'F' ? 'Femenino' : doctorProfile.gender === 'O' ? 'Otro' : 'No especificado'} 
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>

          {/* Professional Information */}
          <Card sx={{ height: 'fit-content' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <WorkIcon color="primary" />
                Información Profesional
              </Typography>
              <List dense>
                <ListItem>
                  <ListItemIcon>
                    <BadgeIcon color="action" />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Título" 
                    secondary={doctorProfile.title || 'No especificado'} 
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <BadgeIcon color="action" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Cédula Profesional" 
                    secondary={doctorProfile.professional_license || 'No especificada'} 
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <SchoolIcon color="action" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Universidad" 
                    secondary={doctorProfile.university || 'No especificada'} 
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <SchoolIcon color="action" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Año de Graduación" 
                    secondary={doctorProfile.graduation_year || 'No especificado'} 
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <HospitalIcon color="action" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Especialidad" 
                    secondary={doctorProfile.specialty_name || 'No especificada'} 
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Box>

        {/* Office Management */}
        <Card sx={{ mt: 3 }}>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <LocationIcon color="primary" />
                Consultorios
              </Typography>
              <Button
                variant="contained"
                size="small"
                startIcon={<AddIcon />}
                onClick={handleNewOffice}
              >
                Nuevo Consultorio
              </Button>
            </Box>
            
            {officesError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {officesError}
              </Alert>
            )}

            {officesLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                <CircularProgress />
              </Box>
            ) : offices.length === 0 ? (
              <Box sx={{ textAlign: 'center', p: 3 }}>
                <Typography variant="body1" color="text.secondary" gutterBottom>
                  No tienes consultorios registrados
                </Typography>
                <Button
                  variant="outlined"
                  startIcon={<AddIcon />}
                  onClick={handleNewOffice}
                  sx={{ mt: 1 }}
                >
                  Agregar Primer Consultorio
                </Button>
              </Box>
            ) : (
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(auto-fit, minmax(300px, 1fr))' }, gap: 2 }}>
                {offices.map((office) => (
                  <Card 
                    key={office.id} 
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
                    onClick={() => handleEditOffice(office)}
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
                          handleDeleteOffice(office);
                        }}
                        sx={{ color: 'error.main' }}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                    
                    <List dense>
                      <ListItem sx={{ px: 0 }}>
                        <ListItemIcon>
                          <LocationIcon color="action" />
                        </ListItemIcon>
                        <ListItemText 
                          primary="Dirección" 
                          secondary={office.address || 'No especificada'} 
                        />
                      </ListItem>
                      <ListItem sx={{ px: 0 }}>
                        <ListItemIcon>
                          <LocationIcon color="action" />
                        </ListItemIcon>
                        <ListItemText 
                          primary="Ciudad" 
                          secondary={office.city || 'No especificada'} 
                        />
                      </ListItem>
                      <ListItem sx={{ px: 0 }}>
                        <ListItemIcon>
                          <PhoneIcon color="action" />
                        </ListItemIcon>
                        <ListItemText 
                          primary="Teléfono" 
                          secondary={office.phone || 'No especificado'} 
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
                                  window.open(office.maps_url, '_blank');
                                }}
                                sx={{ p: 0, textTransform: 'none' }}
                              >
                                Ver en Maps
                              </Button>
                            }
                          />
                        </ListItem>
                      )}
                      <ListItem sx={{ px: 0 }}>
                        <ListItemIcon>
                          <AccessTimeIcon color="action" />
                        </ListItemIcon>
                        <ListItemText 
                          primary="Zona Horaria" 
                          secondary={office.timezone || 'America/Mexico_City'} 
                        />
                      </ListItem>
                    </List>
                  </Card>
                ))}
              </Box>
            )}
          </CardContent>
        </Card>

        {/* Schedule Management */}
        <Card sx={{ mt: 3 }}>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <ScheduleIcon color="primary" />
                Horarios
              </Typography>
            </Box>
            
            {scheduleLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                <CircularProgress />
              </Box>
            ) : scheduleError ? (
              <Alert severity="error" sx={{ mb: 2 }}>
                Error al cargar horarios: {scheduleError}
              </Alert>
            ) : scheduleData && Object.values(scheduleData).some(day => day && day.is_active) ? (
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(auto-fit, minmax(200px, 1fr))' }, gap: 2 }}>
                {Object.entries(scheduleData).map(([day, schedule]) => {
                  if (!schedule || !schedule.is_active) return null;
                  
                  const dayNames = {
                    monday: 'Lunes',
                    tuesday: 'Martes', 
                    wednesday: 'Miércoles',
                    thursday: 'Jueves',
                    friday: 'Viernes',
                    saturday: 'Sábado',
                    sunday: 'Domingo'
                  };
                  
                  const timeBlocks = schedule.time_blocks || [];
                  
                  return (
                    <Card 
                      key={day}
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
                      onClick={() => setScheduleConfigDialogOpen(true)}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <ScheduleIcon color="primary" sx={{ fontSize: 20 }} />
                        <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '1rem' }}>
                          {dayNames[day as keyof typeof dayNames]}
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
                })}
              </Box>
            ) : scheduleData ? (
              <Box sx={{ textAlign: 'center', p: 3 }}>
                <Typography variant="body1" color="text.secondary" gutterBottom>
                  No hay horarios configurados
                </Typography>
                <Button
                  variant="outlined"
                  startIcon={<ScheduleIcon />}
                  onClick={() => setScheduleConfigDialogOpen(true)}
                  sx={{ mt: 1 }}
                >
                  Configurar Horarios
                </Button>
              </Box>
            ) : (
              <Box sx={{ textAlign: 'center', p: 3 }}>
                <Typography variant="body1" color="text.secondary" gutterBottom>
                  No hay horarios configurados
                </Typography>
                <Button
                  variant="outlined"
                  startIcon={<ScheduleIcon />}
                  onClick={() => setScheduleConfigDialogOpen(true)}
                  sx={{ mt: 1 }}
                >
                  Configurar Horarios
                </Button>
              </Box>
            )}
            
            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
              <Button
                variant="contained"
                startIcon={<EditIcon />}
                onClick={() => setScheduleConfigDialogOpen(true)}
                sx={{ borderRadius: '8px' }}
              >
                {scheduleData ? 'Editar Horarios' : 'Configurar Horarios'}
              </Button>
            </Box>
          </CardContent>
        </Card>
      </Box>

      {/* Schedule Configuration Dialog */}
      <ScheduleConfigDialog
        open={scheduleConfigDialogOpen}
        onClose={() => setScheduleConfigDialogOpen(false)}
        onSave={() => setScheduleConfigDialogOpen(false)}
      />

      {/* Office Dialog */}
      <OfficeDialog
        open={officeDialogOpen}
        onClose={() => {
          setOfficeDialogOpen(false);
          setEditingOffice(null);
        }}
        onSave={handleSaveOffice}
        office={editingOffice}
        isEditing={!!editingOffice}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)}>
        <DialogTitle>Confirmar Eliminación</DialogTitle>
        <DialogContent>
          <Typography>
            ¿Estás seguro de que deseas eliminar el consultorio "{officeToDelete?.name}"?
            Esta acción no se puede deshacer.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)}>Cancelar</Button>
          <Button onClick={confirmDeleteOffice} color="error" variant="contained">
            Eliminar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Doctor Profile Dialog */}
      <DoctorProfileDialog
        open={dialogOpen}
        onClose={onCancel}
        isEditing={isEditing}
        formData={formData}
        setFormData={setFormData}
        onSubmit={onSave}
        formErrorMessage={formErrorMessage || ''}
        setFormErrorMessage={setFormErrorMessage || (() => {})}
        isSubmitting={isSubmitting || false}
        fieldErrors={fieldErrors || {}}
      />
    </React.Fragment>
  );
};

export default memo(DoctorProfileView);