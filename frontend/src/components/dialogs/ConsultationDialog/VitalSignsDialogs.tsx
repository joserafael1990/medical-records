import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  TextField,
  Grid,
  Card,
  CardContent
} from '@mui/material';
import {
  MonitorHeart as MonitorHeartIcon
} from '@mui/icons-material';
import {
  getVitalSignIcon,
  getVitalSignColor,
  getVitalSignUnit
} from '../../../utils/vitalSignUtils';

interface VitalSignsDialogsProps {
  // Vital signs hook
  vitalSignsHook: any;
  
  // Consultation info
  isEditing: boolean;
  consultationId: string | null;
}

export const VitalSignsDialogs: React.FC<VitalSignsDialogsProps> = ({
  vitalSignsHook,
  isEditing,
  consultationId
}) => {
  return (
    <>
      {/* Vital Signs Selection Dialog */}
      <Dialog 
        open={vitalSignsHook.vitalSignDialogOpen && !vitalSignsHook.isEditingVitalSign} 
        onClose={vitalSignsHook.closeDialog} 
        maxWidth="md" 
        fullWidth
      >
        <DialogTitle>Seleccionar Signo Vital</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Selecciona el tipo de signo vital que deseas agregar:
          </Typography>
          {(() => {
            // Get all available vital signs with defensive check
            const allAvailableVitalSigns = (vitalSignsHook.availableVitalSigns || []);
            
            // Get existing vital signs for this consultation with defensive check
            const existingVitalSigns = (vitalSignsHook.getAllVitalSigns() || []);
            
            // Filter out vital signs that are already registered
            const filteredVitalSigns = allAvailableVitalSigns.filter((vitalSign: any) => {
              return !existingVitalSigns.some((existing: any) => 
                existing.vital_sign_id === vitalSign.id
              );
            });

            if (filteredVitalSigns.length === 0) {
              return (
                <Box sx={{ 
                  textAlign: 'center', 
                  py: 4,
                  backgroundColor: '#f5f5f5',
                  borderRadius: 2,
                  border: '1px dashed #ccc'
                }}>
                  <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
                    ✅ Todos los signos vitales registrados
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Ya has agregado todos los signos vitales disponibles para esta consulta.
                  </Typography>
                </Box>
              );
            }

            return (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {filteredVitalSigns.map((vitalSign: any) => (
                  <Box key={vitalSign.id} sx={{ flex: '1 1 calc(50% - 8px)', minWidth: '200px' }}>
                    <Card 
                      sx={{ 
                        cursor: 'pointer', 
                        border: `2px solid ${getVitalSignColor(vitalSign.name)}`,
                        backgroundColor: `${getVitalSignColor(vitalSign.name)}08`,
                        '&:hover': { 
                          backgroundColor: `${getVitalSignColor(vitalSign.name)}15`,
                          transform: 'translateY(-2px)',
                          boxShadow: `0 4px 12px ${getVitalSignColor(vitalSign.name)}40`
                        },
                        transition: 'all 0.2s ease-in-out'
                      }}
                      onClick={() => {
                        const autoUnit = getVitalSignUnit(vitalSign.name);
                        
                        vitalSignsHook.updateFormData({ 
                          vital_sign_id: vitalSign.id,
                          value: '',
                          unit: autoUnit,
                          notes: ''
                        });
                        
                        // Auto-calculate BMI if IMC is selected and we have weight/height
                        if (vitalSign.name.toLowerCase().includes('imc') || 
                            vitalSign.name.toLowerCase().includes('índice de masa corporal') || 
                            vitalSign.name.toLowerCase().includes('bmi')) {
                          const allVitalSigns = vitalSignsHook.getAllVitalSigns() || [];
                          const weightSign = (allVitalSigns || []).find((vs: any) => 
                            vs.vital_sign_name.toLowerCase().includes('peso')
                          );
                          const heightSign = (allVitalSigns || []).find((vs: any) => 
                            vs.vital_sign_name.toLowerCase().includes('estatura') || 
                            vs.vital_sign_name.toLowerCase().includes('altura')
                          );
                          
                          if (weightSign && heightSign) {
                            const weight = parseFloat(weightSign.value);
                            const height = parseFloat(heightSign.value);
                            
                            if (!isNaN(weight) && !isNaN(height) && height > 0) {
                              const heightInMeters = height / 100;
                              const bmi = weight / (heightInMeters * heightInMeters);
                              const bmiRounded = Math.round(bmi * 10) / 10;
                              
                              // Auto-fill BMI value
                              setTimeout(() => {
                                vitalSignsHook.updateFormData({ value: bmiRounded.toString() });
                              }, 100);
                            }
                          }
                        }
                      }}
                    >
                      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {React.createElement(getVitalSignIcon(vitalSign.name), { 
                            sx: { color: getVitalSignColor(vitalSign.name) } 
                          })}
                          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                            {vitalSign.name}
                          </Typography>
                        </Box>
                      </CardContent>
                    </Card>
                  </Box>
                ))}
              </Box>
            );
          })()}
        </DialogContent>
        <DialogActions>
          <Button onClick={vitalSignsHook.closeDialog}>Cancelar</Button>
        </DialogActions>
      </Dialog>

      {/* Vital Sign Form Dialog */}
      <Dialog 
        open={vitalSignsHook.vitalSignDialogOpen && vitalSignsHook.vitalSignFormData.vital_sign_id > 0} 
        onClose={vitalSignsHook.closeDialog} 
        maxWidth="sm" 
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {(() => {
              const selectedVitalSign = (vitalSignsHook.availableVitalSigns || []).find(
                (vs: any) => vs.id === vitalSignsHook.vitalSignFormData.vital_sign_id
              );
              if (!selectedVitalSign) return <MonitorHeartIcon />;
              
              return React.createElement(getVitalSignIcon(selectedVitalSign.name), { 
                sx: { color: getVitalSignColor(selectedVitalSign.name) } 
              });
            })()}
            {vitalSignsHook.isEditingVitalSign ? 'Editar Signo Vital' : 'Agregar Signo Vital'}
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            {/* Show selected vital sign name */}
            {(() => {
              const selectedVitalSign = (vitalSignsHook.availableVitalSigns || []).find(
                (vs: any) => vs.id === vitalSignsHook.vitalSignFormData.vital_sign_id
              );
              if (selectedVitalSign) {
                return (
                  <Box sx={{ mb: 2, p: 2, backgroundColor: '#f5f5f5', borderRadius: 1 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                      {selectedVitalSign.name}
                    </Typography>
                  </Box>
                );
              }
              return null;
            })()}
            
            <Grid container spacing={2}>
              <Box sx={{ mb: 2 }}>
                <TextField
                  label="Valor"
                  value={vitalSignsHook.vitalSignFormData.value}
                  onChange={(e) => vitalSignsHook.updateFormData({ value: e.target.value })}
                  fullWidth
                  required
                  placeholder="Ingresa el valor medido"
                  helperText={(() => {
                    const selectedVitalSign = (vitalSignsHook.availableVitalSigns || []).find(
                      (vs: any) => vs.id === vitalSignsHook.vitalSignFormData.vital_sign_id
                    );
                    
                    if (selectedVitalSign && (selectedVitalSign.name.toLowerCase().includes('imc') || 
                        selectedVitalSign.name.toLowerCase().includes('índice de masa corporal') || 
                        selectedVitalSign.name.toLowerCase().includes('bmi'))) {
                      const allVitalSigns = vitalSignsHook.getAllVitalSigns() || [];
                      const weightSign = (allVitalSigns || []).find((vs: any) => 
                        vs.vital_sign_name.toLowerCase().includes('peso')
                      );
                      const heightSign = (allVitalSigns || []).find((vs: any) => 
                        vs.vital_sign_name.toLowerCase().includes('estatura') || 
                        vs.vital_sign_name.toLowerCase().includes('altura')
                      );
                      
                      if (weightSign && heightSign) {
                        const weight = parseFloat(weightSign.value);
                        const height = parseFloat(heightSign.value);
                        
                        if (!isNaN(weight) && !isNaN(height) && height > 0) {
                          return `Peso: ${weight} kg, Estatura: ${height} cm. Haz clic en "Calcular" para calcular el IMC.`;
                        } else {
                          return 'Agrega primero el peso y la estatura para calcular el IMC.';
                        }
                      } else {
                        return 'Agrega primero el peso y la estatura para calcular el IMC.';
                      }
                    }
                    return 'Ingresa el valor medido del signo vital';
                  })()}
                  InputProps={{
                    endAdornment: (() => {
                      const selectedVitalSign = (vitalSignsHook.availableVitalSigns || []).find(
                        (vs: any) => vs.id === vitalSignsHook.vitalSignFormData.vital_sign_id
                      );
                      
                      // Check if this is BMI and if we have weight and height
                      if (selectedVitalSign && (selectedVitalSign.name.toLowerCase().includes('imc') || 
                          selectedVitalSign.name.toLowerCase().includes('índice de masa corporal') || 
                          selectedVitalSign.name.toLowerCase().includes('bmi'))) {
                        const allVitalSigns = vitalSignsHook.getAllVitalSigns() || [];
                        const weightSign = (allVitalSigns || []).find((vs: any) => 
                          vs.vital_sign_name.toLowerCase().includes('peso')
                        );
                        const heightSign = (allVitalSigns || []).find((vs: any) => 
                          vs.vital_sign_name.toLowerCase().includes('estatura') || 
                          vs.vital_sign_name.toLowerCase().includes('altura')
                        );
                        
                        if (weightSign && heightSign) {
                          const weight = parseFloat(weightSign.value);
                          const height = parseFloat(heightSign.value);
                          
                          if (!isNaN(weight) && !isNaN(height) && height > 0) {
                            const calculateBMI = () => {
                              const heightInMeters = height / 100; // Convert cm to meters
                              const bmi = weight / (heightInMeters * heightInMeters);
                              const bmiRounded = Math.round(bmi * 10) / 10; // Round to 1 decimal
                              vitalSignsHook.updateFormData({ value: bmiRounded.toString() });
                            };
                            
                            return (
                              <Button
                                size="small"
                                onClick={calculateBMI}
                                sx={{ 
                                  minWidth: 'auto',
                                  px: 1,
                                  fontSize: '0.75rem'
                                }}
                              >
                                Calcular
                              </Button>
                            );
                          }
                        }
                      }
                      return null;
                    })()
                  }}
                />
              </Box>
              <Box sx={{ mb: 2 }}>
                <TextField
                  label="Unidad de medida"
                  value={vitalSignsHook.vitalSignFormData.unit}
                  onChange={(e) => vitalSignsHook.updateFormData({ unit: e.target.value })}
                  fullWidth
                  placeholder="Ej: cm, kg, mmHg, °C, bpm"
                  helperText="Especifica la unidad de medida del valor"
                />
              </Box>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={vitalSignsHook.closeDialog}>Cancelar</Button>
          <Button 
            onClick={() => vitalSignsHook.submitForm(isEditing && consultationId ? consultationId : "temp_consultation")}
            variant="contained"
            disabled={vitalSignsHook.isSubmitting || !vitalSignsHook.vitalSignFormData.value}
          >
            {vitalSignsHook.isSubmitting ? 'Guardando...' : 'Guardar'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};


