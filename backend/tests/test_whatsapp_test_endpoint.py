from typing import Optional
from fastapi.testclient import TestClient
import types

# Importar la app principal y el factory del servicio
from main_clean_english import app
import whatsapp_service as ws_module


def test_whatsapp_test_endpoint_success(monkeypatch):
    # Mock de autenticación: devolver un objeto usuario dummy
    def fake_get_current_user():
        return types.SimpleNamespace(id=1, first_name="Test", person_type="doctor")

    # Buscar la dependencia correcta definida en la app
    # get_current_user se usa por dependencia en el endpoint de prueba
    # Intentamos importarla desde el módulo principal
    from main_clean_english import get_current_user as original_dep
    app.dependency_overrides[original_dep] = lambda: fake_get_current_user()

    # Mock del servicio de WhatsApp para no llamar proveedores reales
    class FakeService:
        def send_text_message(self, to_phone: str, message: str, country_code: Optional[str] = None):
            assert to_phone
            assert isinstance(message, str) and len(message) > 0
            return {"success": True, "message_sid": "SMxxxxxxxx"}

    monkeypatch.setattr(ws_module, "get_whatsapp_service", lambda: FakeService())

    client = TestClient(app)
    resp = client.post(
        "/api/whatsapp/test",
        params={"phone": "+5215555555555"},
        headers={"Authorization": "Bearer dummy"},
    )

    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["message"] == "Test message sent successfully"
    assert data["message_id"] == "SMxxxxxxxx"


def test_whatsapp_test_endpoint_failure(monkeypatch):
    # Mock auth
    def fake_get_current_user():
        return types.SimpleNamespace(id=1, first_name="Test", person_type="doctor")

    from main_clean_english import get_current_user as original_dep
    app.dependency_overrides[original_dep] = lambda: fake_get_current_user()

    # Fake service que falla
    class FakeServiceFail:
        def send_text_message(self, to_phone: str, message: str, country_code: Optional[str] = None):
            return {"success": False, "error": "provider error"}

    monkeypatch.setattr(ws_module, "get_whatsapp_service", lambda: FakeServiceFail())

    client = TestClient(app)
    resp = client.post(
        "/api/whatsapp/test",
        params={"phone": "+5215555000000"},
        headers={"Authorization": "Bearer dummy"},
    )

    # En este endpoint, en caso de fallo devolvemos JSON con message y error (200 OK)
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["message"] == "Failed to send test message"
    assert data["error"] == "provider error"


