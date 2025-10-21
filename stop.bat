@echo off
REM Script para detener el Sistema de Historias Clínicas en Windows
REM Uso: stop.bat

echo ================================================
echo   Deteniendo Sistema de Historias Clínicas
echo   CORTEX Medical Records
echo ================================================
echo.

docker-compose down

if %errorlevel% neq 0 (
    echo [ERROR] Error al detener los servicios
    pause
    exit /b 1
)

echo.
echo [SUCCESS] Servicios detenidos correctamente
echo.
pause

