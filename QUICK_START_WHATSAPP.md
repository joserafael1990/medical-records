# 🚀 Inicio Rápido - Configuración de WhatsApp

## Opción 1: Script Automático (Más Fácil) ⚡

```bash
./setup_whatsapp.sh
```

El script te guiará paso a paso para:
- Ingresar tus credenciales de Twilio
- Crear el archivo `.env` automáticamente
- Validar el formato de las credenciales

---

## Opción 2: Manual 📝

### Paso 1: Obtener Credenciales de Twilio

1. **Crea una cuenta en Twilio**: [https://www.twilio.com/](https://www.twilio.com/)
2. **Configura WhatsApp Sandbox**:
   - Ve a Console > Messaging > Try it out > Send a WhatsApp message
   - Escanea el código QR para conectar tu número
3. **Obtén tus credenciales**:
   - **Account SID**: Console > Account > API Keys & Tokens (comienza con `AC`)
   - **Auth Token**: Console > Account > API Keys & Tokens
   - **WhatsApp From**: El número que aparece en WhatsApp Sandbox (ej: `whatsapp:+14155238886`)

### Paso 2: Crear Archivo .env

Crea un archivo `.env` en la raíz del proyecto con este contenido:

```bash
# WhatsApp Configuration
WHATSAPP_PROVIDER=twilio
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=tu_auth_token_aqui
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
```

**Reemplaza**:
- `ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` con tu Account SID
- `tu_auth_token_aqui` con tu Auth Token
- `whatsapp:+14155238886` con tu número de WhatsApp

### Paso 3: Reiniciar el Backend

```bash
docker-compose restart python-backend
```

### Paso 4: Verificar

```bash
# Verificar que las variables están cargadas
docker-compose exec python-backend python -c "
import os
print('Account SID:', '✅' if os.getenv('TWILIO_ACCOUNT_SID') else '❌')
print('Auth Token:', '✅' if os.getenv('TWILIO_AUTH_TOKEN') else '❌')
print('WhatsApp From:', os.getenv('TWILIO_WHATSAPP_FROM', '❌ No configurado'))
"
```

---

## ✅ Verificar que Funciona

1. Abre la aplicación en el navegador
2. Ve a **Gestión de Pacientes**
3. Selecciona un paciente
4. Haz clic en **"Enviar Aviso de Privacidad"**
5. Deberías ver un mensaje de éxito ✅

---

## 📚 Documentación Completa

Para más detalles, consulta:
- **Guía Completa**: `WHATSAPP_TWILIO_SETUP.md`
- **Solución de Problemas**: Ver sección de troubleshooting en la guía

---

## 🔒 Seguridad

- ✅ El archivo `.env` está en `.gitignore` (no se subirá a git)
- ⚠️ **NUNCA** compartas tus credenciales
- ⚠️ **NUNCA** subas el archivo `.env` a repositorios públicos

---

## 💡 Tips

- **Sandbox**: Gratis, pero solo puedes enviar a números verificados
- **Producción**: Necesitas un número de WhatsApp Business aprobado
- **Costo**: ~$0.005 USD por mensaje en México

---

**¿Necesitas ayuda?** Consulta `WHATSAPP_TWILIO_SETUP.md` para la guía completa.

