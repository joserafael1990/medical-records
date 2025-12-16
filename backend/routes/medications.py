"""
Medication management endpoints
Migrated from main_clean_english.py to improve code organization
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List, Optional

from database import get_db, Person, Medication
from dependencies import get_current_user
from logger import get_logger
import schemas
from sqlalchemy.exc import IntegrityError, SQLAlchemyError

router = APIRouter(prefix="/api", tags=["medications"])
api_logger = get_logger("medical_records.api")


@router.get("/medications", response_model=List[schemas.MedicationResponse])
async def get_medications(
    search: Optional[str] = Query(default=None, description="Filtro por nombre"),
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user)
):
    """Return medications available for the current doctor."""
    api_logger.info(
        "📋 Obteniendo medicamentos",
        extra={"doctor_id": current_user.id, "search": search}
    )

    try:
        # Show system medications (created_by=0) OR doctor's own medications (created_by=doctor_id)
        query = db.query(Medication).filter(
            or_(
                Medication.created_by == 0,
                Medication.created_by == current_user.id
            )
        )

        if search:
            search_pattern = f"%{search.strip()}%"
            query = query.filter(Medication.name.ilike(search_pattern))

        medications = query.order_by(Medication.created_by.desc(), Medication.name.asc()).all()

        api_logger.info(
            "✅ Medicamentos obtenidos",
            extra={"doctor_id": current_user.id, "count": len(medications)}
        )
        return medications

    except Exception as exc:
        api_logger.error(
            "❌ Error obteniendo medicamentos",
            extra={"doctor_id": current_user.id, "error": str(exc)}
        )
        raise HTTPException(status_code=500, detail="Error al obtener los medicamentos")


@router.post("/medications", response_model=schemas.MedicationResponse, status_code=status.HTTP_201_CREATED)
async def create_medication(
    medication_data: schemas.MedicationCreate,
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user)
):
    """Create a new medication belonging to the current doctor."""
    api_logger.info(
        "📋 Creando medicamento",
        extra={"doctor_id": current_user.id, "name": medication_data.name}
    )

    try:
        normalized_name = medication_data.name.strip()

        existing_medication = (
            db.query(Medication)
            .filter(
                Medication.created_by == current_user.id,
                Medication.name.ilike(normalized_name)
            )
            .first()
        )

        if existing_medication:
            api_logger.info(
                "⚠️ Medicamento existente devuelto",
                extra={"doctor_id": current_user.id, "medication_id": existing_medication.id}
            )
            return existing_medication

        new_medication = Medication(
            name=normalized_name,
            created_by=current_user.id,
            is_active=True
        )

        db.add(new_medication)
        try:
            db.commit()
        except IntegrityError:
            db.rollback()
            api_logger.info(
                "⚠️ Conflicto al crear medicamento, buscando existente",
                extra={"doctor_id": current_user.id, "name": normalized_name}
            )
            existing_medication = (
                db.query(Medication)
                .filter(
                    Medication.created_by == current_user.id,
                    Medication.name.ilike(normalized_name)
                )
                .first()
            )
            if existing_medication:
                return existing_medication
            raise

        db.refresh(new_medication)

        api_logger.info(
            "✅ Medicamento creado",
            extra={"doctor_id": current_user.id, "medication_id": new_medication.id}
        )
        return new_medication

    except IntegrityError as exc:
        db.rollback()
        api_logger.error(
            "❌ Integridad al crear medicamento",
            extra={"doctor_id": current_user.id, "name": normalized_name, "error": str(exc)}
        )
        raise HTTPException(status_code=400, detail="Ya existe un medicamento con ese nombre")
    except SQLAlchemyError as exc:
        db.rollback()
        api_logger.error(
            "❌ Error creando medicamento",
            extra={"doctor_id": current_user.id, "error": str(exc)}
        )
        raise HTTPException(status_code=500, detail="Error al crear el medicamento")
    except Exception as exc:
        db.rollback()
        api_logger.error(
            "❌ Error inesperado creando medicamento",
            extra={"doctor_id": current_user.id, "error": str(exc)}
        )
        raise HTTPException(status_code=500, detail="Error al crear el medicamento")
