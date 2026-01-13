import React, { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  Button,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Grid,
  Alert,
  Typography
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { es } from 'date-fns/locale';
import { ApiService } from '../../services/ApiService';
import { LicenseService } from '../../services/licenses/LicenseService';
import { License, LicenseCreate, LicenseUpdate, LicenseType, LicenseStatus } from '../../types/license';

const apiService = new ApiService();
const licenseService = new LicenseService();

interface LicenseFormProps {
  license?: License | null;
  onSuccess: () => void;
  onCancel: () => void;
}

export const LicenseForm: React.FC<LicenseFormProps> = ({
  license,
  onSuccess,
  onCancel
}) => {
  const [formData, setFormData] = useState<Partial<LicenseCreate>>({
    doctor_id: license?.doctor_id || 0,
    license_type: license?.license_type || 'trial',
    start_date: license?.start_date || '',
    expiration_date: license?.expiration_date || '',
    payment_date: license?.payment_date || null,
    status: license?.status || 'active',
    is_active: license?.is_active ?? true,
    notes: license?.notes || null
  });
  const [doctors, setDoctors] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingDoctors, setLoadingDoctors] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDoctors();
  }, []);

  const loadDoctors = async () => {
    setLoadingDoctors(true);
    try {
      // Use admin endpoint to get all doctors
      const response = await licenseService.api.get('/api/admin/doctors');
      const doctorsList = Array.isArray(response.data) ? response.data : [];
      setDoctors(doctorsList);
      console.log('Doctors loaded:', doctorsList.length);
      if (doctorsList.length === 0) {
        console.warn('No doctors found in the system');
      }
    } catch (err: any) {
      console.error('Error loading doctors:', err);
      setError(`Error al cargar doctores: ${err.message || 'Error desconocido'}`);
      setDoctors([]);
    } finally {
      setLoadingDoctors(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (license) {
        // Update existing license
        const updateData: LicenseUpdate = {
          license_type: formData.license_type,
          start_date: formData.start_date,
          expiration_date: formData.expiration_date,
          payment_date: formData.payment_date,
          status: formData.status,
          is_active: formData.is_active,
          notes: formData.notes || null
        };
        await apiService.licenses.updateLicense(license.id, updateData);
      } else {
        // Create new license
        const createData: LicenseCreate = {
          doctor_id: formData.doctor_id!,
          license_type: formData.license_type!,
          start_date: formData.start_date!,
          expiration_date: formData.expiration_date!,
          payment_date: formData.payment_date,
          status: formData.status,
          is_active: formData.is_active,
          notes: formData.notes || null
        };
        await apiService.licenses.createLicense(createData);
      }
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Error al guardar licencia');
    } finally {
      setLoading(false);
    }
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={es}>
      <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%', pt: 0, mt: 0 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Grid container spacing={2}>
          {/* Primera línea: Doctor, Tipo, Estado, Fecha Inicio, Fecha Expiración */}
          {!license && (
            <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
              <FormControl fullWidth>
                <InputLabel>Doctor *</InputLabel>
                <Select
                  value={formData.doctor_id || ''}
                  label="Doctor *"
                  onChange={(e) => setFormData({ ...formData, doctor_id: Number(e.target.value) })}
                  required
                  renderValue={(selected) => {
                    const doctor = doctors.find(d => d.id === selected);
                    if (!doctor) return '';
                    const name = doctor.name || doctor.full_name || `ID: ${doctor.id}`;
                    return doctor.email ? `${name} - ${doctor.email}` : name;
                  }}
                  MenuProps={{
                    PaperProps: {
                      style: {
                        maxHeight: 400,
                        minWidth: 350,
                      },
                    },
                  }}
                >
                  {loadingDoctors ? (
                    <MenuItem disabled>Cargando doctores...</MenuItem>
                  ) : doctors.length === 0 ? (
                    <MenuItem disabled>No hay doctores disponibles</MenuItem>
                  ) : (
                    doctors.map((doctor) => {
                      const name = doctor.name || doctor.full_name || `Doctor ID: ${doctor.id}`;
                      return (
                        <MenuItem key={doctor.id} value={doctor.id}>
                          <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                            <Typography variant="body1" sx={{ fontWeight: 500, lineHeight: 1.2 }}>
                              {name}
                            </Typography>
                            {doctor.email && (
                              <Typography
                                variant="body2"
                                sx={{
                                  color: 'text.secondary',
                                  fontSize: '0.875rem',
                                  lineHeight: 1.2,
                                  mt: 0.5
                                }}
                              >
                                {doctor.email}
                              </Typography>
                            )}
                          </Box>
                        </MenuItem>
                      );
                    })
                  )}
                </Select>
              </FormControl>
            </Grid>
          )}

          <Grid size={{ xs: 12, sm: 6, md: license ? 3 : 2.4 }}>
            <FormControl fullWidth>
              <InputLabel>Tipo de Licencia</InputLabel>
              <Select
                value={formData.license_type || 'trial'}
                label="Tipo de Licencia"
                onChange={(e) => setFormData({ ...formData, license_type: e.target.value as LicenseType })}
                required
              >
                <MenuItem value="trial">Trial</MenuItem>
                <MenuItem value="basic">Básica</MenuItem>
                <MenuItem value="premium">Premium</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: license ? 3 : 2.4 }}>
            <FormControl fullWidth>
              <InputLabel>Estado</InputLabel>
              <Select
                value={formData.status || 'active'}
                label="Estado"
                onChange={(e) => setFormData({ ...formData, status: e.target.value as LicenseStatus })}
                required
              >
                <MenuItem value="active">Activa</MenuItem>
                <MenuItem value="inactive">Inactiva</MenuItem>
                <MenuItem value="expired">Expirada</MenuItem>
                <MenuItem value="suspended">Suspendida</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: license ? 3 : 2.4 }}>
            <DatePicker
              label="Fecha de Inicio *"
              value={formData.start_date ? new Date(formData.start_date) : null}
              onChange={(date) => setFormData({ ...formData, start_date: date?.toISOString().split('T')[0] || '' })}
              slotProps={{
                textField: {
                  fullWidth: true,
                  required: true
                }
              }}
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: license ? 3 : 2.4 }}>
            <DatePicker
              label="Fecha de Expiración *"
              value={formData.expiration_date ? new Date(formData.expiration_date) : null}
              onChange={(date) => setFormData({ ...formData, expiration_date: date?.toISOString().split('T')[0] || '' })}
              slotProps={{
                textField: {
                  fullWidth: true,
                  required: true
                }
              }}
            />
          </Grid>

          {/* Segunda línea: Fecha de Pago (izquierda) y Notas (derecha) */}
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <DatePicker
              label="Fecha de Pago"
              value={formData.payment_date ? new Date(formData.payment_date) : null}
              onChange={(date) => setFormData({ ...formData, payment_date: date?.toISOString().split('T')[0] || null })}
              slotProps={{
                textField: {
                  fullWidth: true
                }
              }}
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 9 }}>
            <TextField
              fullWidth
              label="Notas"
              multiline
              rows={3}
              value={formData.notes || ''}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value || null })}
            />
          </Grid>
        </Grid>

        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 3 }}>
          <Button onClick={onCancel} disabled={loading}>
            Cancelar
          </Button>
          <Button type="submit" variant="contained" disabled={loading}>
            {loading ? 'Guardando...' : license ? 'Actualizar' : 'Crear'}
          </Button>
        </Box>
      </Box>
    </LocalizationProvider>
  );
};

