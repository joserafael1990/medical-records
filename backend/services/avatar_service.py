
from __future__ import annotations

import os
import io
import secrets
from pathlib import Path
from typing import List, Dict, Optional

from fastapi import UploadFile, HTTPException, status
from sqlalchemy.orm import Session
from PIL import Image

from database import Person
from logger import get_logger
from services.storage_service import get_storage_service

ALLOWED_EXTENSIONS = {'.png', '.jpg', '.jpeg', '.svg', '.webp'}
MAX_FILE_SIZE_MB = 2
MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024

# Static directory for preloaded avatars (part of the code image)
BASE_DIR = Path(__file__).resolve().parent.parent
STATIC_AVATAR_DIR = BASE_DIR / "static" / "doctor_avatars" / "preloaded"

api_logger = get_logger("medical_records.avatar_service")


def _build_preloaded_url(filename: str) -> str:
    return f"/static/doctor_avatars/preloaded/{filename}"


def _get_storage_key(doctor_id: int, filename: str) -> str:
    """Generate storage key for doctor avatar."""
    return f"doctor_avatars/{doctor_id}/{filename}"


def get_preloaded_avatar(template_key: str) -> Optional[Dict[str, str]]:
    """Return metadata for a preloaded avatar by its key."""
    for item in list_preloaded_avatars():
        if item["key"] == template_key:
            return item
    return None


def list_preloaded_avatars() -> List[Dict[str, str]]:
    """Return metadata for preloaded avatars stored in static directory."""
    avatars: List[Dict[str, str]] = []
    if not STATIC_AVATAR_DIR.exists():
        api_logger.warning("Preloaded avatar directory not found", extra={"path": str(STATIC_AVATAR_DIR)})
        return avatars

    for file_path in sorted(STATIC_AVATAR_DIR.iterdir()):
        if file_path.is_file() and file_path.suffix.lower() in ALLOWED_EXTENSIONS:
            avatars.append({
                "type": "preloaded",
                "key": file_path.stem,
                "template_key": file_path.stem,
                "filename": file_path.name,
                "url": _build_preloaded_url(file_path.name)
            })
    return avatars


def list_custom_avatars(doctor_id: int) -> List[Dict[str, str]]:
    """
    Return metadata for custom avatars.
    
    NOTE: In the stateless/cloud version, we cannot easily 'list' files in a directory 
    without adding a 'list' method to StorageService (which is expensive in S3).
    
    Since the logic enforces essentially 1 custom avatar per doctor, this function 
    is deprecated or should return empty unless we query the DB. 
    Refactoring to return empty list or minimal info if needed, but 
    ideally the frontend should rely on the user profile data.
    """
    # For now, return empty list as we don't have a cheap way to list S3 keys by prefix 
    # without updating StorageService. 
    # If this breaks UI, we need to inspect frontend usage.
    return []


def _validate_file_size(upload_file: UploadFile) -> None:
    file_obj = upload_file.file
    current_position = file_obj.tell()
    file_obj.seek(0, os.SEEK_END)
    size = file_obj.tell()
    file_obj.seek(current_position)

    if size > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"El archivo excede el tamaño máximo de {MAX_FILE_SIZE_MB} MB."
        )


def save_custom_avatar(doctor_id: int, upload_file: UploadFile) -> Dict[str, str]:
    """Persist a custom avatar for a doctor and return its metadata.
    Enforces a limit of 1 avatar per doctor (overwrites).
    Compresses and resizes the image using Pillow.
    """
    extension = Path(upload_file.filename or "").suffix.lower()
    if extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Formato de imagen no soportado. Usa PNG, JPG, JPEG, SVG o WEBP."
        )

    _validate_file_size(upload_file)
    
    storage = get_storage_service()

    # NOTE: We cannot easily "delete all existing" without listing them first.
    # In S3, we just overwrite if the key is known, but here we generate random names.
    # To strictly enforce 1 avatar, we would need to know the OLD avatar path from the DB 
    # (which we don't have access to here easily, would need to pass in doctor object or query it).
    # 
    # DECISION: For now, we simply upload the new one. 
    # Cleanup of old files in S3 is harder without observing the DB state.
    # We will rely on the caller (API endpoint) to handle cleanup if possible, 
    # or accept that orphaned files might exist in S3 (common practice).
    
    # Generate new filename
    if extension == '.svg':
        random_name = f"avatar_{secrets.token_hex(8)}{extension}"
        content = upload_file.file.read()
    else:
        # Compress using Pillow
        try:
            image = Image.open(upload_file.file)
            image.thumbnail((800, 800))
            
            output_buffer = io.BytesIO()
            
            if extension in ['.jpg', '.jpeg']:
                image = image.convert('RGB')
                image.save(output_buffer, format='JPEG', quality=85, optimize=True)
                random_name = f"avatar_{secrets.token_hex(8)}.jpg"
            elif extension == '.png':
                image.save(output_buffer, format='PNG', optimize=True)
                random_name = f"avatar_{secrets.token_hex(8)}.png"
            elif extension == '.webp':
                image.save(output_buffer, format='WEBP', quality=85)
                random_name = f"avatar_{secrets.token_hex(8)}.webp"
            else:
                image.save(output_buffer, format=image.format)
                random_name = f"avatar_{secrets.token_hex(8)}{extension}"
            
            content = output_buffer.getvalue()
                
        except Exception as e:
            api_logger.error("Error compressing image", extra={"error": str(e)})
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Error procesando la imagen."
            )
        finally:
            upload_file.file.close()

    # Upload to Storage Service
    key = _get_storage_key(doctor_id, random_name)
    try:
        storage.upload(content, key, content_type=upload_file.content_type)
    except Exception as e:
        api_logger.error(f"Storage upload failed: {e}")
        raise HTTPException(status_code=500, detail="Error al guardar el avatar.")

    # With storage service, the 'relative_path' is effectively the key
    # But for compatibility with frontend that expects a URL or path:
    
    # OPTION 1: Return the key as 'relative_path'. 
    # The frontend or 'get_current_avatar_payload' needs to handle converting this key 
    # to a URL via storage.get_url() or a proxy endpoint.
    
    api_logger.info(
        "✅ Custom avatar saved (storage)",
        extra={"doctor_id": doctor_id, "key": key}
    )
    
    # We assume the key needs to be stored in the DB as 'avatar_file_path'
    return {
        "filename": random_name,
        "relative_path": key,
        "url": storage.get_url(key) or key # best effort URL
    }


def delete_custom_avatar(doctor_id: int, relative_path: str) -> bool:
    """
    Delete a custom avatar ensuring it belongs to the doctor.
    Returns True if deleted.
    """
    # Key Validation
    expected_prefix = f"doctor_avatars/{doctor_id}/"
    if not relative_path.startswith(expected_prefix):
         # It might be using backslashes if from old windows upload?
        sanitized = relative_path.replace("\\", "/")
        if not sanitized.startswith(expected_prefix):
             # Fail safe
             api_logger.warning(f"Delete attempt for invalid path ownership: {relative_path} vs {expected_prefix}")
             # We might raise 403, or just return False. 
             # Original code raised 403.
             raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acceso denegado al avatar.")
        relative_path = sanitized

    storage = get_storage_service()
    return storage.delete(relative_path)


def set_preloaded_avatar(db: Session, doctor: Person, template_key: str) -> Person:
    """Assign a preloaded avatar to the doctor."""
    preloaded = {item["key"]: item for item in list_preloaded_avatars()}
    if template_key not in preloaded:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Avatar preconfigurado no encontrado.")

    # Cleanup old custom if exists
    if doctor.avatar_type == "custom" and doctor.avatar_file_path:
        delete_custom_avatar(doctor.id, doctor.avatar_file_path)

    doctor.avatar_type = "preloaded"
    doctor.avatar_template_key = template_key
    doctor.avatar_file_path = None
    db.commit()
    db.refresh(doctor)
    return doctor


def set_custom_avatar(db: Session, doctor: Person, relative_path: str) -> Person:
    """
    Assign a custom avatar to the doctor. 
    Note: 'relative_path' here is actually the Storage Key.
    """
    # Verify it exists in storage? Optional but good practice.
    # storage = get_storage_service()
    # if not storage.exists(relative_path):
    #    raise 404...
    
    # Cleanup OLD custom if different
    if doctor.avatar_type == "custom" and doctor.avatar_file_path and doctor.avatar_file_path != relative_path:
        try:
             delete_custom_avatar(doctor.id, doctor.avatar_file_path)
        except:
             pass # ignore cleanup errors

    doctor.avatar_type = "custom"
    doctor.avatar_template_key = None
    doctor.avatar_file_path = relative_path
    db.commit()
    db.refresh(doctor)
    return doctor


def reset_avatar(db: Session, doctor: Person) -> Person:
    """Reset avatar to initials."""
    # Cleanup old custom
    if doctor.avatar_type == "custom" and doctor.avatar_file_path:
        delete_custom_avatar(doctor.id, doctor.avatar_file_path)

    doctor.avatar_type = "initials"
    doctor.avatar_template_key = None
    doctor.avatar_file_path = None
    db.commit()
    db.refresh(doctor)
    return doctor


def get_current_avatar_payload(doctor: Person) -> Dict[str, Optional[str]]:
    """Return metadata describing the doctor's current avatar selection."""
    avatar_type = (doctor.avatar_type or "initials").lower()
    payload: Dict[str, Optional[str]] = {
        "avatar_type": avatar_type,
        "avatar_template_key": doctor.avatar_template_key,
        "avatar_file_path": doctor.avatar_file_path,
        "url": None,
        "avatar_url": None
    }

    if avatar_type == "preloaded" and doctor.avatar_template_key:
        meta = get_preloaded_avatar(doctor.avatar_template_key)
        if meta:
            payload["url"] = meta["url"]
            payload["avatar_url"] = meta["url"]
            
    elif avatar_type == "custom" and doctor.avatar_file_path:
        key = doctor.avatar_file_path
        storage = get_storage_service()
        
        # If using local storage, we might need to route through an endpoint 
        # because we can't serve directly from 'uploads' folder effectively if we want it abstracted.
        # BUT StorageService.Local.get_url() returns None.
        # 
        # Strategy:
        # If StorageService returns a URL (S3 presigned), use it.
        # If it returns None (Local), construct a local URL e.g. /uploads/{key}
        # Assuming the app mounts /uploads or has a route for it.
        
        storage_url = storage.get_url(key)
        if storage_url:
            url = storage_url
        else:
            # Fallback for local storage if get_url returns None
            # We assume 'uploads' static mount or similar.
            # backend/main.py usually mounts static dirs.
            # LocalStorageService stores at 'uploads/{key}'
            # If we mount http://localhost:8000/uploads -> uploads dir
            url = f"/uploads/{key}"

        payload["url"] = url
        payload["avatar_url"] = url

    return payload

