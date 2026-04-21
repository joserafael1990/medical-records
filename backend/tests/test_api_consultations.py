"""
Consultation endpoint tests.

- GET /api/consultations        → 200 with list
- POST /api/consultations       → service called, result returned
- GET /api/consultations/{id}   → 404 when not found
"""
from unittest.mock import patch, AsyncMock
from fastapi import HTTPException


VALID_CONSULTATION = {
    "patient_id": 10,
    "doctor_id": 1,
    "consultation_date": "2026-05-01T10:00:00",
    "appointment_type_id": 1,
    "chief_complaint": "Dolor de cabeza",
    "history_present_illness": "Cefalea tensional de 3 días de evolución.",
    "family_history": "Sin antecedentes relevantes.",
    "perinatal_history": "N/A",
    "gynecological_and_obstetric_history": "N/A",
    "personal_pathological_history": "Ninguno.",
    "personal_non_pathological_history": "Ejercicio 3 veces por semana.",
    "physical_examination": "Sin alteraciones.",
    "primary_diagnosis": "Cefalea tensional",
    "treatment_plan": "Analgésicos y reposo.",
    "follow_up_instructions": "Regresar en 2 semanas si persiste.",
}


def test_get_consultations_returns_list(client):
    with patch(
        "services.consultation_service.ConsultationService.get_consultations_for_doctor",
        return_value=[],
    ):
        response = client.get("/api/consultations")
    assert response.status_code == 200
    assert isinstance(response.json(), list)


def test_create_consultation_calls_service_and_returns_result(client):
    expected = {"id": 55, **VALID_CONSULTATION}
    with patch(
        "services.consultation_service.ConsultationService.create_consultation",
        new_callable=AsyncMock,
        return_value=expected,
    ):
        response = client.post("/api/consultations", json=VALID_CONSULTATION)
    assert response.status_code == 200
    assert response.json()["id"] == 55


def test_get_consultation_not_found_returns_404(client):
    with patch(
        "services.consultation_service.ConsultationService.get_consultation_by_id",
        side_effect=HTTPException(status_code=404, detail="Consulta no encontrada"),
    ):
        response = client.get("/api/consultations/9999")
    assert response.status_code == 404
