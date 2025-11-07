# 🔄 Mejoras Recomendadas para Cursor Rules

## Basadas en el Refactor Completo Realizado

### 📋 Resumen de Cambios Implementados

1. **Modularización de API Services** - De `api.ts` monolítico a servicios modulares por dominio
2. **Estructura de Servicios** - `ApiBase` como clase base + servicios específicos
3. **Logging Estandarizado** - Uso de `logger` con categorías
4. **Refactorización de Componentes** - Componentes grandes divididos en componentes más pequeños
5. **Hooks Personalizados** - Múltiples hooks creados para lógica reutilizable

---

## 🎯 CAMBIOS RECOMENDADOS EN CURSOR RULES

### 1. **SECCIÓN: API SERVICES ARCHITECTURE** (NUEVA)

```markdown
## 🔌 API SERVICES - Arquitectura Modular

### Estructura de Servicios
**NUNCA** crear métodos API directamente en componentes o hooks.
**SIEMPRE** usar servicios modulares organizados por dominio.

### Estructura de Archivos
```
frontend/src/services/
├── base/
│   └── ApiBase.ts              # Clase base con interceptores y manejo de errores
├── auth/
│   └── AuthService.ts          # Autenticación, login, registro, password reset
├── patients/
│   └── PatientService.ts       # Gestión de pacientes
├── appointments/
│   └── AppointmentService.ts   # Gestión de citas
├── consultations/
│   └── ConsultationService.ts  # Gestión de consultas
├── catalogs/
│   └── CatalogService.ts       # Catálogos (especialidades, países, estados)
├── documents/
│   └── DocumentService.ts      # Gestión de documentos
├── clinical-studies/
│   └── ClinicalStudyService.ts # Estudios clínicos
├── doctors/
│   └── DoctorService.ts       # Perfiles de doctores
├── offices/
│   └── OfficeService.ts       # Gestión de consultorios
├── whatsapp/
│   └── WhatsAppService.ts      # Notificaciones WhatsApp
├── ApiService.ts               # Agregador principal
└── index.ts                    # Exportaciones centralizadas
```

### Reglas de Importación
```typescript
// ✅ CORRECTO - Importar desde index.ts
import { apiService } from '../services';
// o
import { apiService } from '../services/ApiService';

// ✅ CORRECTO - Importar servicio específico si se necesita instanciar
import { AuthService } from '../services/auth/AuthService';

// ❌ INCORRECTO - NO usar api.ts antiguo
import { apiService } from '../services/api';
```

### Uso de Servicios
```typescript
// ✅ CORRECTO - Usar servicios modulares
const patients = await apiService.patients.getPatients();
const appointments = await apiService.appointments.getAppointments();
await apiService.auth.login({ email, password });

// ✅ CORRECTO - Para endpoints genéricos, usar api directo
const response = await apiService.consultations.api.get('/api/custom-endpoint');
const response = await apiService.patients.api.post('/api/custom-endpoint', data);

// ❌ INCORRECTO - NO usar métodos genéricos del apiService principal
await apiService.get('/api/patients'); // ❌
await apiService.post('/api/patients', data); // ❌
```

### Crear Nuevo Servicio
1. Crear clase que extienda `ApiBase`
2. Ubicar en `frontend/src/services/{domain}/`
3. Nombre: `{Domain}Service.ts` (ej: `InvoiceService.ts`)
4. Agregar al `ApiService.ts` como propiedad pública
5. Exportar en `index.ts`
6. Ejemplo:

```typescript
// frontend/src/services/invoices/InvoiceService.ts
import { ApiBase } from '../base/ApiBase';
import { logger } from '../../utils/logger';

export class InvoiceService extends ApiBase {
  async getInvoices(): Promise<Invoice[]> {
    try {
      logger.debug('Fetching invoices', undefined, 'api');
      const response = await this.api.get<Invoice[]>('/api/invoices');
      logger.debug('Invoices fetched successfully', undefined, 'api');
      return response.data;
    } catch (error: any) {
      logger.error('Failed to fetch invoices', error, 'api');
      throw error;
    }
  }
}
```

### Logging en Servicios
**SIEMPRE** usar `logger` con categoría apropiada:
```typescript
// ✅ CORRECTO
logger.debug('Fetching data', { id }, 'api');
logger.error('Failed to fetch data', error, 'api');

// ❌ INCORRECTO - NO usar console.log directamente
console.log('Fetching data'); // ❌
```

### Manejo de Errores
Todos los servicios heredan de `ApiBase` que maneja:
- Interceptores de request/response
- Manejo automático de tokens
- Transformación de errores
- Logging de errores
- Manejo de 401/403 (expiración de sesión)

**NO** crear manejo de errores personalizado en servicios, usar el de `ApiBase`.
```

---

### 2. **ACTUALIZAR: FRONTEND RULES - Component Structure**

```markdown
### Component Structure
- Use functional components with hooks
- **Maximum component length: 300 lines**
- **If component exceeds 300 lines → split into smaller components**
- Extract complex logic to custom hooks
- One component per file
- Follow the pattern used in `RegisterView.tsx` and `ConsultationDialog.tsx`:
  - Split large components by logical sections (steps, tabs, sections)
  - Create subdirectories for component groups
  - Keep parent component focused on orchestration
  - Example structure:
    ```
    components/
      dialogs/
        ConsultationDialog/
          ├── ConsultationDialog.tsx       # Main orchestrator
          ├── ConsultationBasicInfo.tsx    # Section component
          ├── ConsultationActions.tsx      # Action buttons
          └── ConsultationDiagnosis.tsx    # Diagnosis section
    ```
```

---

### 3. **ACTUALIZAR: FRONTEND RULES - Custom Hooks Pattern**

```markdown
### Custom Hooks Pattern
- Create custom hooks for business logic
- Prefix with `use` (e.g., `usePrescriptions`, `useScrollToError`)
- Hooks should manage state and side effects
- Keep components focused on rendering
- **Hooks should use modular services, NOT direct API calls**
- Example pattern:

```typescript
// ✅ CORRECTO - Hook usando servicios modulares
export const usePrescriptions = (consultationId: number) => {
  const [prescriptions, setPrescriptions] = useState([]);
  
  const fetchPrescriptions = useCallback(async () => {
    const data = await apiService.consultations.api.get(
      `/api/consultations/${consultationId}/prescriptions`
    );
    setPrescriptions(data);
  }, [consultationId]);
  
  return { prescriptions, fetchPrescriptions };
};

// ❌ INCORRECTO - NO hacer llamadas API directas en hooks
export const usePrescriptions = (consultationId: number) => {
  const [prescriptions, setPrescriptions] = useState([]);
  
  useEffect(() => {
    fetch(`/api/consultations/${consultationId}/prescriptions`) // ❌
      .then(res => res.json())
      .then(setPrescriptions);
  }, [consultationId]);
};
```
```

---

### 4. **ACTUALIZAR: BACKEND RULES - API Endpoints**

```markdown
### API Endpoints
- Always use async def for endpoints
- Always include type hints
- Use Depends() for dependency injection
- Authentication required for all medical data endpoints
- Use `get_current_user` dependency for auth
- **Service layer pattern: Extract complex logic to service files**
- **Keep endpoints thin - delegate to service layer**
- Maximum endpoint length: 50 lines
- If endpoint exceeds 50 lines → refactor to service layer
```

---

### 5. **NUEVA SECCIÓN: Logging Standards**

```markdown
## 📝 LOGGING STANDARDS

### Logger Utility
**SIEMPRE** usar `logger` de `utils/logger.ts` en lugar de `console.log`.

### Categorías de Logging
- `'api'` - Para operaciones de API
- `'auth'` - Para autenticación
- `'ui'` - Para interacciones de UI
- `'error'` - Para errores críticos

### Uso Correcto
```typescript
// ✅ CORRECTO
import { logger } from '../utils/logger';

logger.debug('Fetching patients', { filters }, 'api');
logger.error('Failed to fetch patients', error, 'api');
logger.auth.info('Login attempt', { email });

// ❌ INCORRECTO
console.log('Fetching patients'); // ❌
console.error('Error:', error); // ❌
```

### Niveles de Logging
- `logger.debug()` - Información de depuración
- `logger.info()` - Información general
- `logger.warning()` - Advertencias
- `logger.error()` - Errores que requieren atención
```

---

### 6. **ACTUALIZAR: Code Quality Standards**

```markdown
### Code Quality Standards
- **Maximum function length:** 100 lines
- **Maximum component length:** 300 lines
- **Maximum service method length:** 50 lines
- If endpoint exceeds 50 lines → refactor to service layer
- If component exceeds 300 lines → split into smaller components
- If function exceeds 100 lines → split into smaller functions
- Avoid code duplication - create helpers instead
- Use descriptive function names that explain intent
- **Extract complex logic to service layer (backend) or custom hooks (frontend)**
```

---

### 7. **NUEVA SECCIÓN: Refactoring Patterns**

```markdown
## 🔄 REFACTORING PATTERNS

### When to Refactor
- Component > 300 lines → Split into sub-components
- Function > 100 lines → Split into smaller functions
- Endpoint > 50 lines → Extract to service layer
- Duplicate code in 3+ places → Extract to helper/utility
- Complex logic in component → Extract to custom hook

### Refactoring Large Components
1. Identify logical sections (steps, tabs, sections)
2. Create subdirectory: `ComponentName/`
3. Extract sections to separate components
4. Keep main component as orchestrator
5. Example: `RegisterView.tsx` → `RegisterView/` with step components

### Refactoring API Code
1. Identify domain (auth, patients, appointments, etc.)
2. Create service class extending `ApiBase`
3. Move related methods to service
4. Update imports in consuming code
5. Add to `ApiService.ts` aggregator
```

---

### 8. **ACTUALIZAR: File Structure**

```markdown
### File Structure
```
backend/
  - services/        # Service layer (consultation_service.py, etc.)
  - routes/          # API routers (diagnosis.py, etc.)
  - models/          # SQLAlchemy models (schedule.py, diagnosis.py)
  - migrations/      # Database migrations
  - main_clean_english.py  # Main FastAPI app

frontend/
  - src/
    - services/      # API services (modular structure)
      - base/        # ApiBase and common utilities
      - auth/        # AuthService
      - patients/    # PatientService
      - appointments/# AppointmentService
      - consultations/# ConsultationService
      - catalogs/    # CatalogService
      - documents/   # DocumentService
      - clinical-studies/# ClinicalStudyService
      - doctors/     # DoctorService
      - offices/     # OfficeService
      - whatsapp/    # WhatsAppService
      - ApiService.ts # Main aggregator
      - index.ts     # Exports
    - hooks/         # Custom React hooks
    - components/
      - common/      # Reusable components
      - dialogs/     # Modal dialogs
        - ConsultationDialog/  # Component subdirectory pattern
          - ConsultationDialog.tsx
          - ConsultationBasicInfo.tsx
          - ConsultationActions.tsx
      - layout/      # Layout components
```
```

---

### 9. **ACTUALIZAR: Anti-Patterns**

```markdown
## 🚫 ANTI-PATTERNS (NEVER DO)

### Code
- ❌ Hard-code "Dr." instead of using database title
- ❌ Create endpoints without authentication
- ❌ Leave debug endpoints in production
- ❌ Store sensitive data unencrypted
- ❌ Use `any` type in TypeScript
- ❌ Create functions longer than 100 lines
- ❌ Create components longer than 300 lines
- ❌ Duplicate logic instead of extracting to helper
- ❌ Use `console.log` instead of `logger`
- ❌ Import from `services/api.ts` (use `services/` instead)
- ❌ Make direct API calls in components (use services)
- ❌ Create service methods longer than 50 lines

### API Services
- ❌ Create new API methods in components or hooks
- ❌ Use direct axios calls instead of services
- ❌ Import from old `api.ts` file
- ❌ Create services that don't extend `ApiBase`
- ❌ Skip logging in service methods
- ❌ Create monolithic service files (>500 lines)
```

---

### 10. **NUEVA SECCIÓN: Migration Checklist**

```markdown
## 🔄 MIGRATION CHECKLIST

### Migrating from Old API to New Services
1. ✅ Update import: `from '../services/api'` → `from '../services'`
2. ✅ Update method calls: `apiService.getPatients()` → `apiService.patients.getPatients()`
3. ✅ Replace `console.log` with `logger.debug/error`
4. ✅ Verify error handling (handled by ApiBase)
5. ✅ Test the migrated code
6. ✅ Remove old `api.ts` references

### Creating New API Endpoint
1. ✅ Identify domain (auth, patients, appointments, etc.)
2. ✅ Find or create appropriate service
3. ✅ Add method to service extending `ApiBase`
4. ✅ Use `logger` for logging
5. ✅ Handle errors (inherited from `ApiBase`)
6. ✅ Export from `index.ts`
7. ✅ Update `ApiService.ts` if needed
```

---

## 📊 RESUMEN DE CAMBIOS PRINCIPALES

### Agregar:
1. ✅ Sección completa de "API Services Architecture"
2. ✅ Patrones de refactorización
3. ✅ Estándares de logging
4. ✅ Checklist de migración
5. ✅ Reglas para crear nuevos servicios

### Actualizar:
1. ✅ Estructura de archivos (servicios modulares)
2. ✅ Patrones de componentes (límite 300 líneas)
3. ✅ Patrones de hooks (usar servicios modulares)
4. ✅ Anti-patterns (agregar reglas de servicios)
5. ✅ Code quality (límites por tipo de código)

### Eliminar:
1. ❌ Referencias a `api.ts` monolítico
2. ❌ Ejemplos usando `console.log`
3. ❌ Patrones antiguos de API calls

---

## 🎯 PRIORIDADES

### Alta Prioridad (Implementar Primero)
1. Sección de API Services Architecture
2. Actualizar patrones de componentes
3. Actualizar anti-patterns

### Media Prioridad
4. Estándares de logging
5. Patrones de refactorización

### Baja Prioridad
6. Checklist de migración
7. Actualizar estructura de archivos

---

**Última actualización:** 2025-01-22
**Versión:** 2.0
**Estado:** Recomendaciones basadas en refactor completo

