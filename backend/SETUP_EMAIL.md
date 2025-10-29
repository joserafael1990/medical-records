# Configuración de Email para Recuperación de Contraseña

## Pasos para Configurar Gmail

### 1. Habilitar 2FA (Autenticación de Dos Factores)

Gmail requiere que tengas habilitada la verificación en dos pasos para poder usar App Passwords:

1. Ve a tu cuenta de Google: https://myaccount.google.com/
2. Seguridad → Verificación en dos pasos
3. Actívala y sigue los pasos

### 2. Generar App Password (Contraseña de Aplicación)

**NO uses tu contraseña normal de Gmail**, necesitas generar una "App Password":

1. Ve a: https://myaccount.google.com/apppasswords
2. Si no aparece, busca "App Passwords" en la búsqueda de Google
3. Selecciona "Correo" y "Otro (nombre personalizado)"
4. Escribe "CORTEX Sistema Médico" o similar
5. Haz clic en "Generar"
6. **Copia la contraseña de 16 caracteres** que aparece (formato: `xxxx xxxx xxxx xxxx`)
7. **Elimina los espacios** cuando la uses en el `.env`

### 3. Configurar el archivo `.env`

**IMPORTANTE: Edita el archivo `.env` (NO `env.example`)**

```bash
cd backend
nano .env  # O usa tu editor favorito
```

Configura estas líneas **SIN comillas**:

```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=joserafaelgarciacastro@gmail.com
SMTP_PASSWORD=xxxxxxxxxxxxxxxx
EMAIL_FROM=joserafaelgarciacastro@gmail.com
FRONTEND_URL=http://localhost:3000
```

**Notas importantes:**
- ❌ NO pongas comillas simples (`'`) ni dobles (`"`)
- ❌ NO uses tu contraseña normal de Gmail
- ✅ Usa la App Password de 16 caracteres (sin espacios)
- ✅ El `SMTP_USERNAME` debe ser tu email completo
- ✅ El `EMAIL_FROM` debe ser el mismo email

### 4. Reiniciar el Backend

Después de configurar, reinicia el servidor backend:

```bash
# Si usas Docker:
docker-compose restart python-backend

# Si ejecutas directamente:
# Detén el servidor (Ctrl+C) y vuelve a iniciarlo
```

### 5. Probar el Envío

Al intentar recuperar contraseña, revisa los logs del backend. Verás:

- ✅ `📧 Email sent successfully!` - Si funcionó
- ❌ `❌ SMTP Authentication Error` - Si hay problema de autenticación

## Solución de Problemas

### Error: "Authentication failed"
- ✅ Verifica que 2FA esté habilitado
- ✅ Usa App Password, NO contraseña normal
- ✅ Verifica que no haya espacios o caracteres extra
- ✅ Verifica que no haya comillas en el `.env`

### Error: "Connection refused" o "Connection timeout"
- ✅ Verifica que `SMTP_HOST=smtp.gmail.com` esté correcto
- ✅ Verifica que `SMTP_PORT=587` esté correcto
- ✅ Verifica tu conexión a internet
- ✅ Algunos firewalls bloquean el puerto 587

### El correo no llega pero dice "sent successfully"
- ✅ Revisa la carpeta de spam/correo no deseado
- ✅ Verifica que el email de destino sea correcto
- ✅ Espera unos minutos (puede haber retraso)

## Alternativa: Otros Proveedores

### SendGrid (Recomendado para Producción)
```bash
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USERNAME=apikey
SMTP_PASSWORD=SG.xxxxxxxxxxxxxxxxxxxx
EMAIL_FROM=noreply@tudominio.com
```

### Outlook/Office 365
```bash
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_USERNAME=tu-email@outlook.com
SMTP_PASSWORD=tu-contraseña
EMAIL_FROM=tu-email@outlook.com
```


