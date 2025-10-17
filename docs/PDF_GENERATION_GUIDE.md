# Guía de Generación de PDFs - CORTEX

## Descripción General

El sistema CORTEX incluye funcionalidad completa para generar PDFs de recetas médicas y órdenes de estudios médicos con branding profesional de CORTEX.

## Características

### ✅ Funcionalidades Implementadas

- **Generación de Recetas Médicas**: PDFs completos con información del paciente, médico, consulta y medicamentos
- **Generación de Órdenes de Estudios**: PDFs con información del paciente, médico, consulta y estudios solicitados
- **Branding CORTEX**: Logo, colores corporativos y formato profesional
- **Información Completa**: Datos del paciente, médico, consulta, medicamentos/estudios
- **Formato Profesional**: Tablas organizadas, tipografía clara y estructura médica estándar

### 🎨 Branding CORTEX

- **Logo**: Texto "CORTEX" en azul corporativo
- **Subtitle**: "Sistema de Historias Clínicas"
- **Colores**: Azul (#0066CC) para elementos principales
- **Footer**: Información corporativa y fecha de generación

## Componentes Disponibles

### 1. PrintPrescriptionButton
Botón individual para generar recetas médicas.

```tsx
import { PrintPrescriptionButton } from '../components/common/PrintPrescriptionButton';

<PrintPrescriptionButton
  patient={patientInfo}
  doctor={doctorInfo}
  consultation={consultationInfo}
  medications={medicationsArray}
  variant="outlined"
  size="medium"
/>
```

### 2. PrintMedicalOrderButton
Botón individual para generar órdenes de estudios médicos.

```tsx
import { PrintMedicalOrderButton } from '../components/common/PrintMedicalOrderButton';

<PrintMedicalOrderButton
  patient={patientInfo}
  doctor={doctorInfo}
  consultation={consultationInfo}
  studies={studiesArray}
  variant="outlined"
  size="medium"
/>
```

### 3. PrintButtons (Recomendado)
Componente combinado que incluye ambos botones.

```tsx
import { PrintButtons } from '../components/common/PrintButtons';

<PrintButtons
  patient={patientInfo}
  doctor={doctorInfo}
  consultation={consultationInfo}
  medications={medicationsArray}
  studies={studiesArray}
  variant="outlined"
  size="medium"
  direction="row" // o "column"
  spacing={2}
  showDivider={true}
/>
```

## Interfaces de Datos

### PatientInfo
```typescript
interface PatientInfo {
  id: number;
  firstName: string;
  lastName: string;
  dateOfBirth?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
}
```

### DoctorInfo
```typescript
interface DoctorInfo {
  id: number;
  firstName: string;
  lastName: string;
  title?: string;
  specialty?: string;
  license?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
}
```

### ConsultationInfo
```typescript
interface ConsultationInfo {
  id: number;
  date: string;
  time: string;
  type: string;
  reason?: string;
  diagnosis?: string;
  notes?: string;
}
```

### MedicationInfo
```typescript
interface MedicationInfo {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions?: string;
  quantity?: number;
}
```

### StudyInfo
```typescript
interface StudyInfo {
  name: string;
  type: string;
  category?: string;
  description?: string;
  instructions?: string;
  urgency?: string;
}
```

## Uso en Consultas

Los botones de impresión se integran automáticamente en el diálogo de consulta cuando:
- La consulta está en modo edición
- La consulta ya está guardada en la base de datos
- Se muestran en la parte inferior del diálogo

## Ejemplo de Implementación

```tsx
import React from 'react';
import { PrintButtons } from '../components/common/PrintButtons';

const MyComponent = () => {
  const patientInfo = {
    id: 1,
    firstName: 'Juan',
    lastName: 'Pérez',
    dateOfBirth: '1985-03-15',
    phone: '+52 55 1234 5678',
    email: 'juan.perez@email.com',
    address: 'Av. Reforma 123',
    city: 'Ciudad de México',
    state: 'CDMX',
    country: 'México'
  };

  const doctorInfo = {
    id: 1,
    firstName: 'Dr. María',
    lastName: 'López',
    title: 'Médico General',
    specialty: 'Medicina Interna',
    license: '12345678',
    phone: '+52 55 9876 5432',
    email: 'dr.lopez@cortex.com'
  };

  const consultationInfo = {
    id: 1,
    date: '2024-01-15',
    time: '10:30',
    type: 'Consulta General',
    reason: 'Dolor de cabeza',
    diagnosis: 'Gripe común',
    notes: 'Reposo y medicación'
  };

  const medications = [
    {
      name: 'Paracetamol',
      dosage: '500mg',
      frequency: 'Cada 8 horas',
      duration: '7 días',
      instructions: 'Con alimentos',
      quantity: 21
    }
  ];

  const studies = [
    {
      name: 'Biometría Hemática',
      type: 'Laboratorio',
      category: 'Hematología',
      description: 'Análisis de sangre',
      instructions: 'Ayuno 8 horas',
      urgency: 'Rutina'
    }
  ];

  return (
    <PrintButtons
      patient={patientInfo}
      doctor={doctorInfo}
      consultation={consultationInfo}
      medications={medications}
      studies={studies}
      variant="contained"
      size="medium"
      direction="row"
      spacing={2}
      showDivider={true}
    />
  );
};
```

## Archivos de Salida

### Recetas Médicas
- **Formato**: `Receta_[Nombre]_[Apellido]_[Fecha].pdf`
- **Ejemplo**: `Receta_Juan_Pérez_2024-01-15.pdf`

### Órdenes de Estudios
- **Formato**: `OrdenEstudios_[Nombre]_[Apellido]_[Fecha].pdf`
- **Ejemplo**: `OrdenEstudios_Juan_Pérez_2024-01-15.pdf`

## Dependencias

- `jspdf`: Generación de PDFs
- `jspdf-autotable`: Tablas en PDFs
- `@mui/material`: Componentes de UI
- `@mui/icons-material`: Iconos

## Notas Técnicas

- Los PDFs se generan completamente en el frontend
- No requiere conexión al backend para la generación
- Los archivos se descargan automáticamente
- Compatible con todos los navegadores modernos
- Responsive y adaptable a diferentes tamaños de pantalla

## Pruebas

Para probar la funcionalidad, puedes usar el componente `PDFTestComponent` que incluye datos de ejemplo:

```tsx
import { PDFTestComponent } from '../components/common/PDFTestComponent';

// En tu componente o página
<PDFTestComponent />
```

## Personalización

### Colores CORTEX
- **Primario**: #0066CC (Azul)
- **Secundario**: #666666 (Gris)
- **Texto**: #000000 (Negro)

### Tipografía
- **Títulos**: Helvetica Bold
- **Cuerpo**: Helvetica Normal
- **Tamaños**: 8pt - 20pt según jerarquía

### Layout
- **Márgenes**: 20mm en todos los lados
- **Espaciado**: 10mm entre secciones
- **Tablas**: Grid theme con headers azules
