import React, { memo } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  TextField,
  Table,
  TableContainer,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Avatar,
  Chip,
  IconButton,
  Fade
} from '@mui/material';
import {
  PersonAdd as PersonAddIcon,
  Search as SearchIcon,
  Add as AddIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  CalendarMonth as CalendarIcon,
  People as PeopleIcon
} from '@mui/icons-material';
import { Patient, Consultation } from '../../types';
import { calculateAge } from '../../utils';
import { ErrorRibbon } from '../common/ErrorRibbon';
import { useMemoizedSearch } from '../../hooks/useMemoizedSearch';
import { IntelligentSearch, useIntelligentSearch } from '../common/IntelligentSearch';
import { SmartLoadingState } from '../common/SmartLoadingState';

interface PatientsViewProps {
  patients: Patient[];
  consultations: Consultation[];
  patientSearchTerm: string;
  setPatientSearchTerm: (term: string) => void;
  successMessage: string;
  setSuccessMessage: (message: string) => void;
  handleNewPatient: () => void;
  handleEditPatient: (patient: Patient) => void;
}

const PatientsView: React.FC<PatientsViewProps> = ({
  patients,
  consultations,
  patientSearchTerm,
  setPatientSearchTerm,
  successMessage,
  setSuccessMessage,
  handleNewPatient,
  handleEditPatient
}) => {
  // Helper function to get the latest consultation reason for a patient
  const getLatestConsultationReason = (patientId: string): string => {
    if (!consultations || !Array.isArray(consultations)) return 'Sin consultas';
    
    const patientConsultations = consultations.filter(c => c.patient_id === patientId);
    if (patientConsultations.length === 0) return 'Sin consultas';
    
    // Sort by date (most recent first)
    const sortedConsultations = patientConsultations.sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    
    return sortedConsultations[0].chief_complaint || 'No especificado';
  };

  // Memoized search for better performance
  const filteredPatients = useMemoizedSearch(patients || [], patientSearchTerm || '', {
    searchFields: ['full_name', 'phone', 'email', 'curp'],
    caseSensitive: false
  });

  return (
    <Box sx={{ p: 3 }}>
      {/* Header - EXACTAMENTE como AgendaView.tsx */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography 
          variant="h4" 
          sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 1,
            fontSize: { xs: '1.5rem', sm: '2rem' }
          }}
        >
          <PeopleIcon sx={{ color: 'text.primary' }} />
          Gestión de Pacientes
        </Typography>
        <Button
          variant="contained"
          startIcon={<PersonAddIcon />}
          onClick={handleNewPatient}
          size="large"
        >
          Nuevo Paciente
        </Button>
      </Box>

      {/* Success Message Ribbon */}
      {successMessage && (
        <Paper 
          sx={{ 
            p: 2, 
            mb: 3, 
            backgroundColor: '#d4edda',
            borderColor: '#c3e6cb',
            color: '#155724',
            border: '1px solid #c3e6cb',
            borderRadius: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CheckIcon sx={{ color: '#155724' }} />
            <Typography variant="body1" sx={{ fontWeight: 500 }}>
              {successMessage}
            </Typography>
          </Box>
          <IconButton 
            size="small" 
            onClick={() => setSuccessMessage('')}
            sx={{ color: '#155724' }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </Paper>
      )}

      {/* Search and Filters */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <TextField
            placeholder="Buscar por nombre, teléfono, email, CURP..."
            value={patientSearchTerm}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPatientSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: <SearchIcon sx={{ color: 'text.secondary', mr: 1 }} />
            }}
            sx={{ flexGrow: 1 }}
          />
          <Button variant="outlined" startIcon={<AddIcon />}>
            Filtros
          </Button>
        </Box>
      </Paper>

      {/* Patients Table */}
      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>Paciente</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Contacto</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Última Visita</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Motivo de la consulta</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Estado</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredPatients && Array.isArray(filteredPatients) && filteredPatients.map((patient) => (
                <TableRow 
                  key={patient.id} 
                  hover
                  onClick={() => handleEditPatient(patient)}
                  sx={{ cursor: 'pointer' }}
                >
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Avatar sx={{ bgcolor: 'primary.main' }}>
                        {patient.first_name[0]}{patient.paternal_surname[0]}
                      </Avatar>
                      <Box>
                        <Typography variant="body1" sx={{ fontWeight: 500 }}>
                          {patient.full_name} ({calculateAge(patient.birth_date)})
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {patient.gender}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                        <PhoneIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                        <Typography variant="body2">{patient.primary_phone}</Typography>
                      </Box>
                      {patient.email && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <EmailIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                          <Typography variant="body2">{patient.email}</Typography>
                        </Box>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>
                    {patient.last_visit ? (
                      <Typography variant="body2">
                        {new Date(patient.last_visit).toLocaleDateString('es-MX')}
                      </Typography>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        Sin visitas
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        maxWidth: 200, 
                        overflow: 'hidden', 
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}
                      title={getLatestConsultationReason(patient.id)}
                    >
                      {getLatestConsultationReason(patient.id)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={patient.is_active ? 'Activo' : 'Inactivo'}
                      size="small"
                      color={patient.is_active ? 'success' : 'default'}
                    />
                  </TableCell>
                </TableRow>
              ))}
              {(!filteredPatients || !Array.isArray(filteredPatients) || filteredPatients.length === 0) && (
                <TableRow>
                  <TableCell colSpan={4} align="center" sx={{ py: 4 }}>
                    <Typography variant="body1" color="text.secondary">
                      No hay pacientes registrados
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
};

export default memo(PatientsView);