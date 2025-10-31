# Reporte de Pruebas Exhaustivas del Sistema de Documentos

## Resumen Ejecutivo

Se realizaron pruebas exhaustivas del sistema de documentos normalizados. Todas las funcionalidades críticas fueron verificadas y están funcionando correctamente.

## Pruebas Realizadas

### ✅ PRUEBA 1: Obtener Tipos de Documentos
- **Estado**: PASÓ
- **Resultado**: El endpoint `/api/document-types` retorna correctamente los tipos "Personal" y "Profesional"
- **Datos obtenidos**:
  - Tipo "Personal" (ID: 1)
  - Tipo "Profesional" (ID: 2)

### ✅ PRUEBA 2: Obtener Documentos por Tipo
- **Estado**: PASÓ
- **Resultado**: Los endpoints `/api/document-types/{id}/documents` funcionan correctamente
- **Documentos Personales**: C.I, C.I.E, DPI, CURP, etc.
- **Documentos Profesionales**: Cédula Profesional, Matrícula Nacional, Número de Registro, etc.

### ✅ PRUEBA 3: Obtener Perfil Actual
- **Estado**: PASÓ
- **Resultado**: El endpoint `/api/doctors/me/profile` retorna documentos correctamente estructurados
- **Estructura verificada**:
  - `personal_documents`: Array de documentos personales
  - `professional_documents`: Array de documentos profesionales

### ✅ PRUEBA 4: Actualizar con Un Solo Documento de Cada Tipo
- **Estado**: PASÓ
- **Resultado**: Se pueden actualizar documentos correctamente
- **Comportamiento**: 
  - Se guarda el documento personal especificado
  - Se guarda el documento profesional especificado
  - Los documentos antiguos del mismo tipo se desactivan automáticamente

### ✅ PRUEBA 5: Restricción de Múltiples Documentos
- **Estado**: PASÓ
- **Resultado**: Cuando se envían múltiples documentos del mismo tipo, el backend:
  1. Toma solo el primero de cada tipo
  2. Registra una advertencia en los logs
  3. Desactiva documentos antiguos del mismo tipo
  4. Guarda solo un documento activo de cada tipo

### ✅ PRUEBA 6: Cambio de Tipo de Documento
- **Estado**: PASÓ
- **Resultado**: Al cambiar de un tipo de documento a otro:
  - El documento anterior se desactiva automáticamente
  - El nuevo documento se guarda y activa
  - Solo queda un documento activo del tipo correspondiente

## Verificaciones en Base de Datos

### Estado Actual del Usuario de Prueba (ID: 10)
- **Documentos Activos**:
  - 1 documento profesional activo
  - 1 documento personal activo (después de las pruebas)
- **Documentos Desactivados**:
  - 3 documentos personales desactivados
  - 1 documento profesional desactivado

### Restricción de Un Solo Documento por Tipo
- ✅ Verificado: Solo hay **1 documento personal activo** por usuario
- ✅ Verificado: Solo hay **1 documento profesional activo** por usuario

## Comportamiento del Backend

### Procesamiento de Documentos
1. **Prioridad de Fuentes**:
   - Primero: `raw JSON` del request
   - Segundo: Schema Pydantic (`doctor_data.personal_documents`)
   - Tercero: Dict completo (`doctor_data_dict_full`)

2. **Restricción de Múltiples Documentos**:
   - Si se reciben múltiples documentos personales → Solo se toma el primero
   - Si se reciben múltiples documentos profesionales → Solo se toma el primero
   - Se registra advertencia en logs cuando se reciben múltiples

3. **Desactivación de Documentos Antiguos**:
   - Antes de guardar un nuevo documento profesional, se desactivan todos los profesionales antiguos
   - Antes de guardar un nuevo documento personal, se desactivan todos los personales antiguos
   - Solo se desactivan si no es el mismo `document_id` que se va a guardar

4. **Validación de Unicidad**:
   - Se verifica que el valor del documento sea único para ese tipo específico
   - Permite el mismo valor en diferentes tipos (ej: C.I="123" y C.I.E="123")

## Logs del Backend

Los logs muestran el procesamiento correcto:
- ✅ "Processing professional_documents from RAW JSON"
- ✅ "Processing personal_documents from RAW JSON"
- ✅ "Multiple personal documents received, only taking the first one" (cuando aplica)
- ✅ "Deactivating old professional document" / "Deactivating old personal document"
- ✅ "Upserting document"
- ✅ "Successfully saved X documents (max 1 professional + 1 personal)"

## Frontend

### Componentes Actualizados
- ✅ `RegisterView`: Usa `DocumentSelector` para documentos
- ✅ `DoctorProfileDialog`: Usa `DocumentSelector` con restricción de un solo documento
- ✅ `PatientDialog`: Usa `DocumentSelector`
- ✅ `AppointmentDialog`: Usa `DocumentSelector` para nuevos pacientes
- ✅ `ConsultationDialog`: Usa `DocumentSelector` para edición de pacientes

### Comportamiento en Frontend
- ✅ Solo permite seleccionar un documento personal
- ✅ Solo permite seleccionar un documento profesional
- ✅ No muestra botones para agregar múltiples documentos en modo edición
- ✅ Los documentos se cargan correctamente desde el backend

## Conclusiones

### ✅ Funcionalidades Verificadas
1. ✅ Obtener tipos de documentos desde API
2. ✅ Obtener documentos por tipo desde API
3. ✅ Obtener perfil con documentos normalizados
4. ✅ Actualizar documentos (crear/editar)
5. ✅ Restricción de un solo documento por tipo
6. ✅ Desactivación automática de documentos antiguos
7. ✅ Validación de unicidad por tipo de documento
8. ✅ Manejo de múltiples documentos (toma solo el primero)
9. ✅ Cambio de tipo de documento

### ✅ Cumplimiento de Requisitos
- ✅ Un usuario puede tener solo un documento personal
- ✅ Un usuario puede tener solo un documento profesional
- ✅ Los documentos se guardan correctamente en `person_documents`
- ✅ Los documentos antiguos se desactivan al cambiar
- ✅ La validación de unicidad funciona por tipo de documento

## Recomendaciones

1. **Monitoreo**: Revisar logs periódicamente para detectar intentos de guardar múltiples documentos
2. **Frontend**: Continuar verificando que los componentes no permitan seleccionar múltiples documentos
3. **Base de Datos**: Realizar limpieza periódica de documentos desactivados si es necesario

---
**Fecha de Pruebas**: $(date)
**Estado**: ✅ TODAS LAS PRUEBAS PASARON

