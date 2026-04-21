"""
Shared fixtures for API integration tests.

Strategy: override get_current_user and get_db dependencies so tests run
without a live database or real JWT tokens. Service methods are patched
individually per test to control return values.
"""
import os
import sys
from types import SimpleNamespace
from unittest.mock import MagicMock

import pytest
from starlette.testclient import TestClient

BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

# The local vertexai package may be missing symbols used by the doctor assistant
# agent (Content, Part, etc.). Stub them out before importing the app so that
# import errors don't prevent the rest of the application from loading.
_vertexai_stub = MagicMock()
for _name in ("Content", "FunctionDeclaration", "GenerativeModel", "Part", "Tool"):
    setattr(_vertexai_stub, _name, MagicMock)
sys.modules.setdefault("vertexai", MagicMock())
sys.modules.setdefault("vertexai.generative_models", _vertexai_stub)

from main_clean_english import app
from dependencies import get_current_user
from database import get_db


def _fake_doctor(doctor_id: int = 1) -> SimpleNamespace:
    return SimpleNamespace(
        id=doctor_id,
        email="test@cortex.com",
        name="Dra. Prueba",
        person_type="doctor",
        is_active=True,
    )


def _mock_db() -> MagicMock:
    db = MagicMock()
    # These are called by the audit service and must not raise.
    db.add = MagicMock()
    db.commit = MagicMock()
    db.rollback = MagicMock()
    db.close = MagicMock()
    # Default query chain returns None — individual tests override as needed.
    db.query.return_value.filter.return_value.first.return_value = None
    db.query.return_value.filter.return_value.all.return_value = []
    return db


@pytest.fixture()
def client():
    """TestClient with auth + DB dependencies mocked out."""
    db = _mock_db()
    app.dependency_overrides[get_current_user] = _fake_doctor
    app.dependency_overrides[get_db] = lambda: db
    with TestClient(app, raise_server_exceptions=False) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture()
def unauth_client():
    """TestClient with DB mocked but no auth override — tests enforcement."""
    app.dependency_overrides[get_db] = lambda: _mock_db()
    with TestClient(app, raise_server_exceptions=False) as c:
        yield c
    app.dependency_overrides.clear()
