"""
Auth enforcement tests.

Every endpoint must reject requests that carry no Authorization header.
FastAPI's HTTPBearer dependency returns 403 in that case.
"""


PROTECTED_GETS = [
    "/api/appointments",
    "/api/patients",
    "/api/consultations",
]


def test_appointments_requires_auth(unauth_client):
    response = unauth_client.get("/api/appointments")
    assert response.status_code == 403


def test_patients_requires_auth(unauth_client):
    response = unauth_client.get("/api/patients")
    assert response.status_code == 403


def test_consultations_requires_auth(unauth_client):
    response = unauth_client.get("/api/consultations")
    assert response.status_code == 403


def test_create_appointment_requires_auth(unauth_client):
    response = unauth_client.post("/api/appointments", json={})
    assert response.status_code == 403
