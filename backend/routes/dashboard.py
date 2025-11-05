"""
Dashboard endpoints
Migrated from main_clean_english.py to improve code organization
"""

from fastapi import APIRouter

router = APIRouter(prefix="/api", tags=["dashboard"])


@router.get("/dashboard/stats")
async def get_dashboard_stats():
    """Get dashboard statistics - no auth for testing"""
    return {
        "appointments_today": 0,
        "time_saved": "0.0h",
        "pending_messages": 0,
        "compliance": 100,
        "monthly_revenue": 0,
        "revenue_change": 0,
        "avg_consultation_time": 30,
        "documentation_efficiency": 94,
        "patient_satisfaction": 4.8,
        "total_patients": 4
    }

