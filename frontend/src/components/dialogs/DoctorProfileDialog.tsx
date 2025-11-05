
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Typography,
  IconButton,
  Divider,
  CircularProgress,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Autocomplete
} from '@mui/material';
import {
  Close as CloseIcon,
  Person as PersonIcon,
  Edit as EditIcon
} from '@mui/icons-material';
import { apiService } from '../../services/api';
import { CountryCodeSelector } from '../common/CountryCodeSelector';
import { PhoneNumberInput } from '../common/PhoneNumberInput';
import { DocumentSelector } from '../common/DocumentSelector';
import { extractCountryCode } from '../../utils/countryCodes';

interface DoctorFormData {
  title: string;
  first_name: string;
  paternal_surname: string;
  maternal_surname: string;
  email: string;
  phone: string; // Mantener para compatibilidad, se parseará a country_code + number
  birth_date: string;
  gender: string;
  // Documentos normalizados - se manejan en estado separado
  university: string;
  graduation_year: string;
  specialty: string;
  office_address: string;
  office_city: string;
  office_state_id: string;
  office_country: string;
  office_postal_code: string;
  office_timezone: string;
  appointment_duration: string;
}

interface DoctorProfileDialogProps {
  open: boolean;
  onClose: () => void;
  isEditing: boolean;
  formData: DoctorFormData;
  setFormData: (data: DoctorFormData | ((prev: DoctorFormData) => DoctorFormData)) => void;
  onSubmit: (documents?: { professional_documents?: any[], personal_documents?: any[] }) => void;
  formErrorMessage: string;
  setFormErrorMessage: (message: string) => void;
  isSubmitting: boolean;
  fieldErrors?: { [key: string]: string };
}

const DoctorProfileDialog: React.FC<DoctorProfileDialogProps> = ({
  open,
  onClose,
  isEditing,
  formData,
  setFormData,
  onSubmit,
  formErrorMessage,
  setFormErrorMessage,
  isSubmitting,
  fieldErrors = {}
}) => {
  const [countries, setCountries] = useState<{ id: number; name: string }[]>([]);
  const [states, setStates] = useState<{ id: number; name: string }[]>([]);
  const [timezones, setTimezones] = useState<{ value: string; label: string }[]>([]);
  const [specialties, setSpecialties] = useState<Array<{ id: number; name: string }>>([]);
  
  // Estados para teléfono con código de país
  const [phoneCountryCode, setPhoneCountryCode] = useState<string>('+52');
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  
  // Estados para documentos
  const [professionalDocuments, setProfessionalDocuments] = useState<Array<{
    document_id: number | null;
    document_value: string;
  }>>([{ document_id: null, document_value: '' }]);
  
  const [personalDocuments, setPersonalDocuments] = useState<Array<{
    document_id: number | null;
    document_value: string;
  }>>([{ document_id: null, document_value: '' }]);

  useEffect(() => {
    const loadCountries = async () => {
      try {
        const countriesData = await apiService.getCountries();
        setCountries(countriesData);
      } catch (error) {
        console.error('Error loading countries:', error);
      }
    };

    const loadTimezones = async () => {
      try {
        const timezonesData = await apiService.getTimezones();
        setTimezones(timezonesData);
      } catch (error) {
        console.error('Error loading timezones:', error);
      }
    };

    const loadSpecialties = async () => {
      try {
        const specialtiesData = await apiService.getSpecialties();
        setSpecialties(specialtiesData);
      } catch (error) {
        console.error('Error loading specialties:', error);
      }
    };

    if (open) {
      loadCountries();
      loadTimezones();
      loadSpecialties();
      
      // Si está en modo edición, cargar documentos existentes
      if (isEditing) {
        loadExistingDocuments();
        // Parsear teléfono existente
        if (formData.phone) {
          const phoneData = extractCountryCode(formData.phone);
          setPhoneCountryCode(phoneData.countryCode);
          setPhoneNumber(phoneData.number);
        }
      } else {
        // Resetear estados para modo creación
        setPhoneCountryCode('+52');
        setPhoneNumber('');
        setProfessionalDocuments([{ document_id: null, document_value: '' }]);
        setPersonalDocuments([{ document_id: null, document_value: '' }]);
      }
    }
  }, [open, isEditing, formData.phone]);
  
  const loadExistingDocuments = async () => {
    try {
      // Obtener perfil completo para acceder a documentos
      const profile = await apiService.getDoctorProfile();
      
      // Cargar documentos profesionales
      if (profile.professional_documents && profile.professional_documents.length > 0) {
        setProfessionalDocuments(
          profile.professional_documents.map((doc: any) => ({
            document_id: doc.document_id || null,
            document_value: doc.document_value || ''
          }))
        );
      } else {
        setProfessionalDocuments([{ document_id: null, document_value: '' }]);
      }
      
      // Cargar documentos personales
      if (profile.personal_documents) {
        const personalDocsArray = Object.entries(profile.personal_documents).map(([name, value]: [string, any]) => {
          // Necesitamos encontrar el document_id por nombre
          return { name, value: value as string };
        });
        
        // Cargar los tipos de documentos para mapear nombres a IDs
        const docTypes = await apiService.getDocumentTypes();
        const personalType = docTypes.find((t: any) => t.name === 'Personal');
        if (personalType) {
          const allPersonalDocs = await apiService.getDocumentsByType(personalType.id);
          const docsWithIds = personalDocsArray.map(({ name, value }) => {
            const doc = allPersonalDocs.find((d: any) => d.name === name);
            return {
              document_id: doc ? doc.id : null,
              document_value: value
            };
          });
          setPersonalDocuments(docsWithIds.length > 0 ? docsWithIds : [{ document_id: null, document_value: '' }]);
        }
      } else {
        setPersonalDocuments([{ document_id: null, document_value: '' }]);
      }
    } catch (error) {
      console.error('Error loading existing documents:', error);
    }
  };

  // Cargar estados cuando cambie el país seleccionado
  useEffect(() => {
    const loadStates = async () => {
      if (!formData.office_country || !countries.length) {
        setStates([]);
        return;
      }

      try {
        // Buscar el ID del país seleccionado
        const selectedCountry = countries.find(c => c.name === formData.office_country);
        if (selectedCountry) {
          const statesData = await apiService.getStates(selectedCountry.id);
          setStates(statesData);
        } else {
          setStates([]);
        }
      } catch (error) {
        console.error('Error loading states:', error);
        setStates([]);
      }
    };

    loadStates();
  }, [formData.office_country, countries]);
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | any) => {
    const { name, value } = e.target;
    console.log('🔄 handleChange called:', { name, value });
    
    // Si cambia el país, limpiar el estado seleccionado
    if (name === 'office_country') {
      setFormData(prev => ({ 
        ...prev, 
        [name]: value,
        office_state_id: '' // Limpiar estado cuando cambia el país
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
    
    if (fieldErrors[name]) {
      setFormErrorMessage('');
    }
  };

  const handleClose = () => {
    onClose();
  };

  const handleSubmit = () => {
    // Construir teléfono completo antes de enviar
    const fullPhone = phoneCountryCode + phoneNumber;
    
    // Debug: Ver estado actual de los documentos ANTES de filtrar
    console.log('📋 DoctorProfileDialog.handleSubmit - RAW documents state:', {
      allProfessional: professionalDocuments,
      allPersonal: personalDocuments,
      professionalCount: professionalDocuments.length,
      personalCount: personalDocuments.length
    });
    
    // Enviar todos los documentos que tengan document_id (incluso si el valor cambió o solo cambió el tipo)
    // Filtrar solo los que NO tienen document_id (documentos vacíos)
    const validProfessionalDocs = professionalDocuments.filter(d => {
      const hasId = !!d.document_id;
      console.log('🔍 Filtering professional doc:', { doc: d, hasId, document_id: d.document_id });
      return hasId;
    });
    const validPersonalDocs = personalDocuments.filter(d => {
      const hasId = !!d.document_id;
      console.log('🔍 Filtering personal doc:', { doc: d, hasId, document_id: d.document_id });
      return hasId;
    });
    
    console.log('📋 DoctorProfileDialog.handleSubmit - FILTERED documents to send:', {
      professional: validProfessionalDocs,
      personal: validPersonalDocs,
      professionalCount: validProfessionalDocs.length,
      personalCount: validPersonalDocs.length
    });
    
    // Actualizar formData con teléfono
    setFormData(prev => ({
      ...prev,
      phone: fullPhone
    }));
    
    // Pasar documentos directamente a onSubmit para evitar problemas de asincronía con setFormData
    const docsToSend = {
      professional_documents: validProfessionalDocs.length > 0 ? validProfessionalDocs : undefined,
      personal_documents: validPersonalDocs.length > 0 ? validPersonalDocs : undefined
    };
    
    console.log('📤 Calling onSubmit with:', docsToSend);
    onSubmit(docsToSend);
  };
  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { 
          borderRadius: '16px', 
          minHeight: '60vh',
          zIndex: 9999
        }
      }}
      sx={{
        zIndex: 9999
      }}
    >
      <DialogTitle sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        pb: 2,
        pt: 3,
        px: 3
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <PersonIcon color="primary" />
          <Typography variant="h6">
            {isEditing ? 'Editar Perfil Profesional' : 'Crear Perfil Profesional'}
          </Typography>
        </Box>
        <IconButton onClick={handleClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <Divider />

      <DialogContent sx={{ px: 3, py: 2 }}>
        {formErrorMessage && (
          <Box sx={{ mb: 2, p: 2, bgcolor: 'error.main', borderRadius: 1 }}>
            <Typography color="white">{formErrorMessage}</Typography>
          </Box>
        )}

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {/* Información Personal */}
          <Typography variant="h6" sx={{ mt: 2, mb: 1, color: 'primary.main' }}>
            Información Personal
              </Typography>

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
              <TextField
              name="first_name"
              label="Nombre(s) *"
                value={formData.first_name || ''}
              onChange={handleChange}
              size="small"
                required
                error={!!fieldErrors.first_name}
              helperText={fieldErrors.first_name}
              />
              <TextField
              name="paternal_surname"
              label="Apellido Paterno *"
                value={formData.paternal_surname || ''}
              onChange={handleChange}
              size="small"
                required
                error={!!fieldErrors.paternal_surname}
                helperText={fieldErrors.paternal_surname}
              />
              <TextField
              name="maternal_surname"
                label="Apellido Materno"
                value={formData.maternal_surname || ''}
              onChange={handleChange}
              size="small"
            />
            <TextField
              name="email"
              label="Email *"
              type="email"
              value={formData.email || ''}
              onChange={handleChange}
              size="small"
              required
              error={!!fieldErrors.email}
              helperText={fieldErrors.email}
            />
            {/* Género y Fecha de Nacimiento en la misma fila */}
            <TextField
              name="gender"
              label="Género"
              value={formData.gender || ''}
              onChange={handleChange}
              size="small"
              required
              error={!!fieldErrors.gender}
              helperText={fieldErrors.gender}
              select
              SelectProps={{
                native: true,
                style: { zIndex: 9999 }
              }}
              InputLabelProps={{
                shrink: true
              }}
              sx={{
                '& .MuiSelect-select': {
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  paddingRight: '32px !important',
                  minHeight: 'auto !important'
                },
                '& .MuiInputLabel-root': {
                  '&.Mui-focused': {
                    color: 'primary.main'
                  },
                  transform: 'translate(14px, -9px) scale(0.75)',
                  '&.MuiInputLabel-shrink': {
                    transform: 'translate(14px, -9px) scale(0.75)'
                  }
                },
                '& .MuiOutlinedInput-root': {
                  '& fieldset': {
                    borderColor: 'rgba(0, 0, 0, 0.23)'
                  },
                  '&:hover fieldset': {
                    borderColor: 'rgba(0, 0, 0, 0.87)'
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: 'primary.main'
                  }
                }
              }}
            >
              <option value="">Seleccione</option>
              <option value="M">Masculino</option>
              <option value="F">Femenino</option>
              <option value="O">Otro</option>
            </TextField>
            <TextField
              name="birth_date"
                  label="Fecha de Nacimiento *"
              type="date"
              value={formData.birth_date || ''}
              onChange={handleChange}
              size="small"
              required
              error={!!fieldErrors.birth_date}
              helperText={fieldErrors.birth_date}
              InputLabelProps={{ shrink: true }}
            />
            {/* Código de país y teléfono unificado */}
              <Box sx={{ gridColumn: { xs: '1 / -1', sm: '1 / -1' }, mt: 2, mb: 1 }}>
                <PhoneNumberInput
                  countryCode={phoneCountryCode}
                  phoneNumber={phoneNumber}
                  onCountryCodeChange={(code) => setPhoneCountryCode(code)}
                  onPhoneNumberChange={(number) => {
                    // Solo permitir números
                    const value = number.replace(/\D/g, '');
                    setPhoneNumber(value);
                  }}
                  label="Número telefónico *"
                  required
                  placeholder="Ej: 222 123 4567"
                  fullWidth
                  error={!!fieldErrors.phone}
                  helperText={fieldErrors.phone}
                />
              </Box>
            </Box>
            
            {/* Documento Personal - Solo uno permitido */}
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                Documento Personal
              </Typography>
              <DocumentSelector
                documentType="personal"
                value={personalDocuments[0] || { document_id: null, document_value: '' }}
                onChange={(newValue) => {
                  setPersonalDocuments([newValue]);
                }}
                label="Documento Personal"
                required={!isEditing}
                error={!isEditing && !personalDocuments[0]?.document_id && !!fieldErrors.curp}
                helperText={!isEditing ? fieldErrors.curp : undefined}
              />
            </Box>

          {/* Información Profesional */}
          <Typography variant="h6" sx={{ mt: 3, mb: 1, color: 'primary.main' }}>
            Información Profesional
              </Typography>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
              <TextField
                name="title"
                label="Título"
                value={formData.title || ''}
                onChange={handleChange}
                size="small"
                required
                error={!!fieldErrors.title}
                helperText={fieldErrors.title}
                select
                SelectProps={{
                  native: true,
                  style: { zIndex: 9999 }
                }}
              >
                <option value="Dr.">Dr.</option>
                <option value="Dra.">Dra.</option>
                <option value="Lic.">Lic.</option>
                <option value="M.C.">M.C.</option>
                <option value="Esp.">Esp.</option>
              </TextField>
              {/* Documento Profesional - Solo uno permitido */}
              <Box sx={{ gridColumn: { xs: '1 / -1', sm: '1 / -1' } }}>
                <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                  Documento Profesional
                </Typography>
                <DocumentSelector
                  documentType="professional"
                  value={professionalDocuments[0] || { document_id: null, document_value: '' }}
                  onChange={(newValue) => {
                    setProfessionalDocuments([newValue]);
                  }}
                  label="Documento Profesional"
                  required={!isEditing}
                  error={!isEditing && !professionalDocuments[0]?.document_id && !!fieldErrors.professional_license}
                  helperText={!isEditing ? fieldErrors.professional_license : undefined}
                />
              </Box>
            <TextField
              name="university"
              label="Universidad *"
              value={formData.university || ''}
              onChange={handleChange}
              size="small"
              required
              error={!!fieldErrors.university}
              helperText={fieldErrors.university}
            />
            <TextField
              name="graduation_year"
              label="Año de Graduación *"
              type="number"
              value={formData.graduation_year || ''}
              onChange={handleChange}
              size="small"
              required
              error={!!fieldErrors.graduation_year}
              helperText={fieldErrors.graduation_year}
            />
            <Autocomplete
              value={specialties.find(s => s.name === formData.specialty) || null}
              onChange={(event, newValue: { id: number; name: string } | null) => {
                setFormData(prev => ({ ...prev, specialty: newValue?.name || '' }));
                if (fieldErrors.specialty) {
                  setFormErrorMessage('');
                }
              }}
              options={specialties}
              getOptionLabel={(option) => option.name}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Especialidad *"
                  required
                  size="small"
                  error={!!fieldErrors.specialty}
                  helperText={fieldErrors.specialty}
                />
              )}
              componentsProps={{
                popper: {
                  style: { zIndex: 13000 }
                }
              }}
              sx={{
                width: '100%',
                '& .MuiAutocomplete-popper': {
                  zIndex: 13000
                }
              }}
            />
            <TextField
              name="appointment_duration"
              label="Duración de Consulta (minutos) *"
              value={formData.appointment_duration || ''}
              onChange={handleChange}
              size="small"
              type="number"
              required
              error={!!fieldErrors.appointment_duration}
              helperText={fieldErrors.appointment_duration}
              inputProps={{
                min: 15,
                max: 120,
                step: 15
              }}
            />
          </Box>

        </Box>
      </DialogContent>

      <Divider />

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={handleClose} color="inherit" disabled={isSubmitting}>
          Cancelar
        </Button>
            <Button 
              variant="contained"
          onClick={handleSubmit}
                  disabled={isSubmitting}
          startIcon={isSubmitting ? <CircularProgress size={16} /> : <EditIcon />}
        >
          {isSubmitting ? 'Guardando...' : (isEditing ? 'Actualizar' : 'Crear')}
                </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DoctorProfileDialog;