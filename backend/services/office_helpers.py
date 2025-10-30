"""
Office-related helpers for formatting address, maps URL and country code.
"""
from typing import Optional


def build_office_address(office) -> str:
    """Return the address string used in WhatsApp templates.
    - Virtual offices: use virtual_url directly as the address.
    - Physical offices: "{name} - {address or 'No especificado'}".
    - Fallback: "Consultorio Médico".
    """
    if not office:
        return "Consultorio Médico"
    try:
        if getattr(office, "is_virtual", False) and getattr(office, "virtual_url", None):
            return office.virtual_url
        name = getattr(office, "name", None) or "Consultorio"
        address = getattr(office, "address", None) or "No especificado"
        return f"{name} - {address}"
    except Exception:
        return "Consultorio Médico"


def resolve_maps_url(office, fallback_address: Optional[str]) -> Optional[str]:
    """Return maps URL to include in WhatsApp template.
    - Virtual offices: use virtual_url as the URL.
    - Physical: prefer office.maps_url; fallback to generated Google Maps from address.
    - If no info, return None.
    """
    if not office:
        return (
            f"https://www.google.com/maps/search/?api=1&query={fallback_address.replace(' ', '+')}"
            if fallback_address else None
        )
    try:
        if getattr(office, "is_virtual", False) and getattr(office, "virtual_url", None):
            return office.virtual_url
        explicit = getattr(office, "maps_url", None)
        if explicit:
            return explicit
        addr = fallback_address or build_office_address(office)
        return f"https://www.google.com/maps/search/?api=1&query={addr.replace(' ', '+')}" if addr else None
    except Exception:
        return None


def resolve_country_code(office, default_code: str = "52") -> str:
    """Return numeric country code without plus sign.
    Fallback to default (Mexico=52) if not available.
    """
    try:
        country = getattr(office, "country", None)
        phone_code = None
        if country and getattr(country, "phone_code", None):
            phone_code = country.phone_code
        elif getattr(office, "country_id", None) is None:
            return default_code
        if not phone_code:
            return default_code
        return phone_code.replace("+", "")
    except Exception:
        return default_code


