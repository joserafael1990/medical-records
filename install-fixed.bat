@echo off
REM 🏥 Script de Instalación Corregido - Sistema de Historias Clínicas (Windows)
REM Este script soluciona el problema de uvicorn no encontrado

echo 🏥 Sistema de Historias Clínicas - Instalación Corregida
echo ========================================================
echo.

REM Verificar si Docker está instalado
echo [INFO] Verificando instalación de Docker...
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Docker no está instalado. Por favor instala Docker Desktop desde:
    echo [ERROR] https://www.docker.com/products/docker-desktop/
    pause
    exit /b 1
)

docker-compose --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Docker Compose no está instalado.
    pause
    exit /b 1
)
echo [SUCCESS] Docker está instalado correctamente

REM Verificar si Docker está ejecutándose
echo [INFO] Verificando que Docker esté ejecutándose...
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Docker no está ejecutándose. Por favor inicia Docker Desktop.
    pause
    exit /b 1
)
echo [SUCCESS] Docker está ejecutándose correctamente

REM Verificar si Git está instalado
echo [INFO] Verificando instalación de Git...
git --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Git no está instalado. Por favor instala Git desde:
    echo [ERROR] https://git-scm.com/download/win
    pause
    exit /b 1
)
echo [SUCCESS] Git está instalado correctamente

REM Limpiar instalaciones previas
echo [INFO] Limpiando instalaciones previas...
if exist "docker-compose.custom.yml" (
    docker-compose -f docker-compose.custom.yml down >nul 2>&1
    echo [SUCCESS] Contenedores previos detenidos
)

REM Limpiar caché de Docker
echo [INFO] Limpiando caché de Docker...
docker system prune -f >nul 2>&1
docker builder prune -f >nul 2>&1
echo [SUCCESS] Caché limpiado

REM Usar el Dockerfile corregido
echo [INFO] Usando Dockerfile corregido...
copy backend\Dockerfile.fixed backend\Dockerfile >nul 2>&1
echo [SUCCESS] Dockerfile corregido aplicado

REM Construir las imágenes de Docker sin caché
echo [INFO] Construyendo imágenes de Docker (sin caché)...
docker-compose -f docker-compose.custom.yml build --no-cache
if %errorlevel% neq 0 (
    echo [ERROR] Error al construir las imágenes
    echo [INFO] Revisando logs de construcción...
    docker-compose -f docker-compose.custom.yml build --no-cache --progress=plain
    pause
    exit /b 1
)
echo [SUCCESS] Imágenes construidas correctamente

REM Iniciar los servicios
echo [INFO] Iniciando servicios...
docker-compose -f docker-compose.custom.yml up -d
if %errorlevel% neq 0 (
    echo [ERROR] Error al iniciar los servicios
    echo [INFO] Revisando logs...
    docker-compose -f docker-compose.custom.yml logs
    pause
    exit /b 1
)
echo [SUCCESS] Servicios iniciados correctamente

REM Esperar a que los servicios se inicialicen
echo [INFO] Esperando a que los servicios se inicialicen...
timeout /t 30 /nobreak >nul

REM Verificar que los servicios estén funcionando
echo [INFO] Verificando que los servicios estén funcionando...
docker ps | findstr "medical-records-db" >nul
if %errorlevel% neq 0 (
    echo [ERROR] Base de datos no está ejecutándose
    echo [INFO] Logs de la base de datos:
    docker logs medical-records-db
    pause
    exit /b 1
)
echo [SUCCESS] Base de datos ejecutándose

docker ps | findstr "medical-records-backend" >nul
if %errorlevel% neq 0 (
    echo [ERROR] Backend API no está ejecutándose
    echo [INFO] Logs del backend:
    docker logs medical-records-backend
    pause
    exit /b 1
)
echo [SUCCESS] Backend API ejecutándose

docker ps | findstr "medical-records-frontend" >nul
if %errorlevel% neq 0 (
    echo [ERROR] Frontend no está ejecutándose
    echo [INFO] Logs del frontend:
    docker logs medical-records-frontend
    pause
    exit /b 1
)
echo [SUCCESS] Frontend ejecutándose

REM Verificar conectividad de la API
echo [INFO] Verificando conectividad de la API...
timeout /t 15 /nobreak >nul
curl -s http://localhost:8000/health >nul 2>&1
if %errorlevel% neq 0 (
    echo [WARNING] API backend no está respondiendo aún. Esperando más tiempo...
    timeout /t 30 /nobreak >nul
    curl -s http://localhost:8000/health >nul 2>&1
    if %errorlevel% neq 0 (
        echo [ERROR] API no responde después de 1 minuto
        echo [INFO] Logs del backend:
        docker logs medical-records-backend
        echo [INFO] Verificando uvicorn en el contenedor:
        docker exec medical-records-backend ls -la /app/.venv/bin/ | findstr uvicorn
        pause
        exit /b 1
    ) else (
        echo [SUCCESS] API backend respondiendo correctamente
    )
) else (
    echo [SUCCESS] API backend respondiendo correctamente
)

REM Verificar frontend
echo [INFO] Verificando frontend...
timeout /t 10 /nobreak >nul
curl -s http://localhost:3000 >nul 2>&1
if %errorlevel% neq 0 (
    echo [WARNING] Frontend no responde aún. Esto puede ser normal en la primera ejecución.
    echo [WARNING] Espera unos minutos más y verifica manualmente en: http://localhost:3000
) else (
    echo [SUCCESS] Frontend respondiendo correctamente
)

REM Mostrar información de acceso
echo.
echo 🎉 ¡Instalación Completada Exitosamente!
echo ========================================
echo.
echo 📱 Acceso a la aplicación:
echo    🌐 Frontend: http://localhost:3000
echo    🔧 Backend API: http://localhost:8000
echo    📚 Documentación API: http://localhost:8000/docs
echo.
echo 🔐 Credenciales de acceso:
echo    📧 Email: thiago@avant.com
echo    🔑 Contraseña: Password123!
echo.
echo 🛠️ Comandos útiles:
echo    Ver estado: docker ps
echo    Ver logs backend: docker logs medical-records-backend
echo    Ver logs frontend: docker logs medical-records-frontend
echo    Detener: docker-compose -f docker-compose.custom.yml down
echo    Reiniciar: docker-compose -f docker-compose.custom.yml restart
echo.
echo 📖 Para más información, consulta: SETUP_GUIDE.md
echo.
echo [SUCCESS] ¡El Sistema de Historias Clínicas está listo para usar!
echo.
pause
