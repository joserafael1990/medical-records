"""Smoke test END-TO-END de FacturamaClient contra sandbox real.

Flujo:
  1) list_csds()  — verifica auth y conectividad
  2) upload_csd() — sube CSD del RFC de prueba JUFA7608212V6
  3) issue_cfdi() — emite un CFDI 4.0 de honorarios médicos
  4) get_cfdi_pdf_base64() / get_cfdi_xml_base64() — descarga
  5) cancel_cfdi() — cancela con motivo "02"

Uso (dentro del container):
    FACTURAMA_API_USER=... FACTURAMA_API_PASSWORD=... \\
        python /app/scripts/smoke_facturama_client.py
"""
from __future__ import annotations

import base64
import os
import sys

sys.path.insert(0, "/app")

from services.cfdi import FacturamaClient, FacturamaError, FacturamaConfigError

# CSDs de prueba — RFC Persona Física (honorarios médicos)
TEST_RFC = "FUNK671228PH6"
TEST_NAME = "KARLA FUENTE NOLASCO"
TEST_TAX_REGIME = "612"  # PF con actividad empresarial y profesional
TEST_POSTAL_CODE = "42501"
CSD_PASSWORD = "12345678a"

BASE_CSD = (
    "/app/fixtures/test_csds/csd-pruebas/Personas Físicas/"
    "FUNK671228PH6_20230509114807/CSD_FUNK671228PH6_20230509130458"
)
CER_PATH = f"{BASE_CSD}/CSD_Sucursal_1_FUNK671228PH6_20230509_130451.cer"
KEY_PATH = f"{BASE_CSD}/CSD_Sucursal_1_FUNK671228PH6_20230509_130451.key"


def step(n: int, title: str) -> None:
    print(f"\n{'='*60}\n[{n}] {title}\n{'='*60}")


def main() -> None:
    if not os.environ.get("FACTURAMA_API_USER") or not os.environ.get("FACTURAMA_API_PASSWORD"):
        print("❌ FACTURAMA_API_USER / FACTURAMA_API_PASSWORD requeridos")
        sys.exit(1)

    client = FacturamaClient()

    # ---------- 1. list_csds ----------
    step(1, "list_csds()")
    csds = client.list_csds()
    print(f"CSDs actuales: {csds}")

    # ---------- 2. upload_csd ----------
    step(2, f"upload_csd() para RFC {TEST_RFC}")
    cer_bytes = open(CER_PATH, "rb").read()
    key_bytes = open(KEY_PATH, "rb").read()
    cer_b64 = base64.b64encode(cer_bytes).decode()
    key_b64 = base64.b64encode(key_bytes).decode()
    print(f"  .cer: {len(cer_bytes)} bytes, .key: {len(key_bytes)} bytes")
    try:
        res = client.upload_csd(
            rfc=TEST_RFC, cer_base64=cer_b64, key_base64=key_b64, password=CSD_PASSWORD
        )
        print(f"  ✅ POST OK: {str(res)[:200]}")
    except FacturamaError as e:
        if e.status_code in (400, 409):
            print(f"  ⚠️  {e.status_code} — ya existe; actualizando via PUT")
            res = client.update_csd(
                rfc=TEST_RFC, cer_base64=cer_b64, key_base64=key_b64, password=CSD_PASSWORD
            )
            print(f"  ✅ PUT OK: {str(res)[:200]}")
        else:
            print(f"  ❌ FAIL: status={e.status_code} {e}")
            raise

    # ---------- 3. issue_cfdi ----------
    step(3, "issue_cfdi() — CFDI 4.0 honorarios médicos")
    # Fecha CFDI en timezone México (evitamos 305 por timezone mismatch)
    from datetime import datetime
    import pytz
    now_mx = datetime.now(pytz.timezone("America/Mexico_City")).strftime("%Y-%m-%dT%H:%M:%S")
    print(f"Fecha CFDI (CDMX local): {now_mx}")

    # Receptor con RFC real (evitamos GlobalInformation requerido por XAXX en CFDI 4.0).
    # Para el smoke usamos otro RFC de prueba del SAT.
    payload = FacturamaClient.build_cfdi_payload(
        issuer_rfc=TEST_RFC,
        issuer_name=TEST_NAME,
        issuer_tax_regime=TEST_TAX_REGIME,
        issuer_postal_code=TEST_POSTAL_CODE,
        receptor_rfc="EKU9003173C9",
        receptor_name="ESCUELA KEMPER URGATE",
        receptor_postal_code="42501",
        receptor_tax_regime="601",
        cfdi_use="G03",
        payment_form="03",
        payment_method="PUE",
        currency="MXN",
        serie="CORTEX",
        folio="1",
        sat_product_code="85121501",  # Medicina general
        sat_unit_code="E48",
        service_description="Consulta médica de prueba CORTEX",
        subtotal=800.0,
        total=800.0,
    )
    payload["Date"] = now_mx
    print(f"Issuer: {payload['Issuer']}")
    print(f"Date:   {payload['Date']}")
    try:
        invoice = client.issue_cfdi(payload)
        print(f"  ✅ Emitido. Id={invoice.get('Id')}  UUID={_extract_uuid(invoice)}")
        # Imprimimos top-level keys para entender estructura
        print(f"  Top-level keys: {list(invoice.keys())[:20]}")
        import json
        compact = {k: (v if not isinstance(v, (dict, list)) else f"<{type(v).__name__}>") for k, v in invoice.items()}
        print(f"  Shape: {json.dumps(compact, default=str)[:500]}")
    except FacturamaError as e:
        print(f"  ❌ FAIL: status={e.status_code}")
        print(f"  Response: {str(e.payload)[:600]}")
        raise

    invoice_id = invoice.get("Id") or invoice.get("id")
    if not invoice_id:
        print("❌ Sin Id en respuesta, no puedo seguir con download/cancel")
        sys.exit(2)

    # ---------- 4. descargar PDF + XML ----------
    step(4, f"descargar PDF/XML del CFDI {invoice_id}")
    try:
        pdf = client.get_cfdi_pdf_base64(invoice_id)
        xml = client.get_cfdi_xml_base64(invoice_id)
        print(f"  ✅ PDF b64: {len(pdf)} chars, XML b64: {len(xml)} chars")
    except FacturamaError as e:
        print(f"  ⚠️  download fallido: status={e.status_code} {e}")

    # ---------- 5. cancelar ----------
    step(5, f"cancel_cfdi({invoice_id}, motive='02')")
    try:
        res = client.cancel_cfdi(invoice_id, motive="02")
        print(f"  ✅ Cancelación: {str(res)[:200]}")
    except FacturamaError as e:
        print(f"  ⚠️  cancel: status={e.status_code} {e}")

    print("\n🎉 Smoke test END-TO-END completado")


def _extract_uuid(invoice: dict) -> str:
    # Facturama retorna el UUID en varios lugares según versión
    comp = invoice.get("Complement") or {}
    if isinstance(comp, dict):
        tfd = comp.get("TaxStamp") or comp.get("TFD") or {}
        if isinstance(tfd, dict):
            u = tfd.get("Uuid") or tfd.get("UUID")
            if u:
                return u
    return invoice.get("Uuid") or invoice.get("UUID") or "?"


if __name__ == "__main__":
    main()
