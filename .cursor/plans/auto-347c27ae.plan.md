<!-- 347c27ae-d390-4cdb-b6bf-e2b7bde95e4a aa82faa3-d9cc-4dd8-b1f3-e01558a5056b -->
# Refactor incremental sin romper funcionalidad

## Objetivos

- Mantener las rutas y respuestas actuales intactas.
- Extraer endpoints a `backend/routes/*` y lógica a `backend/services/*`.
- Reutilizar `appointment_service.py` y `whatsapp_service.py` existentes.
- Añadir pruebas manuales con Docker tras cada paso.

## Estrategia por fases

### Fase 1: WhatsApp (pequeño y acotado)

1. Crear `backend/routes/whatsapp.py` con un `APIRouter(prefix="/api/whatsapp")`.
2. Mover el endpoint de recordatorio actual desde `main_clean_english.py` a ese router, pero sin cambiar el path (`/api/whatsapp/appointment-reminder/{appointment_id}`) ni el cuerpo.
3. Dejar en `main_clean_english.py` un delgado wrapper temporal que delega al router (o directamente incluir el router en `app.include_router` y retirar el wrapper si no es usado en otros lugares).
4. Probar con Docker: envío con plantilla aprobada y verificar logs.

### Fase 2: Extract helpers de oficina/Maps

1. Crear `backend/services/office_helpers.py` con:

- `build_office_address(office) -> str`
- `resolve_maps_url(office, fallback_address) -> str`
- `resolve_country_code(office) -> str`

2. Reemplazar lógica inline en `main_clean_english.py` y `appointment_service.py` por llamadas a estos helpers.
3. Probar creación/edición de citas y envío manual.

### Fase 3: Scheduler de recordatorios

1. Crear `backend/services/scheduler.py` con el loop de recordatorios (tick de 60s, uso de `AppointmentService` existente).
2. En `main_clean_english.py`, mover la lógica de startup/shutdown para iniciar/parar el scheduler.
3. Probar con una cita de prueba (offset 5 minutos) y verificar `auto_reminder_sent_at`.

### Fase 4: Routers de privacidad y citas

1. Crear `backend/routes/privacy.py` y mover:

- consentimiento aviso de privacidad
- ARCO (get/post)

2. Crear `backend/routes/appointments.py` para endpoints de citas (listar, calendario, CRUD) usando `AppointmentService`.
3. `main_clean_english.py` queda como app factory, middlewares, include_routers.

### Garantías de no ruptura

- No cambiar paths, métodos HTTP ni esquemas de respuesta.
- Mantener imports y dependencias (`Depends(get_current_user)`) idénticos.
- Pruebas Docker tras cada fase:
- `docker-compose up -d --no-deps python-backend`
- `/health`, `/api/appointments`, `/api/whatsapp/appointment-reminder/{id}`
- Rollback simple: los endpoints originales se conservan hasta validar el router (feature toggle de import/inclusion del router si es necesario).

### Consideraciones de WhatsApp

- Mantener los 7 parámetros de `appointment_reminder`.
- Usar `office.virtual_url` para consultorios virtuales en dirección y `maps_url`.
- No enviar plantilla si `status != APPROVED` (error claro 400).

## Entregables

- Nuevos archivos: `routes/whatsapp.py`, `services/office_helpers.py`, `services/scheduler.py`, (luego) `routes/privacy.py`, `routes/appointments.py`.
- `main_clean_english.py` reducido: app, middlewares, include_routers, startup/shutdown.
- Logs estructurados consistentes.

### To-dos

- [ ] Crear helpers en services para formateo dirección/maps/country_code