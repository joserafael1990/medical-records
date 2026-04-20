"""Pre-consultation intake service — hardcoded questionnaire v1."""

from .questions import INTAKE_QUESTIONS, validate_answers
from .service import IntakeService

__all__ = ["INTAKE_QUESTIONS", "IntakeService", "validate_answers"]
