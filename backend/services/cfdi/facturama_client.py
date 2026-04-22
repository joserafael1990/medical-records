"""Facturama multi-emisor HTTP client.

Wrapper delgado sobre la API Multi-emisor de Facturama. En esta API:
  - NO hay endpoint para "crear emisor". El emisor se identifica por su RFC.
  - Cada emisor se registra subiendo su CSD via POST /api/lite/csds.
  - Al emitir CFDI, se especifica el RFC del emisor en Issuer.Rfc — Facturama
    busca el CSD matching y sella con ese.

Endpoints reales (confirmados con soporte Facturama 2026-04-22):
  - POST   /api-lite/csds         → registrar CSD (= alta de emisor por RFC)
  - GET    /api-lite/csds         → listar CSDs/emisores cargados
  - GET    /api-lite/csds/{rfc}   → obtener CSD por RFC
  - PUT    /api-lite/csds/{rfc}   → actualizar CSD
  - DELETE /api-lite/csds/{rfc}   → eliminar CSD / baja de emisor
  - POST   /api-lite/4/cfdis      → emitir CFDI 4.0 (v3 también disponible en /3/cfdis)
  - GET    /api-lite/Cfdis/{id}   → detalle CFDI
  - DELETE /api-lite/Cfdis/{id}?motive=X&uuidReplacement=Y → cancelar
  - GET    /Cfdi/{format}/{type}/{id}  → descargar PDF/XML base64
    ({format}=pdf|xml, {type}=issued)

Nota: /api-lite/2/cfdis está DESCONTINUADO. Usar /api-lite/4/cfdis (CFDI 4.0).

Auth: HTTP Basic con FACTURAMA_API_USER / FACTURAMA_API_PASSWORD.
Env sandbox/production se selecciona vía FACTURAMA_ENV.
"""
from __future__ import annotations

import os
from typing import Any

import requests
from requests.auth import HTTPBasicAuth

from logger import get_logger

logger = get_logger("cortex.facturama")

# ----------------------------------------------------------------------
# Endpoints (ajustar si tu plan expone paths diferentes)
# ----------------------------------------------------------------------
_BASE_URLS = {
    "sandbox": "https://apisandbox.facturama.mx",
    "production": "https://api.facturama.mx",
}
# Multi-emisor (api-lite) — paths reales confirmados con soporte Facturama
_PATH_CSD_COLLECTION = "/api-lite/csds"               # POST crear, GET listar
_PATH_CSD_BY_RFC = "/api-lite/csds/{rfc}"             # GET/PUT/DELETE por RFC
_PATH_CFDI = "/api-lite/4/cfdis"                      # POST emitir CFDI 4.0
_PATH_CFDI_BY_ID = "/api-lite-cfdis/{cfdi_id}"            # GET detalle (con guión)
_PATH_CFDI_CANCEL = "/api-lite/Cfdis/{cfdi_id}"           # DELETE con query params
_PATH_CFDI_DOWNLOAD = "/Cfdi/{fmt}/issuedLite/{cfdi_id}"  # GET PDF/XML base64


class FacturamaError(RuntimeError):
    """Error de negocio devuelto por Facturama (HTTP 4xx/5xx)."""

    def __init__(self, message: str, status_code: int | None = None, payload: Any = None) -> None:
        super().__init__(message)
        self.status_code = status_code
        self.payload = payload


class FacturamaConfigError(RuntimeError):
    """Faltan credenciales o configuración."""


class FacturamaClient:
    """Cliente HTTP sincrónico para Facturama.

    Se instancia por request (lee env vars en __init__); si necesitas overrides
    (tests), pasa kwargs explícitos.
    """

    def __init__(
        self,
        api_user: str | None = None,
        api_password: str | None = None,
        env: str | None = None,
        base_url: str | None = None,
        timeout: float = 30.0,
    ) -> None:
        self.api_user = api_user or os.getenv("FACTURAMA_API_USER")
        self.api_password = api_password or os.getenv("FACTURAMA_API_PASSWORD")
        env = (env or os.getenv("FACTURAMA_ENV") or "sandbox").lower()
        if env not in _BASE_URLS:
            raise FacturamaConfigError(
                f"FACTURAMA_ENV must be 'sandbox' or 'production', got {env!r}"
            )
        self.base_url = base_url or _BASE_URLS[env]
        self.timeout = timeout

        if not self.api_user or not self.api_password:
            # No raise en __init__ — permitimos importar el módulo aún sin env.
            # El check duro ocurre en _request.
            logger.warning("Facturama credentials not configured (FACTURAMA_API_USER/PASSWORD)")

    # ------------------------------------------------------------------
    # CSDs (registro de emisor — el RFC ES la identidad del emisor)
    # ------------------------------------------------------------------

    def upload_csd(
        self,
        *,
        rfc: str,
        cer_base64: str,
        key_base64: str,
        password: str,
    ) -> dict:
        """Registra el CSD de un RFC. Equivale a 'crear emisor' en esta API:
        después de esto, puedes emitir CFDIs con Issuer.Rfc=rfc.
        """
        body = {
            "Rfc": rfc,
            "Certificate": cer_base64,
            "PrivateKey": key_base64,
            "PrivateKeyPassword": password,
        }
        return self._request("POST", _PATH_CSD_COLLECTION, json=body)

    def list_csds(self) -> list:
        """Lista todos los CSDs (emisores) registrados en la cuenta."""
        resp = self._request("GET", _PATH_CSD_COLLECTION)
        return resp.get("data", resp) if isinstance(resp, dict) else resp

    def get_csd_by_rfc(self, rfc: str) -> dict:
        return self._request("GET", _PATH_CSD_BY_RFC.format(rfc=rfc))

    def update_csd(
        self,
        *,
        rfc: str,
        cer_base64: str,
        key_base64: str,
        password: str,
    ) -> dict:
        body = {
            "Rfc": rfc,
            "Certificate": cer_base64,
            "PrivateKey": key_base64,
            "PrivateKeyPassword": password,
        }
        return self._request("PUT", _PATH_CSD_BY_RFC.format(rfc=rfc), json=body)

    def delete_csd(self, rfc: str) -> None:
        self._request("DELETE", _PATH_CSD_BY_RFC.format(rfc=rfc))

    # ------------------------------------------------------------------
    # CFDI
    # ------------------------------------------------------------------

    def issue_cfdi(self, payload: dict) -> dict:
        """Emite CFDI 4.0. El caller arma el payload completo (ver build_cfdi_payload).
        Facturama busca el CSD registrado con el RFC en Issuer.Rfc y sella con él.
        """
        return self._request("POST", _PATH_CFDI, json=payload)

    def get_cfdi(self, cfdi_id: str) -> dict:
        return self._request("GET", _PATH_CFDI_BY_ID.format(cfdi_id=cfdi_id))

    def get_cfdi_pdf_base64(self, cfdi_id: str) -> str:
        path = _PATH_CFDI_DOWNLOAD.format(fmt="pdf", cfdi_id=cfdi_id)
        resp = self._request("GET", path)
        return resp.get("Content") or resp.get("ContentEncoded") or ""

    def get_cfdi_xml_base64(self, cfdi_id: str) -> str:
        path = _PATH_CFDI_DOWNLOAD.format(fmt="xml", cfdi_id=cfdi_id)
        resp = self._request("GET", path)
        return resp.get("Content") or resp.get("ContentEncoded") or ""

    def cancel_cfdi(
        self,
        cfdi_id: str,
        *,
        motive: str,
        substitute_uuid: str | None = None,
    ) -> dict:
        """Cancela CFDI. motive: '01' (comprobante con errores con relación),
        '02' (sin relación), '03' (no se llevó a cabo), '04' (operación nominativa
        relacionada en una factura global). '01' exige substitute_uuid.
        """
        params: dict[str, str] = {"motive": motive}
        if substitute_uuid:
            params["uuidReplacement"] = substitute_uuid
        path = _PATH_CFDI_CANCEL.format(cfdi_id=cfdi_id)
        return self._request("DELETE", path, params=params)

    # ------------------------------------------------------------------
    # Helper de construcción de payload CFDI
    # ------------------------------------------------------------------

    @staticmethod
    def build_cfdi_payload(
        *,
        issuer_rfc: str,
        issuer_name: str,
        issuer_tax_regime: str,
        issuer_postal_code: str,
        receptor_rfc: str,
        receptor_name: str,
        receptor_postal_code: str,
        receptor_tax_regime: str,
        cfdi_use: str,
        payment_form: str,
        payment_method: str,
        currency: str,
        serie: str,
        folio: str,
        sat_product_code: str,
        sat_unit_code: str,
        service_description: str,
        subtotal: float,
        total: float,
    ) -> dict:
        """Arma el JSON que espera `POST /3/cfdis`. No sella — eso lo hace Facturama."""
        return {
            "NameId": "1",  # 1 = Factura (vs 2 = nota de crédito)
            "CfdiType": "I",  # I = Ingreso
            "Serie": serie,
            "Folio": folio,
            "PaymentForm": payment_form,
            "PaymentMethod": payment_method,
            "Currency": currency,
            "ExpeditionPlace": issuer_postal_code,
            "Issuer": {
                "Rfc": issuer_rfc,
                "Name": issuer_name,
                "FiscalRegime": issuer_tax_regime,
            },
            "Receiver": {
                "Rfc": receptor_rfc,
                "Name": receptor_name,
                "CfdiUse": cfdi_use,
                "FiscalRegime": receptor_tax_regime,
                "TaxZipCode": receptor_postal_code,
            },
            "Items": [
                {
                    "ProductCode": sat_product_code,
                    "Description": service_description,
                    "UnitCode": sat_unit_code,
                    "Quantity": 1,
                    "UnitPrice": round(float(subtotal), 2),
                    "Subtotal": round(float(subtotal), 2),
                    "Total": round(float(total), 2),
                    # CFDI 4.0 requiere TaxObject (c_ObjetoImp).
                    # Honorarios médicos de PF son no objeto de IVA → "01".
                    "TaxObject": "01",
                }
            ],
            "Subtotal": round(float(subtotal), 2),
            "Total": round(float(total), 2),
        }

    # ------------------------------------------------------------------
    # Internals
    # ------------------------------------------------------------------

    def _request(
        self,
        method: str,
        path: str,
        *,
        json: Any = None,
        params: dict | None = None,
    ) -> dict:
        if not self.api_user or not self.api_password:
            raise FacturamaConfigError(
                "Facturama credentials missing (set FACTURAMA_API_USER / FACTURAMA_API_PASSWORD)"
            )
        url = f"{self.base_url}{path}"
        auth = HTTPBasicAuth(self.api_user, self.api_password)
        try:
            resp = requests.request(
                method,
                url,
                json=json,
                params=params,
                auth=auth,
                timeout=self.timeout,
                headers={
                    "Accept": "application/json",
                    # Facturama multi-emisor exige User-Agent == nombre de usuario.
                    # Sin este header, los endpoints /api-lite/csds y /api-lite/Cfdis
                    # devuelven 401 incluso con Basic Auth válido.
                    "User-Agent": self.api_user,
                },
            )
        except requests.RequestException as e:
            logger.error(f"Facturama request failed: {method} {path}: {e}")
            raise FacturamaError(f"Network error calling Facturama: {e}") from e

        if resp.status_code in (204,) or not resp.content:
            return {}

        try:
            data = resp.json()
        except ValueError:
            data = {"raw": resp.text}

        if resp.status_code >= 400:
            # Facturama retorna {"Message": "...", "ModelState": {...}}
            msg = (
                (data.get("Message") if isinstance(data, dict) else None)
                or resp.text
                or f"HTTP {resp.status_code}"
            )
            logger.warning(
                "Facturama API error",
                extra={"status": resp.status_code, "path": path, "message": msg},
            )
            raise FacturamaError(msg, status_code=resp.status_code, payload=data)

        return data if isinstance(data, dict) else {"data": data}
