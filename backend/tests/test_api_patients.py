"""
Patient endpoint tests.

- GET /api/patients           → 200 with list
- GET /api/patients/{id}      → 404 when patient doesn't belong to doctor
- POST /api/patients          → service called, patient returned
"""
from unittest.mock import patch
from fastapi import HTTPException


def test_get_patients_returns_list(client):
    with patch(
        "services.patient_service.PatientService.get_patients",
        return_value=[],
    ):
        response = client.get("/api/patients")
    assert response.status_code == 200
    assert isinstance(response.json(), list)


def test_get_patient_not_found_returns_404(client):
    with patch(
        "services.patient_service.PatientService.get_patient",
        side_effect=HTTPException(status_code=404, detail="Paciente no encontrado"),
    ):
        response = client.get("/api/patients/9999")
    assert response.status_code == 404


def test_create_patient_calls_service_and_returns_result(client):
    created = {
        "id": 42,
        "person_code": "PAT-0042",
        "name": "Ana García",
        "person_type": "patient",
        "email": None,
        "primary_phone": "+525512345678",
        "created_at": "2026-01-01T00:00:00",
        "updated_at": "2026-01-01T00:00:00",
        "is_active": True,
    }
    with patch(
        "services.patient_service.PatientService.create_patient",
        return_value=created,
    ):
        response = client.post(
            "/api/patients",
            json={"name": "Ana García", "primary_phone": "+525512345678"},
        )
    assert response.status_code == 200
    assert response.json()["id"] == 42
