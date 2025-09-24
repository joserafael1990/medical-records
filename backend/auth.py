#!/usr/bin/env python3
"""
Sistema de Autenticación JWT Real
Cumple con estándares de seguridad empresarial
"""

from datetime import datetime, timedelta, timezone
from typing import Optional, Union, Dict, Any
import secrets
import hashlib

from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from database import Person

# ============================================================================
# CONFIGURACIÓN DE SEGURIDAD
# ============================================================================

# Configuración JWT (desde config seguro)
from config_secure import (
    JWT_SECRET_KEY as SECRET_KEY,
    JWT_ALGORITHM as ALGORITHM,
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES as ACCESS_TOKEN_EXPIRE_MINUTES,
    JWT_REFRESH_TOKEN_EXPIRE_DAYS as REFRESH_TOKEN_EXPIRE_DAYS
)

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# ============================================================================
# FUNCIONES DE HASHING Y VERIFICACIÓN
# ============================================================================

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verificar contraseña plana contra hash"""
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    """Generar hash de contraseña"""
    return pwd_context.hash(password)

# ============================================================================
# AUTENTICACIÓN DE USUARIOS
# ============================================================================

def authenticate_user(db: Session, email: str, password: str) -> Union[Person, bool]:
    """
    Autenticar usuario con email y password
    Usa email como identificador único - mejor UX para usuarios médicos
    Retorna el usuario si es válido, False si no
    """
    user = db.query(Person).filter(Person.email == email).first()
    
    if not user:
        return False
    if not verify_password(password, user.hashed_password):
        return False
    return user

# ============================================================================
# GENERACIÓN Y VALIDACIÓN DE TOKENS JWT
# ============================================================================

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """
    Crear token JWT de acceso
    """
    to_encode = data.copy()
    
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    # Agregar claims estándar
    to_encode.update({
        "exp": expire,
        "iat": datetime.now(timezone.utc),
        "type": "access"
    })
    
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def create_refresh_token(data: dict) -> str:
    """
    Crear token JWT de refresh (vida más larga)
    """
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    
    to_encode.update({
        "exp": expire,
        "iat": datetime.now(timezone.utc),
        "type": "refresh"
    })
    
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def verify_token(token: str, token_type: str = "access") -> Optional[Dict[str, Any]]:
    """
    Verificar y decodificar token JWT
    """
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        
        # Verificar tipo de token
        if payload.get("type") != token_type:
            return None
            
        # Verificar expiración
        exp = payload.get("exp")
        if exp is None:
            return None
            
        if datetime.fromtimestamp(exp, tz=timezone.utc) < datetime.now(timezone.utc):
            return None
            
        return payload
        
    except JWTError:
        return None

def get_user_from_token(db: Session, token: str) -> Optional[Person]:
    """
    Obtener usuario desde token JWT
    """
    payload = verify_token(token)
    if payload is None:
        print("❌ TOKEN: verify_token returned None")
        return None
    
    print(f"🔍 TOKEN: Payload = {payload}")
    
    # Try to get user_id first (more reliable)
    user_id = payload.get("user_id")
    print(f"🔍 TOKEN: user_id from payload = {user_id}")
    if user_id is not None:
        user = db.query(Person).filter(Person.id == user_id).first()
        if user:
            print(f"✅ TOKEN: Found user by user_id {user_id}: {user.first_name} {user.paternal_surname} (ID: {user.id})")
            return user
    
    # Standard JWT: 'sub' contains the user ID (subject)
    user_id_from_sub = payload.get("sub")
    print(f"🔍 TOKEN: sub from payload = {user_id_from_sub} (type: {type(user_id_from_sub)})")
    if user_id_from_sub is not None:
        try:
            # Convert to integer if it's a string
            user_id = int(user_id_from_sub)
            print(f"🔍 TOKEN: Converted sub to integer: {user_id}")
            user = db.query(Person).filter(Person.id == user_id).first()
            if user:
                print(f"✅ TOKEN: Found user by sub {user_id}: {user.first_name} {user.paternal_surname} (ID: {user.id})")
                return user
            else:
                print(f"❌ TOKEN: No user found with ID {user_id}")
        except (ValueError, TypeError) as e:
            print(f"❌ TOKEN: Could not convert sub to int: {e}")
            # If sub is not a number, try as username (fallback)
            user = db.query(Person).filter(Person.username == str(user_id_from_sub)).first()
            if user:
                print(f"✅ TOKEN: Found user by username {user_id_from_sub}: {user.first_name} {user.paternal_surname} (ID: {user.id})")
                return user
            else:
                print(f"❌ TOKEN: No user found with username {user_id_from_sub}")
            
    print("❌ TOKEN: No user found by any method")
    return None

# ============================================================================
# FUNCIONES DE LOGIN/LOGOUT
# ============================================================================

def login_user(db: Session, email: str, password: str) -> Dict[str, Any]:
    """
    Realizar login completo y generar tokens
    Usa email como identificador único - estándar moderno
    """
    user = authenticate_user(db, email, password)
    if not user:
        raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales inválidas",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    # Crear payload para tokens - ALL ENGLISH FIELD NAMES
    token_data = {
        "sub": user.username or str(user.id),  # Use username or user ID as string if username is None
        "user_id": user.id,
        "person_type": user.person_type,   # ENGLISH: tipo_persona → person_type
        "person_code": user.person_code    # ENGLISH: codigo_persona → person_code
    }
    
    # Generar tokens
    access_token = create_access_token(data=token_data)
    refresh_token = create_refresh_token(data=token_data)
    
    # Crear objeto usuario base - ALL ENGLISH FIELD NAMES
    user_data = {
        "id": user.id,
        "username": user.username,
        "person_code": user.person_code,     # ENGLISH: codigo_persona → person_code
        "person_type": user.person_type,     # ENGLISH: tipo_persona → person_type
        "full_name": user.full_name,
        "email": user.email,
        # Campos adicionales de Persona
        "first_name": user.first_name,
        "paternal_surname": user.paternal_surname,
        "maternal_surname": user.maternal_surname,
        "birth_date": user.birth_date.isoformat() if user.birth_date else None,
        "primary_phone": user.primary_phone,  # ✅ UNIFICADO
    }
    
    # Si es doctor, agregar campos profesionales
    if user.person_type == "doctor":  # FIXED: tipo_persona → person_type
        user_data.update({
            "professional_license": user.professional_license,
            "specialty": user.specialty.name if user.specialty else None,      # ENGLISH: especialidad → specialty
            "university": user.university,
            "graduation_year": user.graduation_year,
            "subspecialty": user.subspecialty,
            "office_address": user.office_address,                            # ENGLISH: consultorio_direccion → office_address
            "curp": user.curp,
            "rfc": user.rfc,
        })
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "expires_in": ACCESS_TOKEN_EXPIRE_MINUTES * 60,  # en segundos
        "user": user_data
    }

def refresh_access_token(refresh_token: str) -> Dict[str, Any]:
    """
    Renovar access token usando refresh token
    """
    payload = verify_token(refresh_token, token_type="refresh")
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token inválido o expirado",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Crear nuevo access token
    token_data = {
        "sub": payload.get("sub"),
        "user_id": payload.get("user_id"),
        "person_type": payload.get("person_type"),      # FIXED: tipo_persona → person_type  
        "person_code": payload.get("person_code")       # FIXED: codigo_persona → person_code
    }
    
    new_access_token = create_access_token(data=token_data)
    
    return {
        "access_token": new_access_token,
        "token_type": "bearer",
        "expires_in": ACCESS_TOKEN_EXPIRE_MINUTES * 60
    }

# ============================================================================
# SISTEMA DE ROLES Y PERMISOS
# ============================================================================

class Roles:
    """Definición de roles del sistema"""
    ADMIN = "admin"
    DOCTOR = "doctor"
    PATIENT = "patient"
    NURSE = "nurse"
    RECEPTIONIST = "receptionist"

class Permissions:
    """Definición de permisos granulares"""
    
    # Permisos de personas
    CREATE_DOCTOR = "create_doctor"
    CREATE_PATIENT = "create_patient"
    READ_ANY_PERSON = "read_any_person"
    UPDATE_ANY_PERSON = "update_any_person"
    DELETE_ANY_PERSON = "delete_any_person"
    
    # Permisos de expedientes
    CREATE_MEDICAL_HISTORY = "create_medical_history"
    READ_ANY_MEDICAL_HISTORY = "read_any_medical_history"
    READ_OWN_MEDICAL_HISTORY = "read_own_medical_history"
    UPDATE_MEDICAL_HISTORY = "update_medical_history"
    DELETE_MEDICAL_HISTORY = "delete_medical_history"
    
    # Permisos de citas
    CREATE_APPOINTMENT = "create_appointment"
    READ_ANY_APPOINTMENT = "read_any_appointment"
    READ_OWN_APPOINTMENT = "read_own_appointment"
    UPDATE_APPOINTMENT = "update_appointment"
    DELETE_APPOINTMENT = "delete_appointment"
    
    # Permisos de signos vitales
    CREATE_VITAL_SIGNS = "create_vital_signs"
    READ_VITAL_SIGNS = "read_vital_signs"
    UPDATE_VITAL_SIGNS = "update_vital_signs"
    DELETE_VITAL_SIGNS = "delete_vital_signs"
    
    # Permisos administrativos
    VIEW_DASHBOARD = "view_dashboard"
    MANAGE_CATALOGS = "manage_catalogs"

# Mapeo de roles a permisos
ROLE_PERMISSIONS = {
    Roles.ADMIN: [
        # Todos los permisos
        Permissions.CREATE_DOCTOR,
        Permissions.CREATE_PATIENT,
        Permissions.READ_ANY_PERSON,
        Permissions.UPDATE_ANY_PERSON,
        Permissions.DELETE_ANY_PERSON,
        Permissions.CREATE_MEDICAL_HISTORY,
        Permissions.READ_ANY_MEDICAL_HISTORY,
        Permissions.UPDATE_MEDICAL_HISTORY,
        Permissions.DELETE_MEDICAL_HISTORY,
        Permissions.CREATE_APPOINTMENT,
        Permissions.READ_ANY_APPOINTMENT,
        Permissions.UPDATE_APPOINTMENT,
        Permissions.DELETE_APPOINTMENT,
        Permissions.CREATE_VITAL_SIGNS,
        Permissions.READ_VITAL_SIGNS,
        Permissions.UPDATE_VITAL_SIGNS,
        Permissions.DELETE_VITAL_SIGNS,
        Permissions.VIEW_DASHBOARD,
        Permissions.MANAGE_CATALOGS,
    ],
    Roles.DOCTOR: [
        Permissions.CREATE_PATIENT,
        Permissions.READ_ANY_PERSON,
        Permissions.UPDATE_ANY_PERSON,
        Permissions.CREATE_MEDICAL_HISTORY,
        Permissions.READ_ANY_MEDICAL_HISTORY,
        Permissions.UPDATE_MEDICAL_HISTORY,
        Permissions.DELETE_MEDICAL_HISTORY,
        Permissions.CREATE_APPOINTMENT,
        Permissions.READ_ANY_APPOINTMENT,
        Permissions.UPDATE_APPOINTMENT,
        Permissions.DELETE_APPOINTMENT,
        Permissions.CREATE_VITAL_SIGNS,
        Permissions.READ_VITAL_SIGNS,
        Permissions.UPDATE_VITAL_SIGNS,
        Permissions.DELETE_VITAL_SIGNS,
        Permissions.VIEW_DASHBOARD,
    ],
    Roles.PATIENT: [
        Permissions.READ_OWN_MEDICAL_HISTORY,
        Permissions.READ_OWN_APPOINTMENT,
        Permissions.CREATE_APPOINTMENT,  # Puede crear sus propias citas
    ],
    Roles.NURSE: [
        Permissions.READ_ANY_PERSON,
        Permissions.CREATE_VITAL_SIGNS,
        Permissions.READ_VITAL_SIGNS,
        Permissions.UPDATE_VITAL_SIGNS,
        Permissions.READ_ANY_APPOINTMENT,
        Permissions.UPDATE_APPOINTMENT,
        Permissions.VIEW_DASHBOARD,
    ],
    Roles.RECEPTIONIST: [
        Permissions.CREATE_PATIENT,
        Permissions.READ_ANY_PERSON,
        Permissions.UPDATE_ANY_PERSON,
        Permissions.CREATE_APPOINTMENT,
        Permissions.READ_ANY_APPOINTMENT,
        Permissions.UPDATE_APPOINTMENT,
        Permissions.VIEW_DASHBOARD,
    ]
}

def get_user_permissions(user: Person) -> list[str]:
    """
    Obtener permisos de un usuario basado en su rol
    """
    # Mapear person_type a rol  # FIXED: tipo_persona → person_type
    role_mapping = {
        "admin": Roles.ADMIN,
        "doctor": Roles.DOCTOR,
        "patient": Roles.PATIENT,
        "nurse": Roles.NURSE,
        "receptionist": Roles.RECEPTIONIST
    }
    
    role = role_mapping.get(user.person_type, Roles.PATIENT)
    return ROLE_PERMISSIONS.get(role, [])

def has_permission(user: Person, permission: str) -> bool:
    """
    Verificar si un usuario tiene un permiso específico
    """
    user_permissions = get_user_permissions(user)
    return permission in user_permissions

# ============================================================================
# DECORADORES DE PERMISOS
# ============================================================================

def require_permission(permission: str):
    """
    Decorador para requerir un permiso específico
    """
    def decorator(func):
        func.required_permission = permission
        return func
    return decorator

def require_role(role: str):
    """
    Decorador para requerir un rol específico
    """
    def decorator(func):
        func.required_role = role
        return func
    return decorator