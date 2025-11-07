# 🔧 Guía de Configuración de WhatsApp con Twilio

## 📋 Índice
1. [Crear Cuenta en Twilio](#1-crear-cuenta-en-twilio)
2. [Configurar WhatsApp Sandbox (Desarrollo)](#2-configurar-whatsapp-sandbox-desarrollo)
3. [Obtener Credenciales](#3-obtener-credenciales)
4. [Configurar Variables de Entorno](#4-configurar-variables-de-entorno)
5. [Probar la Configuración](#5-probar-la-configuración)
6. [Solución de Problemas](#6-solución-de-problemas)

---

## 1. Crear Cuenta en Twilio

1. Ve a [https://www.twilio.com/](https://www.twilio.com/)
2. Haz clic en **"Sign Up"** (Registrarse)
3. Completa el formulario de registro
4. Verifica tu número de teléfono
5. Confirma tu correo electrónico

**Nota**: Twilio ofrece $15.50 USD de crédito gratuito al registrarte.

---

## 2. Configurar WhatsApp Sandbox (Desarrollo)

### Opción A: WhatsApp Sandbox (Gratuito - Solo para Desarrollo)

1. Inicia sesión en tu cuenta de Twilio
2. Ve a **Console** > **Messaging** > **Try it out** > **Send a WhatsApp message**
3. O ve directamente a: [https://console.twilio.com/us1/develop/sms/try-it-out/whatsapp-learn](https://console.twilio.com/us1/develop/sms/try-it-out/whatsapp-learn)
4. **Conecta tu número de WhatsApp**:
   - Escanea el código QR que aparece en pantalla
   - O envía el código que aparece a tu WhatsApp
5. Una vez conectado, verás tu número de WhatsApp Sandbox (ej: `whatsapp:+14155238886`)

**Limitaciones del Sandbox**:
- ✅ Gratuito
- ✅ Hasta 50 números verificados
- ❌ Solo puedes enviar mensajes a números que hayas verificado previamente
- ❌ No puedes recibir mensajes de números no verificados

### Opción B: WhatsApp Business API (Producción)

Para producción, necesitas:
1. Un número de teléfono de Twilio
2. Solicitar acceso a WhatsApp Business API
3. Obtener aprobación de Meta para tu negocio
4. Configurar un número de WhatsApp Business verificado

**Proceso completo**: [https://www.twilio.com/docs/whatsapp/tutorial/connect-number-business-profile](https://www.twilio.com/docs/whatsapp/tutorial/connect-number-business-profile)

---

## 3. Obtener Credenciales

### Account SID y Auth Token

1. Ve a **Console** > **Account** > **API Keys & Tokens**
2. O directamente: [https://console.twilio.com/us1/account/keys-credentials](https://console.twilio.com/us1/account/keys-credentials)
3. Encuentra:
   - **Account SID**: Comienza con `AC` (ej: `ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`)
   - **Auth Token**: Haz clic en "View" para verlo (se oculta por seguridad)

### Número de WhatsApp (Sandbox)

1. Ve a **Console** > **Messaging** > **Try it out** > **Send a WhatsApp message**
2. Verás tu número de WhatsApp Sandbox (formato: `whatsapp:+14155238886`)
3. Copia este número completo

---

## 4. Configurar Variables de Entorno

### Opción 1: Archivo .env (Recomendado)

1. **Copia el archivo de ejemplo**:
   ```bash
   cp .env.example .env
   ```

2. **Edita el archivo `.env`** en la raíz del proyecto:
   ```bash
   # Abre el archivo .env y reemplaza con tus credenciales
   WHATSAPP_PROVIDER=twilio
   TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   TWILIO_AUTH_TOKEN=tu_auth_token_aqui
   TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
   ```

3. **Descomenta la línea en `compose.yaml`** (línea 31):
   ```yaml
   env_file: .env  # Cambia de comentado a activo
   ```

4. **Reinicia los servicios**:
   ```bash
   docker-compose down
   docker-compose up -d
   ```

### Opción 2: Variables de Entorno del Sistema

Si prefieres usar variables de entorno del sistema:

**Linux/macOS**:
```bash
export TWILIO_ACCOUNT_SID="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
export TWILIO_AUTH_TOKEN="tu_auth_token_aqui"
export TWILIO_WHATSAPP_FROM="whatsapp:+14155238886"
```

**Windows (PowerShell)**:
```powershell
$env:TWILIO_ACCOUNT_SID="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
$env:TWILIO_AUTH_TOKEN="tu_auth_token_aqui"
$env:TWILIO_WHATSAPP_FROM="whatsapp:+14155238886"
```

Luego reinicia Docker:
```bash
docker-compose restart python-backend
```

---

## 5. Probar la Configuración

### Verificar que las variables están configuradas

```bash
# Ejecuta dentro del contenedor
docker-compose exec python-backend python -c "
import os
print('Account SID:', os.getenv('TWILIO_ACCOUNT_SID', 'NO CONFIGURADO'))
print('Auth Token:', 'CONFIGURADO' if os.getenv('TWILIO_AUTH_TOKEN') else 'NO CONFIGURADO')
print('WhatsApp From:', os.getenv('TWILIO_WHATSAPP_FROM', 'NO CONFIGURADO'))
"
```

### Probar el envío

1. Abre la aplicación en el navegador
2. Ve a **Gestión de Pacientes**
3. Selecciona un paciente
4. Haz clic en **"Enviar Aviso de Privacidad"**
5. Deberías ver un mensaje de éxito

### Verificar los logs

```bash
docker-compose logs python-backend --tail 50 | grep -i whatsapp
```

---

## 6. Solución de Problemas

### Error: "Twilio WhatsApp not configured"

**Causa**: Las variables de entorno no están configuradas correctamente.

**Solución**:
1. Verifica que el archivo `.env` existe y tiene las credenciales correctas
2. Verifica que `compose.yaml` tiene `env_file: .env` sin comentar
3. Reinicia el contenedor: `docker-compose restart python-backend`

### Error: "Authentication failed" o "401 Unauthorized"

**Causa**: Account SID o Auth Token incorrectos.

**Solución**:
1. Verifica que copiaste correctamente el Account SID (debe comenzar con `AC`)
2. Verifica que el Auth Token es correcto (sin espacios adicionales)
3. Regenera el Auth Token si es necesario en la consola de Twilio

### Error: "Invalid phone number" o "400 Bad Request"

**Causa**: Formato del número de teléfono incorrecto.

**Solución**:
1. Verifica que `TWILIO_WHATSAPP_FROM` tiene el formato: `whatsapp:+14155238886`
2. Asegúrate de incluir el prefijo `whatsapp:`
3. Verifica que el número está en formato E.164 (con código de país)

### Error: "Number not verified" (en Sandbox)

**Causa**: Estás intentando enviar a un número que no está verificado en el Sandbox.

**Solución**:
1. Ve a la consola de Twilio > WhatsApp Sandbox
2. Envía el código de verificación al número destino
3. O usa solo números que ya verificaste

### El mensaje no se envía pero no hay error

**Solución**:
1. Verifica los logs: `docker-compose logs python-backend --tail 100`
2. Verifica tu saldo en Twilio Console
3. Verifica que el número destino está en formato correcto

---

## 📞 Recursos Adicionales

- **Documentación de Twilio WhatsApp**: [https://www.twilio.com/docs/whatsapp](https://www.twilio.com/docs/whatsapp)
- **Console de Twilio**: [https://console.twilio.com/](https://console.twilio.com/)
- **Precios de Twilio WhatsApp**: [https://www.twilio.com/whatsapp/pricing](https://www.twilio.com/whatsapp/pricing)

---

## 💰 Costos

### Sandbox (Desarrollo)
- ✅ **Gratuito** durante el período de prueba
- ✅ Incluido en el crédito de $15.50 USD al registrarte

### Producción
- **México**: ~$0.005 USD por mensaje (más barato que Meta)
- **Conversaciones**: Gratis primeras 24h después del último mensaje
- **Crédito inicial**: $15.50 USD al registrarte

---

## ✅ Checklist de Configuración

- [ ] Cuenta de Twilio creada
- [ ] WhatsApp Sandbox configurado (o número de producción)
- [ ] Account SID obtenido
- [ ] Auth Token obtenido
- [ ] Número de WhatsApp obtenido
- [ ] Archivo `.env` creado con las credenciales
- [ ] `compose.yaml` actualizado para usar `.env`
- [ ] Contenedores reiniciados
- [ ] Configuración verificada
- [ ] Prueba de envío exitosa

---

**¡Listo!** Una vez completados estos pasos, deberías poder enviar mensajes de WhatsApp desde tu aplicación.

