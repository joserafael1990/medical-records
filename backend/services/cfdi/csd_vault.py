"""CSD (Certificado de Sello Digital) vault.

Los CSDs son archivos binarios emitidos por el SAT (.cer + .key + password) que
autorizan al emisor a sellar CFDIs. Se guardan cifrados con AES-256-GCM usando
la misma clave maestra (MEDICAL_ENCRYPTION_KEY) que protege PHI. Nunca se
persisten en claro en la base de datos.

Convención de almacenamiento:
  - .cer/.key (binarios DER) → base64 → cifrado → TEXT
  - password (string)        → cifrado directo → TEXT

Para entregarlos a Facturama (que los acepta como base64), descifras y devuelves
el base64 original — no necesitas volver a codificar.
"""
from __future__ import annotations

import base64
import binascii

from encryption import EncryptionService


class CsdVaultError(ValueError):
    pass


class CsdVault:
    """Wrapper mínimo sobre EncryptionService para CSDs."""

    def __init__(self, encryption_service: EncryptionService | None = None) -> None:
        self._svc = encryption_service or EncryptionService()

    # ---- Binarios (.cer / .key) -----------------------------------

    def encrypt_binary(self, data: bytes) -> str:
        """Cifra bytes; retorna string para columna TEXT."""
        if not data:
            raise CsdVaultError("CSD file is empty")
        b64 = base64.b64encode(data).decode("ascii")
        return self._svc.encrypt_sensitive_data(b64)

    def decrypt_to_base64(self, ciphertext: str) -> str:
        """Descifra y retorna la representación base64 original (lista para Facturama)."""
        if not ciphertext:
            raise CsdVaultError("Missing encrypted CSD")
        b64 = self._svc.decrypt_sensitive_data(ciphertext)
        if not b64:
            raise CsdVaultError("Decryption failed")
        # Validación superficial — base64 válido
        try:
            base64.b64decode(b64, validate=True)
        except binascii.Error as e:
            raise CsdVaultError(f"Decrypted data is not valid base64: {e}")
        return b64

    # ---- Password ------------------------------------------------

    def encrypt_password(self, password: str) -> str:
        if not password:
            raise CsdVaultError("CSD password cannot be empty")
        return self._svc.encrypt_sensitive_data(password)

    def decrypt_password(self, ciphertext: str) -> str:
        if not ciphertext:
            raise CsdVaultError("Missing encrypted password")
        plain = self._svc.decrypt_sensitive_data(ciphertext)
        if not plain:
            raise CsdVaultError("Password decryption failed")
        return plain
