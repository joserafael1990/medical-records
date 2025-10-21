@echo off
REM Script para desplegar la funcionalidad de Constancias Médicas en Windows
REM Uso: deploy-constancias.bat

echo ==================================================
echo   Despliegue de Constancias Médicas - CORTEX
echo ==================================================
echo.

REM Verificar Docker
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Docker no está instalado.
    pause
    exit /b 1
)

docker-compose --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Docker Compose no está instalado.
    pause
    exit /b 1
)

echo [INFO] Docker y Docker Compose detectados
echo.

REM Mostrar archivos modificados
echo [INFO] Archivos modificados/creados:
echo   - frontend/src/services/pdfService.ts (metodo generateCertificate actualizado)
echo   - frontend/src/hooks/usePDFGenerator.ts (hook agregado)
echo   - frontend/src/components/common/PrintCertificateButtonPatient.tsx (NUEVO)
echo   - frontend/src/components/dialogs/PatientDialog.tsx (integracion)
echo   - frontend/src/components/common/PrintButtons.tsx (actualizado)
echo   - frontend/src/components/layout/AppLayout.tsx (doctorProfile agregado)
echo   - docs/CONSTANCIA_MEDICA_GUIDE.md (NUEVO)
echo   - CAMBIOS_CONSTANCIAS_V2.md (NUEVO)
echo.

REM Preguntar si continuar
set /p CONTINUE="Deseas reconstruir y desplegar los contenedores? (S/N): "
if /i not "%CONTINUE%"=="S" (
    echo [INFO] Despliegue cancelado por el usuario.
    pause
    exit /b 0
)

echo.
echo [INFO] Deteniendo contenedores actuales...
docker-compose down

echo [INFO] Reconstruyendo imágenes de Docker (esto puede tomar varios minutos)...
docker-compose build --no-cache typescript-frontend

if %errorlevel% neq 0 (
    echo [ERROR] Error al reconstruir las imágenes
    pause
    exit /b 1
)

echo [INFO] Levantando servicios...
docker-compose up -d

if %errorlevel% neq 0 (
    echo [ERROR] Error al levantar los servicios
    pause
    exit /b 1
)

echo [INFO] Esperando a que los servicios inicien...
timeout /t 5 /nobreak >nul

echo [INFO] Verificando estado de los contenedores...
docker-compose ps

echo.
echo ==================================================
echo   Despliegue completado exitosamente!
echo ==================================================
echo.
echo Servicios disponibles:
echo   - Frontend: http://localhost:3000
echo   - Backend:  http://localhost:8000
echo   - Base de datos: localhost:5432
echo.
echo Para ver los logs del frontend:
echo   docker-compose logs -f typescript-frontend
echo.
echo Para ver los logs del backend:
echo   docker-compose logs -f python-backend
echo.
echo Para detener los servicios:
echo   docker-compose down
echo.

set /p SHOWLOGS="Deseas ver los logs del frontend ahora? (S/N): "
if /i "%SHOWLOGS%"=="S" (
    echo [INFO] Mostrando logs del frontend (Ctrl+C para salir)...
    docker-compose logs -f typescript-frontend
)

pause

