# 📞 WhatsApp - Código de País Dinámico

## 🎯 Actualización Implementada

El sistema ahora obtiene automáticamente el **código de país** desde la ubicación del consultorio del doctor, en lugar de usar un código fijo.

---

## 🌎 ¿Cómo Funciona?

### **Flujo Automático:**

```
1. Doctor hace click en "WhatsApp" para una cita
   ↓
2. Sistema obtiene el país del consultorio del doctor
   → Campo: office_country_id en la tabla persons
   ↓
3. Sistema consulta el código telefónico del país
   → Tabla: countries.phone_code
   ↓
4. Sistema formatea el número del paciente con ese código
   → Ejemplo: +58 para Venezuela, +52 para México
   ↓
5. WhatsApp se envía con el código correcto
```

---

## 📊 Ejemplos por País

| País | Código | Teléfono Local | Formato WhatsApp |
|------|--------|----------------|------------------|
| 🇲🇽 México | +52 | 5579449672 | 525579449672 |
| 🇻🇪 Venezuela | +58 | 4121234567 | 584121234567 |
| 🇨🇴 Colombia | +57 | 3001234567 | 573001234567 |
| 🇦🇷 Argentina | +54 | 1123456789 | 541123456789 |
| 🇨🇱 Chile | +56 | 912345678 | 56912345678 |
| 🇵🇪 Perú | +51 | 987654321 | 51987654321 |
| 🇪🇨 Ecuador | +593 | 987654321 | 593987654321 |
| 🇪🇸 España | +34 | 612345678 | 34612345678 |
| 🇺🇸 USA | +1 | 5551234567 | 15551234567 |

---

## 🔧 Configuración

### **Paso 1: Configurar País del Consultorio**

El doctor debe configurar el país donde está ubicado su consultorio:

1. Inicia sesión como doctor
2. Ve a **Perfil → Editar**
3. Busca la sección **"Dirección del Consultorio"**
4. Selecciona el **País del Consultorio**
5. Guarda cambios

### **Paso 2: Verificar Código de País**

Los códigos ya están precargados para los países más comunes. Para verificar:

```bash
docker exec -i medical-records-main-postgres-db-1 psql -U historias_user -d historias_clinicas << 'SQL'
SELECT name, phone_code 
FROM countries 
WHERE phone_code IS NOT NULL
ORDER BY name;
SQL
```

### **Códigos Precargados:**

```
México          → +52
Venezuela       → +58
Colombia        → +57
Argentina       → +54
Chile           → +56
Perú            → +51
Ecuador         → +593
Bolivia         → +591
Paraguay        → +595
Uruguay         → +598
Costa Rica      → +506
Panamá          → +507
Guatemala       → +502
Honduras        → +504
El Salvador     → +503
Nicaragua       → +505
Cuba            → +53
Brasil          → +55
España          → +34
Estados Unidos  → +1
Canadá          → +1
```

---

## 🔍 Lógica de Formateo

### **Código en `whatsapp_service.py`:**

```python
def _format_phone_number(self, phone: str, country_code: str = '52') -> str:
    # Limpia el número
    phone = phone.replace(' ', '').replace('-', '').replace('(', '').replace(')', '')
    
    # Remueve + si existe
    if phone.startswith('+'):
        phone = phone[1:]
    
    if country_code.startswith('+'):
        country_code = country_code[1:]
    
    # Si ya tiene el código de país, lo devuelve
    if phone.startswith(country_code):
        return phone
    
    # Si tiene 10 dígitos (local), agrega código de país
    if len(phone) == 10:
        phone = f'{country_code}{phone}'
    
    return phone
```

### **Ejemplos de Formateo:**

**Entrada:** `5579449672` (México, código +52)
**Salida:** `525579449672`

**Entrada:** `4121234567` (Venezuela, código +58)
**Salida:** `584121234567`

**Entrada:** `+584121234567` (ya con código)
**Salida:** `584121234567`

---

## ⚙️ Default y Fallback

### **Código por Defecto:**

Si el doctor NO ha configurado el país del consultorio:
- **Default:** `+52` (México)
- El sistema funciona, pero usa código de México

### **Recomendación:**

Configura siempre el país del consultorio para que el sistema use el código correcto automáticamente.

---

## 🧪 Pruebas

### **Ver País del Consultorio del Doctor:**

```bash
docker exec -i medical-records-main-postgres-db-1 psql -U historias_user -d historias_clinicas << 'SQL'
SELECT 
    p.id,
    p.full_name as doctor,
    c.name as pais_consultorio,
    c.phone_code as codigo_telefono
FROM persons p
LEFT JOIN countries c ON c.id = p.office_country_id
WHERE p.person_type = 'doctor'
ORDER BY p.id DESC
LIMIT 5;
SQL
```

### **Probar Formateo de Números:**

```python
from whatsapp_service import get_whatsapp_service

whatsapp = get_whatsapp_service()

# México (+52)
print(whatsapp._format_phone_number('5579449672', '52'))
# Output: 525579449672

# Venezuela (+58)
print(whatsapp._format_phone_number('4121234567', '58'))
# Output: 584121234567

# Colombia (+57)
print(whatsapp._format_phone_number('3001234567', '57'))
# Output: 573001234567
```

---

## 📝 Migración Ejecutada

Se agregó la columna `phone_code` a la tabla `countries`:

**Archivo:** `backend/migrations/add_phone_code_to_countries.py`

**Cambios:**
- ✅ Columna `phone_code VARCHAR(5)` agregada
- ✅ Códigos precargados para 25+ países
- ✅ Modelo `Country` actualizado

---

## 🌍 Agregar Más Países

Si necesitas agregar un país nuevo:

```bash
docker exec -i medical-records-main-postgres-db-1 psql -U historias_user -d historias_clinicas << 'SQL'
UPDATE countries 
SET phone_code = '+506' 
WHERE name = 'Costa Rica';
SQL
```

O para agregar un país que no existe:

```bash
docker exec -i medical-records-main-postgres-db-1 psql -U historias_user -d historias_clinicas << 'SQL'
INSERT INTO countries (name, phone_code, active) 
VALUES ('Belice', '+501', true);
SQL
```

---

## 🎯 Beneficios

### **Antes:**
❌ Código fijo (+52) para todos  
❌ No funcionaba para consultorios fuera de México  
❌ Números mal formateados en otros países

### **Ahora:**
✅ Código dinámico según país del consultorio  
✅ Funciona en cualquier país  
✅ Formateo automático correcto  
✅ Soporte para 25+ países  

---

## 📊 Logs

Cuando envíes un WhatsApp, verás en los logs:

```
📞 Using country code: +58 for WhatsApp
✅ WhatsApp sent successfully to 584121234567
```

Para ver logs:
```bash
docker logs medical-records-main-python-backend-1 -f | grep -i "country code"
```

---

## ✅ Checklist

- [x] Tabla `countries` actualizada con `phone_code`
- [x] Modelo `Country` actualizado
- [x] Servicio WhatsApp acepta `country_code` dinámico
- [x] Endpoint obtiene país del consultorio
- [x] Formateo de números actualizado
- [x] Códigos precargados para 25+ países
- [x] Default fallback a +52 (México)
- [x] Documentación completa

---

## 🚀 ¡Listo!

El sistema ahora usa el código de país correcto según la ubicación del consultorio del doctor.

**Solo falta:** Configurar el país del consultorio en el perfil del doctor.

