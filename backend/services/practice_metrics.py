"""
Practice metrics aggregator.

Computes doctor-scoped analytics over the clinical record database.
Admin callers see practice-wide totals (across all doctors).

Scope (v1):
- KPIs for the current month vs previous month (deltas)
- Consultations per month — 12-month trend
- Top 10 diagnoses (from `primary_diagnosis` free-text)
- Busiest day-of-week / hour heatmap
- Patient demographics (gender + age buckets)
- New vs returning patients in the current month
- Clinical studies ordered per month — 12-month trend

Revenue / financial metrics are explicitly out of scope for v1 because
the data model does not have a settled price/payment field. Will be
added once `Appointment.estimated_cost` or a dedicated payments table
is in use.

All queries go through SQLAlchemy ORM — no raw SQL — so the tests can
mock `Session.query` via the same chained-MagicMock pattern used in
the rest of the codebase.
"""

from __future__ import annotations

from collections import Counter, defaultdict
from dataclasses import dataclass
from datetime import date, datetime, timedelta
from typing import Any, Dict, List, Optional

from sqlalchemy import and_, func
from sqlalchemy.orm import Session

from database import (
    Appointment,
    ClinicalStudy,
    MedicalRecord,
    Person,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


@dataclass
class MonthRange:
    start: datetime
    end: datetime
    label: str  # "2026-04"


def _month_starts(anchor: datetime, count: int) -> List[MonthRange]:
    """Return the last `count` month ranges ending at `anchor` (inclusive)."""
    out: List[MonthRange] = []
    year = anchor.year
    month = anchor.month
    for _ in range(count):
        start = datetime(year, month, 1)
        if month == 12:
            end = datetime(year + 1, 1, 1) - timedelta(microseconds=1)
        else:
            end = datetime(year, month + 1, 1) - timedelta(microseconds=1)
        out.append(MonthRange(start=start, end=end, label=f"{year:04d}-{month:02d}"))
        # step one month back
        if month == 1:
            month = 12
            year -= 1
        else:
            month -= 1
    return list(reversed(out))


def _age_bucket(birth_date: Optional[date], today: date) -> str:
    if birth_date is None:
        return "unknown"
    try:
        age = today.year - birth_date.year - (
            (today.month, today.day) < (birth_date.month, birth_date.day)
        )
    except Exception:
        return "unknown"
    if age < 18:
        return "0-17"
    if age < 30:
        return "18-29"
    if age < 45:
        return "30-44"
    if age < 60:
        return "45-59"
    return "60+"


WEEKDAY_NAMES = ["lun", "mar", "mié", "jue", "vie", "sáb", "dom"]


class PracticeMetricsAggregator:
    """Stateless aggregator — inject a Session per call."""

    def __init__(self, db: Session, now: Optional[datetime] = None) -> None:
        self.db = db
        self.now = now or datetime.now()

    def is_admin(self, doctor: Person) -> bool:
        return getattr(doctor, "person_type", None) == "admin"

    def build(self, doctor: Person) -> Dict[str, Any]:
        return {
            "kpis": self.kpis(doctor),
            "consultations_by_month": self.consultations_by_month(doctor),
            "top_diagnoses": self.top_diagnoses(doctor),
            "busy_heatmap": self.busy_heatmap(doctor),
            "demographics": self.demographics(doctor),
            "studies_by_month": self.studies_by_month(doctor),
            "generated_at": self.now.isoformat(),
            "scope": "admin" if self.is_admin(doctor) else "doctor",
        }

    # ------------------------------------------------------------------
    # KPIs
    # ------------------------------------------------------------------

    def kpis(self, doctor: Person) -> Dict[str, Any]:
        months = _month_starts(self.now, 2)
        prev_month, current_month = months[0], months[1]

        current = self._consultation_count(doctor, current_month)
        previous = self._consultation_count(doctor, prev_month)

        new_patients = self._new_patients_count(doctor, current_month)

        avg_duration = self._avg_consultation_duration(doctor, current_month)

        return {
            "current_month": current_month.label,
            "consultations_this_month": current,
            "consultations_last_month": previous,
            "consultations_delta_pct": _pct_change(current, previous),
            "new_patients_this_month": new_patients,
            "avg_consultation_duration_minutes": avg_duration,
        }

    def _consultation_count(self, doctor: Person, month: MonthRange) -> int:
        q = self.db.query(func.count(MedicalRecord.id)).filter(
            MedicalRecord.consultation_date >= month.start,
            MedicalRecord.consultation_date <= month.end,
        )
        if not self.is_admin(doctor):
            q = q.filter(MedicalRecord.doctor_id == doctor.id)
        return int(q.scalar() or 0)

    def _new_patients_count(self, doctor: Person, month: MonthRange) -> int:
        q = self.db.query(func.count(Person.id)).filter(
            Person.person_type == "patient",
            Person.created_at >= month.start,
            Person.created_at <= month.end,
        )
        if not self.is_admin(doctor):
            q = q.filter(Person.created_by == doctor.id)
        return int(q.scalar() or 0)

    def _avg_consultation_duration(
        self, doctor: Person, month: MonthRange
    ) -> Optional[int]:
        """Approximate from appointments (end_time - appointment_date)."""
        q = self.db.query(Appointment).filter(
            Appointment.appointment_date >= month.start,
            Appointment.appointment_date <= month.end,
            Appointment.status.in_(["completed", "confirmada", "por_confirmar"]),
        )
        if not self.is_admin(doctor):
            q = q.filter(Appointment.doctor_id == doctor.id)
        rows = q.all()
        durations: List[int] = []
        for a in rows:
            if a.appointment_date and a.end_time:
                delta = (a.end_time - a.appointment_date).total_seconds() / 60.0
                if 5 <= delta <= 240:  # drop obviously bad rows
                    durations.append(int(delta))
        if not durations:
            return None
        return int(sum(durations) / len(durations))

    # ------------------------------------------------------------------
    # Consultations by month (12-month trend)
    # ------------------------------------------------------------------

    def consultations_by_month(self, doctor: Person) -> List[Dict[str, Any]]:
        months = _month_starts(self.now, 12)
        q = self.db.query(MedicalRecord.consultation_date).filter(
            MedicalRecord.consultation_date >= months[0].start,
            MedicalRecord.consultation_date <= months[-1].end,
        )
        if not self.is_admin(doctor):
            q = q.filter(MedicalRecord.doctor_id == doctor.id)
        rows = q.all()

        buckets: Dict[str, int] = {m.label: 0 for m in months}
        for (dt,) in rows:
            if dt is None:
                continue
            key = f"{dt.year:04d}-{dt.month:02d}"
            if key in buckets:
                buckets[key] += 1
        return [{"month": m.label, "count": buckets[m.label]} for m in months]

    # ------------------------------------------------------------------
    # Top diagnoses
    # ------------------------------------------------------------------

    def top_diagnoses(self, doctor: Person, limit: int = 10) -> List[Dict[str, Any]]:
        months = _month_starts(self.now, 12)
        q = self.db.query(MedicalRecord.primary_diagnosis).filter(
            MedicalRecord.consultation_date >= months[0].start,
            MedicalRecord.consultation_date <= months[-1].end,
        )
        if not self.is_admin(doctor):
            q = q.filter(MedicalRecord.doctor_id == doctor.id)
        rows = q.all()

        counter: Counter = Counter()
        for (dx,) in rows:
            if not dx:
                continue
            # Normalise casing / whitespace to avoid split counts.
            key = " ".join(dx.strip().split()).capitalize()
            if key:
                counter[key] += 1
        top = counter.most_common(limit)
        return [{"diagnosis": k, "count": v} for k, v in top]

    # ------------------------------------------------------------------
    # Busy heatmap (day-of-week × hour)
    # ------------------------------------------------------------------

    def busy_heatmap(self, doctor: Person) -> List[Dict[str, Any]]:
        months = _month_starts(self.now, 3)
        q = self.db.query(Appointment.appointment_date).filter(
            Appointment.appointment_date >= months[0].start,
            Appointment.appointment_date <= months[-1].end,
            Appointment.status != "cancelled",
        )
        if not self.is_admin(doctor):
            q = q.filter(Appointment.doctor_id == doctor.id)
        rows = q.all()

        grid: Dict[tuple, int] = defaultdict(int)
        for (dt,) in rows:
            if dt is None:
                continue
            grid[(dt.weekday(), dt.hour)] += 1
        return [
            {"weekday": WEEKDAY_NAMES[wd], "hour": hr, "count": cnt}
            for (wd, hr), cnt in sorted(grid.items())
        ]

    # ------------------------------------------------------------------
    # Demographics
    # ------------------------------------------------------------------

    def demographics(self, doctor: Person) -> Dict[str, Any]:
        q = self.db.query(Person.gender, Person.birth_date).filter(
            Person.person_type == "patient",
            Person.is_active.is_(True),
        )
        if not self.is_admin(doctor):
            q = q.filter(Person.created_by == doctor.id)
        rows = q.all()

        gender_counter: Counter = Counter()
        age_counter: Counter = Counter()
        today = self.now.date()
        for (gender, birth_date) in rows:
            gender_counter[(gender or "unknown").lower()] += 1
            age_counter[_age_bucket(birth_date, today)] += 1

        return {
            "total_patients": sum(gender_counter.values()),
            "by_gender": [{"gender": g, "count": c} for g, c in gender_counter.most_common()],
            "by_age_bucket": [
                {"bucket": b, "count": age_counter[b]}
                for b in ["0-17", "18-29", "30-44", "45-59", "60+", "unknown"]
                if age_counter[b] > 0
            ],
        }

    # ------------------------------------------------------------------
    # Studies by month (12-month trend)
    # ------------------------------------------------------------------

    def studies_by_month(self, doctor: Person) -> List[Dict[str, Any]]:
        months = _month_starts(self.now, 12)
        q = self.db.query(ClinicalStudy.ordered_date).filter(
            ClinicalStudy.ordered_date >= months[0].start,
            ClinicalStudy.ordered_date <= months[-1].end,
        )
        if not self.is_admin(doctor):
            q = q.filter(ClinicalStudy.doctor_id == doctor.id)
        rows = q.all()

        buckets: Dict[str, int] = {m.label: 0 for m in months}
        for (dt,) in rows:
            if dt is None:
                continue
            key = f"{dt.year:04d}-{dt.month:02d}"
            if key in buckets:
                buckets[key] += 1
        return [{"month": m.label, "count": buckets[m.label]} for m in months]


# ---------------------------------------------------------------------------
# Utils
# ---------------------------------------------------------------------------


def _pct_change(current: int, previous: int) -> Optional[float]:
    if previous == 0:
        return None if current == 0 else 100.0
    return round(((current - previous) / previous) * 100.0, 1)
