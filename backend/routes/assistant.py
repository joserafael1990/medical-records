"""
Doctor Assistant HTTP endpoints.

Phase B:
- POST   /api/assistant/chat                   — one user turn in
- GET    /api/assistant/conversations          — list doctor's past conversations
- GET    /api/assistant/conversations/{id}     — full message history for resume
- DELETE /api/assistant/conversations/{id}     — hard delete a conversation

Auth: doctor-only (admins also allowed). The dependency stack is the
same as every other PHI-touching route (`get_current_user`,
`get_db`). Rate-limiting is handled by the global middleware.

Conversations are persistently stored in `assistant_conversations` +
`assistant_messages`. Doctor-scoping is enforced at every read and
write: a doctor can never access another doctor's conversations.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from agents.doctor_assistant.agent import DoctorAssistant
from agents.doctor_assistant.state import session_state
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


class ConversationSummary(BaseModel):
    conversation_id: str
    title: str
    current_patient_id: Optional[int] = None
    created_at: Optional[str] = None
    last_activity: Optional[str] = None


class ConversationListResponse(BaseModel):
    conversations: List[ConversationSummary]


class ConversationMessage(BaseModel):
    role: str
    content: str
    tool_calls: Optional[List[Dict[str, Any]]] = None
    created_at: Optional[str] = None


class ConversationDetail(BaseModel):
    conversation_id: str
    title: Optional[str] = None
    current_patient_id: Optional[int] = None
    created_at: Optional[str] = None
    last_activity: Optional[str] = None
    messages: List[ConversationMessage]


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


@router.get("/conversations", response_model=ConversationListResponse)
async def list_conversations(
    limit: int = 20,
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user),
) -> ConversationListResponse:
    """Return the caller's recent conversations for the sidebar."""
    if current_user.person_type not in ("doctor", "admin"):
        raise HTTPException(status_code=403, detail="No autorizado.")
    rows = session_state.list_recent(db=db, doctor_id=current_user.id, limit=limit)
    return ConversationListResponse(
        conversations=[ConversationSummary(**r) for r in rows]
    )


@router.get(
    "/conversations/{conversation_id}",
    response_model=ConversationDetail,
)
async def get_conversation(
    conversation_id: str,
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user),
) -> ConversationDetail:
    """Return full message history for a past conversation."""
    if current_user.person_type not in ("doctor", "admin"):
        raise HTTPException(status_code=403, detail="No autorizado.")
    data = session_state.get_full(
        db=db,
        doctor_id=current_user.id,
        conversation_id=conversation_id,
    )
    if data is None:
        raise HTTPException(status_code=404, detail="Conversación no encontrada.")
    return ConversationDetail(**data)


@router.delete("/conversations/{conversation_id}")
async def delete_conversation(
    conversation_id: str,
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user),
) -> Dict[str, bool]:
    """Hard delete a conversation. Only the owning doctor can delete."""
    if current_user.person_type not in ("doctor", "admin"):
        raise HTTPException(status_code=403, detail="No autorizado.")
    ok = session_state.delete(
        db=db,
        doctor_id=current_user.id,
        conversation_id=conversation_id,
    )
    if not ok:
        raise HTTPException(status_code=404, detail="Conversación no encontrada.")
    return {"deleted": True}
