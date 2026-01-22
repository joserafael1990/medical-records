"""
Analytics Service - Métricas y estadísticas para dashboard ejecutivo
Proporciona agregaciones de datos relevantes para médicos
"""
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_, case, extract
from datetime import datetime, date, timedelta
from typing import Dict, Any, Optional, List
import pytz

from database import (
    Person, MedicalRecord, Appointment
)

# Timezone CDMX
CDMX_TZ = pytz.timezone('America/Mexico_City')

def now_cdmx() -> datetime:
    """Get current datetime in CDMX timezone"""
    return datetime.now(CDMX_TZ)

class AnalyticsService:
    """Service for generating analytics and metrics for doctors"""
    
    @staticmethod
    def get_dashboard_metrics(
        db: Session, 
        doctor_id: int, 
        date_from: Optional[date] = None,
        date_to: Optional[date] = None
    ) -> Dict[str, Any]:
        """
        Get all dashboard metrics for a doctor
        
        Args:
            db: Database session
            doctor_id: ID of the doctor
            date_from: Start date for filtering (optional)
            date_to: End date for filtering (optional)
            
        Returns:
            Dictionary with all dashboard metrics
        """
        # Default to last 6 months if no dates provided
        if not date_to:
            date_to = now_cdmx().date()
        if not date_from:
            date_from = date_to - timedelta(days=180)  # 6 months
        
        return {
            "patients": AnalyticsService.get_patient_metrics(db, doctor_id),
            "consultations": AnalyticsService.get_consultation_metrics(
                db, doctor_id, date_from, date_to
            ),
            "appointments": AnalyticsService.get_appointment_metrics(
                db, doctor_id, date_from, date_to
            ),
            "occupation": AnalyticsService.get_occupation_metrics(
                db, doctor_id, date_from, date_to
            ),
            "appointmentFlow": AnalyticsService.get_appointment_flow_sankey(
                db, doctor_id, date_from, date_to
            ),
            "appointmentTrends": AnalyticsService.get_appointment_trends(
                db, doctor_id, date_from, date_to
            ),
            "appointmentTypeTrends": AnalyticsService.get_appointment_type_trends(
                db, doctor_id, date_from, date_to
            )
        }
    
    @staticmethod
    def get_patient_metrics(db: Session, doctor_id: int) -> Dict[str, int]:
        """Get patient metrics: total, new this month, active"""
        now = now_cdmx()
        first_day_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        six_months_ago = now - timedelta(days=180)
        
        # Total patients (patients with appointments OR consultations with this doctor)
        # Get distinct patient IDs from both sources and combine
        appointment_patients = set(
            row[0] for row in db.query(Appointment.patient_id).filter(
                Appointment.doctor_id == doctor_id
            ).distinct().all()
        )
        
        consultation_patients = set(
            row[0] for row in db.query(MedicalRecord.patient_id).filter(
                MedicalRecord.doctor_id == doctor_id
            ).distinct().all()
        )
        
        total = len(appointment_patients.union(consultation_patients))
        
        # New patients this month (patients with first appointment/consultation this month)
        new_this_month = db.query(func.count(func.distinct(Person.id))).join(
            Appointment,
            Appointment.patient_id == Person.id
        ).filter(
            Person.person_type == 'patient',
            Appointment.doctor_id == doctor_id,
            Appointment.appointment_date >= first_day_month
        ).scalar() or 0
        
        # Active patients (with consultation in last 6 months)
        active = db.query(func.count(func.distinct(MedicalRecord.patient_id))).filter(
            MedicalRecord.doctor_id == doctor_id,
            MedicalRecord.consultation_date >= six_months_ago
        ).scalar() or 0
        
        return {
            "total": total,
            "newThisMonth": new_this_month,
            "active": active
        }
    
    @staticmethod
    def get_consultation_metrics(
        db: Session, 
        doctor_id: int, 
        date_from: date, 
        date_to: date
    ) -> Dict[str, Any]:
        """Get consultation metrics: total, this month, average per day, trend"""
        now = now_cdmx()
        first_day_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        first_day_last_month = (first_day_month - timedelta(days=1)).replace(day=1)
        last_day_last_month = first_day_month - timedelta(days=1)
        
        # Total consultations
        total = db.query(func.count(MedicalRecord.id)).filter(
            MedicalRecord.doctor_id == doctor_id,
            func.date(MedicalRecord.consultation_date) >= date_from,
            func.date(MedicalRecord.consultation_date) <= date_to
        ).scalar() or 0
        
        # This month
        this_month = db.query(func.count(MedicalRecord.id)).filter(
            MedicalRecord.doctor_id == doctor_id,
            MedicalRecord.consultation_date >= first_day_month
        ).scalar() or 0
        
        # Last month for trend
        last_month = db.query(func.count(MedicalRecord.id)).filter(
            MedicalRecord.doctor_id == doctor_id,
            func.date(MedicalRecord.consultation_date) >= first_day_last_month.date(),
            func.date(MedicalRecord.consultation_date) <= last_day_last_month.date()
        ).scalar() or 0
        
        # Calculate trend
        trend = 0
        if last_month > 0:
            trend = ((this_month - last_month) / last_month) * 100
        elif this_month > 0:
            trend = 100
        
        # Average per day (this month)
        days_in_month = now.day
        average_per_day = this_month / days_in_month if days_in_month > 0 else 0
        
        # By month for chart
        by_month = db.query(
            extract('year', MedicalRecord.consultation_date).label('year'),
            extract('month', MedicalRecord.consultation_date).label('month'),
            func.count(MedicalRecord.id).label('count')
        ).filter(
            MedicalRecord.doctor_id == doctor_id,
            func.date(MedicalRecord.consultation_date) >= date_from,
            func.date(MedicalRecord.consultation_date) <= date_to
        ).group_by(
            extract('year', MedicalRecord.consultation_date),
            extract('month', MedicalRecord.consultation_date)
        ).order_by(
            extract('year', MedicalRecord.consultation_date),
            extract('month', MedicalRecord.consultation_date)
        ).all()
        
        by_month_list = [
            {
                "month": f"{int(row.year)}-{int(row.month):02d}",
                "count": row.count
            }
            for row in by_month
        ]
        
        return {
            "total": total,
            "thisMonth": this_month,
            "averagePerDay": round(average_per_day, 2),
            "trend": round(trend, 2),
            "byMonth": by_month_list
        }
    
    @staticmethod
    def get_appointment_metrics(
        db: Session, 
        doctor_id: int, 
        date_from: date, 
        date_to: date
    ) -> Dict[str, Any]:
        """Get appointment metrics: today, this week, completed, cancelled, no-show, attendance rate"""
        now = now_cdmx()
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        today_end = today_start + timedelta(days=1)
        week_start = today_start - timedelta(days=now.weekday())
        
        # Today
        today = db.query(func.count(Appointment.id)).filter(
            Appointment.doctor_id == doctor_id,
            Appointment.appointment_date >= today_start,
            Appointment.appointment_date < today_end
        ).scalar() or 0
        
        # This week
        this_week = db.query(func.count(Appointment.id)).filter(
            Appointment.doctor_id == doctor_id,
            Appointment.appointment_date >= week_start
        ).scalar() or 0
        
        # Completed (has medical_record)
        completed = db.query(func.count(func.distinct(Appointment.id))).join(
            MedicalRecord,
            and_(
                MedicalRecord.patient_id == Appointment.patient_id,
                MedicalRecord.doctor_id == Appointment.doctor_id,
                func.abs(
                    extract('epoch', MedicalRecord.consultation_date - Appointment.appointment_date)
                ) < 3600  # Within 1 hour
            )
        ).filter(
            Appointment.doctor_id == doctor_id,
            func.date(Appointment.appointment_date) >= date_from,
            func.date(Appointment.appointment_date) <= date_to
        ).scalar() or 0
        
        # Cancelled
        cancelled = db.query(func.count(Appointment.id)).filter(
            Appointment.doctor_id == doctor_id,
            Appointment.status == 'cancelled',
            func.date(Appointment.appointment_date) >= date_from,
            func.date(Appointment.appointment_date) <= date_to
        ).scalar() or 0
        
        pending = db.query(func.count(Appointment.id)).filter(
            Appointment.doctor_id == doctor_id,
            Appointment.status == 'por_confirmar',
            func.date(Appointment.appointment_date) >= date_from,
            func.date(Appointment.appointment_date) <= date_to
        ).scalar() or 0
        
        # Total in period for attendance rate
        total_in_period = db.query(func.count(Appointment.id)).filter(
            Appointment.doctor_id == doctor_id,
            func.date(Appointment.appointment_date) >= date_from,
            func.date(Appointment.appointment_date) <= date_to
        ).scalar() or 0
        
        attendance_rate = (completed / total_in_period * 100) if total_in_period > 0 else 0
        
        # By status
        by_status = db.query(
            Appointment.status,
            func.count(Appointment.id).label('count')
        ).filter(
            Appointment.doctor_id == doctor_id,
            func.date(Appointment.appointment_date) >= date_from,
            func.date(Appointment.appointment_date) <= date_to
        ).group_by(Appointment.status).all()
        
        by_status_list = [
            {"status": row.status or "unknown", "count": row.count}
            for row in by_status
        ]
        
        return {
            "today": today,
            "thisWeek": this_week,
            "completed": completed,
            "cancelled": cancelled,
            "pending": pending,
            "attendanceRate": round(attendance_rate, 2),
            "byStatus": by_status_list
        }
    
    @staticmethod
    def get_occupation_metrics(
        db: Session, 
        doctor_id: int, 
        date_from: date, 
        date_to: date
    ) -> Dict[str, Any]:
        """Get occupation metrics: hours worked, appointments completed, occupancy rate"""
        now = now_cdmx()
        first_day_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        
        # Appointments completed this month (with medical_record)
        appointments_completed = db.query(func.count(func.distinct(Appointment.id))).join(
            MedicalRecord,
            and_(
                MedicalRecord.patient_id == Appointment.patient_id,
                MedicalRecord.doctor_id == Appointment.doctor_id,
                func.abs(
                    extract('epoch', MedicalRecord.consultation_date - Appointment.appointment_date)
                ) < 3600
            )
        ).filter(
            Appointment.doctor_id == doctor_id,
            Appointment.appointment_date >= first_day_month
        ).scalar() or 0
        
        # Calculate hours worked (sum of appointment durations)
        # Assuming average 30 minutes per appointment
        hours_worked = (appointments_completed * 0.5)
        
        # Occupancy rate (completed / total scheduled this month)
        total_scheduled_month = db.query(func.count(Appointment.id)).filter(
            Appointment.doctor_id == doctor_id,
            Appointment.appointment_date >= first_day_month
        ).scalar() or 0
        
        occupancy_rate = (appointments_completed / total_scheduled_month * 100) if total_scheduled_month > 0 else 0
        
        return {
            "hoursWorkedThisMonth": round(hours_worked, 2),
            "appointmentsCompleted": appointments_completed,
            "occupancyRate": round(occupancy_rate, 2)
        }
    
    @staticmethod
    def get_appointment_flow_sankey(
        db: Session, 
        doctor_id: int, 
        date_from: date, 
        date_to: date
    ) -> Dict[str, Any]:
        """
        Get appointment flow data for Sankey diagram
        Shows flow from scheduled appointments to final outcomes
        """
        now = now_cdmx()
        
        # Total scheduled in period
        total_scheduled = db.query(func.count(Appointment.id)).filter(
            Appointment.doctor_id == doctor_id,
            func.date(Appointment.appointment_date) >= date_from,
            func.date(Appointment.appointment_date) <= date_to
        ).scalar() or 0
        
        if total_scheduled == 0:
            return {
                "totalScheduled": 0,
                "confirmedAppointments": 0,
                "completedConsultations": 0,
                "cancelledByDoctor": 0,
                "cancelledByPatient": 0,
                "percentages": {
                    "confirmed": 0,
                    "completed": 0,
                    "cancelledByDoctor": 0,
                    "cancelledByPatient": 0
                },
                "sankeyData": {
                    "nodes": [],
                    "links": []
                }
            }
        
        # Confirmed appointments (status='confirmada')
        confirmed_appointments = db.query(func.count(Appointment.id)).filter(
            Appointment.doctor_id == doctor_id,
            Appointment.status == 'confirmada',
            func.date(Appointment.appointment_date) >= date_from,
            func.date(Appointment.appointment_date) <= date_to
        ).scalar() or 0
        
        # Completed consultations (has medical_record within 1 hour of appointment)
        completed_consultations = db.query(func.count(func.distinct(Appointment.id))).join(
            MedicalRecord,
            and_(
                MedicalRecord.patient_id == Appointment.patient_id,
                MedicalRecord.doctor_id == Appointment.doctor_id,
                func.abs(
                    extract('epoch', MedicalRecord.consultation_date - Appointment.appointment_date)
                ) < 3600
            )
        ).filter(
            Appointment.doctor_id == doctor_id,
            func.date(Appointment.appointment_date) >= date_from,
            func.date(Appointment.appointment_date) <= date_to
        ).scalar() or 0
        
        # Cancelled by doctor (status='cancelled' and cancelled_by = doctor_id)
        cancelled_by_doctor = db.query(func.count(Appointment.id)).filter(
            Appointment.doctor_id == doctor_id,
            Appointment.status == 'cancelled',
            Appointment.cancelled_by == doctor_id,
            func.date(Appointment.appointment_date) >= date_from,
            func.date(Appointment.appointment_date) <= date_to
        ).scalar() or 0
        
        # Cancelled by patient (status='cancelled' and cancelled_by != doctor_id or is patient_id)
        cancelled_by_patient = db.query(func.count(Appointment.id)).filter(
            Appointment.doctor_id == doctor_id,
            Appointment.status == 'cancelled',
            or_(
                Appointment.cancelled_by != doctor_id,
                Appointment.cancelled_by == Appointment.patient_id
            ),
            Appointment.cancelled_by.isnot(None),
            func.date(Appointment.appointment_date) >= date_from,
            func.date(Appointment.appointment_date) <= date_to
        ).scalar() or 0
        
        # Calculate percentages based on total scheduled
        percentages = {
            "confirmed": round((confirmed_appointments / total_scheduled) * 100, 2) if total_scheduled > 0 else 0,
            "completed": round((completed_consultations / total_scheduled) * 100, 2) if total_scheduled > 0 else 0,
            "cancelledByDoctor": round((cancelled_by_doctor / total_scheduled) * 100, 2) if total_scheduled > 0 else 0,
            "cancelledByPatient": round((cancelled_by_patient / total_scheduled) * 100, 2) if total_scheduled > 0 else 0
        }
        
        # Calculate total cancelled
        total_cancelled = cancelled_by_doctor + cancelled_by_patient
        cancelled_percentage = round((total_cancelled / total_scheduled) * 100, 2) if total_scheduled > 0 else 0
        
        # Calculate percentage from confirmed to completed
        confirmed_to_completed_pct = round((completed_consultations / confirmed_appointments) * 100, 2) if confirmed_appointments > 0 else 0
        
        # Calculate percentages from cancelled to doctor/patient
        cancelled_to_doctor_pct = round((cancelled_by_doctor / total_cancelled) * 100, 2) if total_cancelled > 0 else 0
        cancelled_to_patient_pct = round((cancelled_by_patient / total_cancelled) * 100, 2) if total_cancelled > 0 else 0
        
        # Build Sankey data structure with funnel stages
        nodes = [
            {"id": "Citas Agendadas", "label": "Citas Agendadas"},
            {"id": "Citas Confirmadas", "label": "Citas Confirmadas"},
            {"id": "Consultas", "label": "Consultas"},
            {"id": "Citas Canceladas", "label": "Citas Canceladas"},
            {"id": "Canceladas por Médico", "label": "Canceladas por Médico"},
            {"id": "Canceladas por Paciente", "label": "Canceladas por Paciente"}
        ]
        
        links = []
        
        # Flow: Agendadas -> Confirmadas
        # Always create link with actual value (even if 0) to maintain funnel structure
        links.append({
            "source": "Citas Agendadas",
            "target": "Citas Confirmadas",
            "value": confirmed_appointments,
            "percentage": percentages["confirmed"]
        })
        
        # Flow: Confirmadas -> Consultas
        # Always create link with actual value (even if 0) to maintain funnel structure
        links.append({
            "source": "Citas Confirmadas",
            "target": "Consultas",
            "value": completed_consultations,
            "percentage": confirmed_to_completed_pct
        })
        
        # Flow: Agendadas -> Citas Canceladas
        # Always create link with actual value (even if 0) to maintain funnel structure
        links.append({
            "source": "Citas Agendadas",
            "target": "Citas Canceladas",
            "value": total_cancelled,
            "percentage": cancelled_percentage
        })
        
        # Flow: Citas Canceladas -> Canceladas por Médico
        # Always create link with actual value (even if 0) to maintain funnel structure
        links.append({
            "source": "Citas Canceladas",
            "target": "Canceladas por Médico",
            "value": cancelled_by_doctor,
            "percentage": cancelled_to_doctor_pct
        })
        
        # Flow: Citas Canceladas -> Canceladas por Paciente
        # Always create link with actual value (even if 0) to maintain funnel structure
        links.append({
            "source": "Citas Canceladas",
            "target": "Canceladas por Paciente",
            "value": cancelled_by_patient,
            "percentage": cancelled_to_patient_pct
        })
        
        return {
            "totalScheduled": total_scheduled,
            "confirmedAppointments": confirmed_appointments,
            "completedConsultations": completed_consultations,
            "cancelledByDoctor": cancelled_by_doctor,
            "cancelledByPatient": cancelled_by_patient,
            "percentages": percentages,
            "sankeyData": {
                "nodes": nodes,
                "links": links
            }
        }

    @staticmethod
    def get_appointment_trends(
        db: Session,
        doctor_id: int,
        date_from: date,
        date_to: date
    ) -> Dict[str, Any]:
        """Get monthly trends for scheduled, cancelled by patient, and consultations"""

        month_expr = func.date_trunc('month', Appointment.appointment_date)

        scheduled_rows = db.query(
            month_expr.label('month'),
            func.count(Appointment.id).label('count')
        ).filter(
            Appointment.doctor_id == doctor_id,
            func.date(Appointment.appointment_date) >= date_from,
            func.date(Appointment.appointment_date) <= date_to
        ).group_by(month_expr).all()

        cancelled_rows = db.query(
            month_expr.label('month'),
            func.count(Appointment.id).label('count')
        ).filter(
            Appointment.doctor_id == doctor_id,
            Appointment.status == 'cancelled',
            Appointment.cancelled_by.isnot(None),
            or_(
                Appointment.cancelled_by == Appointment.patient_id,
                Appointment.cancelled_by != doctor_id
            ),
            func.date(Appointment.appointment_date) >= date_from,
            func.date(Appointment.appointment_date) <= date_to
        ).group_by(month_expr).all()

        consultation_month_expr = func.date_trunc('month', MedicalRecord.consultation_date)

        consultation_rows = db.query(
            consultation_month_expr.label('month'),
            func.count(MedicalRecord.id).label('count')
        ).filter(
            MedicalRecord.doctor_id == doctor_id,
            func.date(MedicalRecord.consultation_date) >= date_from,
            func.date(MedicalRecord.consultation_date) <= date_to
        ).group_by(consultation_month_expr).all()

        def rows_to_map(rows):
            result = {}
            for row in rows:
                month_key = row.month.strftime('%Y-%m') if row.month else None
                if month_key:
                    result[month_key] = row.count
            return result

        scheduled_map = rows_to_map(scheduled_rows)
        cancelled_map = rows_to_map(cancelled_rows)
        consultations_map = rows_to_map(consultation_rows)

        # Iterate through each month in the range
        current = date(date_from.year, date_from.month, 1)
        end = date(date_to.year, date_to.month, 1)

        data = []
        while current <= end:
            month_key = current.strftime('%Y-%m')
            data.append({
                "month": month_key,
                "scheduled": scheduled_map.get(month_key, 0),
                "cancelledByPatient": cancelled_map.get(month_key, 0),
                "consultations": consultations_map.get(month_key, 0)
            })

            # increment month
            if current.month == 12:
                current = date(current.year + 1, 1, 1)
            else:
                current = date(current.year, current.month + 1, 1)

        return {
            "data": data
        }

    @staticmethod
    def get_appointment_type_trends(
        db: Session,
        doctor_id: int,
        date_from: date,
        date_to: date
    ) -> Dict[str, Any]:
        """Get monthly trends of appointment types (new patient vs follow-up)"""

        month_expr = func.date_trunc('month', Appointment.appointment_date)

        total_rows = db.query(
            month_expr.label('month'),
            func.count(Appointment.id).label('count')
        ).filter(
            Appointment.doctor_id == doctor_id,
            func.date(Appointment.appointment_date) >= date_from,
            func.date(Appointment.appointment_date) <= date_to
        ).group_by(month_expr).all()

        new_rows = db.query(
            month_expr.label('month'),
            func.count(Appointment.id).label('count')
        ).filter(
            Appointment.doctor_id == doctor_id,
            Appointment.consultation_type.ilike('%primera%'),
            func.date(Appointment.appointment_date) >= date_from,
            func.date(Appointment.appointment_date) <= date_to
        ).group_by(month_expr).all()

        follow_rows = db.query(
            month_expr.label('month'),
            func.count(Appointment.id).label('count')
        ).filter(
            Appointment.doctor_id == doctor_id,
            Appointment.consultation_type.ilike('%seguimiento%'),
            func.date(Appointment.appointment_date) >= date_from,
            func.date(Appointment.appointment_date) <= date_to
        ).group_by(month_expr).all()

        def rows_to_map(rows):
            result = {}
            for row in rows:
                if row.month:
                    month_key = row.month.strftime('%Y-%m')
                    result[month_key] = row.count
            return result

        total_map = rows_to_map(total_rows)
        new_map = rows_to_map(new_rows)
        follow_map = rows_to_map(follow_rows)

        current = date(date_from.year, date_from.month, 1)
        end = date(date_to.year, date_to.month, 1)

        data = []
        while current <= end:
            month_key = current.strftime('%Y-%m')
            total = total_map.get(month_key, 0)
            new_patients = new_map.get(month_key, 0)
            follow_up = follow_map.get(month_key, 0)
            other = max(total - new_patients - follow_up, 0)

            data.append({
                "month": month_key,
                "newPatient": new_patients,
                "followUp": follow_up,
                "other": other
            })

            if current.month == 12:
                current = date(current.year + 1, 1, 1)
            else:
                current = date(current.year, current.month + 1, 1)

        return {
            "data": data
        }

