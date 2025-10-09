// ============================================================================
// MEDICAL ORDERS SECTION - Sección para mostrar órdenes médicas
// Compatible con MUI v7
// ============================================================================

import React, { useState } from 'react';
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
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Tooltip,
  Card,
  CardContent,
} from '@mui/material';
import {
  Add as AddIcon,
  Print as PrintIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  MoreVert as MoreVertIcon,
  MedicalServices as MedicalIcon,
  LocalHospital as HospitalIcon
} from '@mui/icons-material';
import { format } from 'date-fns';
import { 
  MedicalOrder, 
  OrderStatus, 
  OrderPriority 
} from '../../types';

interface MedicalOrdersSectionProps {
  orders: MedicalOrder[];
  onCreateOrder: () => void;
  onEditOrder?: (order: MedicalOrder) => void;
  onDeleteOrder?: (orderId: string) => void;
  onPrintOrder?: (order: MedicalOrder) => void;
  onUpdateStatus?: (orderId: string, status: OrderStatus) => void;
  loading?: boolean;
  readonly?: boolean;
}

const MedicalOrdersSection: React.FC<MedicalOrdersSectionProps> = ({
  orders = [],
  onCreateOrder,
  onEditOrder,
  onDeleteOrder,
  onPrintOrder,
  onUpdateStatus,
  loading = false,
  readonly = false
}) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedOrder, setSelectedOrder] = useState<MedicalOrder | null>(null);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, order: MedicalOrder) => {
    setAnchorEl(event.currentTarget);
    setSelectedOrder(order);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedOrder(null);
  };

  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case 'pendiente': return 'warning';
      case 'en_proceso': return 'info';
      case 'completada': return 'success';
      case 'cancelada': return 'error';
      default: return 'default';
    }
  };

  const getStatusLabel = (status: OrderStatus) => {
    switch (status) {
      case 'pendiente': return 'Pendiente';
      case 'en_proceso': return 'En Proceso';
      case 'completada': return 'Completada';
      case 'cancelada': return 'Cancelada';
      default: return status;
    }
  };

  const getPriorityColor = (priority: OrderPriority) => {
    switch (priority) {
      case 'urgente': return 'error';
      case 'preferente': return 'warning';
      case 'rutina': return 'default';
      default: return 'default';
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'dd/MM/yyyy');
    } catch {
      return 'Fecha inválida';
    }
  };

  if (orders.length === 0) {
    return (
      <Card sx={{ 
        borderRadius: '16px',
        boxShadow: '0 4px 24px rgba(21, 101, 192, 0.1)',
        border: '1px solid rgba(21, 101, 192, 0.1)'
      }}>
        <CardContent sx={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'center',
          p: 4,
          textAlign: 'center'
        }}>
          <HospitalIcon sx={{ fontSize: 64, opacity: 0.3, mb: 2, color: 'primary.main' }} />
          <Typography variant="h6" sx={{ opacity: 0.6, mb: 1 }}>
            No hay órdenes médicas
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.5, mb: 3 }}>
            Las órdenes médicas aparecerán aquí una vez que sean creadas
          </Typography>
          {!readonly && (
            <Button 
              variant="contained" 
              startIcon={<AddIcon />}
              onClick={onCreateOrder}
              sx={{ borderRadius: '12px' }}
            >
              Crear Primera Orden
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Paper sx={{ 
      borderRadius: '16px',
      boxShadow: '0 4px 24px rgba(21, 101, 192, 0.1)',
      border: '1px solid rgba(21, 101, 192, 0.1)',
      overflow: 'hidden'
    }}>
      {/* Header */}
      <Box sx={{ 
        p: 3, 
        borderBottom: '1px solid rgba(21, 101, 192, 0.1)',
        backgroundColor: 'rgba(21, 101, 192, 0.02)'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <MedicalIcon sx={{ color: 'primary.main' }} />
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Órdenes Médicas ({orders.length})
            </Typography>
          </Box>
          {!readonly && (
            <Button 
              variant="contained" 
              size="small"
              startIcon={<AddIcon />}
              onClick={onCreateOrder}
              disabled={loading}
              sx={{ borderRadius: '12px' }}
            >
              Nueva Orden
            </Button>
          )}
        </Box>
      </Box>

      {/* Orders Table */}
      <TableContainer>
        <Table size="medium">
          <TableHead>
            <TableRow sx={{ backgroundColor: 'rgba(21, 101, 192, 0.05)' }}>
              <TableCell sx={{ fontWeight: 600 }}>Estudio</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Tipo</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Prioridad</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Estado</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Fecha</TableCell>
              <TableCell sx={{ fontWeight: 600, textAlign: 'center' }}>Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {orders.map((order) => (
              <TableRow 
                key={order.id}
                sx={{ 
                  '&:hover': { backgroundColor: 'rgba(21, 101, 192, 0.02)' },
                  '&:last-child td': { border: 0 }
                }}
              >
                <TableCell>
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {order.study_name}
                    </Typography>
                    {order.clinical_indication && (
                      <Typography variant="caption" sx={{ opacity: 0.7 }}>
                        {order.clinical_indication.length > 50 
                          ? `${order.clinical_indication.substring(0, 50)}...`
                          : order.clinical_indication
                        }
                      </Typography>
                    )}
                  </Box>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                    {order.order_type.replace('_', ' ')}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip 
                    label={order.priority}
                    size="small"
                    color={getPriorityColor(order.priority)}
                    sx={{ textTransform: 'capitalize' }}
                  />
                </TableCell>
                <TableCell>
                  <Chip 
                    label={getStatusLabel(order.status)}
                    size="small"
                    color={getStatusColor(order.status)}
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {formatDate(order.order_date)}
                  </Typography>
                </TableCell>
                <TableCell sx={{ textAlign: 'center' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5 }}>
                    {onPrintOrder && (
                      <Tooltip title="Imprimir">
                        <IconButton 
                          size="small"
                          onClick={() => onPrintOrder(order)}
                          sx={{ color: 'primary.main' }}
                        >
                          <PrintIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                    
                    {!readonly && (
                      <IconButton 
                        size="small"
                        onClick={(e) => handleMenuOpen(e, order)}
                        sx={{ color: 'text.secondary' }}
                      >
                        <MoreVertIcon fontSize="small" />
                      </IconButton>
                    )}
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Actions Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        {onEditOrder && selectedOrder && (
          <MenuItem onClick={() => {
            onEditOrder(selectedOrder);
            handleMenuClose();
          }}>
            <ListItemIcon>
              <EditIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Editar</ListItemText>
          </MenuItem>
        )}
        
        {onUpdateStatus && selectedOrder && selectedOrder.status !== 'completada' && (
          <MenuItem onClick={() => {
            onUpdateStatus(selectedOrder.id, 'completada');
            handleMenuClose();
          }}>
            <ListItemIcon>
              <MedicalIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Marcar como Completada</ListItemText>
          </MenuItem>
        )}
        
        {onDeleteOrder && selectedOrder && (
          <MenuItem 
            onClick={() => {
              onDeleteOrder(selectedOrder.id);
              handleMenuClose();
            }}
            sx={{ color: 'error.main' }}
          >
            <ListItemIcon>
              <DeleteIcon fontSize="small" sx={{ color: 'error.main' }} />
            </ListItemIcon>
            <ListItemText>Eliminar</ListItemText>
          </MenuItem>
        )}
      </Menu>
    </Paper>
  );
};

export default MedicalOrdersSection;
