# 🔧 Guía de Configuración de WhatsApp

## 📋 Paso a Paso para Configurar WhatsApp Business API

### 1. Crear Cuenta de Desarrollador en Meta

1. Ve a: https://developers.facebook.com/
2. Crea una cuenta o inicia sesión
3. Crea una nueva aplicación:
   - **Tipo**: "Business"
   - **Nombre**: "CORTEX Medical Records"

### 2. Configurar WhatsApp Business API

1. En tu aplicación de Meta:
   - Ve a "WhatsApp" en el menú lateral
   - Selecciona "API Setup"
   - Sigue las instrucciones para configurar

2. Obtén las credenciales necesarias:
   - **Phone Number ID**: Se encuentra en WhatsApp > API Setup
   - **Access Token**: Token permanente del System User
   - **Business Account ID**: ID de la cuenta de WhatsApp Business

### 3. Configurar Variables de Entorno

Edita el archivo `backend/.env` y reemplaza estos valores:

```bash
# Phone Number ID (obtenido de WhatsApp > API Setup)
META_WHATSAPP_PHONE_ID=TU_PHONE_NUMBER_ID_AQUI

# Access Token (obtenido del System User)
META_WHATSAPP_TOKEN=TU_ACCESS_TOKEN_AQUI

# WhatsApp Business Account ID
META_WHATSAPP_BUSINESS_ID=TU_BUSINESS_ACCOUNT_ID_AQUI

# Versión de la API (recomendado: v18.0 o superior)
META_WHATSAPP_API_VERSION=v18.0
```

### 4. Reiniciar el Backend

```bash
docker-compose restart python-backend
```

### 5. Probar la Configuración

1. Ve a la agenda de citas
2. Haz clic en el botón "WhatsApp" de una cita
3. Deberías ver un mensaje de éxito en lugar del error

## 🔍 Solución de Problemas

### Error 401 Unauthorized
- **Causa**: Token de acceso inválido o expirado
- **Solución**: Obtén un nuevo token de acceso de Meta

### Error 403 Forbidden
- **Causa**: Permisos insuficientes
- **Solución**: Verifica que tu aplicación tenga permisos de WhatsApp

### Error 400 Bad Request
- **Causa**: Formato de número de teléfono incorrecto
- **Solución**: Verifica que el número tenga el formato correcto (con código de país)

## 📞 Modo Desarrollo (Gratis)

- **1,000 mensajes gratis** al mes
- **Máximo 5 números de prueba**
- **Los números deben ser verificados** en el dashboard de Meta

## 💰 Costos en Producción

- **México**: ~$0.0087 USD por mensaje
- **Conversaciones de servicio**: Gratis primeras 24h
- **Después de 1,000 mensajes gratis**: Se cobra por mensaje

## 🎯 Plantillas Requeridas

Para que funcione completamente, necesitas crear estas plantillas en Meta Business Manager:

1. **appointment_reminder** - Recordatorio de citas
2. **lab_results_ready** - Notificación de resultados
3. **appointment_confirmation** - Confirmaciones genéricas

**Nota**: Todas las plantillas deben ser aprobadas por Meta (24-48 horas).

