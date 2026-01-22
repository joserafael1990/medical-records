"""
Google Calendar API Routes
Endpoints para conectar y gestionar sincronización con Google Calendar
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel

from database import get_db, GoogleCalendarToken, Person
from dependencies import get_current_user
from services.google_calendar_service import GoogleCalendarService
from logger import get_logger

api_logger = get_logger("medical_records.google_calendar")

router = APIRouter(prefix="/api/google-calendar", tags=["Google Calendar"])


class OAuthCallbackRequest(BaseModel):
    code: str
    redirect_uri: str


@router.get("/oauth/authorize")
async def authorize_google_calendar(
    redirect_uri: str = Query(..., description="URI de redirección después de autorización"),
    current_user: Person = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Iniciar flujo OAuth de Google Calendar"""
    if current_user.person_type != "doctor":
        raise HTTPException(status_code=403, detail="Solo doctores pueden conectar Google Calendar")
    
    try:
        # #region agent log
        import json
        import time
        log_data = {"sessionId":"debug-session","runId":"run1","hypothesisId":"ALL","location":"google_calendar.py:34","message":"authorize_google_calendar entry","data":{"doctor_id":current_user.id,"redirect_uri":redirect_uri},"timestamp":int(time.time()*1000)}
        try:
            with open('/Users/rafaelgarcia/Documents/Software projects/medical-records-main/.cursor/debug.log', 'a') as f:
                f.write(json.dumps(log_data)+'\n')
        except: pass
        api_logger.info("DEBUG: authorize_google_calendar entry", extra={"hypothesisId":"ALL","doctor_id":current_user.id,"redirect_uri":redirect_uri})
        # #endregion
        authorization_url = GoogleCalendarService.get_authorization_url(redirect_uri)
        
        api_logger.info("URL de autorización de Google Calendar generada", extra={
            "doctor_id": current_user.id
        })
        
        # #region agent log
        log_data = {"sessionId":"debug-session","runId":"run1","hypothesisId":"ALL","location":"google_calendar.py:41","message":"Authorization URL generated successfully","data":{"doctor_id":current_user.id},"timestamp":int(time.time()*1000)}
        try:
            with open('/Users/rafaelgarcia/Documents/Software projects/medical-records-main/.cursor/debug.log', 'a') as f:
                f.write(json.dumps(log_data)+'\n')
        except: pass
        api_logger.debug("DEBUG: Authorization URL generated successfully", extra={"hypothesisId":"ALL","doctor_id":current_user.id})
        # #endregion
        return {"authorization_url": authorization_url}
    except ValueError as e:
        # #region agent log
        log_data = {"sessionId":"debug-session","runId":"run1","hypothesisId":"A,B","location":"google_calendar.py:43","message":"ValueError caught","data":{"error_message":str(e),"doctor_id":current_user.id},"timestamp":int(time.time()*1000)}
        try:
            with open('/Users/rafaelgarcia/Documents/Software projects/medical-records-main/.cursor/debug.log', 'a') as f:
                f.write(json.dumps(log_data)+'\n')
        except: pass
        api_logger.error("ERROR: ValueError caught in Google Calendar OAuth", extra={"hypothesisId":"A,B","error_message":str(e),"doctor_id":current_user.id}, exc_info=True)
        # #endregion
        api_logger.error("Error de configuración de Google Calendar", exc_info=True)
        raise HTTPException(status_code=500, detail="Google Calendar no está configurado correctamente")
    except Exception as e:
        api_logger.error("Error al generar URL de autorización", exc_info=True, extra={
            "doctor_id": current_user.id
        })
        raise HTTPException(status_code=500, detail="Error al iniciar autorización de Google Calendar")


@router.post("/oauth/callback")
async def oauth_callback(
    request: OAuthCallbackRequest,
    current_user: Person = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Callback de OAuth - intercambiar código por tokens"""
    if current_user.person_type != "doctor":
        raise HTTPException(status_code=403, detail="Solo doctores pueden conectar Google Calendar")
    
    doctor_id = current_user.id
    
    try:
        token_data = GoogleCalendarService.exchange_code_for_tokens(db, doctor_id, request.code, request.redirect_uri)
        
        api_logger.info("Google Calendar conectado exitosamente", extra={
            "doctor_id": doctor_id,
            "sync_enabled": token_data.sync_enabled
        })
        
        return {
            "status": "success",
            "message": "Google Calendar conectado exitosamente",
            "sync_enabled": token_data.sync_enabled
        }
    except ValueError as e:
        # ValueError puede ser de configuración o de código inválido
        error_msg = str(e)
        api_logger.error(f"Error en OAuth callback: {error_msg}", exc_info=True, extra={
            "doctor_id": doctor_id
        })
        # Si es error de configuración, usar 500, si no, 400
        status_code = 500 if "configurado" in error_msg.lower() else 400
        raise HTTPException(status_code=status_code, detail=error_msg)
    except Exception as e:
        api_logger.error("Error en OAuth callback", exc_info=True, extra={
            "doctor_id": doctor_id
        })
        raise HTTPException(status_code=400, detail=f"Error al conectar Google Calendar: {str(e)}")


@router.get("/status")
async def get_connection_status(
    current_user: Person = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Verificar si el doctor tiene Google Calendar conectado"""
    if current_user.person_type != "doctor":
        raise HTTPException(status_code=403, detail="Solo doctores pueden verificar estado de Google Calendar")
    
    doctor_id = current_user.id
    
    token_data = db.query(GoogleCalendarToken).filter(GoogleCalendarToken.doctor_id == doctor_id).first()
    
    if token_data:
        return {
            "connected": True,
            "sync_enabled": token_data.sync_enabled,
            "last_sync_at": token_data.last_sync_at.isoformat() if token_data.last_sync_at else None,
            "calendar_id": token_data.calendar_id
        }
    else:
        return {"connected": False}


@router.post("/disconnect")
async def disconnect_google_calendar(
    current_user: Person = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Desconectar Google Calendar"""
    if current_user.person_type != "doctor":
        raise HTTPException(status_code=403, detail="Solo doctores pueden desconectar Google Calendar")
    
    doctor_id = current_user.id
    
    token_data = db.query(GoogleCalendarToken).filter(GoogleCalendarToken.doctor_id == doctor_id).first()
    if token_data:
        db.delete(token_data)
        db.commit()
        
        api_logger.info("Google Calendar desconectado", extra={
            "doctor_id": doctor_id
        })
        
        return {"status": "success", "message": "Google Calendar desconectado"}
    else:
        raise HTTPException(status_code=404, detail="Google Calendar no está conectado")


@router.post("/sync/toggle")
async def toggle_sync(
    enabled: bool = Query(..., description="Habilitar o deshabilitar sincronización"),
    current_user: Person = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Habilitar o deshabilitar sincronización con Google Calendar"""
    if current_user.person_type != "doctor":
        raise HTTPException(status_code=403, detail="Solo doctores pueden modificar sincronización")
    
    doctor_id = current_user.id
    
    token_data = db.query(GoogleCalendarToken).filter(GoogleCalendarToken.doctor_id == doctor_id).first()
    if not token_data:
        raise HTTPException(status_code=404, detail="Google Calendar no está conectado")
    
    token_data.sync_enabled = enabled
    db.commit()
    
    api_logger.info("Sincronización de Google Calendar actualizada", extra={
        "doctor_id": doctor_id,
        "sync_enabled": enabled
    })
    
    return {
        "status": "success",
        "message": f"Sincronización {'habilitada' if enabled else 'deshabilitada'}",
        "sync_enabled": enabled
    }

