"""
Storage Service Abstraction for File Storage
Supports local filesystem (development) and S3 (production)
"""
import os
import uuid
from abc import ABC, abstractmethod
from pathlib import Path
from typing import Optional, BinaryIO, Union
from logger import get_logger

logger = get_logger("medical_records.storage")


class StorageService(ABC):
    """Abstract base class for storage services"""
    
    @abstractmethod
    def upload(self, file_content: bytes, key: str, content_type: Optional[str] = None) -> str:
        """
        Upload a file to storage.
        
        Args:
            file_content: The file content as bytes
            key: The storage key/path for the file
            content_type: MIME type of the file
            
        Returns:
            The storage key/path where the file was stored
        """
        pass
    
    @abstractmethod
    def download(self, key: str) -> Optional[bytes]:
        """
        Download a file from storage.
        
        Args:
            key: The storage key/path of the file
            
        Returns:
            The file content as bytes, or None if not found
        """
        pass
    
    @abstractmethod
    def delete(self, key: str) -> bool:
        """
        Delete a file from storage.
        
        Args:
            key: The storage key/path of the file
            
        Returns:
            True if deleted successfully, False otherwise
        """
        pass
    
    @abstractmethod
    def get_url(self, key: str, expires_in: int = 3600) -> Optional[str]:
        """
        Get a URL to access the file.
        
        Args:
            key: The storage key/path of the file
            expires_in: URL expiration time in seconds (for presigned URLs)
            
        Returns:
            URL to access the file, or None if not available
        """
        pass
    
    @abstractmethod
    def exists(self, key: str) -> bool:
        """
        Check if a file exists in storage.
        
        Args:
            key: The storage key/path of the file
            
        Returns:
            True if file exists, False otherwise
        """
        pass


class LocalStorageService(StorageService):
    """Local filesystem storage service for development"""
    
    def __init__(self, base_dir: str = "uploads"):
        self.base_dir = Path(base_dir)
        self.base_dir.mkdir(parents=True, exist_ok=True)
    
    def _get_full_path(self, key: str) -> Path:
        """Get the full filesystem path for a key"""
        return self.base_dir / key
    
    def upload(self, file_content: bytes, key: str, content_type: Optional[str] = None) -> str:
        """Upload a file to local filesystem"""
        full_path = self._get_full_path(key)
        full_path.parent.mkdir(parents=True, exist_ok=True)
        
        with open(full_path, "wb") as f:
            f.write(file_content)
        
        logger.info(f"Local storage: uploaded file to {key}")
        return key
    
    def download(self, key: str) -> Optional[bytes]:
        """Download a file from local filesystem"""
        full_path = self._get_full_path(key)
        
        if not full_path.exists():
            logger.warning(f"Local storage: file not found at {key}")
            return None
        
        with open(full_path, "rb") as f:
            return f.read()
    
    def delete(self, key: str) -> bool:
        """Delete a file from local filesystem"""
        full_path = self._get_full_path(key)
        
        if full_path.exists():
            try:
                full_path.unlink()
                logger.info(f"Local storage: deleted file at {key}")
                return True
            except Exception as e:
                logger.error(f"Local storage: failed to delete {key}: {e}")
                return False
        return False
    
    def get_url(self, key: str, expires_in: int = 3600) -> Optional[str]:
        """
        Get URL for local file.
        For local storage, returns None as files should be served via the API endpoint.
        """
        return None
    
    def exists(self, key: str) -> bool:
        """Check if file exists in local filesystem"""
        return self._get_full_path(key).exists()
    
    def get_full_path(self, key: str) -> str:
        """Get the full filesystem path (for FileResponse)"""
        return str(self._get_full_path(key))




class GCSStorageService(StorageService):
    """Google Cloud Storage service for production"""

    def __init__(self, bucket_name: str, project_id: Optional[str] = None):
        from google.cloud import storage
        
        try:
            if project_id:
                self.client = storage.Client(project=project_id)
            else:
                self.client = storage.Client()
                
            self.bucket = self.client.bucket(bucket_name)
            logger.info(f"GCS storage service initialized for bucket: {bucket_name}")
        except Exception as e:
            logger.error(f"GCS client init failed: {e}")
            raise

    def upload(self, file_content: bytes, key: str, content_type: Optional[str] = None) -> str:
        """Upload a file to GCS"""
        try:
            blob = self.bucket.blob(key)
            blob.upload_from_string(file_content, content_type=content_type)
            logger.info(f"GCS storage: uploaded file to gs://{self.bucket.name}/{key}")
            return key
        except Exception as e:
            logger.error(f"GCS storage: error uploading {key}: {e}")
            raise

    def download(self, key: str) -> Optional[bytes]:
        """Download a file from GCS"""
        try:
            blob = self.bucket.blob(key)
            if not blob.exists():
                return None
            return blob.download_as_bytes()
        except Exception as e:
            logger.error(f"GCS storage: error downloading {key}: {e}")
            return None

    def delete(self, key: str) -> bool:
        """Delete a file from GCS"""
        try:
            blob = self.bucket.blob(key)
            blob.delete()
            logger.info(f"GCS storage: deleted file at gs://{self.bucket.name}/{key}")
            return True
        except Exception as e:
            logger.error(f"GCS storage: failed to delete {key}: {e}")
            return False

    def get_url(self, key: str, expires_in: int = 3600) -> Optional[str]:
        """Get a signed URL for GCS file"""
        from datetime import timedelta
        try:
            blob = self.bucket.blob(key)
            url = blob.generate_signed_url(
                version="v4",
                expiration=timedelta(seconds=expires_in),
                method="GET",
            )
            return url
        except Exception as e:
            logger.error(f"GCS storage: failed to generate signed URL for {key}: {e}")
            return None

    def exists(self, key: str) -> bool:
        """Check if file exists in GCS"""
        try:
            blob = self.bucket.blob(key)
            return blob.exists()
        except:
            return False


# Singleton instance
_storage_service: Optional[StorageService] = None


def get_storage_service() -> StorageService:
    """
    Factory function to get the appropriate storage service.
    Returns S3 in production (when AWS_BUCKET_NAME is set), local otherwise.
    """
    global _storage_service
    
    if _storage_service is not None:
        return _storage_service
    
    # Import settings here to avoid circular imports
    from config import settings
    
    app_env = os.getenv("APP_ENV", "development").lower()
    is_production = app_env == "production"
    
    # Prioritize GCS if configured
    if is_production and settings.GCP_STORAGE_BUCKET:
        logger.info("Initializing GCS storage service for production")
        _storage_service = GCSStorageService(
            bucket_name=settings.GCP_STORAGE_BUCKET,
            project_id=settings.GCP_PROJECT_ID
        )
    else:
        logger.info("Initializing local storage service for development")
        _storage_service = LocalStorageService(base_dir="uploads")
    
    return _storage_service


def generate_storage_key(prefix: str, original_filename: str) -> str:
    """
    Generate a unique storage key for a file.
    
    Args:
        prefix: Directory prefix (e.g., 'clinical_studies')
        original_filename: Original filename to preserve extension
        
    Returns:
        Unique storage key like 'clinical_studies/study_abc123.pdf'
    """
    import os
    ext = os.path.splitext(original_filename)[1].lower()
    unique_id = uuid.uuid4().hex[:12]
    return f"{prefix}/{unique_id}{ext}"

