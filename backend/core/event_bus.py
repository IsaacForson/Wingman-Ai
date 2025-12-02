"""
Wingman AI - Event Bus
Inter-module communication system using async events
"""

import asyncio
from typing import Callable, Any, Dict, List, Optional
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from loguru import logger


class EventType(str, Enum):
    """Event types for the system"""
    # Audio events
    AUDIO_STARTED = "audio.started"
    AUDIO_STOPPED = "audio.stopped"
    AUDIO_CHUNK = "audio.chunk"
    AUDIO_SILENCE = "audio.silence"
    AUDIO_SPEECH_START = "audio.speech_start"
    AUDIO_SPEECH_END = "audio.speech_end"
    
    # Transcription events
    TRANSCRIPT_PARTIAL = "transcript.partial"
    TRANSCRIPT_FINAL = "transcript.final"
    
    # Question events
    QUESTION_DETECTED = "question.detected"
    QUESTION_CLASSIFIED = "question.classified"
    
    # Answer events
    ANSWER_GENERATING = "answer.generating"
    ANSWER_CHUNK = "answer.chunk"
    ANSWER_COMPLETE = "answer.complete"
    ANSWER_ERROR = "answer.error"
    
    # Screen events
    SCREEN_CAPTURED = "screen.captured"
    SCREEN_TEXT_DETECTED = "screen.text_detected"
    SCREEN_CODE_DETECTED = "screen.code_detected"
    SCREEN_MCQ_DETECTED = "screen.mcq_detected"
    
    # Context events
    CONTEXT_APP_CHANGED = "context.app_changed"
    CONTEXT_MODE_CHANGED = "context.mode_changed"
    
    # Session events
    SESSION_STARTED = "session.started"
    SESSION_PAUSED = "session.paused"
    SESSION_RESUMED = "session.resumed"
    SESSION_ENDED = "session.ended"
    
    # System events
    SYSTEM_READY = "system.ready"
    SYSTEM_ERROR = "system.error"
    SYSTEM_WARNING = "system.warning"


@dataclass
class Event:
    """Event data structure"""
    type: EventType | str
    data: Dict[str, Any] = field(default_factory=dict)
    timestamp: datetime = field(default_factory=datetime.now)
    source: str = "system"
    id: str = field(default_factory=lambda: str(datetime.now().timestamp()))


class EventBus:
    """
    Async event bus for inter-module communication
    Allows modules to publish and subscribe to events without tight coupling
    """
    
    def __init__(self):
        self._subscribers: Dict[str, List[Callable]] = {}
        self._wildcard_subscribers: List[Callable] = []
        self._history: List[Event] = []
        self._history_limit = 1000
        self._lock = asyncio.Lock()
    
    def subscribe(self, event_type: EventType | str, callback: Callable) -> Callable:
        """
        Subscribe to an event type
        
        Args:
            event_type: The event type to subscribe to (use "*" for all events)
            callback: Async callback function to call when event is emitted
            
        Returns:
            Unsubscribe function
        """
        event_key = event_type.value if isinstance(event_type, EventType) else event_type
        
        if event_key == "*":
            self._wildcard_subscribers.append(callback)
            logger.debug(f"Subscribed to all events: {callback.__name__}")
            return lambda: self._wildcard_subscribers.remove(callback)
        
        if event_key not in self._subscribers:
            self._subscribers[event_key] = []
        
        self._subscribers[event_key].append(callback)
        logger.debug(f"Subscribed to {event_key}: {callback.__name__}")
        
        # Return unsubscribe function
        return lambda: self._subscribers[event_key].remove(callback)
    
    async def emit(self, event: Event | EventType | str, data: Optional[Dict[str, Any]] = None, source: str = "system"):
        """
        Emit an event to all subscribers
        
        Args:
            event: Event object or event type
            data: Event data (if event is a string/EventType)
            source: Source module name
        """
        if isinstance(event, (EventType, str)):
            event = Event(
                type=event,
                data=data or {},
                source=source
            )
        
        event_key = event.type.value if isinstance(event.type, EventType) else event.type
        
        # Store in history
        async with self._lock:
            self._history.append(event)
            if len(self._history) > self._history_limit:
                self._history = self._history[-self._history_limit:]
        
        logger.debug(f"Event emitted: {event_key} from {event.source}")
        
        # Get all callbacks
        callbacks = []
        callbacks.extend(self._wildcard_subscribers)
        callbacks.extend(self._subscribers.get(event_key, []))
        
        # Execute all callbacks concurrently
        if callbacks:
            await asyncio.gather(
                *[self._safe_callback(cb, event) for cb in callbacks],
                return_exceptions=True
            )
    
    async def _safe_callback(self, callback: Callable, event: Event):
        """Safely execute a callback with error handling"""
        try:
            if asyncio.iscoroutinefunction(callback):
                await callback(event)
            else:
                callback(event)
        except Exception as e:
            logger.error(f"Error in event callback {callback.__name__}: {e}")
    
    def get_history(self, event_type: Optional[EventType | str] = None, limit: int = 100) -> List[Event]:
        """Get event history, optionally filtered by type"""
        history = self._history
        
        if event_type:
            event_key = event_type.value if isinstance(event_type, EventType) else event_type
            history = [e for e in history if (e.type.value if isinstance(e.type, EventType) else e.type) == event_key]
        
        return history[-limit:]
    
    def clear_history(self):
        """Clear event history"""
        self._history = []


# Global event bus instance
event_bus = EventBus()

