"""
Wingman AI - Main Engine
Orchestrates all modules and manages the application lifecycle
"""

import asyncio
from typing import Optional, Dict, Any, Literal
from dataclasses import dataclass
from datetime import datetime
from enum import Enum
from loguru import logger

from config import settings
from .event_bus import event_bus, EventType, Event


class OperatingMode(str, Enum):
    """Operating modes for Wingman AI"""
    INTERVIEW = "interview"
    STUDY = "study"
    WORK = "work"
    RESEARCH = "research"
    MEETING = "meeting"
    PRACTICE = "practice"


class EngineState(str, Enum):
    """Engine states"""
    INITIALIZING = "initializing"
    READY = "ready"
    LISTENING = "listening"
    PROCESSING = "processing"
    PAUSED = "paused"
    ERROR = "error"
    SHUTDOWN = "shutdown"


@dataclass
class SessionInfo:
    """Current session information"""
    id: str
    mode: OperatingMode
    started_at: datetime
    questions_count: int = 0
    answers_count: int = 0
    is_recording: bool = False


class WingmanEngine:
    """
    Main orchestrator for Wingman AI
    Coordinates all modules and manages the application state
    """
    
    def __init__(self):
        self.state = EngineState.INITIALIZING
        self.mode = OperatingMode.INTERVIEW
        self.session: Optional[SessionInfo] = None
        
        # Module references (initialized lazily)
        self._audio_module = None
        self._screen_module = None
        self._ai_module = None
        self._context_module = None
        self._knowledge_module = None
        
        # Processing flags
        self._is_audio_enabled = settings.enable_audio
        self._is_screen_enabled = settings.enable_screen_capture
        self._is_processing = False
        
        # Current context
        self._current_transcript = ""
        self._current_question = None
        self._pending_answer = None
        
        logger.info("WingmanEngine created")
    
    async def initialize(self):
        """Initialize all modules"""
        logger.info("Initializing Wingman Engine...")
        
        try:
            # Initialize modules based on settings
            if self._is_audio_enabled:
                await self._init_audio_module()
            
            if self._is_screen_enabled:
                await self._init_screen_module()
            
            await self._init_ai_module()
            await self._init_context_module()
            
            # Setup event handlers
            self._setup_event_handlers()
            
            # Start a new session
            await self._start_session()
            
            self.state = EngineState.READY
            await event_bus.emit(EventType.SYSTEM_READY, {"mode": self.mode.value}, "engine")
            
            logger.info("✅ Wingman Engine initialized successfully")
            
        except Exception as e:
            self.state = EngineState.ERROR
            logger.error(f"Failed to initialize engine: {e}")
            await event_bus.emit(EventType.SYSTEM_ERROR, {"error": str(e)}, "engine")
            raise
    
    async def _init_audio_module(self):
        """Initialize audio processing module"""
        try:
            from modules.audio import AudioModule
            self._audio_module = AudioModule()
            await self._audio_module.initialize()
            logger.info("Audio module initialized")
        except ImportError as e:
            logger.warning(f"Audio module not available: {e}")
        except Exception as e:
            logger.error(f"Failed to initialize audio module: {e}")
    
    async def _init_screen_module(self):
        """Initialize screen capture module"""
        try:
            from modules.screen import ScreenModule
            self._screen_module = ScreenModule()
            await self._screen_module.initialize()
            logger.info("Screen module initialized")
        except ImportError as e:
            logger.warning(f"Screen module not available: {e}")
        except Exception as e:
            logger.error(f"Failed to initialize screen module: {e}")
    
    async def _init_ai_module(self):
        """Initialize AI processing module"""
        try:
            from modules.ai import AIModule
            self._ai_module = AIModule()
            await self._ai_module.initialize()
            logger.info("AI module initialized")
        except ImportError as e:
            logger.warning(f"AI module not available: {e}")
        except Exception as e:
            logger.error(f"Failed to initialize AI module: {e}")
    
    async def _init_context_module(self):
        """Initialize context awareness module"""
        try:
            from modules.context import ContextModule
            self._context_module = ContextModule()
            await self._context_module.initialize()
            logger.info("Context module initialized")
        except ImportError as e:
            logger.warning(f"Context module not available: {e}")
        except Exception as e:
            logger.error(f"Failed to initialize context module: {e}")
    
    def _setup_event_handlers(self):
        """Setup internal event handlers"""
        # Handle transcription events
        event_bus.subscribe(EventType.TRANSCRIPT_FINAL, self._on_transcript)
        
        # Handle question detection
        event_bus.subscribe(EventType.QUESTION_DETECTED, self._on_question_detected)
        
        # Handle screen text detection
        event_bus.subscribe(EventType.SCREEN_TEXT_DETECTED, self._on_screen_text)
        
        # Handle context changes
        event_bus.subscribe(EventType.CONTEXT_APP_CHANGED, self._on_app_changed)
    
    async def _start_session(self):
        """Start a new session"""
        session_id = f"session_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        self.session = SessionInfo(
            id=session_id,
            mode=self.mode,
            started_at=datetime.now()
        )
        await event_bus.emit(EventType.SESSION_STARTED, {
            "session_id": session_id,
            "mode": self.mode.value
        }, "engine")
        logger.info(f"Session started: {session_id}")
    
    async def _on_transcript(self, event: Event):
        """Handle final transcript events"""
        transcript = event.data.get("text", "")
        self._current_transcript = transcript
        
        # Check if it contains a question
        if self._ai_module and await self._ai_module.is_question(transcript):
            await event_bus.emit(EventType.QUESTION_DETECTED, {
                "text": transcript,
                "source": "audio"
            }, "engine")
    
    async def _on_question_detected(self, event: Event):
        """Handle question detection"""
        if self._is_processing:
            logger.debug("Already processing a question, skipping")
            return
        
        question_text = event.data.get("text", "")
        source = event.data.get("source", "unknown")
        
        logger.info(f"Question detected from {source}: {question_text[:100]}...")
        
        if self.session:
            self.session.questions_count += 1
        
        self._is_processing = True
        self._current_question = question_text
        
        try:
            # Generate answer
            if self._ai_module:
                await self._generate_answer(question_text, source)
        finally:
            self._is_processing = False
    
    async def _on_screen_text(self, event: Event):
        """Handle screen text detection"""
        text = event.data.get("text", "")
        text_type = event.data.get("type", "general")
        
        # Check for questions in screen text
        if text_type == "mcq" or text_type == "code_question":
            await event_bus.emit(EventType.QUESTION_DETECTED, {
                "text": text,
                "source": "screen",
                "type": text_type
            }, "engine")
    
    async def _on_app_changed(self, event: Event):
        """Handle application context changes"""
        app_name = event.data.get("app_name", "")
        # Could auto-switch modes based on active app
        logger.debug(f"Active app changed: {app_name}")
    
    async def _generate_answer(self, question: str, source: str):
        """Generate an answer for a detected question"""
        await event_bus.emit(EventType.ANSWER_GENERATING, {
            "question": question,
            "source": source
        }, "engine")
        
        try:
            # Get context for RAG
            context = await self._get_context(question)
            
            # Stream answer generation
            answer_chunks = []
            async for chunk in self._ai_module.generate_answer_stream(
                question=question,
                context=context,
                mode=self.mode.value
            ):
                answer_chunks.append(chunk)
                await event_bus.emit(EventType.ANSWER_CHUNK, {
                    "chunk": chunk,
                    "question": question
                }, "engine")
            
            full_answer = "".join(answer_chunks)
            
            if self.session:
                self.session.answers_count += 1
            
            await event_bus.emit(EventType.ANSWER_COMPLETE, {
                "question": question,
                "answer": full_answer,
                "source": source
            }, "engine")
            
            logger.info(f"Answer generated: {len(full_answer)} chars")
            
        except Exception as e:
            logger.error(f"Error generating answer: {e}")
            await event_bus.emit(EventType.ANSWER_ERROR, {
                "question": question,
                "error": str(e)
            }, "engine")
    
    async def _get_context(self, question: str) -> str:
        """Get relevant context for a question"""
        context_parts = []
        
        # Add knowledge base context
        if self._knowledge_module:
            kb_context = await self._knowledge_module.search(question)
            if kb_context:
                context_parts.append(f"Knowledge Base:\n{kb_context}")
        
        # Add recent transcript context
        if self._current_transcript:
            context_parts.append(f"Recent Transcript:\n{self._current_transcript}")
        
        return "\n\n".join(context_parts)
    
    async def set_mode(self, mode: str):
        """Change the operating mode"""
        try:
            new_mode = OperatingMode(mode.lower())
            old_mode = self.mode
            self.mode = new_mode
            
            if self.session:
                self.session.mode = new_mode
            
            await event_bus.emit(EventType.CONTEXT_MODE_CHANGED, {
                "old_mode": old_mode.value,
                "new_mode": new_mode.value
            }, "engine")
            
            logger.info(f"Mode changed: {old_mode.value} → {new_mode.value}")
            
        except ValueError:
            logger.warning(f"Invalid mode: {mode}")
    
    async def start_audio(self):
        """Start audio capture"""
        if self._audio_module:
            await self._audio_module.start()
            self.state = EngineState.LISTENING
            await event_bus.emit(EventType.AUDIO_STARTED, {}, "engine")
    
    async def stop_audio(self):
        """Stop audio capture"""
        if self._audio_module:
            await self._audio_module.stop()
            if self.state == EngineState.LISTENING:
                self.state = EngineState.READY
            await event_bus.emit(EventType.AUDIO_STOPPED, {}, "engine")
    
    async def capture_screen(self) -> Optional[Dict[str, Any]]:
        """Capture and analyze current screen"""
        if self._screen_module:
            return await self._screen_module.capture_and_analyze()
        return None
    
    async def process_manual_question(self, question: str):
        """Process a manually submitted question"""
        await event_bus.emit(EventType.QUESTION_DETECTED, {
            "text": question,
            "source": "manual"
        }, "engine")
    
    async def get_status(self) -> Dict[str, Any]:
        """Get current engine status"""
        return {
            "state": self.state.value,
            "mode": self.mode.value,
            "session": {
                "id": self.session.id if self.session else None,
                "started_at": self.session.started_at.isoformat() if self.session else None,
                "questions_count": self.session.questions_count if self.session else 0,
                "answers_count": self.session.answers_count if self.session else 0
            } if self.session else None,
            "modules": {
                "audio": self._audio_module is not None,
                "screen": self._screen_module is not None,
                "ai": self._ai_module is not None,
                "context": self._context_module is not None
            },
            "settings": {
                "audio_enabled": self._is_audio_enabled,
                "screen_enabled": self._is_screen_enabled
            }
        }
    
    async def pause(self):
        """Pause all processing"""
        self.state = EngineState.PAUSED
        if self._audio_module:
            await self._audio_module.pause()
        await event_bus.emit(EventType.SESSION_PAUSED, {}, "engine")
        logger.info("Engine paused")
    
    async def resume(self):
        """Resume processing"""
        self.state = EngineState.LISTENING if self._is_audio_enabled else EngineState.READY
        if self._audio_module:
            await self._audio_module.resume()
        await event_bus.emit(EventType.SESSION_RESUMED, {}, "engine")
        logger.info("Engine resumed")
    
    async def shutdown(self):
        """Shutdown all modules"""
        logger.info("Shutting down engine...")
        self.state = EngineState.SHUTDOWN
        
        # End session
        if self.session:
            await event_bus.emit(EventType.SESSION_ENDED, {
                "session_id": self.session.id,
                "questions_count": self.session.questions_count,
                "answers_count": self.session.answers_count
            }, "engine")
        
        # Shutdown modules
        if self._audio_module:
            await self._audio_module.shutdown()
        if self._screen_module:
            await self._screen_module.shutdown()
        if self._ai_module:
            await self._ai_module.shutdown()
        
        logger.info("Engine shutdown complete")

