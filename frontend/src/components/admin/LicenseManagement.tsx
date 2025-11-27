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
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Warning as WarningIcon
} from '@mui/icons-material';
import { ApiService } from '../../services/ApiService';
import { License, LicenseType, LicenseStatus } from '../../types/license';
import { LicenseForm } from './LicenseForm';

const apiService = new ApiService();

export const LicenseManagement: React.FC = () => {
  const [licenses, setLicenses] = useState<License[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLicense, setEditingLicense] = useState<License | null>(null);
  const [filters, setFilters] = useState<{
    status?: string;
    license_type?: string;
  }>({});

  const loadLicenses = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiService.licenses.getLicenses(filters);
      setLicenses(data);
    } catch (err: any) {
      setError(err.message || 'Error al cargar licencias');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLicenses();
  }, [filters]);

  const handleCreate = () => {
    setEditingLicense(null);
    setDialogOpen(true);
  };

  const handleEdit = (license: License) => {
    setEditingLicense(license);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingLicense(null);
    loadLicenses();
  };

  const getStatusColor = (status: LicenseStatus) => {
    switch (status) {
      case 'active':
        return 'success';
      case 'inactive':
        return 'default';
      case 'expired':
        return 'error';
      case 'suspended':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status: LicenseStatus) => {
    switch (status) {
      case 'active':
        return <CheckCircleIcon fontSize="small" />;
      case 'expired':
        return <CancelIcon fontSize="small" />;
      case 'suspended':
        return <WarningIcon fontSize="small" />;
      default:
        return null;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-MX');
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

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

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
              <MenuItem value="basic">Básica</MenuItem>
              <MenuItem value="premium">Premium</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </Paper>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Doctor</TableCell>
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
              <TableRow>
                <TableCell colSpan={7} align="center">
                  Cargando...
                </TableCell>
              </TableRow>
            ) : licenses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  No hay licencias registradas
                </TableCell>
              </TableRow>
            ) : (
              licenses.map((license) => (
                <TableRow key={license.id}>
                  <TableCell>
                    {license.doctor?.name || `Doctor ID: ${license.doctor_id}`}
                  </TableCell>
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
                  <TableCell>
                    {license.payment_date ? formatDate(license.payment_date) : '-'}
                  </TableCell>
                  <TableCell>
                    <Chip
                      icon={getStatusIcon(license.status)}
                      label={license.status}
                      color={getStatusColor(license.status) as any}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <IconButton
                      size="small"
                      onClick={() => handleEdit(license)}
                      color="primary"
                    >
                      <EditIcon />
                    </IconButton>
                  </TableCell>
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
        <DialogTitle 
          sx={{ 
            pb: 1,
            pt: 2.5,
            px: 3,
            '&.MuiDialogTitle-root': {
              paddingTop: '20px'
            }
          }}
        >
          {editingLicense ? 'Editar Licencia' : 'Nueva Licencia'}
        </DialogTitle>
        <DialogContent 
          sx={{ 
            pt: 1,
            pb: 2,
            px: 3,
            overflow: 'auto',
            flex: 1,
            '&.MuiDialogContent-root': {
              paddingTop: '8px'
            }
          }}
        >
          <LicenseForm
            license={editingLicense}
            onSuccess={handleCloseDialog}
            onCancel={handleCloseDialog}
          />
        </DialogContent>
      </Dialog>
    </Box>
  );
};

