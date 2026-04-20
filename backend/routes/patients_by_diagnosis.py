"""
Cohort lookup by diagnosis for the practice dashboard.

Powers the "click a bar in the top-diagnoses chart → see the list of
patients" interaction. Reuses the exact same aggregator the doctor
assistant exposes as a tool, so the ACL/audit trail is identical no
matter which surface invokes it.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session

from agents.doctor_assistant.tools import list_patients_by_diagnosis
from database import Person, get_db
from dependencies import get_current_user
from logger import get_logger

api_logger = get_logger("medical_records.patients_by_diagnosis")

router = APIRouter(prefix="/api/analytics", tags=["analytics"])


@router.get("/patients-by-diagnosis")
async def patients_by_diagnosis(
    dx: str = Query(..., min_length=1, max_length=200),
    limit: int = Query(20, ge=1, le=50),
    request: Request = None,
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user),
):
    """Return patients whose primary diagnosis matches the query (ILIKE)."""
    if current_user.person_type not in ("doctor", "admin"):
        raise HTTPException(
            status_code=403, detail="Solo personal médico puede consultar este reporte."
        )
    return list_patients_by_diagnosis(
        db=db,
        doctor=current_user,
        dx_query=dx,
        limit=limit,
    )
