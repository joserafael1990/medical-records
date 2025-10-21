@echo off
REM Script para reconstruir completamente el proyecto en Windows
REM Uso: rebuild.bat [servicio]
REM Sin parámetro: reconstruye todo
REM Con parámetro: frontend, backend

echo ==================================================
echo   Reconstrucción Completa del Proyecto
echo   CORTEX Medical Records
echo ==================================================
echo.

echo [WARNING] Este script detendrá y reconstruirá los contenedores
set /p CONTINUE="Continuar? (S/N): "
if /i not "%CONTINUE%"=="S" (
    echo [INFO] Operación cancelada
    pause
    exit /b 0
)

echo.
echo [INFO] Deteniendo contenedores...
docker-compose down

if "%1"=="frontend" (
    echo [INFO] Reconstruyendo Frontend...
    docker-compose build --no-cache typescript-frontend
    echo [INFO] Iniciando Frontend...
    docker-compose up -d typescript-frontend
    echo [SUCCESS] Frontend reconstruido
    goto :end
)

if "%1"=="backend" (
    echo [INFO] Reconstruyendo Backend...
    docker-compose build --no-cache python-backend
    echo [INFO] Iniciando Backend...
    docker-compose up -d python-backend
    echo [SUCCESS] Backend reconstruido
    goto :end
)

REM Reconstruir todo
echo [INFO] Reconstruyendo todas las imágenes...
docker-compose build --no-cache

if %errorlevel% neq 0 (
    echo [ERROR] Error al reconstruir las imágenes
    pause
    exit /b 1
)

echo [INFO] Iniciando servicios...
docker-compose up -d

if %errorlevel% neq 0 (
    echo [ERROR] Error al iniciar los servicios
    pause
    exit /b 1
)

:end
echo.
echo [SUCCESS] Reconstrucción completada
echo.
echo URLs:
echo   Frontend:  http://localhost:3000
echo   Backend:   http://localhost:8000
echo   API Docs:  http://localhost:8000/docs
echo.
echo Ver logs: logs.bat
echo.
pause

