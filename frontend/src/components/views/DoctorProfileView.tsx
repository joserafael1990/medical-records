import React, { memo, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Divider,
  Button,
  Alert,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress
} from '@mui/material';
import {
  Person as PersonIcon,
  Schedule as ScheduleIcon,
  Add as AddIcon,
  Edit as EditIcon,
  LocationOn as LocationIcon
} from '@mui/icons-material';
import DoctorProfileDialog from '../dialogs/DoctorProfileDialog';
import ScheduleConfigDialog from '../dialogs/ScheduleConfigDialog';
import OfficeDialog from '../dialogs/OfficeDialog';
import GoogleCalendarSettings from '../settings/GoogleCalendarSettings';
import { useDoctorProfileView } from '../../hooks/useDoctorProfileView';
import { ProfileHeader } from '../profile/ProfileHeader';
import { PersonalInfoCard } from '../profile/PersonalInfoCard';
import { ProfessionalInfoCard } from '../profile/ProfessionalInfoCard';
import { OfficeCard } from '../profile/OfficeCard';
import { ScheduleCard } from '../profile/ScheduleCard';
import IntakePreferencesPanel from '../profile/IntakePreferencesPanel';
import SignatureProfileSection from './SignatureProfileSection';

interface DoctorProfileViewProps {
  doctorProfile: any;
  isLoading: boolean;
  onEdit: () => void;
  onSave: (documents?: { professional_documents?: any[], personal_documents?: any[] }) => void;
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
  // Use the custom hook for all view logic
  const viewHook = useDoctorProfileView({
    doctorProfileId: doctorProfile?.id
  });

  const {
    scheduleConfigDialogOpen,
    setScheduleConfigDialogOpen,
    officeDialogOpen,
    setOfficeDialogOpen,
    editingOffice,
    setEditingOffice,
    deleteConfirmOpen,
    setDeleteConfirmOpen,
    officeToDelete,
    offices,
    officesLoading,
    officesError,
    handleNewOffice,
    handleEditOffice,
    handleDeleteOffice,
    confirmDeleteOffice,
    handleSaveOffice,
    scheduleData,
    scheduleLoading,
    scheduleError,
    refetchSchedule,
    formatDate
  } = viewHook;

  // When ProfileCompletionBanner (or any deep link) navigates here with
  // `#offices` / `#schedule`, scroll the matching section into view after
  // the view renders. Not a rules-of-hooks issue: declared before any
  // early return.
  useEffect(() => {
    if (isLoading || !doctorProfile) return;
    const hash = window.location.hash.replace('#', '');
    if (!hash) return;
    const timer = window.setTimeout(() => {
      const el = document.getElementById(hash);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 150);
    return () => window.clearTimeout(timer);
  }, [isLoading, doctorProfile]);

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


  return (
    <React.Fragment>
      <Box sx={{ p: 3 }}>
        {/* Header */}
        <ProfileHeader doctorProfile={doctorProfile} onEdit={onEdit} />

        {/* Messages */}
        {errorMessage && (
          <Box sx={{ mb: 3, p: 2, bgcolor: 'error.main', borderRadius: 1 }}>
            <Typography color="white">{errorMessage}</Typography>
          </Box>
        )}

        {/* Profile Information Cards */}
        <Box id="cedula" sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 3, scrollMarginTop: 24 }}>
          <PersonalInfoCard doctorProfile={doctorProfile} />
          <ProfessionalInfoCard doctorProfile={doctorProfile} />
        </Box>

        {/* Office Management */}
        <Card id="offices" sx={{ mt: 3, scrollMarginTop: 24 }}>
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
                  <OfficeCard
                    key={office.id}
                    office={office}
                    onEdit={handleEditOffice}
                    onDelete={handleDeleteOffice}
                  />
                ))}
              </Box>
            )}
          </CardContent>
        </Card>

        {/* Schedule Management */}
        <Card id="schedule" sx={{ mt: 3, scrollMarginTop: 24 }}>
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
                {Object.entries(scheduleData).map(([day, schedule]: [string, any]) => {
                  if (!schedule || !schedule.is_active) return null;

                  return (
                    <ScheduleCard
                      key={day}
                      day={day}
                      schedule={schedule}
                      onClick={() => setScheduleConfigDialogOpen(true)}
                    />
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

        {/* Signature identity (cédula, RFC, CURP) */}
        <SignatureProfileSection />

        {/* Intake questionnaire preferences */}
        <IntakePreferencesPanel />

        {/* Google Calendar Integration */}
        <Box sx={{ mt: 3 }}>
          <GoogleCalendarSettings doctorId={doctorProfile?.id} />
        </Box>
      </Box>

      {/* Schedule Configuration Dialog */}
      <ScheduleConfigDialog
        open={scheduleConfigDialogOpen}
        onClose={() => setScheduleConfigDialogOpen(false)}
        onSave={() => setScheduleConfigDialogOpen(false)}
        onScheduleUpdated={() => {
          refetchSchedule();
        }}
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
      <Dialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        aria-labelledby="office-delete-title"
      >
        <DialogTitle id="office-delete-title">Confirmar Eliminación</DialogTitle>
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
        onSubmit={(documents) => {
          // onSave es handleSubmit del hook, que acepta documentos como parámetro
          if (documents) {
            onSave(documents);
          } else {
            onSave();
          }
        }}
        formErrorMessage={formErrorMessage || ''}
        setFormErrorMessage={setFormErrorMessage || (() => { })}
        isSubmitting={isSubmitting || false}
        fieldErrors={fieldErrors || {}}
      />
    </React.Fragment>
  );
};

export default memo(DoctorProfileView);