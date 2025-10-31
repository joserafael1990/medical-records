# 📋 Scripts de Base de Datos - Sistema de Historias Clínicas

## 🎯 **Propósito**
Estos scripts permiten crear una base de datos completamente funcional con todos los datos maestros necesarios para operar el sistema de historias clínicas.

## 📁 **Archivos Incluidos**

### 1. **`01_create_database_structure.sql`**
- **Propósito**: Crear todas las tablas y relaciones de la base de datos
- **Contenido**: 
  - Tablas geográficas (países, estados)
  - Tablas médicas (especialidades, estudios, medicamentos, diagnósticos)
  - Tablas transaccionales (personas, consultas, citas)
  - Tablas de auditoría y compliance
  - Índices para optimización
  - Vistas para reportes

### 2. **`02_insert_master_data.sql`**
- **Propósito**: Insertar datos maestros básicos y completos
- **Contenido**:
  - 28 países
  - 32 estados de México
  - 29 relaciones de emergencia
  - 174 especialidades médicas
  - 18 categorías de estudios clínicos
  - 20 categorías de diagnósticos
  - **Incluye automáticamente (vía `\i`):**
    - 1000 medicamentos comunes (`06_insert_medications_1000.sql`)
    - 100 diagnósticos CIE-10 (`07_insert_diagnoses_500.sql`)
    - 55 estudios clínicos (`08_insert_studies_500.sql`)

### 3. **`03_insert_existing_data.sql`**
- **Propósito**: Insertar datos existentes del sistema actual
- **Contenido**: 
  - 275 estudios clínicos
  - 404 medicamentos
  - 202 diagnósticos
- **Estado**: ✅ **COMPLETO** - Datos extraídos y convertidos

### 4. **`04_additional_functions.sql`**
- **Propósito**: Funciones adicionales y optimizaciones
- **Contenido**:
  - Función de búsqueda de diagnósticos
  - Índices de optimización
  - Restricciones de validación
  - Triggers de auditoría
  - Funciones de utilidad
- **Estado**: ✅ **COMPLETO** - Funcionalidades avanzadas

## 🚀 **Instrucciones de Uso**

### **Opción 1: Crear Base de Datos Nueva**
```bash
# 1. Crear base de datos
docker-compose exec postgres-db psql -U postgres -c "CREATE DATABASE historias_clinicas;"

# 2. Ejecutar scripts en orden
# NOTA: El script 02_insert_master_data.sql ahora incluye automáticamente:
#       - 1000 medicamentos (06_insert_medications_1000.sql)
#       - 100 diagnósticos CIE-10 (07_insert_diagnoses_500.sql)
#       - 55 estudios clínicos (08_insert_studies_500.sql)
docker-compose exec postgres-db psql -U historias_user -d historias_clinicas -f /app/01_create_database_structure.sql
docker-compose exec postgres-db psql -U historias_user -d historias_clinicas -f /app/02_insert_master_data.sql
docker-compose exec postgres-db psql -U historias_user -d historias_clinicas -f /app/04_additional_functions.sql
```

### **Opción 2: Extraer Datos Existentes**
```bash
# 1. Extraer estudios clínicos
docker-compose exec postgres-db psql -U historias_user -d historias_clinicas -c "
COPY (SELECT * FROM study_catalog ORDER BY id) TO STDOUT WITH CSV HEADER" > study_catalog_data.csv

# 2. Extraer medicamentos
docker-compose exec postgres-db psql -U historias_user -d historias_clinicas -c "
COPY (SELECT * FROM medications ORDER BY id) TO STDOUT WITH CSV HEADER" > medications_data.csv

# 3. Extraer diagnósticos
docker-compose exec postgres-db psql -U historias_user -d historias_clinicas -c "
COPY (SELECT * FROM diagnosis_catalog ORDER BY id) TO STDOUT WITH CSV HEADER" > diagnosis_catalog_data.csv
```

## 📊 **Datos Incluidos**

### **🌍 Catálogos Geográficos**
- **Países**: 28 países principales
- **Estados**: 32 estados de México
- **Relaciones de Emergencia**: 29 relaciones familiares

### **🏥 Catálogos Médicos**
- **Especialidades**: 174 especialidades médicas
- **Especialidades Médicas**: 38 especialidades adicionales
- **Categorías de Estudios**: 18 categorías
- **Categorías de Diagnósticos**: 43 categorías
- **Signos Vitales**: 10 signos vitales básicos

### **📋 Datos Existentes (Pendientes)**
- **Estudios Clínicos**: 275 estudios
- **Medicamentos**: 404 medicamentos
- **Diagnósticos**: 202 diagnósticos

## ⚠️ **Notas Importantes**

1. **Orden de Ejecución**: Los scripts deben ejecutarse en orden numérico
2. **Datos Existentes**: El script `03_insert_existing_data.sql` está pendiente de completar
3. **Backup**: Siempre hacer backup antes de ejecutar los scripts
4. **Permisos**: Asegurar que el usuario tenga permisos de creación de tablas

## 🔧 **Troubleshooting**

### **Error de Permisos**
```bash
# Verificar permisos del usuario
docker-compose exec postgres-db psql -U postgres -c "\du"
```

### **Error de Tablas Existentes**
```bash
# Eliminar tablas existentes (CUIDADO: Esto elimina todos los datos)
docker-compose exec postgres-db psql -U historias_user -d historias_clinicas -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
```

### **Verificar Instalación**
```bash
# Verificar que las tablas se crearon correctamente
docker-compose exec postgres-db psql -U historias_user -d historias_clinicas -c "\dt"
```

## 📈 **Próximos Pasos**

1. **Completar Script 03**: Extraer y convertir datos existentes
2. **Validar Datos**: Verificar que todos los datos se insertaron correctamente
3. **Crear Usuarios**: Insertar usuarios de prueba
4. **Configurar Horarios**: Crear plantillas de horarios básicas
5. **Pruebas**: Ejecutar pruebas de funcionalidad

## 🎯 **Resultado Esperado**

Después de ejecutar todos los scripts, el sistema debería tener:
- ✅ Base de datos completamente estructurada
- ✅ Todos los catálogos maestros poblados
- ✅ Sistema listo para operar
- ✅ Datos de prueba disponibles

---

**Última actualización**: 2025-01-22  
**Versión**: 1.0  
**Autor**: Sistema de Historias Clínicas
