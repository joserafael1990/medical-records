import React, { memo, useState, useEffect } from 'react';
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
  Chip,
  Avatar
} from '@mui/material';
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
      label: 'Formación Académica',
      icon: <SchoolIcon />,
      description: 'Universidad y estudios médicos'
    },
    {
      label: 'Licencias Profesionales',
      icon: <BadgeIcon />,
      description: 'Cédulas y certificaciones'
    },
    {
      label: 'Dirección del Consultorio',
      icon: <BusinessIcon />,
      description: 'Ubicación y teléfono del consultorio médico'
    }
  ];

  // Usar la lista completa de especialidades desde las constantes
  const specialties = MEDICAL_SPECIALTIES;

  // Usar la lista de estados desde las constantes
  const mexicanStates = MEXICAN_STATE_NAMES;

  // Map section names to step numbers
  const getSectionStep = (section: string) => {
    const sectionMap: { [key: string]: number } = {
      'personal': 0,
      'academic': 1,
      'licenses': 2,
      'office': 3,
      'contact': 3  // Contact is part of office info step
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
          return true; // Licencias opcionales en edición
        case 3:
          return true; // Dirección opcional en edición
        default:
          return true;
      }
    }
    
    // En modo creación, validar todos los campos requeridos
    switch (step) {
      case 0:
        return formData.title && formData.first_name && formData.paternal_surname && formData.maternal_surname && 
               formData.email && formData.phone && formData.birth_date && formData.curp;
      case 1:
        return formData.university && formData.graduation_year;
      case 2:
        return formData.professional_license && formData.specialty;
      case 3:
        return formData.office_address && formData.office_city && formData.office_state;
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
      'email', 'phone', 'birth_date', 'curp',
      'professional_license', 'specialty', 'university', 'graduation_year',
      'office_address', 'office_city', 'office_state'
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
                Esta información es requerida por la NOM-004-SSA3-2012 para la correcta identificación del profesional de la salud.
              </Typography>
            </Alert>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '120px repeat(3, 1fr)' }, gap: 2 }}>
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

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
              <TextField
                label="Teléfono"
                value={formData.phone || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                fullWidth
                required
                error={!!fieldErrors.phone}
                helperText={fieldErrors.phone || "Teléfono principal de contacto"}
                placeholder="55-1234-5678"
              />
              <TextField
                label="Fecha de Nacimiento"
                type="date"
                value={formData.birth_date ? formData.birth_date.split('T')[0] : ''}
                onChange={(e) => setFormData(prev => ({ ...prev, birth_date: e.target.value }))}
                fullWidth
                required
                InputLabelProps={{ shrink: true }}
                error={!!fieldErrors.birth_date}
                helperText={fieldErrors.birth_date}
              />
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
                Información sobre tu formación académica médica, requerida para validar tu preparación profesional.
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

            {/* medical_school field removed per user request */}

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
              <TextField
                label="Año de Graduación"
                type="number"
                value={formData.graduation_year || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, graduation_year: e.target.value }))}
                fullWidth
                required
                error={!!fieldErrors.graduation_year}
                helperText={fieldErrors.graduation_year}
                inputProps={{ min: 1950, max: new Date().getFullYear() }}
              />
              {/* internship_hospital and residency_hospital fields removed per user request */}
            </Box>
          </Box>
        );

      case 2:
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Alert severity="warning" icon={<InfoIcon />}>
              <Typography variant="body2">
                <strong>Importante:</strong> Las cédulas profesionales son obligatorias según la NOM-004. 
                Asegúrate de ingresar los números correctos.
              </Typography>
            </Alert>

            <TextField
              label="Cédula Profesional"
              value={formData.professional_license || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, professional_license: e.target.value }))}
              fullWidth
              required
              error={!!fieldErrors.professional_license}
              helperText={fieldErrors.professional_license || "Número de cédula profesional expedida por la SEP"}
              placeholder="12345678"
            />

            <TextField
              label="Cédula de Especialidad"
              value={formData.specialty_license || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, specialty_license: e.target.value }))}
              fullWidth
              helperText="Número de cédula de especialidad (si aplica)"
              placeholder="87654321"
            />

            <Autocomplete
              options={specialties}
              value={formData.specialty || ''}
              onChange={(_, newValue) => setFormData(prev => ({ ...prev, specialty: newValue || '' }))}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Especialidad"
                  required
                  error={!!fieldErrors.specialty}
                  helperText={fieldErrors.specialty || "Tu especialidad médica principal"}
                />
              )}
              freeSolo
            />

            <TextField
              label="Subespecialidad"
              value={formData.subspecialty || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, subspecialty: e.target.value }))}
              fullWidth
              helperText="Subespecialidad médica (si aplica)"
            />

            <Divider />

            {/* Certificaciones del Consejo y Membresías Profesionales removed per user request */}
          </Box>
        );

      case 3:
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

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 2 }}>
              <TextField
                label="Ciudad"
                value={formData.office_city || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, office_city: e.target.value }))}
                fullWidth
                required
                error={!!fieldErrors.office_city}
                helperText={fieldErrors.office_city}
              />
              <Autocomplete
                options={mexicanStates}
                value={formData.office_state || ''}
                onChange={(_, newValue) => setFormData(prev => ({ ...prev, office_state: newValue || '' }))}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Estado"
                    required
                    error={!!fieldErrors.office_state}
                    helperText={fieldErrors.office_state}
                  />
                )}
              />
              <TextField
                label="Código Postal"
                value={formData.office_postal_code || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, office_postal_code: e.target.value }))}
                fullWidth
                helperText="Código postal del consultorio"
                placeholder="12345"
              />
            </Box>

            <TextField
              label="Teléfono del Consultorio"
              value={formData.office_phone || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, office_phone: e.target.value }))}
              fullWidth
              helperText="Teléfono fijo del consultorio para citas y consultas"
              placeholder="55-1234-5678"
            />

            <TextField
              label="País"
              value={formData.office_country || 'México'}
              onChange={(e) => setFormData(prev => ({ ...prev, office_country: e.target.value }))}
              fullWidth
              disabled
            />


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
