# 🔌 Conexión Rápida a la Base de Datos

## ⚠️ Error: Connection to localhost:5433 refused

**Solución**: Usa el puerto **5432**, no **5433**.

---

## ✅ Credenciales Correctas

### Para clientes externos (pgAdmin, DBeaver, TablePlus, etc.):

```
Host: localhost
Port: 5432
Database: historias_clinicas
Username: historias_user
Password: historias_pass
```

### URL de Conexión:

```
postgresql://historias_user:historias_pass@localhost:5432/historias_clinicas
```

---

## 🔍 Verificar que PostgreSQL esté corriendo

```bash
# Verificar contenedor
docker-compose ps postgres-db

# Probar conexión
docker-compose exec postgres-db psql -U historias_user -d historias_clinicas -c "SELECT version();"
```

---

## 📋 Comandos Útiles

### Conectar desde la terminal:

```bash
# Opción 1: Desde el contenedor
docker-compose exec postgres-db psql -U historias_user -d historias_clinicas

# Opción 2: Desde tu máquina (si tienes psql instalado)
psql -h localhost -p 5432 -U historias_user -d historias_clinicas
```

### Listar tablas:

```bash
docker-compose exec postgres-db psql -U historias_user -d historias_clinicas -c "\dt"
```

### Ver estructura de una tabla:

```bash
docker-compose exec postgres-db psql -U historias_user -d historias_clinicas -c "\d nombre_tabla"
```

---

**El puerto correcto es 5432, no 5433.**

