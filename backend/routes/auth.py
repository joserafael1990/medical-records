"""
Authentication endpoints
Migrated from main_clean_english.py to improve code organization
"""

from fastapi import APIRouter, Depends, HTTPException, status, Request, Body
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import Optional
import os
import traceback
from psycopg2.extras import Json

from database import get_db, Person, Office, Specialty, DocumentType, Document, PersonDocument
from dependencies import get_current_user
from logger import get_logger
from models.system import PrivacyConsent, PrivacyNotice, LegalDocument, LegalAcceptance
from utils.document_validators import (
    CURP_DOCUMENT_NAME,
    PROFESSIONAL_LICENSE_DOCUMENT_NAME,
    validate_curp_format,
    validate_professional_license_format,
)
import auth
import crud
import schemas
from audit_service import audit_service


def _client_ip(request: Request) -> Optional[str]:
    """Server-side IP capture for LFPDPPP consent audit (never trust client payload)."""
    if request is None:
        return None
    forwarded = request.headers.get('x-forwarded-for') if request.headers else None
    if forwarded:
        return forwarded.split(',')[0].strip() or None
    if request.client and request.client.host:
        return request.client.host
    return None

api_logger = get_logger("medical_records.api")

router = APIRouter(prefix="/api", tags=["auth"])


@router.post("/auth/register")
async def register_doctor(
    doctor_data: schemas.DoctorCreate,
    request: Request,
    db: Session = Depends(get_db)
):
    """Register new doctor with automatic login.

    Supports two modes:
    - Full (default): requires office/schedule/personal+professional documents.
    - Quick (`quick_registration=True`): requires only the NOM-004/024 minimum
      (email, password, name, specialty, cédula profesional) plus an explicit
      LFPDPPP privacy_consent. Office/schedule are deferred.
    """
    try:
        quick_mode = bool(getattr(doctor_data, 'quick_registration', False))
        api_logger.info(
            "Registration attempt",
            email=doctor_data.email,
            quick_mode=quick_mode,
        )
        db.begin()

        # Check if email already exists
        existing_email = db.query(Person).filter(Person.email == doctor_data.email).first()
        api_logger.debug("Email existence check completed", email=doctor_data.email, exists=bool(existing_email))
        if existing_email:
            api_logger.warning("Registration blocked - email already exists", email=doctor_data.email)
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El email ya está registrado en el sistema"
            )

        # Quick mode requires explicit privacy consent and specialty (NOM-004).
        if quick_mode:
            if not doctor_data.privacy_consent or not doctor_data.privacy_consent.accepted:
                db.rollback()
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Debes aceptar el aviso de privacidad (LFPDPPP)",
                )
            if not doctor_data.specialty_id:
                db.rollback()
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="La especialidad es obligatoria (NOM-004-SSA3-2012)",
                )

        # Validate documents: full mode requires personal+professional; quick mode requires cédula only.
        if not hasattr(doctor_data, 'documents') or not doctor_data.documents:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Se requiere la cédula profesional" if quick_mode
                else "Se requiere al menos un documento personal y un documento profesional",
            )

        # Get document types
        personal_type = db.query(DocumentType).filter(DocumentType.name == 'Personal').first()
        professional_type = db.query(DocumentType).filter(DocumentType.name == 'Profesional').first()

        if not personal_type or not professional_type:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Error en configuración de tipos de documento"
            )

        # Check documents - get all documents of each type to verify
        personal_docs_catalog = crud.get_documents_by_type(db, personal_type.id)
        professional_docs_catalog = crud.get_documents_by_type(db, professional_type.id)
        personal_doc_ids = [doc.id for doc in personal_docs_catalog]
        professional_doc_ids = [doc.id for doc in professional_docs_catalog]

        personal_docs = [d for d in doctor_data.documents if d.document_id in personal_doc_ids]
        professional_docs = [d for d in doctor_data.documents if d.document_id in professional_doc_ids]

        if not quick_mode and not personal_docs:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Se requiere al menos un documento personal"
            )

        if not professional_docs:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Se requiere al menos un documento profesional"
            )

        # Format validation (NOM-024): cédula profesional 7-8 digits; CURP full structure.
        catalog_by_id = {d.id: d for d in (personal_docs_catalog + professional_docs_catalog)}
        for doc in doctor_data.documents:
            catalog_doc = catalog_by_id.get(doc.document_id)
            if not catalog_doc:
                continue
            name = (catalog_doc.name or '').strip()
            if name == PROFESSIONAL_LICENSE_DOCUMENT_NAME:
                ok, err = validate_professional_license_format(doc.document_value or '')
                if not ok:
                    db.rollback()
                    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=err)
            elif name == CURP_DOCUMENT_NAME:
                ok, err = validate_curp_format(doc.document_value or '')
                if not ok:
                    db.rollback()
                    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=err)

        # Quick mode must include cédula profesional specifically.
        if quick_mode:
            has_cedula = any(
                (catalog_by_id.get(d.document_id) and
                 (catalog_by_id[d.document_id].name or '').strip() == PROFESSIONAL_LICENSE_DOCUMENT_NAME)
                for d in doctor_data.documents
            )
            if not has_cedula:
                db.rollback()
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="La cédula profesional es obligatoria (NOM-024-SSA3-2012)",
                )
        
        # Check for duplicate document values (same document_id only, not across different document types)
        # Ejemplo: C.I="12345" y C.I.E="12345" pueden coexistir, pero no dos C.I="12345"
        for doc in doctor_data.documents:
            existing_doc = db.query(PersonDocument).filter(
                PersonDocument.document_id == doc.document_id,  # Mismo documento específico (C.I, C.I.E, CURP, etc.)
                PersonDocument.document_value == doc.document_value,
                PersonDocument.is_active == True
            ).first()
            if existing_doc:
                document = db.query(Document).filter(Document.id == doc.document_id).first()
                db.rollback()
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"El documento {document.name if document else 'desconocido'} con valor '{doc.document_value}' ya está registrado. Cada tipo de documento debe tener un valor único."
                )
        
        # Create doctor
        doctor = crud.create_doctor_safe(db, doctor_data)

        # Commit doctor creation first
        db.commit()
        api_logger.info(f"Doctor {doctor.id} created successfully")

        # Persist clickwrap: Aviso-Plataforma + ToS + DPA (Contrato de Encargo).
        # Estos son los 3 documentos que el médico acepta AL REGISTRARSE con
        # CORTEX. NO son el aviso al paciente — ese se renderiza por doctor
        # cuando el médico atiende a un paciente.
        #
        # Art. 16 LFPDPPP + Art. 49 Reglamento: la aceptación del DPA es lo
        # que convierte a CORTEX formalmente en Encargado del médico, en vez
        # de corresponsable del expediente clínico.
        if doctor_data.privacy_consent and doctor_data.privacy_consent.accepted:
            try:
                consent_ip = _client_ip(request)
                user_agent = doctor_data.privacy_consent.user_agent or (
                    request.headers.get('user-agent') if request and request.headers else None
                )
                accepted_at = doctor_data.privacy_consent.accepted_at or __import__('datetime').datetime.utcnow()

                # Obtener la versión activa de cada documento.
                active_docs = {}
                for doc_type in ('platform_privacy', 'tos', 'dpa'):
                    doc = (
                        db.query(LegalDocument)
                        .filter(
                            LegalDocument.doc_type == doc_type,
                            LegalDocument.is_active.is_(True),
                        )
                        .order_by(LegalDocument.effective_date.desc())
                        .first()
                    )
                    if doc:
                        active_docs[doc_type] = doc

                # Registrar aceptación para cada documento presente. Si algún
                # documento está ausente (schema incompleto), loggear pero no
                # bloquear el signup — el usuario puede firmarlo después.
                accepted_types = []
                for doc_type, doc in active_docs.items():
                    acceptance = LegalAcceptance(
                        user_id=doctor.id,
                        document_id=doc.id,
                        accepted_at=accepted_at,
                        ip_address=consent_ip,
                        user_agent=user_agent,
                    )
                    db.add(acceptance)
                    accepted_types.append(doc_type)

                db.commit()
                api_logger.info(
                    "Legal clickwrap recorded at signup",
                    doctor_id=doctor.id,
                    accepted=accepted_types,
                )

                missing = [t for t in ('platform_privacy', 'tos', 'dpa') if t not in active_docs]
                if missing:
                    api_logger.warning(
                        "Some legal documents missing — doctor may need to re-sign later",
                        doctor_id=doctor.id,
                        missing=missing,
                    )
            except Exception as consent_error:
                api_logger.error(
                    "Failed to persist legal acceptances (doctor registration continues)",
                    doctor_id=doctor.id,
                    error=str(consent_error),
                )
                db.rollback()
        
        # Create office FIRST if office data is provided (needed for schedule templates)
        office_data = {
            'office_name': getattr(doctor_data, 'office_name', None),
            'office_address': getattr(doctor_data, 'office_address', None),
            'office_city': getattr(doctor_data, 'office_city', None),
            'office_state_id': getattr(doctor_data, 'office_state_id', None),
            'office_phone': getattr(doctor_data, 'office_phone', None),
            'office_maps_url': getattr(doctor_data, 'office_maps_url', None)
        }
        
        # Check if any office data is provided
        has_office_data = any(value is not None and value != '' for value in office_data.values())
        office_id = None
        
        if has_office_data:
            try:
                api_logger.info(f"Creating office for doctor {doctor.id}", office_data=office_data)
                
                # Create office record
                office_name = office_data['office_name'] or f"Consultorio de {doctor.full_name}"
                office = Office(
                    doctor_id=doctor.id,
                    name=office_name,
                    address=office_data['office_address'],
                    city=office_data['office_city'],
                    state_id=office_data['office_state_id'],
                    phone=office_data['office_phone'],
                    maps_url=office_data['office_maps_url'],
                    is_active=True,
                    timezone='America/Mexico_City'
                )
                db.add(office)
                db.commit()
                db.refresh(office)
                office_id = office.id
                api_logger.info(f"Office {office.id} created for doctor {doctor.id}")
            except Exception as office_error:
                api_logger.error(f"Error creating office for doctor {doctor.id}: {str(office_error)}")
                db.rollback()
                # Continue without office - schedule can use NULL office_id
        
        # Save schedule data if provided (after office is created)
        schedule_data = getattr(doctor_data, 'schedule_data', None)
        if schedule_data and isinstance(schedule_data, dict):
            try:
                api_logger.info(f"Saving schedule data for doctor {doctor.id}", schedule_data=schedule_data)
                
                # Map day names to day_of_week indices
                day_mapping = {
                    'monday': 0, 'tuesday': 1, 'wednesday': 2, 'thursday': 3,
                    'friday': 4, 'saturday': 5, 'sunday': 6
                }
                
                for day_name, day_schedule in schedule_data.items():
                    if day_name in day_mapping and day_schedule and isinstance(day_schedule, dict):
                        day_of_week = day_mapping[day_name]
                        is_active = day_schedule.get('is_active', False)
                        time_blocks = day_schedule.get('time_blocks', [])
                        
                        # Only save if active and has time blocks
                        if is_active and time_blocks and len(time_blocks) > 0:
                            first_block = time_blocks[0]
                            start_time = first_block.get('start_time', '09:00')
                            end_time = first_block.get('end_time', '17:00')
                            
                            # Check if template already exists for this day and office
                            existing_template = db.execute(text("""
                                SELECT id FROM schedule_templates 
                                WHERE doctor_id = :doctor_id 
                                AND day_of_week = :day_of_week 
                                AND (office_id = :office_id OR (:office_id IS NULL AND office_id IS NULL))
                                LIMIT 1
                            """), {
                                'doctor_id': doctor.id,
                                'day_of_week': day_of_week,
                                'office_id': office_id
                            }).fetchone()
                            
                            if existing_template:
                                # Update existing template
                                # Use psycopg2.extras.Json to properly handle JSONB type
                                update_query = text("""
                                    UPDATE schedule_templates 
                                    SET start_time = :start_time,
                                        end_time = :end_time,
                                        is_active = :is_active,
                                        time_blocks = :time_blocks,
                                        updated_at = CURRENT_TIMESTAMP
                                    WHERE id = :template_id
                                """)
                                db.execute(update_query, {
                                    'template_id': existing_template[0],
                                    'start_time': start_time,
                                    'end_time': end_time,
                                    'is_active': is_active,
                                    'time_blocks': Json(time_blocks)  # Use psycopg2 Json wrapper for JSONB
                                })
                            else:
                                # Insert new template
                                # Use psycopg2.extras.Json to properly handle JSONB type
                                insert_query = text("""
                                INSERT INTO schedule_templates 
                                    (doctor_id, office_id, day_of_week, start_time, end_time, is_active, time_blocks, created_at, updated_at)
                                    VALUES (:doctor_id, :office_id, :day_of_week, :start_time, :end_time, :is_active, :time_blocks, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                                """)
                                db.execute(insert_query, {
                                    'doctor_id': doctor.id,
                                    'office_id': office_id,
                                    'day_of_week': day_of_week,
                                    'start_time': start_time,
                                    'end_time': end_time,
                                    'is_active': is_active,
                                    'time_blocks': Json(time_blocks)  # Use psycopg2 Json wrapper for JSONB
                                })
                
                db.commit()
                api_logger.info(f"Successfully saved schedule data for doctor {doctor.id}")
            except Exception as schedule_error:
                # Log the error but don't fail the registration
                api_logger.error(f"Error saving schedule data for doctor {doctor.id}: {str(schedule_error)}")
                db.rollback()
                # Doctor creation is already committed, so this is OK
        
        # Commit schedule data if it was saved successfully
        if schedule_data and isinstance(schedule_data, dict):
            db.commit()
        
        # Login the newly created doctor (doctor is already in the database)
        login_response = auth.login_user(db, doctor_data.email, doctor_data.password)
        
        return {
            "success": True,
            "message": "Doctor registered and authenticated successfully",
            "doctor": {
                "id": doctor.id,
                "email": doctor.email,
                "name": doctor.name,
                "title": doctor.title
            },
            **login_response
        }
        
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        error_str = str(e).lower()
        
        # Log the full error for debugging
        api_logger.error(
            f"Error during doctor registration: {str(e)}",
            email=doctor_data.email if hasattr(doctor_data, 'email') else 'unknown',
            error_type=type(e).__name__,
            traceback=traceback.format_exc()
        )
        api_logger.error("Registration error", email=doctor_data.email, error=str(e), error_type=type(e).__name__)
        traceback.print_exc()
        
        # Handle specific database constraint violations
        if "unique constraint" in error_str:
            if "email" in error_str:
                detail = "El email ya está registrado en el sistema"
            elif "curp" in error_str:
                detail = "El CURP ya está registrado en el sistema"
            elif "professional_license" in error_str:
                detail = "La cédula profesional ya está registrada en el sistema"
            elif "email" in error_str:
                detail = "El correo electrónico ya está registrado en el sistema"
            else:
                detail = "Ya existe un registro con esos datos en el sistema"
            
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=detail
            )
        else:
            # Log the actual error for debugging
            api_logger.error(f"Registration error: {str(e)}", exc_info=True)
            
            # If it's a validation error (Pydantic), return the error details
            if hasattr(e, 'errors') and e.errors:
                # Pydantic validation error
                errors_list = []
                for error in e.errors():
                    field = ".".join(str(x) for x in error.get('loc', []))
                    message = error.get('msg', 'Error de validación')
                    errors_list.append(f"{field}: {message}")
                
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Error de validación: {'; '.join(errors_list)}"
                )
            
            # Return more helpful error message in development
            error_detail = str(e) if "development" in os.environ.get("ENVIRONMENT", "").lower() else "Error interno del servidor. Por favor, intente nuevamente."
            
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=error_detail
            )


@router.post("/auth/login")
async def login(
    login_data: schemas.UserLogin,
    request: Request,
    db: Session = Depends(get_db)
):
    """Login user"""
    user = None
    try:
        # Intentar login
        result = auth.login_user(db, login_data.email, login_data.password)

        # Obtener usuario para auditoría
        user = db.query(Person).filter(Person.email == login_data.email).first()

        # Validar licencia para doctores
        if user and user.person_type == 'doctor':
            from services.license_service import LicenseService
            try:
                LicenseService.require_valid_license(db, user.id)
                # If license_result is None, it means the licenses table doesn't exist
                # We skip validation and allow login in this case
            except HTTPException as license_error:
                # Registrar intento de login bloqueado por licencia
                # Use a fresh session for audit logging
                audit_db = next(get_db())
                try:
                    audit_service.log_login(
                        db=audit_db,
                        user=user,
                        request=request,
                        success=False,
                        error=f"License validation failed: {license_error.detail}"
                    )
                finally:
                    audit_db.close()
                raise license_error
            except Exception:
                raise
        
        # 🆕 Registrar login exitoso en auditoría
        audit_service.log_login(
            db=db,
            user=user,
            request=request,
            success=True
        )
        
        return result
    except HTTPException as e:
        # 🆕 Registrar intento de login fallido
        # CRITICAL FIX: Use a fresh database session for audit logging
        # The main session (db) is in a failed state after the exception
        api_logger.error(f"Login failed with HTTPException: {e.status_code} - {e.detail}", email=login_data.email)
        audit_db = next(get_db())
        try:
            audit_service.log_login(
                db=audit_db,
                user=user,
                request=request,
                success=False,
                error=str(e.detail)
            )
        except Exception as audit_error:
            # If audit logging fails, log it but don't crash
            api_logger.error(f"Failed to log failed login attempt: {str(audit_error)}")
        finally:
            audit_db.close()
        raise e
    except Exception as e:
        # 🆕 Registrar error de sistema
        # CRITICAL FIX: Use a fresh database session for audit logging
        error_traceback = traceback.format_exc()
        api_logger.error(
            f"Login failed with unexpected error: {type(e).__name__} - {str(e)}", 
            extra={
                "email": login_data.email,
                "error_type": type(e).__name__,
                "error_message": str(e),
                "traceback": error_traceback
            }
        )
        # Print to console for immediate visibility in development
        print(f"\n❌ LOGIN ERROR: {type(e).__name__}: {str(e)}")
        print(f"Traceback:\n{error_traceback}\n")
        
        audit_db = next(get_db())
        try:
            audit_service.log_login(
                db=audit_db,
                user=user,
                request=request,
                success=False,
                error=f"Internal server error: {type(e).__name__}"
            )
        except Exception as audit_error:
            # If audit logging fails, log it but don't crash
            api_logger.error(f"Failed to log system error during login: {str(audit_error)}")
        finally:
            audit_db.close()
        
        # In development, show more details
        if os.getenv("APP_ENV", "development").lower() == "development":
            raise HTTPException(
                status_code=500, 
                detail=f"Error interno del servidor: {type(e).__name__}: {str(e)}"
            )
        else:
            raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/auth/me")
async def get_current_user_info(
    current_user: Person = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current user information with formatted data including documents"""
    # Format user data same way as login_user
    user_data = {
        "id": current_user.id,
        "username": current_user.email,
        "person_code": current_user.person_code,
        "person_type": current_user.person_type,
        "full_name": current_user.full_name,
        "email": current_user.email,
        "name": current_user.name,
        "title": current_user.title,
        "birth_date": current_user.birth_date.isoformat() if current_user.birth_date else None,
        "primary_phone": current_user.primary_phone,
    }
    
    # If doctor, add professional fields
    if current_user.person_type == "doctor":
        # Get professional documents from person_documents table
        professional_type = db.query(DocumentType).filter(DocumentType.name == 'Profesional').first()
        professional_documents = []
        if professional_type:
            professional_docs = db.query(PersonDocument).join(Document).filter(
                PersonDocument.person_id == current_user.id,
                PersonDocument.is_active == True,
                Document.document_type_id == professional_type.id
            ).all()
            professional_documents = [{"document_name": doc.document.name, "document_value": doc.document_value} for doc in professional_docs]
        
        # Get personal documents (for CURP, RFC)
        personal_type = db.query(DocumentType).filter(DocumentType.name == 'Personal').first()
        personal_documents = {}
        if personal_type:
            personal_docs = db.query(PersonDocument).join(Document).filter(
                PersonDocument.person_id == current_user.id,
                PersonDocument.is_active == True,
                Document.document_type_id == personal_type.id
            ).all()
            personal_documents = {doc.document.name: doc.document_value for doc in personal_docs}
        
        # Legacy fields for backward compatibility
        professional_license = None
        for doc in professional_documents:
            if doc["document_name"] in ["Cédula Profesional", "Número de Colegiación", "Matrícula Nacional"]:
                professional_license = doc["document_value"]
                break
        
        user_data.update({
            "professional_license": professional_license,
            "professional_documents": professional_documents,
            "personal_documents": personal_documents,
            "specialty": (lambda s: s.name if s else None)(db.query(Specialty).filter(Specialty.id == current_user.specialty_id).first()) if current_user.specialty_id else None,
            "university": current_user.university,
            "graduation_year": current_user.graduation_year,
            "subspecialty": current_user.subspecialty if hasattr(current_user, 'subspecialty') else None,
            "office_address": None,  # Moved to offices table
            "curp": personal_documents.get("CURP", None),
            "rfc": personal_documents.get("RFC", None),
            "title": current_user.title,
        })
    
    return user_data


@router.post("/auth/logout")
async def logout(current_user: Person = Depends(get_current_user)):
    """Logout user"""
    return {"message": "Logged out successfully"}


@router.post("/auth/password-reset/request")
async def request_password_reset(
    reset_data: schemas.PasswordResetRequest,
    db: Session = Depends(get_db),
    request: Request = None
):
    """
    Solicitar recuperación de contraseña
    Envía un correo con un token para resetear la contraseña
    """
    try:
        # Buscar usuario por email
        user = db.query(Person).filter(Person.email == reset_data.email).first()
        
        # Por seguridad, siempre retornamos éxito aunque el email no exista
        # Esto evita que se pueda descubrir qué emails están registrados
        if not user or not user.is_active:
            return {
                "message": "Si el correo existe, recibirás un enlace para restablecer tu contraseña"
            }
        
        # Generar token de recuperación
        reset_token = auth.create_password_reset_token(user.id, user.email)
        
        # Construir URL de reset (frontend)
        # En producción, usar variable de entorno
        frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
        reset_link = f"{frontend_url}/reset-password?token={reset_token}"
        
        # Obtener nombre del usuario
        user_name = user.name or user.email.split("@")[0]
        
        # Enviar email
        from email_service import get_email_service
        email_service = get_email_service()
        email_result = email_service.send_password_reset_email(
            to_email=user.email,
            user_name=user_name,
            reset_link=reset_link
        )
        
        if email_result["success"]:
            api_logger.info(
                "Password reset email sent",
                email=reset_data.email,
            )
            return {
                "message": "Si el correo existe, recibirás un enlace para restablecer tu contraseña"
            }
        else:
            # Log error pero no exponerlo al usuario
            api_logger.error(
                "Error sending password reset email",
                email=reset_data.email,
                error=email_result.get('error')
            )
            return {
                "message": "Si el correo existe, recibirás un enlace para restablecer tu contraseña"
            }

    except Exception as e:
        api_logger.error(
            "Error in password reset request",
            email=getattr(reset_data, 'email', None),
            error=str(e),
            exc_info=True
        )
        # Por seguridad, retornar siempre éxito
        return {
            "message": "Si el correo existe, recibirás un enlace para restablecer tu contraseña"
        }


@router.post("/auth/password-reset/confirm")
async def confirm_password_reset(
    reset_data: schemas.PasswordResetConfirm,
    db: Session = Depends(get_db)
):
    """
    Confirmar y cambiar contraseña con token de recuperación
    """
    try:
        # Validar que las contraseñas coincidan
        if reset_data.new_password != reset_data.confirm_password:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Las contraseñas no coinciden"
            )
        
        # Validar longitud mínima
        if len(reset_data.new_password) < 6:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="La contraseña debe tener al menos 6 caracteres"
            )
        
        # Verificar token
        payload = auth.verify_password_reset_token(reset_data.token)
        if payload is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Token inválido o expirado"
            )
        
        user_id = payload.get("user_id")
        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Token inválido"
            )
        try:
            user_id = int(user_id)
        except (TypeError, ValueError):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Token inválido"
            )
        
        # Cambiar contraseña (strip to match login behavior)
        new_password_clean = (reset_data.new_password or "").strip()
        if len(new_password_clean) < 6:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="La contraseña debe tener al menos 6 caracteres"
            )
        success = auth.reset_user_password(db, user_id, new_password_clean)
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Usuario no encontrado"
            )
        
        return {
            "message": "Contraseña restablecida exitosamente"
        }
    except HTTPException:
        raise
    except Exception as e:
        api_logger.error(
            "Error in password reset confirmation",
            error=str(e),
            exc_info=True
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al restablecer contraseña"
        )

