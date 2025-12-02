"""
Wingman AI - Backend Modules
All available modules for the Wingman AI backend
"""

# Core modules
from .audio import (
    AudioModule, AudioCapture, Transcriber, VoiceActivityDetector,
    SpeakerIdentifier, SpeakerProfile, SpeakerSegment,
    SentimentAnalyzer, SentimentResult, SentimentLevel
)
from .screen import ScreenModule, ScreenCapture, OCRProcessor
from .ai import (
    AIModule, QuestionDetector, AnswerGenerator,
    EmailDrafter, EmailDraft, EmailTone, EmailType
)
from .context import ContextModule, ContextManager
from .knowledge import JobAnalyzer, JobAnalysis

# Feature modules
from .session import SessionManager, Session, QuestionAnswer, SessionExporter, ExportData
from .cache import CacheManager
from .meeting import MeetingIntelligence, MeetingSession, ActionItem
from .clipboard import SmartClipboard, ClipboardEntry, ContentType
from .practice import (
    PracticeMode, PracticeQuestion, AnswerFeedback, InterviewType,
    STARCoach, STARAnalysis, STARComponent, STARPrompt
)
from .analytics import AnalyticsEngine, UsageMetrics, PerformanceMetrics
from .wellness import WellnessModule, BreakReminder, FocusSession, BreakType
from .plugins import PluginSystem, WingmanPlugin, PluginMetadata

__all__ = [
    # Audio
    "AudioModule",
    "AudioCapture", 
    "Transcriber",
    "VoiceActivityDetector",
    "SpeakerIdentifier",
    "SpeakerProfile",
    "SpeakerSegment",
    "SentimentAnalyzer",
    "SentimentResult",
    "SentimentLevel",
    
    # Screen
    "ScreenModule",
    "ScreenCapture",
    "OCRProcessor",
    
    # AI
    "AIModule",
    "QuestionDetector",
    "AnswerGenerator",
    "EmailDrafter",
    "EmailDraft",
    "EmailTone",
    "EmailType",
    
    # Context
    "ContextModule",
    "ContextManager",
    
    # Knowledge
    "JobAnalyzer",
    "JobAnalysis",
    
    # Session
    "SessionManager",
    "Session",
    "QuestionAnswer",
    "SessionExporter",
    "ExportData",
    
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
    "STARCoach",
    "STARAnalysis",
    "STARComponent",
    "STARPrompt",
    
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
