# 📱 Integración de WhatsApp Business API con Meta Cloud

## 🎯 Objetivo
Enviar notificaciones automáticas a pacientes vía WhatsApp para:
- Recordatorios de citas
- Notificación de resultados disponibles
- Enlaces seguros para subir archivos
- Confirmaciones de asistencia

## 📋 Requisitos Previos

### 1. Cuenta de Meta for Developers
1. Ir a https://developers.facebook.com/
2. Crear cuenta o iniciar sesión
3. Crear una nueva app (tipo "Business")

### 2. Configurar WhatsApp Business API

#### Paso A: Crear App
1. En Meta for Developers dashboard: **"Create App"**
2. Tipo: **"Business"**
3. Nombre: `"Medical Records WhatsApp"`
4. Email de contacto

#### Paso B: Agregar WhatsApp
1. En el dashboard de tu app, buscar **"WhatsApp"**
2. Click en **"Set up"**
3. Seleccionar o crear **WhatsApp Business Account**

#### Paso C: Obtener Credenciales
En la sección de WhatsApp, encontrarás:

```
Phone Number ID: 123456789012345
WhatsApp Business Account ID: 987654321098765
Temporary Access Token: EAAa1b2c3d... (válido 24 horas)
```

#### Paso D: Generar Token Permanente
1. Ir a **"System Users"** en Meta Business Suite
2. Crear nuevo System User
3. Asignar permisos: `whatsapp_business_management`, `whatsapp_business_messaging`
4. Generar token permanente (no expira)

### 3. Configurar Número de Teléfono

**Opción A: Número de Prueba (GRATIS - Para desarrollo)**
- Meta proporciona un número temporal
- Puedes enviar a máximo 5 números registrados
- Cada número debe verificarse primero

**Opción B: Número Propio (Producción)**
- Necesitas un número de teléfono físico
- NO puede estar registrado en WhatsApp personal
- Proceso de verificación: 1-2 días

## 🔧 Configuración en el Proyecto

### 1. Variables de Entorno

Agregar en `backend/.env`:

```bash
# WhatsApp Meta Cloud API
META_WHATSAPP_PHONE_ID=123456789012345
META_WHATSAPP_TOKEN=EAAa1b2c3d4e5f6g7h8i9j0k...
META_WHATSAPP_BUSINESS_ID=987654321098765
META_WHATSAPP_API_VERSION=v18.0

# Para verificación de webhook (opcional)
META_WHATSAPP_VERIFY_TOKEN=tu_token_secreto_aleatorio
```

### 2. Instalar Dependencias

```bash
# Backend
pip install requests python-dotenv
```

## 📝 Plantillas de Mensajes

### ¿Qué son las plantillas?
Meta requiere que TODOS los mensajes iniciados por el negocio usen plantillas pre-aprobadas.

### Crear Plantillas

1. Ir a **Meta Business Manager** → **WhatsApp Manager**
2. Click en **"Message Templates"**
3. Click en **"Create Template"**

#### Plantilla 1: Recordatorio de Cita
```
Nombre: appointment_reminder
Categoría: UTILITY
Idioma: Spanish (es)

Contenido:
---
Hola {{1}}, 

📅 Recordatorio de cita médica:
🏥 Doctor: {{2}}
📆 Fecha: {{3}}
🕐 Hora: {{4}}

Por favor confirma tu asistencia.
---

Variables:
1. Nombre del paciente
2. Nombre del doctor
3. Fecha (DD/MM/YYYY)
4. Hora (HH:MM)
```

#### Plantilla 2: Resultados Disponibles
```
Nombre: lab_results_ready
Categoría: UTILITY
Idioma: Spanish (es)

Contenido:
---
Hola {{1}},

✅ Tus resultados de {{2}} ya están disponibles.

Puedes consultarlos ingresando aquí:
{{3}}

Este enlace expira en 48 horas.
---

Variables:
1. Nombre del paciente
2. Nombre del estudio
3. URL del enlace seguro
```

#### Plantilla 3: Confirmación Genérica
```
Nombre: appointment_confirmation
Categoría: UTILITY
Idioma: Spanish (es)

Contenido:
---
{{1}}

Consultorio: {{2}}
Teléfono: {{3}}
---

Variables:
1. Mensaje personalizado
2. Nombre del consultorio
3. Teléfono de contacto
```

### Proceso de Aprobación
- Enviar plantilla → Meta la revisa → Aprobación en 24-48 horas
- Estado se puede ver en WhatsApp Manager

## 🧪 Pruebas con Número de Desarrollo

### 1. Registrar Números de Prueba

En el dashboard de tu app:
1. Ir a **"WhatsApp" → "API Setup"**
2. Sección **"To"**
3. Click en **"Manage phone number list"**
4. Agregar números (formato: +521234567890)
5. Enviar código de verificación a cada número
6. Confirmar código

**Límite:** Máximo 5 números en modo desarrollo

### 2. Enviar Mensaje de Prueba

Usa el **"API Setup"** en el dashboard:
```bash
curl -X POST \
  https://graph.facebook.com/v18.0/PHONE_ID/messages \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "messaging_product": "whatsapp",
    "to": "521234567890",
    "type": "template",
    "template": {
      "name": "hello_world",
      "language": {
        "code": "en_US"
      }
    }
  }'
```

## 💰 Costos y Límites

### Modo Desarrollo (GRATIS)
- ✅ 1,000 mensajes gratis/mes
- ✅ Ideal para pruebas
- ⚠️ Máximo 5 números destino
- ⚠️ Necesitas verificar cada número

### Modo Producción
- **Primeros 1,000 mensajes/mes:** GRATIS
- **Después de 1,000:**
  - México: ~$0.0087 USD/mensaje
  - Conversaciones de servicio: Gratis primeras 24h después de respuesta del usuario
  - Conversaciones de marketing: ~$0.0275 USD/mensaje

### Límite de Tasa (Rate Limits)
- **Nivel 1 (inicial):** 1,000 mensajes/día
- **Nivel 2:** 10,000 mensajes/día (tras aprobación)
- **Nivel 3:** 100,000 mensajes/día (tras uso consistente)

## 🚨 Problemas Comunes

### Error: "(#100) Param recipient_type must be one of..."
- **Causa:** Número no registrado en lista de prueba
- **Solución:** Registrar y verificar el número en "API Setup"

### Error: "Template not found"
- **Causa:** Plantilla no aprobada o nombre incorrecto
- **Solución:** Verificar estado en WhatsApp Manager

### Error: "Invalid access token"
- **Causa:** Token expirado o incorrecto
- **Solución:** Generar nuevo token permanente

### Mensaje no llega
- ✅ Verificar que el número tiene WhatsApp instalado
- ✅ Verificar formato: +521234567890 (con código de país)
- ✅ Ver logs en "Analytics" del dashboard

## 📊 Monitoreo

En Meta Business Manager → WhatsApp Manager:
- **Analytics:** Mensajes enviados, entregados, leídos
- **Message Templates:** Estado de aprobación
- **Phone Numbers:** Calidad y límites de cuenta

## 🔐 Seguridad

1. **Nunca compartir Access Token** en código público
2. **Usar variables de entorno** para credenciales
3. **Regenerar token** si se compromete
4. **Limitar permisos** del System User a solo WhatsApp

## 🔄 Migración a Producción

### 1. Verificar Negocio
En Meta Business Suite:
1. **Business Settings** → **Business Info**
2. Completar información legal del negocio
3. Subir documentos requeridos
4. Esperar aprobación (1-2 semanas)

### 2. Agregar Número Propio
1. Obtener número telefónico nuevo
2. **NO** registrarlo en WhatsApp personal
3. Agregarlo en WhatsApp Manager
4. Verificar mediante SMS/llamada

### 3. Solicitar Aumento de Límites
- Enviar mensajes consistentemente
- Mantener baja tasa de reportes
- Meta aumenta límites automáticamente

## 📚 Recursos Adicionales

- **Documentación oficial:** https://developers.facebook.com/docs/whatsapp/cloud-api
- **Postman Collection:** https://www.postman.com/meta/workspace/whatsapp-business-platform
- **WhatsApp Manager:** https://business.facebook.com/wa/manage/
- **Soporte:** https://developers.facebook.com/support/

## ✅ Checklist de Implementación

- [ ] Crear app en Meta for Developers
- [ ] Configurar WhatsApp Business API
- [ ] Obtener Phone Number ID y Access Token
- [ ] Crear plantillas de mensajes
- [ ] Esperar aprobación de plantillas
- [ ] Registrar números de prueba
- [ ] Configurar variables de entorno en backend
- [ ] Implementar servicio de WhatsApp
- [ ] Probar envío de mensajes
- [ ] Agregar botones en frontend
- [ ] Documentar uso para el equipo
- [ ] (Opcional) Configurar webhook para respuestas
- [ ] (Producción) Verificar negocio
- [ ] (Producción) Agregar número propio

