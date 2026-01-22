"""
Security utilities for consultation service - encryption, decryption, and digital signatures
"""
from typing import Dict, Any
from datetime import datetime
import secrets
from encryption import encryption_service, MedicalDataEncryption
from logger import get_logger

api_logger = get_logger("medical_records.api")

def encrypt_sensitive_data(data: Dict[str, Any], type_str: str) -> Dict[str, Any]:
    """
    Encrypt sensitive fields in a dictionary
    """
    encrypted = data.copy()
    
    fields_to_encrypt = []
    if type_str == "consultation":
        fields_to_encrypt = MedicalDataEncryption.CONSULTATION_ENCRYPTED_FIELDS
    elif type_str == "patient":
        fields_to_encrypt = MedicalDataEncryption.PATIENT_ENCRYPTED_FIELDS
        
    for field in fields_to_encrypt:
        if field in encrypted and encrypted[field]:
            encrypted[field] = encryption_service.encrypt_sensitive_data(str(encrypted[field]))
            
    return encrypted

def decrypt_sensitive_data(data: Dict[str, Any], type_str: str) -> Dict[str, Any]:
    """
    Decrypt sensitive fields in a dictionary
    """
    decrypted = data.copy()
    
    # Try to decrypt all string values that look encrypted
    for key, value in decrypted.items():
        if isinstance(value, str) and len(value) > 50:  # Simple heuristic
             try:
                 decrypted_val = encryption_service.decrypt_sensitive_data(value)
                 if decrypted_val != value:
                     decrypted[key] = decrypted_val
             except:
                 pass
                 
    return decrypted

def sign_medical_document(data: Dict[str, Any], user_id: int, doc_type: str) -> Dict[str, Any]:
    """
    Mock digital signature for medical documents
    """
    from services.consultations.timezone_utils import now_cdmx
    
    signature_id = secrets.token_hex(16)
    timestamp = now_cdmx().isoformat()
    
    return {
        "signatures": [
            {
                "signature_id": signature_id,
                "signer_id": user_id,
                "timestamp": timestamp,
                "type": doc_type
            }
        ],
        "last_signature_timestamp": timestamp
    }
