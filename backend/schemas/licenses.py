"""License management schemas."""
from datetime import date, datetime
from typing import Literal, Optional

from pydantic import ConfigDict

from .base import BaseSchema


class LicenseBase(BaseSchema):
    doctor_id: int
    license_type: Literal['trial', 'basic', 'premium']
    start_date: date
    expiration_date: date
    payment_date: Optional[date] = None
    status: Literal['active', 'inactive', 'expired', 'suspended'] = 'active'
    is_active: bool = True
    notes: Optional[str] = None


class LicenseCreate(LicenseBase):
    pass


class LicenseUpdate(BaseSchema):
    license_type: Optional[Literal['trial', 'basic', 'premium']] = None
    start_date: Optional[date] = None
    expiration_date: Optional[date] = None
    payment_date: Optional[date] = None
    status: Optional[Literal['active', 'inactive', 'expired', 'suspended']] = None
    is_active: Optional[bool] = None
    notes: Optional[str] = None


class LicenseDoctorInfo(BaseSchema):
    id: int
    name: str
    email: Optional[str] = None
    person_type: str


class LicenseResponse(LicenseBase):
    id: int
    created_at: datetime
    updated_at: datetime
    created_by: Optional[int] = None
    doctor: Optional[LicenseDoctorInfo] = None

    model_config = ConfigDict(from_attributes=True)
