"""
Wingman AI - AI Processing Module
Question detection, answer generation, and AI orchestration
"""

from .ai_module import AIModule
from .question_detector import QuestionDetector
from .answer_generator import AnswerGenerator

__all__ = [
    "AIModule",
    "QuestionDetector",
    "AnswerGenerator"
]

