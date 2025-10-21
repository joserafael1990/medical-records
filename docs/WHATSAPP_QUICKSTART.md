# 🚀 Guía Rápida: WhatsApp en 10 Minutos

## ✅ Lo que ya está hecho:
- ✅ Servicio de WhatsApp implementado en backend
- ✅ 3 endpoints listos para usar
- ✅ Documentación completa en `WHATSAPP_INTEGRATION.md`

## 📝 Pasos para activar (10 minutos)

### 1️⃣ Crear App en Meta (3 minutos)

1. Ir a https://developers.facebook.com/
2. Click en **"Create App"**
3. Tipo: **"Business"**
4. Nombre: **"Medical Records WhatsApp"**
5. Completar y **"Create App"**

### 2️⃣ Configurar WhatsApp (5 minutos)

1. En tu app, buscar **"WhatsApp"** en productos
2. Click en **"Set up"**
3. **Importante**: Copiar estos valores:
   ```
   Phone Number ID: [copia este número]
   Access Token (Temporary): [copia este token]
   ```

### 3️⃣ Configurar Backend (2 minutos)

1. Crear archivo `backend/.env` (copiar de `env.example`)
2. Agregar tus credenciales:
   ```bash
   META_WHATSAPP_PHONE_ID=tu_phone_id_aqui
   META_WHATSAPP_TOKEN=tu_token_aqui
   META_WHATSAPP_API_VERSION=v18.0
   ```

### 4️⃣ Registrar tu número de prueba (2 minutos)

1. En el dashboard de WhatsApp, sección **"To"**
2. Click en **"Manage phone number list"**
3. Agregar tu número: **+52XXXXXXXXXX** (México)
4. Recibirás un código por WhatsApp
5. Ingresar el código

### 5️⃣ Probar (1 minuto)

Reiniciar backend y probar:

```bash
# En el backend
docker restart medical-records-main-python-backend-1

# Probar endpoint (reemplaza el token y el número)
curl -X POST http://localhost:8000/api/whatsapp/test?phone=5212345678 \
  -H "Authorization: Bearer TU_JWT_TOKEN"
```

**¡Deberías recibir un mensaje de WhatsApp!** 🎉

---

## ⚠️ Importante para PRODUCCIÓN

### Necesitas crear plantillas aprobadas:

1. Ir a https://business.facebook.com/wa/manage/
2. Click en **"Message Templates"**
3. Crear estas 3 plantillas:

#### Plantilla 1: `appointment_reminder`
```
Hola {{1}}, 

📅 Recordatorio de cita médica:
🏥 Doctor: {{2}}
📆 Fecha: {{3}}
🕐 Hora: {{4}}

Por favor confirma tu asistencia.
```

#### Plantilla 2: `lab_results_ready`
```
Hola {{1}},

✅ Tus resultados de {{2}} ya están disponibles.

Puedes consultarlos ingresando aquí:
{{3}}

Este enlace expira en 48 horas.
```

#### Plantilla 3: `appointment_confirmation`
```
{{1}}

Consultorio: {{2}}
Teléfono: {{3}}
```

**Esperar aprobación (24-48 horas)**, luego:

---

## 🎯 Endpoints Disponibles

Una vez aprobadas las plantillas, puedes usar:

### 1. Recordatorio de Cita
```bash
POST /api/whatsapp/appointment-reminder/{appointment_id}
```

### 2. Notificación de Resultados
```bash
POST /api/whatsapp/study-results/{study_id}
```

### 3. Prueba General
```bash
POST /api/whatsapp/test?phone=5212345678
```

---

## 🎁 Extra: Botones en el Frontend (Próximamente)

Agregaremos botones en:
- ✅ Vista de citas → "📱 Enviar recordatorio"
- ✅ Estudios clínicos → "📱 Notificar resultados"

---

## 💰 Costos

### Desarrollo:
- **GRATIS** hasta 1,000 mensajes/mes
- Máximo 5 números de prueba

### Producción:
- **GRATIS** primeros 1,000 mensajes/mes
- Después: ~$0.0087 USD/mensaje en México
- ~$9 USD por cada 1,000 mensajes adicionales

---

## 🆘 Problemas Comunes

### ❌ Error: "Param recipient_type must be one of..."
**Solución**: Tu número no está registrado. Ve al paso 4️⃣

### ❌ Error: "Template not found"
**Solución**: Tus plantillas no están aprobadas. Espera 24-48 hrs.

### ❌ Error: "Invalid access token"
**Solución**: 
1. El token temporal expira en 24 horas
2. Genera token permanente:
   - Meta Business Suite → System Users
   - Crear System User
   - Generar Access Token (no expira)

---

## 📚 Documentación Completa

Para más detalles, ver: `docs/WHATSAPP_INTEGRATION.md`

---

## ✨ Próximos Pasos

Después de configurar:
1. ✅ Probar con tu número
2. ✅ Crear plantillas
3. ✅ Esperar aprobación
4. 📱 Agregar botones en UI
5. 🚀 ¡Usar en producción!

