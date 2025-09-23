import React, { Suspense } from 'react';
import { Box } from '@mui/material';
import {
  DashboardView,
  PatientsViewSmart,
  ConsultationsViewSmart,
  AgendaView,
  MedicalRecordsView,
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
  medicalRecordsData: any;
  onRefreshRecords: () => void;
  doctorProfile: any;
  onSaveProfile: (profile: any) => void;
}

export const ViewRenderer: React.FC<ViewRendererProps> = ({
  activeView,
  dashboardData,
  onRefreshDashboard,
  patientManagement,
  consultationManagement,
  appointmentManager,
  medicalRecordsData,
  onRefreshRecords,
  doctorProfile,
  onSaveProfile
}) => {
  return (
    <Box sx={{ width: { xs: '100%', md: '75%' } }}>
      {activeView === 'dashboard' && (
        <Suspense fallback={<LoadingFallback message="Cargando dashboard..." />}>
          <DashboardView 
            dashboardData={dashboardData}
            appointments={appointmentManager.appointments}
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
            onBack={consultationManagement.exitDetailView}
            onEdit={() => {}}
          />
        </Suspense>
      )}

      {activeView === 'medical-records' && (
        <Suspense fallback={<LoadingFallback message="Cargando expedientes médicos..." />}>
          <MedicalRecordsView
            patients={patientManagement.patients}
            onCreateRecord={async () => {}}
            onUpdateRecord={async () => {}}
            isLoading={false}
            onRefresh={() => {}}
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
          />
        </Suspense>
      )}

      {activeView === 'profile' && (
        <Suspense fallback={<LoadingFallback message="Cargando perfil..." />}>
          <DoctorProfileView
            doctorProfile={doctorProfile}
            isLoading={false}
            onEdit={() => {}}
            isEditing={false}
            onSave={onSaveProfile}
            formData={{
              title: '',
              first_name: '',
              paternal_surname: '',
              maternal_surname: '',
              email: '',
              phone: '',
              birth_date: '',
              gender: '',
              curp: '',
              rfc: '',
              professional_license: '',
              specialty_license: '',
              university: '',
              graduation_year: '',
              specialty: '',
              subspecialty: '',
              professional_email: '',
              office_phone: '',
              office_address: '',
              office_city: '',
              office_state_id: '',
              office_postal_code: '',
              office_country: ''
            }}
            setFormData={() => {}}
            onCancel={() => {}}
            successMessage=""
            errorMessage=""
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
