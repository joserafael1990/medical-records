@echo off
REM Script para reiniciar rápidamente el desarrollo en Windows
REM Uso: restart-dev.bat [servicio]
REM Sin parámetro: reinicia todos los servicios
REM Con parámetro: frontend, backend, db

echo ================================================
echo   Reinicio Rápido - Desarrollo
echo   CORTEX Medical Records
echo ================================================
echo.

if "%1"=="frontend" (
    echo [INFO] Reiniciando Frontend...
    docker-compose restart typescript-frontend
    echo [SUCCESS] Frontend reiniciado
    echo.
    echo [INFO] Ver logs: logs.bat frontend
    pause
    exit /b 0
)

if "%1"=="backend" (
    echo [INFO] Reiniciando Backend...
    docker-compose restart python-backend
    echo [SUCCESS] Backend reiniciado
    echo.
    echo [INFO] Ver logs: logs.bat backend
    pause
    exit /b 0
)

if "%1"=="db" (
    echo [INFO] Reiniciando Base de Datos...
    docker-compose restart postgres-db
    echo [SUCCESS] Base de Datos reiniciada
    echo.
    echo [INFO] Ver logs: logs.bat db
    pause
    exit /b 0
)

REM Reiniciar todo por defecto
echo [INFO] Reiniciando todos los servicios...
docker-compose restart

if %errorlevel% neq 0 (
    echo [ERROR] Error al reiniciar los servicios
    pause
    exit /b 1
)

echo.
echo [SUCCESS] Todos los servicios reiniciados correctamente
echo.
echo URLs:
echo   Frontend:  http://localhost:3000
echo   Backend:   http://localhost:8000
echo.
pause

