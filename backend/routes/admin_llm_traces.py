"""Admin-only endpoints for browsing LLM traces.

Access: `person_type == 'admin'` only. Doctors never see these endpoints
even for their own conversations — this is an operator tool, not a
user tool.

- GET  /api/admin/llm-traces               — paginated list with filters
- GET  /api/admin/llm-traces/{trace_id}    — all rows sharing the same
                                             trace_id, chronological
- GET  /api/admin/llm-traces/stats         — aggregate metrics for the
                                             header dashboard

Every read is audited through `audit_service` because the rows may
contain decrypted PHI (user_input and response_text are encrypted at
rest but decrypted on output — admins legitimately need the raw
content to debug prompts).
"""

from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy import and_, case, func
from sqlalchemy.orm import Session

from audit_service import audit_service
from database import Person, get_db
from dependencies import get_current_user
from logger import get_logger
from models.llm_trace import LLMTrace
from services.llm_tracing import decrypt_trace_row

api_logger = get_logger("medical_records.admin_llm_traces")

router = APIRouter(prefix="/api/admin/llm-traces", tags=["admin-llm-traces"])


def _require_admin(current_user: Person) -> None:
    if getattr(current_user, "person_type", None) != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")


@router.get("")
async def list_traces(
    request: Request,
    source: Optional[str] = Query(None, description="Filter by source (whatsapp_agent, doctor_assistant, transcribe...)"),
    user_id: Optional[int] = Query(None),
    has_error: Optional[bool] = Query(None, description="True to show only failed calls"),
    from_date: Optional[datetime] = Query(None, alias="from"),
    to_date: Optional[datetime] = Query(None, alias="to"),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user),
):
    """Return a paginated list of traces newest-first."""
    _require_admin(current_user)

    q = db.query(LLMTrace)
    if source:
        q = q.filter(LLMTrace.source == source)
    if user_id is not None:
        q = q.filter(LLMTrace.user_id == user_id)
    if has_error is True:
        q = q.filter(LLMTrace.error.isnot(None))
    elif has_error is False:
        q = q.filter(LLMTrace.error.is_(None))
    if from_date:
        q = q.filter(LLMTrace.created_at >= from_date)
    if to_date:
        q = q.filter(LLMTrace.created_at <= to_date)

    total = q.count()
    rows = (
        q.order_by(LLMTrace.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    # List view is content-light: no prompts/responses, only metadata.
    # Prevents a dump of decrypted PHI across the wire for a 200-row page.
    items: List[Dict[str, Any]] = [
        {
            "id": r.id,
            "created_at": r.created_at.isoformat() if r.created_at else None,
            "trace_id": str(r.trace_id) if r.trace_id else None,
            "source": r.source,
            "model": r.model,
            "user_id": r.user_id,
            "patient_id": r.patient_id,
            "prompt_tokens": r.prompt_tokens,
            "completion_tokens": r.completion_tokens,
            "latency_ms": r.latency_ms,
            "cost_usd": float(r.cost_usd) if r.cost_usd is not None else None,
            "finish_reason": r.finish_reason,
            "has_error": bool(r.error),
            "tool_call_count": len(r.tool_calls or []),
        }
        for r in rows
    ]

    try:
        audit_service.log_action(
            db=db, action="READ", user=current_user, request=request,
            table_name="llm_traces", record_id=None,
            operation_type="admin_llm_traces_list",
            metadata={"count": len(items), "filters": {"source": source, "user_id": user_id, "has_error": has_error}},
            security_level="INFO",
        )
    except Exception as audit_err:
        api_logger.warning("Failed to audit llm_traces list: %s", audit_err)

    return {
        "items": items,
        "page": page,
        "page_size": page_size,
        "total": total,
    }


@router.get("/stats")
async def traces_stats(
    request: Request,
    from_date: Optional[datetime] = Query(None, alias="from"),
    to_date: Optional[datetime] = Query(None, alias="to"),
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user),
):
    """Aggregate metrics for the admin dashboard header.

    Returns: total calls, total cost, error rate, avg/p95 latency, and
    a per-source breakdown — all scoped to the same time window the
    list view is filtering by.
    """
    _require_admin(current_user)

    cutoff_from = from_date or (datetime.utcnow() - timedelta(days=30))
    conditions = [LLMTrace.created_at >= cutoff_from]
    if to_date:
        conditions.append(LLMTrace.created_at <= to_date)

    base_q = db.query(LLMTrace).filter(and_(*conditions))

    total_calls = base_q.count()
    error_count = base_q.filter(LLMTrace.error.isnot(None)).count()
    cost_sum = (
        db.query(func.coalesce(func.sum(LLMTrace.cost_usd), 0))
        .filter(and_(*conditions))
        .scalar()
    )

    # Latency: average + approximate p95 via ordered scan. For the
    # current scale (< millions of rows) this is cheap; swap to
    # percentile_cont in Postgres if needed later.
    latency_avg = (
        db.query(func.coalesce(func.avg(LLMTrace.latency_ms), 0))
        .filter(and_(*conditions), LLMTrace.latency_ms.isnot(None))
        .scalar()
    )
    p95_subquery = (
        db.query(LLMTrace.latency_ms)
        .filter(and_(*conditions), LLMTrace.latency_ms.isnot(None))
        .order_by(LLMTrace.latency_ms.desc())
        .limit(max(int(total_calls * 0.05), 1))
        .subquery()
    )
    p95_value = db.query(func.min(p95_subquery.c.latency_ms)).scalar() or 0

    by_source_rows = (
        db.query(
            LLMTrace.source,
            func.count(LLMTrace.id),
            func.coalesce(func.sum(LLMTrace.cost_usd), 0),
            func.sum(case((LLMTrace.error.isnot(None), 1), else_=0)),
        )
        .filter(and_(*conditions))
        .group_by(LLMTrace.source)
        .all()
    )
    by_source = [
        {
            "source": source_name or "unknown",
            "count": int(count),
            "cost_usd": float(cost or 0),
            "error_count": int(errors or 0),
        }
        for source_name, count, cost, errors in by_source_rows
    ]

    return {
        "total_calls": int(total_calls),
        "total_cost_usd": float(cost_sum or 0),
        "error_rate": (error_count / total_calls) if total_calls else 0.0,
        "latency_ms_avg": int(latency_avg or 0),
        "latency_ms_p95": int(p95_value),
        "by_source": by_source,
        "from": cutoff_from.isoformat(),
        "to": (to_date or datetime.utcnow()).isoformat(),
    }


@router.get("/{trace_id}")
async def get_trace(
    trace_id: str,
    request: Request,
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user),
):
    """Return every row sharing the given trace_id, chronological."""
    _require_admin(current_user)

    try:
        parsed = UUID(trace_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid trace_id")

    rows = (
        db.query(LLMTrace)
        .filter(LLMTrace.trace_id == parsed)
        .order_by(LLMTrace.created_at.asc())
        .all()
    )
    if not rows:
        raise HTTPException(status_code=404, detail="Trace not found")

    decrypted = [decrypt_trace_row(r) for r in rows]

    try:
        audit_service.log_action(
            db=db, action="READ", user=current_user, request=request,
            table_name="llm_traces", record_id=rows[0].id,
            operation_type="admin_llm_trace_detail",
            metadata={"trace_id": trace_id, "row_count": len(rows)},
            security_level="INFO",
        )
    except Exception as audit_err:
        api_logger.warning("Failed to audit llm_trace detail: %s", audit_err)

    return {"trace_id": trace_id, "rows": decrypted}
