"""
Wingman AI - Audio Processing Module
Real-time audio capture, transcription, and voice activity detection
"""

from .audio_module import AudioModule
from .capture import AudioCapture
from .transcription import Transcriber
from .vad import VoiceActivityDetector

__all__ = [
    "AudioModule",
    "AudioCapture",
    "Transcriber",
    "VoiceActivityDetector"
]

