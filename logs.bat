@echo off
REM Script para ver logs del Sistema de Historias Clínicas en Windows
REM Uso: logs.bat [servicio]
REM Servicios disponibles: frontend, backend, db, todos

echo ================================================
echo   Logs del Sistema de Historias Clínicas
echo   CORTEX Medical Records
echo ================================================
echo.

if "%1"=="frontend" (
    echo [INFO] Mostrando logs del Frontend...
    echo [INFO] Presiona Ctrl+C para salir
    echo.
    docker-compose logs -f typescript-frontend
    goto :end
)

if "%1"=="backend" (
    echo [INFO] Mostrando logs del Backend...
    echo [INFO] Presiona Ctrl+C para salir
    echo.
    docker-compose logs -f python-backend
    goto :end
)

if "%1"=="db" (
    echo [INFO] Mostrando logs de la Base de Datos...
    echo [INFO] Presiona Ctrl+C para salir
    echo.
    docker-compose logs -f postgres-db
    goto :end
)

REM Por defecto mostrar todos los logs
echo [INFO] Mostrando todos los logs...
echo [INFO] Presiona Ctrl+C para salir
echo.
echo Uso: logs.bat [servicio]
echo   Servicios: frontend, backend, db
echo.
docker-compose logs -f

:end

