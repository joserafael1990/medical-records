import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  Alert,
  CircularProgress,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { Office, OfficeCreate, OfficeUpdate } from '../../types';
import { apiService } from '../../services';
import { getSmallSelectMenuProps, getMediumSelectMenuProps, getLargeSelectMenuProps } from '../../utils/selectMenuProps';
import { useSimpleToast } from '../common/ToastNotification';
import { preventBackdropClose } from '../../utils/dialogHelpers';

interface OfficeDialogProps {
  open: boolean;
  onClose: () => void;
  // The dialog emits a payload ready for the API: either a full
  // `Office` (on edit, includes id) or an `OfficeCreate`. We don't
  // require the server-side fields (doctor_id, created_at, etc.)
  // because the backend fills them.
  onSave: (
    office: OfficeCreate | (OfficeUpdate & { id: number })
  ) => void;
  office?: Office | null;
  isEditing?: boolean;
}

const OfficeDialog: React.FC<OfficeDialogProps> = ({
  open,
  onClose,
  onSave,
  office,
  isEditing = false
}) => {
  const [formData, setFormData] = useState<OfficeCreate>({
    name: '',
    address: '',
    city: '',
    state_id: null,
    country_id: null,
    postal_code: '',
    phone: '',
    timezone: 'America/Mexico_City',
    maps_url: '',
    is_virtual: false,
    virtual_url: ''
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  // Hook para notificaciones de éxito
  const toast = useSimpleToast();
  const [states, setStates] = useState<any[]>([]);
  const [countries, setCountries] = useState<any[]>([]);

  useEffect(() => {
    if (open) {
      setError(null);
      loadCatalogs();
    }
  }, [open]);

  useEffect(() => {
    if (open && countries.length > 0) {
      if (isEditing && office) {
        setFormData({
          name: office.name,
          address: office.address || '',
          city: office.city || '',
          state_id: office.state_id || null,
          country_id: office.country_id || null,
          postal_code: office.postal_code || '',
          phone: office.phone || '',
          timezone: office.timezone || 'America/Mexico_City',
          maps_url: office.maps_url || '',
          is_virtual: office.is_virtual || false,
          virtual_url: office.virtual_url || ''
        });
      } else {
        setFormData({
          name: '',
          address: '',
          city: '',
          state_id: null,
          country_id: null,
          postal_code: '',
          phone: '',
          timezone: 'America/Mexico_City',
          maps_url: '',
          is_virtual: false,
          virtual_url: ''
        });
      }
    }
  }, [open, isEditing, office, countries]);

  const loadCatalogs = async () => {
    try {
      const [statesData, countriesData] = await Promise.all([
        apiService.catalogs.getStates(),
        apiService.catalogs.getCountries()
      ]);
      setStates(statesData);
      setCountries(countriesData);
    } catch (err) {
      console.error('Error loading catalogs:', err);
    }
  };

  const handleChange = (field: keyof OfficeCreate) => (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | any
  ) => {
    let value = event.target.value;
    
    // Convertir valores numéricos para state_id y country_id
    if (field === 'state_id' || field === 'country_id') {
      value = value === '' ? null : parseInt(value, 10);
    }
    
    // Si cambia el país, resetear el estado
    if (field === 'country_id') {
      setFormData(prev => ({
        ...prev,
        [field]: value,
        state_id: null // Resetear estado cuando cambia país
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);

    // Validar campos requeridos
    if (!formData.name.trim()) {
      setError('El nombre del consultorio es obligatorio');
      setLoading(false);
      return;
    }

    try {
      if (isEditing && office && office.id) {
        const updateData: OfficeUpdate = {
          name: formData.name,
          address: formData.address,
          city: formData.city,
          state_id: formData.state_id,
          country_id: formData.country_id,
          postal_code: formData.postal_code,
          phone: formData.phone,
          timezone: formData.timezone,
          maps_url: formData.maps_url,
          is_virtual: formData.is_virtual,
          virtual_url: formData.virtual_url
        };
        onSave({ ...updateData, id: office.id });
        toast.success('Consultorio actualizado exitosamente');
      } else {
        // Limpiar datos antes de enviar - convertir null/undefined a valores válidos
        const cleanData = {
          name: formData.name.trim(),
          address: formData.address || null,
          city: formData.city || null,
          state_id: formData.state_id || null,
          country_id: formData.country_id || null,
          postal_code: formData.postal_code || null,
          phone: formData.phone || null,
          timezone: formData.timezone,
          maps_url: formData.maps_url || null,
          is_virtual: formData.is_virtual,
          virtual_url: formData.virtual_url || null
        };
        
        onSave(cleanData);
        toast.success('Consultorio creado exitosamente');
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar consultorio');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={preventBackdropClose(onClose)} 
      maxWidth="sm" 
      fullWidth
      fullScreen={isMobile}
      sx={{
        '& .MuiDialog-paper': {
          margin: { xs: 0, sm: 2 },
          maxHeight: { xs: '100vh', sm: '90vh' },
          height: { xs: '100vh', sm: 'auto' },
          borderRadius: { xs: 0, sm: 2 }
        }
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        {isEditing ? 'Editar Consultorio' : 'Nuevo Consultorio'}
      </DialogTitle>
      
      <DialogContent 
        sx={{ 
          px: { xs: 2, sm: 3 },
          py: { xs: 2, sm: 3 },
          overflow: 'auto',
          flex: 1,
          minHeight: { xs: '60vh', sm: 'auto' },
          '&::-webkit-scrollbar': {
            width: '6px',
          },
          '&::-webkit-scrollbar-track': {
            background: '#f1f1f1',
            borderRadius: '3px',
          },
          '&::-webkit-scrollbar-thumb': {
            background: '#c1c1c1',
            borderRadius: '3px',
          },
          '&::-webkit-scrollbar-thumb:hover': {
            background: '#a8a8a8',
          },
        }}
      >
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          {/* Línea 1: Nombre del Consultorio */}
          <TextField
            fullWidth
            label="Nombre del Consultorio"
            value={formData.name}
            onChange={handleChange('name')}
            required
            size="small"
            variant="outlined"
          />

          {/* Línea 2: Tipo de Consultorio */}
          <FormControl fullWidth size="small" variant="outlined">
            <InputLabel>Tipo de Consultorio</InputLabel>
            <Select
              value={formData.is_virtual ? 'virtual' : 'physical'}
              onChange={(e) => {
                const isVirtual = e.target.value === 'virtual';
                setFormData(prev => ({
                  ...prev,
                  is_virtual: isVirtual,
                  virtual_url: isVirtual ? prev.virtual_url : ''
                }));
              }}
              label="Tipo de Consultorio"
              MenuProps={getLargeSelectMenuProps()}
            >
              <MenuItem value="physical">Presencial</MenuItem>
              <MenuItem value="virtual">Virtual (En línea)</MenuItem>
            </Select>
          </FormControl>

          {/* Campos para Consultorio Virtual */}
          {formData.is_virtual && (
            <>
              {/* URL Virtual */}
              <TextField
                fullWidth
                label="URL del Consultorio Virtual"
                value={formData.virtual_url}
                onChange={handleChange('virtual_url')}
                placeholder="https://zoom.us/j/123456789 o https://teams.microsoft.com/..."
                helperText="URL de Zoom, Teams, Google Meet, etc."
                required
                size="small"
                variant="outlined"
              />

              {/* Teléfono y Zona Horaria */}
              <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
                <TextField
                  fullWidth
                  label="Teléfono"
                  value={formData.phone}
                  onChange={handleChange('phone')}
                  size="small"
                  variant="outlined"
                />

                <FormControl fullWidth size="small" variant="outlined">
                  <InputLabel>Zona Horaria</InputLabel>
                  <Select
                    value={formData.timezone}
                    onChange={handleChange('timezone')}
                    label="Zona Horaria"
                    MenuProps={getLargeSelectMenuProps()}
                  >
                    <MenuItem value="America/Mexico_City">America/Mexico_City</MenuItem>
                    <MenuItem value="America/New_York">America/New_York</MenuItem>
                    <MenuItem value="America/Los_Angeles">America/Los_Angeles</MenuItem>
                    <MenuItem value="Europe/Madrid">Europe/Madrid</MenuItem>
                  </Select>
                </FormControl>
              </Box>
            </>
          )}

          {/* Campos para Consultorio Presencial */}
          {!formData.is_virtual && (
            <>
              {/* Teléfono y Zona Horaria */}
              <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
                <TextField
                  fullWidth
                  label="Teléfono"
                  value={formData.phone}
                  onChange={handleChange('phone')}
                  size="small"
                  variant="outlined"
                />

                <FormControl fullWidth size="small" variant="outlined">
                  <InputLabel>Zona Horaria</InputLabel>
                  <Select
                    value={formData.timezone}
                    onChange={handleChange('timezone')}
                    label="Zona Horaria"
                    MenuProps={getLargeSelectMenuProps()}
                  >
                    <MenuItem value="America/Mexico_City">America/Mexico_City</MenuItem>
                    <MenuItem value="America/New_York">America/New_York</MenuItem>
                    <MenuItem value="America/Los_Angeles">America/Los_Angeles</MenuItem>
                    <MenuItem value="Europe/Madrid">Europe/Madrid</MenuItem>
                  </Select>
                </FormControl>
              </Box>

              {/* Dirección */}
              <TextField
                fullWidth
                label="Dirección"
                value={formData.address}
                onChange={handleChange('address')}
                multiline
                rows={2}
                size="small"
                variant="outlined"
              />

              {/* País y Estado */}
              <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
                <FormControl fullWidth size="small" variant="outlined">
                  <InputLabel>País</InputLabel>
                  <Select
                    value={formData.country_id || ''}
                    onChange={handleChange('country_id')}
                    label="País"
                    MenuProps={getLargeSelectMenuProps()}
                  >
                    <MenuItem value="" disabled>
                      Seleccionar país
                    </MenuItem>
                    {countries.map((country) => (
                      <MenuItem key={country.id} value={country.id}>
                        {country.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl fullWidth size="small" variant="outlined">
                  <InputLabel>Estado</InputLabel>
                  <Select
                    value={formData.state_id || ''}
                    onChange={handleChange('state_id')}
                    label="Estado"
                    disabled={!formData.country_id}
                    MenuProps={getLargeSelectMenuProps()}
                  >
                    {!formData.country_id ? (
                      <MenuItem disabled>
                        Seleccione un país primero
                      </MenuItem>
                    ) : states
                      .filter(state => state.country_id === formData.country_id)
                      .length === 0 ? (
                      <MenuItem disabled>
                        No hay estados disponibles
                      </MenuItem>
                    ) : (
                      states
                        .filter(state => state.country_id === formData.country_id)
                        .map((state) => (
                          <MenuItem key={state.id} value={state.id}>
                            {state.name}
                          </MenuItem>
                        ))
                    )}
                  </Select>
                </FormControl>
              </Box>

              {/* Ciudad y Código Postal */}
              <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
                <TextField
                  fullWidth
                  label="Ciudad"
                  value={formData.city}
                  onChange={handleChange('city')}
                  size="small"
                  variant="outlined"
                />

                <TextField
                  fullWidth
                  label="Código Postal"
                  value={formData.postal_code}
                  onChange={handleChange('postal_code')}
                  size="small"
                  variant="outlined"
                />
              </Box>

              {/* URL de Google Maps */}
              <TextField
                fullWidth
                label="URL de Google Maps (opcional)"
                value={formData.maps_url}
                onChange={handleChange('maps_url')}
                placeholder="https://maps.google.com/..."
                size="small"
                variant="outlined"
              />
            </>
          )}
        </Box>
      </DialogContent>

      <DialogActions 
        sx={{ 
          px: { xs: 2, sm: 3 },
          py: { xs: 2, sm: 1 },
          flexDirection: { xs: 'column', sm: 'row' },
          gap: { xs: 1, sm: 0 }
        }}
      >
        <Button 
          onClick={onClose} 
          disabled={loading}
          fullWidth={isMobile}
          size="large"
        >
          Cancelar
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={loading || !formData.name}
          fullWidth={isMobile}
          size="large"
        >
          {loading ? (
            <CircularProgress size={20} />
          ) : (
            isEditing ? 'Actualizar' : 'Crear'
          )}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default OfficeDialog;
