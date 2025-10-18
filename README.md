# 🏥 Sistema de Historias Clínicas Médicas - CORTEX

Sistema completo de gestión de historias clínicas médicas desarrollado con React, TypeScript, FastAPI y PostgreSQL.

## ✨ Características Principales

### 📋 Gestión de Pacientes
- ✅ **Registro completo de pacientes** con información personal, contacto y médica
- ✅ **Datos encriptados** para información sensible (teléfono, email, CURP, RFC)
- ✅ **Información de emergencia** con relaciones predefinidas
- ✅ **Países y estados** con dropdowns dinámicos
- ✅ **Campos opcionales** para flexibilidad en el registro

### 👨‍⚕️ Gestión de Doctores
- ✅ **Perfil profesional completo** con información de consultorio
- ✅ **Configuración de horarios** con plantillas semanales
- ✅ **Zona horaria configurable** para citas
- ✅ **Duración de consultas** personalizable
- ✅ **Firma digital** y sello profesional

### 📅 Sistema de Citas
- ✅ **Creación de citas** con validación de horarios disponibles
- ✅ **Gestión de disponibilidad** basada en horarios del doctor
- ✅ **Tipos de consulta** (primera vez, seguimiento)
- ✅ **Manejo de timezone** para horarios correctos
- ✅ **Validación de conflictos** de horarios

### 📝 Sistema de Consultas
- ✅ **Registro completo de consultas** médicas
- ✅ **Edición de datos del paciente** durante la consulta
- ✅ **Campos médicos especializados** (diagnóstico, tratamiento, etc.)
- ✅ **Historial médico** completo
- ✅ **Plantillas de consulta** estructuradas

### 📊 Dashboard y Reportes
- ✅ **Métricas en tiempo real** (citas del día, consultas completadas)
- ✅ **Estadísticas de pacientes** activos
- ✅ **Indicadores de rendimiento** del sistema
- ✅ **Vista de calendario** médica

## 🛠️ Tecnologías Utilizadas

### Frontend
- **React 18** con TypeScript
- **Material-UI (MUI)** para componentes
- **Date-fns** para manejo de fechas
- **Axios** para comunicación con API
- **React Router** para navegación

### Backend
- **FastAPI** (Python)
- **SQLAlchemy** ORM
- **PostgreSQL** base de datos
- **Pydantic** para validación de datos
- **JWT** para autenticación
- **Cryptography** para encriptación

### DevOps
- **Docker & Docker Compose** para contenedores
- **Nginx** como proxy reverso
- **PostgreSQL** como base de datos

## 🚀 Instalación Rápida

### ⚡ Instalación Automática (Recomendado)

#### Para macOS/Linux:
```bash
# Clonar el repositorio
git clone https://github.com/tu-usuario/medical-records-main.git
cd medical-records-main

# Ejecutar script de instalación automática
./install.sh
```

#### Para Windows:
```cmd
REM Clonar el repositorio
git clone https://github.com/tu-usuario/medical-records-main.git
cd medical-records-main

REM Ejecutar script de instalación automática
install.bat
```

### 📋 Instalación Manual

#### Prerrequisitos
- **Docker Desktop** (versión 4.0 o superior)
- **Git** instalado
- **Navegador web** (Chrome, Firefox, Safari, etc.)

#### 1. Clonar el Repositorio
```bash
git clone https://github.com/tu-usuario/medical-records-main.git
cd medical-records-main
```

#### 2. Iniciar el Sistema
```bash
# Construir y ejecutar todos los servicios
docker-compose -f docker-compose.custom.yml up --build -d

# Verificar que todo esté funcionando
docker ps
```

#### 3. Acceder a la Aplicación
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **Documentación API**: http://localhost:8000/docs

#### 4. Credenciales de Acceso
- **Email**: `thiago@avant.com`
- **Contraseña**: `Password123!`

### 📖 Guía Detallada
Para instrucciones más detalladas, consulta: **[SETUP_GUIDE.md](SETUP_GUIDE.md)**

## 📁 Estructura del Proyecto

```
medical-records-main/
├── backend/                    # API FastAPI
│   ├── main_clean_english.py   # Aplicación principal
│   ├── database.py             # Configuración de BD
│   ├── schemas.py              # Modelos Pydantic
│   ├── crud.py                 # Operaciones CRUD
│   ├── auth.py                 # Autenticación JWT
│   ├── encryption.py           # Encriptación de datos
│   ├── requirements.txt        # Dependencias Python
│   └── migrations/             # Scripts de migración
├── frontend/                   # Aplicación React
│   ├── src/
│   │   ├── components/         # Componentes React
│   │   ├── services/           # Servicios API
│   │   ├── hooks/              # Hooks personalizados
│   │   ├── types/              # Tipos TypeScript
│   │   └── utils/              # Utilidades
│   ├── package.json            # Dependencias Node.js
│   └── Dockerfile              # Contenedor frontend
├── docker-compose.yml          # Configuración Docker
├── docker-compose.custom.yml   # Configuración personalizada
├── docker-compose.optimized.yml # Configuración optimizada
└── README.md                   # Este archivo
```

## 🔧 Comandos Útiles

### Desarrollo
```bash
# Iniciar en modo desarrollo
docker compose -f docker-compose.custom.yml up -d

# Ver logs de servicios específicos
docker compose logs -f python-backend
docker compose logs -f typescript-frontend

# Reiniciar un servicio
docker compose restart python-backend
docker compose restart typescript-frontend
```

### Base de Datos
```bash
# Conectar a PostgreSQL
docker compose exec postgres-db psql -U historias_user -d historias_clinicas

# Ejecutar migraciones
docker compose exec python-backend python3 /app/migration_script.py

# Backup de base de datos
docker compose exec postgres-db pg_dump -U historias_user historias_clinicas > backup.sql
```

### Mantenimiento
```bash
# Limpiar contenedores
docker compose down
docker system prune -f

# Reconstruir imágenes
docker compose build --no-cache
docker compose up -d
```

## 🔐 Seguridad

### Encriptación
- **Datos sensibles** encriptados en base de datos
- **Claves de encriptación** configuradas por variables de entorno
- **JWT tokens** para autenticación segura

### Campos Encriptados
- Teléfono primario
- Email
- CURP
- RFC
- Número de póliza de seguro
- Información de contacto de emergencia

## 📱 Funcionalidades por Módulo

### 👤 Gestión de Pacientes
- Registro completo con validaciones
- Edición de datos existentes
- Búsqueda y filtrado
- Información médica opcional
- Contacto de emergencia

### 👨‍⚕️ Perfil del Doctor
- Información profesional
- Configuración de consultorio
- Horarios de atención
- Zona horaria personalizada
- Firma digital y sello

### 📅 Agenda Médica
- Vista de calendario
- Creación de citas
- Gestión de horarios disponibles
- Tipos de consulta
- Validación de conflictos

### 📝 Consultas Médicas
- Registro estructurado de consultas
- Edición de datos del paciente
- Campos médicos especializados
- Historial completo
- Exportación de datos

### 📊 Dashboard
- Métricas en tiempo real
- Estadísticas de uso
- Indicadores de rendimiento
- Vista de resumen diario

## 🌍 Internacionalización

- **Español** como idioma principal
- **Fechas** en formato español
- **Calendarios** localizados
- **Mensajes de error** en español
- **Validaciones** en español

## 🚀 Despliegue en Producción

### Variables de Entorno de Producción
```env
# Backend
DATABASE_URL=postgresql://user:pass@host:5432/db
SECRET_KEY=clave_secreta_produccion
ENCRYPTION_KEY=clave_encriptacion_32_chars

# Frontend
REACT_APP_API_URL=https://api.tu-dominio.com
```

### Optimizaciones
- Usar `docker-compose.optimized.yml` para producción
- Configurar SSL/TLS
- Configurar backup automático de BD
- Monitoreo de logs
- Actualizaciones de seguridad

## 🤝 Contribución

1. Fork el proyecto
2. Crear una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abrir un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver `LICENSE` para más detalles.

## 📞 Soporte

Para soporte técnico o preguntas:
- Crear un issue en GitHub
- Contactar al equipo de desarrollo
- Revisar la documentación técnica

## 🎯 Roadmap

### Próximas Funcionalidades
- [ ] Módulo de inventario de medicamentos
- [ ] Integración con laboratorios
- [ ] Reportes avanzados
- [ ] API REST pública
- [ ] Aplicación móvil
- [ ] Integración con sistemas de salud

---

**Desarrollado con ❤️ para mejorar la gestión médica**