import React, { memo, useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Typography,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Paper,
  Autocomplete,
  Alert,
  Collapse,
  IconButton,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  Chip,
  Avatar
} from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { es } from 'date-fns/locale';
import {
  Close as CloseIcon,
  Person as PersonIcon,
  School as SchoolIcon,
  Badge as BadgeIcon,
  Business as BusinessIcon,

  NavigateNext as NextIcon,
  NavigateBefore as BackIcon,
  Save as SaveIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import { DoctorFormData } from '../../types';
import { MEDICAL_SPECIALTIES, MEXICAN_STATE_NAMES } from '../../constants';
import { apiService } from '../../services/api';
import { useCatalogs } from '../../hooks/useCatalogs';

interface DoctorProfileDialogProps {
  open: boolean;
  onClose: () => void;
  isEditing: boolean;
  formData: DoctorFormData;
  setFormData: (data: DoctorFormData | ((prev: DoctorFormData) => DoctorFormData)) => void;
  onSubmit: () => void;
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
  const [activeStep, setActiveStep] = useState(0);
  const [visitedSteps, setVisitedSteps] = useState<Set<number>>(new Set([0]));

  const steps = [
    {
      label: 'Información Personal',
      icon: <PersonIcon />,
      description: 'Datos personales básicos'
    },
    {
      label: 'Información Profesional',
      icon: <SchoolIcon />,
      description: 'Formación académica, licencias y certificaciones'
    },
    {
      label: 'Dirección del Consultorio',
      icon: <BusinessIcon />,
      description: 'Ubicación y teléfono del consultorio médico'
    }
  ];

  // Estado para especialidades dinámicas desde la API
  const [specialties, setSpecialties] = useState<string[]>([...MEDICAL_SPECIALTIES]);
  const [loadingSpecialties, setLoadingSpecialties] = useState(false);
  const [states, setStates] = useState<Array<{id: number, name: string}>>([]);
  const [loadingStates, setLoadingStates] = useState(false);

  // Hook para catálogos (países, estados)
  const { 
    countries, 
    getStatesByCountry, 
    getCountryByName, 
    loading: catalogsLoading 
  } = useCatalogs();

  // Estado para dropdown de país del consultorio
  const [selectedOfficeCountry, setSelectedOfficeCountry] = useState<string>('México');

  // Función para manejar cambio de país del consultorio
  const handleOfficeCountryChange = (countryName: string) => {
    setSelectedOfficeCountry(countryName);
    // Limpiar el estado cuando cambia el país
    setFormData(prev => ({ 
      ...prev, 
      office_state_id: ''
    }));
  };

  // Estados filtrados para el consultorio basados en el país seleccionado
  const filteredOfficeStates = useMemo(() => {
    return getStatesByCountry(selectedOfficeCountry);
  }, [selectedOfficeCountry, getStatesByCountry]);

  // Información del país del estado seleccionado del consultorio
  const currentOfficeStateInfo = useMemo(() => {
    if (!formData.office_state_id) return null;
    const stateId = parseInt(formData.office_state_id);
    
    for (const country of countries) {
      const statesInCountry = getStatesByCountry(country.name);
      const stateFound = statesInCountry.find(state => state.id === stateId);
      if (stateFound) {
        return { country, state: stateFound };
      }
    }
    return null;
  }, [formData.office_state_id, countries, getStatesByCountry]);

  // Sincronizar el país del consultorio cuando se edita
  useEffect(() => {
    if (isEditing && currentOfficeStateInfo && currentOfficeStateInfo.country.name !== selectedOfficeCountry) {
      setSelectedOfficeCountry(currentOfficeStateInfo.country.name);
    }
  }, [isEditing, currentOfficeStateInfo, selectedOfficeCountry]);

  // Inicializar país del consultorio a México cuando se cargan los países
  useEffect(() => {
    if (countries.length > 0 && !isEditing) {
      setSelectedOfficeCountry('México');
    }
  }, [countries.length, isEditing]);

  // Función para cargar especialidades desde la API
  useEffect(() => {
    const loadSpecialties = async () => {
      setLoadingSpecialties(true);
      try {
        const data = await apiService.getSpecialties();
        setSpecialties(data.map((spec: any) => spec.name)); // Solo nombres para compatibilidad
        if (process.env.NODE_ENV === 'development') {
          console.log('✅ Especialidades cargadas desde BD:', data.length);
        }
      } catch (error) {
        console.error('❌ Error loading specialties:', error);
        setSpecialties([...MEDICAL_SPECIALTIES]); // fallback a constantes
      } finally {
        setLoadingSpecialties(false);
      }
    };

    const loadStates = async () => {
      setLoadingStates(true);
      try {
        const data = await apiService.getStates();
        setStates(data);
      } catch (error) {
        console.error('❌ Error loading states:', error);
        setStates([]);
      } finally {
        setLoadingStates(false);
      }
    };

    if (open) { // Solo cargar cuando el diálogo esté abierto
      loadSpecialties();
      loadStates();
    }
  }, [open]);

  // Map section names to step numbers
  const getSectionStep = (section: string) => {
    const sectionMap: { [key: string]: number } = {
      'personal': 0,
      'academic': 1,
      'licenses': 1,  // Now part of professional info
      'office': 2,
      'contact': 2  // Contact is part of office info step
    };
    return sectionMap[section] || 0;
  };

  const handleClose = () => {
    onClose();
    setFormErrorMessage('');
    setActiveStep(0);
    setVisitedSteps(new Set([0]));
  };

  const handleNext = () => {
    setActiveStep((prevActiveStep) => {
      const newStep = prevActiveStep + 1;
      setVisitedSteps(prev => new Set(prev).add(newStep));
      return newStep;
    });
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  // Función para navegación directa a cualquier paso
  const handleStepClick = (step: number) => {
    setActiveStep(step);
    setVisitedSteps(prev => new Set(prev).add(step));
  };

  // Handle navigation to specific section when dialog opens
  useEffect(() => {
    if (open) {
      // Check if there's a specific section to navigate to
      const targetSection = (window as any).doctorProfileActiveSection;
      if (targetSection) {
        setActiveStep(getSectionStep(targetSection));
        // Clear the section after using it
        delete (window as any).doctorProfileActiveSection;
      }
    }
  }, [open]);

  const isStepValid = (step: number) => {
    // En modo edición, ser más flexible - solo validar formato, no campos obligatorios
    if (isEditing) {
      switch (step) {
        case 0:
          // Solo validar formato de email si está presente
          if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            return false;
          }
          return true; // Permitir continuar aunque no todos los campos estén llenos
        case 1:
          // Validar año de graduación si está presente
          if (formData.graduation_year) {
            const year = parseInt(formData.graduation_year);
            const currentYear = new Date().getFullYear();
            if (isNaN(year) || year < 1950 || year > currentYear) {
              return false;
            }
          }
          return true;
        case 2:
          return true; // Dirección opcional en edición
        default:
          return true;
      }
    }
    
    // En modo creación, validar todos los campos requeridos
    switch (step) {
      case 0:
        return formData.first_name && formData.paternal_surname && formData.maternal_surname && 
               formData.email && formData.phone && formData.birth_date && formData.gender && formData.curp;
      case 1:
        const step1Valid = formData.title && formData.university && formData.graduation_year && formData.professional_license && formData.specialty;
        if (!step1Valid && process.env.NODE_ENV === 'development') {
          console.log('🔍 Step 1 validation failed:', {
            title: formData.title,
            university: formData.university,
            graduation_year: formData.graduation_year,
            professional_license: formData.professional_license,
            specialty: formData.specialty
          });
        }
        return step1Valid;
      case 2:
        return formData.office_address && formData.office_city && formData.office_state_id;
      default:
        return false;
    }
  };

  const canProceed = isStepValid(activeStep);

  // Función para verificar si todos los campos obligatorios están completos
  const areAllRequiredFieldsComplete = () => {
    // Campos obligatorios para crear/editar un perfil completo
    const requiredFields = [
      'title', 'first_name', 'paternal_surname', 'maternal_surname',
      'email', 'phone', 'birth_date', 'gender', 'curp',
      'professional_license', 'specialty', 'university', 'graduation_year',
      'office_address', 'office_city', 'office_state_id'
    ];

    // Verificar que todos los campos requeridos tengan valor
    const allFieldsComplete = requiredFields.every(field => {
      const value = formData[field as keyof DoctorFormData];
      return value && value.toString().trim() !== '';
    });

    // Validar formato de email si está presente
    const emailValid = !formData.email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email);
    
    // Validar año de graduación si está presente
    let graduationYearValid = true;
    if (formData.graduation_year) {
      const year = parseInt(formData.graduation_year);
      const currentYear = new Date().getFullYear();
      graduationYearValid = !isNaN(year) && year >= 1950 && year <= currentYear;
    }

    return allFieldsComplete && emailValid && graduationYearValid;
  };

  const showUpdateButton = isEditing && areAllRequiredFieldsComplete();

  const renderStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Alert severity="info" icon={<InfoIcon />}>
              <Typography variant="body2">
                Completa tu información personal para una identificación profesional adecuada.
              </Typography>
            </Alert>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 2 }}>
              <TextField
                label="Nombre(s)"
                value={formData.first_name || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, first_name: e.target.value }))}
                fullWidth
                required
                error={!!fieldErrors.first_name}
                helperText={fieldErrors.first_name || "Tu nombre completo"}
              />
              <TextField
                label="Apellido Paterno"
                value={formData.paternal_surname || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, paternal_surname: e.target.value }))}
                fullWidth
                required
                error={!!fieldErrors.paternal_surname}
                helperText={fieldErrors.paternal_surname}
              />
              <TextField
                label="Apellido Materno"
                value={formData.maternal_surname || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, maternal_surname: e.target.value }))}
                fullWidth
                required
                error={!!fieldErrors.maternal_surname}
                helperText={fieldErrors.maternal_surname}
              />
            </Box>

            <TextField
              label="Correo Electrónico"
              type="email"
              value={formData.email || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              fullWidth
              required
              error={!!fieldErrors.email}
              helperText={fieldErrors.email || "Correo para comunicación oficial"}
            />

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' }, gap: 2 }}>
              <TextField
                label="Teléfono"
                value={formData.phone || ''}
                onChange={(e) => {
                  // Solo permitir números
                  const value = e.target.value.replace(/[^0-9]/g, '');
                  setFormData(prev => ({ ...prev, phone: value }));
                }}
                fullWidth
                required
                error={!!fieldErrors.phone}
                helperText={fieldErrors.phone || "Solo números (10 dígitos)"}
                placeholder="5551234567"
                inputProps={{ maxLength: 15 }}
              />
              <FormControl fullWidth required error={!!fieldErrors.gender}>
                <InputLabel>Género</InputLabel>
                <Select
                  value={formData.gender || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, gender: e.target.value }))}
                  label="Género"
                >
                  <MenuItem value="M">Masculino</MenuItem>
                  <MenuItem value="F">Femenino</MenuItem>
                  <MenuItem value="O">Otro</MenuItem>
                </Select>
              </FormControl>
              <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={es}>
                <DatePicker
                  label="Fecha de Nacimiento *"
                  value={formData.birth_date ? new Date(formData.birth_date.split('T')[0]) : null}
                  maxDate={new Date()}
                  onChange={(newValue) => {
                    if (newValue) {
                      const dateValue = newValue.toISOString().split('T')[0];
                      setFormData(prev => ({ ...prev, birth_date: dateValue }));
                    } else {
                      setFormData(prev => ({ ...prev, birth_date: '' }));
                    }
                  }}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      required: true
                    }
                  }}
                />
              </LocalizationProvider>
            </Box>

            <Divider sx={{ my: 2 }} />
            
            <Alert severity="warning" icon={<InfoIcon />}>
              <Typography variant="body2">
                <strong>Identificación Legal:</strong> CURP es obligatoria según NOM-024-SSA3-2012. 
                RFC es opcional pero recomendable para fines fiscales.
              </Typography>
            </Alert>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
              <TextField
                label="CURP"
                value={formData.curp || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, curp: e.target.value.toUpperCase() }))}
                fullWidth
                required
                error={!!fieldErrors.curp}
                helperText={fieldErrors.curp || "Clave Única de Registro de Población (18 caracteres)"}
                placeholder="AAAA######HAAAAA#"
                inputProps={{ maxLength: 18 }}
              />
              <TextField
                label="RFC"
                value={formData.rfc || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, rfc: e.target.value.toUpperCase() }))}
                fullWidth
                error={!!fieldErrors.rfc}
                helperText={fieldErrors.rfc || "Registro Federal de Contribuyentes (opcional)"}
                placeholder="AAA######AAA"
                inputProps={{ maxLength: 13 }}
              />
            </Box>
          </Box>
        );

      case 1:
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Alert severity="info" icon={<InfoIcon />}>
              <Typography variant="body2">
                Información profesional completa: formación académica, licencias y especialidades médicas.
              </Typography>
            </Alert>

            <Autocomplete
              options={['Dr.', 'Dra.', 'Lic.', 'Lcda.']}
              value={formData.title || ''}
              onChange={(_, newValue) => setFormData(prev => ({ ...prev, title: newValue || '' }))}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Título"
                  required
                  error={!!fieldErrors.title}
                  helperText={fieldErrors.title || "Título profesional"}
                />
              )}
              disableClearable
            />

            {/* Formación Académica */}
            <Typography variant="h6" sx={{ color: 'primary.main', display: 'flex', alignItems: 'center', gap: 1 }}>
              <SchoolIcon /> Formación Académica
            </Typography>

            <Alert severity="info" icon={<InfoIcon />}>
              <Typography variant="body2">
                <strong>Importante:</strong> La información académica y las cédulas profesionales son obligatorias según la NOM-004. 
                Asegúrate de ingresar los datos correctos.
              </Typography>
            </Alert>

            <TextField
              label="Universidad de Egreso"
              value={formData.university || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, university: e.target.value }))}
              fullWidth
              required
              error={!!fieldErrors.university}
              helperText={fieldErrors.university || "Universidad donde obtuviste tu título médico"}
              placeholder="Universidad Nacional Autónoma de México"
            />

            <TextField
              label="Año de Graduación"
              value={formData.graduation_year || ''}
              onChange={(e) => {
                // Solo permitir números
                const value = e.target.value.replace(/[^0-9]/g, '');
                setFormData(prev => ({ ...prev, graduation_year: value }));
              }}
              fullWidth
              required
              error={!!fieldErrors.graduation_year}
              helperText={fieldErrors.graduation_year || `Solo números - Año entre 1950 y ${new Date().getFullYear()}`}
              placeholder="2020"
              inputProps={{ maxLength: 4 }}
            />

            <TextField
              label="Cédula Profesional"
              value={formData.professional_license || ''}
              onChange={(e) => {
                // Solo permitir números
                const value = e.target.value.replace(/[^0-9]/g, '');
                setFormData(prev => ({ ...prev, professional_license: value }));
              }}
              fullWidth
              required
              error={!!fieldErrors.professional_license}
              helperText={fieldErrors.professional_license || "Solo números (7-8 dígitos)"}
              placeholder="12345678"
              inputProps={{ maxLength: 8 }}
            />

            <Autocomplete
              options={specialties}
              value={formData.specialty || ''}
              onChange={(_, newValue) => setFormData(prev => ({ ...prev, specialty: newValue || '' }))}
              loading={loadingSpecialties}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label={loadingSpecialties ? "Cargando especialidades..." : "Especialidad"}
                  required
                  error={!!fieldErrors.specialty}
                  helperText={fieldErrors.specialty || (loadingSpecialties ? "Cargando desde base de datos..." : "Tu especialidad médica principal")}
                />
              )}
              freeSolo
            />

            <TextField
              label="Cédula de Especialidad"
              value={formData.specialty_license || ''}
              onChange={(e) => {
                // Solo permitir números
                const value = e.target.value.replace(/[^0-9]/g, '');
                setFormData(prev => ({ ...prev, specialty_license: value }));
              }}
              fullWidth
              helperText="Solo números (7-8 dígitos, opcional)"
              placeholder="87654321"
              inputProps={{ maxLength: 8 }}
            />

            <TextField
              label="Subespecialidad"
              value={formData.subspecialty || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, subspecialty: e.target.value }))}
              fullWidth
              helperText="Subespecialidad médica (si aplica)"
            />
          </Box>
        );

      case 2:
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Alert severity="info" icon={<InfoIcon />}>
              <Typography variant="body2">
                Proporciona la dirección completa y teléfono de tu consultorio médico.
              </Typography>
            </Alert>

            <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <BusinessIcon color="primary" />
              Dirección del Consultorio
            </Typography>

            {/* 1. Dirección Completa */}
            <TextField
              label="Dirección Completa"
              value={formData.office_address || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, office_address: e.target.value }))}
              fullWidth
              required
              multiline
              rows={2}
              error={!!fieldErrors.office_address}
              helperText={fieldErrors.office_address || "Calle, número, colonia"}
              placeholder="Av. Reforma 123, Col. Centro"
            />

            {/* 2. País y Estado (cascading) */}
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, gap: 2 }}>
              <Autocomplete
                options={countries}
                getOptionLabel={(option) => option.name}
                value={countries.find(country => country.name === selectedOfficeCountry) || null}
                onChange={(_, newValue) => {
                  const countryName = newValue?.name || 'México';
                  handleOfficeCountryChange(countryName);
                }}
                loading={catalogsLoading}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="País"
                    required
                    helperText="Selecciona el país del consultorio"
                  />
                )}
              />
              <Autocomplete
                options={filteredOfficeStates}
                getOptionLabel={(option) => option.name}
                value={filteredOfficeStates.find(state => state.id === parseInt(formData.office_state_id || '0')) || null}
                onChange={(_, newValue) => {
                  setFormData(prev => ({ 
                    ...prev, 
                    office_state_id: newValue ? String(newValue.id) : '' 
                  }));
                }}
                loading={catalogsLoading}
                disabled={!selectedOfficeCountry || filteredOfficeStates.length === 0}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Estado"
                    required
                    error={!!fieldErrors.office_state_id}
                    helperText={
                      !selectedOfficeCountry ? "Primero selecciona un país" :
                      filteredOfficeStates.length === 0 ? "No hay estados disponibles" :
                      fieldErrors.office_state_id || "Estado/Provincia"
                    }
                  />
                )}
              />
            </Box>

            {/* 3. Ciudad y Código Postal */}
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, gap: 2 }}>
              <TextField
                label="Ciudad"
                value={formData.office_city || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, office_city: e.target.value }))}
                fullWidth
                required
                error={!!fieldErrors.office_city}
                helperText={fieldErrors.office_city || "Ciudad del consultorio"}
              />
              <TextField
                label="Código Postal"
                value={formData.office_postal_code || ''}
                onChange={(e) => {
                  // Solo permitir números
                  const value = e.target.value.replace(/[^0-9]/g, '');
                  setFormData(prev => ({ ...prev, office_postal_code: value }));
                }}
                fullWidth
                helperText="Solo números (5 dígitos)"
                placeholder="12345"
                inputProps={{ maxLength: 5 }}
              />
            </Box>

            {/* 4. Teléfono del Consultorio y Duración de Citas */}
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, gap: 2 }}>
              <TextField
                label="Teléfono del Consultorio"
                value={formData.office_phone || ''}
                onChange={(e) => {
                  // Solo permitir números
                  const value = e.target.value.replace(/[^0-9]/g, '');
                  setFormData(prev => ({ ...prev, office_phone: value }));
                }}
                fullWidth
                helperText="Solo números (opcional)"
                placeholder="5551234567"
                inputProps={{ maxLength: 15 }}
              />
              <TextField
                label="Duración de Citas (minutos)"
                value={formData.appointment_duration || ''}
                onChange={(e) => {
                  // Solo permitir números
                  const value = e.target.value.replace(/[^0-9]/g, '');
                  setFormData(prev => ({ ...prev, appointment_duration: value }));
                }}
                fullWidth
                helperText="Tiempo promedio por consulta"
                placeholder="30"
                inputProps={{ maxLength: 3 }}
              />
            </Box>

          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: { borderRadius: '16px', minHeight: '80vh' }
      }}
    >
      <DialogTitle sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        pb: 2,
        borderBottom: '1px solid',
        borderColor: 'divider'
      }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 600 }}>
            {isEditing ? 'Editar Perfil Profesional' : 'Crear Perfil Profesional'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {steps[activeStep].description}
          </Typography>
        </Box>
        <IconButton onClick={handleClose} sx={{ color: 'text.secondary' }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 0 }}>
        {/* Error Message */}
        <Collapse in={!!formErrorMessage}>
          <Alert severity="error" sx={{ m: 3, mb: 0 }}>
            {formErrorMessage}
          </Alert>
        </Collapse>

        <Box sx={{ display: 'flex', minHeight: '600px' }}>
          {/* Stepper Sidebar */}
          <Box sx={{ 
            width: 280, 
            bgcolor: 'grey.50', 
            borderRight: '1px solid', 
            borderColor: 'divider',
            p: 3
          }}>
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                Perfil del Médico
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Haz clic en cualquier sección para navegar directamente
              </Typography>
            </Box>
            <Stepper activeStep={activeStep} orientation="vertical">
              {steps.map((step, index) => (
                <Step key={step.label}>
                  <StepLabel
                    onClick={() => handleStepClick(index)}
                    sx={{ 
                      cursor: 'pointer',
                      '&:hover': {
                        bgcolor: 'action.hover',
                        borderRadius: 1
                      },
                      p: 1,
                      borderRadius: 1,
                      transition: 'background-color 0.2s ease'
                    }}
                    StepIconComponent={() => {
                      const isActive = index === activeStep;
                      const isCompleted = index < activeStep;
                      const isVisited = visitedSteps.has(index);
                      
                      return (
                        <Avatar
                          sx={{
                            bgcolor: isCompleted 
                              ? 'success.main' 
                              : isActive 
                                ? 'primary.main' 
                                : isVisited 
                                  ? 'info.main' 
                                  : 'grey.300',
                            color: 'white',
                            width: 32,
                            height: 32,
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            border: isActive ? '2px solid' : 'none',
                            borderColor: isActive ? 'primary.dark' : 'transparent',
                            '&:hover': {
                              transform: 'scale(1.05)',
                              bgcolor: isCompleted 
                                ? 'success.dark' 
                                : isActive 
                                  ? 'primary.dark' 
                                  : isVisited 
                                    ? 'info.dark' 
                                    : 'grey.400'
                            }
                          }}
                        >
                          {isCompleted ? <SaveIcon fontSize="small" /> : step.icon}
                        </Avatar>
                      );
                    }}
                  >
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        fontWeight: index === activeStep ? 600 : 400,
                        cursor: 'pointer',
                        '&:hover': {
                          color: 'primary.main'
                        }
                      }}
                    >
                      {step.label}
                    </Typography>
                  </StepLabel>
                </Step>
              ))}
            </Stepper>
          </Box>

          {/* Content Area */}
          <Box sx={{ flex: 1, p: 3 }}>
            <Typography variant="h6" sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
              {steps[activeStep].icon}
              {steps[activeStep].label}
            </Typography>
            
            {renderStepContent(activeStep)}
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ 
        p: 3, 
        borderTop: '1px solid', 
        borderColor: 'divider',
        justifyContent: 'space-between'
      }}>
        <Button 
          onClick={handleClose}
          disabled={isSubmitting}
          variant="outlined"
          sx={{ borderRadius: '8px' }}
        >
          Cancelar
        </Button>

        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            disabled={activeStep === 0}
            onClick={handleBack}
            startIcon={<BackIcon />}
            variant="outlined"
            sx={{ borderRadius: '8px' }}
          >
            Anterior
          </Button>

          {activeStep === steps.length - 1 ? (
            <Button 
              onClick={onSubmit}
              disabled={isSubmitting || !canProceed}
              variant="contained"
              startIcon={<SaveIcon />}
              sx={{ borderRadius: '8px', minWidth: 120 }}
            >
              {isSubmitting ? 'Guardando...' : (isEditing ? 'Actualizar' : 'Crear Perfil')}
            </Button>
          ) : (
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                onClick={handleNext}
                disabled={!canProceed}
                variant="contained"
                endIcon={<NextIcon />}
                sx={{ borderRadius: '8px' }}
              >
                Siguiente
              </Button>
              
              {/* Botón Actualizar - Solo visible en modo edición con campos completos */}
              {showUpdateButton && (
                <Button
                  onClick={onSubmit}
                  disabled={isSubmitting}
                  variant="outlined"
                  startIcon={<SaveIcon />}
                  sx={{ 
                    borderRadius: '8px', 
                    minWidth: 120,
                    borderColor: 'success.main',
                    color: 'success.main',
                    '&:hover': {
                      borderColor: 'success.dark',
                      backgroundColor: 'success.light',
                      color: 'success.dark'
                    }
                  }}
                >
                  {isSubmitting ? 'Guardando...' : 'Actualizar'}
                </Button>
              )}
            </Box>
          )}
        </Box>
      </DialogActions>
    </Dialog>
  );
};

export default memo(DoctorProfileDialog);
