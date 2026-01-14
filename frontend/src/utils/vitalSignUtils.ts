import {
  Favorite as HeartIcon,
  Thermostat as ThermostatIcon,
  Scale as ScaleIcon,
  Height as HeightIcon,
  MonitorHeart as MonitorHeartIcon,
  LocalHospital as HospitalIcon
} from '@mui/icons-material';

// Constantes para colores de signos vitales
export const VITAL_SIGN_COLORS = {
  HEART: '#f44336',
  TEMPERATURE: '#ff9800',
  WEIGHT: '#4caf50',
  HEIGHT: '#2196f3',
  PRESSURE: '#9c27b0',
  DEFAULT: '#607d8b'
} as const;

// Constantes para unidades automáticas
export const VITAL_SIGN_UNITS = {
  HEIGHT: 'cm',
  WEIGHT: 'kg',
  BMI: 'kg/m²',
  TEMPERATURE: '°C',
  PRESSURE: 'mmHg',
  HEART_RATE: 'bpm'
} as const;

// Constantes para IDs temporales
export const TEMP_IDS = {
  CONSULTATION: 'temp_consultation',
  PATIENT: 'temp_patient'
} as const;

/**
 * Obtiene el icono apropiado para un signo vital basado en su nombre
 */
export const getVitalSignIcon = (name: string) => {
  const lowerName = name.toLowerCase();
  
  if (lowerName.includes('cardíaca') || lowerName.includes('cardiac')) {
    return HeartIcon;
  }
  if (lowerName.includes('temperatura')) {
    return ThermostatIcon;
  }
  if (lowerName.includes('peso')) {
    return ScaleIcon;
  }
  if (lowerName.includes('estatura') || lowerName.includes('altura')) {
    return HeightIcon;
  }
  if (lowerName.includes('presión') || lowerName.includes('presion')) {
    return MonitorHeartIcon;
  }
  
  return HospitalIcon;
};

/**
 * Obtiene el color apropiado para un signo vital basado en su nombre
 */
export const getVitalSignColor = (name: string): string => {
  const lowerName = name.toLowerCase();
  
  if (lowerName.includes('cardíaca') || lowerName.includes('cardiac')) {
    return VITAL_SIGN_COLORS.HEART;
  }
  if (lowerName.includes('temperatura')) {
    return VITAL_SIGN_COLORS.TEMPERATURE;
  }
  if (lowerName.includes('peso')) {
    return VITAL_SIGN_COLORS.WEIGHT;
  }
  if (lowerName.includes('estatura') || lowerName.includes('altura')) {
    return VITAL_SIGN_COLORS.HEIGHT;
  }
  if (lowerName.includes('presión') || lowerName.includes('presion')) {
    return VITAL_SIGN_COLORS.PRESSURE;
  }
  
  return VITAL_SIGN_COLORS.DEFAULT;
};

/**
 * Obtiene la unidad automática para un signo vital basado en su nombre
 */
export const getVitalSignUnit = (name: string): string => {
  const lowerName = name.toLowerCase();
  
  if (lowerName.includes('altura') || lowerName.includes('estatura')) {
    return VITAL_SIGN_UNITS.HEIGHT;
  }
  if (lowerName.includes('peso')) {
    return VITAL_SIGN_UNITS.WEIGHT;
  }
  if (lowerName.includes('imc') || lowerName.includes('índice de masa corporal') || lowerName.includes('bmi')) {
    return VITAL_SIGN_UNITS.BMI;
  }
  if (lowerName.includes('temperatura')) {
    return VITAL_SIGN_UNITS.TEMPERATURE;
  }
  if (lowerName.includes('presión') || lowerName.includes('tensión')) {
    return VITAL_SIGN_UNITS.PRESSURE;
  }
  if (lowerName.includes('cardíaca') || lowerName.includes('cardiac') || lowerName.includes('frecuencia')) {
    return VITAL_SIGN_UNITS.HEART_RATE;
  }
  
  return '';
};

/**
 * Determina si un campo de unidad debe ser de solo lectura
 */
export const isVitalSignUnitReadOnly = (name: string): boolean => {
  const lowerName = name.toLowerCase();
  
  return lowerName.includes('altura') || 
         lowerName.includes('estatura') || 
         lowerName.includes('peso') || 
         lowerName.includes('imc') || 
         lowerName.includes('índice de masa corporal') || 
         lowerName.includes('bmi') ||
         lowerName.includes('temperatura') ||
         lowerName.includes('presión') ||
         lowerName.includes('tensión') ||
         lowerName.includes('cardíaca') ||
         lowerName.includes('cardiac') ||
         lowerName.includes('frecuencia');
};
