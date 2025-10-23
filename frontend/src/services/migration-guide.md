# 🔄 API Services Migration Guide

## Overview
The monolithic `api.ts` file has been refactored into domain-specific services for better maintainability and organization.

## New Structure

```
src/services/
├── base/
│   └── ApiBase.ts              # Base class with common functionality
├── auth/
│   └── AuthService.ts          # Authentication operations
├── patients/
│   └── PatientService.ts      # Patient management
├── appointments/
│   └── AppointmentService.ts   # Appointment management
├── consultations/
│   └── ConsultationService.ts  # Consultation management
├── ApiService.ts               # Main service aggregator
├── index.ts                    # Exports
└── __tests__/                  # Unit tests
```

## Migration Steps

### 1. Update Imports

**Before:**
```typescript
import { apiService } from '../services/api';
```

**After:**
```typescript
import { apiService } from '../services';
// or
import { apiService } from '../services/ApiService';
```

### 2. Update Service Calls

**Before:**
```typescript
// Old monolithic approach
const patients = await apiService.getPatients();
const appointments = await apiService.getAppointments();
```

**After:**
```typescript
// New domain-specific approach
const patients = await apiService.patients.getPatients();
const appointments = await apiService.appointments.getAppointments();
```

### 3. Service-Specific Usage

**Authentication:**
```typescript
import { AuthService } from '../services/auth/AuthService';

const authService = new AuthService();
await authService.login(credentials);
```

**Patients:**
```typescript
import { PatientService } from '../services/patients/PatientService';

const patientService = new PatientService();
await patientService.createPatient(patientData);
```

**Appointments:**
```typescript
import { AppointmentService } from '../services/appointments/AppointmentService';

const appointmentService = new AppointmentService();
await appointmentService.getAvailableTimes(doctorId, date);
```

**Consultations:**
```typescript
import { ConsultationService } from '../services/consultations/ConsultationService';

const consultationService = new ConsultationService();
await consultationService.createConsultation(consultationData);
```

## Benefits

### 1. **Better Organization**
- Each service handles a specific domain
- Easier to find and maintain code
- Clear separation of concerns

### 2. **Improved Testability**
- Individual services can be tested in isolation
- Mock specific services without affecting others
- Better test coverage and reliability

### 3. **Enhanced Maintainability**
- Smaller, focused files
- Easier to understand and modify
- Reduced cognitive load

### 4. **Better Performance**
- Tree-shaking friendly
- Import only what you need
- Smaller bundle sizes

### 5. **Type Safety**
- Better TypeScript support
- Domain-specific types
- Improved IntelliSense

## Backward Compatibility

The main `apiService` instance maintains the same interface:

```typescript
// Still works the same way
const patients = await apiService.patients.getPatients();
const appointments = await apiService.appointments.getAppointments();
```

## Testing

Each service has comprehensive unit tests:

```typescript
import { AuthService } from '../services/auth/AuthService';

describe('AuthService', () => {
  // Test authentication functionality
});
```

## Error Handling

All services inherit from `ApiBase` which provides:
- Consistent error handling
- Request/response interceptors
- Automatic token management
- Detailed error logging

## Future Enhancements

- Add caching layer
- Implement offline support
- Add request/response transformers
- Include retry logic
- Add request queuing
