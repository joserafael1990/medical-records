import React from 'react';
import { Chip, Avatar, Box, Typography } from '@mui/material';
import { Phone as PhoneIcon, Email as EmailIcon } from '@mui/icons-material';
import { TableColumn } from '../components/common/SmartTable';
import { Patient, Consultation } from '../types';
import { calculateAge, formatDate } from '../utils';

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
      render: (value, patient) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar sx={{ width: 40, height: 40, bgcolor: 'primary.main' }}>
            {patient.first_name?.charAt(0)?.toUpperCase()}
          </Avatar>
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {patient.full_name || `${patient.first_name} ${patient.paternal_surname}`}
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
      render: (value, patient) => {
        const age = patient.age || calculateAge(patient.birth_date);
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
      render: (value) => (
        <Chip 
          label={value} 
          size="small" 
          color={value === 'Masculino' ? 'info' : 'secondary'}
          variant="outlined"
        />
      )
    },
    {
      key: 'phone',
      label: 'Contacto',
      sortable: false,
      width: '20%',
      render: (value, patient) => (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          {patient.phone && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <PhoneIcon fontSize="small" color="action" />
              <Typography variant="body2">{patient.phone}</Typography>
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
      key: 'blood_type',
      label: 'Tipo Sangre',
      sortable: true,
      align: 'center',
      width: '12%',
      render: (value) => value ? (
        <Chip 
          label={value} 
          size="small" 
          color="error"
          variant="filled"
          sx={{ fontWeight: 600 }}
        />
      ) : '-'
    },
    {
      key: 'total_visits',
      label: 'Consultas',
      sortable: true,
      align: 'center',
      width: '12%',
      render: (value) => (
        <Chip 
          label={value || 0} 
          size="small" 
          color={!value || value === 0 ? 'default' : value < 5 ? 'info' : 'success'}
          variant="outlined"
        />
      )
    },
    {
      key: 'status',
      label: 'Estado',
      sortable: true,
      align: 'center',
      width: '9%',
      render: (value) => (
        <Chip 
          label={value || 'Activo'} 
          size="small" 
          color={value === 'Activo' ? 'success' : value === 'Inactivo' ? 'default' : 'warning'}
          variant="filled"
        />
      )
    }
  ];

  // Columnas para tabla de consultas
  const consultationColumns: TableColumn<Consultation>[] = [
    {
      key: 'id',
      label: 'ID Consulta',
      sortable: true,
      width: '12%',
      render: (value) => (
        <Typography variant="body2" sx={{ fontWeight: 600, fontFamily: 'monospace' }}>
          {value}
        </Typography>
      )
    },
    {
      key: 'patient_name',
      label: 'Paciente',
      sortable: true,
      width: '25%',
      render: (value, consultation) => (
        <Box>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {value || 'Paciente No Identificado'}
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
      render: (value) => {
        const date = new Date(value);
        const isToday = date.toDateString() === new Date().toDateString();
        return (
          <Box>
            <Typography variant="body2">
              {formatDate(value)}
            </Typography>
            {isToday && (
              <Chip label="Hoy" size="small" color="primary" variant="filled" />
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
      render: (value) => (
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
          {value || 'Sin especificar'}
        </Typography>
      )
    },
    {
      key: 'primary_diagnosis',
      label: 'Diagnóstico',
      sortable: false,
      width: '23%',
      render: (value) => value ? (
        <Chip 
          label={value} 
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
      label: 'Nombre',
      sortable: true,
      render: (value, patient) => (
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          {patient.full_name || `${patient.first_name} ${patient.paternal_surname}`}
        </Typography>
      )
    },
    {
      key: 'age',
      label: 'Edad',
      sortable: true,
      align: 'center',
      render: (value, patient) => {
        const age = patient.age || calculateAge(patient.birth_date);
        return <Typography variant="body2">{age} años</Typography>;
      }
    },
    {
      key: 'phone',
      label: 'Teléfono',
      sortable: false,
      render: (value) => (
        <Typography variant="body2">{value || '-'}</Typography>
      )
    }
  ];

  const compactConsultationColumns: TableColumn<Consultation>[] = [
    {
      key: 'date',
      label: 'Fecha',
      sortable: true,
      render: (value) => (
        <Typography variant="body2">
          {formatDate(value)}
        </Typography>
      )
    },
    {
      key: 'patient_name',
      label: 'Paciente',
      sortable: true,
      render: (value) => (
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          {value || 'Sin nombre'}
        </Typography>
      )
    },
    {
      key: 'chief_complaint',
      label: 'Motivo',
      sortable: false,
      render: (value) => (
        <Typography variant="body2" sx={{ 
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          maxWidth: 200
        }}>
          {value || 'Sin especificar'}
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
