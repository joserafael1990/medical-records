import React, { memo, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Card,
  CardContent,
  Grid,
  Divider,
  Chip,
  Avatar,
  IconButton,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Edit as EditIcon,
  Print as PrintIcon,
  Person as PersonIcon,
  LocalHospital as HospitalIcon,
  Assignment as AssignmentIcon,
  Medication as MedicationIcon,
  Schedule as ScheduleIcon,
  ExpandMore as ExpandMoreIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  CalendarToday as CalendarIcon,
  AccessTime as TimeIcon,
  Healing as HealingIcon,
  Psychology as PsychologyIcon,
  Science as ScienceIcon,
  Visibility as VisibilityIcon
} from '@mui/icons-material';
import { ClinicalStudy } from '../../types';
import { formatDateTime } from '../../utils';
import ClinicalStudiesSection from '../common/ClinicalStudiesSection';
import ClinicalStudyDialog from '../dialogs/ClinicalStudyDialog';
import { useClinicalStudies } from '../../hooks/useClinicalStudies';

interface ConsultationDetailViewProps {
  consultation: any; // TODO: Define proper ConsultationResponse type
  onBack: () => void;
  onEdit: (consultation: any) => void;
  onPrint?: (consultation: any) => void;
  doctorName?: string;
}

const ConsultationDetailView: React.FC<ConsultationDetailViewProps> = ({
  consultation,
  onBack,
  onEdit,
  onPrint,
  doctorName = 'Dr. Usuario Sistema'
}) => {
  // Clinical studies management
  const clinicalStudiesHook = useClinicalStudies();

  // Load clinical studies when consultation changes
  useEffect(() => {
    console.log('🔬 ConsultationDetailView useEffect triggered');
    console.log('🔬 Consultation object:', consultation);
    console.log('🔬 Consultation ID:', consultation?.id);
    
    if (consultation?.id) {
      console.log('🔬 Loading clinical studies for consultation:', consultation.id);
      console.log('🔬 Consultation ID type:', typeof consultation.id);
      // Convert to string if it's a number
      const consultationId = String(consultation.id);
      console.log('🔬 Converted consultation ID:', consultationId);
      clinicalStudiesHook.fetchStudies(consultationId);
    } else {
      console.log('🔬 No consultation ID found, skipping fetchStudies');
    }
  }, [consultation?.id, clinicalStudiesHook.fetchStudies]);

  // Handle clinical study operations
  const handleAddStudy = () => {
    clinicalStudiesHook.openAddDialog(
      consultation.id,
      consultation.patient_id,
      doctorName
    );
  };

  const handleEditStudy = (study: ClinicalStudy) => {
    clinicalStudiesHook.openEditDialog(study);
  };

  const handleDeleteStudy = async (studyId: string) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este estudio clínico?')) {
      try {
        await clinicalStudiesHook.deleteStudy(studyId);
      } catch (error) {
        console.error('Error deleting clinical study:', error);
      }
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'warning';
      case 'in_progress': return 'info';
      case 'completed': return 'success';
      case 'cancelled': return 'error';
      default: return 'default';
    }
  };

  const formatDate = (dateString: string): string => {
    try {
      return new Date(dateString).toLocaleDateString('es-MX', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <IconButton 
          onClick={onBack} 
          sx={{ mr: 2, bgcolor: 'action.hover' }}
          size="large"
        >
          <ArrowBackIcon />
        </IconButton>
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="h4" sx={{ fontWeight: 600, mb: 1 }}>
            Consulta Médica
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {formatDateTime(consultation.date)} • {consultation.patient_name}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<PrintIcon />}
            onClick={() => onPrint?.(consultation)}
            sx={{ borderRadius: '8px' }}
          >
            Imprimir
          </Button>
          <Button
            variant="contained"
            startIcon={<EditIcon />}
            onClick={() => onEdit(consultation)}
            sx={{ borderRadius: '8px' }}
          >
            Editar
          </Button>
        </Box>
      </Box>

      <Box sx={{ display: 'flex', gap: 3, flexDirection: { xs: 'column', md: 'row' } }}>
        {/* Patient Information */}
        <Box sx={{ flex: { md: '0 0 33%' } }}>
          <Card sx={{ borderRadius: '16px', height: 'fit-content' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <Avatar sx={{ bgcolor: 'primary.main', width: 56, height: 56, mr: 2 }}>
                  <PersonIcon />
                </Avatar>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    {consultation.patient_name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Paciente
                  </Typography>
                </Box>
              </Box>

              <Divider sx={{ mb: 2 }} />

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CalendarIcon sx={{ fontSize: 20, color: 'text.secondary' }} />
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      Fecha de Consulta
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {new Date(consultation.date).toLocaleDateString('es-MX', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        timeZone: 'America/Mexico_City'
                      })}
                    </Typography>
                  </Box>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <TimeIcon sx={{ fontSize: 20, color: 'text.secondary' }} />
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      Hora
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {new Date(consultation.date).toLocaleTimeString('es-MX', {
                        hour: '2-digit',
                        minute: '2-digit',
                        timeZone: 'America/Mexico_City'
                      })}
                    </Typography>
                  </Box>
                </Box>
              </Box>
            </CardContent>
          </Card>

          {/* Doctor Information */}
          <Card sx={{ borderRadius: '16px', mt: 3 }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Avatar sx={{ bgcolor: 'success.main', width: 48, height: 48, mr: 2 }}>
                  <HospitalIcon />
                </Avatar>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    Médico Tratante
                  </Typography>
                </Box>
              </Box>

              <Box sx={{ ml: 7 }}>
                <Typography variant="body1" sx={{ fontWeight: 500, mb: 0.5 }}>
                  {consultation.doctor_name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Cédula: {consultation.doctor_professional_license}
                </Typography>
                {consultation.doctor_specialty && (
                  <Typography variant="body2" color="text.secondary">
                    Especialidad: {consultation.doctor_specialty}
                  </Typography>
                )}
              </Box>
            </CardContent>
          </Card>
        </Box>

        {/* Consultation Details */}
        <Box sx={{ flex: 1 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            
            {/* Chief Complaint */}
            <Paper sx={{ p: 3, borderRadius: '16px' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <AssignmentIcon sx={{ color: 'primary.main', mr: 1 }} />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Motivo de Consulta
                </Typography>
              </Box>
              <Typography variant="body1" sx={{ lineHeight: 1.6 }}>
                {consultation.chief_complaint}
              </Typography>
            </Paper>

            {/* History of Present Illness */}
            <Paper sx={{ p: 3, borderRadius: '16px' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <PsychologyIcon sx={{ color: 'info.main', mr: 1 }} />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Historia de la Enfermedad Actual
                </Typography>
              </Box>
              <Typography variant="body1" sx={{ lineHeight: 1.6 }}>
                {consultation.history_present_illness}
              </Typography>
            </Paper>

            {/* Physical Examination */}
            <Paper sx={{ p: 3, borderRadius: '16px' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <VisibilityIcon sx={{ color: 'warning.main', mr: 1 }} />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Exploración Física
                </Typography>
              </Box>
              <Typography variant="body1" sx={{ lineHeight: 1.6 }}>
                {consultation.physical_examination}
              </Typography>
            </Paper>

            {/* Diagnosis */}
            <Paper sx={{ p: 3, borderRadius: '16px' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <HealingIcon sx={{ color: 'error.main', mr: 1 }} />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Diagnósticos
                </Typography>
              </Box>
              
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                  Diagnóstico Principal:
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Chip 
                    label="Principal" 
                    size="small" 
                    color="error" 
                    variant="outlined" 
                  />
                  <Typography variant="body1">
                    {consultation.primary_diagnosis}
                  </Typography>
                </Box>

              </Box>

              {consultation.secondary_diagnoses && (
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                    Diagnósticos Secundarios:
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Chip 
                      label="Secundario" 
                      size="small" 
                      color="warning" 
                      variant="outlined" 
                    />
                    <Typography variant="body1">
                      {consultation.secondary_diagnoses}
                    </Typography>
                  </Box>

                </Box>
              )}
            </Paper>

            {/* Treatment Plan */}
            <Paper sx={{ p: 3, borderRadius: '16px' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <MedicationIcon sx={{ color: 'success.main', mr: 1 }} />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Plan de Tratamiento
                </Typography>
              </Box>
              <Typography variant="body1" sx={{ lineHeight: 1.6 }}>
                {consultation.treatment_plan}
              </Typography>
            </Paper>

            {/* Follow-up Instructions */}
            <Paper sx={{ p: 3, borderRadius: '16px' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <ScheduleIcon sx={{ color: 'info.main', mr: 1 }} />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Instrucciones de Seguimiento
                </Typography>
              </Box>
              <Typography variant="body1" sx={{ lineHeight: 1.6 }}>
                {consultation.follow_up_instructions}
              </Typography>
            </Paper>

            {/* Clinical Studies Section */}
            <Paper sx={{ borderRadius: '16px', overflow: 'hidden' }}>
              <ClinicalStudiesSection
                consultationId={String(consultation.id)}
                patientId={String(consultation.patient_id)}
                studies={clinicalStudiesHook.studies}
                isLoading={clinicalStudiesHook.isLoading}
                onAddStudy={handleAddStudy}
                onEditStudy={handleEditStudy}
                onDeleteStudy={handleDeleteStudy}
                onViewFile={clinicalStudiesHook.viewFile}
                onDownloadFile={clinicalStudiesHook.downloadFile}
              />
            </Paper>

            {/* Additional Information */}
            {(consultation.prognosis || consultation.laboratory_results || consultation.imaging_studies) && (
              <Accordion sx={{ borderRadius: '16px !important' }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    Información Adicional
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    
                    {consultation.prognosis && (
                      <Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                          Pronóstico:
                        </Typography>
                        <Typography variant="body1" sx={{ lineHeight: 1.6 }}>
                          {consultation.prognosis}
                        </Typography>
                      </Box>
                    )}

                    {consultation.laboratory_results && (
                      <Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                          Resultados de Laboratorio:
                        </Typography>
                        <Typography variant="body1" sx={{ lineHeight: 1.6 }}>
                          {consultation.laboratory_results}
                        </Typography>
                      </Box>
                    )}

                    {consultation.imaging_studies && (
                      <Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                          Estudios de Imagen:
                        </Typography>
                        <Typography variant="body1" sx={{ lineHeight: 1.6 }}>
                          {consultation.imaging_studies}
                        </Typography>
                      </Box>
                    )}

                    {consultation.interconsultations && (
                      <Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                          Interconsultas:
                        </Typography>
                        <Typography variant="body1" sx={{ lineHeight: 1.6 }}>
                          {consultation.interconsultations}
                        </Typography>
                      </Box>
                    )}

                  </Box>
                </AccordionDetails>
              </Accordion>
            )}

            {/* Metadata */}
            <Paper sx={{ p: 3, borderRadius: '16px', bgcolor: 'grey.50' }}>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                Información del Registro
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    Creado por: {consultation.created_by}
                  </Typography>
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    Fecha de creación: {formatDateTime(consultation.created_at)}
                  </Typography>
                </Box>
                {consultation.updated_by && (
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                      Última actualización por: {consultation.updated_by}
                    </Typography>
                  </Box>
                )}
                {consultation.updated_at && (
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                      Fecha de actualización: {formatDateTime(consultation.updated_at)}
                    </Typography>
                  </Box>
                )}
              </Box>
            </Paper>

          </Box>
        </Box>
      </Box>

      {/* Clinical Study Dialog */}
      <ClinicalStudyDialog
        open={clinicalStudiesHook.clinicalStudyDialogOpen}
        onClose={clinicalStudiesHook.closeDialog}
        onSubmit={clinicalStudiesHook.submitForm}
        formData={clinicalStudiesHook.clinicalStudyFormData}
        onFormDataChange={clinicalStudiesHook.updateFormData}
        isEditing={clinicalStudiesHook.isEditingClinicalStudy}
        isSubmitting={clinicalStudiesHook.isSubmitting}
        error={clinicalStudiesHook.error}
      />
    </Box>
  );
};

export default memo(ConsultationDetailView);
