# Plan de Refactorización: AppointmentDialog.tsx

## Objetivo
Reducir AppointmentDialog.tsx de 1,341 líneas a ~250-300 líneas mediante:
1. Extracción de lógica a hooks personalizados
2. Uso completo de sub-componentes existentes
3. Creación de nuevos sub-componentes para creación inline de pacientes
4. Separación clara de responsabilidades

## Análisis Actual

### Componentes Sub-existentes (ya creados)
- `AppointmentTypeSection.tsx` - Selección de tipo de cita
- `DateTimeSection.tsx` - Selección de fecha y hora
- `NotesSection.tsx` - Notas e instrucciones
- `AutoReminderSection.tsx` - Configuración de recordatorios automáticos
- `AppointmentActions.tsx` - Botones de acción (Guardar/Cancelar)
- `PatientSelector.tsx` - Selector de pacientes existentes (no usado actualmente)

### Lógica a Extraer (23 hooks actuales)
1. **Estado del formulario** - localFormData, selectedDate, selectedTime, validationError
2. **Carga de horarios disponibles** - loadAvailableTimes, availableTimes, loadingTimes
3. **Manejo de pacientes** - selectedPatient, handlePatientChange, creación inline de pacientes
4. **Datos de nuevo paciente** - newPatientData, personalDocument, showAdvancedPatientData
5. **Catálogos** - countries, states, birthStates, emergencyRelationships, appointmentTypes, offices
6. **Validación compleja** - isFormComplete, getValidationErrorMessage, areAppointmentFieldsEnabled
7. **Submit con creación inline** - handleSubmit con lógica de crear paciente si es "primera vez"
8. **Inicialización** - múltiples useEffect para inicializar datos

## Implementación

### Fase 1: Crear Hook Principal de Citas

**Archivo**: `frontend/src/hooks/useAppointmentForm.ts`

Extraer toda la lógica de estado y negocio:

- **Estado del formulario**: localFormData, errors, loading, validationError
- **Horarios disponibles**: availableTimes, loadingTimes, loadAvailableTimes, selectedDate, selectedTime
- **Paciente**: selectedPatient, newPatientData, personalDocument, showAdvancedPatientData
- **Catálogos**: countries, states, birthStates, emergencyRelationships, appointmentTypes, offices
- **Validación**: isFormComplete, getValidationErrorMessage, areAppointmentFieldsEnabled, isPatientSelectionEnabled
- **Handlers**: handleDateChange, handleTimeChange, handlePatientChange, handleFieldChange, handleNewPatientFieldChange, handleNewPatientCountryChange
- **Submit**: handleSubmit con lógica de creación inline de pacientes
- **Utilidades**: formatTimeToAMPM, calculateAge, formatPatientNameWithAge, isReadOnly

**Interfaz del hook**:
```typescript
interface UseAppointmentFormReturn {
  // Form state
  localFormData: AppointmentFormData;
  setLocalFormData: (data: AppointmentFormData) => void;
  validationError: string;
  setValidationError: (error: string) => void;
  loading: boolean;
  
  // Time management
  availableTimes: any[];
  loadingTimes: boolean;
  selectedDate: string;
  selectedTime: string;
  
  // Patient state
  selectedPatient: Patient | null;
  newPatientData: any;
  personalDocument: { document_id: number | null; document_value: string };
  setPersonalDocument: (doc: any) => void;
  showAdvancedPatientData: boolean;
  setShowAdvancedPatientData: (show: boolean) => void;
  
  // Catalog data
  countries: any[];
  states: any[];
  birthStates: any[];
  emergencyRelationships: any[];
  appointmentTypes: AppointmentType[];
  offices: Office[];
  
  // Handlers
  handleDateChange: (date: string) => void;
  handleTimeChange: (time: string) => void;
  handlePatientChange: (patient: Patient | null) => void;
  handleFieldChange: (field: keyof AppointmentFormData) => (event: any) => void;
  handleNewPatientFieldChange: (field: string, value: string) => void;
  handleNewPatientCountryChange: (field: string, countryId: string) => Promise<void>;
  handleSubmit: () => Promise<void>;
  
  // Validation
  isFormComplete: () => boolean;
  getValidationErrorMessage: () => string;
  areAppointmentFieldsEnabled: () => boolean;
  isPatientSelectionEnabled: () => boolean;
  getFieldError: (field: string) => string;
  hasFieldError: (field: string) => boolean;
  
  // Utilities
  formatTimeToAMPM: (timeString: string) => string;
  formatPatientNameWithAge: (patient: Patient) => string;
  isReadOnly: boolean;
  computedIsEditing: boolean;
}
```

### Fase 2: Crear Hook de Creación Inline de Pacientes

**Archivo**: `frontend/src/hooks/useInlinePatientCreation.ts`

Extraer lógica de creación inline de pacientes:

- **Estado**: newPatientData, personalDocument, showAdvancedPatientData
- **Catálogos**: countries, states, birthStates, emergencyRelationships (carga)
- **Handlers**: handleNewPatientFieldChange, handleNewPatientCountryChange, resetNewPatientData
- **Validación**: validateNewPatientData

### Fase 3: Crear Sub-componente de Creación Inline de Pacientes

**Archivo**: `frontend/src/components/dialogs/AppointmentDialog/InlinePatientCreation.tsx`

Nuevo componente para el formulario de creación inline:

- **Props**: newPatientData, personalDocument, countries, states, birthStates, emergencyRelationships, handlers, showAdvancedPatientData
- **Responsabilidad**: Renderizar todo el formulario de creación inline de pacientes (actualmente ~350 líneas en el componente principal)

### Fase 4: Simplificar Componente Principal

**Archivo**: `frontend/src/components/dialogs/AppointmentDialog.tsx`

Refactorizar para usar el hook principal:

1. **Eliminar toda la lógica de estado** - usar useAppointmentForm
2. **Eliminar todos los useEffect** - mover a hook
3. **Simplificar handlers** - delegar a hook
4. **Estructura final**:
   ```typescript
   const AppointmentDialog = ({ open, onClose, onSubmit, ... }) => {
     const formHook = useAppointmentForm({
       formData,
       patients,
       isEditing,
       doctorProfile,
       onFormDataChange,
       onSubmit,
       onSuccess: () => onClose()
     });
     
     return (
       <Dialog>
         <DialogTitle>...</DialogTitle>
         <DialogContent>
           {/* Usar sub-componentes */}
           <AppointmentTypeSection {...formHook.appointmentTypeProps} />
           {formHook.shouldShowPatientSection && (
             formHook.shouldShowNewPatientForm ? (
               <InlinePatientCreation {...formHook.newPatientProps} />
             ) : (
               <PatientSelector {...formHook.patientSelectorProps} />
             )
           )}
           <DateTimeSection {...formHook.dateTimeProps} />
           <NotesSection {...formHook.notesProps} />
           <AutoReminderSection {...formHook.autoReminderProps} />
         </DialogContent>
         <DialogActions>
           <AppointmentActions {...formHook.actionsProps} />
         </DialogActions>
       </Dialog>
     );
   };
   ```

### Fase 5: Ajustar Sub-componentes Existentes

Asegurar que todos los sub-componentes reciban props correctamente estructuradas desde el hook:

1. **AppointmentTypeSection** - Props de tipo de cita y handlers
2. **DateTimeSection** - Props de fecha, hora, horarios disponibles
3. **NotesSection** - Props de notas y handlers
4. **AutoReminderSection** - Props de recordatorios y handlers
5. **AppointmentActions** - Props de acciones y handlers
6. **PatientSelector** - Props de paciente (si se decide usar este componente existente)

## Estructura Final

```
frontend/src/
├── hooks/
│   ├── useAppointmentForm.ts (NUEVO - ~600 líneas)
│   └── useInlinePatientCreation.ts (NUEVO - ~200 líneas, opcional)
│
├── components/dialogs/AppointmentDialog.tsx (REFACTORIZADO - ~250-300 líneas)
│
└── components/dialogs/AppointmentDialog/
    ├── AppointmentTypeSection.tsx (YA EXISTE - usar)
    ├── DateTimeSection.tsx (YA EXISTE - usar)
    ├── NotesSection.tsx (YA EXISTE - usar)
    ├── AutoReminderSection.tsx (YA EXISTE - usar)
    ├── AppointmentActions.tsx (YA EXISTE - usar)
    ├── PatientSelector.tsx (YA EXISTE - evaluar si usar)
    └── InlinePatientCreation.tsx (NUEVO - ~350 líneas)
```

## Reducción Esperada

- **AppointmentDialog.tsx**: De 1,341 líneas → ~250-300 líneas (78-80% reducción)
- **useAppointmentForm.ts**: ~600 líneas (nueva)
- **useInlinePatientCreation.ts**: ~200 líneas (nueva, opcional)
- **InlinePatientCreation.tsx**: ~350 líneas (nueva)
- **Total**: Similar tamaño pero mejor organizado y mantenible

## Orden de Implementación

1. Crear `useAppointmentForm.ts` extrayendo toda la lógica
2. Crear `InlinePatientCreation.tsx` extrayendo el formulario de creación inline
3. Crear `useInlinePatientCreation.ts` (opcional - puede integrarse en useAppointmentForm)
4. Refactorizar `AppointmentDialog.tsx` para usar los hooks
5. Ajustar props de sub-componentes si es necesario
6. Eliminar código duplicado y comentarios obsoletos
7. Testing manual del flujo completo

## Validación

- [ ] Formulario de nueva cita funciona
- [ ] Edición de cita existente funciona
- [ ] Creación inline de paciente funciona (primera vez)
- [ ] Selección de paciente existente funciona (seguimiento)
- [ ] Carga de horarios disponibles funciona
- [ ] Validación funciona correctamente
- [ ] Submit guarda todo correctamente
- [ ] Recordatorios automáticos se configuran
- [ ] No hay regresiones visuales

## Notas Especiales

1. **Creación Inline de Pacientes**: Esta es una funcionalidad compleja que puede extraerse a un hook separado o mantenerse en useAppointmentForm dependiendo de la complejidad.

2. **Validación Compleja**: La validación tiene lógica condicional basada en appointment_type, debe manejarse cuidadosamente.

3. **Horarios Disponibles**: La carga de horarios requiere manejo de estados de carga y errores.

4. **Read-Only Logic**: La lógica de solo lectura para citas canceladas debe preservarse.

