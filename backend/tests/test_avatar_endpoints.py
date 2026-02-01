from fastapi.testclient import TestClient
import types

from main_clean_english import app
from routes import avatars as avatar_module
from dependencies import get_current_user
from database import get_db


def _override_get_current_user():
    return types.SimpleNamespace(
        id=1,
        person_type="doctor",
        name="Test Doctor"
    )


def test_get_avatar_options_success(monkeypatch):
    app.dependency_overrides[get_current_user] = _override_get_current_user
    app.dependency_overrides[get_db] = lambda: None

    monkeypatch.setattr(avatar_module.avatar_service, "list_preloaded_avatars", lambda: [
        {"type": "preloaded", "key": "sample", "template_key": "sample", "filename": "sample.png", "url": "/static/sample.png"}
    ])
    monkeypatch.setattr(avatar_module.avatar_service, "list_custom_avatars", lambda doctor_id: [])
    monkeypatch.setattr(avatar_module.avatar_service, "get_current_avatar_payload", lambda doctor: {
        "avatar_type": "initials",
        "avatar_template_key": None,
        "avatar_file_path": None,
        "avatar_url": None
    })

    client = TestClient(app)
    response = client.get("/api/avatars/options")

    assert response.status_code == 200, response.text
    payload = response.json()
    assert "preloaded" in payload
    assert payload["preloaded"][0]["template_key"] == "sample"
    assert payload["current"]["avatar_type"] == "initials"

    app.dependency_overrides = {}


def test_select_avatar_invalid_mode(monkeypatch):
    app.dependency_overrides[get_current_user] = _override_get_current_user
    app.dependency_overrides[get_db] = lambda: None

    client = TestClient(app)
    response = client.post("/api/avatars/select", json={"mode": "unsupported"})

    assert response.status_code == 400
    assert "Modo de avatar inválido" in response.json()["detail"]

    app.dependency_overrides = {}

