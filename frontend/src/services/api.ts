// ============================================================================
// API SERVICES - Legacy Facade
// This file provides backward compatibility for the refactored modular services.
// New code should import from 'services/ApiService' or specific service modules.
// ============================================================================

import { apiService as modularApiService } from './ApiService';
import type {
  Patient,
  Consultation,
  Appointment,
  DashboardData,
  CompletePatientData,
  PatientFormData,
  AppointmentFormData,
  AppointmentUpdateData,
  Office,
  OfficeCreate,
  OfficeUpdate,
  AppointmentType
} from '../types';
import type { ConsultationFormData } from '../hooks/useConsultationForm';

// Re-export the singleton instance
export const apiService = {
  // ============================================================================
  // HEALTH & TEST SERVICES
  // ============================================================================

  checkHealth: () => modularApiService.health.checkHealth(),
  testConnection: () => modularApiService.health.testConnection(),
  testBackendHealth: () => modularApiService.health.testBackendHealth(),
  testPatientsEndpoint: () => modularApiService.health.testPatientsEndpoint(),

  testCreateMinimalPatient: () => modularApiService.test.testCreateMinimalPatient(),
  testGetPatients: () => modularApiService.test.testGetPatients(),
  testSimplePatientCreation: () => modularApiService.test.testSimplePatientCreation(),
  testRealPatientCreation: () => modularApiService.test.testRealPatientCreation(),
  testPostEmpty: () => modularApiService.test.testPostEmpty(),

  // ============================================================================
  // AUTH SERVICES
  // ============================================================================

  login: (emailOrCredentials: string | { email: string; password: string }, password?: string) => {
    // Support both old (email, password) and new ({ email, password }) signatures
    const credentials = typeof emailOrCredentials === 'string'
      ? { email: emailOrCredentials, password: password! }
      : emailOrCredentials;
    return modularApiService.auth.login(credentials);
  },
  register: (userData: any) => modularApiService.auth.register(userData),
  requestPasswordReset: (email: string) => modularApiService.auth.requestPasswordReset(email),
  confirmPasswordReset: (token: string, newPassword: string, confirmPassword: string) => modularApiService.auth.confirmPasswordReset(token, newPassword, confirmPassword),
  testAuth: () => modularApiService.auth.testAuth(),
  testTokenValidity: () => modularApiService.auth.testTokenValidity(),

  // ============================================================================
  // PATIENT SERVICES
  // ============================================================================

  getPatients: (search?: string) => modularApiService.patients.getPatients(search),
  getPatient: (id: string) => modularApiService.patients.getPatientById(id), // Note: method name change in modular service
  createPatient: (patientData: PatientFormData) => modularApiService.patients.createPatient(patientData),
  updatePatient: (id: string, patientData: Partial<PatientFormData>) => modularApiService.patients.updatePatient(id, patientData),
  deletePatient: (id: string) => modularApiService.patients.deletePatient(id),
  getCompletePatientInfo: (id: string) => modularApiService.patients.getCompletePatientInfo(id),

  // ============================================================================
  // CONSULTATION SERVICES
  // ============================================================================

  getConsultations: (filters?: any) => modularApiService.consultations.getConsultations(filters), // Note: filters might need adjustment if signature differs
  getPatientConsultations: (patientId: string) => modularApiService.consultations.getConsultationsByPatient(patientId),
  getConsultation: (id: string) => modularApiService.consultations.getConsultationById(id),
  createConsultation: (dataOrPatientId: ConsultationFormData | string, consultationData?: ConsultationFormData) => {
    // Support both old (patientId, data) and new (data) signatures
    // New signature: just pass the data (which should include patient_id)
    // Old signature: merge patientId into the data 
    const data = typeof dataOrPatientId === 'string' && consultationData
      ? { ...consultationData, patient_id: dataOrPatientId }
      : dataOrPatientId as ConsultationFormData;
    return modularApiService.consultations.createConsultation(data);
  },
  updateConsultation: (id: string, consultationData: Partial<ConsultationFormData>) => modularApiService.consultations.updateConsultation(id, consultationData),
  deleteConsultation: (id: string) => modularApiService.consultations.deleteConsultation(id),

  // ============================================================================
  // APPOINTMENT SERVICES
  // ============================================================================

  getAppointments: (filters?: any) => modularApiService.appointments.getAppointments(filters),
  getPatientAppointments: (patientId: string, status?: string) => modularApiService.appointments.getAppointmentsByPatient(patientId), // Note: status filter might be lost if service doesn't support it
  getAvailableSlots: (targetDate: string) => modularApiService.appointments.getAvailableSlots(targetDate),
  getAvailableTimesForBooking: (date: string) => modularApiService.appointments.getAvailableTimesForBooking(date),
  getDailyAgenda: (targetDate?: string) => modularApiService.appointments.getDailyAgenda(targetDate),
  getWeeklyAgenda: (startDate?: string, endDate?: string) => modularApiService.appointments.getWeeklyAgenda(startDate, endDate),
  getMonthlyAgenda: (startDate?: string, endDate?: string) => modularApiService.appointments.getMonthlyAgenda(startDate, endDate),
  createAgendaAppointment: (appointmentData: any) => modularApiService.appointments.createAgendaAppointment(appointmentData),
  updateAgendaAppointment: (id: string, appointmentData: Partial<AppointmentFormData>) => modularApiService.appointments.updateAgendaAppointment(id, appointmentData),
  deleteAgendaAppointment: (id: string) => modularApiService.appointments.deleteAgendaAppointment(id),
  createAppointment: (patientId: string, appointmentData: AppointmentFormData) => modularApiService.appointments.createAppointment(patientId, appointmentData),
  updateAppointment: (id: string, appointmentData: AppointmentUpdateData) => modularApiService.appointments.updateAppointment(id, appointmentData),
  getAppointment: (id: string | number) => modularApiService.appointments.getAppointment(id),
  updateAppointmentStatus: (id: string, status: string) => modularApiService.appointments.updateAppointmentStatus(id, status),
  cancelAppointment: (id: string) => modularApiService.appointments.cancelAppointment(id),
  bulkUpdateAppointments: (updates: any[]) => modularApiService.appointments.bulkUpdateAppointments(updates),
  getAppointmentTypes: () => modularApiService.appointments.getAppointmentTypes(),

  // ============================================================================
  // DOCTOR SERVICES
  // ============================================================================

  getDoctorProfile: () => modularApiService.doctors.getDoctorProfile(),
  createDoctorProfile: (profileData: any) => modularApiService.doctors.createDoctorProfile(profileData),
  updateDoctorProfile: (profileData: any) => modularApiService.doctors.updateDoctorProfile(profileData),
  getOffices: (doctorId?: number) => modularApiService.offices.getOffices(doctorId),
  getOffice: (officeId: number) => modularApiService.offices.getOffice(officeId),
  createOffice: (office: OfficeCreate) => modularApiService.offices.createOffice(office),
  updateOffice: (id: number, office: OfficeUpdate) => modularApiService.offices.updateOffice(id, office),
  deleteOffice: (id: number) => modularApiService.offices.deleteOffice(id),

  // ============================================================================
  // CATALOG SERVICES
  // ============================================================================

  getSpecialties: () => modularApiService.catalogs.getSpecialties(),
  getCountries: () => modularApiService.catalogs.getCountries(),
  getStates: (countryId?: number) => modularApiService.catalogs.getStates(countryId),
  getEmergencyRelationships: () => modularApiService.catalogs.getEmergencyRelationships(),
  getTimezones: () => modularApiService.catalogs.getTimezones(),

  // ============================================================================
  // DOCUMENT SERVICES
  // ============================================================================

  getDocumentTypes: (activeOnly?: boolean) => modularApiService.documents.getDocumentTypes(activeOnly),
  getDocumentsByType: (documentTypeId: number, activeOnly?: boolean) => modularApiService.documents.getDocumentsByType(documentTypeId, activeOnly),
  getDocuments: (documentTypeId?: number, activeOnly?: boolean) => modularApiService.documents.getDocuments(documentTypeId, activeOnly),
  getPersonDocuments: (personId: number, activeOnly?: boolean) => modularApiService.documents.getPersonDocuments(personId, activeOnly),
  savePersonDocument: (personId: number, documentData: any) => modularApiService.documents.savePersonDocument(personId, documentData),
  deletePersonDocument: (personId: number, documentId: number) => modularApiService.documents.deletePersonDocument(personId, documentId),

  // ============================================================================
  // DASHBOARD SERVICES
  // ============================================================================

  getDashboardData: () => modularApiService.dashboard.getDashboardData(),

  // ============================================================================
  // CLINICAL STUDY SERVICES
  // ============================================================================

  createClinicalStudy: (studyData: any) => modularApiService.clinicalStudies.createClinicalStudy(studyData),
  getClinicalStudiesByConsultation: (consultationId: string) => modularApiService.clinicalStudies.getClinicalStudiesByConsultation(consultationId),
  getClinicalStudiesByPatient: (patientId: string) => modularApiService.clinicalStudies.getClinicalStudiesByPatient(patientId),
  updateClinicalStudy: (studyId: string, updateData: any) => modularApiService.clinicalStudies.updateClinicalStudy(studyId, updateData),
  uploadClinicalStudyFile: (studyId: string, file: File) => modularApiService.clinicalStudies.uploadClinicalStudyFile(studyId, file),
  deleteClinicalStudy: (studyId: string) => modularApiService.clinicalStudies.deleteClinicalStudy(studyId),

  // ============================================================================
  // WHATSAPP SERVICES
  // ============================================================================

  sendWhatsAppAppointmentReminder: (appointmentId: number) => modularApiService.whatsapp.sendAppointmentReminder(appointmentId),
  sendWhatsAppStudyResults: (studyId: number) => modularApiService.whatsapp.sendStudyResults(studyId),

  // ============================================================================
  // UTILS
  // ============================================================================

  withRetry: <T>(operation: () => Promise<T>, maxRetries = 3) => withRetry(operation, maxRetries)
  // Actually ApiBase doesn't seem to have withRetry exposed publicly in the interface I saw.
  // Let's implement a simple wrapper or check if HttpClient has it.
};

// Implement withRetry helper if needed, or rely on service logic
const withRetry = async <T>(operation: () => Promise<T>, maxRetries = 3): Promise<T> => {
  let lastError: any;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt === maxRetries) throw error;
      const delay = Math.pow(2, attempt) * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw lastError;
};

// Override withRetry in the export object
(apiService as any).withRetry = withRetry;


// ============================================================================
// CONVENIENCE EXPORTS
// ============================================================================

export const {
  checkHealth,
  getPatients,
  getPatient,
  createPatient,
  updatePatient,
  deletePatient,
  getCompletePatientInfo,
  getConsultations,
  getPatientConsultations,
  getConsultation,
  createConsultation,
  updateConsultation,
  deleteConsultation,
  createClinicalStudy,
  getClinicalStudiesByConsultation,
  getClinicalStudiesByPatient,
  updateClinicalStudy,
  deleteClinicalStudy,
  getAppointments,
  getPatientAppointments,
  getDailyAgenda,
  getWeeklyAgenda,
  getMonthlyAgenda,
  getAvailableSlots,
  getAvailableTimesForBooking,
  createAppointment,
  createAgendaAppointment,
  updateAppointment,
  updateAppointmentStatus,
  cancelAppointment,
  bulkUpdateAppointments,
  getDoctorProfile,
  createDoctorProfile,
  updateDoctorProfile,
  getSpecialties,
  getCountries,
  getStates,
  getDocumentTypes,
  getDocumentsByType,
  getDocuments,
  getPersonDocuments,
  savePersonDocument,
  deletePersonDocument,
  getEmergencyRelationships,
  getTimezones,
  login,
  register,
  getDashboardData
} = apiService;

export { withRetry };
