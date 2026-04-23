import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  Tooltip
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Warning as WarningIcon,
  AddCircleOutline as AddCircleOutlineIcon
} from '@mui/icons-material';
import { ApiService } from '../../services/ApiService';
import { License, LicenseStatus, DoctorLicenseRow } from '../../types/license';
import { LicenseForm } from './LicenseForm';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { TableSkeleton } from '../common/TableSkeleton';
import { formatDateOnly } from '../../utils/dateHelpers';

const apiService = new ApiService();

export const LicenseManagement: React.FC = () => {
  const snackbar = useSnackbar();
  const [rows, setRows] = useState<DoctorLicenseRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLicense, setEditingLicense] = useState<License | null>(null);
  const [preselectedDoctorId, setPreselectedDoctorId] = useState<number | undefined>(undefined);
  const [filters, setFilters] = useState<{
    status?: string;
    license_type?: string;
  }>({});

  const loadRows = async () => {
    setLoading(true);
    try {
      const data = await apiService.licenses.getDoctorsWithLicenses(filters);
      setRows(data);
    } catch (err: any) {
      snackbar.error(err?.message || 'Error al cargar la lista de doctores');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRows();
  }, [filters]);

  const handleCreate = () => {
    setEditingLicense(null);
    setPreselectedDoctorId(undefined);
    setDialogOpen(true);
  };

  const handleCreateForDoctor = (doctorId: number) => {
    setEditingLicense(null);
    setPreselectedDoctorId(doctorId);
    setDialogOpen(true);
  };

  const handleEdit = (license: License) => {
    setEditingLicense(license);
    setPreselectedDoctorId(undefined);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingLicense(null);
    setPreselectedDoctorId(undefined);
    loadRows();
  };

  const getStatusColor = (status: LicenseStatus) => {
    switch (status) {
      case 'active': return 'success';
      case 'inactive': return 'default';
      case 'expired': return 'error';
      case 'suspended': return 'warning';
      default: return 'default';
    }
  };

  const getStatusIcon = (status: LicenseStatus) => {
    switch (status) {
      case 'active': return <CheckCircleIcon fontSize="small" />;
      case 'expired': return <CancelIcon fontSize="small" />;
      case 'suspended': return <WarningIcon fontSize="small" />;
      default: return undefined;
    }
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return '-';
    return formatDateOnly(dateString, { day: '2-digit', month: '2-digit', year: 'numeric' }) || '-';
  };

  const formatDateTime = (dateString: string | null | undefined) => {
    if (!dateString) return 'Nunca';
    return new Date(dateString).toLocaleString('es-MX', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit'
    });
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Gestión de Licencias
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleCreate}
        >
          Nueva Licencia
        </Button>
      </Box>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel>Estado</InputLabel>
            <Select
              value={filters.status || ''}
              label="Estado"
              onChange={(e) => setFilters({ ...filters, status: e.target.value || undefined })}
            >
              <MenuItem value="">Todos</MenuItem>
              <MenuItem value="active">Activa</MenuItem>
              <MenuItem value="inactive">Inactiva</MenuItem>
              <MenuItem value="expired">Expirada</MenuItem>
              <MenuItem value="suspended">Suspendida</MenuItem>
            </Select>
          </FormControl>
          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel>Tipo</InputLabel>
            <Select
              value={filters.license_type || ''}
              label="Tipo"
              onChange={(e) => setFilters({ ...filters, license_type: e.target.value || undefined })}
            >
              <MenuItem value="">Todos</MenuItem>
              <MenuItem value="trial">Trial</MenuItem>
              <MenuItem value="premium">Premium</MenuItem>
            </Select>
          </FormControl>
        </Box>
        <Typography variant="caption" color="text.secondary">
          Los filtros aplican únicamente sobre doctores con licencia. Con filtros activos, los que no tienen licencia no aparecen.
        </Typography>
      </Paper>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Doctor</TableCell>
              <TableCell>Último Inicio de Sesión</TableCell>
              <TableCell>Tipo</TableCell>
              <TableCell>Fecha Inicio</TableCell>
              <TableCell>Fecha Expiración</TableCell>
              <TableCell>Fecha Pago</TableCell>
              <TableCell>Estado</TableCell>
              <TableCell>Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableSkeleton rows={5} cols={8} />
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  No hay doctores registrados
                </TableCell>
              </TableRow>
            ) : (
              rows.map(({ doctor, license }) => (
                <TableRow key={doctor.id}>
                  <TableCell>
                    <Typography variant="body2">{doctor.name}</Typography>
                    <Typography variant="caption" color="text.secondary">{doctor.email}</Typography>
                  </TableCell>
                  <TableCell>{formatDateTime(doctor.last_login)}</TableCell>
                  {license ? (
                    <>
                      <TableCell>
                        <Chip
                          label={license.license_type.toUpperCase()}
                          size="small"
                          color="primary"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>{formatDate(license.start_date)}</TableCell>
                      <TableCell>{formatDate(license.expiration_date)}</TableCell>
                      <TableCell>{formatDate(license.payment_date)}</TableCell>
                      <TableCell>
                        <Chip
                          icon={getStatusIcon(license.status)}
                          label={license.status}
                          color={getStatusColor(license.status) as any}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Tooltip title="Editar licencia">
                          <IconButton aria-label="Editar"
                            size="small"
                            onClick={() => handleEdit(license)}
                            color="primary"
                          >
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </>
                  ) : (
                    <>
                      <TableCell colSpan={5}>
                        <Chip
                          label="SIN LICENCIA"
                          size="small"
                          color="default"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <Tooltip title="Crear licencia para este doctor">
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<AddCircleOutlineIcon />}
                            onClick={() => handleCreateForDoctor(doctor.id)}
                          >
                            Crear
                          </Button>
                        </Tooltip>
                      </TableCell>
                    </>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            minHeight: '500px',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }
        }}
      >
        <DialogTitle sx={{ pb: 1, pt: 2.5, px: 3 }}>
          {editingLicense ? 'Editar Licencia' : 'Nueva Licencia'}
        </DialogTitle>
        <DialogContent sx={{ pt: 1, pb: 2, px: 3, overflow: 'auto', flex: 1 }}>
          <LicenseForm
            license={editingLicense}
            initialDoctorId={preselectedDoctorId}
            onSuccess={handleCloseDialog}
            onCancel={handleCloseDialog}
          />
        </DialogContent>
      </Dialog>
    </Box>
  );
};
