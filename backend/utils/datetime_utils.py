"""
Utility functions for datetime operations
Replaces deprecated datetime.utcnow() with timezone-aware alternatives
"""
from datetime import datetime, timezone
import pytz

# Global CDMX Timezone configuration 
SYSTEM_TIMEZONE = pytz.timezone('America/Mexico_City')

def utc_now():
    """Get current UTC datetime (replaces deprecated datetime.utcnow())"""
    return datetime.now(timezone.utc)

def now_cdmx() -> datetime:
    """Get current datetime in CDMX timezone"""
    return datetime.now(SYSTEM_TIMEZONE)

def now_in_timezone(timezone_str: str = 'America/Mexico_City') -> datetime:
    """Get current datetime in specified timezone"""
    tz = pytz.timezone(timezone_str)
    return datetime.now(tz)

def to_utc_for_storage(dt: datetime, doctor_timezone: str = 'America/Mexico_City') -> datetime:
    """Convert datetime to UTC for database storage"""
    if dt.tzinfo is None:
        # Assume doctor timezone if naive
        tz = pytz.timezone(doctor_timezone)
        dt = tz.localize(dt)
    return dt.astimezone(pytz.utc)

def from_utc_to_timezone(dt: datetime, doctor_timezone: str = 'America/Mexico_City') -> datetime:
    """Convert UTC datetime to doctor's timezone"""
    if dt.tzinfo is None:
        # Assume UTC if naive
        dt = pytz.utc.localize(dt)
    tz = pytz.timezone(doctor_timezone)
    return dt.astimezone(tz)
