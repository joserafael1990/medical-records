"""
DoctorAssistant — Gemini (Vertex AI) wrapper for the read-only doctor
copilot.

Design notes
- Single path: Vertex AI `GenerativeModel` with function-calling. No
  ADK, no direct google-generativeai fallback. The appointment_agent
  accumulated a lot of defensive branches for Agent Engine deployment;
  the doctor assistant does not need any of that.
- `GEMINI_BOT_SANDBOX_MODE` short-circuits all Gemini calls and returns
  deterministic mock replies so dev/tests run at $0 and offline.
- Session state is injected; callers can pass a per-process singleton
  or build a test-scoped `AssistantSessionState`.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional

import vertexai
from sqlalchemy.orm import Session
from vertexai.generative_models import (
    Content,
    FunctionDeclaration,
    GenerativeModel,
    Part,
    Tool,
)

from config import settings
from logger import get_logger
from services.llm_tracing import LLMTracer

from .prompts import DOCTOR_ASSISTANT_PROMPT
from .state import AssistantSessionState, session_state as default_session_state
from .tools import execute_tool, get_tool_declarations

api_logger = get_logger("medical_records.doctor_assistant")


MAX_FUNCTION_CALL_TURNS = 4


class DoctorAssistant:
    """Conversational wrapper around Gemini with function-calling.

    Usage:
        agent = DoctorAssistant(db=db_session)
        out = await agent.chat(
            doctor=current_user,
            message="Resume la historia de Juan Pérez",
            conversation_id=None,       # None → new conversation
            current_patient_id=None,    # optional UI context
        )
        # out = {reply, conversation_id, tool_calls, sandbox}
    """

    def __init__(
        self,
        db: Session,
        session_state: Optional[AssistantSessionState] = None,
    ) -> None:
        self.db = db
        self.state = session_state or default_session_state
        self.sandbox_mode = bool(settings.GEMINI_BOT_SANDBOX_MODE)
        if self.sandbox_mode:
            api_logger.info(
                "Doctor Assistant initialised in SANDBOX MODE (no API calls)"
            )
            self.model = None
            return
        if not settings.GCP_PROJECT_ID:
            raise RuntimeError(
                "GCP_PROJECT_ID must be set when GEMINI_BOT_SANDBOX_MODE is false"
            )
        vertexai.init(
            project=settings.GCP_PROJECT_ID,
            location=settings.GCP_REGION,
        )
        declarations = [
            FunctionDeclaration(**d) for d in get_tool_declarations()
        ]
        self.model = GenerativeModel(
            model_name=settings.GEMINI_MODEL,
            system_instruction=DOCTOR_ASSISTANT_PROMPT,
            tools=[Tool(function_declarations=declarations)],
        )
        api_logger.info(
            "Doctor Assistant initialised",
            extra={"model": settings.GEMINI_MODEL, "tools": len(declarations)},
        )

    # ---------------------------------------------------------------
    # Public API
    # ---------------------------------------------------------------

    async def chat(
        self,
        doctor: Any,
        message: str,
        conversation_id: Optional[str] = None,
        current_patient_id: Optional[int] = None,
    ) -> Dict[str, Any]:
        """Handle one user turn. Returns a dict with the reply + metadata."""
        conv = self.state.get_or_create(
            db=self.db,
            doctor_id=doctor.id,
            conversation_id=conversation_id,
            current_patient_id=current_patient_id,
        )
        if self.sandbox_mode:
            reply = self._sandbox_reply(message, current_patient_id or conv.current_patient_id)
            self.state.append_turn(
                db=self.db,
                doctor_id=doctor.id,
                conversation_id=conv.conversation_id,
                user_message=message,
                model_response=reply,
            )
            return {
                "reply": reply,
                "conversation_id": conv.conversation_id,
                "tool_calls": [],
                "sandbox": True,
            }

        # One LLMTracer per user turn — _run_live_turn may issue multiple
        # Gemini calls (tool-use), all sharing the same trace_id.
        with LLMTracer(
            db=self.db,
            source="doctor_assistant",
            user_id=doctor.id,
            patient_id=current_patient_id or conv.current_patient_id,
            session_id=conv.conversation_id,
            system_prompt=DOCTOR_ASSISTANT_PROMPT,
            user_input=message,
            conversation_history=conv.history,
            model=getattr(settings, "GEMINI_MODEL", None) or "gemini-2.5-flash",
        ) as tracer:
            reply, tool_calls, tool_results = self._run_live_turn(
                doctor=doctor,
                history=conv.history,
                message=message,
                current_patient_id=current_patient_id or conv.current_patient_id,
                tracer=tracer,
            )
            tracer.set_response_text(reply)
            tracer.extend_tool_calls(tool_calls, tool_results)
        self.state.append_turn(
            db=self.db,
            doctor_id=doctor.id,
            conversation_id=conv.conversation_id,
            user_message=message,
            model_response=reply,
            tool_calls=tool_calls,
            tool_results=tool_results,
        )
        return {
            "reply": reply,
            "conversation_id": conv.conversation_id,
            "tool_calls": tool_calls,
            "sandbox": False,
        }

    # ---------------------------------------------------------------
    # Internals
    # ---------------------------------------------------------------

    def _sandbox_reply(self, message: str, patient_id: Optional[int]) -> str:
        """Deterministic, no-API mock reply used for dev/tests."""
        ctx = f" (contexto: paciente #{patient_id})" if patient_id else ""
        return (
            "[SANDBOX] Respuesta simulada del asistente médico."
            f"{ctx} Mensaje recibido: «{message[:200]}». En modo prueba no se "
            "hacen llamadas reales a Gemini; para activar el modelo, "
            "desactiva GEMINI_BOT_SANDBOX_MODE."
        )

    def _build_history_contents(self, history: List[Dict[str, Any]]) -> List[Content]:
        """Convert stored history dicts into Vertex `Content` objects."""
        out: List[Content] = []
        for turn in history:
            role = turn.get("role", "user")
            parts = turn.get("parts", [])
            part_objs: List[Part] = []
            for p in parts:
                if isinstance(p, str):
                    part_objs.append(Part.from_text(p))
                elif isinstance(p, dict):
                    ptype = p.get("type")
                    if ptype == "function_call":
                        part_objs.append(
                            Part.from_dict({
                                "function_call": {"name": p["name"], "args": p.get("args", {})}
                            })
                        )
                    elif ptype == "function_response":
                        part_objs.append(
                            Part.from_function_response(
                                name=p["name"],
                                response={"result": p.get("result", {})},
                            )
                        )
            if part_objs:
                out.append(Content(role=role, parts=part_objs))
        return out

    def _run_live_turn(
        self,
        doctor: Any,
        history: List[Dict[str, Any]],
        message: str,
        current_patient_id: Optional[int],
        tracer: Optional["LLMTracer"] = None,
    ) -> tuple[str, List[Dict[str, Any]], List[Dict[str, Any]]]:
        """Run one user turn against Gemini, resolving any function calls.

        Returns (reply_text, tool_calls, tool_results) so callers can
        persist results alongside calls for multi-turn context. If a
        `tracer` is supplied, token usage from every Gemini call in
        the loop is accumulated into it.
        """
        if self.model is None:
            raise RuntimeError("Model not initialised")
        chat_history = self._build_history_contents(history)
        chat = self.model.start_chat(
            history=chat_history if chat_history else None,
            response_validation=False,
        )
        prompt = self._wrap_with_context(message, current_patient_id)
        tool_calls: List[Dict[str, Any]] = []
        tool_results: List[Dict[str, Any]] = []
        response = chat.send_message(prompt)
        if tracer is not None:
            tracer.capture_response(response)

        for _turn in range(MAX_FUNCTION_CALL_TURNS):
            function_call_part = self._extract_function_call(response)
            if function_call_part is None:
                break
            fc = function_call_part.function_call
            name = getattr(fc, "name", None) or ""
            args = dict(getattr(fc, "args", {}) or {})
            tool_calls.append({"name": name, "args": args})
            result = execute_tool(self.db, doctor, name, args)
            tool_results.append({"name": name, "result": result})
            response = chat.send_message([
                Part.from_function_response(name=name, response={"result": result})
            ])
            if tracer is not None:
                tracer.capture_response(response)
        reply_text = self._extract_text(response) or (
            "No pude generar una respuesta. Intenta reformular la pregunta."
        )
        return reply_text, tool_calls, tool_results

    @staticmethod
    def _wrap_with_context(message: str, patient_id: Optional[int]) -> str:
        if patient_id:
            return (
                f"[contexto: current_patient_id={patient_id}]\n{message}"
            )
        return message

    @staticmethod
    def _extract_function_call(response) -> Optional[Any]:
        try:
            parts = response.candidates[0].content.parts
        except (AttributeError, IndexError):
            return None
        for p in parts:
            if getattr(p, "function_call", None):
                return p
        return None

    @staticmethod
    def _extract_text(response) -> str:
        try:
            parts = response.candidates[0].content.parts
        except (AttributeError, IndexError):
            return ""
        chunks = [getattr(p, "text", None) for p in parts if getattr(p, "text", None)]
        return " ".join(c for c in chunks if c).strip()
