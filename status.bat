@echo off
REM Script para verificar el estado del Sistema de Historias Clínicas en Windows
REM Uso: status.bat

echo ==================================================
echo   Estado del Sistema de Historias Clínicas
echo   CORTEX Medical Records
echo ==================================================
echo.

REM Verificar Docker
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Docker no está instalado
    pause
    exit /b 1
)

docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Docker no está ejecutándose
    echo [INFO] Por favor inicia Docker Desktop
    pause
    exit /b 1
)

echo [SUCCESS] Docker está ejecutándose
echo.

REM Mostrar estado de contenedores
echo Contenedores activos:
echo.
docker-compose ps

echo.
echo ==================================================
echo.

REM Verificar servicios específicos
echo Verificando servicios:
echo.

REM Frontend
curl -s http://localhost:3000 >nul 2>&1
if %errorlevel% equ 0 (
    echo [SUCCESS] Frontend: http://localhost:3000 - Activo
) else (
    echo [ERROR] Frontend: http://localhost:3000 - No responde
)

REM Backend
curl -s http://localhost:8000/health >nul 2>&1
if %errorlevel% equ 0 (
    echo [SUCCESS] Backend: http://localhost:8000 - Activo
) else (
    echo [ERROR] Backend: http://localhost:8000 - No responde
)

echo.
echo ==================================================
echo.

REM Mostrar uso de recursos
echo Uso de recursos:
docker stats --no-stream

echo.
pause

