# 🔌 Guía de Conexión a la Base de Datos PostgreSQL

## ⚠️ Error Común: Connection to localhost:5433 refused

Este error indica que estás intentando conectarte al puerto **5433**, pero PostgreSQL está corriendo en el puerto **5432**.

---

## ✅ Configuración Correcta

### Desde Docker (dentro del contenedor):
- **Host**: `postgres-db` (nombre del servicio en Docker)
- **Puerto**: `5432`
- **Base de datos**: `historias_clinicas`
- **Usuario**: `historias_user`
- **Contraseña**: `historias_pass`
- **URL completa**: `postgresql://historias_user:historias_pass@postgres-db:5432/historias_clinicas`

### Desde tu máquina local (cliente externo):
- **Host**: `localhost` o `127.0.0.1`
- **Puerto**: `5432` ⚠️ **NO 5433**
- **Base de datos**: `historias_clinicas`
- **Usuario**: `historias_user`
- **Contraseña**: `historias_pass`
- **URL completa**: `postgresql://historias_user:historias_pass@localhost:5432/historias_clinicas`

---

## 🔧 Solución al Error

### Opción 1: Cambiar el puerto en tu cliente

Si estás usando un cliente como pgAdmin, DBeaver, o TablePlus:

1. **Verifica el puerto**: Debe ser `5432`, no `5433`
2. **Host**: `localhost` o `127.0.0.1`
3. **Base de datos**: `historias_clinicas`
4. **Usuario**: `historias_user`
5. **Contraseña**: `historias_pass`

### Opción 2: Verificar que PostgreSQL esté corriendo

```bash
# Verificar que el contenedor esté corriendo
docker-compose ps postgres-db

# Verificar que el puerto esté expuesto
docker-compose port postgres-db 5432

# Probar conexión desde el contenedor
docker-compose exec postgres-db psql -U historias_user -d historias_clinicas -c "SELECT version();"
```

### Opción 3: Si necesitas cambiar el puerto expuesto

Si tienes otro servicio usando el puerto 5432, puedes cambiarlo en `compose.yaml`:

```yaml
postgres-db:
  ports:
    - "5433:5432"  # Cambiar el puerto externo a 5433
```

Luego usarías `localhost:5433` para conectarte.

---

## 📋 Credenciales de la Base de Datos

```
Host: localhost
Port: 5432
Database: historias_clinicas
User: historias_user
Password: historias_pass
```

---

## 🔍 Verificar Conexión

### Desde la línea de comandos:

```bash
# Conectar usando psql (si lo tienes instalado)
psql -h localhost -p 5432 -U historias_user -d historias_clinicas

# O desde dentro del contenedor
docker-compose exec postgres-db psql -U historias_user -d historias_clinicas
```

### Desde Python:

```python
import psycopg2

conn = psycopg2.connect(
    host="localhost",
    port=5432,
    database="historias_clinicas",
    user="historias_user",
    password="historias_pass"
)
print("✅ Conexión exitosa!")
```

---

## 🛠️ Solución de Problemas

### Error: "Connection refused"

**Causas posibles:**
1. El contenedor de PostgreSQL no está corriendo
2. Estás usando el puerto incorrecto
3. El firewall está bloqueando la conexión

**Solución:**
```bash
# Verificar que el contenedor esté corriendo
docker-compose ps

# Si no está corriendo, iniciarlo
docker-compose up -d postgres-db

# Verificar los logs
docker-compose logs postgres-db
```

### Error: "Password authentication failed"

**Causa:** Contraseña incorrecta

**Solución:** Verifica las credenciales en `compose.yaml`:
- Usuario: `historias_user`
- Contraseña: `historias_pass`

### Error: "Database does not exist"

**Causa:** La base de datos no existe

**Solución:**
```bash
# Crear la base de datos
docker-compose exec postgres-db psql -U historias_user -d postgres -c "CREATE DATABASE historias_clinicas;"
```

---

## 📞 Recursos

- **Docker Compose**: Ver `compose.yaml` línea 82-90
- **PostgreSQL Docs**: [https://www.postgresql.org/docs/](https://www.postgresql.org/docs/)

---

**El puerto correcto es 5432, no 5433.**

