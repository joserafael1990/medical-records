"""
Helper utilities for audit logging serialization.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, Iterable, Optional, Set

from sqlalchemy.inspection import inspect as sa_inspect


def serialize_instance(
    instance: Any,
    exclude: Optional[Iterable[str]] = None,
) -> Dict[str, Any]:
    """
    Convert a SQLAlchemy model instance into a serializable dict.

    Args:
        instance: SQLAlchemy model instance.
        exclude: Iterable of field names to skip.

    Returns:
        Dict ready to be stored in audit logs.
    """
    if instance is None:
        return {}

    exclude_set: Set[str] = set(exclude or [])
    mapper = sa_inspect(instance).mapper

    data: Dict[str, Any] = {}
    for attr in mapper.column_attrs:
        key = attr.key
        if key in exclude_set:
            continue
        value = getattr(instance, key)
        if isinstance(value, datetime):
            data[key] = value.isoformat()
        else:
            data[key] = value

    return data

