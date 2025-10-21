# 📱 WhatsApp - Nueva Estructura de Plantilla

## 🎯 Actualización Importante

La plantilla de WhatsApp `appointment_reminder` ha sido actualizada para incluir **6 parámetros** y un **botón de cancelación interactivo**.

---

## 📋 Nueva Estructura de Plantilla

### **Nombre de la Plantilla:** `appointment_reminder`

### **Parámetros (6 en total):**

| # | Nombre | Descripción | Ejemplo |
|---|--------|-------------|---------|
| 1 | **Nombre del Paciente** | Nombre completo del paciente | "Juan Pérez González" |
| 2 | **Fecha de la Cita** | Fecha completa en español | "25 de Enero de 2024" |
| 3 | **Hora de la Cita** | Hora en formato 12h | "10:30 AM" |
| 4 | **Título del Médico** | Dr o Dra según género | "Dr" o "Dra" |
| 5 | **Nombre del Médico** | Nombre completo del doctor | "Rafael García" |
| 6 | **Dirección del Consultorio** | Dirección completa | "Av. Reforma 123, Col. Centro, CDMX" |

---

## 📝 Texto de la Plantilla (Sugerido)

### **Header:** (Opcional)
```
🏥 Recordatorio de Cita Médica
```

### **Body:**
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

### **Footer:** (Opcional)
```
Gracias por tu preferencia 🙏
```

### **Botones:**

**Tipo:** Quick Reply Button

| Texto del Botón | Payload |
|-----------------|---------|
| "Cancelar Cita" | `cancel_appointment_{appointment_id}` |

**Nota:** El `{appointment_id}` es el ID real de la cita que se inserta dinámicamente.

---

## 🔄 Ejemplo de Mensaje Completo

```
╔══════════════════════════════════════════════════════════╗
║  🏥 Recordatorio de Cita Médica                          ║
╠══════════════════════════════════════════════════════════╣
║                                                           ║
║  Hola Juan Pérez González,                               ║
║                                                           ║
║  Te recordamos tu cita médica:                           ║
║                                                           ║
║  📅 Fecha: 25 de Enero de 2024                           ║
║  🕐 Hora: 10:30 AM                                       ║
║                                                           ║
║  Con Dr Rafael García                                    ║
║                                                           ║
║  📍 Ubicación:                                           ║
║  Av. Reforma 123, Col. Centro, CDMX                      ║
║                                                           ║
║  Por favor, llega 10 minutos antes de tu cita.          ║
║                                                           ║
║  Si necesitas cancelar o reprogramar, presiona el       ║
║  botón de abajo.                                         ║
║                                                           ║
╠══════════════════════════════════════════════════════════╣
║                                                           ║
║              [  ❌ Cancelar Cita  ]                      ║
║                                                           ║
╠══════════════════════════════════════════════════════════╣
║  Gracias por tu preferencia 🙏                           ║
╚══════════════════════════════════════════════════════════╝
```

---

## 🛠️ Configuración en Meta Business Manager

### **Paso 1: Crear la Plantilla**

1. Ve a https://business.facebook.com/wa/manage/message-templates/
2. Click en **"Create Template"**
3. Datos básicos:
   - **Name:** `appointment_reminder`
   - **Category:** `UTILITY` (para notificaciones transaccionales)
   - **Languages:** Español (es)

### **Paso 2: Configurar el Header**
- **Type:** Text
- **Text:** `🏥 Recordatorio de Cita Médica`

### **Paso 3: Configurar el Body**
Copia y pega el texto del body (ver arriba), reemplazando con {{1}}, {{2}}, etc.

### **Paso 4: Configurar el Footer**
- **Text:** `Gracias por tu preferencia 🙏`

### **Paso 5: Agregar Botón**
- **Button Type:** Quick Reply
- **Button Text:** `Cancelar Cita`
- **Developer Defined Payload:** Deja vacío (se llenará dinámicamente)

### **Paso 6: Enviar para Aprobación**
- Review todos los campos
- Click en **"Submit"**
- **Tiempo de aprobación:** 24-48 horas

---

## 🔧 Implementación Técnica

### **Backend - Envío del Mensaje**

El endpoint `POST /api/whatsapp/appointment-reminder/{appointment_id}` automáticamente:

1. **Obtiene los datos de la cita**
2. **Formatea los parámetros:**
   - Nombre completo del paciente (con apellidos)
   - Fecha en español (ej: "25 de Enero de 2024")
   - Hora en formato 12h (ej: "10:30 AM")
   - Título del doctor según género
   - Nombre completo del doctor
   - Dirección del consultorio desde el perfil

3. **Envía el mensaje** con la plantilla `appointment_reminder`

### **Código de Ejemplo:**

```python
whatsapp.send_appointment_reminder(
    patient_phone="525579449672",
    patient_full_name="Juan Pérez González",
    appointment_date="25 de Enero de 2024",
    appointment_time="10:30 AM",
    doctor_title="Dr",
    doctor_full_name="Rafael García",
    office_address="Av. Reforma 123, Col. Centro, CDMX"
)
```

---

## 📥 Webhook - Recepción de Cancelaciones

### **Configuración del Webhook en Meta**

1. Ve a https://developers.facebook.com/apps/
2. Tu app → WhatsApp → Configuration
3. **Webhook URL:** `https://tu-dominio.com/api/whatsapp/webhook`
4. **Verify Token:** (configúralo en `META_WHATSAPP_VERIFY_TOKEN`)
5. **Webhook Fields:** Marca `messages`

### **Flujo de Cancelación:**

```
1. Paciente recibe recordatorio de cita
2. Paciente presiona botón "Cancelar Cita"
3. WhatsApp envía webhook a tu servidor:
   - Tipo: button
   - Payload: cancel_appointment_123
4. Backend procesa el webhook:
   - Extrae appointment_id del payload
   - Verifica que el teléfono pertenece al paciente
   - Cambia status de la cita a 'cancelled'
   - Guarda razón: "Cancelada por el paciente vía WhatsApp"
5. Sistema envía confirmación al paciente (opcional)
```

### **Endpoints del Webhook:**

**GET /api/whatsapp/webhook** - Verificación (requerido por Meta)
```bash
curl "http://localhost:8000/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=mi_token_secreto_123&hub.challenge=1234567890"
```

**POST /api/whatsapp/webhook** - Recepción de mensajes
- Procesa mensajes entrantes
- Detecta clics en botones
- Ejecuta acciones (ej: cancelar cita)

---

## 🔐 Variables de Entorno

Actualiza tu `compose.yaml` o `.env`:

```yaml
# Credenciales existentes
META_WHATSAPP_PHONE_ID=883218048200840
META_WHATSAPP_TOKEN=YOUR_ACCESS_TOKEN
META_WHATSAPP_BUSINESS_ID=1356461769229365
META_WHATSAPP_API_VERSION=v24.0

# Nueva variable para webhook
META_WHATSAPP_VERIFY_TOKEN=mi_token_secreto_123
```

**Importante:** El `VERIFY_TOKEN` debe ser el mismo que configures en el dashboard de Meta.

---

## 🧪 Pruebas

### **1. Probar Envío de Recordatorio:**

```bash
# Obtener token
TOKEN=$(curl -s -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"rafaelgarcia2027@gmail.com","password":"Password123!"}' \
  | python3 -c "import sys, json; print(json.load(sys.stdin)['access_token'])")

# Enviar recordatorio (reemplaza {appointment_id} con un ID real)
curl -X POST "http://localhost:8000/api/whatsapp/appointment-reminder/123" \
  -H "Authorization: Bearer $TOKEN"
```

### **2. Probar Webhook (Simulación):**

```bash
# Simular verificación del webhook
curl "http://localhost:8000/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=mi_token_secreto_123&hub.challenge=1234567890"

# Simular cancelación de cita
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

## ✅ Checklist de Implementación

- [x] Actualizar servicio de WhatsApp con 6 parámetros
- [x] Modificar endpoint para enviar 6 parámetros
- [x] Agregar campo `office_address` al perfil del doctor
- [x] Crear endpoint GET /api/whatsapp/webhook (verificación)
- [x] Crear endpoint POST /api/whatsapp/webhook (recepción)
- [x] Implementar lógica de cancelación de citas
- [ ] Crear plantilla en Meta Business Manager
- [ ] Esperar aprobación de la plantilla (24-48h)
- [ ] Configurar webhook en Meta Dashboard
- [ ] Probar envío de recordatorios
- [ ] Probar cancelación de citas vía botón

---

## 📊 Monitoreo

### **Ver logs de WhatsApp:**
```bash
docker logs medical-records-main-python-backend-1 --tail 100 | grep -i whatsapp
```

### **Logs importantes:**
- `📱 Sending WhatsApp reminder for appointment:`
- `✅ WhatsApp sent successfully to`
- `📱 Received WhatsApp webhook:`
- `🔘 Button clicked:`
- `✅ Appointment X cancelled successfully via WhatsApp`

---

## 🚨 Troubleshooting

### **La plantilla no se aprueba**
- Verifica que el texto cumple con las políticas de Meta
- No uses palabras prohibidas (descuentos, promociones, etc.)
- Mantén el mensaje transaccional y profesional

### **El webhook no funciona**
- Verifica que la URL sea pública y accesible
- Comprueba que el `VERIFY_TOKEN` coincida
- Revisa que el servidor responda en menos de 10 segundos

### **El botón no responde**
- Verifica que el payload tenga el formato correcto
- Comprueba que el webhook esté recibiendo los mensajes
- Revisa los logs del backend

---

## 📚 Documentación Adicional

- **Meta WhatsApp Templates:** https://developers.facebook.com/docs/whatsapp/message-templates
- **Webhooks:** https://developers.facebook.com/docs/whatsapp/webhooks
- **Button Payloads:** https://developers.facebook.com/docs/whatsapp/message-templates/interactive

---

**✅ Con esta nueva estructura, los pacientes podrán recibir recordatorios completos y cancelar citas con un solo click!** 🎉

