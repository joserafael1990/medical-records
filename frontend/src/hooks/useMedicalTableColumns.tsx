import React from 'react';
import { Chip, Avatar, Box, Typography } from '@mui/material';
import { Phone as PhoneIcon, Email as EmailIcon } from '@mui/icons-material';
import { TableColumn } from '../components/common/SmartTable';
import { Patient, Consultation } from '../types';
import { calculateAge, formatDate } from '../utils';
import { formatAppointmentTime, formatAppointmentTimeRange } from '../constants';

/**
 * Hook que proporciona configuraciones de columnas para tablas médicas
 */
export const useMedicalTableColumns = () => {
  
  // Columnas para tabla de pacientes
  const patientColumns: TableColumn<Patient>[] = [
    {
      key: 'full_name',
      label: 'Paciente',
      sortable: true,
      width: '25%',
      render: (value: Patient[keyof Patient], patient: Patient, index: number) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar sx={{ width: 40, height: 40, bgcolor: 'primary.main' }}>
            {(patient.name || patient.full_name || 'P')[0].toUpperCase()}
          </Avatar>
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {patient.name || patient.full_name || 'Paciente sin nombre'}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              ID: {patient.id}
            </Typography>
          </Box>
        </Box>
      )
    },
    {
      key: 'age',
      label: 'Edad',
      sortable: true,
      align: 'center',
      width: '10%',
      render: (value: Patient[keyof Patient], patient: Patient, index: number) => {
        const age = calculateAge(patient.birth_date);
        return (
          <Chip 
            label={`${age} años`} 
            size="small" 
            color={age < 18 ? 'secondary' : age > 65 ? 'warning' : 'default'}
            variant="outlined"
          />
        );
      }
    },
    {
      key: 'gender',
      label: 'Género',
      sortable: true,
      align: 'center',
      width: '12%',
      render: (value: Patient[keyof Patient], row: Patient, index: number) => (
        <Chip 
          label={String(value)} 
          size="small" 
          color={value === 'Masculino' ? 'info' : 'secondary'}
          variant="outlined"
        />
      )
    },
    {
      key: 'primary_phone',
      label: 'Contacto',
      sortable: false,
      width: '20%',
      render: (value: Patient[keyof Patient], patient: Patient, index: number) => (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          {patient.primary_phone && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <PhoneIcon fontSize="small" color="action" />
              <Typography variant="body2">{patient.primary_phone}</Typography>
            </Box>
          )}
          {patient.email && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <EmailIcon fontSize="small" color="action" />
              <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>
                {patient.email}
              </Typography>
            </Box>
          )}
        </Box>
      )
    },
    {
      key: 'total_visits',
      label: 'Consultas',
      sortable: true,
      align: 'center',
      width: '12%',
      render: (value: Patient[keyof Patient], row: Patient, index: number) => (
        <Chip 
          label={String(value || 0)} 
          size="small" 
          color={!value || value === 0 ? 'default' : (Number(value) as number) < 5 ? 'info' : 'success'}
          variant="outlined"
        />
      )
    },
    {
      key: 'is_active',
      label: 'Estado',
      sortable: true,
      align: 'center',
      width: '9%',
      render: (value: Patient[keyof Patient], row: Patient, index: number) => (
        <Chip 
          label={value ? 'Activo' : 'Inactivo'} 
          size="small" 
          color={value ? 'success' : 'default'}
          variant="filled"
        />
      )
    }
  ];

  // Columnas para tabla de consultas
  const consultationColumns: TableColumn<Consultation>[] = [
    {
      key: 'id',
      label: 'ID',
      sortable: true,
      width: '12%',
      render: (value: Consultation[keyof Consultation], row: Consultation, index: number) => (
        <Typography variant="body2" sx={{ fontWeight: 600, fontFamily: 'monospace' }}>
          {String(value)}
        </Typography>
      )
    },
    {
      key: 'patient_name',
      label: 'Paciente',
      sortable: true,
      width: '25%',
      render: (value: Consultation[keyof Consultation], consultation: Consultation, index: number) => (
        <Box>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {String(value || 'Paciente No Identificado')}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            ID: {consultation.patient_id}
          </Typography>
        </Box>
      )
    },
    {
      key: 'date',
      label: 'Fecha',
      sortable: true,
      width: '15%',
      render: (value: Consultation[keyof Consultation], row: Consultation, index: number) => {
        const date = new Date(String(value));
        const isToday = date.toDateString() === new Date().toDateString();
        const rawValue = String(value);

        // Create a temporary object with the consultation data for time formatting
        // Now consultations have end_time calculated (30 minutes duration by default)
        const consultationForTime = {
          date_time: rawValue,
          end_time: row.end_time || null // Use actual end_time if available
        };

        return (
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {formatDate(String(value))}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {formatAppointmentTimeRange(consultationForTime)}
            </Typography>
            {isToday && (
              <Chip label="Hoy" size="small" color="primary" variant="filled" sx={{ mt: 0.5 }} />
            )}
          </Box>
        );
      }
    },
    {
      key: 'chief_complaint',
      label: 'Motivo Consulta',
      sortable: false,
      width: '25%',
      render: (value: Consultation[keyof Consultation], row: Consultation, index: number) => (
        <Typography 
          variant="body2" 
          sx={{ 
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical'
          }}
        >
          {String(value || 'Sin especificar')}
        </Typography>
      )
    },
    {
      key: 'primary_diagnosis',
      label: 'Diagnóstico',
      sortable: false,
      width: '23%',
      render: (value: Consultation[keyof Consultation]) => value ? (
        <Chip 
          label={String(value)} 
          size="small" 
          color="info"
          variant="outlined"
          sx={{
            maxWidth: '100%',
            '& .MuiChip-label': {
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }
          }}
        />
      ) : (
        <Typography variant="body2" color="text.secondary">
          Pendiente
        </Typography>
      )
    }
  ];

  // Columnas simplificadas para vistas compactas
  const compactPatientColumns: TableColumn<Patient>[] = [
    {
      key: 'full_name',
      label: 'Paciente',
      sortable: true,
      render: (value: Patient[keyof Patient], patient: Patient, index: number) => (
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          {patient.name || patient.full_name || 'Paciente sin nombre'}
        </Typography>
      )
    },
    {
      key: 'age',
      label: 'Edad',
      sortable: true,
      align: 'center',
      render: (value: Patient[keyof Patient], patient: Patient, index: number) => {
        const age = calculateAge(patient.birth_date);
        return <Typography variant="body2">{age} años</Typography>;
      }
    },
    {
      key: 'primary_phone',
      label: 'Teléfono',
      sortable: false,
      render: (value: Patient[keyof Patient], row: Patient, index: number) => (
        <Typography variant="body2">{String(value || '-')}</Typography>
      )
    }
  ];

  const compactConsultationColumns: TableColumn<Consultation>[] = [
    {
      key: 'date',
      label: 'Fecha',
      sortable: true,
      render: (value: Consultation[keyof Consultation], row: Consultation, index: number) => {
        const date = new Date(String(value));
        return (
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {formatDate(String(value))}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {formatAppointmentTime(String(value))}
            </Typography>
          </Box>
        );
      }
    },
    {
      key: 'patient_name',
      label: 'Paciente',
      sortable: true,
      render: (value: Consultation[keyof Consultation], row: Consultation, index: number) => (
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          {String(value || 'Sin nombre')}
        </Typography>
      )
    },
    {
      key: 'chief_complaint',
      label: 'Motivo',
      sortable: false,
      render: (value: Consultation[keyof Consultation], row: Consultation, index: number) => (
        <Typography variant="body2" sx={{ 
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          maxWidth: 200
        }}>
          {String(value || 'Sin especificar')}
        </Typography>
      )
    }
  ];

  return {
    patientColumns,
    consultationColumns,
    compactPatientColumns,
    compactConsultationColumns
  };
};