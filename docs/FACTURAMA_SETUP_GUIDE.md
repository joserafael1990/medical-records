# Facturama Setup Guide — CFDI 4.0 Invoicing

This guide covers everything needed to put CORTEX's CFDI 4.0 invoicing feature
into operation: Facturama account onboarding, environment variables, local
testing, and the per-doctor CSD enrollment flow.

## 1. Provider choice and model

- **Provider:** [Facturama](https://facturama.mx) (Multi-emisor / Partners API).
- **Why multi-emisor:** each doctor in CORTEX emits CFDIs under their own RFC.
  Facturama's multi-emisor model lets us treat every doctor as a "Customer" of
  our Facturama account and sign CFDIs with their individual CSDs (uploaded by
  the doctor through the app, stored encrypted at rest).
- **Fallback / public-in-general:** if a patient has no RFC captured, CORTEX
  emits to `XAXX010101000` with Tax Regime `616` and CFDI Use `S01`, using the
  issuer's postal code as expedition place. This matches SAT rules for a
  "factura a público en general".

## 2. Create the Facturama account

1. Sign up at [https://facturama.mx](https://facturama.mx).
2. Choose the **Multi-emisor / Partners** plan (a.k.a. "Facturama API"). If the
   tenant only shows single-emisor, ask support to enable multi-issuer.
3. In the Facturama dashboard, create **API credentials** (username + password).
   These are the HTTP Basic credentials we send on every request.
4. Keep the **sandbox** environment active while testing — production timbres
   cost money; sandbox ones are free.

## 3. Environment variables

Add to the backend's `.env` (or the corresponding Secret Manager entry in
Cloud Run for production):

```bash
# HTTP Basic credentials from Facturama dashboard
FACTURAMA_API_USER=your_facturama_api_user
FACTURAMA_API_PASSWORD=your_facturama_api_password

# Sandbox vs production. Default is sandbox; switch to "production" only when
# you're ready to emit timbres that cost real money.
FACTURAMA_ENV=sandbox

# Already required elsewhere — reused to encrypt CSDs at rest
MEDICAL_ENCRYPTION_KEY=your_master_key_32_bytes_min
```

The client picks the base URL automatically from `FACTURAMA_ENV`:
- `sandbox`    → `https://apisandbox.facturama.mx`
- `production` → `https://api.facturama.mx`

## 4. Run the migration

The CFDI tables and new fiscal columns are added by
`backend/migrations_alembic/versions/a2b3c4d5e6f7_add_cfdi_invoicing.py`.
Apply through the wrapper:

```bash
docker compose -f docker-compose.dev.yml exec python-backend \
  python /app/scripts/alembic_wrapper.py upgrade head
```

What it creates:
- `cfdi_issuers`   — one row per doctor. Stores the encrypted CSDs, the
  Facturama customer ID, the invoice series, and the folio counter.
- `cfdi_invoices`  — one row per CFDI emitted. Keeps a snapshot of the receptor
  data, the UUID SAT, status, and cancellation metadata.
- `persons.tax_regime`       — fiscal regime (SAT code, 3 chars)
- `persons.cfdi_default_use` — preferred CFDI use for a receptor (3 chars)

All schema changes are idempotent (`IF NOT EXISTS`).

## 5. Per-doctor onboarding (from the UI)

Each doctor configures their own fiscal profile from
**Perfil → Facturación CFDI 4.0**:

1. Fill fiscal profile: RFC, Razón social, Régimen fiscal, C.P., Serie.
   Click **Guardar perfil** → row created in `cfdi_issuers` with
   `is_active=false`.
2. Upload the SAT CSDs: `.cer`, `.key`, and the password used when the SAT
   generated them (this is **not** the e.firma password). Click
   **Registrar CSD**. The backend:
   - Encrypts all three with AES-256-GCM using `MEDICAL_ENCRYPTION_KEY`.
   - Creates a Facturama customer via `POST /Customer` (if not created).
   - Associates the CSDs via `POST /Customer/{id}/Csd`.
   - Flips `is_active=true`.
3. Once active, the doctor sees the "Listo para facturar" chip and can emit
   invoices from any consultation detail view (botón **Facturar**).

## 6. Receptor resolution rules

Implemented in `backend/services/cfdi/cfdi_service.py::resolve_receptor`:

1. If the request overrides a field, that wins.
2. Else, if `patient_id` is given and the patient has the field, use that.
3. Else, fall back to defaults (público-en-general values for tax regime and
   cfdi_use; issuer postal code as expedition place).

If there's no real RFC at all, the entire receptor collapses to:
- RFC `XAXX010101000`
- Razón social `PUBLICO EN GENERAL`
- Régimen `616`
- Uso CFDI `S01`
- C.P. = issuer's postal code

## 7. Default SAT codes

- **Product code:** `85121501` (Medicina general) — override per invoice if
  you emit for sub-specialties (e.g. `85121502` Pediatría, `85121800` Servicios
  hospitalarios).
- **Unit:** `E48` (Unidad de servicio).
- **Forma de pago default:** `03` (Transferencia electrónica).
- **Método de pago default:** `PUE` (Pago en una sola exhibición).
- **Uso CFDI default (paciente con RFC):** `D01` (Honorarios médicos, dentales
  y gastos hospitalarios) — permits tax deduction for the patient.

## 8. Cancellation

CFDI 4.0 cancellation requires a motive code (01–04). Motive `01` (substitution)
also requires the UUID of the replacing CFDI. The API enforces both rules:

```bash
POST /api/cfdi/invoices/{id}/cancel
{ "motive": "02" }

POST /api/cfdi/invoices/{id}/cancel
{ "motive": "01", "substitute_uuid": "…UUID of replacement CFDI…" }
```

## 9. Audit trail

Every CFDI-related mutation writes to `audit_log` via `audit_service.log_action`
with `operation_type` in: `cfdi_issuer_create`, `cfdi_issuer_update`,
`cfdi_csd_upload`, `cfdi_csd_delete`, `cfdi_invoice_emit`,
`cfdi_invoice_cancel`. The CSD upload / delete are flagged
`security_level=WARNING` because they change the doctor's signing capability.

## 10. Testing locally without Facturama

`services/cfdi/facturama_client.py` reads credentials from env vars. Integration
tests should mock `requests.request` rather than hit the real API. Current unit
coverage lives in:
- `backend/tests/test_cfdi_vault_and_client.py` (CSD vault + mocked HTTP)
- `backend/tests/test_cfdi_service.py` (receptor resolution logic)

Run them inside the container:

```bash
docker compose -f docker-compose.dev.yml exec python-backend \
  python -m pytest tests/test_cfdi_vault_and_client.py tests/test_cfdi_service.py -v
```

## 11. Endpoint verification (confirmed Facturama paths)

Paths reales confirmados con soporte Facturama (2026-04-22):

```
# Multi-emisor (api-lite sin slash entre "api" y "lite")
POST   /api-lite/csds              → subir CSD (= alta emisor por RFC)
GET    /api-lite/csds              → listar
GET    /api-lite/csds/{rfc}        → detalle por RFC
PUT    /api-lite/csds/{rfc}        → actualizar
DELETE /api-lite/csds/{rfc}        → baja

POST   /api-lite/4/cfdis           → emitir CFDI 4.0
POST   /api-lite/3/cfdis           → emitir CFDI 3.3 (legacy)
GET    /api-lite/Cfdis/{id}        → detalle (nótese C mayúscula)
DELETE /api-lite/Cfdis/{id}?motive=X&uuidReplacement=Y

GET    /Cfdi/{format}/issued/{id}  → descargar PDF/XML base64 ({format}=pdf|xml)
```

**Deprecado:** `/api-lite/2/cfdis` está descontinuado. No usar.

## 12. Activación de multi-emisor en tu cuenta

Confirmar con Facturama ANTES de habilitar la feature en producción:

```bash
# Smoke test rápido desde shell local (no en container)
curl -u 'YOUR_USER:YOUR_PASS' https://apisandbox.facturama.mx/api-lite/csds
```

Resultados posibles:
- **`HTTP 200 []`** → ✅ multi-emisor activo, procede con `upload_csd` real.
- **`HTTP 401`** → scope multi-emisor NO activado. Escalar con soporte Facturama
  (`soporte@facturama.mx` o chat del dashboard) solicitando activación del plan
  Partners/Multi-emisor. Mensaje sugerido:
  > "Los endpoints `/api-lite/csds` y `/api-lite/4/cfdis` devuelven **401** en
  > mi cuenta. Según su documentación estos son los paths correctos para
  > multi-emisor. Mi caso de uso es un SaaS médico (CORTEX EMR) donde cada
  > doctor factura bajo su propio RFC. ¿Pueden activar el plan Partners /
  > multi-emisor en mi cuenta? ¿Costo?"
- **`HTTP 404`** → URL mal escrita (revisar guión/slash).

## 12. Production cutover checklist

- [ ] Facturama plan has multi-emisor enabled in production.
- [ ] `FACTURAMA_ENV=production` and credentials set in Cloud Run env.
- [ ] `MEDICAL_ENCRYPTION_KEY` identical to the one used for existing PHI.
- [ ] Alembic migration applied (`cfdi_issuers`, `cfdi_invoices` exist in prod).
- [ ] Smoke test against production with a real doctor issuer + real CSDs.
- [ ] Privacy notice in the app mentions fiscal data processing (LFPDPPP).
- [ ] Retention policy: `cfdi_invoices` must live ≥ 5 years (Art. 30 CFF +
      NOM-004 alignment). Align with existing `data_retention_service`.
