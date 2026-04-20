"""
Unit tests for PHI-read audit logging (NOM-004-SSA3-2012).

Validates that audit_service.log_* methods emit the expected action/operation_type
signature that compliance auditors look for. No real database is required — we
spy on log_action.
"""

from __future__ import annotations

import os
import sys
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from audit_service import AuditService  # noqa: E402


def _fake_request():
    req = MagicMock()
    req.client = SimpleNamespace(host="10.0.0.1")
    req.headers = {"user-agent": "pytest/1.0"}
    return req


def _fake_user(user_id: int = 42, person_type: str = "doctor"):
    return SimpleNamespace(
        id=user_id,
        email="doc@example.com",
        name="Dra. Test",
        person_type=person_type,
    )


def test_log_consultation_access_emits_read_action():
    db = MagicMock()
    req = _fake_request()
    with patch.object(AuditService, "log_action") as log:
        AuditService.log_consultation_access(
            db=db, user=_fake_user(), consultation_id=7,
            patient_name="Juan Pérez", request=req,
        )
    log.assert_called_once()
    kwargs = log.call_args.kwargs
    assert kwargs["action"] == "READ"
    assert kwargs["table_name"] == "medical_records"
    assert kwargs["record_id"] == 7
    assert kwargs["operation_type"] == "consultation_access"
    assert kwargs["affected_patient_name"] == "Juan Pérez"


def test_log_consultation_list_access_records_count_and_filters():
    db = MagicMock()
    req = _fake_request()
    with patch.object(AuditService, "log_action") as log:
        AuditService.log_consultation_list_access(
            db=db, user=_fake_user(), request=req,
            result_count=12, filters={"skip": 0, "limit": 100},
        )
    kwargs = log.call_args.kwargs
    assert kwargs["action"] == "READ"
    assert kwargs["operation_type"] == "consultation_list_access"
    assert kwargs["metadata"]["result_count"] == 12
    assert kwargs["metadata"]["filters"] == {"skip": 0, "limit": 100}


def test_log_patient_access_uses_persons_table_and_patient_id():
    db = MagicMock()
    req = _fake_request()
    with patch.object(AuditService, "log_action") as log:
        AuditService.log_patient_access(
            db=db, user=_fake_user(), patient_id=99,
            patient_name="Ana López", request=req,
        )
    kwargs = log.call_args.kwargs
    assert kwargs["action"] == "READ"
    assert kwargs["table_name"] == "persons"
    assert kwargs["record_id"] == 99
    assert kwargs["affected_patient_id"] == 99
    assert kwargs["affected_patient_name"] == "Ana López"
    assert kwargs["operation_type"] == "patient_access"


def test_log_patient_list_access_records_count():
    db = MagicMock()
    req = _fake_request()
    with patch.object(AuditService, "log_action") as log:
        AuditService.log_patient_list_access(
            db=db, user=_fake_user(), request=req,
            result_count=34, filters={"skip": 0, "limit": 100},
        )
    kwargs = log.call_args.kwargs
    assert kwargs["operation_type"] == "patient_list_access"
    assert kwargs["metadata"]["result_count"] == 34


def test_log_prescription_access_targets_prescriptions_table():
    db = MagicMock()
    req = _fake_request()
    with patch.object(AuditService, "log_action") as log:
        AuditService.log_prescription_access(
            db=db, user=_fake_user(), consultation_id=7,
            request=req, result_count=3,
        )
    kwargs = log.call_args.kwargs
    assert kwargs["action"] == "READ"
    assert kwargs["table_name"] == "prescriptions"
    assert kwargs["record_id"] == 7
    assert kwargs["operation_type"] == "prescription_list_access"
    assert kwargs["metadata"]["result_count"] == 3
    assert kwargs["metadata"]["consultation_id"] == 7


def test_log_methods_accept_none_user_for_system_reads():
    """Ensure the helpers don't crash when user is None (e.g., system job reads)."""
    db = MagicMock()
    req = _fake_request()
    with patch.object(AuditService, "log_action") as log:
        AuditService.log_patient_list_access(
            db=db, user=None, request=req, result_count=0,
        )
        AuditService.log_consultation_list_access(
            db=db, user=None, request=req, result_count=0,
        )
    assert log.call_count == 2
    for call in log.call_args_list:
        assert call.kwargs["user"] is None
