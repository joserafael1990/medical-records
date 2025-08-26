"""
Pydantic models for authentication API
"""
from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    doctor_id: str

class UserResponse(BaseModel):
    id: str
    email: str
    doctor_id: str
    is_active: bool
    created_at: datetime
    last_login: Optional[datetime]

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    doctor_id: Optional[str] = None

class DoctorInfo(BaseModel):
    id: str
    full_name: str
    title: str
    first_name: str
    paternal_surname: str
    maternal_surname: Optional[str]
    email: str
    specialty: str
    professional_license: str

class LoginResponse(BaseModel):
    access_token: str
    token_type: str
    doctor: DoctorInfo
    expires_in: int
