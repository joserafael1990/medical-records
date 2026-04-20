"""Common/utility schemas: search, pagination, dashboard stats."""
from typing import List, Optional

from .base import BaseSchema


class SearchParams(BaseSchema):
    q: Optional[str] = None  # Búsqueda general
    tipo: Optional[str] = None  # doctor/patient
    specialty_id: Optional[int] = None
    ciudad_id: Optional[int] = None
    activo: bool = True
    page: int = 1
    limit: int = 10


class PaginatedResponse(BaseSchema):
    items: List
    total: int
    page: int
    limit: int
    total_pages: int


class DashboardStats(BaseSchema):
    citas_hoy: int
    pacientes_totales: int
    doctores_totales: int
    consultas_mes: int
    mis_citas_hoy: Optional[int] = None  # Solo para doctores
