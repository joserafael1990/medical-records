import React, { useState, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Box,
  Alert,
  Stepper,
  Step,
  StepLabel,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  CircularProgress,
  Divider,
  InputAdornment,
  IconButton
} from '@mui/material';
import {
  Security as SecurityIcon,
  Assignment as CertificateIcon,
  Key as KeyIcon,
  Verified as VerifiedIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  Visibility,
  VisibilityOff,
  Download as DownloadIcon,
  CheckCircle as CheckIcon
} from '@mui/icons-material';

import { apiService } from '../../services/api';

interface DigitalSignatureDialogProps {
  open: boolean;
  onClose: () => void;
  mode: 'generate' | 'info' | 'sign';
  documentData?: any;
  onSignatureComplete?: (signatureData: any) => void;
}

interface CertificateInfo {
  certificate_id: string;
  subject_name: string;
  not_before: string;
  not_after: string;
  key_usage: string[];
  is_active: boolean;
}

const DigitalSignatureDialog: React.FC<DigitalSignatureDialogProps> = ({
  open,
  onClose,
  mode,
  documentData,
  onSignatureComplete
}) => {
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Form states
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [validityDays, setValidityDays] = useState(365);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Certificate info
  const [certificateInfo, setCertificateInfo] = useState<CertificateInfo | null>(null);
  const [hasCertificate, setHasCertificate] = useState<boolean | null>(null);
  
  // Document signing
  const [documentType, setDocumentType] = useState('');
  const [signatureResult, setSignatureResult] = useState<any>(null);

  const steps = {
    generate: ['Configurar Certificado', 'Generar Certificado', 'Confirmación'],
    info: ['Información del Certificado'],
    sign: ['Cargar Certificado', 'Firmar Documento', 'Confirmación']
  };

  const checkCertificateStatus = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiService.get('/digital-signature/certificate-info');
      setHasCertificate(response.data.has_certificate);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error verificando certificado');
    } finally {
      setLoading(false);
    }
  }, []);

  const generateCertificate = async () => {
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await apiService.post('/digital-signature/generate-certificate', {
        password,
        validity_days: validityDays
      });

      setCertificateInfo(response.data.certificate_info);
      setSuccess('Certificado digital generado exitosamente');
      setActiveStep(2);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error generando certificado');
    } finally {
      setLoading(false);
    }
  };

  const getCertificateDetails = async () => {
    if (!password) {
      setError('Ingrese la contraseña del certificado');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // En un escenario real, obtendríamos los detalles del certificado
      // Por ahora simulamos la respuesta
      const mockCertInfo: CertificateInfo = {
        certificate_id: "12345678",
        subject_name: "CN=Dr. Juan Pérez,O=Sistema Médico AVANT",
        not_before: new Date().toISOString(),
        not_after: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        key_usage: ["digital_signature", "non_repudiation"],
        is_active: true
      };
      
      setCertificateInfo(mockCertInfo);
      setSuccess('Certificado cargado exitosamente');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error obteniendo detalles del certificado');
    } finally {
      setLoading(false);
    }
  };

  const signDocument = async () => {
    if (!password) {
      setError('Ingrese la contraseña del certificado');
      return;
    }

    if (!documentData) {
      setError('No hay datos de documento para firmar');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await apiService.post('/digital-signature/sign-document', {
        document_type: documentType || 'consultation',
        document_data: documentData,
        certificate_password: password
      });

      setSignatureResult(response.data.signature_manifest);
      setSuccess('Documento firmado digitalmente');
      setActiveStep(2);
      
      if (onSignatureComplete) {
        onSignatureComplete(response.data.signature_manifest);
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error firmando documento');
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    if (mode === 'generate' && activeStep === 1) {
      generateCertificate();
    } else if (mode === 'sign' && activeStep === 1) {
      signDocument();
    } else if (mode === 'info' && activeStep === 0) {
      getCertificateDetails();
    } else {
      setActiveStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
    setError(null);
  };

  const handleClose = () => {
    setActiveStep(0);
    setPassword('');
    setConfirmPassword('');
    setError(null);
    setSuccess(null);
    setCertificateInfo(null);
    setSignatureResult(null);
    onClose();
  };

  const isStepValid = () => {
    switch (mode) {
      case 'generate':
        if (activeStep === 0) {
          return password.length >= 8 && password === confirmPassword;
        }
        return true;
      case 'info':
        return password.length > 0;
      case 'sign':
        if (activeStep === 0) {
          return password.length > 0;
        }
        return true;
      default:
        return true;
    }
  };

  const renderStepContent = () => {
    switch (mode) {
      case 'generate':
        return renderGenerateContent();
      case 'info':
        return renderInfoContent();
      case 'sign':
        return renderSignContent();
      default:
        return null;
    }
  };

  const renderGenerateContent = () => {
    switch (activeStep) {
      case 0:
        return (
          <Box sx={{ mt: 2 }}>
            <Alert severity="info" sx={{ mb: 3 }}>
              <Typography variant="body2">
                Se generará un certificado digital autofirmado para firmar documentos médicos.
                Este certificado será válido por {validityDays} días.
              </Typography>
            </Alert>

            <TextField
              fullWidth
              type={showPassword ? 'text' : 'password'}
              label="Contraseña del Certificado"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              margin="normal"
              required
              helperText="Mínimo 8 caracteres. Esta contraseña protegerá su certificado digital."
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

            <TextField
              fullWidth
              type={showConfirmPassword ? 'text' : 'password'}
              label="Confirmar Contraseña"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              margin="normal"
              required
              error={confirmPassword.length > 0 && password !== confirmPassword}
              helperText={
                confirmPassword.length > 0 && password !== confirmPassword
                  ? 'Las contraseñas no coinciden'
                  : ''
              }
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

            <TextField
              fullWidth
              type="number"
              label="Días de Validez"
              value={validityDays}
              onChange={(e) => setValidityDays(parseInt(e.target.value))}
              margin="normal"
              inputProps={{ min: 30, max: 3650 }}
              helperText="Entre 30 y 3650 días (10 años máximo)"
            />
          </Box>
        );

      case 1:
        return (
          <Box sx={{ mt: 2, textAlign: 'center' }}>
            <CircularProgress size={60} sx={{ mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              Generando Certificado Digital
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Esto puede tomar unos momentos...
            </Typography>
          </Box>
        );

      case 2:
        return (
          <Box sx={{ mt: 2 }}>
            <Alert severity="success" sx={{ mb: 3 }}>
              <Typography variant="body2">
                ¡Certificado digital generado exitosamente!
              </Typography>
            </Alert>

            {certificateInfo && (
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                    <CertificateIcon sx={{ mr: 1 }} />
                    Información del Certificado
                  </Typography>
                  
                  <List dense>
                    <ListItem>
                      <ListItemIcon>
                        <InfoIcon />
                      </ListItemIcon>
                      <ListItemText
                        primary="ID del Certificado"
                        secondary={certificateInfo.certificate_id}
                      />
                    </ListItem>
                    
                    <ListItem>
                      <ListItemIcon>
                        <SecurityIcon />
                      </ListItemIcon>
                      <ListItemText
                        primary="Válido desde"
                        secondary={new Date(certificateInfo.not_before).toLocaleDateString()}
                      />
                    </ListItem>
                    
                    <ListItem>
                      <ListItemIcon>
                        <WarningIcon />
                      </ListItemIcon>
                      <ListItemText
                        primary="Válido hasta"
                        secondary={new Date(certificateInfo.not_after).toLocaleDateString()}
                      />
                    </ListItem>
                    
                    <ListItem>
                      <ListItemIcon>
                        <KeyIcon />
                      </ListItemIcon>
                      <ListItemText
                        primary="Usos de la Clave"
                        secondary={
                          <Box sx={{ mt: 1 }}>
                            {certificateInfo.key_usage.map((usage) => (
                              <Chip
                                key={usage}
                                label={usage}
                                size="small"
                                sx={{ mr: 1, mb: 1 }}
                              />
                            ))}
                          </Box>
                        }
                      />
                    </ListItem>
                  </List>
                </CardContent>
              </Card>
            )}

            <Alert severity="warning" sx={{ mt: 2 }}>
              <Typography variant="body2">
                <strong>Importante:</strong> Guarde su contraseña en un lugar seguro. 
                Sin ella no podrá usar su certificado digital.
              </Typography>
            </Alert>
          </Box>
        );

      default:
        return null;
    }
  };

  const renderInfoContent = () => {
    if (!certificateInfo) {
      return (
        <Box sx={{ mt: 2 }}>
          <TextField
            fullWidth
            type={showPassword ? 'text' : 'password'}
            label="Contraseña del Certificado"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            margin="normal"
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
        </Box>
      );
    }

    return renderCertificateInfo();
  };

  const renderSignContent = () => {
    switch (activeStep) {
      case 0:
        return (
          <Box sx={{ mt: 2 }}>
            <Alert severity="info" sx={{ mb: 3 }}>
              <Typography variant="body2">
                Para firmar el documento, necesita proporcionar la contraseña de su certificado digital.
              </Typography>
            </Alert>

            <TextField
              fullWidth
              type={showPassword ? 'text' : 'password'}
              label="Contraseña del Certificado"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              margin="normal"
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

            {documentData && (
              <Card variant="outlined" sx={{ mt: 2 }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Documento a Firmar
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Tipo: {documentData.type || 'Consulta Médica'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    ID: {documentData.id}
                  </Typography>
                  {documentData.patient_name && (
                    <Typography variant="body2" color="text.secondary">
                      Paciente: {documentData.patient_name}
                    </Typography>
                  )}
                </CardContent>
              </Card>
            )}
          </Box>
        );

      case 1:
        return (
          <Box sx={{ mt: 2, textAlign: 'center' }}>
            <CircularProgress size={60} sx={{ mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              Firmando Documento
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Aplicando firma digital...
            </Typography>
          </Box>
        );

      case 2:
        return (
          <Box sx={{ mt: 2 }}>
            <Alert severity="success" sx={{ mb: 3 }}>
              <Typography variant="body2">
                ¡Documento firmado digitalmente!
              </Typography>
            </Alert>

            {signatureResult && (
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                    <VerifiedIcon sx={{ mr: 1 }} />
                    Información de la Firma
                  </Typography>
                  
                  <List dense>
                    <ListItem>
                      <ListItemIcon>
                        <InfoIcon />
                      </ListItemIcon>
                      <ListItemText
                        primary="ID del Documento"
                        secondary={signatureResult.document_id}
                      />
                    </ListItem>
                    
                    <ListItem>
                      <ListItemIcon>
                        <SecurityIcon />
                      </ListItemIcon>
                      <ListItemText
                        primary="Hash del Documento"
                        secondary={signatureResult.document_hash.substring(0, 16) + '...'}
                      />
                    </ListItem>
                    
                    <ListItem>
                      <ListItemIcon>
                        <CheckIcon />
                      </ListItemIcon>
                      <ListItemText
                        primary="Firma Aplicada"
                        secondary={new Date(signatureResult.last_signature_timestamp).toLocaleString()}
                      />
                    </ListItem>
                  </List>
                </CardContent>
              </Card>
            )}
          </Box>
        );

      default:
        return null;
    }
  };

  const renderCertificateInfo = () => {
    if (!certificateInfo) return null;

    return (
      <Box sx={{ mt: 2 }}>
        <Card variant="outlined">
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
              <CertificateIcon sx={{ mr: 1 }} />
              Certificado Digital
              <Chip
                label={certificateInfo.is_active ? 'Activo' : 'Expirado'}
                color={certificateInfo.is_active ? 'success' : 'error'}
                size="small"
                sx={{ ml: 2 }}
              />
            </Typography>
            
            <Divider sx={{ my: 2 }} />
            
            <List dense>
              <ListItem>
                <ListItemIcon>
                  <InfoIcon />
                </ListItemIcon>
                <ListItemText
                  primary="ID del Certificado"
                  secondary={certificateInfo.certificate_id}
                />
              </ListItem>
              
              <ListItem>
                <ListItemIcon>
                  <SecurityIcon />
                </ListItemIcon>
                <ListItemText
                  primary="Sujeto"
                  secondary={certificateInfo.subject_name}
                />
              </ListItem>
              
              <ListItem>
                <ListItemIcon>
                  <WarningIcon />
                </ListItemIcon>
                <ListItemText
                  primary="Período de Validez"
                  secondary={`${new Date(certificateInfo.not_before).toLocaleDateString()} - ${new Date(certificateInfo.not_after).toLocaleDateString()}`}
                />
              </ListItem>
              
              <ListItem>
                <ListItemIcon>
                  <KeyIcon />
                </ListItemIcon>
                <ListItemText
                  primary="Usos de la Clave"
                  secondary={
                    <Box sx={{ mt: 1 }}>
                      {certificateInfo.key_usage.map((usage) => (
                        <Chip
                          key={usage}
                          label={usage}
                          size="small"
                          sx={{ mr: 1, mb: 1 }}
                        />
                      ))}
                    </Box>
                  }
                />
              </ListItem>
            </List>
          </CardContent>
        </Card>
      </Box>
    );
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center' }}>
        <SecurityIcon sx={{ mr: 1 }} />
        {mode === 'generate' && 'Generar Certificado Digital'}
        {mode === 'info' && 'Información del Certificado'}
        {mode === 'sign' && 'Firmar Documento'}
      </DialogTitle>

      <DialogContent>
        {mode !== 'info' && (
          <Stepper activeStep={activeStep} sx={{ mb: 3 }}>
            {steps[mode].map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
        )}

        {error && (
          <Box sx={{ mb: 2, p: 2, bgcolor: 'error.main', borderRadius: 1 }}>
            <Typography color="white">{error}</Typography>
          </Box>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {success}
          </Alert>
        )}

        {renderStepContent()}
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose}>
          Cancelar
        </Button>
        
        {mode !== 'info' && activeStep > 0 && activeStep < steps[mode].length - 1 && (
          <Button onClick={handleBack}>
            Atrás
          </Button>
        )}
        
        {((mode !== 'info' && activeStep < steps[mode].length - 1) || 
          (mode === 'info' && !certificateInfo)) && (
          <Button
            variant="contained"
            onClick={handleNext}
            disabled={!isStepValid() || loading}
            startIcon={loading ? <CircularProgress size={20} /> : null}
          >
            {mode === 'generate' && activeStep === 1 ? 'Generar' : 
             mode === 'sign' && activeStep === 1 ? 'Firmar' :
             mode === 'info' ? 'Cargar Certificado' : 'Siguiente'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default DigitalSignatureDialog;
