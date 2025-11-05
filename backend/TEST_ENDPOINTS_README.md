# Script de Pruebas Exhaustivas de Endpoints

## Descripción

Script de pruebas automáticas que valida todos los endpoints migrados a routers modulares. Asegura que el sistema funciona correctamente después de la refactorización.

## Uso

### Ejecución básica (sin autenticación)
```bash
cd backend
python3 test_endpoints.py
```

### Con token de autenticación
```bash
python3 test_endpoints.py --token "tu_token_jwt"
```

### Con URL personalizada
```bash
python3 test_endpoints.py --url "http://localhost:8000" --token "tu_token"
```

## Módulos Testeados

El script prueba los siguientes módulos:

1. **Catalogs** - Catálogos (especialidades, países, estados, etc.)
2. **Documents** - Gestión de documentos
3. **Offices** - Gestión de consultorios
4. **Medications** - Catálogo de medicamentos
5. **Schedule** - Gestión de horarios
6. **Doctors** - Perfiles de doctores
7. **Patients** - Gestión de pacientes
8. **Appointments** - Gestión de citas
9. **Clinical Studies** - Estudios clínicos
10. **Dashboard** - Estadísticas del dashboard
11. **Vital Signs** - Signos vitales
12. **Auth** - Autenticación
13. **Privacy** - Privacidad y ARCO
14. **Consultations** - Consultas y expedientes médicos

## Salida

El script muestra:
- ✅ Endpoints que responden correctamente
- ❌ Endpoints que fallan con el error específico
- 📊 Resumen por módulo
- 📊 Resumen general con tasa de éxito

## Requisitos

- Python 3.8+
- `requests` library (incluida en requirements.txt)
- Servidor backend corriendo en `http://localhost:8000`

## Ejemplo de Salida

```
🧪 PRUEBAS EXHAUSTIVAS DE ENDPOINTS
✓ Servidor respondiendo correctamente

📋 Testing Catalogs...
✓ /api/specialties
✓ /api/countries
...

📊 RESUMEN FINAL:
Catalogs:
  ✓ Pasados: 5
  ✗ Fallidos: 0
  Tasa de éxito: 100.0%

✅ ¡TODOS LOS TESTS PASARON!
```

## Notas

- Los endpoints que requieren autenticación mostrarán "Auth requerida" si no hay token (esto es esperado)
- Los endpoints con datos de prueba (IDs 1, etc.) pueden fallar si no existen en la BD
- El script valida que los endpoints respondan, no valida la lógica de negocio completa
