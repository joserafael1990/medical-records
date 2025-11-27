"""
Utility functions for datetime operations
Replaces deprecated datetime.utcnow() with timezone-aware alternatives
"""
from datetime import datetime, timezone


def utc_now():
    """Get current UTC datetime (replaces deprecated datetime.utcnow())"""
    return datetime.now(timezone.utc)



