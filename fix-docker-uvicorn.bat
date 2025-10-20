@echo off
REM 🔧 Script para solucionar el error de uvicorn en Docker (Windows)
REM Este script diagnostica y soluciona el problema de uvicorn no encontrado

echo 🔧 Solucionando error de uvicorn en Docker
echo =========================================
echo.

REM Detener contenedores existentes
echo [INFO] Deteniendo contenedores existentes...
docker-compose -f docker-compose.custom.yml down
echo [SUCCESS] Contenedores detenidos

REM Limpiar imágenes y caché
echo [INFO] Limpiando caché de Docker...
docker system prune -f
docker builder prune -f
echo [SUCCESS] Caché limpiado

REM Reconstruir imágenes sin caché
echo [INFO] Reconstruyendo imágenes sin caché...
docker-compose -f docker-compose.custom.yml build --no-cache
if %errorlevel% neq 0 (
    echo [ERROR] Error al reconstruir las imágenes
    pause
    exit /b 1
)
echo [SUCCESS] Imágenes reconstruidas correctamente

REM Iniciar servicios
echo [INFO] Iniciando servicios...
docker-compose -f docker-compose.custom.yml up -d
if %errorlevel% neq 0 (
    echo [ERROR] Error al iniciar los servicios
    pause
    exit /b 1
)
echo [SUCCESS] Servicios iniciados

REM Esperar a que se inicialicen
echo [INFO] Esperando inicialización...
timeout /t 20 /nobreak >nul

REM Verificar logs del backend
echo [INFO] Verificando logs del backend...
docker logs medical-records-backend

REM Verificar que uvicorn esté disponible
echo [INFO] Verificando instalación de uvicorn en el contenedor...
docker exec medical-records-backend ls -la /app/.venv/bin/ | findstr uvicorn
if %errorlevel% neq 0 (
    echo [WARNING] uvicorn no encontrado en /app/.venv/bin/
    echo [INFO] Verificando instalación de Python...
    docker exec medical-records-backend python --version
    echo [INFO] Verificando pip...
    docker exec medical-records-backend pip list | findstr uvicorn
) else (
    echo [SUCCESS] uvicorn encontrado en el contenedor
)

REM Verificar conectividad
echo [INFO] Verificando conectividad...
timeout /t 10 /nobreak >nul
curl -s http://localhost:8000/health >nul 2>&1
if %errorlevel% neq 0 (
    echo [WARNING] API no responde aún. Esperando más tiempo...
    timeout /t 30 /nobreak >nul
    curl -s http://localhost:8000/health >nul 2>&1
    if %errorlevel% neq 0 (
        echo [ERROR] API no responde después de 1 minuto
        echo [INFO] Revisa los logs: docker logs medical-records-backend
    ) else (
        echo [SUCCESS] API respondiendo correctamente
    )
) else (
    echo [SUCCESS] API respondiendo correctamente
)

echo.
echo 🎉 ¡Diagnóstico completado!
echo ===========================
echo.
echo 📋 Si el problema persiste, prueba:
echo    1. docker logs medical-records-backend
echo    2. docker exec medical-records-backend bash
echo    3. Revisa el Dockerfile del backend
echo.
pause
