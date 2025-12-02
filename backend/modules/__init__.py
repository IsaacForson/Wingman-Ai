"""
Wingman AI - Backend Modules
All available modules for the Wingman AI backend
"""

# Core modules
from .audio import AudioModule, AudioCapture, Transcriber, VoiceActivityDetector
from .screen import ScreenModule, ScreenCapture, OCRProcessor
from .ai import AIModule, QuestionDetector, AnswerGenerator
from .context import ContextModule, ContextManager

# Feature modules
from .session import SessionManager, Session, QuestionAnswer
from .cache import CacheManager
from .meeting import MeetingIntelligence, MeetingSession, ActionItem
from .clipboard import SmartClipboard, ClipboardEntry, ContentType
from .practice import PracticeMode, PracticeQuestion, AnswerFeedback, InterviewType
from .analytics import AnalyticsEngine, UsageMetrics, PerformanceMetrics
from .wellness import WellnessModule, BreakReminder, FocusSession, BreakType
from .plugins import PluginSystem, WingmanPlugin, PluginMetadata

__all__ = [
    # Audio
    "AudioModule",
    "AudioCapture", 
    "Transcriber",
    "VoiceActivityDetector",
    
    # Screen
    "ScreenModule",
    "ScreenCapture",
    "OCRProcessor",
    
    # AI
    "AIModule",
    "QuestionDetector",
    "AnswerGenerator",
    
    # Context
    "ContextModule",
    "ContextManager",
    
    # Session
    "SessionManager",
    "Session",
    "QuestionAnswer",
    
    # Cache
    "CacheManager",
    
    # Meeting
    "MeetingIntelligence",
    "MeetingSession",
    "ActionItem",
    
    # Clipboard
    "SmartClipboard",
    "ClipboardEntry",
    "ContentType",
    
    # Practice
    "PracticeMode",
    "PracticeQuestion",
    "AnswerFeedback",
    "InterviewType",
    
    # Analytics
    "AnalyticsEngine",
    "UsageMetrics",
    "PerformanceMetrics",
    
    # Wellness
    "WellnessModule",
    "BreakReminder",
    "FocusSession",
    "BreakType",
    
    # Plugins
    "PluginSystem",
    "WingmanPlugin",
    "PluginMetadata",
]
