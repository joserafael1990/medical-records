"""Authentication-related schemas (login, tokens, password reset)."""
from typing import Literal, Optional

from .base import BaseSchema
from .persons import Person


class UserLogin(BaseSchema):
    email: str  # FIXED: Changed from username to email to match auth.py implementation
    password: str


class UserCreate(BaseSchema):
    person_type: Literal['doctor', 'patient', 'admin']
    username: str
    password: str
    email: str
    name: str  # Full name (replaces first_name, paternal_surname, maternal_surname)


class Token(BaseSchema):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    user: Person


class TokenData(BaseSchema):
    username: Optional[str] = None
    person_id: Optional[int] = None
    person_type: Optional[str] = None


class PasswordResetRequest(BaseSchema):
    email: str


class PasswordResetConfirm(BaseSchema):
    token: str
    new_password: str
    confirm_password: str


class ChangePasswordRequest(BaseSchema):
    current_password: str
    new_password: str


class RefreshTokenRequest(BaseSchema):
    refresh_token: str
