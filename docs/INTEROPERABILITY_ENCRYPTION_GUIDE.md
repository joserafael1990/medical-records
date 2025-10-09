# 🔒 Guía de Interoperabilidad y Cifrado - NOM Compliance

## 📋 **Resumen de Implementación**

Hemos implementado dos componentes críticos para el cumplimiento de las normativas mexicanas:

### ✅ **1. Interoperabilidad (NOM-024-SSA3-2012)**
- **Estándar**: HL7 FHIR R4
- **Recursos**: Patient, Practitioner, Encounter, Bundle
- **Catálogos**: Especialidades, géneros, tipos de encuentro

### ✅ **2. Cifrado de Datos (NOM-035-SSA3-2012)**
- **Algoritmo**: AES-256-GCM
- **Derivación de Clave**: PBKDF2-SHA256
- **Campos Protegidos**: CURP, datos médicos sensibles

---

## 🔗 **INTEROPERABILIDAD HL7 FHIR**

### **Endpoints Disponibles**

#### **1. Paciente FHIR**
```http
GET /api/fhir/Patient/{patient_id}
```
**Respuesta**: Recurso FHIR Patient con identificadores CURP y hospital

#### **2. Médico FHIR**
```http
GET /api/fhir/Practitioner/{doctor_id}
```
**Respuesta**: Recurso FHIR Practitioner con cédulas y especialidades

#### **3. Bundle Resumen de Paciente**
```http
GET /api/fhir/Bundle/patient-summary/{patient_id}
```
**Respuesta**: Bundle FHIR completo con paciente, médico y consultas

#### **4. Catálogos NOM-035**
```http
GET /api/catalogs/specialties     # Especialidades médicas
GET /api/catalogs/genders         # Códigos de género
GET /api/catalogs/encounter-types # Tipos de consulta
```

### **Ejemplo de Uso - Intercambio de Datos**

```python
import requests

# Obtener paciente en formato FHIR
response = requests.get('http://localhost:8000/api/fhir/Patient/PAT123')
fhir_patient = response.json()

# El resultado incluye:
{
    "resourceType": "Patient",
    "id": "PAT123",
    "identifier": [
        {
            "use": "official",
            "type": {"text": "CURP"},
            "system": "urn:oid:2.16.840.1.113883.4.629",
            "value": "CURP123456789012345"
        }
    ],
    "name": [{"family": "García López", "given": ["María"]}],
    "gender": "female",
    "birthDate": "1985-03-15"
}
```

---

## 🔐 **CIFRADO DE DATOS SENSIBLES**

### **Configuración de Cifrado**

#### **1. Configurar Clave Maestra**
```bash
# Generar clave segura de 256 bits
export MEDICAL_ENCRYPTION_KEY=$(python -c "import secrets; print(secrets.token_hex(32))")

# En producción, guardar en archivo .env
echo "MEDICAL_ENCRYPTION_KEY=your-secure-key-here" >> .env
```

#### **2. Verificar Estado del Cifrado**
```http
GET /api/admin/encryption-status
```

**Respuesta**:
```json
{
    "encryption_key_configured": true,
    "total_patients": 150,
    "total_doctors": 5,
    "encryption_algorithm": "AES-256-GCM",
    "key_derivation": "PBKDF2-SHA256",
    "compliance_status": "NOM-035 Compliant"
}
```

### **Campos Cifrados Automáticamente**

#### **Pacientes**:
- ✅ CURP
- ✅ Teléfonos
- ✅ Emails
- ✅ Direcciones
- ✅ Contactos de emergencia

#### **Médicos**:
- ✅ CURP
- ✅ RFC
- ✅ Teléfonos personales
- ✅ Firma digital

#### **Consultas**:
- ✅ Motivo de consulta
- ✅ Historia clínica
- ✅ Exploración física
- ✅ Diagnósticos
- ✅ Plan de tratamiento
- ✅ Medicamentos

### **Migración de Datos Existentes**

Para cifrar datos que ya existen en la base de datos:

```http
POST /api/admin/encrypt-existing-data
Body: {"table_name": "patients"}
```

⚠️ **Importante**: Este endpoint requiere permisos de administrador

---

## 📊 **NIVELES DE SEGURIDAD**

### **Nivel Alto** 🔴
- **Datos**: Historia clínica, diagnósticos, tratamientos
- **Protección**: Cifrado AES-256 + Hash para búsqueda
- **Acceso**: Solo médico tratante

### **Nivel Medio** 🟡  
- **Datos**: CURP, RFC, teléfonos, direcciones
- **Protección**: Cifrado AES-256
- **Acceso**: Personal autorizado

### **Nivel Bajo** 🟢
- **Datos**: Nombres para búsqueda
- **Protección**: Hash SHA-256
- **Acceso**: Búsquedas del sistema

---

## 🛠 **IMPLEMENTACIÓN TÉCNICA**

### **Uso del Servicio de Cifrado**

```python
from encryption import get_encryption_service

# Obtener servicio
encryption_service = get_encryption_service()

# Cifrar datos sensibles
curp_encrypted = encryption_service.encrypt_sensitive_data("CURP123456789012345")

# Descifrar datos
curp_decrypted = encryption_service.decrypt_sensitive_data(curp_encrypted)

# Hash para búsquedas
curp_hash = encryption_service.hash_sensitive_field("CURP123456789012345")
```

### **Uso de Interoperabilidad**

```python
from interoperability import InteroperabilityService, FHIRExporter

# Convertir a FHIR
interop_service = InteroperabilityService()
fhir_patient = interop_service.patient_to_fhir_patient(patient)

# Exportar Bundle
exporter = FHIRExporter()
bundle = exporter.export_patient_summary(patient, consultations, doctor)
```

---

## 🚨 **CONSIDERACIONES DE SEGURIDAD**

### **Producción**
1. **Clave Maestra**: Usar HSM o servicio de gestión de claves
2. **Backup**: Cifrar respaldos de base de datos
3. **Logs**: No registrar datos sensibles descifrados
4. **Red**: Usar HTTPS/TLS 1.3 obligatorio

### **Auditoría** 
1. **Accesos**: Registrar todos los accesos a datos cifrados
2. **Modificaciones**: Log de cambios en datos sensibles
3. **Exportaciones**: Auditar exportaciones FHIR
4. **Claves**: Rotación periódica de claves

### **Compliance**
- ✅ **NOM-004**: Expediente clínico completo
- ✅ **NOM-024**: Interoperabilidad FHIR + CURP
- ✅ **NOM-035**: Cifrado + catálogos estandarizados

---

## 📈 **MONITOREO Y MÉTRICAS**

### **KPIs de Seguridad**
- Porcentaje de datos cifrados: **Target 100%**
- Tiempo de respuesta con cifrado: **< 200ms**
- Intentos de acceso no autorizado: **0**

### **KPIs de Interoperabilidad**
- Intercambios FHIR exitosos: **> 99%**
- Tiempo de generación de Bundle: **< 1s**
- Compliance con estándares: **100%**

### **Alertas Configuradas**
- ❌ Fallo en cifrado/descifrado
- ❌ Clave de cifrado no configurada
- ❌ Acceso no autorizado a datos sensibles
- ❌ Exportación FHIR fallida

---

## 🔧 **TROUBLESHOOTING**

### **Error: "Clave de cifrado no configurada"**
```bash
# Solución
export MEDICAL_ENCRYPTION_KEY=tu-clave-segura-aqui
```

### **Error: "No se puede descifrar datos"**
- Verificar que la clave sea la correcta
- Verificar integridad de datos cifrados
- Revisar logs para errores de corrupción

### **Error: "Recurso FHIR inválido"**
- Verificar que los datos requeridos estén presentes
- Revisar formato de CURP y cédulas
- Validar catálogos de especialidades

---

## 📚 **RECURSOS ADICIONALES**

- [NOM-004-SSA3-2012](https://dof.gob.mx/nota_detalle.php?codigo=5272787)
- [NOM-024-SSA3-2012](https://dof.gob.mx/nota_detalle.php?codigo=5280847)
- [HL7 FHIR R4](https://hl7.org/fhir/R4/)
- [SNOMED CT](https://www.snomed.org/)

---

**Estado de Implementación**: ✅ **Completado**
**Última Actualización**: 29 de Agosto, 2025
**Siguiente Fase**: Implementar CLUES y Auditoría Completa
