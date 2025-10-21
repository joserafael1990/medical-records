@echo off
REM Script para iniciar el Sistema de Historias Clínicas en Windows
REM Uso: start.bat

echo ================================================
echo   Iniciando Sistema de Historias Clínicas
echo   CORTEX Medical Records
echo ================================================
echo.

REM Verificar Docker
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Docker no está instalado.
    echo [ERROR] Instala Docker Desktop desde: https://www.docker.com/products/docker-desktop/
    pause
    exit /b 1
)

REM Verificar que Docker esté ejecutándose
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Docker no está ejecutándose.
    echo [ERROR] Por favor inicia Docker Desktop e intenta de nuevo.
    pause
    exit /b 1
)

echo [INFO] Docker está ejecutándose correctamente
echo.

REM Iniciar servicios
echo [INFO] Iniciando servicios con Docker Compose...
docker-compose up -d

if %errorlevel% neq 0 (
    echo [ERROR] Error al iniciar los servicios
    pause
    exit /b 1
)

echo.
echo ================================================
echo   Servicios iniciados exitosamente!
echo ================================================
echo.
echo Acceso a la aplicación:
echo   Frontend:  http://localhost:3000
echo   Backend:   http://localhost:8000
echo   API Docs:  http://localhost:8000/docs
echo.
echo Credenciales:
echo   Email:     thiago@avant.com
echo   Password:  Password123!
echo.
echo Para ver los logs: logs.bat
echo Para detener:     stop.bat
echo.
pause

