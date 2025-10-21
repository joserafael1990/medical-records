# 📊 Análisis de Tablas y Atributos No Utilizados

**Fecha de análisis**: Octubre 2024  
**Base de datos**: historias_clinicas  
**Total de tablas**: 22

---

## 🔴 TABLAS CON REGISTROS VACÍOS (Posiblemente No Utilizadas)

### 1. `diagnosis_differentials` (0 registros)
- **Propósito**: Almacenar diagnósticos diferenciales relacionados
- **Estado**: ✅ **IMPLEMENTADA** en backend y frontend
- **Uso actual**: 
  - Backend: `/backend/routes/diagnosis.py` tiene endpoints
  - Frontend: `/frontend/src/hooks/useDiagnosisCatalog.ts` tiene funciones
  - **NO HAY DATOS** porque no se han agregado diagnósticos diferenciales aún
- **Recomendación**: ✅ **MANTENER** - Es funcionalidad válida, solo falta agregar datos

### 2. `diagnosis_recommendations` (0 registros)
- **Propósito**: Recomendar estudios clínicos según diagnóstico
- **Estado**: ✅ **IMPLEMENTADA** en backend y frontend
- **Uso actual**:
  - Backend: `/backend/routes/diagnosis.py` maneja recomendaciones
  - Frontend: `/frontend/src/hooks/useDiagnosisCatalog.ts` consume estas recomendaciones
  - **NO HAY DATOS** porque no se han configurado recomendaciones aún
- **Recomendación**: ✅ **MANTENER** - Es funcionalidad inteligente y útil

### 3. `schedule_exceptions` (0 registros)
- **Propósito**: Vacaciones, días festivos, horarios especiales
- **Estado**: ✅ **IMPLEMENTADA** completamente
- **Uso actual**:
  - Backend: `/backend/routes/schedule.py` tiene endpoints
  - Frontend: Componentes de agenda usan estas excepciones
  - **NO HAY DATOS** porque no se han registrado vacaciones o días festivos
- **Recomendación**: ✅ **MANTENER** - Es esencial para el sistema de citas

### 4. `schedule_slots` (0 registros)
- **Propósito**: Espacios específicos de tiempo para agendar citas
- **Estado**: ✅ **IMPLEMENTADA** completamente
- **Uso actual**:
  - Backend: `/backend/appointment_service.py` los genera dinámicamente
  - Frontend: Sistema de citas los consume
  - **NO HAY DATOS** porque se generan bajo demanda (no se pre-generan)
- **Recomendación**: ✅ **MANTENER** - Es el corazón del sistema de citas

---

## 🟡 ATRIBUTOS POSIBLEMENTE NO UTILIZADOS EN `persons`

Revisemos los atributos de la tabla `persons` que podrían no estar siendo utilizados:

### 1. `office_country_id`
- **Estado**: ✅ **UTILIZADO**
- **Dónde**: 
  - Backend: `main_clean_english.py` para obtener `phone_code` de WhatsApp
  - Frontend: `DoctorProfileDialog.tsx` para configurar país del consultorio
- **Recomendación**: ✅ **MANTENER**

### 2. `office_timezone`
- **Estado**: ⚠️ **PARCIALMENTE UTILIZADO**
- **Dónde se define**: Backend `database.py`, valor por defecto: 'America/Mexico_City'
- **Dónde se usa**: 
  - Backend: `appointment_service.py` lo lee
  - Frontend: Dialogs de configuración
- **Problema**: No se utiliza activamente para conversión de zonas horarias
- **Recomendación**: 
  - ✅ **MANTENER** si planeas tener doctores en diferentes zonas horarias
  - 🗑️ **ELIMINAR** si todos los doctores estarán en la misma zona horaria

### 3. `appointment_duration`
- **Estado**: ⚠️ **DUPLICADO CON `schedule_templates.consultation_duration`**
- **Dónde se define**: Backend `database.py` en tabla `persons`
- **Problema**: 
  - `schedule_templates.consultation_duration` hace lo mismo
  - Puede causar inconsistencias
- **Recomendación**: 🗑️ **CONSIDERAR ELIMINAR** de `persons` y usar solo `schedule_templates`

### 4. `professional_seal`
- **Estado**: ⚠️ **NO UTILIZADO**
- **Dónde se define**: Backend `database.py` en tabla `persons`
- **Uso actual**: Campo definido pero no se usa en frontend
- **Recomendación**: 
  - ✅ **MANTENER** si planeas agregar sellos digitales en el futuro
  - 🗑️ **ELIMINAR** si no lo usarás

### 5. `subspecialty`
- **Estado**: ✅ **UTILIZADO**
- **Dónde**: Frontend en perfiles de doctor
- **Recomendación**: ✅ **MANTENER**

---

## 🟢 ATRIBUTOS NO UTILIZADOS EN `medical_records`

### 1. `secondary_diagnoses`
- **Estado**: ⚠️ **DEFINIDO PERO NO USADO EN FRONTEND**
- **Dónde se define**: Backend `database.py` y `schemas.py`
- **Uso actual**: Se puede guardar desde backend pero no hay UI en frontend
- **Recomendación**: 
  - ✅ **MANTENER** y **AGREGAR UI** para diagnósticos secundarios
  - Es información médica importante según NOM-004

### 2. `differential_diagnosis`
- **Estado**: ⚠️ **DEFINIDO PERO NO USADO EN FRONTEND**
- **Dónde se define**: Backend `database.py` y `schemas.py`
- **Uso actual**: Se puede guardar pero no hay UI
- **Recomendación**: ✅ **MANTENER** y **AGREGAR UI** - Es parte de buenas prácticas médicas

### 3. `prescribed_medications`
- **Estado**: ⚠️ **DEFINIDO PERO NO USADO EN FRONTEND**
- **Dónde se define**: Backend `database.py` (campo de texto)
- **Uso actual**: Se guarda como texto plano
- **Recomendación**: ✅ **MANTENER** - Es información crítica

### 4. `laboratory_results`
- **Estado**: ⚠️ **DEFINIDO PERO NO USADO EN FRONTEND**
- **Dónde se define**: Backend `database.py`
- **Uso actual**: No hay UI para capturar
- **Recomendación**: ✅ **MANTENER** - Se debe agregar UI

### 5. `imaging_results`
- **Estado**: ⚠️ **DEFINIDO PERO NO USADO EN FRONTEND**
- **Dónde se define**: Backend `database.py`
- **Uso actual**: No hay UI para capturar
- **Recomendación**: ✅ **MANTENER** - Se debe agregar UI

---

## 📋 RESUMEN DE RECOMENDACIONES

### ✅ Mantener (100% funcionales, solo faltan datos)
- ✅ `diagnosis_differentials` (implementada, solo falta agregar datos)
- ✅ `diagnosis_recommendations` (implementada, solo falta agregar datos)
- ✅ `schedule_exceptions` (implementada, se usa cuando hay excepciones)
- ✅ `schedule_slots` (implementada, se genera bajo demanda)

### ⚠️ Revisar y Mejorar
1. **`office_timezone`** en `persons`
   - Acción: Implementar conversión de zonas horarias o eliminar
   
2. **`appointment_duration`** en `persons`
   - Acción: 🗑️ **ELIMINAR** y usar solo `schedule_templates.consultation_duration`
   
3. **`professional_seal`** en `persons`
   - Acción: Implementar firma digital o eliminar
   
4. **Campos de `medical_records`**:
   - `secondary_diagnoses`
   - `differential_diagnosis`
   - `prescribed_medications`
   - `laboratory_results`
   - `imaging_results`
   - Acción: ✅ **AGREGAR UI en frontend** para capturar estos datos

### 🗑️ Considerar Eliminar

#### `appointment_duration` en `persons`
**Razón**: Duplicado con `schedule_templates.consultation_duration`

```sql
-- Migración para eliminar
ALTER TABLE persons DROP COLUMN IF EXISTS appointment_duration;
```

**Impacto**: Bajo - La duración ya se maneja en `schedule_templates`

---

## 🎯 ACCIONES RECOMENDADAS

### Prioridad Alta ⚡
1. **Eliminar `appointment_duration` de `persons`**
   - Crear migración
   - Actualizar modelos backend
   - Verificar que frontend use `schedule_templates` en su lugar

### Prioridad Media 🟡
2. **Agregar UI para campos faltantes en consultas**:
   - Diagnósticos secundarios
   - Diagnóstico diferencial
   - Resultados de laboratorio
   - Resultados de imagenología
   
3. **Decidir sobre `office_timezone`**:
   - Implementar conversión de zonas horarias
   - O eliminarlo si no se usará

4. **Decidir sobre `professional_seal`**:
   - Implementar firma digital
   - O eliminarlo si no se usará

### Prioridad Baja 🔵
5. **Agregar datos a tablas vacías**:
   - Configurar diagnósticos diferenciales
   - Configurar recomendaciones de estudios
   - Agregar excepciones de horarios cuando sea necesario

---

## 📊 MÉTRICAS ACTUALES

| Categoría | Total | Uso | % Uso |
|-----------|-------|-----|-------|
| Tablas totales | 22 | 22 | 100% |
| Tablas con datos | 18 | 18 | 82% |
| Tablas vacías (pero implementadas) | 4 | 4 | 18% |
| Atributos duplicados | 1 | 0 | - |
| Atributos sin UI frontend | 6 | 0 | - |

---

## ✅ CONCLUSIÓN

**El sistema está bien diseñado**. Las tablas "vacías" no están sin uso, simplemente:
- Están implementadas y listas para usar
- No tienen datos porque no se han registrado (ej: excepciones de horario)
- Se generan dinámicamente (ej: slots de citas)

**Única mejora recomendada**: Eliminar `appointment_duration` de `persons` para evitar duplicación.

