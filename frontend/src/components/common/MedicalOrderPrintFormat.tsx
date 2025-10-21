// ============================================================================
// MEDICAL ORDER PRINT FORMAT - Formato de impresión para órdenes médicas
// Conforme a NOM-004-SSA3-2012 - Compatible con MUI v7
// ============================================================================

import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableRow,
  Chip
} from '@mui/material';
import { format } from 'date-fns';
import { formatDateTimeShort } from '../../utils/dateHelpers';
import { 
  MedicalOrder,
  Patient,
  DoctorProfile 
} from '../../types';

interface MedicalOrderPrintFormatProps {
  order: MedicalOrder;
  patient?: Patient;
  doctorInfo?: DoctorProfile;
  institutionInfo?: {
    name: string;
    address: string;
    phone: string;
    email: string;
    logo?: string;
  };
}

const MedicalOrderPrintFormat: React.FC<MedicalOrderPrintFormatProps> = ({
  order,
  patient,
  doctorInfo,
  institutionInfo = {
    name: 'CORTEX Medical System',
    address: 'Av. Revolución 123, Col. Centro, Ciudad de México',
    phone: '+52 (55) 1234-5678',
    email: 'contacto@cortex.medical'
  }
}) => {
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'dd/MM/yyyy');
    } catch {
      return 'Fecha inválida';
    }
  };

  const formatDateTime = (dateString: string) => {
    try {
      return formatDateTimeShort(dateString);
    } catch {
      return 'Fecha inválida';
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'urgente': return 'URGENTE';
      case 'preferente': return 'Preferente';
      case 'rutina': return 'Rutina';
      default: return priority;
    }
  };

  return (
    <Paper 
      sx={{ 
        p: 4, 
        maxWidth: '210mm', 
        minHeight: '297mm',
        margin: 'auto',
        backgroundColor: 'white',
        boxShadow: '0 0 20px rgba(0,0,0,0.1)',
        '@media print': {
          boxShadow: 'none',
          margin: 0,
          padding: '20mm',
        }
      }}
    >
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, pb: 2, borderBottom: '2px solid #1565C0' }}>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h4" sx={{ fontWeight: 700, color: 'primary.main', mb: 1 }}>
            {institutionInfo.name}
          </Typography>
          <Typography variant="body2" sx={{ mb: 0.5 }}>
            {institutionInfo.address}
          </Typography>
          <Typography variant="body2" sx={{ mb: 0.5 }}>
            Tel: {institutionInfo.phone} | Email: {institutionInfo.email}
          </Typography>
        </Box>
        <Box sx={{ textAlign: 'right' }}>
          <Typography variant="h5" sx={{ fontWeight: 600, color: 'primary.main' }}>
            ORDEN MÉDICA
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.7 }}>
            Conforme a NOM-004-SSA3-2012
          </Typography>
        </Box>
      </Box>

      {/* Document Information */}
      <Box sx={{ display: 'flex', gap: 4, mb: 3, flexWrap: 'wrap' }}>
        <Box sx={{ flex: 1, minWidth: '200px' }}>
          <Typography variant="body2">
            <strong>No. de Orden:</strong> {order.id}
          </Typography>
        </Box>
        <Box sx={{ flex: 1, minWidth: '200px', textAlign: 'right' }}>
          <Typography variant="body2">
            <strong>Fecha:</strong> {formatDateTime(order.order_date)}
          </Typography>
        </Box>
      </Box>

      {/* Patient Information */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: 'primary.main' }}>
          INFORMACIÓN DEL PACIENTE
        </Typography>
        <Table size="small">
          <TableBody>
            <TableRow>
              <TableCell sx={{ fontWeight: 600, width: '30%', border: 'none', pl: 0 }}>
                Nombre Completo:
              </TableCell>
              <TableCell sx={{ border: 'none' }}>
                {patient ? `${patient.first_name} ${patient.paternal_surname} ${patient.maternal_surname || ''}`.trim() : 'No especificado'}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell sx={{ fontWeight: 600, border: 'none', pl: 0 }}>
                Fecha de Nacimiento:
              </TableCell>
              <TableCell sx={{ border: 'none' }}>
                {patient?.birth_date ? formatDate(patient.birth_date) : 'No especificada'}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell sx={{ fontWeight: 600, border: 'none', pl: 0 }}>
                Género:
              </TableCell>
              <TableCell sx={{ border: 'none' }}>
                {patient?.gender || 'No especificado'}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell sx={{ fontWeight: 600, border: 'none', pl: 0 }}>
                Teléfono:
              </TableCell>
              <TableCell sx={{ border: 'none' }}>
                {patient?.primary_phone || 'No especificado'}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </Box>

      <Divider sx={{ my: 3 }} />

      {/* Medical Order Details */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: 'primary.main' }}>
          DETALLES DE LA ORDEN MÉDICA
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 4, mb: 2, flexWrap: 'wrap' }}>
          <Box sx={{ flex: 2, minWidth: '300px' }}>
            <Typography variant="body1" fontWeight="bold" gutterBottom>
              Estudio Solicitado:
            </Typography>
            <Typography variant="body1" sx={{ mb: 2 }}>
              {order.study_name}
            </Typography>
          </Box>
          <Box sx={{ flex: 1, minWidth: '200px' }}>
            <Typography variant="body1" fontWeight="bold" gutterBottom>
              Prioridad:
            </Typography>
            <Chip 
              label={getPriorityLabel(order.priority)}
              color={order.priority === 'urgente' ? 'error' : order.priority === 'preferente' ? 'warning' : 'default'}
              size="small"
            />
          </Box>
        </Box>

        {order.study_description && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="body1" fontWeight="bold" gutterBottom>
              Descripción del Estudio:
            </Typography>
            <Typography variant="body1">
              {order.study_description}
            </Typography>
          </Box>
        )}

        <Box sx={{ mb: 2 }}>
          <Typography variant="body1" fontWeight="bold" gutterBottom>
            Indicación Clínica:
          </Typography>
          <Typography variant="body1">
            {order.clinical_indication}
          </Typography>
        </Box>

        {order.relevant_clinical_data && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="body1" fontWeight="bold" gutterBottom>
              Datos Clínicos Relevantes:
            </Typography>
            <Typography variant="body1">
              {order.relevant_clinical_data}
            </Typography>
          </Box>
        )}

        {/* Diagnosis Information */}
        <Box sx={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {order.provisional_diagnosis && (
            <Box sx={{ flex: 2, minWidth: '300px' }}>
              <Typography variant="body1" fontWeight="bold" gutterBottom>
                Diagnóstico Provisional:
              </Typography>
              <Typography variant="body1">
                {order.provisional_diagnosis}
              </Typography>
            </Box>
          )}
          
          {order.diagnosis_cie10 && (
            <Box sx={{ flex: 1, minWidth: '200px' }}>
              <Typography variant="body1" fontWeight="bold" gutterBottom>
                Código CIE-10:
              </Typography>
              <Typography variant="body1" sx={{ fontFamily: 'monospace' }}>
                {order.diagnosis_cie10}
              </Typography>
            </Box>
          )}
        </Box>
      </Box>

      {/* Preparation Instructions */}
      {order.requires_preparation && order.preparation_instructions && (
        <>
          <Divider sx={{ my: 3 }} />
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: 'primary.main' }}>
              INSTRUCCIONES DE PREPARACIÓN
            </Typography>
            <Box sx={{ 
              p: 2, 
              backgroundColor: '#FFF8E1', 
              borderLeft: '4px solid #FF9800',
              borderRadius: '0 8px 8px 0'
            }}>
              <Typography variant="body1">
                {order.preparation_instructions}
              </Typography>
            </Box>
          </Box>
        </>
      )}

      {/* Special Instructions */}
      {order.special_instructions && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: 'primary.main' }}>
            INSTRUCCIONES ESPECIALES
          </Typography>
          <Typography variant="body1">
            {order.special_instructions}
          </Typography>
        </Box>
      )}

      <Divider sx={{ my: 4 }} />

      {/* Footer - Doctor Signature */}
      <Box sx={{ mt: 4 }}>
        <Box sx={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Box sx={{ flex: 1, minWidth: '250px' }}>
            <Box sx={{ textAlign: 'center', borderTop: '1px solid #000', pt: 1 }}>
              <Typography variant="body2" fontWeight="bold">
                {doctorInfo?.title || 'Dr.'} {order.ordering_doctor_name}
              </Typography>
              <Typography variant="caption">
                {doctorInfo?.specialty || 'Médico Especialista'}
              </Typography>
              <Typography variant="caption" display="block">
                Cédula: {doctorInfo?.professional_license || order.ordering_doctor_license}
              </Typography>
            </Box>
          </Box>
          <Box sx={{ flex: 1, minWidth: '250px' }}>
            <Box sx={{ textAlign: 'center', borderTop: '1px solid #000', pt: 1 }}>
              <Typography variant="body2" fontWeight="bold">
                FIRMA DIGITAL
              </Typography>
              <Typography variant="caption">
                Documento generado electrónicamente
              </Typography>
              <Typography variant="caption" display="block">
                {formatDateTime(order.order_date)}
              </Typography>
            </Box>
          </Box>
        </Box>
      </Box>

      {/* Footer Note */}
      <Box sx={{ mt: 4, pt: 2, borderTop: '1px solid #ddd' }}>
        <Typography variant="caption" sx={{ opacity: 0.7, textAlign: 'center', display: 'block' }}>
          Este documento ha sido generado electrónicamente conforme a la NOM-004-SSA3-2012.
          Para verificar su autenticidad, contacte a la institución emisora.
        </Typography>
      </Box>
    </Paper>
  );
};

export default MedicalOrderPrintFormat;