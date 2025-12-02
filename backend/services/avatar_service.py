
from __future__ import annotations

import os
from pathlib import Path
from typing import List, Dict, Optional
import secrets
import shutil

from fastapi import UploadFile, HTTPException, status
from sqlalchemy.orm import Session

from database import Person
from logger import get_logger

ALLOWED_EXTENSIONS = {'.png', '.jpg', '.jpeg', '.svg', '.webp'}
MAX_FILE_SIZE_MB = 2
MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024

BASE_DIR = Path(__file__).resolve().parent.parent
STATIC_AVATAR_DIR = BASE_DIR / "static" / "doctor_avatars" / "preloaded"
UPLOAD_AVATAR_ROOT = BASE_DIR / "uploads" / "doctor_avatars"

api_logger = get_logger("medical_records.avatar_service")


def _build_preloaded_url(filename: str) -> str:
    return f"/static/doctor_avatars/preloaded/{filename}"


def _build_custom_url(relative_path: str) -> str:
    # relative_path is stored relative to uploads root (doctor_avatars/...)
    sanitized = relative_path.replace("\\", "/")
    return f"/uploads/{sanitized}"


def _sanitize_relative_path(relative_path: str) -> str:
    sanitized = relative_path.replace("\\", "/")
    if not sanitized.startswith("doctor_avatars/"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Ruta de avatar inválida.")
    return sanitized


def _relative_suffix(relative_path: str) -> str:
    sanitized = _sanitize_relative_path(relative_path)
    return sanitized.split("doctor_avatars/", 1)[1]


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
    """Return metadata for custom avatars uploaded by the doctor."""
    doctor_dir = _ensure_doctor_upload_dir(doctor_id, create=False)
    avatars: List[Dict[str, str]] = []

    if doctor_dir and doctor_dir.exists():
        for file_path in sorted(doctor_dir.iterdir()):
            if file_path.is_file() and file_path.suffix.lower() in ALLOWED_EXTENSIONS:
                relative_suffix = file_path.relative_to(UPLOAD_AVATAR_ROOT).as_posix()
                relative_path = f"doctor_avatars/{relative_suffix}"
                avatars.append({
                    "type": "custom",
                    "filename": file_path.name,
                    "relative_path": relative_path,
                    "url": _build_custom_url(relative_path)
                })
    return avatars


def _ensure_doctor_upload_dir(doctor_id: int, create: bool = True) -> Optional[Path]:
    doctor_dir = UPLOAD_AVATAR_ROOT / str(doctor_id)
    if create:
        doctor_dir.mkdir(parents=True, exist_ok=True)
    return doctor_dir if doctor_dir.exists() else None


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


from PIL import Image
import io

def save_custom_avatar(doctor_id: int, upload_file: UploadFile) -> Dict[str, str]:
    """Persist a custom avatar for a doctor and return its metadata.
    Enforces a limit of 1 avatar per doctor (deletes previous ones).
    Compresses and resizes the image using Pillow.
    """
    extension = Path(upload_file.filename or "").suffix.lower()
    if extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Formato de imagen no soportado. Usa PNG, JPG, JPEG, SVG o WEBP."
        )

    _validate_file_size(upload_file)

    doctor_dir = _ensure_doctor_upload_dir(doctor_id, create=True)
    
    # ENFORCE LIMIT: Delete all existing custom avatars for this doctor
    if doctor_dir and doctor_dir.exists():
        for existing_file in doctor_dir.iterdir():
            if existing_file.is_file():
                try:
                    existing_file.unlink()
                    api_logger.info(f"Deleted old avatar: {existing_file.name}", extra={"doctor_id": doctor_id})
                except Exception as e:
                    api_logger.warning(f"Failed to delete old avatar: {existing_file.name}", extra={"error": str(e)})

    # Generate new filename
    # We'll standardize to .webp or .jpg for compressed images, or keep original if SVG
    if extension == '.svg':
        # Don't compress SVG, just save
        random_name = f"avatar_{secrets.token_hex(8)}{extension}"
        destination = doctor_dir / random_name
        try:
            with destination.open("wb") as buffer:
                shutil.copyfileobj(upload_file.file, buffer)
        finally:
            upload_file.file.close()
    else:
        # Compress using Pillow
        try:
            image = Image.open(upload_file.file)
            
            # Convert to RGB if necessary (e.g. for PNG with transparency if saving as JPEG, 
            # but we'll try to keep transparency if supported or convert to WebP/PNG)
            # Let's standardize on WebP for efficiency, or keep original format but optimized.
            # For simplicity and compatibility, let's stick to the original format but resized/optimized,
            # unless it's a huge PNG, then maybe JPEG? 
            # Let's resize to max 800x800
            image.thumbnail((800, 800))
            
            # Prepare output buffer
            output_buffer = io.BytesIO()
            
            # Save optimized
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
                # Fallback for others
                image.save(output_buffer, format=image.format)
                random_name = f"avatar_{secrets.token_hex(8)}{extension}"
            
            destination = doctor_dir / random_name
            with destination.open("wb") as buffer:
                buffer.write(output_buffer.getvalue())
                
        except Exception as e:
            api_logger.error("Error compressing image", extra={"error": str(e)})
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Error procesando la imagen."
            )
        finally:
            upload_file.file.close()

    relative_suffix = destination.relative_to(UPLOAD_AVATAR_ROOT).as_posix()
    relative_path = f"doctor_avatars/{relative_suffix}"
    api_logger.info(
        "✅ Custom avatar saved (optimized)",
        extra={"doctor_id": doctor_id, "file": relative_path}
    )
    return {
        "filename": random_name,
        "relative_path": relative_path,
        "url": _build_custom_url(relative_path)
    }


def delete_custom_avatar(doctor_id: int, relative_path: str) -> bool:
    """
    Delete a custom avatar ensuring it belongs to the doctor.
    Returns True if deleted.
    """
    sanitized = _sanitize_relative_path(relative_path)
    suffix = _relative_suffix(sanitized)
    sanitized_path = (UPLOAD_AVATAR_ROOT / suffix).resolve()
    if not str(sanitized_path).startswith(str((UPLOAD_AVATAR_ROOT / str(doctor_id)).resolve())):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acceso denegado al avatar.")

    if sanitized_path.exists():
        sanitized_path.unlink()
        api_logger.info(
            "🗑️ Custom avatar deleted",
            extra={"doctor_id": doctor_id, "file": relative_path}
        )
        return True
    return False


def set_preloaded_avatar(db: Session, doctor: Person, template_key: str) -> Person:
    """Assign a preloaded avatar to the doctor."""
    preloaded = {item["key"]: item for item in list_preloaded_avatars()}
    if template_key not in preloaded:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Avatar preconfigurado no encontrado.")

    doctor.avatar_type = "preloaded"
    doctor.avatar_template_key = template_key
    doctor.avatar_file_path = None
    db.commit()
    db.refresh(doctor)
    return doctor


def set_custom_avatar(db: Session, doctor: Person, relative_path: str) -> Person:
    """Assign a custom avatar already stored for the doctor."""
    sanitized_path = _sanitize_relative_path(relative_path)
    expected_dir = f"doctor_avatars/{doctor.id}/"
    if not sanitized_path.startswith(expected_dir):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="El avatar no pertenece al usuario.")

    suffix = _relative_suffix(sanitized_path)
    full_path = (UPLOAD_AVATAR_ROOT / suffix).resolve()
    if not full_path.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Avatar personalizado no encontrado.")

    doctor.avatar_type = "custom"
    doctor.avatar_template_key = None
    doctor.avatar_file_path = sanitized_path
    db.commit()
    db.refresh(doctor)
    return doctor


def reset_avatar(db: Session, doctor: Person) -> Person:
    """Reset avatar to initials."""
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
        sanitized = _sanitize_relative_path(doctor.avatar_file_path)
        custom_url = _build_custom_url(sanitized)
        payload["url"] = custom_url
        payload["avatar_url"] = custom_url

    return payload

