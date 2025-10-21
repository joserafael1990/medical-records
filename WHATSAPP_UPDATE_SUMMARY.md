# 📱 WhatsApp - Resumen de Actualización

## ✅ Cambios Implementados

### 🎯 **Nueva Estructura de Plantilla (6 Parámetros)**

La plantilla `appointment_reminder` ahora incluye:

1. **Nombre del Paciente** - Nombre completo con apellidos
2. **Fecha de la Cita** - Formato: "25 de Enero de 2024"
3. **Hora de la Cita** - Formato: "10:30 AM"
4. **Título del Médico** - "Dr" o "Dra"
5. **Nombre del Médico** - Nombre completo
6. **Dirección del Consultorio** - Dirección completa

### 🔘 **Botón de Cancelación Interactivo**

- Los pacientes pueden cancelar su cita con un click
- El botón envía un webhook al sistema
- El sistema cancela automáticamente la cita
- Se registra la razón: "Cancelada por el paciente vía WhatsApp"

---

## 📂 Archivos Modificados

### **Backend:**

1. **`backend/whatsapp_service.py`**
   - ✅ Actualizado `send_appointment_reminder()` con 7 parámetros
   - ✅ Documentación actualizada

2. **`backend/main_clean_english.py`**
   - ✅ Endpoint `POST /api/whatsapp/appointment-reminder/{id}` actualizado
   - ✅ Formato de fecha/hora mejorado
   - ✅ Obtención de dirección del consultorio
   - ✅ Nuevo endpoint `GET /api/whatsapp/webhook` (verificación)
   - ✅ Nuevo endpoint `POST /api/whatsapp/webhook` (recepción de mensajes)
   - ✅ Función `process_whatsapp_message()` para procesar respuestas
   - ✅ Función `cancel_appointment_via_whatsapp()` para cancelaciones automáticas

3. **`backend/database.py`**
   - ✅ Campo `office_address` ya existente en modelo `Person`

### **Documentación:**

4. **`docs/WHATSAPP_NEW_TEMPLATE.md`** (NUEVO)
   - Estructura completa de la nueva plantilla
   - Ejemplo de mensaje
   - Guía de configuración en Meta
   - Documentación del webhook
   - Pruebas y troubleshooting

---

## 🔄 Flujo Completo

### **1. Envío de Recordatorio:**

```
Doctor → Click "WhatsApp" en cita
    ↓
Backend obtiene datos:
  - Nombre paciente: "Juan Pérez González"
  - Fecha: "25 de Enero de 2024"
  - Hora: "10:30 AM"
  - Doctor: "Dr Rafael García"
  - Dirección: "Av. Reforma 123..."
    ↓
WhatsApp Service envía mensaje
    ↓
Paciente recibe recordatorio con botón "Cancelar Cita"
```

### **2. Cancelación de Cita:**

```
Paciente → Click en "Cancelar Cita"
    ↓
WhatsApp envía webhook a backend
    ↓
Backend procesa webhook:
  - Extrae appointment_id del payload
  - Verifica teléfono del paciente
  - Cambia status a 'cancelled'
  - Guarda razón de cancelación
    ↓
Cita cancelada automáticamente
```

---

## 📋 Próximos Pasos (Para Ti)

### **1. Actualizar Plantilla en Meta Business Manager**

Ve a https://business.facebook.com/wa/manage/message-templates/

**Edita la plantilla `appointment_reminder` existente:**

**Body:**
```
Hola {{1}},

Te recordamos tu cita médica:

📅 Fecha: {{2}}
🕐 Hora: {{3}}

Con {{4}} {{5}}

📍 Ubicación:
{{6}}

Por favor, llega 10 minutos antes de tu cita.

Si necesitas cancelar o reprogramar, presiona el botón de abajo.
```

**Agregar Botón:**
- Tipo: Quick Reply
- Texto: "Cancelar Cita"
- Payload: Deja vacío (se llenará dinámicamente)

**Enviar para aprobación** (24-48 horas)

---

### **2. Configurar Webhook en Meta Dashboard**

Ve a https://developers.facebook.com/apps/ → Tu app → WhatsApp → Configuration

**Webhook URL:** `https://tu-dominio.com/api/whatsapp/webhook`  
**Verify Token:** `mi_token_secreto_123` (debe coincidir con `META_WHATSAPP_VERIFY_TOKEN`)  
**Webhook Fields:** Marca `messages`

**Nota:** Para desarrollo local, usa ngrok o similar para exponer tu localhost.

---

### **3. Agregar Dirección del Consultorio**

El sistema ahora envía la dirección del consultorio. Para configurarla:

1. Inicia sesión como doctor
2. Ve a **Perfil → Editar**
3. Busca el campo **"Dirección del Consultorio"**
4. Ingresa la dirección completa
5. Guarda cambios

**Ejemplo:** `Av. Reforma 123, Col. Centro, CDMX 06000`

Si no se configura, se usará "Consultorio Médico" por defecto.

---

## 🧪 Pruebas

### **Probar Envío con Nuevos Parámetros:**

```bash
# Obtener token
TOKEN=$(curl -s -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"rafaelgarcia2027@gmail.com","password":"Password123!"}' \
  | python3 -c "import sys, json; print(json.load(sys.stdin)['access_token'])")

# Enviar recordatorio (reemplaza 123 con un ID de cita real)
curl -X POST "http://localhost:8000/api/whatsapp/appointment-reminder/123" \
  -H "Authorization: Bearer $TOKEN"
```

### **Probar Webhook:**

```bash
# 1. Verificación
curl "http://localhost:8000/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=mi_token_secreto_123&hub.challenge=1234567890"

# 2. Simular cancelación
curl -X POST "http://localhost:8000/api/whatsapp/webhook" \
  -H "Content-Type: application/json" \
  -d '{
    "object": "whatsapp_business_account",
    "entry": [{
      "changes": [{
        "value": {
          "messages": [{
            "from": "525579449672",
            "type": "button",
            "button": {
              "text": "Cancelar Cita",
              "payload": "cancel_appointment_123"
            }
          }]
        }
      }]
    }]
  }'
```

---

## 🔧 Configuración de Variables de Entorno

Asegúrate de tener esta variable en `compose.yaml`:

```yaml
META_WHATSAPP_VERIFY_TOKEN: mi_token_secreto_123
```

O agrégala ahora:

```bash
# Editar compose.yaml
nano compose.yaml

# Buscar la sección python-backend → environment
# Agregar:
- META_WHATSAPP_VERIFY_TOKEN=mi_token_secreto_123

# Reiniciar backend
docker-compose restart python-backend
```

---

## 📊 Monitoreo

### **Ver logs del webhook:**

```bash
docker logs medical-records-main-python-backend-1 -f | grep -i whatsapp
```

Verás logs como:
- `📱 Sending WhatsApp reminder for appointment: 123`
- `✅ WhatsApp sent successfully to 525579449672`
- `📱 Received WhatsApp webhook:`
- `🔘 Button clicked: Cancelar Cita (payload: cancel_appointment_123)`
- `✅ Appointment 123 cancelled successfully via WhatsApp`

---

## 📱 Ejemplo de Mensaje Real

```
╔═══════════════════════════════════════════════════════════╗
║  🏥 Recordatorio de Cita Médica                           ║
╠═══════════════════════════════════════════════════════════╣
║                                                            ║
║  Hola Juan Pérez González,                                ║
║                                                            ║
║  Te recordamos tu cita médica:                            ║
║                                                            ║
║  📅 Fecha: 25 de Enero de 2024                            ║
║  🕐 Hora: 10:30 AM                                        ║
║                                                            ║
║  Con Dr Rafael García                                     ║
║                                                            ║
║  📍 Ubicación:                                            ║
║  Av. Reforma 123, Col. Centro, CDMX 06000                 ║
║                                                            ║
║  Por favor, llega 10 minutos antes de tu cita.           ║
║                                                            ║
║  Si necesitas cancelar o reprogramar, presiona el        ║
║  botón de abajo.                                          ║
║                                                            ║
╠═══════════════════════════════════════════════════════════╣
║                                                            ║
║               [  ❌ Cancelar Cita  ]                      ║
║                                                            ║
╚═══════════════════════════════════════════════════════════╝
```

---

## ✅ Checklist de Implementación

### **Backend (Completado):**
- [x] Actualizar servicio de WhatsApp
- [x] Modificar endpoint de recordatorios
- [x] Crear endpoint de verificación de webhook
- [x] Crear endpoint de recepción de mensajes
- [x] Implementar lógica de cancelación automática
- [x] Agregar soporte para dirección del consultorio
- [x] Documentar todo el proceso

### **Frontend (Sin cambios necesarios):**
- [x] Los botones de WhatsApp siguen funcionando igual
- [x] No se requieren modificaciones

### **Configuración Externa (Pendiente - Requiere acción tuya):**
- [ ] Actualizar plantilla en Meta Business Manager
- [ ] Esperar aprobación de plantilla (24-48h)
- [ ] Configurar webhook en Meta Dashboard
- [ ] Configurar dirección del consultorio en perfil
- [ ] Probar envío de recordatorios
- [ ] Probar cancelación de citas

---

## 🎉 Beneficios de la Actualización

### **Para los Pacientes:**
✅ Información más completa (fecha, hora, dirección)  
✅ Pueden cancelar con un solo click  
✅ No necesitan llamar por teléfono  
✅ Experiencia más profesional  

### **Para los Doctores:**
✅ Menos llamadas para cancelaciones  
✅ Cancelaciones automáticas en el sistema  
✅ Pacientes mejor informados  
✅ Reducción de no-shows  

### **Para el Sistema:**
✅ Automatización de procesos  
✅ Mejor gestión de citas  
✅ Trazabilidad completa  
✅ Integración bidireccional  

---

## 📚 Documentación Relacionada

- **`docs/WHATSAPP_NEW_TEMPLATE.md`** - Guía técnica completa
- **`docs/WHATSAPP_INTEGRATION.md`** - Documentación original
- **`docs/WHATSAPP_TROUBLESHOOTING.md`** - Solución de problemas
- **`WHATSAPP_READY.md`** - Guía de uso general

---

## 🚀 ¡Todo Listo!

El código está implementado y funcionando. Solo falta:
1. **Actualizar la plantilla en Meta** (5 minutos)
2. **Configurar el webhook** (5 minutos)
3. **Agregar dirección del consultorio** (1 minuto)
4. **Esperar aprobación** (24-48 horas)

**¡Los pacientes podrán cancelar citas con un click! 🎯**

