# 🔧 Configuración de Variables del Template de Twilio

## ⚠️ Error: "The Content Variables parameter is invalid" (21656)

Este error indica que las variables que estás enviando al template no coinciden con las que están definidas en el template de Twilio.

---

## 📋 Cómo Verificar las Variables de tu Template

### Paso 1: Acceder a tu Template en Twilio

1. Inicia sesión en [Twilio Console](https://console.twilio.com/)
2. Ve a **Messaging** > **Content Templates**
3. Busca el template con Content SID: `HXce6a5a9991ccb1138bc40b8c2fc750b8`
4. Haz clic en el template para ver los detalles

### Paso 2: Ver las Variables del Template

En los detalles del template, verás las variables definidas. Pueden estar en dos formatos:

#### Formato 1: Variables Numéricas
```
{{1}} - Nombre del paciente
{{2}} - Nombre del doctor
{{3}} - URL del aviso de privacidad
{{4}} - ID del consentimiento
```

#### Formato 2: Variables Nombradas
```
{{patient_name}} - Nombre del paciente
{{doctor_name}} - Nombre del doctor
{{privacy_url}} - URL del aviso de privacidad
{{consent_id}} - ID del consentimiento
```

---

## 🔧 Configuración Actual del Sistema

El sistema ahora intenta **ambos formatos automáticamente**:

1. **Primero intenta con variables numéricas** (`'1'`, `'2'`, `'3'`, `'4'`)
2. **Si falla, intenta con variables nombradas** (`'patient_name'`, `'doctor_name'`, etc.)
3. **Si ambos fallan, hace fallback a mensaje de texto plano**

---

## 📝 Verificar la Configuración Correcta

### Si tu Template usa Variables Numéricas ({{1}}, {{2}}, etc.)

El sistema ya está configurado correctamente. Las variables se envían como:
```python
{
    '1': patient_name,
    '2': doctor_name,
    '3': privacy_notice_url,
    '4': str(consent_id)
}
```

### Si tu Template usa Variables Nombradas

Necesitas verificar que los nombres coincidan exactamente. El sistema intenta:
```python
{
    'patient_name': patient_name,
    'doctor_name': doctor_name,
    'privacy_url': privacy_notice_url,
    'consent_id': str(consent_id)
}
```

**Si tu template usa nombres diferentes**, necesitas modificar el código en `backend/whatsapp_service.py` en el método `send_interactive_privacy_notice`.

---

## 🔍 Cómo Verificar los Nombres Exactos

1. En Twilio Console, ve a tu template
2. Copia exactamente los nombres de las variables (incluyendo mayúsculas/minúsculas)
3. Compara con los nombres en el código:
   - `backend/whatsapp_service.py` línea ~800-820
   - Busca `content_variables_named`

---

## ✅ Solución Rápida

Si el error persiste, puedes:

1. **Usar el fallback a texto plano**: El sistema automáticamente enviará un mensaje de texto si el template falla
2. **Verificar el template en Twilio**: Asegúrate de que el template esté aprobado y activo
3. **Contactar a Twilio**: Si el template está correcto pero sigue fallando, puede ser un problema del template mismo

---

## 📞 Recursos

- **Twilio Console**: [https://console.twilio.com/](https://console.twilio.com/)
- **Content Templates**: [https://console.twilio.com/us1/develop/sms/content-templates](https://console.twilio.com/us1/develop/sms/content-templates)
- **Documentación**: [https://www.twilio.com/docs/content-api](https://www.twilio.com/docs/content-api)

---

## 🔄 Próximos Pasos

1. Verifica tu template en Twilio Console
2. Compara las variables con las del código
3. Si necesitas cambiar los nombres, edita `backend/whatsapp_service.py`
4. Reinicia el backend: `docker-compose restart python-backend`
5. Vuelve a intentar el envío

---

**El sistema ahora intenta automáticamente ambos formatos, por lo que debería funcionar con la mayoría de templates.**

