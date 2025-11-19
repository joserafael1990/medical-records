"""
Schedule management endpoints
Migrated from main_clean_english.py to improve code organization
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text, func
from datetime import datetime, date, timedelta, time
from typing import Optional
import json
import psycopg2

from database import get_db, Person, Appointment
from dependencies import get_current_user
from logger import get_logger
import pytz

api_logger = get_logger("medical_records.api")

# CDMX timezone helper
SYSTEM_TIMEZONE = pytz.timezone('America/Mexico_City')

def now_cdmx():
    """Get current datetime in CDMX timezone"""
    return datetime.now(SYSTEM_TIMEZONE)

router = APIRouter(prefix="/api", tags=["schedule"])


@router.post("/schedule/generate-weekly-template")
async def generate_weekly_template(
    current_user: Person = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Generate default weekly schedule template for doctor"""
    try:
        api_logger.info("Generating default weekly schedule template", doctor_id=current_user.id)
        
        # Get doctor's first active office (or create one if none exists)
        office_result = db.execute(text("""
            SELECT id FROM offices 
            WHERE doctor_id = :doctor_id AND is_active = TRUE 
            LIMIT 1
        """), {'doctor_id': current_user.id})
        office_row = office_result.fetchone()
        office_id = office_row[0] if office_row else None
        
        # If no office exists, create a default one
        if not office_id:
            # Get office data from doctor or use defaults
            office_name = getattr(current_user, 'office_name', 'Consultorio Principal') or 'Consultorio Principal'
            office_address = getattr(current_user, 'office_address', '') or ''
            
            office_insert = db.execute(text("""
                INSERT INTO offices (doctor_id, name, address, is_active, created_at, updated_at)
                VALUES (:doctor_id, :name, :address, TRUE, NOW(), NOW())
                RETURNING id
            """), {
                'doctor_id': current_user.id,
                'name': office_name,
                'address': office_address
            })
            office_id = office_insert.fetchone()[0]
            db.commit()
            api_logger.info("Created default office for schedule", doctor_id=current_user.id, office_id=office_id)
        
        # Default schedule: Monday to Friday 9:00-18:00 with one time block
        default_time_blocks = [{"start_time": "09:00", "end_time": "18:00"}]
        day_names = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
        
        weekly_schedule = {}
        
        # Generate schedules for Monday to Friday (active)
        for day_index in range(5):  # 0-4 = Monday to Friday
            day_name = day_names[day_index]
            
            # Check if schedule already exists for this day
            existing = db.execute(text("""
                SELECT id FROM schedule_templates 
                WHERE doctor_id = :doctor_id 
                AND day_of_week = :day_of_week 
                AND (office_id = :office_id OR office_id IS NULL)
                LIMIT 1
            """), {
                'doctor_id': current_user.id,
                'day_of_week': day_index,
                'office_id': office_id
            }).fetchone()
            
            if existing:
                # Update existing
                db.execute(text("""
                    UPDATE schedule_templates 
                    SET start_time = '09:00',
                        end_time = '18:00',
                        is_active = TRUE,
                        time_blocks = :time_blocks,
                        updated_at = NOW()
                    WHERE id = :template_id
                """), {
                    'template_id': existing[0],
                    'time_blocks': json.dumps(default_time_blocks)
                })
            else:
                # Create new - PostgreSQL will automatically convert JSON string to JSONB
                result = db.execute(text("""
                    INSERT INTO schedule_templates 
                    (doctor_id, office_id, day_of_week, start_time, end_time, is_active, time_blocks, created_at, updated_at)
                    VALUES (:doctor_id, :office_id, :day_of_week, '09:00', '18:00', TRUE, :time_blocks, NOW(), NOW())
                    RETURNING id, day_of_week, start_time, end_time, is_active
                """), {
                    'doctor_id': current_user.id,
                    'office_id': office_id,
                    'day_of_week': day_index,
                    'time_blocks': json.dumps(default_time_blocks)
                })
                template_row = result.fetchone()
            
            weekly_schedule[day_name] = {
                "id": existing[0] if existing else template_row[0],
                "day_of_week": day_index,
                "start_time": "09:00",
                "end_time": "18:00",
                "is_active": True,
                "time_blocks": default_time_blocks
            }
        
        # Set Saturday and Sunday to null (inactive)
        weekly_schedule["saturday"] = None
        weekly_schedule["sunday"] = None
        
        db.commit()
        api_logger.info("Default weekly schedule generated", doctor_id=current_user.id)
        
        return weekly_schedule
        
    except Exception as e:
        db.rollback()
        import traceback
        error_detail = traceback.format_exc()
        api_logger.error("Error generating default weekly schedule", doctor_id=current_user.id, error=str(e), traceback=error_detail)
        raise HTTPException(status_code=500, detail=f"Error generando horario por defecto: {str(e)}")


@router.get("/schedule/templates")
async def get_schedule_templates(current_user: Person = Depends(get_current_user)):
    """Get doctor's schedule templates"""
    try:
        api_logger.info("Getting schedule templates", doctor_id=current_user.id)
        
        # For now, return empty schedule
        # In a full implementation, this would query the schedule_templates table
        empty_schedule = {
            "monday": None,
            "tuesday": None,
            "wednesday": None,
            "thursday": None,
            "friday": None,
            "saturday": None,
            "sunday": None
        }
        
        return empty_schedule
        
    except Exception as e:
        api_logger.error("Error getting schedule templates", doctor_id=current_user.id, error=str(e))
        raise HTTPException(status_code=500, detail=f"Error getting templates: {str(e)}")


@router.get("/schedule/templates/weekly")
async def get_weekly_schedule_templates(
    current_user: Person = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get doctor's weekly schedule templates"""
    try:
        api_logger.info("Getting weekly schedule templates", doctor_id=current_user.id)
        
        # Query templates from database using SQL
        result = db.execute(text("""
            SELECT id, day_of_week, start_time, end_time, is_active, time_blocks
            FROM schedule_templates 
            WHERE doctor_id = :doctor_id
            ORDER BY day_of_week
        """), {"doctor_id": current_user.id})
        
        templates = result.fetchall()
        
        # Transform to frontend format
        weekly_schedule = {
            "monday": None,
            "tuesday": None,
            "wednesday": None,
            "thursday": None,
            "friday": None,
            "saturday": None,
            "sunday": None
        }
        
        day_names = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
        
        for template in templates:
            day_name = day_names[template.day_of_week]
            if template.is_active:
                # Parse time_blocks from JSONB or fallback to start_time/end_time
                time_blocks = []
                if hasattr(template, 'time_blocks') and template.time_blocks:
                    # time_blocks is already parsed from JSONB
                    time_blocks = template.time_blocks if isinstance(template.time_blocks, list) else []
                
                # Fallback: if no time_blocks, create from start_time/end_time
                if not time_blocks and template.start_time and template.end_time:
                    time_blocks = [{
                        "start_time": template.start_time.strftime("%H:%M"),
                        "end_time": template.end_time.strftime("%H:%M")
                    }]
                
                weekly_schedule[day_name] = {
                    "id": template.id,
                    "day_of_week": template.day_of_week,
                    "start_time": template.start_time.strftime("%H:%M") if template.start_time else None,
                    "end_time": template.end_time.strftime("%H:%M") if template.end_time else None,
                    "is_active": template.is_active,
                    "time_blocks": time_blocks
                }
        
        api_logger.info("Weekly schedule templates loaded", doctor_id=current_user.id, templates_count=len(templates))
        return weekly_schedule
        
    except Exception as e:
        import traceback
        error_detail = traceback.format_exc()
        api_logger.error("Error getting weekly schedule templates", doctor_id=current_user.id, error=str(e), traceback=error_detail)
        # Return empty schedule instead of 500 error - better UX
        return {
            "monday": None,
            "tuesday": None,
            "wednesday": None,
            "thursday": None,
            "friday": None,
            "saturday": None,
            "sunday": None
        }


@router.post("/schedule/templates")
async def create_schedule_template(
    template_data: dict,
    current_user: Person = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create or update schedule template"""
    try:
        api_logger.info("Creating schedule template", doctor_id=current_user.id, template_data=template_data)
        
        # Extract data
        day_of_week = template_data.get('day_of_week', 0)
        is_active = template_data.get('is_active', True)
        time_blocks = template_data.get('time_blocks', [])
        
        # Set default times from first time block if available
        start_time = template_data.get('start_time')
        end_time = template_data.get('end_time')
        if not start_time or not end_time:
            if time_blocks and len(time_blocks) > 0:
                first_block = time_blocks[0]
                start_time = first_block.get('start_time', '09:00')
                end_time = first_block.get('end_time', '17:00')
            else:
                start_time = start_time or '09:00'
                end_time = end_time or '17:00'
        
        # Prepare time_blocks JSONB
        time_blocks_json = json.dumps(time_blocks) if time_blocks else '[]'
        
        # Create template in database
        result = db.execute(text("""
            INSERT INTO schedule_templates 
            (doctor_id, day_of_week, start_time, end_time, is_active, time_blocks, created_at, updated_at)
            VALUES (:doctor_id, :day_of_week, :start_time, :end_time, :is_active, :time_blocks, NOW(), NOW())
            RETURNING id
        """), {
            "doctor_id": current_user.id,
            "day_of_week": day_of_week,
            "start_time": start_time,
            "end_time": end_time,
            "is_active": is_active,
            "time_blocks": time_blocks_json
        })
        
        template_id = result.fetchone()[0]
        db.commit()
        
        # Return the created template data
        response_data = {
            "id": template_id,
            "day_of_week": day_of_week,
            "start_time": start_time,
            "end_time": end_time,
            "is_active": is_active,
            "time_blocks": time_blocks if time_blocks else [{"start_time": start_time, "end_time": end_time}]
        }
        
        api_logger.info("Schedule template created", doctor_id=current_user.id, template_id=template_id)
        return response_data
        
    except Exception as e:
        db.rollback()
        api_logger.error("Error creating schedule template", doctor_id=current_user.id, error=str(e))
        raise HTTPException(status_code=500, detail=f"Error saving template: {str(e)}")


@router.put("/schedule/templates/{template_id}")
async def update_schedule_template(
    template_id: str,
    template_data: dict,
    current_user: Person = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update schedule template"""
    try:
        api_logger.info("Updating schedule template", doctor_id=current_user.id, template_id=template_id, template_data=template_data)
        
        # Update the template in database
        update_fields = []
        params = {"template_id": template_id, "doctor_id": current_user.id}
        
        if "is_active" in template_data:
            update_fields.append("is_active = :is_active")
            params["is_active"] = template_data["is_active"]
        
        if "time_blocks" in template_data:
            # Update the time_blocks JSONB and the main start_time/end_time
            time_blocks = template_data["time_blocks"]
            update_fields.append("time_blocks = :time_blocks")
            params["time_blocks"] = json.dumps(time_blocks) if time_blocks else '[]'
            
            # Also update start_time and end_time from the first time block for backwards compatibility
            if time_blocks and len(time_blocks) > 0:
                first_block = time_blocks[0]
                if first_block.get("start_time"):
                    update_fields.append("start_time = :start_time")
                    params["start_time"] = first_block["start_time"]
                if first_block.get("end_time"):
                    update_fields.append("end_time = :end_time")
                    params["end_time"] = first_block["end_time"]
        
        if update_fields:
            update_fields.append("updated_at = NOW()")
            sql = f"""
                UPDATE schedule_templates 
                SET {', '.join(update_fields)}
                WHERE id = :template_id AND doctor_id = :doctor_id
            """
            db.execute(text(sql), params)
            db.commit()
        
        # Return the updated template data
        result = db.execute(text("""
            SELECT id, day_of_week, start_time, end_time, is_active, time_blocks
            FROM schedule_templates 
            WHERE id = :template_id AND doctor_id = :doctor_id
        """), {"template_id": template_id, "doctor_id": current_user.id})
        
        template = result.fetchone()
        
        if template:
            # Transform to frontend format
            day_names = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
            day_name = day_names[template.day_of_week]
            
            # Parse time_blocks from JSONB or fallback to start_time/end_time
            time_blocks = []
            if hasattr(template, 'time_blocks') and template.time_blocks:
                # time_blocks is already parsed from JSONB by psycopg2
                if isinstance(template.time_blocks, list):
                    time_blocks = template.time_blocks
                elif isinstance(template.time_blocks, str):
                    # If it's a string, parse it
                    time_blocks = json.loads(template.time_blocks)
            
            # Fallback: if no time_blocks, create from start_time/end_time
            if not time_blocks and template.start_time and template.end_time:
                time_blocks = [{
                    "start_time": template.start_time.strftime("%H:%M"),
                    "end_time": template.end_time.strftime("%H:%M")
                }]
            
            response_data = {
                "id": template.id,
                "day_of_week": template.day_of_week,
                "start_time": template.start_time.strftime("%H:%M") if template.start_time else None,
                "end_time": template.end_time.strftime("%H:%M") if template.end_time else None,
                "is_active": template.is_active,
                "time_blocks": time_blocks
            }
            
            api_logger.info("Schedule template updated", doctor_id=current_user.id, template_id=template_id)
            return response_data
        else:
            raise HTTPException(status_code=404, detail="Template not found")
        
    except Exception as e:
        db.rollback()
        api_logger.error("Error updating schedule template", doctor_id=current_user.id, error=str(e))
        raise HTTPException(status_code=500, detail=f"Error updating template: {str(e)}")


@router.get("/schedule/available-times")
async def get_available_times(
    date: str,
    current_user: Person = Depends(get_current_user)
):
    """Get available appointment times for a specific date based on doctor's schedule and existing appointments"""
    try:
        # Use current user's doctor_id
        doctor_id = current_user.id
        api_logger.info("Getting available times", doctor_id=doctor_id, date=date)
        
        # Parse the date and get day of week (0=Monday, 6=Sunday)
        target_date = datetime.strptime(date, "%Y-%m-%d").date()
        day_of_week = target_date.weekday()  # 0=Monday, 6=Sunday
        
        # Get doctor's schedule for this day
        conn = psycopg2.connect(
            host='postgres-db',
            database='historias_clinicas',
            user='historias_user',
            password='historias_pass'
        )
        cursor = conn.cursor()
        
        # Get schedule template for this day
        cursor.execute("""
            SELECT start_time, end_time, time_blocks
            FROM schedule_templates 
            WHERE doctor_id = %s AND day_of_week = %s AND is_active = true
        """, (doctor_id, day_of_week))
        
        schedule_result = cursor.fetchone()
        if not schedule_result:
            api_logger.info("No schedule found for this day", doctor_id=doctor_id, day_of_week=day_of_week)
            return {"available_times": []}
        
        # Parse time_blocks from JSONB or fallback to start_time/end_time
        time_blocks = []
        api_logger.debug("Schedule result", doctor_id=current_user.id, date=date)
        
        if schedule_result[2]:  # time_blocks column
            if isinstance(schedule_result[2], list):
                time_blocks = schedule_result[2]
                api_logger.debug(
                    "Using time blocks from list",
                    doctor_id=current_user.id,
                    blocks=len(time_blocks)
                )
            elif isinstance(schedule_result[2], str):
                time_blocks = json.loads(schedule_result[2])
                api_logger.debug("Using time_blocks from JSON string", doctor_id=current_user.id)
        
        # Fallback: if no time_blocks, create from start_time/end_time
        if not time_blocks and schedule_result[0] and schedule_result[1]:
            time_blocks = [{
                "start_time": schedule_result[0].strftime("%H:%M"),
                "end_time": schedule_result[1].strftime("%H:%M")
            }]
            api_logger.debug("Using fallback time_blocks", doctor_id=current_user.id)
        
        api_logger.debug("Final time_blocks", doctor_id=current_user.id, count=len(time_blocks) if time_blocks else 0)
        
        # Get doctor's appointment duration (from persons table)
        cursor.execute("""
            SELECT appointment_duration 
            FROM persons 
            WHERE id = %s
        """, (doctor_id,))
        
        doctor_result = cursor.fetchone()
        consultation_duration = doctor_result[0] if doctor_result and doctor_result[0] else 30
        
        if not time_blocks:
            api_logger.info("No time blocks configured for this day", doctor_id=doctor_id, day_of_week=day_of_week)
            return {"available_times": []}
        
        # Get doctor's timezone from offices table
        cursor.execute("""
            SELECT timezone 
            FROM offices 
            WHERE doctor_id = %s AND is_active = TRUE
            LIMIT 1
        """, (doctor_id,))
        
        timezone_result = cursor.fetchone()
        doctor_timezone = timezone_result[0] if timezone_result and timezone_result[0] else 'America/Mexico_City'
        
        # Get existing appointments for this date
        # Since appointments are stored in CDMX timezone (without tzinfo), 
        # we can query them directly without timezone conversion
        cursor.execute("""
            SELECT appointment_date, end_time 
            FROM appointments 
            WHERE doctor_id = %s 
            AND DATE(appointment_date) = %s 
            AND status IN ('confirmada', 'por_confirmar')
        """, (doctor_id, date))
        
        existing_appointments = cursor.fetchall()
        
        # Convert existing appointments to time ranges
        # Since appointments are stored in CDMX timezone (without tzinfo),
        # we can use them directly
        booked_slots = []
        for apt_date, apt_end in existing_appointments:
            booked_slots.append({
                'start': apt_date.time(),
                'end': apt_end.time()
            })
        
        # Generate available time slots based on schedule
        available_times = []
        
        for block in time_blocks:
            if not block.get('start_time') or not block.get('end_time'):
                continue
                
            start_time = datetime.strptime(block['start_time'], '%H:%M').time()
            end_time = datetime.strptime(block['end_time'], '%H:%M').time()
            
            # Generate 30-minute slots within this time block
            current_time = start_time
            while current_time < end_time:
                # Calculate end of this slot using timedelta
                current_datetime = datetime.combine(target_date, current_time)
                slot_end_datetime = current_datetime + timedelta(minutes=consultation_duration)
                slot_end = slot_end_datetime.time()
                
                # Check if this slot conflicts with existing appointments
                is_available = True
                for booked in booked_slots:
                    # Check for overlap
                    if (current_time < booked['end'] and slot_end > booked['start']):
                        is_available = False
                        break
                
                if is_available:
                    available_times.append({
                        "time": current_time.strftime('%H:%M'),
                        "display": current_time.strftime('%H:%M'),
                        "duration_minutes": consultation_duration,
                        "available": True
                    })
                
                # Move to next slot (30 minutes)
                current_time = (datetime.combine(target_date, current_time) + timedelta(minutes=consultation_duration)).time()
        
        cursor.close()
        conn.close()
        
        preview_slots = [
            {"time": slot["time"], "duration": slot["duration_minutes"]}
            for slot in available_times[:5]
        ]
        api_logger.debug(
            "Generated available time slots",
            doctor_id=doctor_id,
            date=date,
            slot_count=len(available_times),
            preview=preview_slots
        )
        
        api_logger.info("Generated available times", 
                       doctor_id=doctor_id, 
                       date=date, 
                       count=len(available_times))
        
        return {"available_times": available_times}
        
    except Exception as e:
        doctor_id = getattr(current_user, 'id', None)
        api_logger.error("Error getting available times", doctor_id=doctor_id, error=str(e))
        raise HTTPException(status_code=500, detail=f"Error getting available times: {str(e)}")


@router.get("/doctor/schedule")
async def get_doctor_schedule(
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user)
):
    """Get doctor's current schedule"""
    try:
        api_logger.info("Getting doctor schedule", doctor_id=current_user.id)
        
        # For now, return a basic schedule structure
        # In a full implementation, this would query the schedule_templates table
        schedule_data = {
            "doctor_id": current_user.id,
            "doctor_name": current_user.name or "Doctor",
            "schedule": {
                "monday": {"start": "09:00", "end": "17:00", "duration": 30, "active": True},
                "tuesday": {"start": "09:00", "end": "17:00", "duration": 30, "active": True},
                "wednesday": {"start": "09:00", "end": "17:00", "duration": 30, "active": True},
                "thursday": {"start": "09:00", "end": "17:00", "duration": 30, "active": True},
                "friday": {"start": "09:00", "end": "17:00", "duration": 30, "active": True},
                "saturday": {"start": "09:00", "end": "13:00", "duration": 30, "active": False},
                "sunday": {"start": "09:00", "end": "13:00", "duration": 30, "active": False}
            },
            "lunch_break": {"start": "13:00", "end": "14:00"},
            "break_duration": 10,
            "last_updated": now_cdmx().isoformat()
        }
        
        return schedule_data
    except Exception as e:
        api_logger.error("Error getting doctor schedule", doctor_id=current_user.id, error=str(e))
        raise HTTPException(status_code=500, detail=f"Error al obtener horario: {str(e)}")


@router.put("/doctor/schedule")
async def update_doctor_schedule(
    schedule_data: dict,
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user)
):
    """Update doctor's schedule"""
    try:
        api_logger.info("Updating doctor schedule", doctor_id=current_user.id, schedule_data=schedule_data)
        
        # In a full implementation, this would update the schedule_templates table
        # For now, just log the update and return success
        
        updated_schedule = {
            "doctor_id": current_user.id,
            "doctor_name": current_user.name or "Doctor",
            "schedule": schedule_data.get("schedule", {}),
            "lunch_break": schedule_data.get("lunch_break", {"start": "13:00", "end": "14:00"}),
            "break_duration": schedule_data.get("break_duration", 10),
            "last_updated": now_cdmx().isoformat(),
            "message": "Schedule updated successfully"
        }
        
        api_logger.info("Doctor schedule updated", doctor_id=current_user.id)
        return updated_schedule
    except Exception as e:
        api_logger.error("Error updating doctor schedule", doctor_id=current_user.id, error=str(e))
        raise HTTPException(status_code=500, detail=f"Error al actualizar horario: {str(e)}")


@router.get("/doctor/availability")
async def get_doctor_availability(
    date: str,
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user)
):
    """Get doctor's availability for a specific date"""
    try:
        api_logger.info("Getting doctor availability", doctor_id=current_user.id, date=date)
        
        # Parse the date
        target_date = datetime.strptime(date, "%Y-%m-%d").date()
        day_of_week = target_date.weekday()  # 0=Monday, 6=Sunday
        
        # Get existing appointments for this date
        existing_appointments = db.query(Appointment).filter(
            Appointment.doctor_id == current_user.id,
            func.date(Appointment.appointment_date) == target_date,
            Appointment.status.in_(['confirmada', 'por_confirmar'])
        ).all()
        
        # Generate time slots based on doctor's schedule
        # For now, assume 9 AM to 5 PM with 30-minute slots
        time_slots = []
        start_time = datetime.combine(target_date, time(9, 0))
        end_time = datetime.combine(target_date, time(17, 0))
        
        current_time = start_time
        while current_time < end_time:
            # Check if this slot is available
            slot_occupied = any(
                apt.appointment_date <= current_time < apt.end_time
                for apt in existing_appointments
            )
            
            time_slots.append({
                "time": current_time.strftime("%H:%M"),
                "datetime": current_time.isoformat(),
                "available": not slot_occupied,
                "duration": 30
            })
            
            current_time += timedelta(minutes=30)
        
        availability_data = {
            "doctor_id": current_user.id,
            "doctor_name": current_user.name or "Doctor",
            "date": date,
            "day_of_week": day_of_week,
            "time_slots": time_slots,
            "total_slots": len(time_slots),
            "available_slots": len([slot for slot in time_slots if slot["available"]]),
            "existing_appointments": len(existing_appointments)
        }
        
        api_logger.info("Doctor availability retrieved", doctor_id=current_user.id, date=date, available_slots=availability_data["available_slots"])
        return availability_data
    except Exception as e:
        api_logger.error("Error getting doctor availability", doctor_id=current_user.id, date=date, error=str(e))
        raise HTTPException(status_code=500, detail=f"Error getting availability: {str(e)}")
