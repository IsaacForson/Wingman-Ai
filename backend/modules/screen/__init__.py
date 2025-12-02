"""
Wingman AI - Screen Analysis Module
Screenshot capture, OCR, and visual analysis
"""

from .screen_module import ScreenModule
from .capture import ScreenCapture
from .ocr import OCRProcessor

__all__ = [
    "ScreenModule",
    "ScreenCapture",
    "OCRProcessor"
]

