# 📋 Instrucciones de Instalación - Sistema de Historias Clínicas

## 🎯 Resumen Ejecutivo

Para ejecutar este proyecto en tu máquina, necesitas seguir estos pasos simples:

1. **Instalar Docker Desktop**
2. **Clonar el repositorio desde GitHub**
3. **Ejecutar un script de instalación automática**
4. **Acceder a la aplicación web**

## 📝 Pasos Detallados

### Paso 1: Instalar Docker Desktop

#### Windows:
1. Ve a: https://www.docker.com/products/docker-desktop/
2. Descarga "Docker Desktop for Windows"
3. Ejecuta el instalador y sigue las instrucciones
4. Reinicia tu computadora si es necesario
5. Abre Docker Desktop y espera a que se inicie completamente

#### macOS:
1. Ve a: https://www.docker.com/products/docker-desktop/
2. Descarga "Docker Desktop for Mac"
3. Arrastra Docker.app a tu carpeta de Aplicaciones
4. Abre Docker Desktop desde Aplicaciones
5. Espera a que se inicie completamente

#### Linux (Ubuntu/Debian):
```bash
# Actualizar el sistema
sudo apt update

# Instalar Docker
sudo apt install docker.io docker-compose

# Iniciar Docker
sudo systemctl start docker
sudo systemctl enable docker

# Agregar tu usuario al grupo docker
sudo usermod -aG docker $USER

# Cerrar sesión y volver a iniciar para aplicar cambios
```

### Paso 2: Instalar Git (si no lo tienes)

#### Windows:
1. Ve a: https://git-scm.com/download/win
2. Descarga e instala Git
3. Abre "Git Bash" o "Command Prompt"

#### macOS:
```bash
# Con Homebrew
brew install git

# O descarga desde: https://git-scm.com/download/mac
```

#### Linux:
```bash
sudo apt install git
```

### Paso 3: Clonar el Repositorio

Abre una terminal (Command Prompt en Windows, Terminal en macOS/Linux) y ejecuta:

```bash
# Clonar el repositorio desde GitHub
git clone https://github.com/tu-usuario/medical-records-main.git

# Entrar al directorio del proyecto
cd medical-records-main
```

**Nota**: Reemplaza `tu-usuario` con el nombre de usuario real del repositorio en GitHub.

### Paso 4: Ejecutar la Instalación Automática

#### Para Windows:
```cmd
# Ejecutar el script de instalación
install.bat
```

#### Para macOS/Linux:
```bash
# Hacer el script ejecutable
chmod +x install.sh

# Ejecutar el script de instalación
./install.sh
```

### Paso 5: Verificar la Instalación

Después de ejecutar el script, deberías ver:

```
🎉 ¡Instalación Completada Exitosamente!
========================================

📱 Acceso a la aplicación:
   🌐 Frontend: http://localhost:3000
   🔧 Backend API: http://localhost:8000
   📚 Documentación API: http://localhost:8000/docs

🔐 Credenciales de acceso:
   📧 Email: thiago@avant.com
   🔑 Contraseña: Password123!
```

### Paso 6: Acceder a la Aplicación

1. **Abre tu navegador web** (Chrome, Firefox, Safari, etc.)
2. **Ve a**: http://localhost:3000
3. **Inicia sesión** con las credenciales mostradas arriba
4. **¡Listo!** Ya puedes usar el sistema de historias clínicas

## 🔧 Comandos Útiles

### Ver el estado de los contenedores:
```bash
docker ps
```

### Ver logs de los servicios:
```bash
docker logs medical-records-backend
docker logs medical-records-frontend
docker logs medical-records-db
```

### Detener el sistema:
```bash
docker-compose -f docker-compose.custom.yml down
```

### Reiniciar el sistema:
```bash
docker-compose -f docker-compose.custom.yml restart
```

### Limpiar todo (eliminar contenedores e imágenes):
```bash
docker-compose -f docker-compose.custom.yml down
docker system prune -f
```

## 🚨 Solución de Problemas

### Problema: "Docker no está ejecutándose"
**Solución**: Abre Docker Desktop y espera a que se inicie completamente.

### Problema: "Port already in use"
**Solución**: Algo más está usando los puertos 3000 o 8000. Detén esas aplicaciones o cambia los puertos en el archivo `docker-compose.custom.yml`.

### Problema: "Permission denied" (Linux)
**Solución**: Ejecuta `sudo usermod -aG docker $USER` y reinicia tu sesión.

### Problema: Los contenedores no se inician
**Solución**: 
1. Verifica que Docker esté ejecutándose
2. Ejecuta `docker system prune -f` para limpiar
3. Vuelve a ejecutar el script de instalación

### Problema: No puedo acceder a http://localhost:3000
**Solución**:
1. Espera unos minutos más (la primera vez puede tardar)
2. Verifica que los contenedores estén ejecutándose con `docker ps`
3. Revisa los logs con `docker logs medical-records-frontend`

## 📊 ¿Qué se Instala?

El sistema incluye:

- **Base de datos PostgreSQL** (puerto 5432)
- **API Backend FastAPI** (puerto 8000)
- **Frontend React** (puerto 3000)
- **Datos de prueba** (doctor y pacientes de ejemplo)

## 🎯 Funcionalidades Disponibles

Una vez instalado, podrás:

- ✅ **Gestionar pacientes** (crear, editar, buscar)
- ✅ **Registrar consultas médicas**
- ✅ **Programar citas**
- ✅ **Ver dashboard con estadísticas**
- ✅ **Gestionar perfil del doctor**
- ✅ **Exportar datos médicos**

## 📞 ¿Necesitas Ayuda?

Si tienes problemas:

1. **Revisa esta guía** paso a paso
2. **Verifica que Docker esté ejecutándose**
3. **Consulta los logs** de los contenedores
4. **Asegúrate de tener los puertos libres** (3000, 8000, 5432)

## 🎉 ¡Disfruta del Sistema!

Una vez instalado, tendrás un sistema completo de historias clínicas médicas ejecutándose en tu máquina local. ¡Perfecto para desarrollo, pruebas o uso personal!
