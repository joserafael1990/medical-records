import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  IconButton,
  Divider,
  Grid,
  Card,
  CardContent,
  Chip,
  Avatar
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Edit as EditIcon,
  Print as PrintIcon,
  Person as PersonIcon,
  CalendarToday as CalendarIcon,
  MedicalServices as MedicalIcon,
  Description as DescriptionIcon
} from '@mui/icons-material';
import { MedicalRecord } from '../../types';
import { formatDate } from '../../utils/dateHelpers';

interface MedicalRecordDetailViewProps {
  record: MedicalRecord;
  onBack: () => void;
  onEdit: (record: MedicalRecord) => void;
  onPrint: (record: MedicalRecord) => void;
}

const MedicalRecordDetailView: React.FC<MedicalRecordDetailViewProps> = ({
  record,
  onBack,
  onEdit,
  onPrint
}) => {
  const getPatientName = () => {
    if (record.patient) {
      return `${record.patient.first_name} ${record.patient.paternal_surname} ${record.patient.maternal_surname || ''}`.trim();
    }
    return 'Paciente no encontrado';
  };

  const getDoctorName = () => {
    if (record.doctor) {
      return `${record.doctor.first_name} ${record.doctor.paternal_surname} ${record.doctor.maternal_surname || ''}`.trim();
    }
    return 'Doctor no encontrado';
  };

  const formatDateTime = (dateString: string): string => {
    try {
      return new Date(dateString).toLocaleDateString('es-MX', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Expediente Médico - ${getPatientName()}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.6; }
            .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
            .section { margin-bottom: 25px; }
            .section-title { font-weight: bold; font-size: 16px; color: #333; margin-bottom: 10px; border-bottom: 1px solid #ccc; padding-bottom: 5px; }
            .patient-info, .doctor-info { display: inline-block; width: 48%; vertical-align: top; }
            .content { margin-left: 10px; }
            @media print { body { margin: 0; } }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>EXPEDIENTE MÉDICO</h1>
            <p><strong>Fecha de Consulta:</strong> ${formatDateTime(record.consultation_date)}</p>
            ${record.record_code ? `<p><strong>Código:</strong> ${record.record_code}</p>` : ''}
          </div>
          
          <div class="section">
            <div class="patient-info">
              <div class="section-title">INFORMACIÓN DEL PACIENTE</div>
              <div class="content">
                <p><strong>Nombre:</strong> ${getPatientName()}</p>
                <p><strong>ID:</strong> ${record.patient_id}</p>
              </div>
            </div>
            <div class="doctor-info">
              <div class="section-title">MÉDICO RESPONSABLE</div>
              <div class="content">
                <p><strong>Nombre:</strong> ${getDoctorName()}</p>
                <p><strong>ID:</strong> ${record.doctor_id}</p>
              </div>
            </div>
          </div>
          
          <div class="section">
            <div class="section-title">MOTIVO DE CONSULTA</div>
            <div class="content">${record.chief_complaint}</div>
          </div>
          
          <div class="section">
            <div class="section-title">HISTORIA DE LA ENFERMEDAD ACTUAL</div>
            <div class="content">${record.history_present_illness}</div>
          </div>
          
          <div class="section">
            <div class="section-title">ANTECEDENTES HEREDOFAMILIARES</div>
            <div class="content">${record.family_history}</div>
          </div>
          
          <div class="section">
            <div class="section-title">ANTECEDENTES PATOLÓGICOS PERSONALES</div>
            <div class="content">${record.personal_pathological_history}</div>
          </div>
          
          <div class="section">
            <div class="section-title">ANTECEDENTES NO PATOLÓGICOS</div>
            <div class="content">${record.personal_non_pathological_history}</div>
          </div>
          
          <div class="section">
            <div class="section-title">EXPLORACIÓN FÍSICA</div>
            <div class="content">${record.physical_examination}</div>
          </div>
          
          <div class="section">
            <div class="section-title">DIAGNÓSTICO PRINCIPAL</div>
            <div class="content">${record.primary_diagnosis}</div>
          </div>
          
          ${record.secondary_diagnoses ? `
          <div class="section">
            <div class="section-title">DIAGNÓSTICOS SECUNDARIOS</div>
            <div class="content">${record.secondary_diagnoses}</div>
          </div>
          ` : ''}
          
          ${record.differential_diagnosis ? `
          <div class="section">
            <div class="section-title">DIAGNÓSTICO DIFERENCIAL</div>
            <div class="content">${record.differential_diagnosis}</div>
          </div>
          ` : ''}
          
          <div class="section">
            <div class="section-title">PLAN DE TRATAMIENTO</div>
            <div class="content">${record.treatment_plan}</div>
          </div>
          
          ${record.prescribed_medications ? `
          <div class="section">
            <div class="section-title">MEDICAMENTOS PRESCRITOS</div>
            <div class="content">${record.prescribed_medications}</div>
          </div>
          ` : ''}
          
          <div class="section">
            <div class="section-title">INSTRUCCIONES DE SEGUIMIENTO</div>
            <div class="content">${record.follow_up_instructions}</div>
          </div>
          
          <div class="section">
            <div class="section-title">PRONÓSTICO</div>
            <div class="content">${record.prognosis}</div>
          </div>
          
          ${record.laboratory_results ? `
          <div class="section">
            <div class="section-title">RESULTADOS DE LABORATORIO</div>
            <div class="content">${record.laboratory_results}</div>
          </div>
          ` : ''}
          
          ${record.imaging_results ? `
          <div class="section">
            <div class="section-title">RESULTADOS DE IMÁGENES</div>
            <div class="content">${record.imaging_results}</div>
          </div>
          ` : ''}
          
          ${record.notes ? `
          <div class="section">
            <div class="section-title">NOTAS ADICIONALES</div>
            <div class="content">${record.notes}</div>
          </div>
          ` : ''}
          
          <div style="margin-top: 50px; text-align: center; font-size: 12px; color: #666;">
            <p>Expediente creado el ${formatDateTime(record.created_at)}</p>
            ${record.updated_at !== record.created_at ? 
              `<p>Última actualización: ${formatDateTime(record.updated_at)}</p>` : ''}
          </div>
        </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
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
            Expediente Médico
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {formatDateTime(record.consultation_date)} • 
            {record.record_code && ` Código: ${record.record_code}`}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<PrintIcon />}
            onClick={handlePrint}
            sx={{ borderRadius: '8px' }}
          >
            Imprimir
          </Button>
          <Button
            variant="contained"
            startIcon={<EditIcon />}
            onClick={() => onEdit(record)}
            sx={{ borderRadius: '8px' }}
          >
            Editar
          </Button>
        </Box>
      </Box>

      <Divider sx={{ mb: 3 }} />

      {/* Patient and Doctor Information */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
                  <PersonIcon />
                </Avatar>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Información del Paciente
                </Typography>
              </Box>
              <Typography variant="body1" sx={{ fontWeight: 500, mb: 1 }}>
                {getPatientName()}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                ID: {record.patient_id}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Avatar sx={{ bgcolor: 'success.main', mr: 2 }}>
                  <MedicalIcon />
                </Avatar>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Médico Responsable
                </Typography>
              </Box>
              <Typography variant="body1" sx={{ fontWeight: 500, mb: 1 }}>
                {getDoctorName()}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                ID: {record.doctor_id}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Medical Information */}
      <Grid container spacing={3}>
        {/* Chief Complaint */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <DescriptionIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Motivo de Consulta
                </Typography>
              </Box>
              <Typography variant="body1" paragraph>
                {record.chief_complaint}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* History of Present Illness */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                Historia de la Enfermedad Actual
              </Typography>
              <Typography variant="body1" paragraph>
                {record.history_present_illness}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Family History */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                Antecedentes Heredofamiliares
              </Typography>
              <Typography variant="body1" paragraph>
                {record.family_history}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Personal Pathological History */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                Antecedentes Patológicos Personales
              </Typography>
              <Typography variant="body1" paragraph>
                {record.personal_pathological_history}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Personal Non-Pathological History */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                Antecedentes No Patológicos
              </Typography>
              <Typography variant="body1" paragraph>
                {record.personal_non_pathological_history}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Physical Examination */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                Exploración Física
              </Typography>
              <Typography variant="body1" paragraph>
                {record.physical_examination}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Primary Diagnosis */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                Diagnóstico Principal
              </Typography>
              <Typography variant="body1" paragraph>
                {record.primary_diagnosis}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Secondary Diagnoses */}
        {record.secondary_diagnoses && (
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                  Diagnósticos Secundarios
                </Typography>
                <Typography variant="body1" paragraph>
                  {record.secondary_diagnoses}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Differential Diagnosis */}
        {record.differential_diagnosis && (
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                  Diagnóstico Diferencial
                </Typography>
                <Typography variant="body1" paragraph>
                  {record.differential_diagnosis}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Treatment Plan */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                Plan de Tratamiento
              </Typography>
              <Typography variant="body1" paragraph>
                {record.treatment_plan}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Prescribed Medications */}
        {record.prescribed_medications && (
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                  Medicamentos Prescritos
                </Typography>
                <Typography variant="body1" paragraph>
                  {record.prescribed_medications}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Follow-up Instructions */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                Instrucciones de Seguimiento
              </Typography>
              <Typography variant="body1" paragraph>
                {record.follow_up_instructions}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Prognosis */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                Pronóstico
              </Typography>
              <Typography variant="body1" paragraph>
                {record.prognosis}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Laboratory Results */}
        {record.laboratory_results && (
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                  Resultados de Laboratorio
                </Typography>
                <Typography variant="body1" paragraph>
                  {record.laboratory_results}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Imaging Results */}
        {record.imaging_results && (
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                  Resultados de Imágenes
                </Typography>
                <Typography variant="body1" paragraph>
                  {record.imaging_results}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Additional Notes */}
        {record.notes && (
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                  Notas Adicionales
                </Typography>
                <Typography variant="body1" paragraph>
                  {record.notes}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>

      {/* Footer with creation info */}
      <Box sx={{ mt: 4, pt: 3, borderTop: 1, borderColor: 'divider' }}>
        <Typography variant="body2" color="text.secondary" align="center">
          Expediente creado el {formatDateTime(record.created_at)}
          {record.updated_at !== record.created_at && 
            ` • Última actualización: ${formatDateTime(record.updated_at)}`
          }
        </Typography>
      </Box>
    </Box>
  );
};

export default MedicalRecordDetailView;
