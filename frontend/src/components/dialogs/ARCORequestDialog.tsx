/**
 * ARCO Request Dialog Component
 * 
 * Manages patient ARCO rights according to LFPDPPP:
 * - Acceso (Access): View their data
 * - Rectificación (Rectification): Correct inaccurate data
 * - Cancelación (Cancellation): Delete their data
 * - Oposición (Opposition): Object to data processing
 */

import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Card,
  CardContent,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Alert,
  CircularProgress
} from '@mui/material';
import {
  Close as CloseIcon,
  Gavel as GavelIcon,
  Visibility as VisibilityIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Block as BlockIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  HourglassEmpty as HourglassEmptyIcon,
  Cancel as CancelIcon
} from '@mui/icons-material';
import { useARCORequests } from '../../hooks/useARCORequests';
import { useToast } from '../common/ToastNotification';
import { useScrollToErrorInDialog } from '../../hooks/useScrollToError';
import type { Patient, ARCORequestType, ARCORequestStatus } from '../../types';

interface ARCORequestDialogProps {
  open: boolean;
  onClose: () => void;
  patient: Patient | null;
}

export const ARCORequestDialog: React.FC<ARCORequestDialogProps> = ({
  open,
  onClose,
  patient
}) => {
  const { showSuccess, showError } = useToast();
  const {
    arcoRequests,
    isLoading,
    error,
    fetchARCORequests,
    createARCORequest,
    updateARCORequest,
    clearError
  } = useARCORequests();

  const { errorRef } = useScrollToErrorInDialog(error);

  // Form state
  const [requestType, setRequestType] = useState<ARCORequestType>('access');
  const [description, setDescription] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Fetch ARCO requests when dialog opens
  useEffect(() => {
    if (open && patient?.id) {
      fetchARCORequests(patient.id);
      setContactEmail(patient.email || '');
      setContactPhone(patient.primary_phone || '');
    }
  }, [open, patient?.id, fetchARCORequests, patient?.email, patient?.primary_phone]);

  // Clear form when dialog closes
  useEffect(() => {
    if (!open) {
      setShowCreateForm(false);
      setRequestType('access');
      setDescription('');
      clearError();
    }
  }, [open, clearError]);

  /**
   * Handle create ARCO request
   */
  const handleCreate = async () => {
    if (!patient?.id) {
      showError('No se pudo identificar al paciente');
      return;
    }

    if (!description.trim()) {
      showError('Por favor, describa la solicitud');
      return;
    }

    try {
      await createARCORequest({
        patient_id: patient.id,
        request_type: requestType,
        description: description.trim(),
        contact_email: contactEmail.trim() || undefined,
        contact_phone: contactPhone.trim() || undefined
      });

      showSuccess('✅ Solicitud ARCO creada exitosamente');
      setShowCreateForm(false);
      setDescription('');
      
      // Refresh list
      await fetchARCORequests(patient.id);
    } catch (err: any) {
      showError(err?.detail || 'Error al crear la solicitud ARCO');
    }
  };

  /**
   * Handle update ARCO request status
   */
  const handleUpdateStatus = async (requestId: number, newStatus: ARCORequestStatus, notes?: string) => {
    try {
      await updateARCORequest(requestId, {
        status: newStatus,
        resolution_notes: notes
      });

      showSuccess('✅ Estado de solicitud ARCO actualizado');
      
      if (patient?.id) {
        await fetchARCORequests(patient.id);
      }
    } catch (err: any) {
      showError(err?.detail || 'Error al actualizar la solicitud ARCO');
    }
  };

  /**
   * Get ARCO request type info
   */
  const getRequestTypeInfo = (type: ARCORequestType) => {
    const info = {
      access: {
        label: 'Acceso',
        icon: <VisibilityIcon />,
        color: 'info',
        description: 'Solicitar acceso a los datos personales'
      },
      rectification: {
        label: 'Rectificación',
        icon: <EditIcon />,
        color: 'warning',
        description: 'Corregir datos personales inexactos'
      },
      cancellation: {
        label: 'Cancelación',
        icon: <DeleteIcon />,
        color: 'error',
        description: 'Eliminar datos personales'
      },
      opposition: {
        label: 'Oposición',
        icon: <BlockIcon />,
        color: 'default',
        description: 'Oponerse al tratamiento de datos'
      }
    };

    return info[type];
  };

  /**
   * Get status info
   */
  const getStatusInfo = (status: ARCORequestStatus) => {
    const info = {
      pending: {
        label: 'Pendiente',
        icon: <HourglassEmptyIcon />,
        color: 'warning'
      },
      in_progress: {
        label: 'En Proceso',
        icon: <ScheduleIcon />,
        color: 'info'
      },
      resolved: {
        label: 'Resuelta',
        icon: <CheckCircleIcon />,
        color: 'success'
      },
      rejected: {
        label: 'Rechazada',
        icon: <CancelIcon />,
        color: 'error'
      }
    };

    return info[status];
  };

  /**
   * Format datetime for display
   */
  const formatDateTime = (dateStr: string | undefined) => {
    if (!dateStr) return '-';
    
    try {
      const date = new Date(dateStr);
      return date.toLocaleString('es-MX', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return '-';
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      fullScreen={false}
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box display="flex" alignItems="center" gap={1}>
            <GavelIcon />
            <Typography variant="h6">
              Derechos ARCO
            </Typography>
          </Box>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        {/* Error Display */}
        {error && (
          <Box
            ref={errorRef}
            sx={{
              mb: 2,
              p: 2,
              bgcolor: '#d32f2f',
              borderRadius: 1
            }}
          >
            <Typography color="white" sx={{ color: 'white !important' }}>
              {error}
            </Typography>
          </Box>
        )}

        {/* Patient Info */}
        {patient && (
          <Card variant="outlined" sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="subtitle2" gutterBottom>
                Paciente
              </Typography>
              <Typography variant="body1" fontWeight={500}>
                {patient.name || patient.full_name || 'Paciente sin nombre'}
              </Typography>
              {patient.email && (
                <Typography variant="body2" color="text.secondary">
                  Email: {patient.email}
                </Typography>
              )}
              {patient.primary_phone && (
                <Typography variant="body2" color="text.secondary">
                  Teléfono: {patient.primary_phone}
                </Typography>
              )}
            </CardContent>
          </Card>
        )}

        {/* ARCO Info */}
        <Alert severity="info" sx={{ mb: 2 }}>
          Los derechos ARCO permiten al paciente ejercer control sobre sus datos personales
          según la LFPDPPP (Ley Federal de Protección de Datos Personales en Posesión de Particulares).
        </Alert>

        {/* Create Form */}
        {showCreateForm ? (
          <Card variant="outlined" sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="subtitle1" gutterBottom fontWeight={500}>
                Nueva Solicitud ARCO
              </Typography>

              <FormControl fullWidth sx={{ mt: 2 }}>
                <InputLabel>Tipo de Solicitud</InputLabel>
                <Select
                  value={requestType}
                  onChange={(e) => setRequestType(e.target.value as ARCORequestType)}
                  label="Tipo de Solicitud"
                >
                  {(['access', 'rectification', 'cancellation', 'opposition'] as ARCORequestType[]).map((type) => {
                    const info = getRequestTypeInfo(type);
                    return (
                      <MenuItem key={type} value={type}>
                        <Box display="flex" alignItems="center" gap={1}>
                          {info.icon}
                          <Box>
                            <Typography variant="body1">{info.label}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              {info.description}
                            </Typography>
                          </Box>
                        </Box>
                      </MenuItem>
                    );
                  })}
                </Select>
              </FormControl>

              <TextField
                label="Descripción de la Solicitud"
                multiline
                rows={4}
                fullWidth
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                sx={{ mt: 2 }}
                placeholder="Describa detalladamente su solicitud..."
                required
              />

              <TextField
                label="Email de Contacto (opcional)"
                fullWidth
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                sx={{ mt: 2 }}
              />

              <TextField
                label="Teléfono de Contacto (opcional)"
                fullWidth
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                sx={{ mt: 2 }}
              />

              <Box display="flex" gap={1} mt={2}>
                <Button
                  variant="contained"
                  onClick={handleCreate}
                  disabled={isLoading || !description.trim()}
                >
                  Crear Solicitud
                </Button>
                <Button
                  variant="outlined"
                  onClick={() => setShowCreateForm(false)}
                  disabled={isLoading}
                >
                  Cancelar
                </Button>
              </Box>
            </CardContent>
          </Card>
        ) : (
          <Button
            variant="outlined"
            startIcon={<GavelIcon />}
            onClick={() => setShowCreateForm(true)}
            fullWidth
            sx={{ mb: 2 }}
          >
            Nueva Solicitud ARCO
          </Button>
        )}

        {/* Loading State */}
        {isLoading && arcoRequests.length === 0 && (
          <Box display="flex" justifyContent="center" alignItems="center" minHeight={200}>
            <CircularProgress />
          </Box>
        )}

        {/* Existing Requests */}
        {!isLoading && arcoRequests.length === 0 && !showCreateForm && (
          <Alert severity="info">
            No hay solicitudes ARCO registradas para este paciente.
          </Alert>
        )}

        {arcoRequests.length > 0 && (
          <Box>
            <Typography variant="subtitle1" gutterBottom fontWeight={500}>
              Solicitudes Registradas
            </Typography>

            <List>
              {arcoRequests.map((request, index) => {
                const typeInfo = getRequestTypeInfo(request.request_type);
                const statusInfo = getStatusInfo(request.status);

                return (
                  <React.Fragment key={request.id}>
                    {index > 0 && <Divider />}
                    <ListItem sx={{ flexDirection: 'column', alignItems: 'flex-start', py: 2 }}>
                      <Box display="flex" alignItems="center" gap={1} mb={1} width="100%">
                        <ListItemIcon sx={{ minWidth: 40 }}>
                          {typeInfo.icon}
                        </ListItemIcon>
                        <Box flex={1}>
                          <Typography variant="body1" fontWeight={500}>
                            {typeInfo.label}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            ID: {request.id} • Solicitada: {formatDateTime(request.requested_at)}
                          </Typography>
                        </Box>
                        <Chip
                          icon={statusInfo.icon}
                          label={statusInfo.label}
                          color={statusInfo.color as any}
                          size="small"
                        />
                      </Box>

                      <Typography variant="body2" color="text.secondary" sx={{ ml: 5, mb: 1 }}>
                        {request.description}
                      </Typography>

                      {request.resolution_notes && (
                        <Alert severity="info" sx={{ ml: 5, width: 'calc(100% - 40px)' }}>
                          <Typography variant="caption" fontWeight={500}>
                            Notas de Resolución:
                          </Typography>
                          <Typography variant="body2">
                            {request.resolution_notes}
                          </Typography>
                        </Alert>
                      )}

                      {request.resolved_at && (
                        <Typography variant="caption" color="text.secondary" sx={{ ml: 5, mt: 0.5 }}>
                          Resuelta: {formatDateTime(request.resolved_at)}
                        </Typography>
                      )}

                      {request.status === 'pending' && (
                        <Box display="flex" gap={1} mt={1} ml={5}>
                          <Button
                            size="small"
                            variant="outlined"
                            color="primary"
                            onClick={() => handleUpdateStatus(request.id, 'in_progress')}
                          >
                            Marcar en Proceso
                          </Button>
                          <Button
                            size="small"
                            variant="outlined"
                            color="success"
                            onClick={() => handleUpdateStatus(request.id, 'resolved', 'Solicitud resuelta satisfactoriamente')}
                          >
                            Resolver
                          </Button>
                        </Box>
                      )}

                      {request.status === 'in_progress' && (
                        <Box display="flex" gap={1} mt={1} ml={5}>
                          <Button
                            size="small"
                            variant="outlined"
                            color="success"
                            onClick={() => handleUpdateStatus(request.id, 'resolved', 'Solicitud resuelta satisfactoriamente')}
                          >
                            Resolver
                          </Button>
                        </Box>
                      )}
                    </ListItem>
                  </React.Fragment>
                );
              })}
            </List>
          </Box>
        )}

        {/* Legal Info */}
        <Card variant="outlined" sx={{ mt: 2, bgcolor: 'info.lighter' }}>
          <CardContent>
            <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <GavelIcon fontSize="small" />
              Plazos Legales
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Según la LFPDPPP, tiene 20 días hábiles para responder a una solicitud ARCO
              desde su recepción. Si la solicitud es procedente, debe hacerse efectiva
              en un plazo máximo de 15 días hábiles.
            </Typography>
          </CardContent>
        </Card>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} color="inherit">
          Cerrar
        </Button>
      </DialogActions>
    </Dialog>
  );
};

