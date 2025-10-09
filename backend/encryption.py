"""
Módulo de Cifrado de Datos - NOM-024 y NOM-035 Compliance
Sistema de cifrado AES-256 para datos sensibles médicos
"""
import os
import base64
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.backends import default_backend
import secrets
from typing import Optional, Union, Dict, Any
import json
import hashlib
from datetime import datetime
import logging

# Configurar logging para auditoría
logger = logging.getLogger(__name__)

# ============================================================================
# ENCRYPTION SERVICE
# ============================================================================

class EncryptionService:
    """Servicio de cifrado para datos médicos sensibles"""
    
    def __init__(self, master_key: Optional[str] = None):
        """
        Inicializa el servicio de cifrado
        
        Args:
            master_key: Clave maestra para cifrado. Si no se proporciona, se genera una nueva
        """
        if master_key:
            self.master_key = master_key.encode()
        else:
            # Generar clave maestra desde variable de entorno o crear nueva
            env_key = os.getenv('MEDICAL_ENCRYPTION_KEY')
            if env_key:
                self.master_key = env_key.encode()
            else:
                # En producción, esta clave debe ser generada y almacenada de forma segura
                self.master_key = self._generate_master_key()
                logger.warning("🔐 Nueva clave de cifrado generada. Guarde en variable de entorno MEDICAL_ENCRYPTION_KEY")
    
    def _generate_master_key(self) -> bytes:
        """Genera una clave maestra de 32 bytes (256 bits)"""
        return secrets.token_bytes(32)
    
    def _derive_key(self, salt: bytes) -> bytes:
        """Deriva una clave de cifrado a partir de la clave maestra y sal"""
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=salt,
            iterations=100000,
            backend=default_backend()
        )
        return kdf.derive(self.master_key)
    
    def encrypt_sensitive_data(self, data: str) -> str:
        """
        Cifra datos sensibles usando AES-256-GCM
        
        Args:
            data: Datos a cifrar (string)
            
        Returns:
            String codificado en base64 que contiene sal + IV + datos cifrados + tag
        """
        if not data:
            return ""
        
        # Generar sal aleatoria de 16 bytes
        salt = secrets.token_bytes(16)
        
        # Derivar clave de cifrado
        key = self._derive_key(salt)
        
        # Generar IV aleatorio de 12 bytes para GCM
        iv = secrets.token_bytes(12)
        
        # Crear cifrador AES-GCM
        cipher = Cipher(algorithms.AES(key), modes.GCM(iv), backend=default_backend())
        encryptor = cipher.encryptor()
        
        # Cifrar datos
        ciphertext = encryptor.update(data.encode('utf-8')) + encryptor.finalize()
        
        # Obtener tag de autenticación
        tag = encryptor.tag
        
        # Combinar sal + IV + ciphertext + tag
        encrypted_data = salt + iv + ciphertext + tag
        
        # Codificar en base64 para almacenamiento
        return base64.b64encode(encrypted_data).decode('utf-8')
    
    def decrypt_sensitive_data(self, encrypted_data: str) -> str:
        """
        Descifra datos sensibles
        
        Args:
            encrypted_data: Datos cifrados codificados en base64
            
        Returns:
            Datos descifrados como string
        """
        if not encrypted_data:
            return ""
        
        try:
            # Decodificar base64
            data = base64.b64decode(encrypted_data.encode('utf-8'))
            
            # Extraer componentes
            salt = data[:16]
            iv = data[16:28]
            ciphertext = data[28:-16]
            tag = data[-16:]
            
            # Derivar clave
            key = self._derive_key(salt)
            
            # Crear descifrador
            cipher = Cipher(algorithms.AES(key), modes.GCM(iv, tag), backend=default_backend())
            decryptor = cipher.decryptor()
            
            # Descifrar datos
            plaintext = decryptor.update(ciphertext) + decryptor.finalize()
            
            return plaintext.decode('utf-8')
            
        except Exception as e:
            logger.error(f"Error al descifrar datos: {e}")
            raise Exception("Error al descifrar datos sensibles")
    
    def hash_sensitive_field(self, data: str) -> str:
        """
        Crea hash SHA-256 de datos sensibles para búsquedas
        
        Args:
            data: Datos a hacer hash
            
        Returns:
            Hash SHA-256 en hexadecimal
        """
        if not data:
            return ""
        
        return hashlib.sha256(data.encode('utf-8')).hexdigest()

# ============================================================================
# CAMPO CIFRADO PARA BASE DE DATOS
# ============================================================================

class EncryptedField:
    """Campo de base de datos que se cifra automáticamente"""
    
    def __init__(self, encryption_service: EncryptionService):
        self.encryption_service = encryption_service
    
    def encrypt(self, value: Any) -> Optional[str]:
        """Cifra un valor para almacenamiento"""
        if value is None:
            return None
        
        if isinstance(value, (dict, list)):
            value = json.dumps(value, ensure_ascii=False)
        else:
            value = str(value)
        
        return self.encryption_service.encrypt_sensitive_data(value)
    
    def decrypt(self, encrypted_value: Optional[str]) -> Optional[str]:
        """Descifra un valor de la base de datos"""
        if not encrypted_value:
            return None
        
        return self.encryption_service.decrypt_sensitive_data(encrypted_value)

# ============================================================================
# MIXINS PARA MODELOS DE BASE DE DATOS
# ============================================================================

class EncryptionMixin:
    """Mixin para agregar capacidades de cifrado a modelos"""
    
    # Campos que deben ser cifrados
    ENCRYPTED_FIELDS = []
    
    @classmethod
    def get_encryption_service(cls):
        """Obtiene el servicio de cifrado"""
        if not hasattr(cls, '_encryption_service'):
            cls._encryption_service = EncryptionService()
        return cls._encryption_service
    
    def encrypt_field(self, field_name: str, value: Any) -> str:
        """Cifra un campo específico"""
        encryption_service = self.get_encryption_service()
        encrypted_field = EncryptedField(encryption_service)
        return encrypted_field.encrypt(value)
    
    def decrypt_field(self, field_name: str, encrypted_value: str) -> str:
        """Descifra un campo específico"""
        encryption_service = self.get_encryption_service()
        encrypted_field = EncryptedField(encryption_service)
        return encrypted_field.decrypt(encrypted_value)
    
    def before_save(self):
        """Cifra campos sensibles antes de guardar"""
        for field_name in self.ENCRYPTED_FIELDS:
            if hasattr(self, field_name):
                value = getattr(self, field_name)
                if value:
                    encrypted_value = self.encrypt_field(field_name, value)
                    setattr(self, f"{field_name}_encrypted", encrypted_value)
    
    def after_load(self):
        """Descifra campos después de cargar de la base de datos"""
        for field_name in self.ENCRYPTED_FIELDS:
            encrypted_field_name = f"{field_name}_encrypted"
            if hasattr(self, encrypted_field_name):
                encrypted_value = getattr(self, encrypted_field_name)
                if encrypted_value:
                    decrypted_value = self.decrypt_field(field_name, encrypted_value)
                    setattr(self, field_name, decrypted_value)

# ============================================================================
# CONFIGURACIÓN DE CAMPOS SENSIBLES
# ============================================================================

class MedicalDataEncryption:
    """Configuración de cifrado para datos médicos"""
    
    # Campos de paciente que requieren cifrado
    PATIENT_ENCRYPTED_FIELDS = [
        'curp',  # CURP es datos personales sensibles
        'phone',  # Teléfonos son datos personales
        'email',  # Emails son datos personales
        'address',  # Direcciones son datos sensibles
        'emergency_contact',  # Contactos de emergencia
        'insurance_number',  # Números de seguro
    ]
    
    # Campos de doctor que requieren cifrado
    DOCTOR_ENCRYPTED_FIELDS = [
        'curp',  # CURP del médico
        'rfc',   # RFC del médico
        'phone',  # Teléfonos personales
        'personal_email',  # Email personal
        'digital_signature',  # Firma digital
    ]
    
    # Campos de consulta que requieren cifrado
    CONSULTATION_ENCRYPTED_FIELDS = [
        'chief_complaint',  # Motivo de consulta
        'history_present_illness',  # Historia de enfermedad actual
        'family_history',  # Antecedentes familiares
        'personal_pathological_history',  # Antecedentes patológicos
        'personal_non_pathological_history',  # Antecedentes no patológicos
        'physical_examination',  # Exploración física
        'primary_diagnosis',  # Diagnóstico principal
        'secondary_diagnoses',  # Diagnósticos secundarios
        'treatment_plan',  # Plan de tratamiento
        'prescribed_medications',  # Medicamentos prescritos
        'notes',  # Notas adicionales
    ]
    
    @staticmethod
    def get_encryption_level(field_name: str) -> str:
        """
        Determina el nivel de cifrado requerido para un campo
        
        Returns:
            'high': Cifrado AES-256 + hash para búsqueda
            'medium': Cifrado AES-256 
            'low': Hash únicamente
            'none': Sin cifrado
        """
        
        # Datos médicos críticos - cifrado alto
        high_security_fields = [
            'chief_complaint', 'history_present_illness', 'family_history',
            'personal_pathological_history', 'physical_examination',
            'primary_diagnosis', 'treatment_plan', 'prescribed_medications'
        ]
        
        # Datos personales sensibles - cifrado medio
        medium_security_fields = [
            'curp', 'rfc', 'phone', 'email', 'address', 'digital_signature'
        ]
        
        # Datos para búsqueda - hash únicamente
        searchable_fields = [
            'patient_name', 'doctor_name'
        ]
        
        if field_name in high_security_fields:
            return 'high'
        elif field_name in medium_security_fields:
            return 'medium'
        elif field_name in searchable_fields:
            return 'low'
        else:
            return 'none'

# ============================================================================
# UTILIDADES DE MIGRACIÓN
# ============================================================================

class EncryptionMigration:
    """Utilidades para migrar datos existentes a formato cifrado"""
    
    @staticmethod
    def migrate_table_to_encrypted(db_session, model_class, encryption_service: EncryptionService):
        """
        Migra una tabla completa a formato cifrado
        
        Args:
            db_session: Sesión de base de datos
            model_class: Clase del modelo a migrar
            encryption_service: Servicio de cifrado
        """
        logger.info(f"Iniciando migración de cifrado para {model_class.__name__}")
        
        # Obtener todos los registros
        records = db_session.query(model_class).all()
        
        encrypted_field = EncryptedField(encryption_service)
        
        for record in records:
            try:
                # Cifrar campos sensibles
                if hasattr(model_class, 'ENCRYPTED_FIELDS'):
                    for field_name in model_class.ENCRYPTED_FIELDS:
                        if hasattr(record, field_name):
                            value = getattr(record, field_name)
                            if value and not value.startswith('gAAAAA'):  # No cifrar si ya está cifrado
                                encrypted_value = encrypted_field.encrypt(value)
                                setattr(record, field_name, encrypted_value)
                
                db_session.commit()
                logger.info(f"Registro {record.id} migrado exitosamente")
                
            except Exception as e:
                logger.error(f"Error migrando registro {record.id}: {e}")
                db_session.rollback()
        
        logger.info(f"Migración de {model_class.__name__} completada")

# ============================================================================
# INICIALIZACIÓN
# ============================================================================

# Instancia global del servicio de cifrado
encryption_service = EncryptionService()

def get_encryption_service() -> EncryptionService:
    """Obtiene la instancia global del servicio de cifrado"""
    return encryption_service

def init_encryption_key():
    """Inicializa la clave de cifrado desde variables de entorno"""
    master_key = os.getenv('MEDICAL_ENCRYPTION_KEY')
    if not master_key:
        logger.warning("⚠️  MEDICAL_ENCRYPTION_KEY no configurada. Generando clave temporal.")
        logger.warning("   En producción, configure esta variable de entorno con una clave segura.")
    
    return EncryptionService(master_key)
