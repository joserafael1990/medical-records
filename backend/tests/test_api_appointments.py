"""
Appointment endpoint tests.

- GET /api/appointments  → 200 with a list
- POST /api/appointments with incomplete body  → 422
- POST /api/appointments with valid body  → service is called, result returned
"""
from unittest.mock import patch


VALID_APPOINTMENT = {
    "patient_id": 10,
    "doctor_id": 1,
    "appointment_date": "2026-05-01T10:00:00",
    "appointment_type_id": 1,
    "office_id": 2,
    "consultation_type": "Primera vez",
}


def test_get_appointments_returns_list(client):
    with patch("crud.get_appointments", return_value=[]):
        response = client.get("/api/appointments")
    assert response.status_code == 200
    assert isinstance(response.json(), list)


def test_get_appointments_with_filter(client):
    with patch("crud.get_appointments", return_value=[]):
        response = client.get("/api/appointments?status=confirmada")
    assert response.status_code == 200


def test_create_appointment_missing_required_fields_returns_422(client):
    # patient_id, doctor_id, appointment_date, appointment_type_id are required.
    response = client.post("/api/appointments", json={"office_id": 1})
    assert response.status_code == 422


def test_create_appointment_calls_service_and_returns_result(client):
    expected = {"id": 99, **VALID_APPOINTMENT, "status": "por_confirmar"}
    with patch(
        "services.appointment_service.AppointmentService.create_appointment_with_reminders",
        return_value=expected,
    ):
        response = client.post("/api/appointments", json=VALID_APPOINTMENT)
    assert response.status_code == 200
    assert response.json()["id"] == 99
