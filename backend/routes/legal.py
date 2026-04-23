"""CORTEX platform legal documents (Aviso-Plataforma / ToS / DPA) endpoints.

Estos documentos los firma **el médico-usuario** al crear su cuenta (y al
volverlos a firmar cuando haya una versión nueva). NO son el aviso al
paciente — ese lo emite el médico como Responsable bajo su propia
identidad legal, con los datos renderizados en /api/privacy/.
"""

from __future__ import annotations

from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, field_validator
from sqlalchemy.orm import Session

from database import LegalAcceptance, LegalDocument, Person, get_db
from dependencies import get_current_user
from logger import get_logger
from utils.datetime_utils import utc_now

api_logger = get_logger("api")

router = APIRouter(prefix="/api", tags=["legal"])


# ---------------------------------------------------------------------------
# Schemas (inline — este es el único consumidor)
# ---------------------------------------------------------------------------

class LegalDocumentOut(BaseModel):
    id: int
    doc_type: str
    version: str
    title: str
    content: str
    effective_date: str
    is_active: bool


class CurrentDocumentsOut(BaseModel):
    platform_privacy: Optional[LegalDocumentOut] = None
    tos: Optional[LegalDocumentOut] = None
    dpa: Optional[LegalDocumentOut] = None


class AcceptanceIn(BaseModel):
    document_id: int
    accepted_at: Optional[datetime] = None


class AcceptancesBatchIn(BaseModel):
    acceptances: List[AcceptanceIn]

    @field_validator("acceptances")
    @classmethod
    def _require_all(cls, v: List[AcceptanceIn]) -> List[AcceptanceIn]:
        if not v or len(v) < 1:
            raise ValueError("Se requiere al menos una aceptación.")
        return v


class AcceptanceOut(BaseModel):
    id: int
    user_id: int
    document_id: int
    doc_type: str
    version: str
    accepted_at: datetime


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

REQUIRED_DOC_TYPES = ("platform_privacy", "tos", "dpa")


def _client_ip(request: Request) -> Optional[str]:
    if request is None:
        return None
    forwarded = request.headers.get("x-forwarded-for") if request.headers else None
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else None


def _serialize(doc: LegalDocument) -> LegalDocumentOut:
    return LegalDocumentOut(
        id=doc.id,
        doc_type=doc.doc_type,
        version=doc.version,
        title=doc.title,
        content=doc.content,
        effective_date=doc.effective_date.isoformat() if doc.effective_date else "",
        is_active=bool(doc.is_active),
    )


def _active(db: Session, doc_type: str) -> Optional[LegalDocument]:
    return (
        db.query(LegalDocument)
        .filter(LegalDocument.doc_type == doc_type, LegalDocument.is_active.is_(True))
        .order_by(LegalDocument.effective_date.desc())
        .first()
    )


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.get("/legal/current", response_model=CurrentDocumentsOut)
async def get_current_legal_documents(db: Session = Depends(get_db)):
    """Retorna la versión activa de cada documento de la plataforma.

    Público (sin auth) — necesario para el signup y para que la página
    pública de CORTEX muestre su propio aviso.
    """
    out = CurrentDocumentsOut()
    for doc_type in REQUIRED_DOC_TYPES:
        doc = _active(db, doc_type)
        if doc:
            setattr(out, doc_type, _serialize(doc))
    return out


@router.post("/legal/accept", response_model=List[AcceptanceOut])
async def accept_legal_documents(
    payload: AcceptancesBatchIn,
    request: Request,
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user),
):
    """Registrar aceptación de uno o más documentos por parte del médico.

    Idempotente por (user_id, document_id): si ya aceptó, no crea duplicado.
    """
    ip = _client_ip(request)
    ua = request.headers.get("user-agent") if request and request.headers else None

    results: List[AcceptanceOut] = []
    for item in payload.acceptances:
        doc = db.query(LegalDocument).filter(LegalDocument.id == item.document_id).first()
        if not doc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Documento legal {item.document_id} no existe.",
            )

        existing = (
            db.query(LegalAcceptance)
            .filter(
                LegalAcceptance.user_id == current_user.id,
                LegalAcceptance.document_id == doc.id,
            )
            .first()
        )
        if existing is None:
            acc = LegalAcceptance(
                user_id=current_user.id,
                document_id=doc.id,
                accepted_at=item.accepted_at or utc_now(),
                ip_address=ip,
                user_agent=ua,
            )
            db.add(acc)
            db.commit()
            db.refresh(acc)
        else:
            acc = existing

        results.append(
            AcceptanceOut(
                id=acc.id,
                user_id=acc.user_id,
                document_id=acc.document_id,
                doc_type=doc.doc_type,
                version=doc.version,
                accepted_at=acc.accepted_at,
            )
        )

    api_logger.info(
        "Legal acceptances recorded",
        user_id=current_user.id,
        count=len(results),
    )
    return results


@router.get("/legal/my-acceptances", response_model=List[AcceptanceOut])
async def get_my_acceptances(
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user),
):
    """Las aceptaciones vigentes del usuario autenticado."""
    rows = (
        db.query(LegalAcceptance, LegalDocument)
        .join(LegalDocument, LegalDocument.id == LegalAcceptance.document_id)
        .filter(LegalAcceptance.user_id == current_user.id)
        .all()
    )
    return [
        AcceptanceOut(
            id=acc.id,
            user_id=acc.user_id,
            document_id=acc.document_id,
            doc_type=doc.doc_type,
            version=doc.version,
            accepted_at=acc.accepted_at,
        )
        for acc, doc in rows
    ]


def check_user_has_accepted_all_required(db: Session, user_id: int) -> List[str]:
    """Helper para guards: retorna lista de doc_types pendientes de aceptar.

    Vacía = usuario cumplió todas las firmas de la última versión activa.
    """
    pending: List[str] = []
    for doc_type in REQUIRED_DOC_TYPES:
        active_doc = _active(db, doc_type)
        if not active_doc:
            continue
        has = (
            db.query(LegalAcceptance)
            .filter(
                LegalAcceptance.user_id == user_id,
                LegalAcceptance.document_id == active_doc.id,
            )
            .first()
        )
        if not has:
            pending.append(doc_type)
    return pending
