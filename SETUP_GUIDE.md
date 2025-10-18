# 🏥 Guía de Instalación - Sistema de Historias Clínicas

Esta guía te permitirá ejecutar el Sistema de Historias Clínicas en tu máquina local usando Docker.

## 📋 Prerrequisitos

Antes de comenzar, asegúrate de tener instalado:

- **Docker Desktop** (versión 4.0 o superior)
- **Git** (para clonar el repositorio)
- **Navegador web** (Chrome, Firefox, Safari, etc.)

### 🔧 Instalación de Prerrequisitos

#### Windows:
1. Descarga Docker Desktop desde: https://www.docker.com/products/docker-desktop/
2. Descarga Git desde: https://git-scm.com/download/win
3. Instala ambos programas siguiendo los asistentes de instalación

#### macOS:
1. Descarga Docker Desktop desde: https://www.docker.com/products/docker-desktop/
2. Instala Git con Homebrew: `brew install git`
3. O descarga Git desde: https://git-scm.com/download/mac

#### Linux (Ubuntu/Debian):
```bash
# Instalar Docker
sudo apt update
sudo apt install docker.io docker-compose
sudo systemctl start docker
sudo systemctl enable docker

# Instalar Git
sudo apt install git
```

## 🚀 Pasos de Instalación

### Paso 1: Clonar el Repositorio

Abre una terminal (Command Prompt en Windows, Terminal en macOS/Linux) y ejecuta:

```bash
# Clonar el repositorio
git clone https://github.com/tu-usuario/medical-records-main.git

# Entrar al directorio del proyecto
cd medical-records-main
```

### Paso 2: Verificar Docker

Asegúrate de que Docker esté ejecutándose:

```bash
# Verificar que Docker esté funcionando
docker --version
docker-compose --version
```

Si Docker no está ejecutándose, inicia Docker Desktop desde el menú de aplicaciones.

### Paso 3: Construir y Ejecutar los Contenedores

```bash
# Construir las imágenes de Docker
docker-compose -f docker-compose.custom.yml build

# Ejecutar todos los servicios
docker-compose -f docker-compose.custom.yml up -d
```

### Paso 4: Verificar que Todo Esté Funcionando

Espera unos minutos para que todos los servicios se inicialicen, luego verifica:

```bash
# Ver el estado de los contenedores
docker ps
```

Deberías ver 3 contenedores ejecutándose:
- `medical-records-db` (Base de datos)
- `medical-records-backend` (API)
- `medical-records-frontend` (Interfaz web)

### Paso 5: Acceder a la Aplicación

1. **Abre tu navegador web**
2. **Ve a**: http://localhost:3000
3. **Inicia sesión con**:
   - **Email**: `thiago@avant.com`
   - **Contraseña**: `Password123!`

## 🎯 URLs de Acceso

- **Aplicación Principal**: http://localhost:3000
- **API Backend**: http://localhost:8000
- **Documentación de la API**: http://localhost:8000/docs
- **Base de Datos**: localhost:5432

## 🛠️ Comandos Útiles

### Gestionar los Contenedores

```bash
# Ver logs de los servicios
docker logs medical-records-backend
docker logs medical-records-frontend
docker logs medical-records-db

# Detener todos los servicios
docker-compose -f docker-compose.custom.yml down

# Reiniciar todos los servicios
docker-compose -f docker-compose.custom.yml restart

# Ver el estado de los contenedores
docker ps

# Ver todos los contenedores (incluyendo detenidos)
docker ps -a
```

### Limpiar el Sistema

```bash
# Detener y eliminar contenedores
docker-compose -f docker-compose.custom.yml down

# Eliminar imágenes (opcional)
docker rmi medical-records-main-python-backend
docker rmi medical-records-main-typescript-frontend

# Limpiar sistema Docker (elimina contenedores, redes, volúmenes no utilizados)
docker system prune -f
```

## 🔧 Solución de Problemas

### Problema: "Port already in use"
```bash
# Verificar qué está usando el puerto
netstat -tulpn | grep :3000
netstat -tulpn | grep :8000

# Detener servicios que usen esos puertos o cambiar los puertos en docker-compose.custom.yml
```

### Problema: "Docker daemon not running"
- Inicia Docker Desktop
- En Linux: `sudo systemctl start docker`

### Problema: "Permission denied"
```bash
# En Linux, agregar tu usuario al grupo docker
sudo usermod -aG docker $USER
# Luego cerrar sesión y volver a iniciar
```

### Problema: Los contenedores no se inician
```bash
# Ver logs detallados
docker-compose -f docker-compose.custom.yml logs

# Reconstruir las imágenes
docker-compose -f docker-compose.custom.yml build --no-cache
```

### Problema: No puedo acceder a la aplicación
1. Verifica que los contenedores estén ejecutándose: `docker ps`
2. Verifica que los puertos estén disponibles: `netstat -tulpn | grep :3000`
3. Espera unos minutos más para que la aplicación se inicialice completamente

## 📊 Estructura del Proyecto

```
medical-records-main/
├── backend/                 # API FastAPI (Python)
│   ├── main_clean_english.py
│   ├── requirements.txt
│   └── ...
├── frontend/               # Interfaz React (TypeScript)
│   ├── src/
│   ├── package.json
│   └── ...
├── docker-compose.custom.yml # Configuración de Docker
├── README.md
└── SETUP_GUIDE.md         # Esta guía
```

## 🎉 ¡Listo!

Una vez que hayas completado estos pasos, tendrás el Sistema de Historias Clínicas ejecutándose localmente en tu máquina. El sistema incluye:

- ✅ **Gestión de Pacientes**
- ✅ **Consultas Médicas**
- ✅ **Citas y Agendamiento**
- ✅ **Estudios Clínicos**
- ✅ **Dashboard Analítico**
- ✅ **Autenticación Segura**

## 📞 Soporte

Si encuentras algún problema:

1. Revisa la sección de "Solución de Problemas" arriba
2. Verifica que todos los prerrequisitos estén instalados
3. Asegúrate de que Docker esté ejecutándose correctamente
4. Revisa los logs de los contenedores para más detalles

¡Disfruta usando el Sistema de Historias Clínicas! 🏥✨
