"""
Pre-consultation questionnaire — 14 questions grouped in 6 NOM-004 sections.

Stored as a plain Python list of dicts; shipped to the frontend via the
public GET endpoint. Each question carries a `section` key so the patient
form can render section headers without the backend owning UI strings for
them (section *labels* live in `SECTION_LABELS`).

Types supported:
- "text"        — free-form string
- "textarea"    — multi-line string
- "select"      — single choice from `options`
- "yes_no"      — boolean; if True, asks for `followup` → stored as
                  f"{qid}_detail" in the answers dict
- "scale_1_10"  — integer 1-10

Section mapping to NOM-004 MedicalRecord fields (for prefill):
- current_condition        → chief_complaint, history_present_illness
- pathological_history     → personal_pathological_history
- non_pathological_history → personal_non_pathological_history
- family_history           → family_history
- gynecological            → gynecological_and_obstetric_history
- other                    → history_present_illness (appended)
"""

from __future__ import annotations

from typing import Any, Dict, Iterable, List, Optional, Set, Tuple


# ---------------------------------------------------------------------------
# Sections
# ---------------------------------------------------------------------------


SECTION_LABELS: Dict[str, str] = {
    "current_condition": "Motivo de consulta",
    "pathological_history": "Antecedentes médicos",
    "non_pathological_history": "Hábitos",
    "family_history": "Antecedentes familiares",
    "gynecological": "Antecedentes gineco-obstétricos",
    "other": "Otros",
}

# Stable rendering order — the frontend iterates in this order.
SECTION_ORDER: List[str] = [
    "current_condition",
    "pathological_history",
    "non_pathological_history",
    "family_history",
    "gynecological",
    "other",
]


# ---------------------------------------------------------------------------
# Questions
# ---------------------------------------------------------------------------


INTAKE_QUESTIONS: List[Dict[str, Any]] = [
    # -- Section 1: current condition ---------------------------------------
    {
        "id": "q1_chief_complaint",
        "section": "current_condition",
        "label": "¿Cuál es el motivo principal de tu consulta?",
        "type": "textarea",
        "required": True,
        "max_length": 500,
        "help_text": "Describe en 2-3 oraciones por qué vas a consultar.",
    },
    {
        "id": "q2_symptoms",
        "section": "current_condition",
        "label": "Describe tus síntomas y cuándo comenzaron",
        "type": "textarea",
        "required": True,
        "max_length": 800,
        "help_text": "Qué sientes y desde hace cuánto tiempo.",
    },
    {
        "id": "q3_pain_scale",
        "section": "current_condition",
        "label": "En escala de 1-10, ¿qué tan intenso es tu malestar o dolor?",
        "type": "scale_1_10",
        "required": True,
        "help_text": "1 = muy leve, 10 = insoportable.",
    },

    # -- Section 2: personal pathological history ---------------------------
    {
        "id": "q4_allergies",
        "section": "pathological_history",
        "label": "¿Tienes alguna alergia conocida?",
        "type": "yes_no",
        "required": True,
        "followup": {
            "label": "¿A qué? (medicamentos, alimentos, otros)",
            "type": "text",
            "max_length": 300,
        },
    },
    {
        "id": "q5_chronic_conditions",
        "section": "pathological_history",
        "label": "¿Padeces alguna enfermedad crónica (diabetes, hipertensión, asma, etc.)?",
        "type": "yes_no",
        "required": True,
        "followup": {
            "label": "¿Cuál(es) y desde cuándo?",
            "type": "textarea",
            "max_length": 500,
        },
    },
    {
        "id": "q6_current_meds",
        "section": "pathological_history",
        "label": "¿Estás tomando actualmente algún medicamento?",
        "type": "yes_no",
        "required": True,
        "followup": {
            "label": "Lista nombre y dosis de cada medicamento",
            "type": "textarea",
            "max_length": 600,
        },
    },
    {
        "id": "q7_surgeries",
        "section": "pathological_history",
        "label": "¿Has tenido cirugías u hospitalizaciones en el último año?",
        "type": "yes_no",
        "required": True,
        "followup": {
            "label": "¿Cuáles y cuándo?",
            "type": "textarea",
            "max_length": 400,
        },
    },

    # -- Section 3: non-pathological history (habits) -----------------------
    {
        "id": "q8_smoking",
        "section": "non_pathological_history",
        "label": "¿Fumas?",
        "type": "select",
        "required": True,
        "options": [
            {"value": "no", "label": "No, nunca"},
            {"value": "occasional", "label": "Ocasionalmente"},
            {"value": "regular", "label": "Regularmente"},
            {"value": "ex_smoker", "label": "Exfumador(a)"},
        ],
    },
    {
        "id": "q9_alcohol",
        "section": "non_pathological_history",
        "label": "¿Consumes alcohol?",
        "type": "select",
        "required": True,
        "options": [
            {"value": "no", "label": "No, nunca"},
            {"value": "occasional", "label": "Ocasional (social)"},
            {"value": "regular", "label": "Regular (semanal)"},
            {"value": "ex", "label": "Ya no consumo"},
        ],
    },
    {
        "id": "q10_exercise",
        "section": "non_pathological_history",
        "label": "¿Haces ejercicio con regularidad?",
        "type": "select",
        "required": True,
        "options": [
            {"value": "sedentary", "label": "Sedentario(a)"},
            {"value": "light", "label": "Ligero (1-2 veces/semana)"},
            {"value": "moderate", "label": "Moderado (3-4 veces/semana)"},
            {"value": "intense", "label": "Intenso (5+ veces/semana)"},
        ],
    },

    # -- Section 4: family history ------------------------------------------
    {
        "id": "q11_family_history",
        "section": "family_history",
        "label": "¿Hay enfermedades importantes en tu familia cercana (padres, hermanos)?",
        "type": "textarea",
        "required": False,
        "max_length": 500,
        "help_text": "Por ejemplo: diabetes, hipertensión, cáncer, cardiopatías.",
    },

    # -- Section 5: gynecological / obstetric (optional by default) ---------
    {
        "id": "q12_gyn_pregnancies",
        "section": "gynecological",
        "label": "Antecedentes gineco-obstétricos (si aplica)",
        "type": "text",
        "required": False,
        "max_length": 200,
        "help_text": "Partos, cesáreas, abortos. Deja en blanco si no aplica.",
    },
    {
        "id": "q13_gyn_lmp",
        "section": "gynecological",
        "label": "Fecha aproximada de última menstruación (si aplica)",
        "type": "text",
        "required": False,
        "max_length": 100,
        "help_text": "Ej. '15 de marzo'. Deja en blanco si no aplica.",
    },

    # -- Section 6: other ---------------------------------------------------
    {
        "id": "q14_additional",
        "section": "other",
        "label": "¿Hay algo más que tu doctor deba saber antes de la consulta?",
        "type": "textarea",
        "required": False,
        "max_length": 500,
    },
]


# ---------------------------------------------------------------------------
# Public helpers
# ---------------------------------------------------------------------------


def visible_questions(excluded_ids: Optional[Iterable[str]] = None) -> List[Dict[str, Any]]:
    """Return the question list with `excluded_ids` filtered out.

    Excluded ids that don't match a known question are silently ignored
    (lets the DB hold stale ids from a prior schema without failing).
    """
    if not excluded_ids:
        return list(INTAKE_QUESTIONS)
    excluded: Set[str] = set(excluded_ids)
    return [q for q in INTAKE_QUESTIONS if q["id"] not in excluded]


def all_question_ids() -> Set[str]:
    return {q["id"] for q in INTAKE_QUESTIONS}


# ---------------------------------------------------------------------------
# Validation
# ---------------------------------------------------------------------------


def validate_answers(
    answers: Dict[str, Any],
    excluded_ids: Optional[Iterable[str]] = None,
) -> Tuple[bool, List[str]]:
    """Validate a submitted answers dict against the active question set.

    Excluded question ids are skipped entirely — not required, not type-
    checked. Unknown keys are dropped silently so the frontend can evolve.
    """
    errors: List[str] = []
    if not isinstance(answers, dict):
        return False, ["El cuerpo de respuestas debe ser un objeto JSON."]

    excluded: Set[str] = set(excluded_ids or [])

    for q in INTAKE_QUESTIONS:
        qid = q["id"]
        if qid in excluded:
            continue

        val = answers.get(qid)
        if q.get("required") and _is_empty(val):
            errors.append(f"Falta la respuesta a: {q['label']}")
            continue
        if val is None or (isinstance(val, str) and val == ""):
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
                continue
            # Generic yes_no + followup convention: answer at f"{qid}_detail".
            followup = q.get("followup")
            if val is True and followup:
                detail_id = f"{qid}_detail"
                detail_val = answers.get(detail_id)
                if _is_empty(detail_val):
                    errors.append(f"Falta el detalle de: {q['label']}")
                elif not isinstance(detail_val, str):
                    errors.append(f"'{detail_id}' debe ser texto.")
                else:
                    detail_max = followup.get("max_length", 400)
                    if len(detail_val) > detail_max:
                        errors.append(
                            f"'{detail_id}' excede {detail_max} caracteres."
                        )
        elif qtype == "scale_1_10":
            try:
                ival = int(val)
            except (TypeError, ValueError):
                errors.append(f"'{qid}' debe ser un número entre 1 y 10.")
                continue
            if not 1 <= ival <= 10:
                errors.append(f"'{qid}' debe estar entre 1 y 10.")

    return (len(errors) == 0, errors)


def _is_empty(val: Any) -> bool:
    if val is None:
        return True
    if isinstance(val, str) and not val.strip():
        return True
    return False
