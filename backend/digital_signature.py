"""
Módulo de Firma Digital - NOM-004 y NOM-024 Compliance
Sistema de firma digital para documentos médicos
"""
import os
import base64
import hashlib
from datetime import datetime, timezone
from typing import Dict, Any, Optional, List, Union
from dataclasses import dataclass
import json
import uuid

from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa, padding
from cryptography.hazmat.primitives.serialization import pkcs12
from cryptography import x509
from cryptography.x509.oid import NameOID, ExtensionOID
import secrets

# ============================================================================
# DIGITAL SIGNATURE MODELS
# ============================================================================

@dataclass
class DigitalSignature:
    """Modelo de firma digital"""
    signature_id: str
    document_hash: str
    signature_value: str
    timestamp: str
    signer_certificate: str
    algorithm: str = "SHA256withRSA"
    status: str = "valid"  # valid, invalid, revoked, expired

@dataclass
class SigningCertificate:
    """Certificado de firma"""
    certificate_id: str
    subject_name: str
    issuer_name: str
    serial_number: str
    not_before: str
    not_after: str
    public_key: str
    certificate_pem: str
    key_usage: List[str]
    is_active: bool = True

@dataclass
class DocumentSignature:
    """Firma de documento médico"""
    document_id: str
    document_type: str  # consultation, prescription, certificate, etc.
    signatures: List[DigitalSignature]
    document_hash: str
    creation_timestamp: str
    last_signature_timestamp: str

# ============================================================================
# DIGITAL SIGNATURE SERVICE
# ============================================================================

class DigitalSignatureService:
    """Servicio de firma digital para documentos médicos"""
    
    def __init__(self):
        self.key_size = 2048  # RSA 2048 bits mínimo
        self.hash_algorithm = hashes.SHA256()
        
    def generate_key_pair(self) -> tuple:
        """
        Genera un par de claves RSA para firma digital
        
        Returns:
            tuple: (private_key, public_key)
        """
        private_key = rsa.generate_private_key(
            public_exponent=65537,
            key_size=self.key_size
        )
        public_key = private_key.public_key()
        
        return private_key, public_key
    
    def create_self_signed_certificate(
        self, 
        private_key, 
        doctor_info: Dict[str, str],
        validity_days: int = 365
    ) -> x509.Certificate:
        """
        Crea un certificado autofirmado para el médico
        
        Args:
            private_key: Clave privada RSA
            doctor_info: Información del médico (nombre, CURP, cédula, etc.)
            validity_days: Días de validez del certificado
            
        Returns:
            Certificado X.509
        """
        # Información del sujeto
        subject_name = x509.Name([
            x509.NameAttribute(NameOID.COUNTRY_NAME, "MX"),
            x509.NameAttribute(NameOID.STATE_OR_PROVINCE_NAME, doctor_info.get("state", "CDMX")),
            x509.NameAttribute(NameOID.LOCALITY_NAME, doctor_info.get("city", "Ciudad de México")),
            x509.NameAttribute(NameOID.ORGANIZATION_NAME, "Sistema Médico CORTEX"),
            x509.NameAttribute(NameOID.ORGANIZATIONAL_UNIT_NAME, "Médicos Certificados"),
            x509.NameAttribute(NameOID.COMMON_NAME, doctor_info["full_name"]),
            x509.NameAttribute(NameOID.EMAIL_ADDRESS, doctor_info["email"]),
            # Campos específicos mexicanos
            x509.NameAttribute(x509.oid.NameOID.SERIAL_NUMBER, doctor_info["professional_license"]),
        ])
        
        # Crear certificado
        cert_builder = x509.CertificateBuilder()
        cert_builder = cert_builder.subject_name(subject_name)
        cert_builder = cert_builder.issuer_name(subject_name)  # Autofirmado
        cert_builder = cert_builder.public_key(private_key.public_key())
        cert_builder = cert_builder.serial_number(int.from_bytes(secrets.token_bytes(16), 'big'))
        
        # Fechas de validez
        now = datetime.now(timezone.utc)
        cert_builder = cert_builder.not_valid_before(now)
        cert_builder = cert_builder.not_valid_after(now.replace(year=now.year + (validity_days // 365)))
        
        # Extensiones del certificado
        cert_builder = cert_builder.add_extension(
            x509.SubjectAlternativeName([
                x509.RFC822Name(doctor_info["email"]),
                x509.DirectoryName(x509.Name([
                    x509.NameAttribute(x509.oid.NameOID.COMMON_NAME, f"CURP:{doctor_info.get('curp', '')}")
                ]))
            ]),
            critical=False,
        )
        
        # Uso de la clave para firma digital
        cert_builder = cert_builder.add_extension(
            x509.KeyUsage(
                digital_signature=True,
                key_encipherment=False,
                key_agreement=False,
                key_cert_sign=False,
                crl_sign=False,
                content_commitment=True,  # Non-repudiation
                data_encipherment=False,
                encipher_only=False,
                decipher_only=False
            ),
            critical=True,
        )
        
        # Propósito extendido del uso de la clave
        cert_builder = cert_builder.add_extension(
            x509.ExtendedKeyUsage([
                x509.oid.ExtendedKeyUsageOID.CODE_SIGNING,
                x509.oid.ExtendedKeyUsageOID.EMAIL_PROTECTION,
            ]),
            critical=True,
        )
        
        # Firmar el certificado
        certificate = cert_builder.sign(private_key, hashes.SHA256())
        
        return certificate
    
    def export_pkcs12(
        self, 
        private_key, 
        certificate, 
        password: str
    ) -> bytes:
        """
        Exporta el certificado y clave privada en formato PKCS#12
        
        Args:
            private_key: Clave privada
            certificate: Certificado X.509
            password: Contraseña para proteger el archivo
            
        Returns:
            Datos PKCS#12 en formato bytes
        """
        p12 = pkcs12.serialize_key_and_certificates(
            name=b"Medical Digital Certificate",
            key=private_key,
            cert=certificate,
            cas=None,
            encryption_algorithm=serialization.BestAvailableEncryption(password.encode())
        )
        
        return p12
    
    def load_certificate_from_pkcs12(
        self, 
        p12_data: bytes, 
        password: str
    ) -> tuple:
        """
        Carga certificado y clave privada desde archivo PKCS#12
        
        Args:
            p12_data: Datos PKCS#12
            password: Contraseña del archivo
            
        Returns:
            tuple: (private_key, certificate, additional_certificates)
        """
        return pkcs12.load_key_and_certificates(p12_data, password.encode())
    
    def calculate_document_hash(self, document_content: Union[str, bytes]) -> str:
        """
        Calcula hash SHA-256 del documento
        
        Args:
            document_content: Contenido del documento
            
        Returns:
            Hash en hexadecimal
        """
        if isinstance(document_content, str):
            document_content = document_content.encode('utf-8')
        
        return hashlib.sha256(document_content).hexdigest()
    
    def sign_document(
        self, 
        document_content: Union[str, bytes],
        private_key,
        certificate
    ) -> DigitalSignature:
        """
        Firma un documento médico
        
        Args:
            document_content: Contenido del documento a firmar
            private_key: Clave privada para firma
            certificate: Certificado del firmante
            
        Returns:
            Objeto DigitalSignature
        """
        # Calcular hash del documento
        document_hash = self.calculate_document_hash(document_content)
        
        # Firmar el hash
        signature_bytes = private_key.sign(
            document_hash.encode('utf-8'),
            padding.PSS(
                mgf=padding.MGF1(hashes.SHA256()),
                salt_length=padding.PSS.MAX_LENGTH
            ),
            hashes.SHA256()
        )
        
        # Codificar firma en base64
        signature_b64 = base64.b64encode(signature_bytes).decode('utf-8')
        
        # Extraer información del certificado
        certificate_pem = certificate.public_bytes(serialization.Encoding.PEM).decode('utf-8')
        
        return DigitalSignature(
            signature_id=str(uuid.uuid4()),
            document_hash=document_hash,
            signature_value=signature_b64,
            timestamp=datetime.now(timezone.utc).isoformat(),
            signer_certificate=certificate_pem,
            algorithm="SHA256withRSA",
            status="valid"
        )
    
    def verify_signature(
        self, 
        document_content: Union[str, bytes],
        signature: DigitalSignature
    ) -> bool:
        """
        Verifica una firma digital
        
        Args:
            document_content: Contenido original del documento
            signature: Objeto DigitalSignature a verificar
            
        Returns:
            True si la firma es válida, False en caso contrario
        """
        try:
            # Verificar hash del documento
            current_hash = self.calculate_document_hash(document_content)
            if current_hash != signature.document_hash:
                return False
            
            # Cargar certificado
            certificate = x509.load_pem_x509_certificate(signature.signer_certificate.encode('utf-8'))
            
            # Verificar validez del certificado
            now = datetime.now(timezone.utc)
            if now < certificate.not_valid_before or now > certificate.not_valid_after:
                return False
            
            # Decodificar firma
            signature_bytes = base64.b64decode(signature.signature_value)
            
            # Verificar firma
            public_key = certificate.public_key()
            public_key.verify(
                signature_bytes,
                signature.document_hash.encode('utf-8'),
                padding.PSS(
                    mgf=padding.MGF1(hashes.SHA256()),
                    salt_length=padding.PSS.MAX_LENGTH
                ),
                hashes.SHA256()
            )
            
            return True
            
        except Exception as e:
            print(f"Error verificando firma: {e}")
            return False
    
    def create_signature_manifest(
        self, 
        document_id: str,
        document_type: str,
        signatures: List[DigitalSignature]
    ) -> DocumentSignature:
        """
        Crea un manifiesto de firmas para un documento
        
        Args:
            document_id: ID del documento
            document_type: Tipo de documento
            signatures: Lista de firmas aplicadas
            
        Returns:
            Objeto DocumentSignature
        """
        if not signatures:
            raise ValueError("Debe haber al menos una firma")
        
        # Calcular hash del documento basado en las firmas
        combined_hashes = "".join([sig.document_hash for sig in signatures])
        document_hash = hashlib.sha256(combined_hashes.encode('utf-8')).hexdigest()
        
        return DocumentSignature(
            document_id=document_id,
            document_type=document_type,
            signatures=signatures,
            document_hash=document_hash,
            creation_timestamp=min(sig.timestamp for sig in signatures),
            last_signature_timestamp=max(sig.timestamp for sig in signatures)
        )

# ============================================================================
# MEDICAL DOCUMENT SIGNING
# ============================================================================

class MedicalDocumentSigner:
    """Firmante especializado para documentos médicos"""
    
    def __init__(self, signature_service: DigitalSignatureService):
        self.signature_service = signature_service
    
    def sign_consultation(
        self, 
        consultation_data: Dict[str, Any],
        doctor_private_key,
        doctor_certificate
    ) -> DocumentSignature:
        """
        Firma una consulta médica
        
        Args:
            consultation_data: Datos de la consulta
            doctor_private_key: Clave privada del médico
            doctor_certificate: Certificado del médico
            
        Returns:
            DocumentSignature con la consulta firmada
        """
        # Crear documento normalizado para firma
        document_content = self._normalize_consultation_document(consultation_data)
        
        # Firmar documento
        signature = self.signature_service.sign_document(
            document_content,
            doctor_private_key,
            doctor_certificate
        )
        
        # Crear manifiesto
        return self.signature_service.create_signature_manifest(
            document_id=consultation_data["id"],
            document_type="consultation",
            signatures=[signature]
        )
    
    def sign_prescription(
        self,
        prescription_data: Dict[str, Any],
        doctor_private_key,
        doctor_certificate
    ) -> DocumentSignature:
        """
        Firma una receta médica
        
        Args:
            prescription_data: Datos de la receta
            doctor_private_key: Clave privada del médico
            doctor_certificate: Certificado del médico
            
        Returns:
            DocumentSignature con la receta firmada
        """
        # Crear documento normalizado
        document_content = self._normalize_prescription_document(prescription_data)
        
        # Firmar
        signature = self.signature_service.sign_document(
            document_content,
            doctor_private_key,
            doctor_certificate
        )
        
        return self.signature_service.create_signature_manifest(
            document_id=prescription_data["id"],
            document_type="prescription",
            signatures=[signature]
        )
    
    def sign_medical_certificate(
        self,
        certificate_data: Dict[str, Any],
        doctor_private_key,
        doctor_certificate
    ) -> DocumentSignature:
        """
        Firma un certificado médico
        
        Args:
            certificate_data: Datos del certificado
            doctor_private_key: Clave privada del médico
            doctor_certificate: Certificado del médico
            
        Returns:
            DocumentSignature con el certificado firmado
        """
        document_content = self._normalize_certificate_document(certificate_data)
        
        signature = self.signature_service.sign_document(
            document_content,
            doctor_private_key,
            doctor_certificate
        )
        
        return self.signature_service.create_signature_manifest(
            document_id=certificate_data["id"],
            document_type="medical_certificate",
            signatures=[signature]
        )
    
    def _normalize_consultation_document(self, consultation_data: Dict[str, Any]) -> str:
        """Normaliza los datos de consulta para firma"""
        normalized = {
            "document_type": "consultation",
            "consultation_id": consultation_data["id"],
            "patient_id": consultation_data["patient_id"],
            "doctor_id": consultation_data["doctor_id"],
            "date": consultation_data["date"],
            "chief_complaint": consultation_data.get("chief_complaint", ""),
            "history_present_illness": consultation_data.get("history_present_illness", ""),
            "physical_examination": consultation_data.get("physical_examination", ""),
            "primary_diagnosis": consultation_data.get("primary_diagnosis", ""),
            "treatment_plan": consultation_data.get("treatment_plan", ""),
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        
        return json.dumps(normalized, sort_keys=True, ensure_ascii=False)
    
    def _normalize_prescription_document(self, prescription_data: Dict[str, Any]) -> str:
        """Normaliza los datos de receta para firma"""
        normalized = {
            "document_type": "prescription",
            "prescription_id": prescription_data["id"],
            "patient_id": prescription_data["patient_id"],
            "doctor_id": prescription_data["doctor_id"],
            "date": prescription_data["date"],
            "medications": prescription_data.get("medications", []),
            "indications": prescription_data.get("indications", ""),
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        
        return json.dumps(normalized, sort_keys=True, ensure_ascii=False)
    
    def _normalize_certificate_document(self, certificate_data: Dict[str, Any]) -> str:
        """Normaliza los datos de certificado médico para firma"""
        normalized = {
            "document_type": "medical_certificate",
            "certificate_id": certificate_data["id"],
            "patient_id": certificate_data["patient_id"],
            "doctor_id": certificate_data["doctor_id"],
            "certificate_type": certificate_data["certificate_type"],
            "content": certificate_data["content"],
            "issue_date": certificate_data["issue_date"],
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        
        return json.dumps(normalized, sort_keys=True, ensure_ascii=False)

# ============================================================================
# CERTIFICATE MANAGEMENT
# ============================================================================

class CertificateManager:
    """Gestor de certificados digitales"""
    
    def __init__(self):
        self.certificates_dir = os.path.join(os.getcwd(), "certificates")
        os.makedirs(self.certificates_dir, exist_ok=True)
    
    def store_certificate(
        self, 
        doctor_id: str, 
        certificate: x509.Certificate,
        private_key,
        password: str
    ) -> str:
        """
        Almacena certificado y clave privada de forma segura
        
        Args:
            doctor_id: ID del médico
            certificate: Certificado X.509
            private_key: Clave privada
            password: Contraseña para proteger la clave
            
        Returns:
            Ruta del archivo almacenado
        """
        # Crear archivo PKCS#12
        signature_service = DigitalSignatureService()
        p12_data = signature_service.export_pkcs12(private_key, certificate, password)
        
        # Guardar archivo
        filename = f"{doctor_id}_certificate.p12"
        filepath = os.path.join(self.certificates_dir, filename)
        
        with open(filepath, 'wb') as f:
            f.write(p12_data)
        
        return filepath
    
    def load_certificate(self, doctor_id: str, password: str) -> tuple:
        """
        Carga certificado y clave privada
        
        Args:
            doctor_id: ID del médico
            password: Contraseña del certificado
            
        Returns:
            tuple: (private_key, certificate)
        """
        filename = f"{doctor_id}_certificate.p12"
        filepath = os.path.join(self.certificates_dir, filename)
        
        if not os.path.exists(filepath):
            raise FileNotFoundError(f"Certificado no encontrado para doctor {doctor_id}")
        
        with open(filepath, 'rb') as f:
            p12_data = f.read()
        
        signature_service = DigitalSignatureService()
        private_key, certificate, _ = signature_service.load_certificate_from_pkcs12(p12_data, password)
        
        return private_key, certificate
    
    def get_certificate_info(self, doctor_id: str, password: str) -> SigningCertificate:
        """
        Obtiene información del certificado
        
        Args:
            doctor_id: ID del médico
            password: Contraseña del certificado
            
        Returns:
            Objeto SigningCertificate con la información
        """
        private_key, certificate = self.load_certificate(doctor_id, password)
        
        return SigningCertificate(
            certificate_id=str(certificate.serial_number),
            subject_name=certificate.subject.rfc4514_string(),
            issuer_name=certificate.issuer.rfc4514_string(),
            serial_number=str(certificate.serial_number),
            not_before=certificate.not_valid_before.isoformat(),
            not_after=certificate.not_valid_after.isoformat(),
            public_key=certificate.public_key().public_bytes(
                encoding=serialization.Encoding.PEM,
                format=serialization.PublicFormat.SubjectPublicKeyInfo
            ).decode('utf-8'),
            certificate_pem=certificate.public_bytes(serialization.Encoding.PEM).decode('utf-8'),
            key_usage=self._extract_key_usage(certificate),
            is_active=datetime.now(timezone.utc) < certificate.not_valid_after
        )
    
    def _extract_key_usage(self, certificate: x509.Certificate) -> List[str]:
        """Extrae los usos permitidos de la clave"""
        try:
            key_usage = certificate.extensions.get_extension_for_oid(ExtensionOID.KEY_USAGE).value
            usage_list = []
            
            if key_usage.digital_signature:
                usage_list.append("digital_signature")
            if key_usage.content_commitment:
                usage_list.append("non_repudiation")
            if key_usage.key_encipherment:
                usage_list.append("key_encipherment")
                
            return usage_list
        except x509.ExtensionNotFound:
            return ["digital_signature"]  # Default

# ============================================================================
# SIGNATURE VERIFICATION SERVICE
# ============================================================================

class SignatureVerificationService:
    """Servicio de verificación de firmas"""
    
    def __init__(self):
        self.signature_service = DigitalSignatureService()
    
    def verify_document_signatures(
        self, 
        document_content: Union[str, bytes],
        document_signature: DocumentSignature
    ) -> Dict[str, Any]:
        """
        Verifica todas las firmas de un documento
        
        Args:
            document_content: Contenido original del documento
            document_signature: Manifiesto de firmas del documento
            
        Returns:
            Diccionario con resultados de verificación
        """
        results = {
            "document_id": document_signature.document_id,
            "document_type": document_signature.document_type,
            "total_signatures": len(document_signature.signatures),
            "valid_signatures": 0,
            "signature_results": [],
            "overall_status": "invalid"
        }
        
        for signature in document_signature.signatures:
            is_valid = self.signature_service.verify_signature(document_content, signature)
            
            signature_result = {
                "signature_id": signature.signature_id,
                "timestamp": signature.timestamp,
                "algorithm": signature.algorithm,
                "is_valid": is_valid,
                "signer_info": self._extract_signer_info(signature.signer_certificate)
            }
            
            results["signature_results"].append(signature_result)
            
            if is_valid:
                results["valid_signatures"] += 1
        
        # Determinar estado general
        if results["valid_signatures"] == results["total_signatures"] and results["total_signatures"] > 0:
            results["overall_status"] = "valid"
        elif results["valid_signatures"] > 0:
            results["overall_status"] = "partially_valid"
        else:
            results["overall_status"] = "invalid"
        
        return results
    
    def _extract_signer_info(self, certificate_pem: str) -> Dict[str, str]:
        """Extrae información del firmante del certificado"""
        try:
            certificate = x509.load_pem_x509_certificate(certificate_pem.encode('utf-8'))
            
            return {
                "common_name": self._get_name_attribute(certificate.subject, NameOID.COMMON_NAME),
                "email": self._get_name_attribute(certificate.subject, NameOID.EMAIL_ADDRESS),
                "organization": self._get_name_attribute(certificate.subject, NameOID.ORGANIZATION_NAME),
                "serial_number": self._get_name_attribute(certificate.subject, NameOID.SERIAL_NUMBER),
                "issuer": certificate.issuer.rfc4514_string()
            }
        except Exception:
            return {"error": "Could not extract signer information"}
    
    def _get_name_attribute(self, name: x509.Name, oid) -> str:
        """Obtiene un atributo específico del nombre del certificado"""
        try:
            return name.get_attributes_for_oid(oid)[0].value
        except (IndexError, AttributeError):
            return ""

# ============================================================================
# INITIALIZATION
# ============================================================================

# Instancias globales
digital_signature_service = DigitalSignatureService()
certificate_manager = CertificateManager()
medical_document_signer = MedicalDocumentSigner(digital_signature_service)
signature_verification_service = SignatureVerificationService()

def get_digital_signature_service() -> DigitalSignatureService:
    """Obtiene la instancia global del servicio de firma digital"""
    return digital_signature_service

def get_certificate_manager() -> CertificateManager:
    """Obtiene la instancia global del gestor de certificados"""
    return certificate_manager

def get_medical_document_signer() -> MedicalDocumentSigner:
    """Obtiene la instancia global del firmante de documentos médicos"""
    return medical_document_signer

def get_signature_verification_service() -> SignatureVerificationService:
    """Obtiene la instancia global del servicio de verificación"""
    return signature_verification_service
