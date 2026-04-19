"""
Practice-level analytics endpoint.

GET /api/analytics/practice-summary — doctor-scoped aggregates
(KPIs, 12-month trends, top diagnoses, heatmap, demographics).

Distinct from `/api/dashboard/stats` (today's at-a-glance snapshot);
this one is the deep, scroll-through dashboard view.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from audit_service import audit_service
from database import Person, get_db
from dependencies import get_current_user
from logger import get_logger
from services.practice_metrics import PracticeMetricsAggregator

api_logger = get_logger("medical_records.practice_analytics")

router = APIRouter(prefix="/api/analytics", tags=["analytics"])


@router.get("/practice-summary")
async def get_practice_summary(
    request: Request,
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user),
):
    """Return a 12-month practice analytics snapshot for the caller."""
    if current_user.person_type not in ("doctor", "admin"):
        raise HTTPException(
            status_code=403, detail="Solo personal médico puede ver estos reportes."
        )
    aggregator = PracticeMetricsAggregator(db=db)
    payload = aggregator.build(current_user)

    try:
        audit_service.log_action(
            db=db,
            user=current_user,
            request=request,
            action="READ",
            table_name="medical_records",
            operation_type="practice_summary",
            metadata={"scope": payload.get("scope")},
            security_level="INFO",
        )
    except Exception as audit_err:
        api_logger.warning("Practice summary audit failed: %s", audit_err)

    return payload
