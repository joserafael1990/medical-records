# 📱 WhatsApp - Guía de Uso en la Interfaz

## 🎯 Ubicación de los Botones de WhatsApp

### 1. **Recordatorios de Citas** 📅

**Ubicación:** `Dashboard → Agenda`

```
┌─────────────────────────────────────────────────────────────┐
│                         AGENDA                               │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  📅 Cita: 10:00 AM - Juan Pérez                             │
│     Estado: Confirmada                                       │
│     Tipo: Primera vez                                        │
│                                                               │
│     [📱 WhatsApp]  [✏️ Editar]  [❌ Cancelar]               │
│                                                               │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  📅 Cita: 11:30 AM - María García                           │
│     Estado: Confirmada                                       │
│     Tipo: Seguimiento                                        │
│                                                               │
│     [📱 WhatsApp]  [✏️ Editar]  [❌ Cancelar]               │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

#### **Características:**
- ✅ **Un botón por cada cita**
- ✅ **Solo visible para citas confirmadas**
- ✅ **Botón verde con icono de WhatsApp**
- ✅ **Envía recordatorio de ESA cita específica**

#### **Flujo de Uso:**
1. Usuario ve la lista de citas del día
2. Identifica la cita para la cual quiere enviar recordatorio
3. Click en botón **"WhatsApp"** de esa cita
4. El sistema envía el recordatorio **con los datos de esa cita**
5. Notificación de éxito aparece en pantalla
6. El paciente recibe el WhatsApp con:
   - Título del doctor (Dr/Dra)
   - Nombre completo del doctor
   - Hora y fecha de **esa cita específica**

---

### 2. **Notificaciones de Resultados de Estudios** 🧪

**Ubicación:** `Nueva Consulta → Estudios Clínicos Previos del Paciente`

```
┌─────────────────────────────────────────────────────────────┐
│         Estudios Clínicos Previos del Paciente              │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  🧪 Hemograma Completo                                       │
│     Tipo: Laboratorio                                        │
│     Estado: ✅ Completado                                    │
│     Solicitado: 15/01/2024                                   │
│                                                               │
│     [👁️ Ver Archivo]  [📱 Notificar]                        │
│                                                               │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  🧪 Radiografía de Tórax                                     │
│     Tipo: Imagenología                                       │
│     Estado: ⏳ Pendiente                                     │
│     Solicitado: 18/01/2024                                   │
│                                                               │
│     [📤 Cargar Archivo]  [✅ Marcar Completado]              │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

#### **Características:**
- ✅ **Solo visible para estudios completados**
- ✅ **Requiere que el estudio tenga archivo cargado**
- ✅ **Botón verde "Notificar" con icono de WhatsApp**

#### **Flujo de Uso:**
1. Doctor abre una consulta
2. Selecciona un paciente
3. Ve los estudios clínicos previos del paciente
4. Identifica un estudio completado
5. Click en botón **"Notificar"**
6. El paciente recibe notificación de que sus resultados están listos

---

## 📱 Ejemplo de Mensaje de WhatsApp

### **Recordatorio de Cita:**

```
Hola,

Recordatorio de tu cita médica con Dr Rafael García.

Hora programada: 10:30 AM del 25 de Enero

Por favor confirma tu asistencia.
```

**Nota:** Los parámetros se ajustan automáticamente según:
- Género del doctor (Dr/Dra)
- Nombre completo del doctor desde su perfil
- Fecha y hora de la cita específica

---

## 🎨 Estados Visuales

### **Botón Normal:**
```
[📱 WhatsApp]  ← Verde, clickeable
```

### **Botón Enviando:**
```
[⏳ Enviando...]  ← Deshabilitado, mostrando progreso
```

### **Notificación de Éxito:**
```
✅ Recordatorio enviado por WhatsApp exitosamente
```

### **Notificación de Error:**
```
❌ Error al enviar recordatorio por WhatsApp
```

---

## ⚙️ Configuración

### **¿Cuándo aparece el botón?**

#### **Para Citas:**
- ✅ La cita debe tener estado: **"Confirmada"**
- ✅ La cita debe tener un ID válido
- ✅ El paciente debe tener número de teléfono registrado

#### **Para Estudios:**
- ✅ El estudio debe tener estado: **"Completado"**
- ✅ El estudio debe tener archivo cargado (`file_path`)
- ✅ El paciente debe tener número de teléfono registrado

---

## 🔧 Troubleshooting

### **No veo el botón de WhatsApp en mis citas**

**Posibles causas:**
1. La cita no está en estado "Confirmada"
2. La cita no tiene ID (es una cita temporal)
3. El frontend no se ha actualizado

**Solución:**
```bash
docker-compose restart typescript-frontend
```

### **El botón aparece pero no envía el mensaje**

**Posibles causas:**
1. El paciente no tiene número de teléfono
2. Las credenciales de WhatsApp no están configuradas
3. Error de red

**Verificación:**
```bash
./test-whatsapp.sh
```

### **El mensaje se envía pero el paciente no lo recibe**

**Posibles causas:**
1. El número no está registrado en el dashboard de Meta
2. El número está en formato incorrecto
3. El paciente ha bloqueado el número de WhatsApp Business

**Solución:**
1. Ve a: https://developers.facebook.com/apps/
2. WhatsApp → API Setup → Manage phone number list
3. Verifica que el número esté en la lista

---

## 📊 Monitoreo

### **Ver logs del backend:**
```bash
docker logs medical-records-main-python-backend-1 --tail 50 | grep -i whatsapp
```

### **Ver estado de mensajes:**
Los logs mostrarán:
```
📱 Sending WhatsApp reminder for appointment: 123
✅ WhatsApp sent successfully to 525579449672
```

---

## 🎯 Mejores Prácticas

1. **Envía recordatorios con tiempo:**
   - Ideal: 24 horas antes de la cita
   - Mínimo: 2 horas antes

2. **Verifica antes de enviar:**
   - Confirma que el número de teléfono sea correcto
   - Verifica que la fecha/hora de la cita sea correcta

3. **No envíes múltiples recordatorios:**
   - Un recordatorio por cita es suficiente
   - Evita spam para no molestar al paciente

4. **Modo Desarrollo:**
   - Recuerda que tienes 1,000 mensajes gratis/mes
   - Los números deben estar verificados en el dashboard

---

## 🚀 Atajos de Teclado (Próximamente)

**Planeados para futuras versiones:**
- `Ctrl + W` - Enviar WhatsApp desde cita seleccionada
- `Ctrl + Shift + W` - Enviar WhatsApp a todas las citas del día

---

## 📞 Soporte

Si tienes problemas:
1. Revisa `docs/WHATSAPP_TROUBLESHOOTING.md`
2. Ejecuta `./test-whatsapp.sh`
3. Verifica configuración en `compose.yaml`
4. Consulta logs del backend

---

**¡Disfruta enviando recordatorios a tus pacientes! 📱✨**

