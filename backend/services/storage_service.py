"""
Storage Service Abstraction for File Storage
Supports local filesystem (development) and S3 (production)
"""
import os
import uuid
from abc import ABC, abstractmethod
from pathlib import Path
from typing import Optional, BinaryIO, Union
import logging

logger = logging.getLogger(__name__)


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


class S3StorageService(StorageService):
    """AWS S3 storage service for production"""
    
    def __init__(
        self,
        bucket_name: str,
        region: str = "us-east-1",
        access_key_id: Optional[str] = None,
        secret_access_key: Optional[str] = None
    ):
        import boto3
        from botocore.config import Config
        
        self.bucket_name = bucket_name
        self.region = region
        
        # Configure boto3 client
        config = Config(
            region_name=region,
            signature_version='s3v4',
            retries={'max_attempts': 3, 'mode': 'standard'}
        )
        
        try:
            if access_key_id and secret_access_key:
                self.s3_client = boto3.client(
                    's3',
                    aws_access_key_id=access_key_id,
                    aws_secret_access_key=secret_access_key,
                    config=config
                )
                auth_method = 'explicit_credentials'
            else:
                # Use default credentials (IAM role, environment variables, etc.)
                self.s3_client = boto3.client('s3', config=config)
                auth_method = 'default_credentials'
            
            # #region agent log
            logger.info("DEBUG: S3 client initialized",
                       bucket_name=bucket_name,
                       region=region,
                       auth_method=auth_method,
                       has_access_key=bool(access_key_id),
                       has_secret_key=bool(secret_access_key))
            # #endregion
            
            logger.info(f"S3 storage service initialized for bucket: {bucket_name}")
        except Exception as init_error:
            # #region agent log
            logger.error("DEBUG: S3 client init failed",
                        bucket_name=bucket_name,
                        region=region,
                        error=str(init_error),
                        error_type=type(init_error).__name__,
                        exc_info=True)
            # #endregion
            raise
    
    def upload(self, file_content: bytes, key: str, content_type: Optional[str] = None) -> str:
        """Upload a file to S3"""
        # #region agent log
        logger.debug("DEBUG: S3 upload start",
                    bucket_name=self.bucket_name,
                    key=key,
                    content_type=content_type,
                    file_size=len(file_content),
                    region=self.region)
        # #endregion
        
        extra_args = {}
        if content_type:
            extra_args['ContentType'] = content_type
        
        try:
            self.s3_client.put_object(
                Bucket=self.bucket_name,
                Key=key,
                Body=file_content,
                **extra_args
            )
            
            # #region agent log
            logger.info("DEBUG: S3 upload successful", bucket_name=self.bucket_name, key=key)
            # #endregion
            
            logger.info(f"S3 storage: uploaded file to s3://{self.bucket_name}/{key}")
            return key
        except Exception as upload_error:
            # #region agent log
            logger.error("DEBUG: S3 upload failed",
                        bucket_name=self.bucket_name,
                        key=key,
                        file_size=len(file_content),
                        error=str(upload_error),
                        error_type=type(upload_error).__name__,
                        exc_info=True)
            # #endregion
            raise
    
    def download(self, key: str) -> Optional[bytes]:
        """Download a file from S3"""
        try:
            response = self.s3_client.get_object(
                Bucket=self.bucket_name,
                Key=key
            )
            return response['Body'].read()
        except self.s3_client.exceptions.NoSuchKey:
            logger.warning(f"S3 storage: file not found at s3://{self.bucket_name}/{key}")
            return None
        except Exception as e:
            logger.error(f"S3 storage: error downloading {key}: {e}")
            return None
    
    def delete(self, key: str) -> bool:
        """Delete a file from S3"""
        try:
            self.s3_client.delete_object(
                Bucket=self.bucket_name,
                Key=key
            )
            logger.info(f"S3 storage: deleted file at s3://{self.bucket_name}/{key}")
            return True
        except Exception as e:
            logger.error(f"S3 storage: failed to delete {key}: {e}")
            return False
    
    def get_url(self, key: str, expires_in: int = 3600) -> Optional[str]:
        """Get a presigned URL for S3 file"""
        try:
            url = self.s3_client.generate_presigned_url(
                'get_object',
                Params={
                    'Bucket': self.bucket_name,
                    'Key': key
                },
                ExpiresIn=expires_in
            )
            return url
        except Exception as e:
            logger.error(f"S3 storage: failed to generate presigned URL for {key}: {e}")
            return None
    
    def exists(self, key: str) -> bool:
        """Check if file exists in S3"""
        try:
            self.s3_client.head_object(
                Bucket=self.bucket_name,
                Key=key
            )
            return True
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
    
    # Use S3 if in production AND AWS bucket is configured
    if is_production and settings.AWS_BUCKET_NAME:
        logger.info("Initializing S3 storage service for production")
        _storage_service = S3StorageService(
            bucket_name=settings.AWS_BUCKET_NAME,
            region=settings.AWS_REGION,
            access_key_id=settings.AWS_ACCESS_KEY_ID,
            secret_access_key=settings.AWS_SECRET_ACCESS_KEY
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

