import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Card,
  CardContent,
  CardActions,
} from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { es } from 'date-fns/locale';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Refresh as RefreshIcon,
  Person as PersonIcon,
  CalendarToday as CalendarIcon,
  MedicalServices as MedicalIcon,
  Search as SearchIcon,
  Clear as ClearIcon,
  FilterList as FilterIcon,
  DateRange as DateRangeIcon,
  Print as PrintIcon,
} from '@mui/icons-material';
import { Patient, MedicalRecord, MedicalRecordFormData } from '../../types';
import { apiService } from '../../services/api';
import { formatDate } from '../../utils/dateHelpers';

interface MedicalRecordsViewProps {
  patients: Patient[];
  onCreateRecord: (data: MedicalRecordFormData) => Promise<void>;
  onUpdateRecord: (id: number, data: MedicalRecordFormData) => Promise<void>;
  isLoading: boolean;
  onRefresh: () => void;
}

const MedicalRecordsView: React.FC<MedicalRecordsViewProps> = ({ 
  patients, 
  onCreateRecord, 
  onUpdateRecord, 
  isLoading, 
  onRefresh 
}) => {
  const [medicalRecords, setMedicalRecords] = useState<MedicalRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [selectedPatient, setSelectedPatient] = useState<number | ''>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [filteredRecords, setFilteredRecords] = useState<MedicalRecord[]>([]);
  const [formErrors, setFormErrors] = useState<{[key: string]: string}>({});
  
  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<MedicalRecord | null>(null);
  
  // Form data
  const [formData, setFormData] = useState<MedicalRecordFormData>({
    patient_id: 0,
    consultation_date: new Date().toISOString().split('T')[0],
    chief_complaint: '',
    history_present_illness: '',
    family_history: '',
    personal_pathological_history: '',
    personal_non_pathological_history: '',
    physical_examination: '',
    primary_diagnosis: '',
    treatment_plan: '',
    follow_up_instructions: '',
    prognosis: '',
    secondary_diagnoses: '',
    differential_diagnosis: '',
    prescribed_medications: '',
    laboratory_results: '',
    imaging_results: '',
    notes: '',
  });

  // Load medical records
  const loadMedicalRecords = async (patientId?: number) => {
    setLoading(true);
    setError(null);
    try {
      const params = patientId ? `?patient_id=${patientId}` : '';
      const response = await apiService.get(`/api/medical-records${params}`);
      
      // Ensure we always have an array
      let records = [];
      if (response.data) {
        if (Array.isArray(response.data)) {
          records = response.data;
        } else if (response.data.data && Array.isArray(response.data.data)) {
          records = response.data.data;
        }
      }
      
      setMedicalRecords(records);
    } catch (err: any) {
      console.error('Error loading medical records:', err);
      setError(err.message || 'Error loading medical records');
      setMedicalRecords([]); // Ensure we always have an array
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMedicalRecords();
  }, []);

  // Filter records based on search criteria
  useEffect(() => {
    // Ensure we always work with an array
    let filtered = Array.isArray(medicalRecords) ? medicalRecords : [];

    // Filter by search term
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(record => 
        record.chief_complaint?.toLowerCase().includes(searchLower) ||
        record.primary_diagnosis?.toLowerCase().includes(searchLower) ||
        record.secondary_diagnoses?.toLowerCase().includes(searchLower) ||
        record.notes?.toLowerCase().includes(searchLower) ||
        getPatientName(record).toLowerCase().includes(searchLower)
      );
    }

    // Filter by date range
    if (dateFrom) {
      filtered = filtered.filter(record => 
        new Date(record.consultation_date) >= new Date(dateFrom)
      );
    }
    if (dateTo) {
      filtered = filtered.filter(record => 
        new Date(record.consultation_date) <= new Date(dateTo)
      );
    }

    setFilteredRecords(filtered);
  }, [medicalRecords, searchTerm, dateFrom, dateTo]);

  // Clear search filters
  const clearFilters = () => {
    setSearchTerm('');
    setDateFrom('');
    setDateTo('');
    setSelectedPatient('');
    loadMedicalRecords();
  };

  // Form validation
  const validateForm = (data: MedicalRecordFormData): boolean => {
    const errors: {[key: string]: string} = {};

    if (!data.patient_id) {
      errors.patient_id = 'Debe seleccionar un paciente';
    }
    if (!data.consultation_date) {
      errors.consultation_date = 'La fecha de consulta es obligatoria';
    }
    if (!data.chief_complaint.trim()) {
      errors.chief_complaint = 'El motivo de consulta es obligatorio';
    }
    if (!data.history_present_illness.trim()) {
      errors.history_present_illness = 'La historia de la enfermedad actual es obligatoria';
    }
    if (!data.family_history.trim()) {
      errors.family_history = 'Los antecedentes heredofamiliares son obligatorios';
    }
    if (!data.personal_pathological_history.trim()) {
      errors.personal_pathological_history = 'Los antecedentes patológicos personales son obligatorios';
    }
    if (!data.personal_non_pathological_history.trim()) {
      errors.personal_non_pathological_history = 'Los antecedentes no patológicos personales son obligatorios';
    }
    if (!data.physical_examination.trim()) {
      errors.physical_examination = 'El examen físico es obligatorio';
    }
    if (!data.primary_diagnosis.trim()) {
      errors.primary_diagnosis = 'El diagnóstico principal es obligatorio';
    }
    if (!data.treatment_plan.trim()) {
      errors.treatment_plan = 'El plan de tratamiento es obligatorio';
    }
    if (!data.follow_up_instructions.trim()) {
      errors.follow_up_instructions = 'Las instrucciones de seguimiento son obligatorias';
    }
    if (!data.prognosis.trim()) {
      errors.prognosis = 'El pronóstico es obligatorio';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle patient filter change
  const handlePatientFilterChange = (patientId: number | '') => {
    setSelectedPatient(patientId);
    if (patientId === '') {
      loadMedicalRecords();
    } else {
      loadMedicalRecords(patientId);
    }
  };

  // Handle create record
  const handleCreateRecord = async () => {
    setFormErrors({});
    
    if (!validateForm(formData)) {
      setError('Por favor complete todos los campos obligatorios');
      return;
    }
    
    try {
      setLoading(true);
      await onCreateRecord(formData);
      setSuccessMessage('Expediente médico creado exitosamente');
      setCreateDialogOpen(false);
      resetForm();
      setFormErrors({});
      loadMedicalRecords();
    } catch (err: any) {
      setError(err.message || 'Error creating medical record');
    } finally {
      setLoading(false);
    }
  };

  // Handle edit record
  const handleEditRecord = async () => {
    if (!selectedRecord) return;
    
    setFormErrors({});
    
    if (!validateForm(formData)) {
      setError('Por favor complete todos los campos obligatorios');
      return;
    }
    
    try {
      setLoading(true);
      await onUpdateRecord(selectedRecord.id, formData);
      setSuccessMessage('Expediente médico actualizado exitosamente');
      setEditDialogOpen(false);
      setSelectedRecord(null);
      resetForm();
      setFormErrors({});
      loadMedicalRecords();
    } catch (err: any) {
      setError(err.message || 'Error updating medical record');
    } finally {
      setLoading(false);
    }
  };

  // Handle delete record
  const handleDeleteRecord = async (id: number) => {
    if (!window.confirm('¿Está seguro que desea eliminar este expediente médico?')) {
      return;
    }
    
    try {
      setLoading(true);
      await apiService.delete(`/api/medical-records/${id}`);
      setSuccessMessage('Expediente médico eliminado exitosamente');
      loadMedicalRecords();
    } catch (err: any) {
      setError(err.message || 'Error deleting medical record');
    } finally {
      setLoading(false);
    }
  };

  // Handle view record
  const handleViewRecord = (record: MedicalRecord) => {
    setSelectedRecord(record);
    setViewDialogOpen(true);
  };

  // Handle edit dialog open
  const handleEditDialogOpen = (record: MedicalRecord) => {
    setSelectedRecord(record);
    setFormData({
      patient_id: record.patient_id,
      consultation_date: record.consultation_date.split('T')[0],
      chief_complaint: record.chief_complaint,
      history_present_illness: record.history_present_illness,
      family_history: record.family_history,
      personal_pathological_history: record.personal_pathological_history,
      personal_non_pathological_history: record.personal_non_pathological_history,
      physical_examination: record.physical_examination,
      primary_diagnosis: record.primary_diagnosis,
      treatment_plan: record.treatment_plan,
      follow_up_instructions: record.follow_up_instructions,
      prognosis: record.prognosis,
      secondary_diagnoses: record.secondary_diagnoses || '',
      differential_diagnosis: record.differential_diagnosis || '',
      prescribed_medications: record.prescribed_medications || '',
      laboratory_results: record.laboratory_results || '',
      imaging_results: record.imaging_results || '',
      notes: record.notes || '',
    });
    setEditDialogOpen(true);
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      patient_id: 0,
      consultation_date: new Date().toISOString().split('T')[0],
      chief_complaint: '',
      history_present_illness: '',
      family_history: '',
      personal_pathological_history: '',
      personal_non_pathological_history: '',
      physical_examination: '',
      primary_diagnosis: '',
      treatment_plan: '',
      follow_up_instructions: '',
      prognosis: '',
      secondary_diagnoses: '',
      differential_diagnosis: '',
      prescribed_medications: '',
      laboratory_results: '',
      imaging_results: '',
      notes: '',
    });
    setFormErrors({});
  };

  // Print medical record
  const handlePrintRecord = (record: MedicalRecord) => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      const patientName = getPatientName(record);
      const doctorName = getDoctorName(record);
      
      printWindow.document.write(`
        <html>
          <head>
            <title>Expediente Médico - ${record.record_code || `#${record.id}`}</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; }
              .header { text-align: center; border-bottom: 2px solid #0B5394; padding-bottom: 10px; margin-bottom: 20px; }
              .section { margin-bottom: 20px; }
              .label { font-weight: bold; color: #0B5394; }
              .value { margin-left: 10px; }
              .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>AVANT - Sistema de Historias Clínicas</h1>
              <h2>Expediente Médico</h2>
              <p>Código: ${record.record_code || `#${record.id}`}</p>
            </div>
            
            <div class="grid">
              <div>
                <div class="section">
                  <span class="label">Paciente:</span>
                  <span class="value">${patientName}</span>
                </div>
                <div class="section">
                  <span class="label">Fecha de Consulta:</span>
                  <span class="value">${formatDate(record.consultation_date)}</span>
                </div>
              </div>
              <div>
                <div class="section">
                  <span class="label">Doctor:</span>
                  <span class="value">${doctorName}</span>
                </div>
              </div>
            </div>
            
            <div class="section">
              <div class="label">Motivo de Consulta:</div>
              <div class="value">${record.chief_complaint}</div>
            </div>
            
            <div class="section">
              <div class="label">Historia de la Enfermedad Actual:</div>
              <div class="value">${record.history_present_illness}</div>
            </div>
            
            <div class="grid">
              <div class="section">
                <div class="label">Antecedentes Heredofamiliares:</div>
                <div class="value">${record.family_history}</div>
              </div>
              <div class="section">
                <div class="label">Antecedentes Patológicos Personales:</div>
                <div class="value">${record.personal_pathological_history}</div>
              </div>
            </div>
            
            <div class="section">
              <div class="label">Examen Físico:</div>
              <div class="value">${record.physical_examination}</div>
            </div>
            
            <div class="grid">
              <div class="section">
                <div class="label">Diagnóstico Principal:</div>
                <div class="value">${record.primary_diagnosis}</div>
              </div>
              ${record.secondary_diagnoses ? `
              <div class="section">
                <div class="label">Diagnósticos Secundarios:</div>
                <div class="value">${record.secondary_diagnoses}</div>
              </div>
              ` : ''}
            </div>
            
            <div class="section">
              <div class="label">Plan de Tratamiento:</div>
              <div class="value">${record.treatment_plan}</div>
            </div>
            
            <div class="grid">
              <div class="section">
                <div class="label">Instrucciones de Seguimiento:</div>
                <div class="value">${record.follow_up_instructions}</div>
              </div>
              <div class="section">
                <div class="label">Pronóstico:</div>
                <div class="value">${record.prognosis}</div>
              </div>
            </div>
            
            ${record.prescribed_medications ? `
            <div class="section">
              <div class="label">Medicamentos Prescritos:</div>
              <div class="value">${record.prescribed_medications}</div>
            </div>
            ` : ''}
            
            ${record.notes ? `
            <div class="section">
              <div class="label">Notas Adicionales:</div>
              <div class="value">${record.notes}</div>
            </div>
            ` : ''}
            
            <div style="margin-top: 40px; text-align: center; font-size: 12px; color: #666;">
              <p>Documento generado el ${new Date().toLocaleString()}</p>
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const getDoctorName = (record: MedicalRecord) => {
    if (record.doctor) {
      return `${record.doctor.first_name} ${record.doctor.paternal_surname} ${record.doctor.maternal_surname || ''}`.trim();
    }
    return 'Doctor no encontrado';
  };

  // Get patient name
  const getPatientName = (record: MedicalRecord) => {
    if (record.patient) {
      return `${record.patient.first_name} ${record.patient.paternal_surname} ${record.patient.maternal_surname || ''}`.trim();
    }
    return 'Paciente no encontrado';
  };

  // Clear messages after 5 seconds
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">
          Expedientes Médicos
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={() => loadMedicalRecords()}
            disabled={loading}
          >
            Actualizar
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateDialogOpen(true)}
          >
            Nuevo Expediente
          </Button>
        </Box>
      </Box>

      {/* Messages */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      {successMessage && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccessMessage(null)}>
          {successMessage}
        </Alert>
      )}

      {/* Filters */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={3} alignItems="center">
          <Grid size={{ xs: 12 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <FilterIcon color="primary" />
              <Typography variant="h6" color="primary">
                Filtros de Búsqueda
              </Typography>
            </Box>
          </Grid>
          
          <Grid size={{ xs: 12, md: 4 }}>
            <TextField
              fullWidth
              label="Buscar en expedientes"
              placeholder="Paciente, diagnóstico, síntomas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: <SearchIcon sx={{ color: 'action.active', mr: 1 }} />,
              }}
            />
          </Grid>
          
          <Grid size={{ xs: 12, md: 3 }}>
            <FormControl fullWidth>
              <InputLabel>Filtrar por paciente</InputLabel>
              <Select
                value={selectedPatient}
                onChange={(e) => handlePatientFilterChange(e.target.value as number | '')}
                label="Filtrar por paciente"
                startAdornment={<PersonIcon sx={{ color: 'action.active', mr: 1 }} />}
              >
                <MenuItem value="">Todos los pacientes</MenuItem>
                {patients.map((patient) => (
                  <MenuItem key={patient.id} value={Number(patient.id)}>
                    {patient.full_name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          <Grid size={{ xs: 12, md: 2 }}>
            <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={es}>
              <DatePicker
                label="Fecha desde"
                value={dateFrom ? new Date(dateFrom) : null}
                onChange={(newValue) => {
                  if (newValue) {
                    setDateFrom(newValue.toISOString().split('T')[0]);
                  } else {
                    setDateFrom('');
                  }
                }}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    InputProps: {
                      startAdornment: <DateRangeIcon sx={{ color: 'action.active', mr: 1 }} />,
                    }
                  }
                }}
              />
            </LocalizationProvider>
          </Grid>
          
          <Grid size={{ xs: 12, md: 2 }}>
            <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={es}>
              <DatePicker
                label="Fecha hasta"
                value={dateTo ? new Date(dateTo) : null}
                onChange={(newValue) => {
                  if (newValue) {
                    setDateTo(newValue.toISOString().split('T')[0]);
                  } else {
                    setDateTo('');
                  }
                }}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    InputProps: {
                      startAdornment: <DateRangeIcon sx={{ color: 'action.active', mr: 1 }} />,
                    }
                  }
                }}
              />
            </LocalizationProvider>
          </Grid>
          
          <Grid size={{ xs: 12, md: 1 }}>
            <Button
              variant="outlined"
              onClick={clearFilters}
              startIcon={<ClearIcon />}
              fullWidth
              sx={{ minHeight: 56 }}
            >
              Limpiar
            </Button>
          </Grid>
          
          <Grid size={{ xs: 12 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                Mostrando {filteredRecords.length} de {medicalRecords.length} expedientes
              </Typography>
              {(searchTerm || dateFrom || dateTo || selectedPatient) && (
                <Typography variant="body2" color="primary">
                  Filtros activos
                </Typography>
              )}
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* Loading */}
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
          <CircularProgress />
        </Box>
      )}

      {/* Medical Records Table */}
      {!loading && (
        <Paper>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Código</TableCell>
                  <TableCell>Paciente</TableCell>
                  <TableCell>Fecha de Consulta</TableCell>
                  <TableCell>Motivo de Consulta</TableCell>
                  <TableCell>Diagnóstico Principal</TableCell>
                  <TableCell>Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {!Array.isArray(filteredRecords) || filteredRecords.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      <Typography variant="body2" color="text.secondary">
                        {!Array.isArray(medicalRecords) || medicalRecords.length === 0 ? 'No hay expedientes médicos disponibles' : 'No se encontraron expedientes que coincidan con los filtros'}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRecords.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell>
                        <Chip
                          label={record.record_code || `#${record.id}`}
                          size="small"
                          color="primary"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <PersonIcon fontSize="small" color="action" />
                          {getPatientName(record)}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <CalendarIcon fontSize="small" color="action" />
                          {formatDate(record.consultation_date)}
                        </Box>
                      </TableCell>
                      <TableCell>{record.chief_complaint}</TableCell>
                      <TableCell>
                        <Chip
                          label={record.primary_diagnosis}
                          size="small"
                          color="secondary"
                        />
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <IconButton
                            size="small"
                            onClick={() => handleViewRecord(record)}
                            title="Ver detalles"
                          >
                            <ViewIcon />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => handleEditDialogOpen(record)}
                            title="Editar"
                          >
                            <EditIcon />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => handlePrintRecord(record)}
                            title="Imprimir"
                            color="primary"
                          >
                            <PrintIcon />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => handleDeleteRecord(record.id)}
                            title="Eliminar"
                            color="error"
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {/* Create Dialog */}
      <Dialog 
        open={createDialogOpen} 
        onClose={() => setCreateDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <MedicalIcon />
            Crear Nuevo Expediente Médico
          </Box>
        </DialogTitle>
        <DialogContent>
          <MedicalRecordForm 
            formData={formData}
            setFormData={setFormData}
            patients={patients}
            isEditing={false}
            errors={formErrors}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleCreateRecord}
            variant="contained"
            disabled={loading}
          >
            {loading ? <CircularProgress size={20} /> : 'Crear'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog 
        open={editDialogOpen} 
        onClose={() => setEditDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <EditIcon />
            Editar Expediente Médico
          </Box>
        </DialogTitle>
        <DialogContent>
          <MedicalRecordForm 
            formData={formData}
            setFormData={setFormData}
            patients={patients}
            isEditing={true}
            errors={formErrors}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleEditRecord}
            variant="contained"
            disabled={loading}
          >
            {loading ? <CircularProgress size={20} /> : 'Guardar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Dialog */}
      <Dialog 
        open={viewDialogOpen} 
        onClose={() => setViewDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ViewIcon />
            Detalles del Expediente Médico
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedRecord && (
            <MedicalRecordDetails record={selectedRecord} />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewDialogOpen(false)}>
            Cerrar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

// Medical Record Form Component
interface MedicalRecordFormProps {
  formData: MedicalRecordFormData;
  setFormData: (data: MedicalRecordFormData) => void;
  patients: Patient[];
  isEditing: boolean;
  errors?: {[key: string]: string};
}

const MedicalRecordForm: React.FC<MedicalRecordFormProps> = ({
  formData,
  setFormData,
  patients,
  isEditing,
  errors = {}
}) => {
  const handleChange = (field: keyof MedicalRecordFormData, value: any) => {
    setFormData({ ...formData, [field]: value });
  };

  return (
    <Grid container spacing={3} sx={{ mt: 1 }}>
      {/* Patient Selection */}
      <Grid size={{ xs: 12, md: 6 }}>
        <FormControl fullWidth required error={!!errors.patient_id}>
          <InputLabel>Paciente</InputLabel>
          <Select
            value={formData.patient_id || ''}
            onChange={(e) => handleChange('patient_id', Number(e.target.value))}
            label="Paciente"
            disabled={isEditing}
          >
            {patients.map((patient) => (
              <MenuItem key={patient.id} value={Number(patient.id)}>
                {patient.full_name}
              </MenuItem>
            ))}
          </Select>
          {errors.patient_id && (
            <Typography variant="caption" color="error" sx={{ mt: 0.5 }}>
              {errors.patient_id}
            </Typography>
          )}
        </FormControl>
      </Grid>

      {/* Consultation Date */}
      <Grid size={{ xs: 12, md: 6 }}>
        <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={es}>
          <DatePicker
            label="Fecha de Consulta *"
            value={formData.consultation_date ? new Date(formData.consultation_date) : null}
            minDate={new Date()}
            onChange={(newValue) => {
              if (newValue) {
                handleChange('consultation_date', newValue.toISOString().split('T')[0]);
              } else {
                handleChange('consultation_date', '');
              }
            }}
            slotProps={{
              textField: {
                fullWidth: true,
                error: !!errors.consultation_date,
                helperText: errors.consultation_date
              }
            }}
          />
        </LocalizationProvider>
      </Grid>

      {/* NOM-004 Required Fields */}
      <Grid size={{ xs: 12 }}>
        <Typography variant="h6" color="primary">
          Información Clínica Obligatoria
        </Typography>
      </Grid>

      <Grid size={{ xs: 12 }}>
        <TextField
          fullWidth
          required
          multiline
          rows={3}
          label="Motivo de Consulta"
          value={formData.chief_complaint}
          onChange={(e) => handleChange('chief_complaint', e.target.value)}
          error={!!errors.chief_complaint}
          helperText={errors.chief_complaint}
        />
      </Grid>

      <Grid size={{ xs: 12 }}>
        <TextField
          fullWidth
          required
          multiline
          rows={3}
          label="Historia de la Enfermedad Actual"
          value={formData.history_present_illness}
          onChange={(e) => handleChange('history_present_illness', e.target.value)}
        />
      </Grid>

      <Grid size={{ xs: 12, md: 6 }}>
        <TextField
          fullWidth
          required
          multiline
          rows={3}
          label="Antecedentes Heredofamiliares"
          value={formData.family_history}
          onChange={(e) => handleChange('family_history', e.target.value)}
        />
      </Grid>

      <Grid size={{ xs: 12, md: 6 }}>
        <TextField
          fullWidth
          required
          multiline
          rows={3}
          label="Antecedentes Patológicos Personales"
          value={formData.personal_pathological_history}
          onChange={(e) => handleChange('personal_pathological_history', e.target.value)}
        />
      </Grid>

      <Grid size={{ xs: 12 }}>
        <TextField
          fullWidth
          required
          multiline
          rows={3}
          label="Antecedentes No Patológicos Personales"
          value={formData.personal_non_pathological_history}
          onChange={(e) => handleChange('personal_non_pathological_history', e.target.value)}
        />
      </Grid>

      <Grid size={{ xs: 12 }}>
        <TextField
          fullWidth
          required
          multiline
          rows={4}
          label="Examen Físico"
          value={formData.physical_examination}
          onChange={(e) => handleChange('physical_examination', e.target.value)}
        />
      </Grid>

      <Grid size={{ xs: 12, md: 6 }}>
        <TextField
          fullWidth
          required
          label="Diagnóstico Principal"
          value={formData.primary_diagnosis}
          onChange={(e) => handleChange('primary_diagnosis', e.target.value)}
        />
      </Grid>

      <Grid size={{ xs: 12, md: 6 }}>
        <TextField
          fullWidth
          label="Diagnósticos Secundarios"
          value={formData.secondary_diagnoses}
          onChange={(e) => handleChange('secondary_diagnoses', e.target.value)}
        />
      </Grid>

      <Grid size={{ xs: 12 }}>
        <TextField
          fullWidth
          required
          multiline
          rows={3}
          label="Plan de Tratamiento"
          value={formData.treatment_plan}
          onChange={(e) => handleChange('treatment_plan', e.target.value)}
        />
      </Grid>

      <Grid size={{ xs: 12, md: 6 }}>
        <TextField
          fullWidth
          multiline
          rows={3}
          label="Instrucciones de Seguimiento (Opcional)"
          value={formData.follow_up_instructions}
          onChange={(e) => handleChange('follow_up_instructions', e.target.value)}
        />
      </Grid>

      <Grid size={{ xs: 12, md: 6 }}>
        <TextField
          fullWidth
          required
          multiline
          rows={3}
          label="Pronóstico"
          value={formData.prognosis}
          onChange={(e) => handleChange('prognosis', e.target.value)}
        />
      </Grid>

      {/* Optional Fields */}
      <Grid size={{ xs: 12 }}>
        <Typography variant="h6" color="secondary">
          Información Adicional (Opcional)
        </Typography>
      </Grid>

      <Grid size={{ xs: 12, md: 6 }}>
        <TextField
          fullWidth
          multiline
          rows={3}
          label="Medicamentos Prescritos"
          value={formData.prescribed_medications}
          onChange={(e) => handleChange('prescribed_medications', e.target.value)}
        />
      </Grid>

      <Grid size={{ xs: 12, md: 6 }}>
        <TextField
          fullWidth
          multiline
          rows={3}
          label="Resultados de Laboratorio"
          value={formData.laboratory_results}
          onChange={(e) => handleChange('laboratory_results', e.target.value)}
        />
      </Grid>

      <Grid size={{ xs: 12, md: 6 }}>
        <TextField
          fullWidth
          multiline
          rows={3}
          label="Resultados de Imágenes"
          value={formData.imaging_results}
          onChange={(e) => handleChange('imaging_results', e.target.value)}
        />
      </Grid>

      <Grid size={{ xs: 12, md: 6 }}>
        <TextField
          fullWidth
          multiline
          rows={3}
          label="Notas Adicionales"
          value={formData.notes}
          onChange={(e) => handleChange('notes', e.target.value)}
        />
      </Grid>
    </Grid>
  );
};

// Medical Record Details Component
interface MedicalRecordDetailsProps {
  record: MedicalRecord;
}

const MedicalRecordDetails: React.FC<MedicalRecordDetailsProps> = ({ record }) => {
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

  return (
    <Grid container spacing={3} sx={{ mt: 1 }}>
      {/* Header Information */}
      <Grid size={{ xs: 12 }}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Información General
            </Typography>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography variant="body2" color="text.secondary">
                  Código del Expediente
                </Typography>
                <Typography variant="body1">
                  {record.record_code || `#${record.id}`}
                </Typography>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography variant="body2" color="text.secondary">
                  Fecha de Consulta
                </Typography>
                <Typography variant="body1">
                  {formatDate(record.consultation_date)}
                </Typography>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography variant="body2" color="text.secondary">
                  Paciente
                </Typography>
                <Typography variant="body1">
                  {getPatientName()}
                </Typography>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography variant="body2" color="text.secondary">
                  Doctor
                </Typography>
                <Typography variant="body1">
                  {getDoctorName()}
                </Typography>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Grid>

      {/* Clinical Information */}
      <Grid size={{ xs: 12 }}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Información Clínica
            </Typography>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12 }}>
                <Typography variant="body2" color="text.secondary">
                  Motivo de Consulta
                </Typography>
                <Typography variant="body1" paragraph>
                  {record.chief_complaint}
                </Typography>
              </Grid>
              <Grid size={{ xs: 12 }}>
                <Typography variant="body2" color="text.secondary">
                  Historia de la Enfermedad Actual
                </Typography>
                <Typography variant="body1" paragraph>
                  {record.history_present_illness}
                </Typography>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography variant="body2" color="text.secondary">
                  Antecedentes Heredofamiliares
                </Typography>
                <Typography variant="body1" paragraph>
                  {record.family_history}
                </Typography>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography variant="body2" color="text.secondary">
                  Antecedentes Patológicos Personales
                </Typography>
                <Typography variant="body1" paragraph>
                  {record.personal_pathological_history}
                </Typography>
              </Grid>
              <Grid size={{ xs: 12 }}>
                <Typography variant="body2" color="text.secondary">
                  Examen Físico
                </Typography>
                <Typography variant="body1" paragraph>
                  {record.physical_examination}
                </Typography>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Grid>

      {/* Diagnosis and Treatment */}
      <Grid size={{ xs: 12 }}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Diagnóstico y Tratamiento
            </Typography>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography variant="body2" color="text.secondary">
                  Diagnóstico Principal
                </Typography>
                <Typography variant="body1" paragraph>
                  {record.primary_diagnosis}
                </Typography>
              </Grid>
              {record.secondary_diagnoses && (
                <Grid size={{ xs: 12, md: 6 }}>
                  <Typography variant="body2" color="text.secondary">
                    Diagnósticos Secundarios
                  </Typography>
                  <Typography variant="body1" paragraph>
                    {record.secondary_diagnoses}
                  </Typography>
                </Grid>
              )}
              <Grid size={{ xs: 12 }}>
                <Typography variant="body2" color="text.secondary">
                  Plan de Tratamiento
                </Typography>
                <Typography variant="body1" paragraph>
                  {record.treatment_plan}
                </Typography>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography variant="body2" color="text.secondary">
                  Instrucciones de Seguimiento
                </Typography>
                <Typography variant="body1" paragraph>
                  {record.follow_up_instructions}
                </Typography>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography variant="body2" color="text.secondary">
                  Pronóstico
                </Typography>
                <Typography variant="body1" paragraph>
                  {record.prognosis}
                </Typography>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Grid>

      {/* Additional Information */}
      {(record.prescribed_medications || record.laboratory_results || record.imaging_results || record.notes) && (
        <Grid size={{ xs: 12 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Información Adicional
              </Typography>
              <Grid container spacing={2}>
                {record.prescribed_medications && (
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Typography variant="body2" color="text.secondary">
                      Medicamentos Prescritos
                    </Typography>
                    <Typography variant="body1" paragraph>
                      {record.prescribed_medications}
                    </Typography>
                  </Grid>
                )}
                {record.laboratory_results && (
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Typography variant="body2" color="text.secondary">
                      Resultados de Laboratorio
                    </Typography>
                    <Typography variant="body1" paragraph>
                      {record.laboratory_results}
                    </Typography>
                  </Grid>
                )}
                {record.imaging_results && (
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Typography variant="body2" color="text.secondary">
                      Resultados de Imágenes
                    </Typography>
                    <Typography variant="body1" paragraph>
                      {record.imaging_results}
                    </Typography>
                  </Grid>
                )}
                {record.notes && (
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Typography variant="body2" color="text.secondary">
                      Notas Adicionales
                    </Typography>
                    <Typography variant="body1" paragraph>
                      {record.notes}
                    </Typography>
                  </Grid>
                )}
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      )}
    </Grid>
  );
};

export default MedicalRecordsView;

