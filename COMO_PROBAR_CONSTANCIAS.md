# Cómo Probar las Constancias Médicas

## 🚀 Inicio Rápido

### Opción 1: Script Automático (Recomendado)

```bash
./deploy-constancias.sh
```

### Opción 2: Comandos Manuales

```bash
# Detener contenedores actuales
docker-compose down

# Reconstruir el frontend con los nuevos cambios
docker-compose build typescript-frontend

# Levantar todos los servicios
docker-compose up -d

# Ver logs del frontend para verificar que compile
docker-compose logs -f typescript-frontend
```

## 📋 Pasos para Probar la Funcionalidad

### 1. Acceder a la Aplicación
- Abrir navegador en: http://localhost:3000
- Iniciar sesión como médico

### 2. Abrir una Consulta
- Ir a la sección de "Consultas"
- Seleccionar una consulta **existente** (debe estar guardada en la base de datos)
- Hacer clic en "Editar" o abrir el detalle de la consulta

### 3. Ubicar el Botón
En la parte inferior del diálogo de consulta, verás **3 botones**:
- 📄 **Imprimir Receta**
- 🔬 **Imprimir Orden de Estudios**
- 📋 **Generar Constancia** ← NUEVO

### 4. Generar la Constancia
1. Hacer clic en **"Generar Constancia"**
2. Se abrirá un modal/diálogo con:
   - Campo de **Título** (editable)
   - Campo de **Contenido** (con plantilla predeterminada)
   - Nota informativa sobre qué incluye el PDF

### 5. Editar el Contenido
El modal muestra una plantilla como:
```
Por medio de la presente, yo, Dr. [Nombre del Médico], [Especialidad], 
con cédula profesional [Número], hago constar que el/la paciente 
[Nombre del Paciente] acudió a consulta médica en fecha [Fecha].

Bajo mi valoración médica, certifico que el/la paciente [describir el 
estado de salud, diagnóstico, o motivo de la constancia].

Se extiende la presente para los fines que al interesado convengan.
```

Puedes:
- ✏️ Editar completamente el texto
- ✏️ Cambiar el título si lo deseas
- ✏️ Personalizar según tus necesidades

### 6. Imprimir
1. Hacer clic en **"Imprimir Constancia"**
2. El PDF se generará y descargará automáticamente
3. Nombre del archivo: `Constancia_[Nombre]_[Apellido]_[Fecha].pdf`

### 7. Verificar el PDF
Abre el PDF descargado y verifica que incluya:

✅ **Encabezado CORTEX**
- Logo
- Título (el que especificaste)
- Subtítulo "La IA que devuelve el tiempo a la salud"

✅ **Información del Médico**
- Nombre completo
- Especialidad
- Cédula profesional
- Universidad
- Teléfono
- Dirección del consultorio

✅ **Información del Paciente**
- Nombre completo
- Fecha de nacimiento
- Género

✅ **Información de la Consulta**
- Fecha
- Tipo de consulta

✅ **Contenido Personalizado**
- El texto que escribiste
- En un cuadro con bordes

✅ **Firma del Médico**
- Línea de firma
- Nombre del médico
- Especialidad
- Cédula profesional

✅ **Footer**
- Información de CORTEX
- Número de página
- Fecha y hora de generación

## 🔍 Resolución de Problemas

### El botón no aparece
- ✅ Verifica que estés en una consulta **existente** (guardada en BD)
- ✅ El botón solo aparece en modo edición de consultas existentes
- ✅ No aparece al crear una consulta nueva

### El modal no se abre
- ✅ Verifica la consola del navegador (F12) para errores
- ✅ Verifica que los componentes se hayan compilado correctamente

### El PDF no se descarga
- ✅ Verifica que el contenido no esté vacío
- ✅ Revisa la consola del navegador para errores
- ✅ Verifica que tu navegador permita descargas

### Error de compilación
```bash
# Ver logs del frontend
docker-compose logs typescript-frontend

# Reconstruir sin caché
docker-compose build --no-cache typescript-frontend
docker-compose up -d typescript-frontend
```

## 📝 Casos de Prueba

### Caso 1: Constancia Básica
1. Abrir consulta existente
2. Clic en "Generar Constancia"
3. Usar la plantilla predeterminada sin modificar
4. Clic en "Imprimir Constancia"
5. **Resultado esperado**: PDF con plantilla estándar

### Caso 2: Constancia Personalizada
1. Abrir consulta existente
2. Clic en "Generar Constancia"
3. Modificar el título a "CONSTANCIA DE REPOSO MÉDICO"
4. Editar el contenido para indicar días de reposo
5. Clic en "Imprimir Constancia"
6. **Resultado esperado**: PDF con título y contenido personalizados

### Caso 3: Constancia con Mucho Texto
1. Abrir consulta existente
2. Clic en "Generar Constancia"
3. Escribir un contenido largo (varios párrafos)
4. Clic en "Imprimir Constancia"
5. **Resultado esperado**: PDF que maneja correctamente el texto largo

### Caso 4: Cancelar
1. Abrir consulta existente
2. Clic en "Generar Constancia"
3. Clic en "Cancelar"
4. **Resultado esperado**: Modal se cierra sin generar PDF

### Caso 5: Validación
1. Abrir consulta existente
2. Clic en "Generar Constancia"
3. Borrar todo el contenido
4. Intentar clic en "Imprimir Constancia"
5. **Resultado esperado**: Botón deshabilitado (no permite PDF vacío)

## 🛠️ Comandos Útiles de Docker

```bash
# Ver todos los contenedores
docker-compose ps

# Ver logs en tiempo real
docker-compose logs -f

# Ver solo logs del frontend
docker-compose logs -f typescript-frontend

# Ver solo logs del backend
docker-compose logs -f python-backend

# Reiniciar solo el frontend
docker-compose restart typescript-frontend

# Detener todo
docker-compose down

# Limpiar todo (incluye volúmenes)
docker-compose down -v

# Reconstruir todo desde cero
docker-compose down -v
docker-compose build --no-cache
docker-compose up -d
```

## 📚 Documentación Adicional

- **Guía completa**: `docs/CONSTANCIA_MEDICA_GUIDE.md`
- **Resumen de implementación**: `CONSTANCIA_IMPLEMENTATION_SUMMARY.md`
- **Guía de PDFs**: `docs/PDF_GENERATION_GUIDE.md`

## ✅ Checklist de Verificación

- [ ] Docker está corriendo
- [ ] Servicios levantados correctamente
- [ ] Frontend accesible en http://localhost:3000
- [ ] Backend accesible en http://localhost:8000
- [ ] Sesión iniciada como médico
- [ ] Consulta existente abierta
- [ ] Botón "Generar Constancia" visible
- [ ] Modal se abre correctamente
- [ ] Plantilla se carga con datos del paciente/médico
- [ ] Contenido es editable
- [ ] PDF se genera y descarga
- [ ] PDF contiene toda la información esperada
- [ ] Firma del médico aparece correctamente
- [ ] Footer con fecha de generación presente

## 🎯 ¿Necesitas Ayuda?

Si encuentras problemas:
1. Revisa los logs: `docker-compose logs -f`
2. Verifica la consola del navegador (F12)
3. Consulta la documentación en `/docs`
4. Verifica que todos los archivos se hayan creado correctamente

## 📊 Estadísticas de la Implementación

- **Archivos nuevos**: 3
- **Archivos modificados**: 2
- **Líneas de código agregadas**: ~600
- **Componentes React nuevos**: 1
- **Métodos nuevos en servicios**: 1
- **Hooks nuevos**: 1 (función)
- **Interfaces nuevas**: 1 (CertificateInfo)

