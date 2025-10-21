# Guía de Constancias Médicas - CORTEX

## Descripción General

El sistema CORTEX incluye funcionalidad completa para generar constancias médicas personalizadas con branding profesional de CORTEX.

## Características

### ✅ Funcionalidades Implementadas

- **Generación de Constancias Médicas**: PDFs completos con información del paciente, médico y consulta
- **Contenido Personalizable**: El médico puede escribir el contenido completo de la constancia
- **Título Personalizable**: Se puede modificar el título del documento (por defecto: "CONSTANCIA MÉDICA")
- **Plantilla Automática**: Se genera una plantilla inicial que el médico puede editar
- **Branding CORTEX**: Logo, colores corporativos y formato profesional
- **Firma Digital**: Incluye automáticamente la firma del médico con su información profesional
- **Información Completa**: Datos del paciente, médico y consulta incluidos automáticamente

## Ubicación del Botón

El botón **"Generar Constancia"** se encuentra en el panel inferior del diálogo de consultas, junto a los botones de "Imprimir Receta" e "Imprimir Orden de Estudios".

### Cuándo está disponible

- Solo cuando se está editando una consulta existente
- La consulta debe estar guardada en la base de datos
- Se muestra en la sección de `DialogActions` del diálogo de consulta

## Flujo de Uso

1. **Abrir una consulta**: Editar una consulta existente
2. **Hacer clic en "Generar Constancia"**: Se abre un modal/diálogo
3. **Editar el contenido**: 
   - Modificar el título si es necesario (por defecto: "CONSTANCIA MÉDICA")
   - Editar o completar el contenido de la constancia
   - La plantilla incluye información básica que puede ser personalizada
4. **Imprimir**: Hacer clic en "Imprimir Constancia"
5. **Resultado**: Se genera y descarga automáticamente un PDF

## Contenido del PDF

### Información Incluida Automáticamente

1. **Encabezado CORTEX**
   - Logo de CORTEX
   - Título personalizable
   - Línea separadora

2. **Información del Médico**
   - Nombre completo
   - Especialidad
   - Cédula profesional
   - Universidad
   - Teléfono
   - Dirección del consultorio

3. **Información del Paciente**
   - Nombre completo (incluyendo apellido materno)
   - Fecha de nacimiento
   - Género

4. **Información de la Consulta**
   - Fecha de la consulta
   - Tipo de consulta

5. **Contenido de la Constancia**
   - Texto personalizado por el médico
   - Presentado en un cuadro con bordes

6. **Firma del Médico**
   - Línea de firma
   - Nombre del médico
   - Especialidad
   - Cédula profesional

7. **Footer CORTEX**
   - Información corporativa
   - Número de página
   - Fecha y hora de generación

## Plantilla Predeterminada

Cuando se abre el diálogo, se genera automáticamente una plantilla que incluye:

```
Por medio de la presente, yo, Dr. [Nombre del Médico], [Especialidad], 
con cédula profesional [Número], hago constar que el/la paciente 
[Nombre del Paciente] acudió a consulta médica en fecha [Fecha].

Bajo mi valoración médica, certifico que el/la paciente [describir el 
estado de salud, diagnóstico, o motivo de la constancia].

Se extiende la presente para los fines que al interesado convengan.
```

El médico puede editar completamente este texto según sus necesidades.

## Componentes Técnicos

### 1. PrintCertificateButton
Componente principal que maneja el botón y el diálogo.

**Ubicación**: `frontend/src/components/common/PrintCertificateButton.tsx`

**Props**:
```typescript
interface PrintCertificateButtonProps {
  patient: PatientInfo;
  doctor: DoctorInfo;
  consultation: ConsultationInfo;
  disabled?: boolean;
  variant?: 'contained' | 'outlined' | 'text';
  size?: 'small' | 'medium' | 'large';
  fullWidth?: boolean;
}
```

### 2. PrintButtons
Componente combinado que incluye todos los botones de impresión.

**Ubicación**: `frontend/src/components/common/PrintButtons.tsx`

Ahora incluye tres botones:
- Imprimir Receta
- Imprimir Orden de Estudios
- **Generar Constancia** (nuevo)

### 3. pdfService
Servicio que genera los PDFs.

**Ubicación**: `frontend/src/services/pdfService.ts`

**Nuevo método**:
```typescript
async generateCertificate(
  patient: PatientInfo,
  doctor: DoctorInfo,
  consultation: ConsultationInfo,
  certificate: CertificateInfo
): Promise<void>
```

### 4. usePDFGenerator Hook
Hook que facilita el uso del servicio de PDFs.

**Ubicación**: `frontend/src/hooks/usePDFGenerator.ts`

**Nueva función**:
```typescript
generateCertificatePDF(
  patient: PatientInfo,
  doctor: DoctorInfo,
  consultation: ConsultationInfo,
  certificate: CertificateInfo
)
```

## Interfaces de Datos

### CertificateInfo (Nueva)
```typescript
interface CertificateInfo {
  content: string;      // Contenido completo de la constancia
  title?: string;       // Título personalizado (opcional)
}
```

### PatientInfo
```typescript
interface PatientInfo {
  id: number;
  firstName: string;
  lastName: string;
  maternalSurname?: string;
  dateOfBirth?: string;
  gender?: string;
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
  maternalSurname?: string;
  title?: string;
  specialty?: string;
  license?: string;
  university?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
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
  prescribed_medications?: string;
  notes?: string;
}
```

## Archivos de Salida

### Constancias Médicas
- **Formato**: `Constancia_[Nombre]_[Apellido]_[Fecha].pdf`
- **Ejemplo**: `Constancia_Juan_Pérez_2024-01-15.pdf`

## Ejemplo de Uso

```tsx
import { PrintCertificateButton } from '../components/common/PrintCertificateButton';

<PrintCertificateButton
  patient={patientInfo}
  doctor={doctorInfo}
  consultation={consultationInfo}
  variant="outlined"
  size="medium"
/>
```

## Notas Técnicas

- Los PDFs se generan completamente en el frontend usando jsPDF
- No requiere conexión al backend para la generación
- Los archivos se descargan automáticamente
- Compatible con todos los navegadores modernos
- El modal permite edición completa del contenido antes de generar el PDF
- Se valida que el contenido no esté vacío antes de generar

## Personalización

### Colores CORTEX
- **Primario**: #0066CC (Azul)
- **Secundario**: #666666 (Gris)
- **Texto**: #000000 (Negro)
- **Bordes**: #C8C8C8 (Gris claro)

### Tipografía
- **Títulos**: Helvetica Bold
- **Cuerpo**: Helvetica Normal
- **Tamaños**: 8pt - 20pt según jerarquía

### Layout
- **Márgenes**: 20mm en todos los lados
- **Espaciado**: 10mm entre secciones
- **Cuadro de contenido**: Con bordes grises y padding interno

## Validaciones

1. El botón está deshabilitado si:
   - No hay una consulta guardada
   - El prop `disabled` es `true`

2. El botón de "Imprimir Constancia" en el modal está deshabilitado si:
   - El contenido está vacío
   - Se está generando el PDF

## Mejoras Futuras Sugeridas

- [ ] Guardar plantillas de constancias personalizadas
- [ ] Historial de constancias generadas
- [ ] Múltiples plantillas predefinidas (reposo, buen estado de salud, etc.)
- [ ] Envío automático por email al paciente
- [ ] Integración con firma electrónica avanzada
- [ ] QR code para verificación de autenticidad

