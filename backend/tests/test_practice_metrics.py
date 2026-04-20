"""
Unit tests for PracticeMetricsAggregator.

Uses the same chained-MagicMock pattern as the other aggregator tests.
"""

from __future__ import annotations

from datetime import date, datetime
from types import SimpleNamespace
from unittest.mock import MagicMock

import pytest

from services.practice_metrics import (
    PracticeMetricsAggregator,
    _age_bucket,
    _month_starts,
    _pct_change,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _doctor(id: int = 1, person_type: str = "doctor"):
    return SimpleNamespace(id=id, person_type=person_type, name="Dr Test")


def _chain(*, first=None, all_=(), scalar=None):
    q = MagicMock()
    q.filter.return_value = q
    q.join.return_value = q
    q.order_by.return_value = q
    q.first.return_value = first
    q.all.return_value = list(all_)
    q.scalar.return_value = scalar
    return q


# ---------------------------------------------------------------------------
# Pure helpers
# ---------------------------------------------------------------------------


def test_month_starts_returns_n_months_ending_at_anchor():
    months = _month_starts(datetime(2026, 4, 15, 12, 0), count=3)
    assert [m.label for m in months] == ["2026-02", "2026-03", "2026-04"]
    assert months[-1].start == datetime(2026, 4, 1)
    # End is last microsecond of the month, i.e. start of next minus 1 µs
    assert months[-1].end.month == 4
    assert months[-1].end.day == 30


def test_month_starts_crosses_year_boundary():
    months = _month_starts(datetime(2026, 2, 1), count=4)
    assert [m.label for m in months] == ["2025-11", "2025-12", "2026-01", "2026-02"]


def test_pct_change_handles_zero_previous():
    assert _pct_change(current=5, previous=0) == 100.0
    assert _pct_change(current=0, previous=0) is None


def test_pct_change_computes_percentage():
    assert _pct_change(current=12, previous=10) == 20.0
    assert _pct_change(current=8, previous=10) == -20.0


def test_age_bucket_none_is_unknown():
    assert _age_bucket(None, date(2026, 4, 15)) == "unknown"


def test_age_bucket_boundaries():
    today = date(2026, 4, 15)
    assert _age_bucket(date(2026, 4, 14), today) == "0-17"
    assert _age_bucket(date(2008, 4, 14), today) == "18-29"   # 18
    assert _age_bucket(date(1996, 4, 14), today) == "30-44"   # 30
    assert _age_bucket(date(1981, 4, 14), today) == "45-59"   # 45
    assert _age_bucket(date(1966, 4, 14), today) == "60+"     # 60


# ---------------------------------------------------------------------------
# Aggregator — KPIs
# ---------------------------------------------------------------------------


def test_kpis_computes_delta_and_counts():
    doctor = _doctor(id=1)
    # Anchor: 2026-04-15 → months = [2026-03, 2026-04]
    now = datetime(2026, 4, 15)
    db = MagicMock()
    # Call order in kpis(): current_month first, then previous, then new_patients, then appointments.
    db.query.side_effect = [
        _chain(scalar=8),     # current month consultations (2026-04)
        _chain(scalar=5),     # previous month consultations (2026-03)
        _chain(scalar=3),     # new patients this month
        _chain(all_=[]),      # appointments for avg duration (empty)
    ]
    agg = PracticeMetricsAggregator(db=db, now=now)

    out = agg.kpis(doctor)

    assert out["current_month"] == "2026-04"
    assert out["consultations_this_month"] == 8
    assert out["consultations_last_month"] == 5
    assert out["consultations_delta_pct"] == 60.0
    assert out["new_patients_this_month"] == 3
    assert out["avg_consultation_duration_minutes"] is None  # no appointments


def test_kpis_computes_avg_duration_from_appointments():
    doctor = _doctor(id=1)
    now = datetime(2026, 4, 15)
    appointments = [
        SimpleNamespace(
            appointment_date=datetime(2026, 4, 10, 10, 0),
            end_time=datetime(2026, 4, 10, 10, 30),
            status="completed",
        ),
        SimpleNamespace(
            appointment_date=datetime(2026, 4, 11, 10, 0),
            end_time=datetime(2026, 4, 11, 10, 45),
            status="completed",
        ),
        # Outlier (10h long) — should be filtered
        SimpleNamespace(
            appointment_date=datetime(2026, 4, 12, 10, 0),
            end_time=datetime(2026, 4, 12, 20, 0),
            status="completed",
        ),
    ]
    db = MagicMock()
    db.query.side_effect = [
        _chain(scalar=0),
        _chain(scalar=0),
        _chain(scalar=0),
        _chain(all_=appointments),
    ]
    agg = PracticeMetricsAggregator(db=db, now=now)

    out = agg.kpis(doctor)

    # Avg of 30 and 45 = 37 (outlier filtered)
    assert out["avg_consultation_duration_minutes"] == 37


# ---------------------------------------------------------------------------
# Aggregator — trends
# ---------------------------------------------------------------------------


def test_consultations_by_month_buckets_into_12_months():
    doctor = _doctor(id=1)
    now = datetime(2026, 4, 15)
    rows = [
        (datetime(2026, 4, 1),),
        (datetime(2026, 4, 10),),
        (datetime(2026, 3, 5),),
        (datetime(2025, 12, 20),),
    ]
    db = MagicMock()
    db.query.side_effect = [_chain(all_=rows)]
    agg = PracticeMetricsAggregator(db=db, now=now)

    out = agg.consultations_by_month(doctor)

    assert len(out) == 12
    # Expected counts in labels
    by_label = {r["month"]: r["count"] for r in out}
    assert by_label["2026-04"] == 2
    assert by_label["2026-03"] == 1
    assert by_label["2025-12"] == 1
    # Months with no data are still included with count 0
    assert by_label["2025-10"] == 0


def test_top_diagnoses_normalises_and_ranks():
    doctor = _doctor(id=1)
    now = datetime(2026, 4, 15)
    rows = [
        ("Hipertensión arterial",),
        ("hipertensión arterial",),  # case diff
        ("Hipertensión arterial ",),  # trailing space
        ("Diabetes mellitus tipo 2",),
        ("Diabetes mellitus tipo 2",),
        ("Migraña",),
    ]
    db = MagicMock()
    db.query.side_effect = [_chain(all_=rows)]
    agg = PracticeMetricsAggregator(db=db, now=now)

    out = agg.top_diagnoses(doctor, limit=10)

    by_dx = {r["diagnosis"]: r["count"] for r in out}
    assert by_dx["Hipertensión arterial"] == 3
    assert by_dx["Diabetes mellitus tipo 2"] == 2
    assert by_dx["Migraña"] == 1


def test_busy_heatmap_groups_by_weekday_hour():
    doctor = _doctor(id=1)
    now = datetime(2026, 4, 15)
    rows = [
        (datetime(2026, 4, 13, 10, 0),),   # Monday 10:00 (weekday=0)
        (datetime(2026, 4, 13, 10, 30),),  # Monday 10:30 → also hour=10
        (datetime(2026, 4, 14, 15, 0),),   # Tuesday 15:00
    ]
    db = MagicMock()
    db.query.side_effect = [_chain(all_=rows)]
    agg = PracticeMetricsAggregator(db=db, now=now)

    out = agg.busy_heatmap(doctor)

    # 2 entries: Mon@10 (count=2) and Tue@15 (count=1)
    assert len(out) == 2
    mon = next(r for r in out if r["weekday"] == "lun" and r["hour"] == 10)
    tue = next(r for r in out if r["weekday"] == "mar" and r["hour"] == 15)
    assert mon["count"] == 2
    assert tue["count"] == 1


def test_demographics_groups_by_gender_and_age():
    doctor = _doctor(id=1)
    now = datetime(2026, 4, 15)
    rows = [
        ("Masculino", date(1990, 1, 1)),
        ("Masculino", date(1985, 1, 1)),
        ("Femenino", date(2010, 1, 1)),
        ("Femenino", date(1960, 1, 1)),
        (None, None),
    ]
    db = MagicMock()
    db.query.side_effect = [_chain(all_=rows)]
    agg = PracticeMetricsAggregator(db=db, now=now)

    out = agg.demographics(doctor)

    assert out["total_patients"] == 5
    gender_by = {r["gender"]: r["count"] for r in out["by_gender"]}
    assert gender_by["masculino"] == 2
    assert gender_by["femenino"] == 2
    assert gender_by["unknown"] == 1
    age_by = {r["bucket"]: r["count"] for r in out["by_age_bucket"]}
    # 1990 → 36 and 1985 → 41, both in 30-44; 2010 → 16 in 0-17; 1960 → 66 in 60+
    assert age_by["30-44"] == 2
    assert age_by["0-17"] == 1
    assert age_by["60+"] == 1


# ---------------------------------------------------------------------------
# Admin scope
# ---------------------------------------------------------------------------


def test_build_tags_scope_as_admin_for_admin_user():
    admin = _doctor(id=999, person_type="admin")
    now = datetime(2026, 4, 15)
    db = MagicMock()
    # Many query calls — just return empty chains for all of them
    db.query.side_effect = [
        _chain(scalar=0), _chain(scalar=0), _chain(scalar=0),
        _chain(all_=[]),
        _chain(all_=[]),
        _chain(all_=[]),
        _chain(all_=[]),
        _chain(all_=[]),
        _chain(all_=[]),
    ]
    agg = PracticeMetricsAggregator(db=db, now=now)

    out = agg.build(admin)

    assert out["scope"] == "admin"
    assert out["generated_at"].startswith("2026-04-15")
