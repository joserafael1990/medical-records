@echo off
REM Script para limpiar el proyecto (contenedores, imágenes, volúmenes) en Windows
REM Uso: clean.bat

echo ==================================================
echo   Limpieza del Proyecto
echo   CORTEX Medical Records
echo ==================================================
echo.

echo [WARNING] Este script eliminará:
echo   - Todos los contenedores detenidos
echo   - Todas las imágenes sin usar
echo   - Todos los volúmenes sin usar
echo   - Cache de build
echo.
echo [WARNING] Los datos de la base de datos se perderán!
echo.

set /p CONTINUE="Estás seguro de que deseas continuar? (S/N): "
if /i not "%CONTINUE%"=="S" (
    echo [INFO] Operación cancelada
    pause
    exit /b 0
)

echo.
echo [INFO] Deteniendo contenedores...
docker-compose down

echo [INFO] Eliminando contenedores...
docker-compose down -v

echo [INFO] Limpiando sistema Docker...
docker system prune -af --volumes

if %errorlevel% neq 0 (
    echo [ERROR] Error durante la limpieza
    pause
    exit /b 1
)

echo.
echo [SUCCESS] Limpieza completada
echo.
echo Para volver a iniciar el proyecto:
echo   1. install.bat (primera vez)
echo   2. start.bat (inicio normal)
echo.
pause

