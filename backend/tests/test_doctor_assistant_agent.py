"""
Unit tests for the Doctor Assistant agent wrapper.

Sliver 1 path: we only test the sandbox mode behaviour + the
function-calling loop with Gemini stubbed out. Real Vertex AI calls
are covered by the end-to-end smoke test in the docker-compose env,
not here.
"""

from __future__ import annotations

from types import SimpleNamespace
from unittest.mock import MagicMock

import pytest

from agents.doctor_assistant import agent as agent_module
from agents.doctor_assistant.state import AssistantSessionState


# ---------------------------------------------------------------------------
# Sandbox mode
# ---------------------------------------------------------------------------


def test_sandbox_agent_does_not_init_vertex(monkeypatch):
    monkeypatch.setattr(agent_module.settings, "GEMINI_BOT_SANDBOX_MODE", True)
    called = {}
    monkeypatch.setattr(
        agent_module.vertexai, "init", lambda **kw: called.setdefault("init", True)
    )
    agent = agent_module.DoctorAssistant(db=MagicMock())
    assert agent.sandbox_mode is True
    assert "init" not in called


@pytest.mark.asyncio
async def test_sandbox_chat_returns_deterministic_mock(monkeypatch):
    monkeypatch.setattr(agent_module.settings, "GEMINI_BOT_SANDBOX_MODE", True)
    state = AssistantSessionState()
    agent = agent_module.DoctorAssistant(db=MagicMock(), session_state=state)

    doctor = SimpleNamespace(id=1, person_type="doctor", name="Dr T", email="d@t")
    out = await agent.chat(
        doctor=doctor,
        message="Hola",
        conversation_id=None,
        current_patient_id=None,
    )
    assert out["sandbox"] is True
    assert "sandbox" in out["reply"].lower() or "modo prueba" in out["reply"].lower()
    assert out["conversation_id"]
    conv = state.get_or_create(
        doctor_id=1, conversation_id=out["conversation_id"]
    )
    assert len(conv.history) == 2


@pytest.mark.asyncio
async def test_sandbox_echoes_patient_context(monkeypatch):
    monkeypatch.setattr(agent_module.settings, "GEMINI_BOT_SANDBOX_MODE", True)
    agent = agent_module.DoctorAssistant(db=MagicMock())
    doctor = SimpleNamespace(id=1, person_type="doctor", name="Dr T", email="d@t")

    out = await agent.chat(
        doctor=doctor,
        message="Resume la historia de este paciente",
        conversation_id=None,
        current_patient_id=42,
    )
    assert "42" in out["reply"]


# ---------------------------------------------------------------------------
# Non-sandbox: function-calling loop with a fake model.
# ---------------------------------------------------------------------------


class _FakePart:
    def __init__(self, *, text=None, function_call=None):
        self.text = text
        self.function_call = function_call


class _FakeFunctionCall:
    def __init__(self, name, args):
        self.name = name
        self.args = args


class _FakeResponse:
    def __init__(self, parts):
        content = SimpleNamespace(parts=parts)
        candidate = SimpleNamespace(content=content)
        self.candidates = [candidate]
        first_text = next((p.text for p in parts if getattr(p, "text", None)), None)
        self.text = first_text or ""


class _FakeChat:
    def __init__(self, scripted_responses):
        self._responses = list(scripted_responses)
        self.messages_sent = []

    def send_message(self, message):
        self.messages_sent.append(message)
        return self._responses.pop(0)


def _make_agent_with_fake_model(monkeypatch, scripted_responses):
    monkeypatch.setattr(agent_module.settings, "GEMINI_BOT_SANDBOX_MODE", False)
    monkeypatch.setattr(agent_module.settings, "GCP_PROJECT_ID", "test-proj")
    monkeypatch.setattr(agent_module.vertexai, "init", lambda **kw: None)

    fake_chat = _FakeChat(scripted_responses)
    fake_model = MagicMock()
    fake_model.start_chat.return_value = fake_chat

    monkeypatch.setattr(
        agent_module, "GenerativeModel", lambda **kw: fake_model
    )
    agent = agent_module.DoctorAssistant(db=MagicMock())
    return agent, fake_chat


@pytest.mark.asyncio
async def test_chat_resolves_function_call_and_returns_final_text(monkeypatch):
    fn_call_response = _FakeResponse([
        _FakePart(function_call=_FakeFunctionCall(
            name="search_patients",
            args={"query": "Juan", "limit": 5},
        ))
    ])
    final_response = _FakeResponse([_FakePart(text="Encontré a Juan Pérez.")])
    agent, fake_chat = _make_agent_with_fake_model(
        monkeypatch, [fn_call_response, final_response]
    )

    called = {}

    def fake_dispatch(db, doc, name, args):
        called["name"] = name
        called["args"] = args
        return {"count": 1, "patients": [{"patient_id": 10, "name": "Juan Pérez"}]}

    monkeypatch.setattr(agent_module, "execute_tool", fake_dispatch)

    doctor = SimpleNamespace(id=1, person_type="doctor", name="Dr T", email="d@t")
    out = await agent.chat(
        doctor=doctor,
        message="Busca a Juan",
        conversation_id=None,
        current_patient_id=None,
    )

    assert out["reply"] == "Encontré a Juan Pérez."
    assert out["tool_calls"] == [{"name": "search_patients", "args": {"query": "Juan", "limit": 5}}]
    assert called["name"] == "search_patients"
    assert len(fake_chat.messages_sent) == 2


@pytest.mark.asyncio
async def test_chat_handles_direct_text_response(monkeypatch):
    direct = _FakeResponse([_FakePart(text="No puedo ofrecer recomendaciones clínicas.")])
    agent, _ = _make_agent_with_fake_model(monkeypatch, [direct])

    doctor = SimpleNamespace(id=1, person_type="doctor", name="Dr T", email="d@t")
    out = await agent.chat(
        doctor=doctor,
        message="Dame un diagnóstico diferencial",
        conversation_id=None,
        current_patient_id=None,
    )

    assert out["reply"].startswith("No puedo ofrecer")
    assert out["tool_calls"] == []
