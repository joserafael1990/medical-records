from fastapi import APIRouter, Depends, HTTPException, Header, status
from sqlalchemy.orm import Session
from typing import Optional
import os

from database import get_db
from services.scheduler import check_and_send_reminders
from logger import get_logger

router = APIRouter(prefix="/api/internal", tags=["internal"])
logger = get_logger(__name__)

# Secret key for securing internal endpoints
# In Cloud Run, you can also use OIDC tokens, but a shared secret is 
# simpler for basic setup.
INTERNAL_API_KEY = os.getenv("INTERNAL_API_KEY", "cortex-medical-internal-secret-2025")

@router.post("/trigger-reminders")
async def trigger_reminders(
    x_internal_key: Optional[str] = Header(None, alias="X-Internal-Key"),
    db: Session = Depends(get_db)
):
    """
    Endpoint triggered by Cloud Scheduler to check and send WhatsApp reminders.
    """
    # Verify the secret key
    if x_internal_key != INTERNAL_API_KEY:
        logger.warning("⚠️ Invalid internal key access attempt")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid internal key"
        )
    
    try:
        # Run the logic synchronously
        result = check_and_send_reminders(db)
        return result
    except Exception as e:
        logger.error(f"Error executing reminder triggers: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
