# 🐳 Configuración de Volumen Mounts para Desarrollo

## ✅ Configuración Completada

He configurado volumen mounts en Docker para sincronización automática de código. Ahora los cambios en tu código local se reflejarán automáticamente en los contenedores.

## 🔧 Cambios Realizados

### 1. **compose.yaml actualizado**
- ✅ **Backend**: Volumen mount `./backend:/app`
- ✅ **Frontend**: Volumen mount `./frontend:/app`
- ✅ **Exclusiones**: `node_modules`, `__pycache__`, `venv`, etc.
- ✅ **Hot Reload**: Habilitado con `FAST_REFRESH=true`

### 2. **Dockerfile.dev optimizado**
- ✅ **Frontend**: Configurado para desarrollo con hot reload
- ✅ **Variables de entorno**: Optimizadas para desarrollo

### 3. **Archivos .dockerignore**
- ✅ **Backend**: Excluye cache, venv, archivos temporales
- ✅ **Frontend**: Excluye node_modules, build, archivos temporales

### 4. **Script de reinicio**
- ✅ **restart-dev.sh**: Script para reiniciar con nueva configuración

## 🚀 Cómo Usar

### Primera vez (configuración inicial):
```bash
./restart-dev.sh
```

### Para desarrollo diario:
```bash
# Los contenedores ya están corriendo con volumen mounts
# Solo edita tu código y los cambios se reflejarán automáticamente
```

### Si necesitas reiniciar:
```bash
docker-compose -f compose.yaml restart
```

## 📁 Estructura de Volúmenes

```
./backend/     → /app (en contenedor backend)
./frontend/    → /app (en contenedor frontend)
```

### Exclusiones (no se sincronizan):
- `node_modules/` (frontend)
- `__pycache__/` (backend)
- `venv/` (backend)
- `build/`, `dist/` (frontend)

## 🔥 Hot Reload

### Frontend (React):
- ✅ **Cambios en código**: Se reflejan automáticamente
- ✅ **CSS/Estilos**: Actualización en tiempo real
- ✅ **Componentes**: Recarga automática

### Backend (FastAPI):
- ✅ **Cambios en código**: Se reflejan automáticamente
- ✅ **API endpoints**: Recarga automática con uvicorn --reload

## 🛠️ Comandos Útiles

```bash
# Ver logs en tiempo real
docker-compose -f compose.yaml logs -f

# Ver logs de un servicio específico
docker-compose -f compose.yaml logs -f typescript-frontend
docker-compose -f compose.yaml logs -f python-backend

# Entrar al contenedor (si es necesario)
docker-compose -f compose.yaml exec typescript-frontend sh
docker-compose -f compose.yaml exec python-backend bash

# Reconstruir solo un servicio
docker-compose -f compose.yaml up --build typescript-frontend
```

## 🎯 Beneficios

1. **⚡ Desarrollo más rápido**: No más `docker cp`
2. **🔄 Sincronización automática**: Cambios instantáneos
3. **🐛 Debugging mejorado**: Logs en tiempo real
4. **💾 Persistencia**: Los cambios se mantienen entre reinicios
5. **🎨 Hot reload**: Actualización automática del navegador

## ⚠️ Notas Importantes

- Los `node_modules` se excluyen para usar la versión del contenedor
- Los archivos de cache se excluyen para evitar conflictos
- La base de datos PostgreSQL mantiene su volumen persistente
- Los contenedores se reinician automáticamente si fallan

## 🔍 Verificación

Para verificar que funciona:

1. **Edita un archivo** en `frontend/src/` o `backend/`
2. **Guarda el archivo**
3. **Observa los logs**: Deberías ver la recompilación automática
4. **Refresca el navegador**: Los cambios deberían aparecer

¡Listo! Ahora tienes desarrollo con sincronización automática. 🚀
