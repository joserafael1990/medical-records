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

from database import Person, PersonDocument, Document, DocumentType
import secrets
import hashlib

# ============================================================================
# CONFIGURACIÓN DE SEGURIDAD
# ============================================================================

# Configuración JWT (desde config - evita problemas de filesystem en Docker macOS)
from config import settings
import os
import secrets

# Get JWT secret key with fallback to auto-generation if empty
_jwt_secret = settings.JWT_SECRET_KEY or os.getenv("JWT_SECRET_KEY", "")
if not _jwt_secret or _jwt_secret.strip() == "":
    # Auto-generate secure key if not provided
    _jwt_secret = secrets.token_urlsafe(64)

SECRET_KEY = _jwt_secret
ALGORITHM = settings.JWT_ALGORITHM
ACCESS_TOKEN_EXPIRE_MINUTES = settings.ACCESS_TOKEN_EXPIRE_MINUTES
REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv("JWT_REFRESH_TOKEN_EXPIRE_DAYS", "7"))

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"])

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
    if not user.hashed_password:
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
        return None
    
    # Try to get user_id first (more reliable)
    user_id = payload.get("user_id")
    if user_id is not None:
        user = db.query(Person).filter(Person.id == user_id).first()
        if user:
            return user
    
    # Standard JWT: 'sub' contains the user ID (subject)
    user_id_from_sub = payload.get("sub")
    if user_id_from_sub is not None:
        try:
            # Convert to integer if it's a string
            user_id = int(user_id_from_sub)
            user = db.query(Person).filter(Person.id == user_id).first()
            if user:
                return user
        except (ValueError, TypeError):
            # If sub is not a number, try as username (fallback)
            user = db.query(Person).filter(Person.username == str(user_id_from_sub)).first()
            if user:
                return user
            
    return None

# ============================================================================
# FUNCIONES DE LOGIN/LOGOUT
# ============================================================================

def login_user(db: Session, email: str, password: str) -> Dict[str, Any]:
    """
    Realizar login completo y generar tokens
    Usa email como identificador único - estándar moderno
    """
    # #region agent log
    import json
    import os
    # Detect if running in Docker container or host
    if os.path.exists('/app/.cursor'):
        log_path = "/app/.cursor/debug.log"
    else:
        log_path = "/Users/rafaelgarcia/Documents/Software projects/medical-records-main/.cursor/debug.log"
    try:
        with open(log_path, "a") as f:
            f.write(json.dumps({"timestamp": __import__("time").time() * 1000, "location": "auth.py:168", "message": "login_user called", "data": {"email": email}, "sessionId": "debug-session", "runId": "run1", "hypothesisId": "ALL"}) + "\n")
    except: pass
    # #endregion
    user = authenticate_user(db, email, password)
    # #region agent log
    try:
        with open(log_path, "a") as f:
            f.write(json.dumps({"timestamp": __import__("time").time() * 1000, "location": "auth.py:173", "message": "After authenticate_user", "data": {"user_found": bool(user), "user_id": user.id if user else None}, "sessionId": "debug-session", "runId": "run1", "hypothesisId": "ALL"}) + "\n")
    except: pass
    # #endregion
    if not user:
        raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales inválidas",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    # Crear payload para tokens - ALL ENGLISH FIELD NAMES
    token_data = {
        "sub": user.email,  # Use email as username/subject
        "user_id": user.id,
        "person_type": user.person_type,   # ENGLISH: tipo_persona → person_type
        "person_code": user.person_code    # ENGLISH: codigo_persona → person_code
    }
    # #region agent log
    try:
        with open(log_path, "a") as f:
            f.write(json.dumps({"timestamp": __import__("time").time() * 1000, "location": "auth.py:187", "message": "Before creating tokens", "data": {"has_secret_key": bool(SECRET_KEY), "secret_key_length": len(SECRET_KEY) if SECRET_KEY else 0}, "sessionId": "debug-session", "runId": "run1", "hypothesisId": "D"}) + "\n")
    except: pass
    # #endregion
    
    # Generar tokens
    access_token = create_access_token(data=token_data)
    # #region agent log
    try:
        with open(log_path, "a") as f:
            f.write(json.dumps({"timestamp": __import__("time").time() * 1000, "location": "auth.py:190", "message": "After create_access_token", "data": {"access_token_created": bool(access_token)}, "sessionId": "debug-session", "runId": "run1", "hypothesisId": "D"}) + "\n")
    except: pass
    # #endregion
    refresh_token = create_refresh_token(data=token_data)
    # #region agent log
    try:
        with open(log_path, "a") as f:
            f.write(json.dumps({"timestamp": __import__("time").time() * 1000, "location": "auth.py:191", "message": "After create_refresh_token", "data": {"refresh_token_created": bool(refresh_token)}, "sessionId": "debug-session", "runId": "run1", "hypothesisId": "D"}) + "\n")
    except: pass
    # #endregion
    
    # Crear objeto usuario base - ALL ENGLISH FIELD NAMES
    user_data = {
        "id": user.id,
        "username": user.email,  # Use email as username
        "person_code": user.person_code,     # ENGLISH: codigo_persona → person_code
        "person_type": user.person_type,     # ENGLISH: tipo_persona → person_type
        "full_name": user.full_name,
        "email": user.email,
        # Campos adicionales de Persona
        "name": user.name,
        "title": user.title if hasattr(user, 'title') and user.title else None,  # Doctor title (Dr., Dra., etc.)
        "birth_date": user.birth_date.isoformat() if user.birth_date else None,
        "primary_phone": user.primary_phone,  # ✅ UNIFICADO
    }
    
    # Si es doctor, agregar campos profesionales
    if user.person_type == "doctor":  # FIXED: tipo_persona → person_type
        # #region agent log
        try:
            with open(log_path, "a") as f:
                f.write(json.dumps({"timestamp": __import__("time").time() * 1000, "location": "auth.py:209", "message": "Processing doctor documents", "data": {"user_id": user.id}, "sessionId": "debug-session", "runId": "run1", "hypothesisId": "B"}) + "\n")
        except: pass
        # #endregion
        # Get professional documents from person_documents table
        professional_type = db.query(DocumentType).filter(DocumentType.name == 'Profesional').first()
        # #region agent log
        try:
            with open(log_path, "a") as f:
                f.write(json.dumps({"timestamp": __import__("time").time() * 1000, "location": "auth.py:212", "message": "After querying professional_type", "data": {"professional_type_found": bool(professional_type)}, "sessionId": "debug-session", "runId": "run1", "hypothesisId": "B"}) + "\n")
        except: pass
        # #endregion
        professional_documents = []
        if professional_type:
            professional_docs = db.query(PersonDocument).join(Document).filter(
                PersonDocument.person_id == user.id,
                PersonDocument.is_active == True,
                Document.document_type_id == professional_type.id
            ).all()
            # #region agent log
            try:
                with open(log_path, "a") as f:
                    f.write(json.dumps({"timestamp": __import__("time").time() * 1000, "location": "auth.py:218", "message": "After querying professional_docs", "data": {"doc_count": len(professional_docs)}, "sessionId": "debug-session", "runId": "run1", "hypothesisId": "B"}) + "\n")
            except: pass
            # #endregion
            professional_documents = [{"document_name": doc.document.name, "document_value": doc.document_value} for doc in professional_docs]
        
        # Get personal documents (for CURP, RFC)
        personal_type = db.query(DocumentType).filter(DocumentType.name == 'Personal').first()
        # #region agent log
        try:
            with open(log_path, "a") as f:
                f.write(json.dumps({"timestamp": __import__("time").time() * 1000, "location": "auth.py:222", "message": "After querying personal_type", "data": {"personal_type_found": bool(personal_type)}, "sessionId": "debug-session", "runId": "run1", "hypothesisId": "B"}) + "\n")
        except: pass
        # #endregion
        personal_documents = {}  # Initialize as dict, not list
        if personal_type:
            personal_docs = db.query(PersonDocument).join(Document).filter(
                PersonDocument.person_id == user.id,
                PersonDocument.is_active == True,
                Document.document_type_id == personal_type.id
            ).all()
            # #region agent log
            try:
                with open(log_path, "a") as f:
                    f.write(json.dumps({"timestamp": __import__("time").time() * 1000, "location": "auth.py:229", "message": "After querying personal_docs", "data": {"doc_count": len(personal_docs)}, "sessionId": "debug-session", "runId": "run1", "hypothesisId": "B"}) + "\n")
            except: pass
            # #endregion
            personal_documents = {doc.document.name: doc.document_value for doc in personal_docs}
        
        # Legacy fields for backward compatibility (get from documents)
        professional_license = None
        for doc in professional_documents:
            if doc["document_name"] in ["Cédula Profesional", "Número de Colegiación", "Matrícula Nacional"]:
                professional_license = doc["document_value"]
                break
        
        # Safely get specialty name
        specialty_name = None
        try:
            # #region agent log
            try:
                with open(log_path, "a") as f:
                    f.write(json.dumps({"timestamp": __import__("time").time() * 1000, "location": "auth.py:241", "message": "Before accessing user.specialty", "data": {"has_specialty_id": bool(user.specialty_id)}, "sessionId": "debug-session", "runId": "run1", "hypothesisId": "C"}) + "\n")
            except: pass
            # #endregion
            if user.specialty:
                specialty_name = getattr(user.specialty, 'name', None)
                # #region agent log
                try:
                    with open(log_path, "a") as f:
                        f.write(json.dumps({"timestamp": __import__("time").time() * 1000, "location": "auth.py:243", "message": "After accessing user.specialty", "data": {"specialty_name": specialty_name}, "sessionId": "debug-session", "runId": "run1", "hypothesisId": "C"}) + "\n")
                except: pass
                # #endregion
        except Exception as specialty_error:
            # #region agent log
            try:
                with open(log_path, "a") as f:
                    f.write(json.dumps({"timestamp": __import__("time").time() * 1000, "location": "auth.py:245", "message": "Exception accessing user.specialty", "data": {"error_type": type(specialty_error).__name__, "error_message": str(specialty_error)}, "sessionId": "debug-session", "runId": "run1", "hypothesisId": "C"}) + "\n")
            except: pass
            # #endregion
            # If relationship fails to load, just use None
            specialty_name = None
        
        user_data.update({
            "professional_license": professional_license,  # Legacy field from documents
            "professional_documents": professional_documents,  # New normalized format
            "personal_documents": personal_documents,  # CURP, RFC, etc.
            "specialty": specialty_name,      # ENGLISH: especialidad → specialty
            "university": user.university,
            "graduation_year": user.graduation_year,
            "subspecialty": user.subspecialty if hasattr(user, 'subspecialty') else None,
            "office_address": None,  # Moved to offices table
            "curp": personal_documents.get("CURP", None),  # From documents
            "rfc": personal_documents.get("RFC", None),  # From documents
        })
    
    # #region agent log
    try:
        with open(log_path, "a") as f:
            f.write(json.dumps({"timestamp": __import__("time").time() * 1000, "location": "auth.py:261", "message": "Before returning login_user result", "data": {"has_access_token": bool(access_token), "has_refresh_token": bool(refresh_token), "has_user_data": bool(user_data)}, "sessionId": "debug-session", "runId": "run1", "hypothesisId": "ALL"}) + "\n")
    except: pass
    # #endregion
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

# ============================================================================
# PASSWORD RESET FUNCTIONS
# ============================================================================

def create_password_reset_token(user_id: int, email: str) -> str:
    """
    Crear token JWT para recuperación de contraseña
    Expira en 1 hora
    """
    expire = datetime.now(timezone.utc) + timedelta(hours=1)
    
    to_encode = {
        "exp": expire,
        "iat": datetime.now(timezone.utc),
        "type": "password_reset",
        "user_id": user_id,
        "email": email
    }
    
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def verify_password_reset_token(token: str) -> Optional[Dict[str, Any]]:
    """
    Verificar token de recuperación de contraseña
    Retorna payload si es válido, None si no
    """
    try:
        payload = verify_token(token, token_type="password_reset")
        if payload is None:
            return None
        
        # Verificar que tenga los campos necesarios
        if "user_id" not in payload or "email" not in payload:
            return None
            
        return payload
    except Exception:
        return None

def reset_user_password(db: Session, user_id: int, new_password: str) -> bool:
    """
    Cambiar la contraseña de un usuario.
    Usa el mismo hashing que registro (bcrypt) para que login verifique correctamente.
    """
    uid = int(user_id) if user_id is not None else None
    if uid is None:
        return False
    user = db.query(Person).filter(Person.id == uid).first()
    if not user:
        return False

    # Strip to avoid mismatch with login (same as registration)
    password_clean = (new_password or "").strip()
    if not password_clean:
        return False

    # Use same hashing as registration (crud/base) so login verification matches
    from crud.base import hash_password as bcrypt_hash
    user.hashed_password = bcrypt_hash(password_clean)
    db.commit()

    return True