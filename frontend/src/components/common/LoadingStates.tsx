/**
 * Componentes de estados de carga específicos por contexto
 * Mejora la UX con feedback visual detallado y skeletons
 */

import React from 'react';
import {
  Box,
  CircularProgress,
  LinearProgress,
  Typography,
  Skeleton,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  Chip,
  Alert,
  Button
} from '@mui/material';
import {
  PersonAdd as PersonAddIcon,
  Edit as EditIcon,
  CloudUpload as UploadIcon,
  Save as SaveIcon,
  Refresh as RetryIcon,
  Check as CheckIcon,
  Error as ErrorIcon
} from '@mui/icons-material';
import { LoadingContext, LoadingState } from '../../hooks/useLoadingStates';

interface LoadingStateDisplayProps {
  context: LoadingContext;
  contextType: string;
  onRetry?: () => void;
  showProgress?: boolean;
  compact?: boolean;
}

const getContextIcon = (contextType: string, state: LoadingState) => {
  const iconProps = { 
    sx: { 
      mr: 1,
      color: state === 'success' ? 'success.main' : 
             state === 'error' ? 'error.main' : 
             'primary.main'
    }
  };

  switch (contextType) {
    case 'creatingPatient':
    case 'updatingPatient':
      return <PersonAddIcon {...iconProps} />;
    case 'uploadingStudy':
      return <UploadIcon {...iconProps} />;
    case 'saving':
    case 'savingConsultation':
      return <SaveIcon {...iconProps} />;
    case 'success':
      return <CheckIcon {...iconProps} />;
    case 'error':
      return <ErrorIcon {...iconProps} />;
    default:
      return <EditIcon {...iconProps} />;
  }
};

const getContextMessage = (contextType: string, state: LoadingState, customMessage?: string): string => {
  if (customMessage) return customMessage;

  const messages = {
    creatingPatient: {
      idle: 'Listo para crear paciente',
      loading: 'Creando nuevo paciente...',
      success: '¡Paciente creado exitosamente!',
      error: 'Error al crear paciente',
      retrying: 'Reintentando crear paciente...'
    },
    updatingPatient: {
      idle: 'Listo para actualizar paciente',
      loading: 'Actualizando información del paciente...',
      success: '¡Información actualizada!',
      error: 'Error al actualizar paciente',
      retrying: 'Reintentando actualización...'
    },
    loadingPatientHistory: {
      idle: 'Listo para cargar historial',
      loading: 'Cargando historial médico...',
      success: 'Historial cargado',
      error: 'Error al cargar historial',
      retrying: 'Reintentando cargar historial...'
    },
    savingConsultation: {
      idle: 'Listo para guardar consulta',
      loading: 'Guardando consulta médica...',
      success: '¡Consulta guardada exitosamente!',
      error: 'Error al guardar consulta',
      retrying: 'Reintentando guardar...'
    },
    uploadingStudy: {
      idle: 'Listo para subir estudio',
      loading: 'Subiendo estudio clínico...',
      success: '¡Estudio subido exitosamente!',
      error: 'Error al subir estudio',
      retrying: 'Reintentando subida...'
    },
    creatingAppointment: {
      idle: 'Listo para programar cita',
      loading: 'Programando cita médica...',
      success: '¡Cita programada exitosamente!',
      error: 'Error al programar cita',
      retrying: 'Reintentando programación...'
    },
    authenticating: {
      idle: 'Listo para autenticar',
      loading: 'Verificando credenciales...',
      success: '¡Acceso concedido!',
      error: 'Error de autenticación',
      retrying: 'Reintentando autenticación...'
    },
    default: {
      idle: 'Listo',
      loading: 'Procesando...',
      success: '¡Operación exitosa!',
      error: 'Error en la operación',
      retrying: 'Reintentando...'
    }
  };

  const contextMessages = messages[contextType as keyof typeof messages] || messages.default;
  return contextMessages[state] || contextMessages.loading;
};

export const LoadingStateDisplay: React.FC<LoadingStateDisplayProps> = ({
  context,
  contextType,
  onRetry,
  showProgress = false,
  compact = false
}) => {
  const { state, message, progress, retryCount } = context;

  if (state === 'idle') return null;

  const displayMessage = getContextMessage(contextType, state, message);
  const icon = getContextIcon(contextType, state);

  if (compact) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {(state === 'loading' || state === 'retrying') && (
          <CircularProgress size={16} />
        )}
        {icon}
        <Typography variant="body2" color="text.secondary">
          {displayMessage}
        </Typography>
        {retryCount && retryCount > 0 && (
          <Chip label={`Intento ${retryCount + 1}`} size="small" />
        )}
      </Box>
    );
  }

  return (
    <Alert 
      severity={
        state === 'success' ? 'success' :
        state === 'error' ? 'error' :
        'info'
      }
      sx={{ mb: 2 }}
      action={
        state === 'error' && onRetry ? (
          <Button
            color="inherit"
            size="small"
            onClick={onRetry}
            startIcon={<RetryIcon />}
          >
            Reintentar
          </Button>
        ) : undefined
      }
    >
      <Box sx={{ display: 'flex', alignItems: 'center', mb: showProgress ? 1 : 0 }}>
        {(state === 'loading' || state === 'retrying') && (
          <CircularProgress size={20} sx={{ mr: 1 }} />
        )}
        <Typography variant="body2">
          {displayMessage}
        </Typography>
        {retryCount && retryCount > 0 && (
          <Chip 
            label={`Intento ${retryCount + 1}`} 
            size="small" 
            sx={{ ml: 1 }}
            color={state === 'error' ? 'error' : 'default'}
          />
        )}
      </Box>
      
      {showProgress && typeof progress === 'number' && (
        <Box sx={{ mt: 1 }}>
          <LinearProgress 
            variant="determinate" 
            value={progress} 
            sx={{ mb: 0.5 }}
          />
          <Typography variant="caption" color="text.secondary">
            {Math.round(progress)}% completado
          </Typography>
        </Box>
      )}
    </Alert>
  );
};

// Skeletons específicos por contexto
export const PatientListSkeleton: React.FC = () => (
  <Box sx={{ p: 2 }}>
    <Skeleton variant="text" width="30%" height={40} sx={{ mb: 2 }} />
    <List>
      {[...Array(5)].map((_, index) => (
        <ListItem key={index} divider>
          <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', gap: 2 }}>
            <Skeleton variant="circular" width={40} height={40} />
            <Box sx={{ flexGrow: 1 }}>
              <Skeleton variant="text" width="60%" height={24} />
              <Skeleton variant="text" width="40%" height={20} />
            </Box>
            <Skeleton variant="rectangular" width={60} height={32} />
          </Box>
        </ListItem>
      ))}
    </List>
  </Box>
);

export const ConsultationFormSkeleton: React.FC = () => (
  <Box sx={{ p: 3 }}>
    {/* Header */}
    <Skeleton variant="text" width="40%" height={32} sx={{ mb: 3 }} />
    
    {/* Form sections */}
    {[...Array(3)].map((_, sectionIndex) => (
      <Card key={sectionIndex} sx={{ mb: 3 }}>
        <CardContent>
          <Skeleton variant="text" width="25%" height={24} sx={{ mb: 2 }} />
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 2 }}>
            {[...Array(4)].map((_, fieldIndex) => (
              <Box key={fieldIndex}>
                <Skeleton variant="text" width="30%" height={20} sx={{ mb: 1 }} />
                <Skeleton variant="rectangular" width="100%" height={56} />
              </Box>
            ))}
          </Box>
        </CardContent>
      </Card>
    ))}
    
    {/* Actions */}
    <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
      <Skeleton variant="rectangular" width={100} height={40} />
      <Skeleton variant="rectangular" width={120} height={40} />
    </Box>
  </Box>
);

export const ProfileSkeleton: React.FC = () => (
  <Box sx={{ p: 3 }}>
    {/* Profile header */}
    <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
      <Skeleton variant="circular" width={80} height={80} sx={{ mr: 3 }} />
      <Box>
        <Skeleton variant="text" width={200} height={32} />
        <Skeleton variant="text" width={150} height={24} />
        <Skeleton variant="text" width={100} height={20} />
      </Box>
    </Box>
    
    {/* Profile sections */}
    {[...Array(4)].map((_, index) => (
      <Card key={index} sx={{ mb: 2 }}>
        <CardContent>
          <Skeleton variant="text" width="30%" height={24} sx={{ mb: 2 }} />
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 2 }}>
            {[...Array(3)].map((_, fieldIndex) => (
              <Box key={fieldIndex}>
                <Skeleton variant="text" width="50%" height={20} />
                <Skeleton variant="text" width="80%" height={24} />
              </Box>
            ))}
          </Box>
        </CardContent>
      </Card>
    ))}
  </Box>
);

export const CalendarSkeleton: React.FC = () => (
  <Box sx={{ p: 2 }}>
    {/* Calendar header */}
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
      <Skeleton variant="text" width={200} height={32} />
      <Box sx={{ display: 'flex', gap: 1 }}>
        <Skeleton variant="rectangular" width={80} height={32} />
        <Skeleton variant="rectangular" width={80} height={32} />
      </Box>
    </Box>
    
    {/* Calendar grid */}
    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1, mb: 2 }}>
      {[...Array(7)].map((_, index) => (
        <Skeleton key={index} variant="text" width="100%" height={24} />
      ))}
    </Box>
    
    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1 }}>
      {[...Array(35)].map((_, index) => (
        <Skeleton key={index} variant="rectangular" width="100%" height={80} />
      ))}
    </Box>
  </Box>
);

export default LoadingStateDisplay;

