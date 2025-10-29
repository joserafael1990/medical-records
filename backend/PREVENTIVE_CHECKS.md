# Verificaciones Preventivas para el Backend

Este documento describe las herramientas implementadas para prevenir errores de sintaxis y problemas que puedan causar que el servidor falle.

## ✅ Herramientas Implementadas

### 1. Script de Validación de Sintaxis (`validate_syntax.py`)

Valida automáticamente la sintaxis de todos los archivos Python antes de construir el contenedor Docker.

**Uso manual:**
```bash
cd backend
python3 validate_syntax.py
```

**Ubicación:** `backend/validate_syntax.py`

### 2. Validación en Dockerfile

El Dockerfile ahora valida la sintaxis automáticamente durante la construcción. Si hay errores, la construcción falla.

**Ubicación:** `backend/Dockerfile` (línea 22-23)

### 3. Health Check en Docker Compose

El contenedor tiene un health check que monitorea el estado del servidor cada 30 segundos.

**Ubicación:** `compose.yaml` (líneas 13-18)

**Verificar estado:**
```bash
docker-compose ps python-backend
```

### 4. Git Pre-commit Hook

Hook de Git que valida la sintaxis de archivos Python antes de permitir un commit.

**Ubicación:** `.git/hooks/pre-commit`

**Para habilitarlo (si no está activo):**
```bash
chmod +x .git/hooks/pre-commit
```

## 🔧 Cómo Usar

### Antes de hacer commit:

El hook se ejecuta automáticamente. Si hay errores de sintaxis, el commit será bloqueado.

### Antes de construir/reconstruir el contenedor:

El Dockerfile ejecutará automáticamente `validate_syntax.py`. Si hay errores, la construcción fallará con un mensaje claro.

### Monitorear el servidor:

```bash
# Ver estado del contenedor
docker-compose ps python-backend

# Ver logs en tiempo real
docker-compose logs -f python-backend

# Verificar health check
curl http://localhost:8000/health
```

## 🚨 Solución de Problemas

### El servidor deja de funcionar:

1. **Revisar logs inmediatamente:**
   ```bash
   docker-compose logs --tail=50 python-backend
   ```

2. **Verificar sintaxis:**
   ```bash
   cd backend
   python3 validate_syntax.py
   ```

3. **Verificar estado del health check:**
   ```bash
   docker-compose ps python-backend
   ```

### El commit es bloqueado:

1. Leer el mensaje de error del pre-commit hook
2. Corregir los errores de sintaxis indicados
3. Intentar commit nuevamente

### La construcción de Docker falla:

1. Revisar el error en la salida de `docker-compose build`
2. Ejecutar `python3 validate_syntax.py` localmente
3. Corregir los errores
4. Reconstruir: `docker-compose up -d --build python-backend`

## 📝 Archivos Críticos Monitoreados

Los siguientes archivos son validados con prioridad:

- `main_clean_english.py` ⭐ (más crítico)
- `auth.py`
- `config.py`
- `database.py`
- `email_service.py`
- `appointment_service.py`
- `consultation_service.py`
- `crud.py`

## 🎯 Buenas Prácticas

1. **Antes de editar código crítico:**
   - Hacer una copia de respaldo
   - Probar cambios en un branch separado

2. **Después de editar:**
   - Ejecutar `python3 validate_syntax.py` localmente
   - Probar que el servidor inicia: `docker-compose restart python-backend`
   - Revisar logs: `docker-compose logs --tail=20 python-backend`

3. **Antes de commit:**
   - El hook se ejecutará automáticamente
   - Si falla, corregir antes de continuar

4. **Monitoreo continuo:**
   - Revisar logs periódicamente
   - Configurar alertas si el health check falla repetidamente

## 🔄 Próximas Mejoras Sugeridas

- [ ] Agregar tests automatizados
- [ ] Integrar con CI/CD
- [ ] Agregar linting más estricto (flake8, pylint)
- [ ] Configurar alertas automáticas cuando el servidor falle


