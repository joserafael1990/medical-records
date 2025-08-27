import React, { useState } from 'react';
import { apiService } from '../../services/api';
import {
  Container,
  Paper,
  Box,
  TextField,
  Button,
  Typography,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Alert,
  CircularProgress,
  InputAdornment,
  IconButton,
  LinearProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  CheckCircle,
  Cancel,
  ArrowBack
} from '@mui/icons-material';
import AvantLogo from '../common/AvantLogo';
import { MEDICAL_SPECIALTIES, MEXICAN_STATES } from '../../constants';
import { useAuth } from '../../contexts/AuthContext';

interface RegistrationData {
  // Step 1: Account Info
  email: string;
  password: string;
  confirmPassword: string;
  
  // Step 2: Professional Profile
  title: string;
  first_name: string;
  paternal_surname: string;
  maternal_surname: string;
  specialty: string;
  professional_license: string;
  birth_date: string;
  phone: string;
  
  // Step 3: Additional Professional Info
  university: string;
  graduation_year: string;
  
  // Step 4: Office Data
  office_address: string;
  office_city: string;
  office_state: string;
  office_phone: string;
}

interface PasswordValidation {
  minLength: boolean;
  hasUppercase: boolean;
  hasLowercase: boolean;
  hasNumbers: boolean;
  hasSpecialChars: boolean;
}

const RegisterView: React.FC<{ onBackToLogin: () => void }> = ({ onBackToLogin }) => {
  const [activeStep, setActiveStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const { login } = useAuth();

  const [formData, setFormData] = useState<RegistrationData>({
    // Step 1
    email: '',
    password: '',
    confirmPassword: '',
    
    // Step 2
    title: 'Dr.',
    first_name: '',
    paternal_surname: '',
    maternal_surname: '',
    specialty: '',
    professional_license: '',
    birth_date: '',
    phone: '',
    
    // Step 3
    university: '',
    graduation_year: '',
    
    // Step 4
    office_address: '',
    office_city: '',
    office_state: '',
    office_phone: ''
  });

  const validatePassword = (password: string): PasswordValidation => {
    return {
      minLength: password.length >= 8,
      hasUppercase: /[A-Z]/.test(password),
      hasLowercase: /[a-z]/.test(password),
      hasNumbers: /\d/.test(password),
      hasSpecialChars: /[!@#$%^&*(),.?":{}|<>]/.test(password)
    };
  };

  const getPasswordStrength = (validation: PasswordValidation): number => {
    const criteria = Object.values(validation);
    return criteria.filter(Boolean).length;
  };

  const passwordValidation = validatePassword(formData.password);
  const passwordStrength = getPasswordStrength(passwordValidation);
  const isPasswordValid = passwordStrength >= 4;

  const handleInputChange = (field: keyof RegistrationData) => (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | { target: { value: unknown } }
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: event.target.value
    }));
    setError('');
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 0:
        if (!formData.email || !formData.password || !formData.confirmPassword) {
          setError('Por favor, completa todos los campos obligatorios');
          return false;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
          setError('Por favor, ingresa un correo electrónico válido');
          return false;
        }
        if (!isPasswordValid) {
          setError('La contraseña debe cumplir con al menos 4 de los 5 criterios de seguridad');
          return false;
        }
        if (formData.password !== formData.confirmPassword) {
          setError('Las contraseñas no coinciden');
          return false;
        }
        return true;
      
      case 1:
        const requiredFields = ['first_name', 'paternal_surname', 'specialty', 'professional_license', 'birth_date', 'phone'];
        const missingFields = requiredFields.filter(field => !formData[field as keyof RegistrationData]);
        if (missingFields.length > 0) {
          setError('Por favor, completa todos los campos obligatorios');
          return false;
        }
        return true;
      
      case 2:
        const requiredStep2Fields = ['university', 'graduation_year'];
        const missingStep2Fields = requiredStep2Fields.filter(field => !formData[field as keyof RegistrationData]);
        if (missingStep2Fields.length > 0) {
          setError('Por favor, completa todos los campos obligatorios');
          return false;
        }
        return true;
      
      case 3:
        const requiredStep3Fields = ['office_address', 'office_city', 'office_state'];
        const missingStep3Fields = requiredStep3Fields.filter(field => !formData[field as keyof RegistrationData]);
        if (missingStep3Fields.length > 0) {
          setError('Por favor, completa todos los campos obligatorios');
          return false;
        }
        return true;
      
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (validateStep(activeStep)) {
      setActiveStep(prev => prev + 1);
      setError('');
    }
  };

  const handleBack = () => {
    setActiveStep(prev => prev - 1);
    setError('');
  };

  const handleSubmit = async () => {
    if (!validateStep(3)) return;

    setIsLoading(true);
    setError('');

    try {
      // Create doctor profile first
      const doctorProfileData = {
        title: formData.title,
        first_name: formData.first_name,
        paternal_surname: formData.paternal_surname,
        maternal_surname: formData.maternal_surname || '',
        specialty: formData.specialty,
        professional_license: formData.professional_license,
        birth_date: formData.birth_date, // Ensure YYYY-MM-DD format
        phone: formData.phone,
        email: formData.email,
        // Required fields
        university: formData.university,
        graduation_year: formData.graduation_year,
        office_address: formData.office_address,
        office_city: formData.office_city,
        office_state: formData.office_state,
        office_country: 'México',
        // Optional fields
        office_phone: formData.office_phone || '',
        professional_email: formData.email,
        // System fields
        created_by: `${formData.title} ${formData.first_name} ${formData.paternal_surname}`.trim()
      };

      // First create the doctor profile
      console.log('📝 Sending doctor profile data:', doctorProfileData);
      
      const profileData = await apiService.createDoctorProfile(doctorProfileData);
      
      // Then register the user account
      await apiService.register({
        email: formData.email,
        password: formData.password,
        doctor_id: profileData.id
      });

      // Automatically log in the user
      const success = await login(formData.email, formData.password);
      if (!success) {
        throw new Error('Error al iniciar sesión automáticamente');
      }

    } catch (error: any) {
      console.error('Registration error:', error);
      setError(error.message || 'Error durante el registro. Intenta nuevamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const steps = [
    'Información de la Cuenta',
    'Perfil Profesional',
    'Información Profesional Adicional',
    'Datos del Consultorio'
  ];

  const getStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <Box>
            <TextField
              fullWidth
              margin="normal"
              label="Correo Electrónico"
              type="email"
              value={formData.email}
              onChange={handleInputChange('email')}
              required
              autoComplete="email"
            />
            
            <TextField
              fullWidth
              margin="normal"
              label="Contraseña"
              type={showPassword ? 'text' : 'password'}
              value={formData.password}
              onChange={handleInputChange('password')}
              required
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            {formData.password && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" gutterBottom>
                  Fortaleza de la contraseña:
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={(passwordStrength / 5) * 100}
                  sx={{
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: 'grey.300',
                    '& .MuiLinearProgress-bar': {
                      backgroundColor: passwordStrength < 3 ? 'error.main' : 
                                      passwordStrength < 4 ? 'warning.main' : 'success.main'
                    }
                  }}
                />
                <Box sx={{ mt: 1 }}>
                  {Object.entries({
                    'Al menos 8 caracteres': passwordValidation.minLength,
                    'Una letra mayúscula': passwordValidation.hasUppercase,
                    'Una letra minúscula': passwordValidation.hasLowercase,
                    'Un número': passwordValidation.hasNumbers,
                    'Un carácter especial': passwordValidation.hasSpecialChars
                  }).map(([criterion, met]) => (
                    <Box key={criterion} sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                      {met ? (
                        <CheckCircle sx={{ color: 'success.main', fontSize: 16, mr: 1 }} />
                      ) : (
                        <Cancel sx={{ color: 'error.main', fontSize: 16, mr: 1 }} />
                      )}
                      <Typography variant="caption" color={met ? 'success.main' : 'error.main'}>
                        {criterion}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </Box>
            )}

            <TextField
              fullWidth
              margin="normal"
              label="Confirmar Contraseña"
              type={showConfirmPassword ? 'text' : 'password'}
              value={formData.confirmPassword}
              onChange={handleInputChange('confirmPassword')}
              required
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      edge="end"
                    >
                      {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
          </Box>
        );

      case 1:
        return (
          <Box>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Box sx={{ minWidth: '120px', flex: '0 0 auto' }}>
                <FormControl fullWidth margin="normal">
                  <InputLabel>Título</InputLabel>
                  <Select
                    value={formData.title}
                    onChange={handleInputChange('title')}
                    label="Título"
                  >
                    <MenuItem value="Dr.">Dr.</MenuItem>
                    <MenuItem value="Dra.">Dra.</MenuItem>
                    <MenuItem value="Lic.">Lic.</MenuItem>
                    <MenuItem value="M.C.">M.C.</MenuItem>
                    <MenuItem value="Esp.">Esp.</MenuItem>
                  </Select>
                </FormControl>
              </Box>
              <Box sx={{ flex: '1 1 300px' }}>
                <TextField
                  fullWidth
                  margin="normal"
                  label="Nombre(s)"
                  value={formData.first_name}
                  onChange={handleInputChange('first_name')}
                  required
                />
              </Box>
            </Box>

            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Box sx={{ flex: '1 1 250px' }}>
                <TextField
                  fullWidth
                  margin="normal"
                  label="Apellido Paterno"
                  value={formData.paternal_surname}
                  onChange={handleInputChange('paternal_surname')}
                  required
                />
              </Box>
              <Box sx={{ flex: '1 1 250px' }}>
                <TextField
                  fullWidth
                  margin="normal"
                  label="Apellido Materno"
                  value={formData.maternal_surname}
                  onChange={handleInputChange('maternal_surname')}
                />
              </Box>
            </Box>

            <FormControl fullWidth margin="normal">
              <InputLabel>Especialidad</InputLabel>
              <Select
                value={formData.specialty}
                onChange={handleInputChange('specialty')}
                label="Especialidad"
                required
              >
                {MEDICAL_SPECIALTIES.map((specialty) => (
                  <MenuItem key={specialty} value={specialty}>
                    {specialty}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Box sx={{ flex: '1 1 250px' }}>
                <TextField
                  fullWidth
                  margin="normal"
                  label="Cédula Profesional"
                  value={formData.professional_license}
                  onChange={handleInputChange('professional_license')}
                  required
                />
              </Box>
              <Box sx={{ flex: '1 1 250px' }}>
                <TextField
                  fullWidth
                  margin="normal"
                  label="Fecha de Nacimiento"
                  type="date"
                  value={formData.birth_date}
                  onChange={handleInputChange('birth_date')}
                  required
                  InputLabelProps={{
                    shrink: true,
                  }}
                />
              </Box>
            </Box>

            <TextField
              fullWidth
              margin="normal"
              label="Teléfono"
              value={formData.phone}
              onChange={handleInputChange('phone')}
              required
            />
          </Box>
        );

      case 2:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Información Profesional Adicional
            </Typography>
            
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Box sx={{ flex: '1 1 250px' }}>
                <TextField
                  fullWidth
                  margin="normal"
                  label="Universidad"
                  value={formData.university}
                  onChange={handleInputChange('university')}
                  required
                />
              </Box>
              <Box sx={{ flex: '1 1 250px' }}>
                <TextField
                  fullWidth
                  margin="normal"
                  label="Año de Graduación"
                  type="number"
                  value={formData.graduation_year}
                  onChange={handleInputChange('graduation_year')}
                  inputProps={{ min: 1950, max: new Date().getFullYear() }}
                  required
                />
              </Box>
            </Box>
          </Box>
        );

      case 3:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Datos del Consultorio
            </Typography>
            
            <TextField
              fullWidth
              margin="normal"
              label="Dirección"
              multiline
              rows={2}
              value={formData.office_address}
              onChange={handleInputChange('office_address')}
              required
            />

            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Box sx={{ flex: '1 1 250px' }}>
                <TextField
                  fullWidth
                  margin="normal"
                  label="Ciudad"
                  value={formData.office_city}
                  onChange={handleInputChange('office_city')}
                  required
                />
              </Box>
              <Box sx={{ flex: '1 1 250px' }}>
                <FormControl fullWidth margin="normal" required>
                  <InputLabel>Estado</InputLabel>
                  <Select
                    value={formData.office_state}
                    onChange={handleInputChange('office_state')}
                    label="Estado"
                  >
                    {MEXICAN_STATES.map((state) => (
                      <MenuItem key={state.code} value={state.name}>
                        {state.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
            </Box>

            <TextField
              fullWidth
              margin="normal"
              label="Teléfono"
              value={formData.office_phone}
              onChange={handleInputChange('office_phone')}
            />
          </Box>
        );

      default:
        return 'Paso desconocido';
    }
  };

  return (
    <Container component="main" maxWidth="md">
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          py: 4
        }}
      >
        <Paper 
          elevation={3} 
          sx={{ 
            width: '100%',
            p: 4,
            borderRadius: 2,
            boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
          }}
        >
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
              <Button
                startIcon={<ArrowBack />}
                onClick={onBackToLogin}
                sx={{ color: 'text.secondary' }}
              >
                Volver al login
              </Button>
              <AvantLogo variant="full" sx={{ fontSize: 40, color: 'primary.main' }} />
            </Box>

            <Typography variant="h4" gutterBottom>
              Crear Cuenta
            </Typography>

            <Typography variant="body2" color="text.secondary" gutterBottom>
              Únete a AVANT y gestiona tu práctica médica de manera profesional
            </Typography>

            {error && (
              <Alert severity="error" sx={{ width: '100%', mb: 2 }}>
                {error}
              </Alert>
            )}

            <Box sx={{ width: '100%', mt: 3 }}>
              <Stepper activeStep={activeStep} orientation="vertical">
                {steps.map((label, index) => (
                  <Step key={label}>
                    <StepLabel>{label}</StepLabel>
                    <StepContent>
                      {getStepContent(index)}
                      
                      <Box sx={{ mb: 2, mt: 3 }}>
                        <div>
                          {index === steps.length - 1 ? (
                            <Button
                              variant="contained"
                              onClick={handleSubmit}
                              disabled={isLoading}
                              startIcon={isLoading ? <CircularProgress size={20} /> : null}
                            >
                              {isLoading ? 'Creando cuenta...' : 'Crear Cuenta'}
                            </Button>
                          ) : (
                            <Button
                              variant="contained"
                              onClick={handleNext}
                              sx={{ mt: 1, mr: 1 }}
                            >
                              Continuar
                            </Button>
                          )}
                          
                          <Button
                            disabled={index === 0 || isLoading}
                            onClick={handleBack}
                            sx={{ mt: 1, mr: 1 }}
                          >
                            Atrás
                          </Button>
                        </div>
                      </Box>
                    </StepContent>
                  </Step>
                ))}
              </Stepper>
            </Box>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default RegisterView;
