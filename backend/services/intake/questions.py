"""
Pre-consultation questionnaire — v1 hardcoded set of 8 questions.

Stored as a plain Python list of dicts; shipped to the frontend
unchanged via the public GET endpoint. Keep the shape stable — the
patient-facing UI renders off the `type` field.

Types supported:
- "text"        — free-form string
- "textarea"    — multi-line string
- "select"      — single choice from `options`
- "yes_no"      — boolean (True / False); if True, asks for `followup`
- "scale_1_10"  — integer 1-10
"""

from __future__ import annotations

from typing import Any, Dict, List, Tuple


INTAKE_QUESTIONS: List[Dict[str, Any]] = [
    {
        "id": "q1_chief_complaint",
        "label": "¿Cuál es el motivo principal de tu consulta?",
        "type": "textarea",
        "required": True,
        "max_length": 500,
        "help_text": "Describe en 2-3 oraciones por qué vas a consultar.",
    },
    {
        "id": "q2_onset",
        "label": "¿Cuándo comenzaron los síntomas?",
        "type": "select",
        "required": True,
        "options": [
            {"value": "today", "label": "Hoy"},
            {"value": "last_days", "label": "Últimos días"},
            {"value": "weeks", "label": "Hace algunas semanas"},
            {"value": "months", "label": "Hace meses"},
            {"value": "longer", "label": "Más de 6 meses"},
        ],
    },
    {
        "id": "q3_symptoms",
        "label": "Describe tus síntomas actuales",
        "type": "textarea",
        "required": True,
        "max_length": 800,
    },
    {
        "id": "q4_pain_scale",
        "label": "En escala de 1-10, ¿qué tan intenso es tu malestar o dolor?",
        "type": "scale_1_10",
        "required": True,
        "help_text": "1 = muy leve, 10 = insoportable.",
    },
    {
        "id": "q5_current_meds",
        "label": "¿Estás tomando actualmente algún medicamento? Lista nombre y dosis.",
        "type": "textarea",
        "required": True,
        "max_length": 600,
        "help_text": "Si ninguno, escribe \"ninguno\".",
    },
    {
        "id": "q6_allergies",
        "label": "¿Tienes alguna alergia conocida?",
        "type": "text",
        "required": True,
        "max_length": 300,
        "help_text": "Medicamentos, alimentos, otras. Si ninguna, escribe \"ninguna\".",
    },
    {
        "id": "q7_recent_procedures",
        "label": "¿Has tenido cirugías u hospitalizaciones en el último año?",
        "type": "yes_no",
        "required": True,
        "followup": {
            "label": "¿Cuáles y cuándo? (solo si respondiste sí)",
            "type": "textarea",
            "max_length": 400,
        },
    },
    {
        "id": "q8_additional_context",
        "label": "¿Hay algo más que tu doctor deba saber antes de la consulta?",
        "type": "textarea",
        "required": False,
        "max_length": 500,
    },
]


# ---------------------------------------------------------------------------
# Validation
# ---------------------------------------------------------------------------


def _question_index() -> Dict[str, Dict[str, Any]]:
    return {q["id"]: q for q in INTAKE_QUESTIONS}


def validate_answers(answers: Dict[str, Any]) -> Tuple[bool, List[str]]:
    """Validate a submitted answers dict against the hardcoded schema.

    Returns (is_valid, errors). Mode is permissive: unknown keys are
    dropped silently (so the frontend can evolve), required-missing is
    surfaced, and type mismatches are reported per question.
    """
    errors: List[str] = []
    if not isinstance(answers, dict):
        return False, ["El cuerpo de respuestas debe ser un objeto JSON."]

    qidx = _question_index()
    for q in INTAKE_QUESTIONS:
        qid = q["id"]
        val = answers.get(qid)
        if q.get("required") and _is_empty(val):
            errors.append(f"Falta la respuesta a: {q['label']}")
            continue
        if val is None:
            continue
        qtype = q["type"]
        if qtype in ("text", "textarea"):
            if not isinstance(val, str):
                errors.append(f"'{qid}' debe ser texto.")
                continue
            max_len = q.get("max_length", 1000)
            if len(val) > max_len:
                errors.append(f"'{qid}' excede {max_len} caracteres.")
        elif qtype == "select":
            allowed = {opt["value"] for opt in q["options"]}
            if val not in allowed:
                errors.append(f"'{qid}' debe ser uno de: {sorted(allowed)}")
        elif qtype == "yes_no":
            if not isinstance(val, bool):
                errors.append(f"'{qid}' debe ser true o false.")
        elif qtype == "scale_1_10":
            try:
                ival = int(val)
            except (TypeError, ValueError):
                errors.append(f"'{qid}' debe ser un número entre 1 y 10.")
                continue
            if not 1 <= ival <= 10:
                errors.append(f"'{qid}' debe estar entre 1 y 10.")

    # Also validate the q7 followup if yes.
    followup_id = "q7_recent_procedures_detail"
    if answers.get("q7_recent_procedures") is True:
        followup_val = answers.get(followup_id)
        if _is_empty(followup_val):
            errors.append("Falta el detalle de cirugías/hospitalizaciones.")
        elif not isinstance(followup_val, str):
            errors.append(f"'{followup_id}' debe ser texto.")
        elif len(followup_val) > 400:
            errors.append(f"'{followup_id}' excede 400 caracteres.")

    return (len(errors) == 0, errors)


def _is_empty(val: Any) -> bool:
    if val is None:
        return True
    if isinstance(val, str) and not val.strip():
        return True
    return False
