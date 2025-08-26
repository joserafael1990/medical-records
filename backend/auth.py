"""
Authentication system for Historias Clínicas
Handles JWT tokens, password hashing, and user verification
"""
from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from database import get_db, DoctorProfile as DBDoctorProfile
from db_service import DoctorService

# Security configuration
SECRET_KEY = "historias_clinicas_secret_key_2025"  # In production, use environment variable
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 480  # 8 hours

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Token extraction
security = HTTPBearer()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plain password against its hash"""
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    """Generate password hash"""
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Create JWT access token"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def verify_token(token: str) -> Optional[dict]:
    """Verify and decode JWT token"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        doctor_id: str = payload.get("sub")
        if doctor_id is None:
            return None
        return {"doctor_id": doctor_id}
    except JWTError:
        return None

async def get_current_doctor(credentials: HTTPAuthorizationCredentials = Depends(security), db: Session = Depends(get_db)):
    """Dependency to get current authenticated doctor"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    token = credentials.credentials
    token_data = verify_token(token)
    
    if token_data is None:
        raise credentials_exception
    
    doctor = DoctorService.get_profile_by_id(db, token_data["doctor_id"])
    if doctor is None:
        raise credentials_exception
    
    return doctor

# Optional dependency for endpoints that can work with or without authentication
async def get_current_doctor_optional(credentials: Optional[HTTPAuthorizationCredentials] = Depends(HTTPBearer(auto_error=False)), db: Session = Depends(get_db)) -> Optional[DBDoctorProfile]:
    """Optional dependency for current doctor - returns None if not authenticated"""
    if credentials is None:
        return None
    
    try:
        token = credentials.credentials
        token_data = verify_token(token)
        
        if token_data is None:
            return None
        
        doctor = DoctorService.get_profile_by_id(db, token_data["doctor_id"])
        return doctor
    except:
        return None
