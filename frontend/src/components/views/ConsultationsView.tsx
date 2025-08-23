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
  IconButton
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  Edit as EditIcon
} from '@mui/icons-material';
import { ConsultationResponse } from '../../types';
import { formatDateTime } from '../../utils';
import { useMemoizedSearch } from '../../hooks/useMemoizedSearch';

interface ConsultationsViewProps {
  consultations: ConsultationResponse[];
  consultationSearchTerm: string;
  setConsultationSearchTerm: (term: string) => void;
  handleNewConsultation: () => void;
  handleEditConsultation: (consultation: ConsultationResponse) => void;
}

const ConsultationsView: React.FC<ConsultationsViewProps> = ({
  consultations,
  consultationSearchTerm,
  setConsultationSearchTerm,
  handleNewConsultation,
  handleEditConsultation
}) => {
  // Memoized search for better performance
  const filteredConsultations = useMemoizedSearch(consultations, consultationSearchTerm, {
    searchFields: ['patient_name', 'chief_complaint', 'primary_diagnosis', 'doctor_name'],
    caseSensitive: false
  });
  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 600 }}>
          Gestión de Consultas
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleNewConsultation}
          sx={{ borderRadius: '12px' }}
        >
          Nueva Consulta
        </Button>
      </Box>

      {/* Search and Filters */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <TextField
            placeholder="Buscar por paciente..."
            value={consultationSearchTerm}
            onChange={(e) => setConsultationSearchTerm(e.target.value)}
            sx={{ flexGrow: 1 }}
            InputProps={{
              startAdornment: <SearchIcon sx={{ color: 'text.secondary', mr: 1 }} />
            }}
          />
        </Box>
      </Paper>

      {/* Consultations Table */}
      <TableContainer component={Paper} sx={{ borderRadius: '16px' }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 600 }}>Fecha</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Paciente</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Motivo de Consulta</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Diagnóstico</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Doctor</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredConsultations.length > 0 ? (
              filteredConsultations.map((consultation) => (
                <TableRow key={consultation.id} hover>
                  <TableCell>
                    {formatDateTime(consultation.date)}
                  </TableCell>
                  <TableCell>
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                      {consultation.patient_name || 'Paciente'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                      {consultation.chief_complaint}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                      {consultation.primary_diagnosis}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {consultation.doctor_name}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <IconButton
                      onClick={() => handleEditConsultation(consultation)}
                      size="small"
                      sx={{ color: 'primary.main' }}
                    >
                      <EditIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                  <Typography variant="body1" color="text.secondary">
                    No hay consultas registradas
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default memo(ConsultationsView);
