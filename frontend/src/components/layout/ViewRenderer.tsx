import React, { Suspense } from 'react';
import { Box } from '@mui/material';
import {
  DashboardView,
  PatientsViewSmart,
  ConsultationsViewSmart,
  AgendaView,
  DoctorProfileView
} from '../lazy';
import { ConsultationDetailView } from '../';
import { LoadingFallback } from '../';

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
  doctorProfileHook
}) => {
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
            doctorProfile={doctorProfile}
          />
        </Suspense>
      )}

      {activeView === 'patients' && (
        <Suspense fallback={<LoadingFallback message="Cargando pacientes..." />}>
          <PatientsViewSmart
            patients={patientManagement.patients}
            consultations={consultationManagement.consultations}
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
            doctorName={doctorProfile?.full_name || 'Dr. Usuario Sistema'}
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

      {/* WhatsApp and Analytics views not implemented yet */}
      {(activeView === 'whatsapp' || activeView === 'analytics') && (
        <Box sx={{ p: 3, textAlign: 'center' }}>
          <h2>Vista en desarrollo</h2>
          <p>Esta funcionalidad estará disponible próximamente.</p>
        </Box>
      )}
    </Box>
  );
};
