# 📋 Configuración de Templates de Meta WhatsApp

## ✅ Templates Configurados

El sistema está configurado para usar los siguientes templates de Meta:

1. **`appointment_reminder`** - Recordatorio de citas
2. **`aviso_de_privacidad`** - Aviso de privacidad

---

## 📝 Estructura de Templates

### Template: `appointment_reminder`

**Parámetros esperados:**
- `{{1}}` - Nombre del paciente
- `{{2}}` - Fecha de la cita
- `{{3}}` - Hora de la cita
- `{{4}}` - Título del doctor (Dr., Dra., etc.)
- `{{5}}` - Nombre completo del doctor (sin título)
- `{{6}}` - Dirección del consultorio
- `{{7}}` - URL de Google Maps

**Uso en el código:**
```python
send_template_message(
    to_phone=patient_phone,
    template_name='appointment_reminder',
    template_params=[
        patient_full_name,
        appointment_date,
        appointment_time,
        doctor_title,
        doctor_full_name,
        office_address,
        maps_url
    ],
    language_code='es'
)
```

### Template: `aviso_de_privacidad`

**Parámetros esperados:**
- `{{1}}` - Nombre del paciente
- `{{2}}` - Título del doctor (Dr., Dra., etc.)
- `{{3}}` - Nombre completo del doctor (sin título)
- `{{4}}` - URL del aviso de privacidad

**Uso en el código:**
```python
send_template_message(
    to_phone=patient_phone,
    template_name='aviso_de_privacidad',
    template_params=[
        patient_name,
        doctor_title,
        doctor_full_name,
        privacy_notice_url
    ],
    language_code='es'
)
```

---

## 🔄 Fallback Automático

El sistema tiene un **fallback automático**:

1. **Para `appointment_reminder`**: Si el template falla, envía mensaje de texto libre
2. **Para `aviso_de_privacidad`**: Si el template falla, envía mensaje interactivo con botón

---

## ✅ Verificación en Meta Business Manager

1. Ve a [Meta Business Manager](https://business.facebook.com/)
2. Selecciona tu cuenta de WhatsApp Business
3. Ve a **Templates**
4. Verifica que los templates estén:
   - ✅ **Aprobados** (Status: Approved)
   - ✅ **Activos** (Status: Active)
   - ✅ Con los parámetros correctos

---

## 🔧 Si los Templates No Coinciden

Si tus templates en Meta tienen nombres o parámetros diferentes, actualiza:

1. **Nombres de templates**: En `backend/whatsapp_service.py`
   - Línea 338: `template_name='appointment_reminder'`
   - Línea ~X: `template_name='aviso_de_privacidad'`

2. **Parámetros**: Ajusta el orden de `template_params` según tu template

---

## 📞 Recursos

- **Meta Business Manager**: [https://business.facebook.com/](https://business.facebook.com/)
- **Documentación de Templates**: [https://developers.facebook.com/docs/whatsapp/message-templates](https://developers.facebook.com/docs/whatsapp/message-templates)

---

**Los templates ya están configurados y listos para usar.**

