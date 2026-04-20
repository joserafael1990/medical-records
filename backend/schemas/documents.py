"""Document management schemas (NOM compliance: CURP, RFC, professional license)."""
from datetime import datetime
from typing import Optional

from pydantic import ConfigDict

from .base import BaseSchema


class DocumentTypeResponse(BaseSchema):
    id: int
    name: str
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class DocumentResponse(BaseSchema):
    id: int
    name: str
    document_type_id: int
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PersonDocumentCreate(BaseSchema):
    document_id: int
    document_value: str


class PersonDocumentUpdate(BaseSchema):
    document_value: Optional[str] = None
    is_active: Optional[bool] = None


class PersonDocumentResponse(BaseSchema):
    id: int
    person_id: int
    document_id: int
    document_value: str
    is_active: bool
    created_at: datetime
    updated_at: datetime
    document: Optional[DocumentResponse] = None

    model_config = ConfigDict(from_attributes=True)
