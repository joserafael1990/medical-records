/**
 * Sistema de mensajes humanizados con contexto médico
 * Mejora la UX al proporcionar mensajes empáticos y específicos del entorno médico
 */

export type MedicalContext = 
  | 'emergency'
  | 'routine'
  | 'administrative'
  | 'consultation'
  | 'prescription'
  | 'patient_care'
  | 'diagnostic'
  | 'surgical'
  | 'pediatric'
  | 'geriatric';

export type ErrorSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';

export interface HumanizedErrorMessage {
  title: string;
  message: string;
  action: string;
  alternative?: string;
  empathy?: string;
  medicalGuidance?: string;
  urgencyLevel?: 'immediate' | 'soon' | 'when_possible';
  icon?: string;
}

export interface ErrorContext {
  medicalContext: MedicalContext;
  severity: ErrorSeverity;
  userRole?: 'doctor' | 'nurse' | 'admin' | 'receptionist';
  timeOfDay?: 'morning' | 'afternoon' | 'evening' | 'night';
  patientPresent?: boolean;
  isUrgent?: boolean;
  retryCount?: number;
}

// Mensajes base por contexto médico
const CONTEXT_MESSAGES = {
  emergency: {
    empathy: "Entendemos que esto es urgente y cada segundo cuenta.",
    urgencyPrefix: "🚨 Situación de Emergencia",
    supportContact: "Soporte de emergencia: Ext. 911",
    medicalGuidance: "Si es crítico para la atención del paciente, proceda manualmente y reporte el incidente."
  },
  routine: {
    empathy: "Sabemos que tu tiempo es valioso y esto puede ser frustrante.",
    urgencyPrefix: "📋 Consulta de Rutina",
    supportContact: "Soporte técnico: Ext. 101",
    medicalGuidance: "Puedes continuar con otros pacientes mientras se resuelve este problema."
  },
  consultation: {
    empathy: "Comprendemos que estás en medio de una consulta importante.",
    urgencyPrefix: "👨‍⚕️ Durante Consulta",
    supportContact: "Asistencia inmediata: Ext. 102",
    medicalGuidance: "Considera usar notas en papel temporalmente para no interrumpir la atención."
  },
  patient_care: {
    empathy: "Tu prioridad es el cuidado del paciente, trabajemos juntos para resolver esto.",
    urgencyPrefix: "💙 Atención al Paciente",
    supportContact: "Soporte clínico: Ext. 103",
    medicalGuidance: "La seguridad del paciente es primero. No dudes en solicitar ayuda adicional."
  },
  prescription: {
    empathy: "Entendemos que los medicamentos son críticos para la salud del paciente.",
    urgencyPrefix: "💊 Prescripción Médica",
    supportContact: "Farmacia clínica: Ext. 104",
    medicalGuidance: "Para prescripciones urgentes, utiliza el formulario manual de respaldo."
  },
  administrative: {
    empathy: "Los procesos administrativos son importantes para el funcionamiento óptimo.",
    urgencyPrefix: "📊 Gestión Administrativa",
    supportContact: "Administración: Ext. 105",
    medicalGuidance: "Puedes proceder con otras tareas mientras se resuelve."
  },
  diagnostic: {
    empathy: "Entendemos que los estudios diagnósticos son críticos para el diagnóstico.",
    urgencyPrefix: "🔬 Estudios Diagnósticos",
    supportContact: "Laboratorio: Ext. 106",
    medicalGuidance: "Para estudios urgentes, contacta directamente al laboratorio."
  },
  surgical: {
    empathy: "Las intervenciones quirúrgicas requieren la máxima precisión y soporte.",
    urgencyPrefix: "🏥 Procedimiento Quirúrgico",
    supportContact: "Quirófano: Ext. 107",
    medicalGuidance: "Para procedimientos activos, usa protocolos de respaldo inmediatamente."
  },
  pediatric: {
    empathy: "El cuidado pediátrico requiere atención especializada y delicada.",
    urgencyPrefix: "👶 Pediatría",
    supportContact: "Pediatría: Ext. 108",
    medicalGuidance: "Para pacientes pediátricos, prioriza siempre la seguridad del menor."
  },
  geriatric: {
    empathy: "Los pacientes geriátricos necesitan cuidados especializados y paciencia.",
    urgencyPrefix: "👴 Geriatría",
    supportContact: "Geriatría: Ext. 109",
    medicalGuidance: "Considera las comorbilidades y fragilidad del paciente geriátrico."
  }
};

// Mensajes específicos por tipo de error
const ERROR_TYPE_MESSAGES = {
  network: {
    title: "Problema de Conectividad",
    message: "No pudimos conectar con el servidor médico.",
    technicalCause: "Error de red o servidor no disponible",
    patientImpact: "bajo",
    recovery: "automática en 30 segundos"
  },
  validation: {
    title: "Información Médica Incompleta",
    message: "Algunos datos clínicos necesitan tu atención.",
    technicalCause: "Validación de campos obligatorios",
    patientImpact: "ninguno",
    recovery: "completar campos marcados"
  },
  permission: {
    title: "Autorización Requerida",
    message: "Esta acción necesita permisos adicionales.",
    technicalCause: "Nivel de acceso insuficiente",
    patientImpact: "mínimo",
    recovery: "contactar supervisor"
  },
  database: {
    title: "Problema con Registros Médicos",
    message: "Dificultad temporal accediendo a la base de datos.",
    technicalCause: "Error de base de datos",
    patientImpact: "medio",
    recovery: "reintento automático en curso"
  }
};

// Frases empáticas por hora del día
const TIME_BASED_EMPATHY = {
  morning: "Sabemos que las mañanas pueden ser intensas.",
  afternoon: "Entendemos que las tardes están llenas de consultas.",
  evening: "Reconocemos que al final del día puede ser más frustrante.",
  night: "Comprendemos que trabajar de noche ya es desafiante."
};

// Ajustes por rol del usuario
const ROLE_ADJUSTMENTS = {
  doctor: {
    title: "Dr./Dra.",
    focus: "Tu expertise médica es fundamental, trabajemos para que puedas seguir atendiendo pacientes.",
    escalation: "escalación a jefe de sistemas médicos"
  },
  nurse: {
    title: "Enfermero/a",
    focus: "Tu cuidado directo al paciente es esencial, resolvamos esto rápidamente.",
    escalation: "escalación a supervisión de enfermería"
  },
  admin: {
    title: "Administrador/a",
    focus: "Los procesos administrativos son la base del buen funcionamiento.",
    escalation: "escalación a dirección administrativa"
  },
  receptionist: {
    title: "Recepcionista",
    focus: "Tu atención al público es muy importante, busquemos una solución inmediata.",
    escalation: "escalación a jefe de área"
  }
};

export class MedicalErrorMessageBuilder {
  private context: ErrorContext;
  private errorType: string;
  private originalError: any;

  constructor(context: ErrorContext, errorType: string, originalError?: any) {
    this.context = context;
    this.errorType = errorType;
    this.originalError = originalError;
  }

  build(): HumanizedErrorMessage {
    const baseContext = CONTEXT_MESSAGES[this.context.medicalContext];
    const errorInfo = ERROR_TYPE_MESSAGES[this.errorType as keyof typeof ERROR_TYPE_MESSAGES];
    const roleInfo = this.context.userRole ? ROLE_ADJUSTMENTS[this.context.userRole] : null;
    const timeEmpathy = this.context.timeOfDay ? TIME_BASED_EMPATHY[this.context.timeOfDay] : null;

    // Construir título humanizado
    const title = this.buildTitle(baseContext, errorInfo, roleInfo);
    
    // Construir mensaje principal
    const message = this.buildMessage(baseContext, errorInfo, timeEmpathy);
    
    // Construir acción recomendada
    const action = this.buildAction(baseContext, errorInfo);
    
    // Construir alternativa
    const alternative = this.buildAlternative(baseContext, roleInfo);
    
    // Construir empathy message
    const empathy = this.buildEmpathy(baseContext, timeEmpathy, roleInfo);
    
    // Construir guía médica
    const medicalGuidance = this.buildMedicalGuidance(baseContext, errorInfo);

    return {
      title,
      message,
      action,
      alternative,
      empathy,
      medicalGuidance,
      urgencyLevel: this.determineUrgencyLevel(),
      icon: this.getContextIcon()
    };
  }

  private buildTitle(baseContext: any, errorInfo: any, roleInfo: any): string {
    let title = baseContext.urgencyPrefix;
    
    if (errorInfo?.title) {
      title += ` - ${errorInfo.title}`;
    }
    
    if (this.context.retryCount && this.context.retryCount > 1) {
      title += ` (Intento ${this.context.retryCount})`;
    }

    return title;
  }

  private buildMessage(baseContext: any, errorInfo: any, timeEmpathy: string | null): string {
    let message = errorInfo?.message || "Ha ocurrido un problema técnico.";
    
    if (this.context.patientPresent) {
      message += " Tu paciente está esperando, priorizemos una solución rápida.";
    }
    
    if (timeEmpathy) {
      message += ` ${timeEmpathy}`;
    }

    // Añadir contexto específico si es necesario
    if (this.context.isUrgent) {
      message += " Este problema requiere atención inmediata.";
    }

    return message;
  }

  private buildAction(baseContext: any, errorInfo: any): string {
    const baseActions = {
      emergency: "Buscar solución inmediata",
      routine: "Intentar nuevamente",
      consultation: "Continuar sin interrumpir",
      patient_care: "Priorizar al paciente",
      prescription: "Usar método alternativo",
      administrative: "Proceder manualmente",
      diagnostic: "Contactar laboratorio",
      surgical: "Usar protocolo de respaldo",
      pediatric: "Priorizar seguridad del menor",
      geriatric: "Considerar fragilidad del paciente"
    };

    let action = baseActions[this.context.medicalContext] || "Reintentar";

    if (this.context.retryCount && this.context.retryCount >= 2) {
      action = "Contactar soporte técnico";
    }

    return action;
  }

  private buildAlternative(baseContext: any, roleInfo: any): string | undefined {
    if (this.context.medicalContext === 'emergency') {
      return baseContext.supportContact;
    }

    if (this.context.severity === 'critical') {
      return `${baseContext.supportContact} - ${roleInfo?.escalation || 'escalación disponible'}`;
    }

    return baseContext.supportContact;
  }

  private buildEmpathy(baseContext: any, timeEmpathy: string | null, roleInfo: any): string {
    let empathy = baseContext.empathy;
    
    if (roleInfo?.focus) {
      empathy += ` ${roleInfo.focus}`;
    }
    
    if (this.context.retryCount && this.context.retryCount > 2) {
      empathy += " Entendemos que esto ya se ha repetido varias veces y puede ser muy frustrante.";
    }

    return empathy;
  }

  private buildMedicalGuidance(baseContext: any, errorInfo: any): string {
    let guidance = baseContext.medicalGuidance;
    
    if (errorInfo?.recovery) {
      guidance += ` Tiempo estimado de resolución: ${errorInfo.recovery}.`;
    }
    
    if (this.context.medicalContext === 'prescription' && this.context.isUrgent) {
      guidance += " Para medicamentos de urgencia, contacta inmediatamente a farmacia.";
    }

    return guidance;
  }

  private determineUrgencyLevel(): 'immediate' | 'soon' | 'when_possible' {
    if (this.context.medicalContext === 'emergency' || this.context.isUrgent) {
      return 'immediate';
    }
    
    if (this.context.medicalContext === 'consultation' || this.context.patientPresent) {
      return 'soon';
    }
    
    return 'when_possible';
  }

  private getContextIcon(): string {
    const icons = {
      emergency: '🚨',
      routine: '📋',
      consultation: '👨‍⚕️',
      patient_care: '💙',
      prescription: '💊',
      administrative: '📊',
      diagnostic: '🔬',
      surgical: '⚕️',
      pediatric: '👶',
      geriatric: '👵'
    };

    return icons[this.context.medicalContext] || '⚠️';
  }
}

// Función helper para crear mensajes humanizados
export const createHumanizedErrorMessage = (
  errorType: string,
  context: ErrorContext,
  originalError?: any
): HumanizedErrorMessage => {
  const builder = new MedicalErrorMessageBuilder(context, errorType, originalError);
  return builder.build();
};

// Función para detectar contexto médico automáticamente
export const detectMedicalContext = (
  currentLocation: string,
  userRole?: string,
  timeOfDay?: string
): Partial<ErrorContext> => {
  let medicalContext: MedicalContext = 'routine';
  let isUrgent = false;

  // Detectar contexto por URL
  if (currentLocation.includes('/emergency') || currentLocation.includes('/urgent')) {
    medicalContext = 'emergency';
    isUrgent = true;
  } else if (currentLocation.includes('/consultation')) {
    medicalContext = 'consultation';
  } else if (currentLocation.includes('/prescription')) {
    medicalContext = 'prescription';
  } else if (currentLocation.includes('/admin')) {
    medicalContext = 'administrative';
  } else if (currentLocation.includes('/patient')) {
    medicalContext = 'patient_care';
  }

  // Detectar hora del día
  const currentHour = new Date().getHours();
  let detectedTimeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
  
  if (currentHour >= 6 && currentHour < 12) {
    detectedTimeOfDay = 'morning';
  } else if (currentHour >= 12 && currentHour < 18) {
    detectedTimeOfDay = 'afternoon';
  } else if (currentHour >= 18 && currentHour < 22) {
    detectedTimeOfDay = 'evening';
  } else {
    detectedTimeOfDay = 'night';
  }

  return {
    medicalContext,
    isUrgent,
    timeOfDay: timeOfDay as any || detectedTimeOfDay,
    userRole: userRole as any
  };
};

export default MedicalErrorMessageBuilder;

