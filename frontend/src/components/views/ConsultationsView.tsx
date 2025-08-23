import React, { memo, useState } from 'react';
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
  IconButton,
  Chip,
  Avatar,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Tooltip,
  Card,
  CardContent,
  Grid,
  Divider
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  Edit as EditIcon,
  Visibility as ViewIcon,
  Print as PrintIcon,
  FilterList as FilterIcon,
  CalendarToday as CalendarIcon,
  Person as PersonIcon,
  LocalHospital as HospitalIcon,
  Assignment as AssignmentIcon,
  MoreVert as MoreVertIcon
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
  handleViewConsultation?: (consultation: ConsultationResponse) => void;
  handlePrintConsultation?: (consultation: ConsultationResponse) => void;
  handleDeleteConsultation?: (consultation: ConsultationResponse) => void;
}

const ConsultationsView: React.FC<ConsultationsViewProps> = ({
  consultations,
  consultationSearchTerm,
  setConsultationSearchTerm,
  handleNewConsultation,
  handleEditConsultation,
  handleViewConsultation,
  handlePrintConsultation,
  handleDeleteConsultation
}) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedConsultation, setSelectedConsultation] = useState<ConsultationResponse | null>(null);
  const [filterBy, setFilterBy] = useState<'all' | 'today' | 'week' | 'month'>('all');

  // Memoized search for better performance
  const filteredConsultations = useMemoizedSearch(consultations, consultationSearchTerm, {
    searchFields: ['patient_name', 'chief_complaint', 'primary_diagnosis', 'doctor_name'],
    caseSensitive: false
  });

  // Filter by date range
  const dateFilteredConsultations = filteredConsultations.filter(consultation => {
    if (filterBy === 'all') return true;
    
    const consultationDate = new Date(consultation.date);
    const today = new Date();
    
    switch (filterBy) {
      case 'today':
        return consultationDate.toDateString() === today.toDateString();
      case 'week':
        const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        return consultationDate >= weekAgo;
      case 'month':
        const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
        return consultationDate >= monthAgo;
      default:
        return true;
    }
  });

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>, consultation: ConsultationResponse) => {
    setAnchorEl(event.currentTarget);
    setSelectedConsultation(consultation);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedConsultation(null);
  };

  const handleMenuAction = (action: string) => {
    if (!selectedConsultation) return;
    
    switch (action) {
      case 'view':
        handleViewConsultation?.(selectedConsultation);
        break;
      case 'edit':
        handleEditConsultation(selectedConsultation);
        break;
      case 'print':
        handlePrintConsultation?.(selectedConsultation);
        break;
      case 'delete':
        handleDeleteConsultation?.(selectedConsultation);
        break;
    }
    handleMenuClose();
  };

  // Statistics
  const todayConsultations = consultations.filter(c => 
    new Date(c.date).toDateString() === new Date().toDateString()
  ).length;
  
  const weekConsultations = consultations.filter(c => {
    const consultationDate = new Date(c.date);
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    return consultationDate >= weekAgo;
  }).length;

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 600, mb: 1 }}>
            Gestión de Consultas
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Administra y revisa todas las consultas médicas
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleNewConsultation}
          size="large"
          sx={{ 
            borderRadius: '12px',
            px: 3,
            py: 1.5,
            boxShadow: '0 4px 12px rgba(25, 118, 210, 0.3)'
          }}
        >
          Nueva Consulta
        </Button>
      </Box>

      {/* Statistics Cards */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(4, 1fr)' }, gap: 3, mb: 3 }}>
        <Box>
          <Card sx={{ borderRadius: '16px', border: '1px solid', borderColor: 'divider' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: 'primary.main', width: 48, height: 48 }}>
                  <AssignmentIcon />
                </Avatar>
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 600, color: 'primary.main' }}>
                    {consultations.length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Consultas
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Box>
        
        <Box>
          <Card sx={{ borderRadius: '16px', border: '1px solid', borderColor: 'divider' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: 'success.main', width: 48, height: 48 }}>
                  <CalendarIcon />
                </Avatar>
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 600, color: 'success.main' }}>
                    {todayConsultations}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Hoy
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Box>
        
        <Box>
          <Card sx={{ borderRadius: '16px', border: '1px solid', borderColor: 'divider' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: 'warning.main', width: 48, height: 48 }}>
                  <HospitalIcon />
                </Avatar>
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 600, color: 'warning.main' }}>
                    {weekConsultations}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Esta Semana
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Box>
        
        <Box>
          <Card sx={{ borderRadius: '16px', border: '1px solid', borderColor: 'divider' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: 'info.main', width: 48, height: 48 }}>
                  <PersonIcon />
                </Avatar>
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 600, color: 'info.main' }}>
                    {new Set(consultations.map(c => c.patient_id)).size}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Pacientes Únicos
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Box>
      </Box>

      {/* Search and Filters */}
      <Paper sx={{ p: 3, mb: 3, borderRadius: '16px' }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          <TextField
            placeholder="Buscar por paciente, diagnóstico, doctor..."
            value={consultationSearchTerm}
            onChange={(e) => setConsultationSearchTerm(e.target.value)}
            sx={{ flexGrow: 1, minWidth: 300 }}
            InputProps={{
              startAdornment: <SearchIcon sx={{ color: 'text.secondary', mr: 1 }} />
            }}
          />
          
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Chip
              label="Todas"
              onClick={() => setFilterBy('all')}
              color={filterBy === 'all' ? 'primary' : 'default'}
              variant={filterBy === 'all' ? 'filled' : 'outlined'}
            />
            <Chip
              label="Hoy"
              onClick={() => setFilterBy('today')}
              color={filterBy === 'today' ? 'primary' : 'default'}
              variant={filterBy === 'today' ? 'filled' : 'outlined'}
            />
            <Chip
              label="Esta Semana"
              onClick={() => setFilterBy('week')}
              color={filterBy === 'week' ? 'primary' : 'default'}
              variant={filterBy === 'week' ? 'filled' : 'outlined'}
            />
            <Chip
              label="Este Mes"
              onClick={() => setFilterBy('month')}
              color={filterBy === 'month' ? 'primary' : 'default'}
              variant={filterBy === 'month' ? 'filled' : 'outlined'}
            />
          </Box>
        </Box>
      </Paper>

      {/* Consultations Table */}
      <TableContainer component={Paper} sx={{ borderRadius: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
        <Table>
          <TableHead sx={{ bgcolor: 'grey.50' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem' }}>Fecha y Hora</TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem' }}>Paciente</TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem' }}>Motivo de Consulta</TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem' }}>Diagnóstico Principal</TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem' }}>Doctor</TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem' }}>Estado</TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem', textAlign: 'center' }}>Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {dateFilteredConsultations.length > 0 ? (
              dateFilteredConsultations.map((consultation) => (
                <TableRow key={consultation.id} hover sx={{ '&:hover': { bgcolor: 'action.hover' } }}>
                  <TableCell>
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {new Date(consultation.date).toLocaleDateString('es-MX', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {new Date(consultation.date).toLocaleTimeString('es-MX', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main', fontSize: '0.875rem' }}>
                        {consultation.patient_name?.charAt(0) || 'P'}
                      </Avatar>
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {consultation.patient_name || 'Paciente'}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Tooltip title={consultation.chief_complaint} arrow>
                      <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                        {consultation.chief_complaint}
                      </Typography>
                    </Tooltip>
                  </TableCell>
                  <TableCell>
                    <Tooltip title={consultation.primary_diagnosis} arrow>
                      <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                        {consultation.primary_diagnosis}
                      </Typography>
                    </Tooltip>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {consultation.doctor_name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Lic. {consultation.doctor_professional_license}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label="Completada"
                      size="small"
                      color="success"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                      <Tooltip title="Ver detalles">
                        <IconButton
                          size="small"
                          onClick={() => handleViewConsultation?.(consultation)}
                          sx={{ color: 'info.main' }}
                        >
                          <ViewIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Editar">
                        <IconButton
                          size="small"
                          onClick={() => handleEditConsultation(consultation)}
                          sx={{ color: 'primary.main' }}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Más opciones">
                        <IconButton
                          size="small"
                          onClick={(e) => handleMenuClick(e, consultation)}
                          sx={{ color: 'text.secondary' }}
                        >
                          <MoreVertIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 8 }}>
                  <Box sx={{ textAlign: 'center' }}>
                    <AssignmentIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
                    <Typography variant="h6" color="text.secondary" gutterBottom>
                      No hay consultas registradas
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                      {consultationSearchTerm ? 
                        'No se encontraron consultas que coincidan con tu búsqueda' :
                        'Comienza registrando tu primera consulta médica'
                      }
                    </Typography>
                    <Button
                      variant="contained"
                      startIcon={<AddIcon />}
                      onClick={handleNewConsultation}
                      sx={{ borderRadius: '8px' }}
                    >
                      Nueva Consulta
                    </Button>
                  </Box>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Context Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        PaperProps={{
          sx: { borderRadius: '12px', minWidth: 180 }
        }}
      >
        <MenuItem onClick={() => handleMenuAction('view')}>
          <ListItemIcon>
            <ViewIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Ver Detalles</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleMenuAction('edit')}>
          <ListItemIcon>
            <EditIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Editar</ListItemText>
        </MenuItem>
        <Divider />
        <MenuItem onClick={() => handleMenuAction('print')}>
          <ListItemIcon>
            <PrintIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Imprimir</ListItemText>
        </MenuItem>
        {handleDeleteConsultation && (
          <>
            <Divider />
            <MenuItem onClick={() => handleMenuAction('delete')} sx={{ color: 'error.main' }}>
              <ListItemIcon>
                <AssignmentIcon fontSize="small" sx={{ color: 'error.main' }} />
              </ListItemIcon>
              <ListItemText>Eliminar</ListItemText>
            </MenuItem>
          </>
        )}
      </Menu>
    </Box>
  );
};

export default memo(ConsultationsView);
