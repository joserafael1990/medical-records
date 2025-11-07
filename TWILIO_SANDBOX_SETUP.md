# 🔧 Configurar WhatsApp Sandbox en Twilio

## ⚠️ Error: "Twilio could not find a Channel with the specified From address"

Este error indica que el número de WhatsApp no está conectado al **WhatsApp Sandbox** de Twilio.

---

## 📋 Pasos para Configurar el Sandbox

### Paso 1: Acceder al WhatsApp Sandbox

1. Inicia sesión en tu cuenta de Twilio: [https://console.twilio.com/](https://console.twilio.com/)
2. Ve a **Console** > **Messaging** > **Try it out** > **Send a WhatsApp message**
3. O ve directamente a: [https://console.twilio.com/us1/develop/sms/try-it-out/whatsapp-learn](https://console.twilio.com/us1/develop/sms/try-it-out/whatsapp-learn)

### Paso 2: Conectar tu Número de WhatsApp

Verás un código QR y un número de teléfono. Tienes dos opciones:

#### Opción A: Escanear Código QR (Recomendado)
1. Abre WhatsApp en tu teléfono
2. Ve a **Configuración** > **Dispositivos vinculados**
3. Toca **Vincular un dispositivo**
4. Escanea el código QR que aparece en la consola de Twilio

#### Opción B: Enviar Código por WhatsApp
1. Envía el código que aparece en pantalla (ej: `join <codigo>`) al número de WhatsApp de Twilio
2. El número suele ser: **+1 415 523 8886** (número de Sandbox de Twilio)
3. Envía el mensaje: `join <codigo>` (ej: `join abc-defg-hij`)

### Paso 3: Verificar Conexión

Una vez conectado, verás:
- ✅ "Your WhatsApp number is connected to the Sandbox"
- El número de WhatsApp que usarás (formato: `whatsapp:+14155238886`)

### Paso 4: Verificar el Número en tu Configuración

1. Copia el número que aparece (debe ser `whatsapp:+14155238886` o similar)
2. Verifica que en tu `compose.yaml` o `.env` tengas:
   ```yaml
   TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
   ```
3. Asegúrate de que coincida exactamente con el número del Sandbox

### Paso 5: Verificar Números Destino

⚠️ **IMPORTANTE**: En el Sandbox de Twilio, solo puedes enviar mensajes a números que hayas verificado previamente.

Para verificar un número:
1. En el Sandbox, verás una sección para agregar números
2. Agrega el número de destino (ej: `+525551234567`)
3. Envía un mensaje de WhatsApp a ese número con el código que te proporciona Twilio

---

## 🔍 Verificar que Está Configurado Correctamente

Ejecuta este comando para verificar:

```bash
docker-compose exec python-backend python -c "
from whatsapp_service import get_whatsapp_service
service = get_whatsapp_service()
print('Número configurado:', service.whatsapp_from)
print('Cliente inicializado:', service._client is not None)
"
```

---

## ❌ Solución de Problemas

### Error: "could not find a Channel"

**Causa**: El número no está conectado al Sandbox.

**Solución**:
1. Ve a la consola de Twilio > WhatsApp Sandbox
2. Conecta tu número siguiendo los pasos arriba
3. Verifica que el número en `TWILIO_WHATSAPP_FROM` coincide exactamente

### Error: "Content Variables parameter is invalid"

**Causa**: El formato de las variables del template no coincide con lo que espera Twilio.

**Solución**:
1. Ve a tu template en Twilio Console > Content Templates
2. Revisa qué variables espera (ej: `{{1}}`, `{{2}}`, o nombres como `{{patient_name}}`)
3. Ajusta el código en `whatsapp_service.py` para usar las claves correctas

### El mensaje no llega

**Causas posibles**:
1. El número destino no está verificado en el Sandbox
2. El número destino no está en formato correcto (debe incluir código de país)
3. El número destino no respondió al mensaje de verificación del Sandbox

**Solución**:
1. Verifica que el número destino esté en el Sandbox
2. Asegúrate de que el formato sea correcto (ej: `+525551234567` para México)
3. Revisa los logs de Twilio en la consola para ver el error específico

---

## 📞 Recursos

- **Consola de Twilio**: [https://console.twilio.com/](https://console.twilio.com/)
- **WhatsApp Sandbox**: [https://console.twilio.com/us1/develop/sms/try-it-out/whatsapp-learn](https://console.twilio.com/us1/develop/sms/try-it-out/whatsapp-learn)
- **Documentación**: [https://www.twilio.com/docs/whatsapp/sandbox](https://www.twilio.com/docs/whatsapp/sandbox)

---

## ✅ Checklist

- [ ] Cuenta de Twilio creada
- [ ] Accedido al WhatsApp Sandbox
- [ ] Número de WhatsApp conectado al Sandbox
- [ ] Número verificado en la consola
- [ ] `TWILIO_WHATSAPP_FROM` configurado correctamente
- [ ] Números destino agregados al Sandbox (si es necesario)
- [ ] Prueba de envío exitosa

---

**Una vez configurado el Sandbox, el sistema debería funcionar correctamente.**

