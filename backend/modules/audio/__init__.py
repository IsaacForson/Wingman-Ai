"""
Wingman AI - Audio Processing Module
Real-time audio capture, transcription, and voice activity detection
"""

from .audio_module import AudioModule
from .capture import AudioCapture
from .transcription import Transcriber
from .vad import VoiceActivityDetector
from .speaker_id import SpeakerIdentifier, SpeakerProfile, SpeakerSegment
from .sentiment import SentimentAnalyzer, SentimentResult, SentimentLevel

__all__ = [
    "AudioModule",
    "AudioCapture",
    "Transcriber",
    "VoiceActivityDetector",
    "SpeakerIdentifier",
    "SpeakerProfile",
    "SpeakerSegment",
    "SentimentAnalyzer",
    "SentimentResult",
    "SentimentLevel"
]

