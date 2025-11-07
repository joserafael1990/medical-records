# 🔄 Cambiar de Twilio a Meta WhatsApp Directo

## 📋 Resumen

El sistema ya tiene soporte completo para ambos proveedores. Solo necesitas cambiar la configuración en `compose.yaml`.

---

## ✅ Pasos para Cambiar a Meta WhatsApp

### 1. Actualizar `compose.yaml`

**Reemplaza las variables de entorno de Twilio por las de Meta:**

```yaml
environment:
  - MEDICAL_ENCRYPTION_KEY=17TAemFFyvzzOSCNdm9fISoQjiWzlWAgVJslIOYaGpU=
  - WHATSAPP_PROVIDER=meta  # Cambiar de "twilio" a "meta"
  # Meta WhatsApp credentials
  - META_WHATSAPP_PHONE_ID=TU_PHONE_NUMBER_ID
  - META_WHATSAPP_TOKEN=TU_ACCESS_TOKEN
  - META_WHATSAPP_API_VERSION=v24.0
  # Opcional:
  - META_WHATSAPP_BUSINESS_ID=TU_BUSINESS_ACCOUNT_ID
  - META_WHATSAPP_VERIFY_TOKEN=tu_token_verificacion
  # Comentar o eliminar las credenciales de Twilio:
  # - TWILIO_ACCOUNT_SID=...
  # - TWILIO_AUTH_TOKEN=...
  # - TWILIO_WHATSAPP_FROM=...
```

### 2. Obtener Credenciales de Meta

1. Ve a [Meta for Developers](https://developers.facebook.com/)
2. Crea una aplicación Business (si no tienes una)
3. Agrega el producto **WhatsApp**
4. Obtén las credenciales:
   - **Phone Number ID**: En WhatsApp > API Setup
   - **Access Token**: Token permanente del System User
   - **Business Account ID**: ID de la cuenta de negocio (opcional)

### 3. Reiniciar el Backend

```bash
docker-compose down
docker-compose up -d --build
```

### 4. Verificar la Configuración

El sistema automáticamente detectará que `WHATSAPP_PROVIDER=meta` y usará `WhatsAppService` en lugar de `TwilioWhatsAppService`.

---

## 🔍 Diferencias Clave

### Formato de Números

**Twilio:**
- Requiere formato: `whatsapp:+525579449672`
- Necesita Sandbox para desarrollo

**Meta:**
- Formato: `525579449672` (sin `whatsapp:` ni `+`)
- Puede enviar a cualquier número verificado (no necesita Sandbox)

### Templates

**Twilio:**
- Usa Content SIDs
- Formato: `content_variables` como JSON string

**Meta:**
- Usa nombres de templates (ej: `privacy_notice`, `appointment_reminder`)
- Formato: `parameters` como array

### Mensajes Interactivos

**Twilio:**
- Botones limitados
- Requiere template aprobado

**Meta:**
- Botones más flexibles
- Puede usar templates o mensajes libres (dentro de ventana de 24h)

---

## ✅ Métodos Disponibles en Meta

Todos los métodos necesarios ya están implementados en `WhatsAppService`:

- ✅ `send_text_message()` - Mensajes de texto simples
- ✅ `send_template_message()` - Mensajes con templates aprobados
- ✅ `send_appointment_reminder()` - Recordatorios de citas
- ✅ `send_interactive_privacy_notice()` - Avisos de privacidad con botón interactivo
- ✅ `send_lab_results_notification()` - Notificaciones de resultados

---

## 📝 Configurar Templates en Meta

### Template de Aviso de Privacidad

1. Ve a [Meta Business Manager](https://business.facebook.com/)
2. Selecciona tu cuenta de WhatsApp Business
3. Ve a **Templates** > **Create Template**
4. Configura el template:
   - **Nombre**: `privacy_notice`
   - **Categoría**: Utility
   - **Idioma**: Español
   - **Variables**: 
     - `{{1}}` = nombre del paciente
     - `{{2}}` = título del doctor
     - `{{3}}` = nombre del doctor
     - `{{4}}` = URL del aviso de privacidad

### Template de Recordatorio de Cita

1. Crea un template llamado `appointment_reminder`
2. Configura las variables necesarias según el formato en el código

---

## ⚠️ Consideraciones

### Ventajas de Meta:
- ✅ Sin Sandbox (puedes enviar a cualquier número verificado)
- ✅ Templates más flexibles
- ✅ Mejor integración nativa
- ✅ 1,000 mensajes gratis al mes en modo desarrollo
- ✅ Costo más bajo para volúmenes altos

### Desventajas de Meta:
- ⚠️ Requiere aprobación de Meta Business
- ⚠️ Proceso de configuración más complejo
- ⚠️ Necesita verificar dominio para webhooks en producción

---

## 🔧 Webhooks

### Configurar Webhook en Meta

1. Ve a tu aplicación en Meta Developers
2. Configura el webhook:
   - **URL**: `https://tu-dominio.com/api/webhooks/whatsapp`
   - **Verify Token**: El mismo que configuraste en `META_WHATSAPP_VERIFY_TOKEN`
   - **Campos**: `messages`, `message_status`

El endpoint ya está implementado en `main_clean_english.py` y funciona con ambos proveedores.

---

## 📞 Recursos

- **Meta for Developers**: [https://developers.facebook.com/](https://developers.facebook.com/)
- **WhatsApp Business API**: [https://developers.facebook.com/docs/whatsapp](https://developers.facebook.com/docs/whatsapp)
- **Guía de Setup Completa**: Ver `WHATSAPP_SETUP_GUIDE.md`

---

## 🚀 Próximos Pasos

1. ✅ Obtener credenciales de Meta
2. ✅ Actualizar `compose.yaml`
3. ✅ Configurar templates en Meta Business Manager
4. ✅ Configurar webhook en Meta
5. ✅ Reiniciar el backend
6. ✅ Probar el envío de mensajes

---

**¿Necesitas ayuda con algún paso específico?**

