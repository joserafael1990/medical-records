#!/usr/bin/env python3
"""
Configuración segura para Historias Clínicas
Variables de entorno y configuración centralizada
"""

import os
import secrets
from typing import Optional

# ============================================================================
# CONFIGURACIÓN JWT SEGURA
# ============================================================================

def get_jwt_secret_key() -> str:
    """
    Obtener JWT secret key de manera segura
    Prioridad: ENV > archivo > generada
    """
    # 1. Intentar desde variable de entorno
    env_key = os.getenv("JWT_SECRET_KEY")
    if env_key:
        return env_key
    
    # 2. Generar key aleatoria para desarrollo si no existe
    # Esto evita tener secretos hardcodeados en el código
    import secrets
    dev_key = secrets.token_urlsafe(64)
    
    return dev_key

# Configuración JWT
JWT_SECRET_KEY = get_jwt_secret_key()
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
JWT_ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("JWT_ACCESS_TOKEN_EXPIRE_MINUTES", "525600"))  # 365 días = 525,600 minutos
JWT_REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv("JWT_REFRESH_TOKEN_EXPIRE_DAYS", "7"))

# ============================================================================
# CONFIGURACIÓN DE BASE DE DATOS
# ============================================================================

DATABASE_URL = os.getenv(
    "DATABASE_URL", 
    "postgresql://historias_user:historias_pass@localhost:5432/historias_clinicas"
)

# ============================================================================
# CREDENCIALES DEFAULT (SOLO DESARROLLO)
# ============================================================================

DEFAULT_ADMIN_USERNAME = os.getenv("DEFAULT_ADMIN_USERNAME", "admin")
DEFAULT_ADMIN_PASSWORD = os.getenv("DEFAULT_ADMIN_PASSWORD", "") # Debe configurarse vía ENV

# ============================================================================
# CONFIGURACIÓN GENERAL
# ============================================================================

ENVIRONMENT = os.getenv("ENVIRONMENT", "development")
DEBUG = ENVIRONMENT == "development"

# Configuración CORS
CORS_ORIGINS = [
    "http://localhost:3000",
    "http://localhost:3001", 
    "http://127.0.0.1:3000",
    "http://127.0.0.1:3001"
]

# ============================================================================
# FUNCIONES DE UTILIDAD
# ============================================================================

def is_production() -> bool:
    """Verificar si estamos en producción"""
    return ENVIRONMENT == "production"

def generate_secret_key() -> str:
    """Generar una nueva secret key segura"""
    return secrets.token_urlsafe(64)

def validate_config() -> bool:
    """Validar que la configuración sea segura"""
    if is_production():
        # En producción, verificar que las keys estén configuradas
        if not JWT_SECRET_KEY or len(JWT_SECRET_KEY) < 32:
            raise ValueError("⚠️ SECURITY: JWT_SECRET_KEY insegura o no configurada en producción!")
        
        if not DEFAULT_ADMIN_PASSWORD:
            raise ValueError("⚠️ SECURITY: DEFAULT_ADMIN_PASSWORD no configurada en producción!")
    
    return True

# Validar configuración al importar
validate_config()


