# 🔧 Configuración del Webhook de WhatsApp

## 📋 **Problema Actual**
- ✅ Los mensajes de WhatsApp se envían correctamente
- ❌ El botón "Cancelar" no funciona porque el webhook no es accesible desde internet
- ❌ Meta necesita una URL pública para recibir las respuestas

## 🚀 **Solución: Configurar ngrok**

### **Paso 1: Instalar ngrok (si no está instalado)**
```bash
# Descargar ngrok para macOS
curl -o ngrok.zip https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v3-stable-darwin-arm64.zip
unzip ngrok.zip
chmod +x ngrok
```

### **Paso 2: Iniciar ngrok**
```bash
# Exponer el puerto 8000 (donde corre el backend)
./ngrok http 8000
```

### **Paso 3: Obtener la URL pública**
- ngrok mostrará una URL como: `https://abc123.ngrok.io`
- Esta URL será tu webhook público

### **Paso 4: Configurar en Meta**
1. Ve a: https://developers.facebook.com/
2. Selecciona tu aplicación
3. Ve a **WhatsApp > Configuration**
4. En **Webhook**:
   - **Callback URL**: `https://abc123.ngrok.io/api/whatsapp/webhook`
   - **Verify Token**: `whatsapp_verify_token` (o cualquier token que quieras)
5. Haz clic en **Verify and Save**
6. Suscríbete a: **messages**

### **Paso 5: Probar el webhook**
1. Envía un recordatorio de WhatsApp
2. Presiona el botón "Cancelar" en WhatsApp
3. Verifica en los logs del backend que se reciba la respuesta

## 🔍 **Verificar que funciona**

### **Logs del backend:**
```bash
docker-compose logs -f python-backend
```

Deberías ver:
```
📱 WhatsApp webhook received: {...}
🔘 Button pressed: cancel_appointment from 525579449672
✅ Appointment X cancelled via WhatsApp
✅ Confirmation sent to 525579449672
```

### **Logs de ngrok:**
```bash
# En otra terminal
./ngrok http 8000
```

## 🚨 **Notas Importantes**

1. **ngrok gratuito**: La URL cambia cada vez que reinicias ngrok
2. **Para producción**: Necesitarás un servidor con dominio fijo
3. **Seguridad**: El webhook no tiene autenticación (solo para desarrollo)

## 🎯 **Resultado Esperado**

Una vez configurado:
- ✅ Los mensajes se envían correctamente
- ✅ El botón "Cancelar" funciona
- ✅ La cita se cancela automáticamente
- ✅ Se envía confirmación al paciente
