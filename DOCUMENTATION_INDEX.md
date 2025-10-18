# 📚 Índice de Documentación - Sistema de Historias Clínicas

## 🚀 Para Empezar Rápidamente

### 👥 Para Usuarios Nuevos
1. **[INSTALLATION_INSTRUCTIONS.md](INSTALLATION_INSTRUCTIONS.md)** - Guía paso a paso para instalar el sistema
2. **[SETUP_GUIDE.md](SETUP_GUIDE.md)** - Guía detallada de instalación y configuración
3. **[README.md](README.md)** - Información general del proyecto

### ⚡ Instalación Automática
- **macOS/Linux**: `./install.sh`
- **Windows**: `install.bat`

## 📖 Documentación Técnica

### 🛠️ Desarrollo y Configuración
- **[START_SERVERS.md](START_SERVERS.md)** - Cómo iniciar los servidores de desarrollo
- **[DOCKER_VOLUME_MOUNTS.md](DOCKER_VOLUME_MOUNTS.md)** - Configuración de volúmenes Docker
- **[TEST_MEDICAL_RECORDS_GUIDE.md](TEST_MEDICAL_RECORDS_GUIDE.md)** - Guía de pruebas del sistema

### 🔧 Scripts de Utilidad
- **`migrate-existing-db.sh`** - Migración de base de datos existente
- **`restart-dev.sh`** - Reinicio rápido para desarrollo

## 🎯 Guías por Tipo de Usuario

### 👨‍💻 Desarrolladores
1. Lee **[README.md](README.md)** para entender la arquitectura
2. Sigue **[SETUP_GUIDE.md](SETUP_GUIDE.md)** para configuración detallada
3. Usa **[START_SERVERS.md](START_SERVERS.md)** para desarrollo diario
4. Consulta **[TEST_MEDICAL_RECORDS_GUIDE.md](TEST_MEDICAL_RECORDS_GUIDE.md)** para pruebas

### 🏥 Usuarios Finales (Médicos/Personal de Salud)
1. Sigue **[INSTALLATION_INSTRUCTIONS.md](INSTALLATION_INSTRUCTIONS.md)** para instalación
2. Usa las credenciales por defecto:
   - **Email**: `thiago@avant.com`
   - **Contraseña**: `Password123!`

### 🏢 Administradores de Sistema
1. Lee **[SETUP_GUIDE.md](SETUP_GUIDE.md)** para configuración avanzada
2. Consulta **[DOCKER_VOLUME_MOUNTS.md](DOCKER_VOLUME_MOUNTS.md)** para gestión de datos
3. Usa **[TEST_MEDICAL_RECORDS_GUIDE.md](TEST_MEDICAL_RECORDS_GUIDE.md)** para validación

## 📋 Checklist de Instalación

### ✅ Prerrequisitos
- [ ] Docker Desktop instalado y ejecutándose
- [ ] Git instalado
- [ ] Navegador web
- [ ] Puertos 3000, 8000, 5432 disponibles

### ✅ Instalación
- [ ] Repositorio clonado desde GitHub
- [ ] Script de instalación ejecutado (`install.sh` o `install.bat`)
- [ ] Contenedores ejecutándose (`docker ps`)
- [ ] Aplicación accesible en http://localhost:3000
- [ ] Login exitoso con credenciales por defecto

### ✅ Verificación
- [ ] Backend API respondiendo en http://localhost:8000/health
- [ ] Frontend cargando correctamente
- [ ] Base de datos conectada
- [ ] Funcionalidades básicas probadas

## 🆘 Solución de Problemas

### Problemas Comunes
1. **Docker no inicia**: Verifica que Docker Desktop esté ejecutándose
2. **Puertos ocupados**: Detén aplicaciones que usen puertos 3000, 8000, 5432
3. **Contenedores no inician**: Ejecuta `docker system prune -f` y reintenta
4. **No puedo acceder**: Espera unos minutos para inicialización completa

### Comandos de Diagnóstico
```bash
# Ver estado de contenedores
docker ps

# Ver logs de servicios
docker logs medical-records-backend
docker logs medical-records-frontend
docker logs medical-records-db

# Verificar conectividad
curl http://localhost:8000/health
curl http://localhost:3000
```

## 📞 Soporte

### Documentación Adicional
- **API Documentation**: http://localhost:8000/docs (cuando el sistema esté ejecutándose)
- **GitHub Issues**: Para reportar problemas
- **Logs del Sistema**: Usar comandos de diagnóstico arriba

### Contacto
- Revisa la documentación antes de contactar
- Incluye logs de error al reportar problemas
- Especifica tu sistema operativo y versión de Docker

## 🎉 ¡Listo para Usar!

Una vez completada la instalación, tendrás acceso a:

- ✅ **Gestión de Pacientes**
- ✅ **Consultas Médicas**
- ✅ **Sistema de Citas**
- ✅ **Dashboard Analítico**
- ✅ **Perfil del Doctor**
- ✅ **Estudios Clínicos**

¡Disfruta usando el Sistema de Historias Clínicas! 🏥✨
