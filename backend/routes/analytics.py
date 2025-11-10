"""
Analytics endpoints for dashboard metrics
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional
from datetime import date, datetime

from database import get_db, Person
from dependencies import get_current_user
from logger import get_logger
from services.analytics_service import AnalyticsService

api_logger = get_logger("api")

router = APIRouter(prefix="/api/analytics", tags=["analytics"])


@router.get("/dashboard")
async def get_dashboard_metrics(
    current_user: Person = Depends(get_current_user),
    db: Session = Depends(get_db),
    date_from: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    date_to: Optional[str] = Query(None, description="End date (YYYY-MM-DD)")
):
    """
    Get all dashboard metrics for the authenticated doctor
    
    Returns comprehensive analytics including:
    - Patient metrics (total, new, active)
    - Consultation metrics (total, trends, by month)
    - Appointment metrics (today, this week, completed, cancelled, no-show)
    - Top diagnoses and medications
    - Clinical studies summary
    - Occupation metrics
    - Appointment flow for Sankey diagram
    """
    try:
        # Ensure user is a doctor
        if current_user.person_type != 'doctor':
            raise HTTPException(
                status_code=403,
                detail="Only doctors can access analytics"
            )
        
        # Parse dates if provided
        date_from_obj = None
        date_to_obj = None
        
        if date_from:
            try:
                date_from_obj = datetime.fromisoformat(date_from).date()
            except ValueError:
                raise HTTPException(
                    status_code=400,
                    detail="Invalid date_from format. Use YYYY-MM-DD"
                )
        
        if date_to:
            try:
                date_to_obj = datetime.fromisoformat(date_to).date()
            except ValueError:
                raise HTTPException(
                    status_code=400,
                    detail="Invalid date_to format. Use YYYY-MM-DD"
                )
        
        # Get metrics
        metrics = AnalyticsService.get_dashboard_metrics(
            db=db,
            doctor_id=current_user.id,
            date_from=date_from_obj,
            date_to=date_to_obj
        )
        
        api_logger.info(
            f"Dashboard metrics retrieved for doctor {current_user.id}",
            extra={"doctor_id": current_user.id}
        )
        
        return metrics
        
    except HTTPException:
        raise
    except Exception as e:
        api_logger.error(
            f"Error retrieving dashboard metrics: {str(e)}",
            exc_info=True,
            extra={"doctor_id": current_user.id if current_user else None}
        )
        raise HTTPException(
            status_code=500,
            detail="Error retrieving dashboard metrics"
        )

