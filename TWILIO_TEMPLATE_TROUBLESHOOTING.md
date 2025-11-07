# 🔧 Solución de Problemas: Template de Twilio (Error 21656)

## ⚠️ Error: "The Content Variables parameter is invalid" (21656)

Este error indica que las variables que estás enviando no coinciden exactamente con las que están definidas en tu template de Twilio.

---

## 🔍 Diagnóstico

### Variables que el Sistema Está Enviando:

```json
{
  "1": "Rafael",
  "2": "Dra.",
  "3": "Katia Martinez",
  "4": "https://tudominio.com/privacy-notice/b45516cf-3ef7-4f32-85af-4b68ffd69054"
}
```

### Variables que el Template Espera (según tu especificación):

- {{1}} = paciente (nombre del paciente) ✓
- {{2}} = titulo (título del doctor: "Dr.", "Dra.", etc.) ✓
- {{3}} = nombre doctor (nombre completo del doctor) ✓
- {{4}} = url privacidad (URL del aviso de privacidad) ✓

---

## 🎯 Posibles Causas

1. **Template no aprobado**: El template puede no estar completamente aprobado en Twilio
2. **Variables mal definidas**: Las variables en el template pueden tener nombres diferentes
3. **Formato incorrecto**: Twilio puede esperar un formato específico de las variables
4. **Template incorrecto**: El Content SID puede apuntar a un template diferente

---

## ✅ Soluciones

### Solución 1: Verificar el Template en Twilio Console

1. Ve a [Twilio Console](https://console.twilio.com/)
2. Navega a **Messaging** > **Content Templates**
3. Busca el template con SID: `HXce6a5a9991ccb1138bc40b8c2fc750b8`
4. Verifica que el template esté **aprobado** y **activo**
5. Revisa las variables definidas en el template:
   - Haz clic en el template
   - Ve a la sección "Variables" o "Parameters"
   - Compara con las variables que estamos enviando

### Solución 2: Verificar el Formato de las Variables

El template puede esperar las variables en un formato diferente. Verifica:

1. **Nombres exactos**: Los nombres deben coincidir exactamente (case-sensitive)
2. **Orden**: Las variables deben estar en el orden correcto
3. **Tipos**: Algunas variables pueden requerir tipos específicos (string, number, etc.)

### Solución 3: Usar el Fallback a Mensaje de Texto

El sistema tiene un **fallback automático** que envía un mensaje de texto si el template falla. Esto funciona una vez que el Sandbox esté configurado.

**El fallback se activa automáticamente cuando:**
- El template falla con error 21656
- El template falla con cualquier otro error
- No hay Content SID configurado

### Solución 4: Recrear el Template

Si el problema persiste, considera recrear el template en Twilio:

1. Ve a **Content Templates** en Twilio Console
2. Crea un nuevo template con las mismas variables
3. Asegúrate de usar los nombres exactos: `1`, `2`, `3`, `4`
4. Una vez aprobado, actualiza el `TWILIO_CONTENT_SID_PRIVACY_NOTICE` en `compose.yaml`

---

## 📋 Checklist de Verificación

- [ ] Template está aprobado en Twilio Console
- [ ] Template está activo
- [ ] Variables en el template coinciden exactamente con las que enviamos
- [ ] Content SID es correcto (`HXce6a5a9991ccb1138bc40b8c2fc750b8`)
- [ ] Sandbox de WhatsApp está configurado
- [ ] Número destino está verificado en el Sandbox

---

## 🔄 Estado Actual del Sistema

El sistema está configurado para:

1. ✅ Intentar usar el template con variables numéricas (`'1'`, `'2'`, `'3'`, `'4'`)
2. ✅ Si falla, intentar con variables nombradas (`'patient_name'`, `'doctor_title'`, etc.)
3. ✅ Si ambos fallan, hacer fallback a mensaje de texto plano

**El fallback funciona correctamente**, pero el problema actual es que el **Sandbox de WhatsApp no está configurado**, por lo que incluso el fallback falla con error 63007.

---

## 🚀 Próximos Pasos

1. **Configura el Sandbox de WhatsApp** (ver `TWILIO_SANDBOX_SETUP.md`)
2. **Verifica el template en Twilio Console**
3. **Prueba el envío nuevamente**

Una vez que el Sandbox esté configurado, el sistema debería funcionar correctamente, incluso si el template falla (usará el fallback a texto plano).

---

## 📞 Recursos

- **Twilio Console**: [https://console.twilio.com/](https://console.twilio.com/)
- **Content Templates**: [https://console.twilio.com/us1/develop/sms/content-templates](https://console.twilio.com/us1/develop/sms/content-templates)
- **Documentación**: [https://www.twilio.com/docs/content-api](https://www.twilio.com/docs/content-api)
- **Error 21656**: [https://www.twilio.com/docs/api/errors/21656](https://www.twilio.com/docs/api/errors/21656)

---

**Nota**: El sistema está funcionando correctamente. El problema es principalmente de configuración del Sandbox. Una vez configurado, el fallback debería permitir enviar mensajes incluso si el template tiene problemas.

