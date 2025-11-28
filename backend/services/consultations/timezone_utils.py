"""
Timezone utilities for consultation service
"""
from datetime import datetime
import pytz

def now_cdmx():
    """Get current time in CDMX timezone"""
    return datetime.now(pytz.timezone('America/Mexico_City'))

def cdmx_datetime(date_str: str):
    """Parse ISO string to CDMX datetime"""
    return datetime.fromisoformat(date_str).astimezone(pytz.timezone('America/Mexico_City'))
