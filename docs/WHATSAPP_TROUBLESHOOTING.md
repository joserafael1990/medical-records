# 🔧 Solución de Problemas WhatsApp

## Error 404: Phone Number ID incorrecto

Si recibes el error:
```
404 Client Error: Not Found for url: https://graph.facebook.com/v24.0/PHONE_ID/messages
```

### ✅ Solución:

El **Phone Number ID** que ingresaste puede estar incorrecto. Aquí está cómo obtener el correcto:

#### Opción 1: Desde el Dashboard de WhatsApp

1. Ve a https://developers.facebook.com/apps/
2. Selecciona tu app
3. En el menú izquierdo, haz clic en **"WhatsApp" → "API Setup"**
4. En la sección **"Send and receive messages"**, verás:
   ```
   Phone number ID: XXXXXXXXXX
   ```
5. **Copia ese número EXACTO**

#### Opción 2: Usando la API de Meta

```bash
# Reemplaza YOUR_ACCESS_TOKEN con tu token
curl -X GET \
  "https://graph.facebook.com/v24.0/me/phone_numbers" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

Esto te devolverá tu Phone Number ID correcto.

---

## Error: Template not found

Si recibes:
```
Template 'appointment_reminder' not found
```

**Causa:** Las plantillas no han sido creadas o aprobadas.

**Solución:**

### Paso 1: Crear Plantillas en Meta Business Manager

1. Ve a https://business.facebook.com/wa/manage/message-templates/
2. Click en **"Create Template"**

### Paso 2: Usar plantilla de prueba "hello_world"

Meta proporciona una plantilla de prueba pre-aprobada. Úsala para probar:

```python
# En whatsapp_service.py
result = whatsapp.send_template_message(
    to_phone='525579449672',
    template_name='hello_world',  # Plantilla de prueba de Meta
    template_params=[],  # Sin parámetros
    language_code='en_US'  # Idioma inglés
)
```

---

## Error: Recipient phone number not on allowed list

**Causa:** En modo desarrollo, solo puedes enviar a números registrados.

**Solución:**

1. Ve a https://developers.facebook.com/apps/
2. Tu app → WhatsApp → API Setup
3. Sección **"To"** → Click en **"Manage phone number list"**
4. Click en **"Add phone number"**
5. Ingresa: **+525579449672**
6. Recibirás un código por WhatsApp
7. Ingresa el código para verificar

---

## Verificar Configuración Actual

Ejecuta este comando en el backend:

```bash
docker exec medical-records-main-python-backend-1 python3 << 'EOF'
import os
from whatsapp_service import WhatsAppService

service = WhatsAppService()
print("\n=== Configuración de WhatsApp ===")
print(f"Phone ID: {service.phone_id}")
print(f"Token (primeros 50 chars): {service.access_token[:50] if service.access_token else 'NO CONFIGURADO'}...")
print(f"API Version: {service.api_version}")
print(f"Base URL: {service.base_url}")

# Test de formato de número
test_phone = "525579449672"
formatted = service._format_phone_number(test_phone)
print(f"\nNúmero de prueba: {test_phone}")
print(f"Número formateado: {formatted}")
EOF
```

---

## Prueba con hello_world (Pre-aprobada)

Mientras esperas la aprobación de tus plantillas, usa esta:

```bash
curl -X POST https://graph.facebook.com/v24.0/PHONE_ID/messages \
  -H "Authorization: Bearer ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "messaging_product": "whatsapp",
    "to": "525579449672",
    "type": "template",
    "template": {
      "name": "hello_world",
      "language": {
        "code": "en_US"
      }
    }
  }'
```

---

## Logs Útiles

Ver logs del backend:
```bash
docker logs medical-records-main-python-backend-1 --tail 50 | grep -i whatsapp
```

Ver logs de Meta en tiempo real:
1. https://developers.facebook.com/apps/
2. Tu app → WhatsApp → API Setup
3. Sección **"Webhooks"** → Ver logs de mensajes

---

## Checklist de Verificación

- [ ] Phone Number ID es correcto (desde WhatsApp > API Setup)
- [ ] Access Token es válido (no expiró)
- [ ] Número destino está en formato: 525579449672 (sin +, sin espacios)
- [ ] Número destino está registrado en "To" list (modo desarrollo)
- [ ] Plantilla está aprobada (o usar hello_world para pruebas)
- [ ] Backend tiene las variables de entorno correctas

---

## Recursos

- **Dashboard de WhatsApp**: https://business.facebook.com/wa/manage/
- **Documentación oficial**: https://developers.facebook.com/docs/whatsapp/cloud-api
- **API Explorer**: https://developers.facebook.com/tools/explorer/
- **Soporte Meta**: https://developers.facebook.com/support/bugs/

