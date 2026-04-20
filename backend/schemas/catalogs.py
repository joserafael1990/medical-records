"""Geographic and auxiliary catalog schemas."""
from datetime import datetime
from typing import Optional

from .base import BaseSchema


class CountryBase(BaseSchema):
    name: str
    active: bool = True


class Country(CountryBase):
    id: int
    created_at: datetime


class StateBase(BaseSchema):
    name: str
    country_id: int
    active: bool = True


class State(StateBase):
    id: int
    created_at: datetime
    country: Optional[Country] = None


class CityBase(BaseSchema):
    name: str
    state_id: int
    active: bool = True


class City(CityBase):
    id: int
    created_at: datetime
    state: Optional[State] = None


class AppointmentTypeBase(BaseSchema):
    name: str
    active: bool = True


class AppointmentType(AppointmentTypeBase):
    id: int
    created_at: datetime


class SpecialtyBase(BaseSchema):
    name: str
    active: bool = True


class Specialty(SpecialtyBase):
    id: int
    created_at: datetime


class EmergencyRelationshipBase(BaseSchema):
    code: str
    name: str
    active: bool = True


class EmergencyRelationship(EmergencyRelationshipBase):
    created_at: datetime
