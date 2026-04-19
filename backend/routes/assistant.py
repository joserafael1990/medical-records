"""
Doctor Assistant HTTP endpoint.

POST /api/assistant/chat — one user turn in.

Auth: doctor-only (admins also allowed). The dependency stack is the
same as every other PHI-touching route (`get_current_user`,
`get_db`). Rate-limiting is handled by the global middleware.

Sliver 1 scope: single endpoint, in-memory session state, `sandbox
mode` for zero-cost dev/tests.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from agents.doctor_assistant.agent import DoctorAssistant
from database import Person, get_db
from dependencies import get_current_user
from logger import get_logger

api_logger = get_logger("medical_records.assistant_route")

router = APIRouter(prefix="/api/assistant", tags=["assistant"])


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000)
    conversation_id: Optional[str] = None
    current_patient_id: Optional[int] = None


class ChatResponse(BaseModel):
    reply: str
    conversation_id: str
    tool_calls: List[Dict[str, Any]]
    sandbox: bool


# ---------------------------------------------------------------------------
# Endpoint
# ---------------------------------------------------------------------------


@router.post("/chat", response_model=ChatResponse)
async def chat(
    payload: ChatRequest,
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user),
) -> ChatResponse:
    """Process one user turn and return the assistant's reply."""
    if current_user.person_type not in ("doctor", "admin"):
        raise HTTPException(
            status_code=403,
            detail="El asistente solo está disponible para personal médico autorizado.",
        )
    try:
        agent = DoctorAssistant(db=db)
        result = await agent.chat(
            doctor=current_user,
            message=payload.message,
            conversation_id=payload.conversation_id,
            current_patient_id=payload.current_patient_id,
        )
    except RuntimeError as exc:
        api_logger.error("Assistant runtime error: %s", exc, exc_info=True)
        raise HTTPException(
            status_code=503,
            detail="El asistente no está disponible. Contacta al administrador.",
        )
    return ChatResponse(**result)
