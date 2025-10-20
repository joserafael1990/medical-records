@echo off
REM 🔍 Script de Diagnóstico para Problema de uvicorn
REM Este script diagnostica específicamente el problema de uvicorn no encontrado

echo 🔍 Diagnóstico del Problema de uvicorn
echo =====================================
echo.

REM Verificar estado de contenedores
echo [INFO] Estado actual de contenedores:
docker ps -a | findstr medical-records

echo.
echo [INFO] Verificando logs del backend:
docker logs medical-records-backend

echo.
echo [INFO] Verificando estructura del contenedor backend:
docker exec medical-records-backend ls -la /app/

echo.
echo [INFO] Verificando entorno virtual:
docker exec medical-records-backend ls -la /app/.venv/

echo.
echo [INFO] Verificando binarios en .venv/bin:
docker exec medical-records-backend ls -la /app/.venv/bin/ | findstr uvicorn

echo.
echo [INFO] Verificando instalación de uvicorn:
docker exec medical-records-backend /app/.venv/bin/pip list | findstr uvicorn

echo.
echo [INFO] Verificando PATH en el contenedor:
docker exec medical-records-backend echo $PATH

echo.
echo [INFO] Verificando si uvicorn es ejecutable:
docker exec medical-records-backend /app/.venv/bin/uvicorn --version

echo.
echo [INFO] Verificando archivo main_clean_english.py:
docker exec medical-records-backend ls -la /app/main_clean_english.py

echo.
echo [INFO] Verificando permisos:
docker exec medical-records-backend ls -la /app/.venv/bin/uvicorn

echo.
echo 📋 Resumen del Diagnóstico:
echo ==========================
echo.
echo Si uvicorn no se encuentra:
echo   1. El entorno virtual no se copió correctamente
echo   2. uvicorn no se instaló en el entorno virtual
echo   3. Los permisos no son correctos
echo.
echo Si uvicorn se encuentra pero no ejecuta:
echo   1. Problema de permisos
echo   2. Problema de PATH
echo   3. Problema con el archivo main_clean_english.py
echo.
echo Soluciones recomendadas:
echo   1. Ejecutar: install-fixed.bat
echo   2. O ejecutar: fix-docker-uvicorn.bat
echo.
pause
