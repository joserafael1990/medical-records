from typing import Literal, Optional
import os
from pathlib import Path

from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, status, Query
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db, Person
from dependencies import get_current_user
from services import avatar_service


router = APIRouter(prefix="/api/avatars", tags=["avatars"])


class AvatarSelectionRequest(BaseModel):
    mode: Literal['initials', 'preloaded', 'custom']
    template_key: Optional[str] = None
    relative_path: Optional[str] = None


def _require_doctor(db: Session, current_user: Person) -> Person:
    if current_user.person_type != 'doctor':
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo los médicos pueden administrar avatares."
        )
    doctor = db.query(Person).filter(Person.id == current_user.id).first()
    if not doctor:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Perfil de médico no encontrado.")
    return doctor


@router.get("/options")
async def get_avatar_options(
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user)
):
    """Return the list of available avatars for the authenticated doctor."""
    doctor = _require_doctor(db, current_user)
    return {
        "preloaded": avatar_service.list_preloaded_avatars(),
        "custom": avatar_service.list_custom_avatars(doctor.id),
        "current": avatar_service.get_current_avatar_payload(doctor)
    }


@router.post("/upload", status_code=status.HTTP_201_CREATED)
async def upload_custom_avatar(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user)
):
    """Upload a custom avatar for the doctor."""
    doctor = _require_doctor(db, current_user)
    metadata = avatar_service.save_custom_avatar(doctor.id, file)
    return {
        "avatar": metadata,
        "custom": avatar_service.list_custom_avatars(doctor.id)
    }


@router.post("/select")
async def select_avatar(
    payload: AvatarSelectionRequest,
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user)
):
    """Select the avatar that should be used for the doctor profile."""
    doctor = _require_doctor(db, current_user)

    mode = payload.mode
    if mode == 'initials':
        updated = avatar_service.reset_avatar(db, doctor)
    elif mode == 'preloaded':
        if not payload.template_key:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="template_key es requerido.")
        updated = avatar_service.set_preloaded_avatar(db, doctor, payload.template_key)
    elif mode == 'custom':
        if not payload.relative_path:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="relative_path es requerido.")
        updated = avatar_service.set_custom_avatar(db, doctor, payload.relative_path)
    else:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Modo de avatar inválido.")

    return {"current": avatar_service.get_current_avatar_payload(updated)}


@router.delete("/custom")
async def delete_custom_avatar(
    relative_path: str = Query(..., description="Ruta relativa del avatar personalizado"),
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user)
):
    """Delete a custom avatar uploaded by the doctor."""
    doctor = _require_doctor(db, current_user)
    deleted = avatar_service.delete_custom_avatar(doctor.id, relative_path)

    # If the avatar being used was deleted, reset to initials
    if deleted and doctor.avatar_type == "custom" and doctor.avatar_file_path == relative_path:
        avatar_service.reset_avatar(db, doctor)

    return {
        "deleted": deleted,
        "custom": avatar_service.list_custom_avatars(doctor.id),
        "current": avatar_service.get_current_avatar_payload(doctor)
    }


@router.get("/preloaded/{filename}")
async def get_preloaded_avatar(filename: str):
    """Serve preloaded avatar images with CORS headers."""
    BASE_DIR = Path(__file__).resolve().parent.parent
    avatar_path = BASE_DIR / "static" / "doctor_avatars" / "preloaded" / filename
    
    if not avatar_path.exists() or not avatar_path.is_file():
        raise HTTPException(status_code=404, detail="Avatar not found")
    
    # Verify it's in the preloaded directory (security check)
    try:
        avatar_path.resolve().relative_to((BASE_DIR / "static" / "doctor_avatars" / "preloaded").resolve())
    except ValueError:
        raise HTTPException(status_code=403, detail="Access denied")
    
    return FileResponse(
        str(avatar_path),
        media_type="image/png",
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, OPTIONS",
            "Access-Control-Allow-Headers": "*"
        }
    )


@router.get("/custom/{doctor_id}/{filename}")
async def get_custom_avatar(doctor_id: int, filename: str):
    """Serve custom avatar images with CORS headers."""
    BASE_DIR = Path(__file__).resolve().parent.parent
    avatar_path = BASE_DIR / "uploads" / "doctor_avatars" / str(doctor_id) / filename
    
    if not avatar_path.exists() or not avatar_path.is_file():
        raise HTTPException(status_code=404, detail="Avatar not found")
    
    # Verify it's in the doctor's custom directory (security check)
    try:
        avatar_path.resolve().relative_to((BASE_DIR / "uploads" / "doctor_avatars" / str(doctor_id)).resolve())
    except ValueError:
        raise HTTPException(status_code=403, detail="Access denied")
    
    return FileResponse(
        str(avatar_path),
        media_type="image/png",
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, OPTIONS",
            "Access-Control-Allow-Headers": "*"
        }
    )

