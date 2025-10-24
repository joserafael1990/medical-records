import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Fab,
  Avatar,
  Tooltip
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Business as BusinessIcon,
  LocationOn as LocationIcon,
  Phone as PhoneIcon,
  Schedule as ScheduleIcon,
  Language as LanguageIcon
} from '@mui/icons-material';
import { Office } from '../../types';
import { useOfficeManagement } from '../../hooks/useOfficeManagement';
import OfficeDialog from '../dialogs/OfficeDialog';

const OfficesView: React.FC = () => {
  const {
    offices,
    loading,
    error,
    createOffice,
    updateOffice,
    deleteOffice
  } = useOfficeManagement();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingOffice, setEditingOffice] = useState<Office | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [officeToDelete, setOfficeToDelete] = useState<Office | null>(null);

  const handleCreateOffice = () => {
    setEditingOffice(null);
    setDialogOpen(true);
  };

  const handleEditOffice = (office: Office) => {
    console.log('🔍 Editing office from OfficesView:', office);
    console.log('🔍 Office ID type:', typeof office.id, office.id);
    setEditingOffice(office);
    setDialogOpen(true);
  };

  const handleDeleteOffice = (office: Office) => {
    setOfficeToDelete(office);
    setDeleteDialogOpen(true);
  };

  const handleSaveOffice = async (office: Office) => {
    try {
      if (editingOffice) {
        await updateOffice(office.id, office);
      } else {
        await createOffice(office);
      }
      setDialogOpen(false);
      setEditingOffice(null);
    } catch (err) {
      console.error('Error saving office:', err);
    }
  };

  const handleConfirmDelete = async () => {
    if (officeToDelete) {
      try {
        await deleteOffice(officeToDelete.id);
        setDeleteDialogOpen(false);
        setOfficeToDelete(null);
      } catch (err) {
        console.error('Error deleting office:', err);
      }
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
        <Typography variant="h6" sx={{ ml: 2 }}>
          Cargando consultorios...
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
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
          <BusinessIcon sx={{ color: 'text.primary' }} />
          Gestión de Consultorios
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleCreateOffice}
        >
          Nuevo Consultorio
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {offices.length === 0 ? (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 4 }}>
            <BusinessIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" sx={{ mb: 2 }}>
              No hay consultorios registrados
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Crea tu primer consultorio para comenzar a gestionar tus citas
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleCreateOffice}
            >
              Crear Consultorio
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Paper sx={{ borderRadius: 2, overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                    Consultorio
                  </TableCell>
                  <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                    Teléfono
                  </TableCell>
                  <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                    Tipo
                  </TableCell>
                  <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                    Dirección/URL
                  </TableCell>
                  <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'center' }}>
                    Estado
                  </TableCell>
                  <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'center' }}>
                    Eliminar
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {offices.map((office) => (
                  <TableRow 
                    key={office.id}
                    hover
                    onClick={() => handleEditOffice(office)}
                    sx={{ 
                      cursor: 'pointer',
                      '&:hover': { 
                        backgroundColor: 'action.hover' 
                      } 
                    }}
                  >
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Avatar sx={{ bgcolor: 'primary.main' }}>
                          {office.name.charAt(0).toUpperCase()}
                        </Avatar>
                        <Box>
                          <Typography variant="body1" sx={{ fontWeight: 500 }}>
                            {office.name}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {office.timezone}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {office.phone || 'No especificado'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={office.is_virtual ? 'Virtual' : 'Presencial'}
                        color={office.is_virtual ? 'primary' : 'success'}
                        size="small"
                        icon={office.is_virtual ? <LanguageIcon sx={{ fontSize: 16 }} /> : <LocationIcon sx={{ fontSize: 16 }} />}
                      />
                    </TableCell>
                    <TableCell>
                      {office.is_virtual ? (
                        office.virtual_url ? (
                          <Typography 
                            variant="body2" 
                            color="primary.main"
                            sx={{ 
                              textDecoration: 'underline',
                              cursor: 'pointer',
                              '&:hover': { textDecoration: 'none' }
                            }}
                            onClick={() => window.open(office.virtual_url, '_blank')}
                          >
                            {office.virtual_url}
                          </Typography>
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            No especificado
                          </Typography>
                        )
                      ) : (
                        <Typography variant="body2">
                          {office.address || 'No especificado'}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        label={office.is_active ? 'Activo' : 'Inactivo'}
                        color={office.is_active ? 'success' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title="Eliminar consultorio">
                        <IconButton 
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation(); // Evitar que se abra el diálogo de edición
                            handleDeleteOffice(office);
                          }}
                          sx={{ color: 'error.main' }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {/* Office Dialog */}
      <OfficeDialog
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setEditingOffice(null);
        }}
        onSave={handleSaveOffice}
        office={editingOffice}
        isEditing={!!editingOffice}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Confirmar Eliminación</DialogTitle>
        <DialogContent>
          <Typography>
            ¿Estás seguro de que quieres eliminar el consultorio "{officeToDelete?.name}"?
            Esta acción no se puede deshacer.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={handleConfirmDelete} color="error" variant="contained">
            Eliminar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default OfficesView;
