import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  Alert,
  CircularProgress,
  IconButton
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import { useOfficeManagement, OfficeFormData } from '../../hooks/useOfficeManagement';
import { useLocationCatalogs } from '../../hooks/useLocationCatalogs';

interface OfficeManagementDialogProps {
  open: boolean;
  onClose: () => void;
  office?: any; // For editing existing office
  isEditing?: boolean;
}

const OfficeManagementDialog: React.FC<OfficeManagementDialogProps> = ({
  open,
  onClose,
  office,
  isEditing = false
}) => {
  const { createOffice, updateOffice, isLoading } = useOfficeManagement();
  const { countries, states, isLoading: catalogsLoading, fetchStates } = useLocationCatalogs();
  const [formData, setFormData] = useState<OfficeFormData>({
    name: '',
    address: '',
    city: '',
    state_id: null,
    country_id: null,
    phone: '',
    maps_url: '',
    timezone: 'America/Mexico_City'
  });
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    console.log('🏢 OfficeManagementDialog useEffect:', { open, isEditing, office });
    if (open) {
      setError(null);
      if (isEditing && office) {
        console.log('🏢 Setting form data for editing office:', office);
        setFormData({
          name: office.name || '',
          address: office.address || '',
          city: office.city || '',
          state_id: office.state_id || null,
          country_id: office.country_id || null,
          phone: office.phone || '',
          maps_url: office.maps_url || '',
          timezone: office.timezone || 'America/Mexico_City'
        });
      } else {
        console.log('🏢 Setting form data for new office');
        setFormData({
          name: '',
          address: '',
          city: '',
          state_id: null,
          country_id: null,
          phone: '',
          maps_url: '',
          timezone: 'America/Mexico_City'
        });
      }
    }
  }, [open, isEditing, office]);

  const handleInputChange = (field: keyof OfficeFormData) => (event: any) => {
    const value = event.target.value;
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // If country changes, load states for that country
    if (field === 'country_id') {
      fetchStates(value);
      // Reset state when country changes
      setFormData(prev => ({
        ...prev,
        state_id: null
      }));
    }
  };

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      setError(null);

      if (isEditing && office) {
        await updateOffice(office.id, formData);
      } else {
        await createOffice(formData);
      }

      onClose();
    } catch (err: any) {
      console.error('Error saving office:', err);
      setError(err.message || 'Error al guardar el consultorio');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormValid = formData.name.trim() !== '';

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { borderRadius: 2 }
      }}
    >
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6">
          {isEditing ? 'Editar Consultorio' : 'Nuevo Consultorio'}
        </Typography>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {catalogsLoading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
            <CircularProgress size={24} />
            <Typography variant="body2" sx={{ ml: 1 }}>
              Cargando catálogos...
            </Typography>
          </Box>
        )}

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <TextField
            fullWidth
            label="Nombre del Consultorio"
            value={formData.name}
            onChange={handleInputChange('name')}
            required
            placeholder="Consultorio Médico Dr. García"
          />

          <TextField
            fullWidth
            label="Dirección"
            value={formData.address}
            onChange={handleInputChange('address')}
            placeholder="Calle Principal 123, Col. Centro"
          />

          <TextField
            fullWidth
            label="Ciudad"
            value={formData.city}
            onChange={handleInputChange('city')}
            placeholder="Ciudad de México"
          />

          <Box sx={{ display: 'flex', gap: 2 }}>
            <FormControl fullWidth>
              <InputLabel>País</InputLabel>
              <Select
                value={formData.country_id || ''}
                onChange={handleInputChange('country_id')}
                label="País"
                disabled={catalogsLoading}
              >
                {countries.map((country) => (
                  <MenuItem key={country.id} value={country.id}>
                    {country.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>Estado</InputLabel>
              <Select
                value={formData.state_id || ''}
                onChange={handleInputChange('state_id')}
                label="Estado"
                disabled={catalogsLoading || !formData.country_id}
              >
                {states.map((state) => (
                  <MenuItem key={state.id} value={state.id}>
                    {state.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          <TextField
            fullWidth
            label="Teléfono"
            value={formData.phone}
            onChange={handleInputChange('phone')}
            placeholder="+52 55 1234 5678"
          />

          <TextField
            fullWidth
            label="URL de Google Maps"
            value={formData.maps_url}
            onChange={handleInputChange('maps_url')}
            placeholder="https://maps.google.com/..."
            helperText="Enlace de Google Maps para ubicar el consultorio"
          />

          <FormControl fullWidth>
            <InputLabel>Zona Horaria</InputLabel>
            <Select
              value={formData.timezone}
              onChange={handleInputChange('timezone')}
              label="Zona Horaria"
            >
              <MenuItem value="America/Mexico_City">America/Mexico_City</MenuItem>
              <MenuItem value="America/New_York">America/New_York</MenuItem>
              <MenuItem value="America/Los_Angeles">America/Los_Angeles</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 3, pt: 1 }}>
        <Button onClick={onClose} disabled={isSubmitting}>
          Cancelar
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={!isFormValid || isSubmitting}
          startIcon={isSubmitting ? <CircularProgress size={16} /> : null}
        >
          {isSubmitting ? 'Guardando...' : isEditing ? 'Actualizar' : 'Crear'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default OfficeManagementDialog;
