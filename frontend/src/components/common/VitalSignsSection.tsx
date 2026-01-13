import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  IconButton,
  Tooltip,
  Divider,
  LinearProgress,
  Grid,
  TextField,
  Button
} from '@mui/material';
import {
  Favorite as HeartIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  MonitorHeart as MonitorHeartIcon,
  Thermostat as ThermostatIcon,
  Scale as ScaleIcon,
  Height as HeightIcon,
  LocalHospital as HospitalIcon,
  Add as AddIcon
} from '@mui/icons-material';
import { ConsultationVitalSign, VitalSign } from '../../types';
import { getVitalSignIcon, getVitalSignColor, getVitalSignUnit, isVitalSignUnitReadOnly } from '../../utils/vitalSignUtils';

interface VitalSignsSectionProps {
  consultationId: string;
  patientId: number;
  vitalSigns: ConsultationVitalSign[];
  availableVitalSigns?: VitalSign[];
  isLoading?: boolean;
  onAddVitalSign: (vitalSignData: { vital_sign_id: number; value: string; unit: string }) => void;
  onEditVitalSign: (vitalSign: ConsultationVitalSign, vitalSignData: { vital_sign_id: number; value: string; unit: string }) => void;
  onDeleteVitalSign: (vitalSignId: number) => void;
}

const VitalSignsSection: React.FC<VitalSignsSectionProps> = ({
  consultationId,
  patientId,
  vitalSigns,
  availableVitalSigns = [],
  isLoading = false,
  onAddVitalSign,
  onEditVitalSign,
  onDeleteVitalSign
}) => {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [vitalSignValues, setVitalSignValues] = useState<{ [key: number]: string }>({});
  const [savedVitalSigns, setSavedVitalSigns] = useState<Set<number>>(new Set());

  // Get priority order for vital signs
  const getVitalSignPriority = (name: string): number => {
    const nameLower = name.toLowerCase();
    if (nameLower.includes('altura') || nameLower.includes('estatura') || nameLower.includes('talla')) return 1;
    if (nameLower.includes('peso')) return 2;
    if (nameLower.includes('imc') || nameLower.includes('índice de masa corporal') || nameLower.includes('bmi')) return 3;
    return 999; // All others come after
  };

  // Get all vital signs - existing ones and available ones to add
  const getAllVitalSigns = () => {
    const existingIds = vitalSigns.map(vs => vs.vital_sign_id);
    
    // Include saved vital signs that are waiting for backend response
    const allExistingIds = new Set([...existingIds, ...Array.from(savedVitalSigns)]);
    const availableToAdd = availableVitalSigns.filter(vs => !allExistingIds.has(vs.id));
    
    // Combine existing and available, with existing first
    const allItems = [
      ...vitalSigns.map(vs => ({
        id: vs.id,
        vital_sign_id: vs.vital_sign_id,
        name: vs.vital_sign_name,
        value: vs.value,
        unit: vs.unit || getVitalSignUnit(vs.vital_sign_name),
        isExisting: true
      })),
      // Add saved vital signs that are pending backend response
      ...Array.from(savedVitalSigns)
        .filter(id => !existingIds.includes(id))
        .map(vitalSignId => {
          const vitalSign = availableVitalSigns.find(vs => vs.id === vitalSignId);
          if (!vitalSign) return null;
          return {
            id: Date.now() + vitalSignId, // Temporary ID
            vital_sign_id: vitalSignId,
            name: vitalSign.name,
            value: vitalSignValues[vitalSignId] || '',
            unit: getVitalSignUnit(vitalSign.name),
            isExisting: true // Treat as existing to show saved state
          };
        })
        .filter((item): item is NonNullable<typeof item> => item !== null),
      // Available vital signs to add (not saved yet)
      ...availableToAdd.map(vs => ({
        id: null,
        vital_sign_id: vs.id,
        name: vs.name,
        value: vitalSignValues[vs.id] || '',
        unit: getVitalSignUnit(vs.name),
        isExisting: false
      }))
    ];
    
    // Sort by priority: Altura (1), Peso (2), IMC (3), then all others (999)
    return allItems.sort((a, b) => {
      const priorityA = getVitalSignPriority(a.name);
      const priorityB = getVitalSignPriority(b.name);
      return priorityA - priorityB;
    });
  };

  const handleValueChange = (vitalSignId: number, value: string, vitalSignName?: string) => {
    setVitalSignValues(prev => ({
      ...prev,
      [vitalSignId]: value
    }));

    // Auto-calculate BMI if weight or height changed
    if (vitalSignName) {
      const name = vitalSignName.toLowerCase();
      if (name.includes('peso') || name.includes('estatura') || name.includes('altura') || name.includes('talla')) {
        const allSigns = getAllVitalSigns();
        const weightSign = allSigns.find(vs => vs.name.toLowerCase().includes('peso'));
        const heightSign = allSigns.find(vs => 
          vs.name.toLowerCase().includes('estatura') || 
          vs.name.toLowerCase().includes('altura') ||
          vs.name.toLowerCase().includes('talla')
        );
        const bmiSign = availableVitalSigns.find(vs => 
          vs.name.toLowerCase().includes('imc') || 
          vs.name.toLowerCase().includes('índice de masa corporal') || 
          vs.name.toLowerCase().includes('bmi')
        );

        if (weightSign && heightSign && bmiSign) {
          const weight = parseFloat(name.includes('peso') ? value : weightSign.value);
          const height = parseFloat((name.includes('estatura') || name.includes('altura') || name.includes('talla')) ? value : heightSign.value);
          
          if (!isNaN(weight) && !isNaN(height) && height > 0) {
            const heightInMeters = height / 100;
            const bmi = Math.round((weight / (heightInMeters * heightInMeters)) * 10) / 10;
            
            // Auto-fill BMI value
            setVitalSignValues(prev => ({
              ...prev,
              [bmiSign.id]: bmi.toString()
            }));
          }
        }
      }
    }
  };

  const handleSaveNewVitalSign = (vitalSignId: number) => {
    console.log('[VitalSignsSection] handleSaveNewVitalSign called', { vitalSignId, value: vitalSignValues[vitalSignId] });
    const value = vitalSignValues[vitalSignId];
    if (value && value.trim()) {
      const vitalSign = availableVitalSigns.find(vs => vs.id === vitalSignId);
      if (vitalSign) {
        const autoUnit = getVitalSignUnit(vitalSign.name);
        
        // Mark as saved immediately to prevent visual change
        setSavedVitalSigns(prev => new Set([...prev, vitalSignId]));
        
        console.log('[VitalSignsSection] Calling onAddVitalSign', { vitalSignId, value: value.trim(), unit: autoUnit });
        // Call the parent callback to save
        onAddVitalSign({
          vital_sign_id: vitalSignId,
          value: value.trim(),
          unit: autoUnit
        });
        console.log('[VitalSignsSection] onAddVitalSign called (returned)');
        
        // Keep the value in the state - it will be cleared when real data comes from backend
        setVitalSignValues(prev => ({
          ...prev,
          [vitalSignId]: value.trim()
        }));
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent, vitalSignId: number, isExisting: boolean) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (isExisting && editingId !== null) {
        const vitalSign = vitalSigns.find(vs => vs.id === editingId);
        if (vitalSign) {
          handleSaveEdit(vitalSign);
        }
      } else {
        handleSaveNewVitalSign(vitalSignId);
      }
    }
  };

  const handleStartEdit = (vitalSign: ConsultationVitalSign) => {
    setEditingId(vitalSign.id);
    setVitalSignValues({
      ...vitalSignValues,
      [vitalSign.vital_sign_id]: vitalSign.value
    });
  };

  const handleSaveEdit = (vitalSign: ConsultationVitalSign) => {
    const value = vitalSignValues[vitalSign.vital_sign_id];
    if (value && value.trim()) {
      onEditVitalSign(vitalSign, {
        vital_sign_id: vitalSign.vital_sign_id,
        value: value.trim(),
        unit: vitalSign.unit || getVitalSignUnit(vitalSign.vital_sign_name)
      });
      setEditingId(null);
      setVitalSignValues(prev => {
        const updated = { ...prev };
        delete updated[vitalSign.vital_sign_id];
        return updated;
      });
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
  };

  const handleDelete = (vitalSign: ConsultationVitalSign) => {
    if (window.confirm(`¿Estás seguro de eliminar ${vitalSign.vital_sign_name}?`)) {
      onDeleteVitalSign(vitalSign.id);
    }
  };

  // Clear saved vital signs when they appear in the actual vitalSigns list
  useEffect(() => {
    const existingIds = new Set(vitalSigns.map(vs => vs.vital_sign_id));

    setSavedVitalSigns(prev => {
      if (prev.size === 0) {
        return prev;
      }

      const idsToRemove: number[] = [];
      const next = new Set<number>();

      prev.forEach(id => {
        if (existingIds.has(id)) {
          idsToRemove.push(id);
        } else {
          next.add(id);
        }
      });

      if (idsToRemove.length === 0) {
        return prev;
      }

      setVitalSignValues(prevValues => {
        const shouldUpdate = idsToRemove.some(id => id in prevValues);
        if (!shouldUpdate) {
          return prevValues;
        }
        const updatedValues = { ...prevValues };
        idsToRemove.forEach(id => {
          delete updatedValues[id];
      });
        return updatedValues;
      });

      return next;
    });
  }, [vitalSigns]);

  if (isLoading) {
    return (
      <Box sx={{ mt: 3 }}>
        <Divider sx={{ mb: 2 }} />
        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <MonitorHeartIcon sx={{ fontSize: 20 }} />
          Signos Vitales
        </Typography>
        <LinearProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ mt: 3 }}>
      <Divider sx={{ mb: 2 }} />
      <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
        <MonitorHeartIcon sx={{ fontSize: 20 }} />
        Signos Vitales
      </Typography>

      {/* All Vital Signs - Simplified View - Always show input field */}
      <Grid container spacing={2}>
        {getAllVitalSigns().map((item) => {
          const color = getVitalSignColor(item.name);
          const IconComponent = getVitalSignIcon(item.name);
          
          // Get current value - always from state or item value
          const hasValue = item.value && item.value.trim() !== '';
          const currentValue = vitalSignValues[item.vital_sign_id] ?? (hasValue ? item.value : '');

          return (
            <Grid item xs={12} sm={6} md={4} lg={3} key={`${item.isExisting ? 'existing' : 'new'}-${item.vital_sign_id}`}>
              <Card 
                sx={{ 
                  border: hasValue ? `2px solid ${color}` : '2px solid #e0e0e0',
                  backgroundColor: hasValue ? `${color}08` : '#fafafa',
                  height: '100%'
                }}
              >
                <CardContent sx={{ p: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                    <Box sx={{ color, display: 'flex', alignItems: 'center' }}>
                      {React.createElement(IconComponent, { sx: { fontSize: 20 } })}
                    </Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, flex: 1 }}>
                      {item.name}
                    </Typography>
                  </Box>

                  <Box>
                    <TextField
                      placeholder="Ingrese el valor"
                      value={currentValue}
                      onChange={(e) => handleValueChange(item.vital_sign_id, e.target.value, item.name)}
                      onBlur={() => {
                        // Auto-save on blur if value exists and is not empty
                        if (currentValue.trim()) {
                          if (item.isExisting && item.id) {
                            // Update existing
                            const existingVitalSign = vitalSigns.find(vs => vs.id === item.id);
                            if (existingVitalSign && currentValue !== existingVitalSign.value) {
                              onEditVitalSign(existingVitalSign, {
                                vital_sign_id: item.vital_sign_id,
                                value: currentValue.trim(),
                                unit: item.unit || getVitalSignUnit(item.name)
                              });
                            }
                          } else {
                            // Save new
                            handleSaveNewVitalSign(item.vital_sign_id);
                          }
                        }
                      }}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          // Save on Enter
                          if (currentValue.trim()) {
                            if (item.isExisting && item.id) {
                              const existingVitalSign = vitalSigns.find(vs => vs.id === item.id);
                              if (existingVitalSign) {
                                onEditVitalSign(existingVitalSign, {
                                  vital_sign_id: item.vital_sign_id,
                                  value: currentValue.trim(),
                                  unit: item.unit || getVitalSignUnit(item.name)
                                });
                              }
                            } else {
                              handleSaveNewVitalSign(item.vital_sign_id);
                            }
                          }
                        }
                      }}
                      fullWidth
                      size="small"
                      InputProps={{
                        endAdornment: item.unit && (
                          <Typography variant="body2" color="text.secondary" sx={{ px: 1 }}>
                            {item.unit}
                          </Typography>
                        )
                      }}
                    />
                    
                    {/* Delete button for saved vital signs */}
                    {hasValue && item.isExisting && item.id && (
                      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
                        <Tooltip title="Eliminar">
                          <IconButton 
                            size="small" 
                            onClick={() => {
                              const existingVitalSign = vitalSigns.find(vs => vs.id === item.id);
                              if (existingVitalSign) {
                                handleDelete(existingVitalSign);
                              }
                            }}
                            sx={{ color: '#f44336' }}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    )}
                    
                    {/* Delete button for saved but not yet in backend */}
                    {hasValue && savedVitalSigns.has(item.vital_sign_id) && !item.isExisting && (
                      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
                        <Tooltip title="Eliminar">
                          <IconButton 
                            size="small" 
                            onClick={() => {
                              setSavedVitalSigns(prev => {
                                const updated = new Set(prev);
                                updated.delete(item.vital_sign_id);
                                return updated;
                              });
                              setVitalSignValues(prev => {
                                const updated = { ...prev };
                                delete updated[item.vital_sign_id];
                                return updated;
                              });
                            }}
                            sx={{ color: '#f44336' }}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    )}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      {/* Empty State */}
      {getAllVitalSigns().length === 0 && (
        <Card sx={{ p: 3, textAlign: 'center', backgroundColor: '#fafafa' }}>
          <HeartIcon sx={{ fontSize: 48, color: '#ccc', mb: 1 }} />
          <Typography variant="body1" color="text.secondary">
            No hay signos vitales disponibles.
          </Typography>
        </Card>
      )}
    </Box>
  );
};

export default VitalSignsSection;
