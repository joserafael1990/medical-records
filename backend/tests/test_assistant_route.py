"""
Route-level tests for POST /api/assistant/chat.

We stub the agent so these stay hermetic — the agent itself is covered
by test_doctor_assistant_agent.py.
"""

from __future__ import annotations

from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi.testclient import TestClient

from main_clean_english import app
from database import get_db
from dependencies import get_current_user
from routes import assistant as assistant_route


def _doctor():
    return SimpleNamespace(id=1, person_type="doctor", name="Dr T", email="d@t.mx")


def _patient_user():
    return SimpleNamespace(id=2, person_type="patient", name="Pt", email="p@t.mx")


def _override(user):
    app.dependency_overrides[get_current_user] = lambda: user
    app.dependency_overrides[get_db] = lambda: MagicMock()


def _clear():
    app.dependency_overrides.clear()


@pytest.fixture
def client():
    return TestClient(app)


def test_chat_requires_doctor_or_admin(client):
    _override(_patient_user())
    try:
        r = client.post(
            "/api/assistant/chat",
            json={"message": "hola"},
        )
    finally:
        _clear()
    assert r.status_code == 403


def test_chat_validates_input(client):
    _override(_doctor())
    try:
        r = client.post("/api/assistant/chat", json={"message": ""})
    finally:
        _clear()
    assert r.status_code == 422  # empty message rejected by validator


def test_chat_returns_agent_reply(client, monkeypatch):
    _override(_doctor())

    fake_reply = {
        "reply": "Encontré 1 paciente.",
        "conversation_id": "abc-123",
        "tool_calls": [{"name": "search_patients", "args": {"query": "Juan"}}],
        "sandbox": True,
    }

    class _FakeAgent:
        def __init__(self, **kwargs):
            self.kwargs = kwargs

        async def chat(self, **kwargs):
            return fake_reply

    monkeypatch.setattr(assistant_route, "DoctorAssistant", _FakeAgent)

    try:
        r = client.post(
            "/api/assistant/chat",
            json={"message": "busca a Juan", "current_patient_id": 10},
        )
    finally:
        _clear()

    assert r.status_code == 200, r.text
    body = r.json()
    assert body["reply"] == "Encontré 1 paciente."
    assert body["conversation_id"] == "abc-123"
    assert body["tool_calls"][0]["name"] == "search_patients"
    assert body["sandbox"] is True


def test_chat_503_when_agent_runtime_error(client, monkeypatch):
    _override(_doctor())

    class _ExplodingAgent:
        def __init__(self, **kwargs):
            raise RuntimeError("GCP_PROJECT_ID missing")

    monkeypatch.setattr(assistant_route, "DoctorAssistant", _ExplodingAgent)

    try:
        r = client.post("/api/assistant/chat", json={"message": "hola"})
    finally:
        _clear()
    assert r.status_code == 503


# ---------------------------------------------------------------------------
# GET /api/assistant/conversations
# ---------------------------------------------------------------------------


def test_list_conversations_requires_doctor(client):
    _override(_patient_user())
    try:
        r = client.get("/api/assistant/conversations")
    finally:
        _clear()
    assert r.status_code == 403


def test_list_conversations_returns_summaries(client, monkeypatch):
    _override(_doctor())

    summaries = [
        {
            "conversation_id": "10",
            "title": "Resumen de Juan",
            "current_patient_id": 42,
            "created_at": "2026-04-20T10:00:00",
            "last_activity": "2026-04-20T10:05:00",
        },
        {
            "conversation_id": "9",
            "title": "¿qué tengo hoy?",
            "current_patient_id": None,
            "created_at": "2026-04-19T09:00:00",
            "last_activity": "2026-04-19T09:02:00",
        },
    ]
    monkeypatch.setattr(
        assistant_route.session_state,
        "list_recent",
        lambda db, doctor_id, limit=20: summaries,
    )

    try:
        r = client.get("/api/assistant/conversations")
    finally:
        _clear()
    assert r.status_code == 200
    body = r.json()
    assert len(body["conversations"]) == 2
    assert body["conversations"][0]["conversation_id"] == "10"


# ---------------------------------------------------------------------------
# GET /api/assistant/conversations/{id}
# ---------------------------------------------------------------------------


def test_get_conversation_404_when_not_owned(client, monkeypatch):
    _override(_doctor())
    monkeypatch.setattr(
        assistant_route.session_state,
        "get_full",
        lambda db, doctor_id, conversation_id: None,
    )
    try:
        r = client.get("/api/assistant/conversations/999")
    finally:
        _clear()
    assert r.status_code == 404


def test_get_conversation_returns_messages(client, monkeypatch):
    _override(_doctor())

    payload = {
        "conversation_id": "7",
        "title": "Consulta de Juan",
        "current_patient_id": 42,
        "created_at": "2026-04-20T10:00:00",
        "last_activity": "2026-04-20T10:05:00",
        "messages": [
            {
                "role": "user",
                "content": "Resume a Juan",
                "tool_calls": None,
                "created_at": "2026-04-20T10:00:10",
            },
            {
                "role": "model",
                "content": "Juan Pérez, última visita el 15 de abril.",
                "tool_calls": [{"name": "get_patient_summary", "args": {"patient_id": 42}}],
                "created_at": "2026-04-20T10:00:12",
            },
        ],
    }
    monkeypatch.setattr(
        assistant_route.session_state,
        "get_full",
        lambda db, doctor_id, conversation_id: payload,
    )

    try:
        r = client.get("/api/assistant/conversations/7")
    finally:
        _clear()
    assert r.status_code == 200
    body = r.json()
    assert body["conversation_id"] == "7"
    assert len(body["messages"]) == 2
    assert body["messages"][1]["tool_calls"][0]["name"] == "get_patient_summary"


# ---------------------------------------------------------------------------
# DELETE /api/assistant/conversations/{id}
# ---------------------------------------------------------------------------


def test_delete_conversation_404_when_not_owned(client, monkeypatch):
    _override(_doctor())
    monkeypatch.setattr(
        assistant_route.session_state,
        "delete",
        lambda db, doctor_id, conversation_id: False,
    )
    try:
        r = client.delete("/api/assistant/conversations/999")
    finally:
        _clear()
    assert r.status_code == 404


def test_delete_conversation_happy_path(client, monkeypatch):
    _override(_doctor())
    monkeypatch.setattr(
        assistant_route.session_state,
        "delete",
        lambda db, doctor_id, conversation_id: True,
    )
    try:
        r = client.delete("/api/assistant/conversations/7")
    finally:
        _clear()
    assert r.status_code == 200
    assert r.json() == {"deleted": True}


def test_delete_conversation_requires_doctor(client):
    _override(_patient_user())
    try:
        r = client.delete("/api/assistant/conversations/7")
    finally:
        _clear()
    assert r.status_code == 403
