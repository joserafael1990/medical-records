"""Unit tests del CSD vault y del cliente Facturama (mocked)."""
from __future__ import annotations

import base64
import os
import sys
from unittest.mock import patch, MagicMock

BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

os.environ["MEDICAL_ENCRYPTION_KEY"] = "unit-test-cfdi-key-do-not-use-in-prod"

import pytest  # noqa: E402

from services.cfdi import CsdVault, FacturamaClient, FacturamaError, FacturamaConfigError  # noqa: E402
from services.cfdi.csd_vault import CsdVaultError  # noqa: E402


# ----------------------------------------------------------------------
# CSD Vault
# ----------------------------------------------------------------------


def test_vault_roundtrip_binary():
    vault = CsdVault()
    data = b"\x30\x82\x03\x1a\x30\x82\x02" + os.urandom(512)  # pseudo-DER
    ct = vault.encrypt_binary(data)
    assert isinstance(ct, str) and len(ct) > 64
    b64 = vault.decrypt_to_base64(ct)
    assert base64.b64decode(b64) == data


def test_vault_roundtrip_password():
    vault = CsdVault()
    pwd = "S0perSekret!"
    ct = vault.encrypt_password(pwd)
    assert vault.decrypt_password(ct) == pwd


def test_vault_empty_inputs_raise():
    vault = CsdVault()
    with pytest.raises(CsdVaultError):
        vault.encrypt_binary(b"")
    with pytest.raises(CsdVaultError):
        vault.encrypt_password("")
    with pytest.raises(CsdVaultError):
        vault.decrypt_to_base64("")
    with pytest.raises(CsdVaultError):
        vault.decrypt_password("")


# ----------------------------------------------------------------------
# Facturama client config
# ----------------------------------------------------------------------


def test_client_rejects_invalid_env():
    with pytest.raises(FacturamaConfigError):
        FacturamaClient(api_user="u", api_password="p", env="staging")


def test_client_missing_credentials_raises_on_request():
    client = FacturamaClient(api_user=None, api_password=None, env="sandbox")
    with pytest.raises(FacturamaConfigError):
        client.upload_csd(
            rfc="EKU9003173C9",
            cer_base64="X",
            key_base64="Y",
            password="Z",
        )


def test_client_uses_sandbox_by_default():
    client = FacturamaClient(api_user="u", api_password="p", env="sandbox")
    assert "sandbox" in client.base_url


# ----------------------------------------------------------------------
# Facturama client request (mocked)
# ----------------------------------------------------------------------


def _mock_response(status=200, json_body=None, text=""):
    m = MagicMock()
    m.status_code = status
    m.content = (text or "x").encode()
    m.text = text or "x"
    m.json.return_value = json_body if json_body is not None else {}
    if json_body is None:
        m.json.side_effect = ValueError("no json")
    return m


def test_upload_csd_sends_expected_body():
    client = FacturamaClient(api_user="u", api_password="p", env="sandbox")
    with patch("services.cfdi.facturama_client.requests.request") as rq:
        rq.return_value = _mock_response(200, {"Rfc": "EKU9003173C9"})
        out = client.upload_csd(
            rfc="EKU9003173C9",
            cer_base64="CERBASE64",
            key_base64="KEYBASE64",
            password="12345678a",
        )
    assert out["Rfc"] == "EKU9003173C9"
    kwargs = rq.call_args.kwargs
    assert kwargs["json"]["Rfc"] == "EKU9003173C9"
    assert kwargs["json"]["Certificate"] == "CERBASE64"
    assert kwargs["json"]["PrivateKey"] == "KEYBASE64"
    assert kwargs["json"]["PrivateKeyPassword"] == "12345678a"
    # Confirm path is /api-lite/csds (not /api/lite/csds)
    assert "/api-lite/csds" in rq.call_args.args[1]


def test_issue_cfdi_raises_facturama_error_on_4xx():
    client = FacturamaClient(api_user="u", api_password="p", env="sandbox")
    with patch("services.cfdi.facturama_client.requests.request") as rq:
        rq.return_value = _mock_response(400, {"Message": "RFC inválido"})
        with pytest.raises(FacturamaError) as exc:
            client.issue_cfdi({"foo": "bar"})
    assert exc.value.status_code == 400
    assert "RFC inválido" in str(exc.value)


def test_build_cfdi_payload_shape():
    payload = FacturamaClient.build_cfdi_payload(
        issuer_rfc="XAXX010101000",
        issuer_name="Dr Test",
        issuer_tax_regime="612",
        issuer_postal_code="06000",
        receptor_rfc="XEXX010101000",
        receptor_name="Juan Pérez",
        receptor_postal_code="64000",
        receptor_tax_regime="616",
        cfdi_use="D01",
        payment_form="03",
        payment_method="PUE",
        currency="MXN",
        serie="CORTEX",
        folio="42",
        sat_product_code="85121501",
        sat_unit_code="E48",
        service_description="Consulta médica general",
        subtotal=800.0,
        total=800.0,
    )
    assert payload["CfdiType"] == "I"
    assert payload["Issuer"]["Rfc"] == "XAXX010101000"
    assert payload["Receiver"]["CfdiUse"] == "D01"
    assert payload["Items"][0]["ProductCode"] == "85121501"
    assert payload["Total"] == 800.0


def test_cancel_cfdi_includes_motive_and_substitute_when_given():
    client = FacturamaClient(api_user="u", api_password="p", env="sandbox")
    with patch("services.cfdi.facturama_client.requests.request") as rq:
        rq.return_value = _mock_response(200, {"Status": "canceled"})
        client.cancel_cfdi("abc", motive="01", substitute_uuid="UUID-REPL")
    kwargs = rq.call_args.kwargs
    assert kwargs["params"]["motive"] == "01"
    assert kwargs["params"]["uuidReplacement"] == "UUID-REPL"
