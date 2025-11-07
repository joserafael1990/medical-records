# 🔄 Migración de Twilio a Meta WhatsApp Directo

## 📋 Cambios Necesarios

El sistema ya tiene soporte para ambos proveedores. Solo necesitas cambiar la configuración.

---

## ✅ Paso 1: Actualizar Variables de Entorno

### En `compose.yaml`:

**Antes (Twilio):**
```yaml
environment:
  - WHATSAPP_PROVIDER=twilio
  - TWILIO_ACCOUNT_SID=...
  - TWILIO_AUTH_TOKEN=...
  - TWILIO_WHATSAPP_FROM=...
```

**Después (Meta):**
```yaml
environment:
  - WHATSAPP_PROVIDER=meta  # O simplemente no configurar (usa Meta por defecto)
  - META_WHATSAPP_PHONE_ID=TU_PHONE_NUMBER_ID
  - META_WHATSAPP_TOKEN=TU_ACCESS_TOKEN
  - META_WHATSAPP_API_VERSION=v24.0
  # Opcional:
  - META_WHATSAPP_BUSINESS_ID=TU_BUSINESS_ACCOUNT_ID
  - META_WHATSAPP_VERIFY_TOKEN=tu_token_verificacion
```

---

## ✅ Paso 2: Obtener Credenciales de Meta

1. **Ve a [Meta for Developers](https://developers.facebook.com/)**
2. **Crea una aplicación Business**
3. **Agrega el producto WhatsApp**
4. **Obtén las credenciales:**
   - `META_WHATSAPP_PHONE_NUMBER_ID`: En WhatsApp > API Setup
   - `META_WHATSAPP_TOKEN`: Token permanente del System User
   - `META_WHATSAPP_BUSINESS_ACCOUNT_ID`: ID de la cuenta de negocio

---

## ✅ Paso 3: Configurar Templates en Meta

### Ventajas de Meta vs Twilio:

1. **Templates más flexibles**: Meta permite más tipos de mensajes interactivos
2. **Mejor integración**: API nativa de WhatsApp
3. **Costo**: Más económico para volúmenes altos
4. **Sin Sandbox**: Puedes enviar a cualquier número verificado

### Crear Template en Meta:

1. Ve a [Meta Business Manager](https://business.facebook.com/)
2. Selecciona tu cuenta de WhatsApp Business
3. Ve a **Templates** > **Create Template**
4. Configura el template con las variables necesarias:
   - Variable 1: `{{1}}` (nombre del paciente)
   - Variable 2: `{{2}}` (título del doctor)
   - Variable 3: `{{3}}` (nombre del doctor)
   - Variable 4: `{{4}}` (URL del aviso de privacidad)

---

## ✅ Paso 4: Actualizar el Código (si es necesario)

El código ya está preparado, pero necesitamos verificar que `WhatsAppService` tenga todos los métodos necesarios.

### Métodos que deben estar implementados:

- ✅ `send_text_message()` - Ya implementado
- ✅ `send_template_message()` - Ya implementado
- ✅ `send_appointment_reminder()` - Ya implementado
- ⚠️ `send_interactive_privacy_notice()` - Necesita actualización (acepta parámetros diferentes)

---

## ✅ Paso 5: Actualizar Webhooks

### Webhook de Meta:

1. Ve a tu aplicación en Meta Developers
2. Configura el webhook:
   - **URL**: `https://tu-dominio.com/api/webhooks/whatsapp`
   - **Verify Token**: El mismo que configuraste en `META_WHATSAPP_VERIFY_TOKEN`
   - **Campos**: `messages`, `message_status`

---

## 🔍 Diferencias Clave: Meta vs Twilio

### 1. Formato de Números

**Twilio:**
- Formato: `whatsapp:+525579449672`
- Requiere Sandbox para desarrollo

**Meta:**
- Formato: `525579449672` (sin `whatsapp:` ni `+`)
- Puede enviar a cualquier número verificado

### 2. Templates

**Twilio:**
- Usa Content SIDs
- Formato: `content_variables` como JSON string

**Meta:**
- Usa nombres de templates
- Formato: `parameters` como array

### 3. Mensajes Interactivos

**Twilio:**
- Botones limitados
- Requiere Content SID

**Meta:**
- Botones más flexibles
- Puede usar templates o mensajes libres (dentro de ventana de 24h)

---

## 📝 Cambios de Código Necesarios

### 1. Actualizar `send_interactive_privacy_notice` en `WhatsAppService`

El método actual no acepta `doctor_title` y `doctor_full_name` como parámetros separados. Necesitamos actualizarlo para que coincida con la interfaz de `TwilioWhatsAppService`.

---

## 🚀 Pasos para Migrar

1. ✅ Obtener credenciales de Meta
2. ✅ Actualizar `compose.yaml` con credenciales de Meta
3. ✅ Remover o comentar credenciales de Twilio
4. ✅ Configurar templates en Meta Business Manager
5. ✅ Actualizar webhook en Meta
6. ✅ Reiniciar el backend
7. ✅ Probar el envío de mensajes

---

## ⚠️ Consideraciones

### Ventajas de Meta:
- ✅ Sin Sandbox (puedes enviar a cualquier número)
- ✅ Templates más flexibles
- ✅ Mejor integración nativa
- ✅ Costo más bajo para volúmenes altos
- ✅ 1,000 mensajes gratis al mes en modo desarrollo

### Desventajas de Meta:
- ⚠️ Requiere aprobación de Meta Business
- ⚠️ Proceso de configuración más complejo
- ⚠️ Necesita verificar dominio para webhooks

### Ventajas de Twilio:
- ✅ Más fácil de configurar (Sandbox)
- ✅ No requiere aprobación inicial
- ✅ Bueno para pruebas rápidas

### Desventajas de Twilio:
- ⚠️ Requiere Sandbox (limitado)
- ⚠️ Costo más alto
- ⚠️ Templates menos flexibles

---

## 📞 Recursos

- **Meta for Developers**: [https://developers.facebook.com/](https://developers.facebook.com/)
- **WhatsApp Business API**: [https://developers.facebook.com/docs/whatsapp](https://developers.facebook.com/docs/whatsapp)
- **Guía de Setup**: Ver `WHATSAPP_SETUP_GUIDE.md`

---

**¿Quieres que actualice el código para usar Meta directamente?**

