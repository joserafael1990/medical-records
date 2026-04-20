import React, { Suspense, useEffect } from 'react';
import { Box, Typography } from '@mui/material';
import { trackAmplitudePageView, trackAmplitudeEvent } from '../../utils/amplitudeHelper';
import {
  DashboardView,
  PatientsViewSmart,
  ConsultationsViewSmart,
  AgendaView,
  DoctorProfileView
} from '../lazy';
import PatientsView from '../views/PatientsView';
import { ConsultationDetailView } from '../';
import { LoadingFallback } from '../';
import { LazyWrapper } from '../common/LazyWrapper';
import { PracticeDashboard } from '../views/PracticeDashboard';
import { LicenseManagement } from '../admin/LicenseManagement';
import { LLMTracesView } from '../views/admin/LLMTracesView';

interface ViewRendererProps {
  activeView: string;
  dashboardData: any;
  onRefreshDashboard: () => void;
  patientManagement: any;
  consultationManagement: any;
  appointmentManager: any;
  doctorProfile: any;
  onSaveProfile: (profile: any) => void;
  doctorProfileHook: any;
  personType?: string; // 'doctor', 'patient', 'admin'
  onNavigateToProfile?: (anchor?: string) => void;
  /** Navigate to another top-level view by id (e.g. 'agenda'). Used by
   *  cards inside DashboardView that link to a full view. */
  navigateToView?: (view: string) => void;
}

export const ViewRenderer: React.FC<ViewRendererProps> = ({
  activeView,
  dashboardData,
  onRefreshDashboard,
  patientManagement,
  consultationManagement,
  appointmentManager,
  doctorProfile,
  onSaveProfile,
  doctorProfileHook,
  personType,
  onNavigateToProfile,
  navigateToView,
}) => {
  // Track view navigation
  useEffect(() => {
    trackAmplitudePageView(activeView, `View: ${activeView}`);
    trackAmplitudeEvent('view_navigated', {
      view_name: activeView
    });
  }, [activeView]);

  return (
    <Box sx={{ width: { xs: '100%', md: '75%' } }}>
      {activeView === 'dashboard' && (
        <Suspense fallback={<LoadingFallback message="Cargando dashboard..." />}>
          <DashboardView
            dashboardData={dashboardData}
            appointments={appointmentManager.appointments}
            consultations={consultationManagement.consultations}
            onNewAppointment={appointmentManager.handleNewAppointment}
            onNewConsultation={consultationManagement.handleNewConsultation}
            onNewPatient={patientManagement.openPatientDialog}
            onNavigateToAgenda={navigateToView ? () => navigateToView('agenda') : undefined}
            doctorProfile={doctorProfile}
            onNavigateToProfile={onNavigateToProfile}
          />
        </Suspense>
      )}

      {activeView === 'patients' && (
        <Suspense fallback={<LoadingFallback message="Cargando pacientes..." />}>
          <PatientsView
            patients={patientManagement.patients}
            consultations={consultationManagement.consultations}
            patientSearchTerm={patientManagement.patientSearchTerm}
            setPatientSearchTerm={patientManagement.setPatientSearchTerm}
            successMessage=""
            setSuccessMessage={() => {}}
            handleNewPatient={() => patientManagement.openPatientDialog()}
            handleEditPatient={(patient) => patientManagement.openPatientDialog(patient)}
          />
        </Suspense>
      )}

      {activeView === 'consultations' && !consultationManagement.consultationDetailView && (
        <Suspense fallback={<LoadingFallback message="Cargando consultas..." />}>
          <ConsultationsViewSmart
            consultations={consultationManagement.consultations}
            patients={patientManagement.patients}
            appointments={appointmentManager.appointments}
            successMessage=""
            setSuccessMessage={() => {}}
            handleNewConsultation={consultationManagement.handleNewConsultation}
            handleEditConsultation={consultationManagement.handleEditConsultation}
          />
        </Suspense>
      )}

      {activeView === 'consultations' && consultationManagement.consultationDetailView && consultationManagement.selectedConsultation && (
        <Suspense fallback={<LoadingFallback message="Cargando detalles..." />}>
          <ConsultationDetailView
            consultation={consultationManagement.selectedConsultation}
            onBack={consultationManagement.handleBackFromConsultationDetail}
            onEdit={() => {}}
            doctorName={doctorProfile?.full_name || `${doctorProfile?.title || 'Dr.'} Usuario Sistema`}
          />
        </Suspense>
      )}

      {activeView === 'agenda' && (
        <Suspense fallback={<LoadingFallback message="Cargando agenda..." />}>
          <AgendaView
            appointments={appointmentManager.appointments}
            selectedDate={appointmentManager.selectedDate}
            setSelectedDate={appointmentManager.setSelectedDate}
            agendaView={appointmentManager.agendaView}
            setAgendaView={appointmentManager.setAgendaView}
            handleNewAppointment={appointmentManager.handleNewAppointment}
            handleEditAppointment={appointmentManager.handleEditAppointment}
            cancelAppointment={appointmentManager.cancelAppointment}
            refreshAppointments={appointmentManager.refreshAppointments}
            forceRefresh={appointmentManager.forceRefresh}
          />
        </Suspense>
      )}

      {activeView === 'profile' && (
        <Suspense fallback={<LoadingFallback message="Cargando perfil..." />}>
          <DoctorProfileView
            doctorProfile={doctorProfileHook.doctorProfile}
            isLoading={doctorProfileHook.isLoading}
            onEdit={doctorProfileHook.handleEdit}
            isEditing={doctorProfileHook.isEditing}
            dialogOpen={doctorProfileHook.dialogOpen}
            onSave={onSaveProfile}
            formData={doctorProfileHook.formData}
            setFormData={doctorProfileHook.setFormData}
            onCancel={doctorProfileHook.handleCancel}
            successMessage={doctorProfileHook.successMessage}
            errorMessage={doctorProfileHook.formErrorMessage}
            formErrorMessage={doctorProfileHook.formErrorMessage}
            setFormErrorMessage={doctorProfileHook.setFormErrorMessage}
            isSubmitting={doctorProfileHook.isSubmitting}
            fieldErrors={doctorProfileHook.fieldErrors}
          />
        </Suspense>
      )}

      {/* The old "analytics" view was folded into "Mi consultorio" so we
          redirect any stale `activeView === 'analytics'` (from bookmarks
          or in-progress nav state) to the consolidated dashboard. */}
      {(activeView === 'practice' || activeView === 'analytics') && (
        <PracticeDashboard />
      )}

      {activeView === 'licenses' && personType === 'admin' && (
        <Suspense fallback={<LoadingFallback message="Cargando licencias..." />}>
          <LicenseManagement />
        </Suspense>
      )}
      
      {activeView === 'licenses' && personType !== 'admin' && (
        <Box sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="h5" color="error" gutterBottom>
            Acceso Denegado
          </Typography>
          <Typography variant="body1" color="text.secondary">
            No tienes permisos para acceder a esta sección.
          </Typography>
        </Box>
      )}

      {activeView === 'admin-llm-traces' && personType === 'admin' && <LLMTracesView />}

      {activeView === 'admin-llm-traces' && personType !== 'admin' && (
        <Box sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="h5" color="error" gutterBottom>
            Acceso Denegado
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Solo administradores pueden ver el monitoreo de LLM.
          </Typography>
        </Box>
      )}
    </Box>
  );
};
