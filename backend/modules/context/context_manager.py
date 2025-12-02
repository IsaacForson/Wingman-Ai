"""
Wingman AI - Context Manager
Combines audio, screen, and knowledge base context for AI
"""

import asyncio
from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta
from dataclasses import dataclass, field
from collections import deque
from loguru import logger

from config import settings


@dataclass
class ContextItem:
    """A piece of context with metadata"""
    content: str
    source: str  # 'audio', 'screen', 'knowledge', 'clipboard', 'manual'
    timestamp: datetime
    relevance_score: float = 1.0
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class ConversationTurn:
    """A question-answer pair"""
    question: str
    answer: str
    timestamp: datetime
    source: str
    mode: str


class ContextManager:
    """
    Manages and combines context from multiple sources
    for optimal AI answer generation
    """
    
    def __init__(
        self,
        max_context_items: int = 50,
        max_context_age_minutes: int = 30,
        max_conversation_turns: int = 10
    ):
        self.max_context_items = max_context_items
        self.max_context_age = timedelta(minutes=max_context_age_minutes)
        self.max_conversation_turns = max_conversation_turns
        
        # Context storage
        self._audio_context: deque[ContextItem] = deque(maxlen=20)
        self._screen_context: deque[ContextItem] = deque(maxlen=10)
        self._knowledge_context: deque[ContextItem] = deque(maxlen=10)
        self._clipboard_context: deque[ContextItem] = deque(maxlen=5)
        
        # Conversation history
        self._conversation_history: deque[ConversationTurn] = deque(maxlen=max_conversation_turns)
        
        # Current focus
        self._current_topic: Optional[str] = None
        self._current_app: Optional[str] = None
        self._current_mode: str = "interview"
        
        # Knowledge base reference
        self._knowledge_base = None
    
    def set_knowledge_base(self, kb):
        """Set reference to knowledge base module"""
        self._knowledge_base = kb
    
    def add_audio_context(self, text: str, metadata: Dict[str, Any] = None):
        """Add transcribed audio to context"""
        if not text or len(text.strip()) < 3:
            return
        
        self._audio_context.append(ContextItem(
            content=text.strip(),
            source="audio",
            timestamp=datetime.now(),
            metadata=metadata or {}
        ))
        logger.debug(f"Added audio context: {text[:50]}...")
    
    def add_screen_context(
        self,
        text: str,
        context_type: str = "general",
        metadata: Dict[str, Any] = None
    ):
        """Add screen capture text to context"""
        if not text or len(text.strip()) < 10:
            return
        
        # Higher relevance for code and MCQs
        relevance = 1.0
        if context_type == "code":
            relevance = 1.5
        elif context_type == "mcq":
            relevance = 1.8
        
        self._screen_context.append(ContextItem(
            content=text.strip(),
            source="screen",
            timestamp=datetime.now(),
            relevance_score=relevance,
            metadata={"type": context_type, **(metadata or {})}
        ))
        logger.debug(f"Added screen context ({context_type}): {text[:50]}...")
    
    def add_knowledge_context(self, text: str, source: str = "knowledge_base"):
        """Add knowledge base results to context"""
        if not text:
            return
        
        self._knowledge_context.append(ContextItem(
            content=text,
            source="knowledge",
            timestamp=datetime.now(),
            relevance_score=1.2,  # KB context is usually highly relevant
            metadata={"source": source}
        ))
    
    def add_clipboard_context(self, text: str):
        """Add clipboard content to context"""
        if not text or len(text.strip()) < 5:
            return
        
        self._clipboard_context.append(ContextItem(
            content=text.strip(),
            source="clipboard",
            timestamp=datetime.now(),
            metadata={}
        ))
    
    def add_conversation_turn(
        self,
        question: str,
        answer: str,
        source: str = "audio",
        mode: str = "interview"
    ):
        """Add a Q&A pair to conversation history"""
        self._conversation_history.append(ConversationTurn(
            question=question,
            answer=answer,
            timestamp=datetime.now(),
            source=source,
            mode=mode
        ))
    
    def set_current_app(self, app_name: str):
        """Update current active application"""
        self._current_app = app_name
    
    def set_current_mode(self, mode: str):
        """Update current operating mode"""
        self._current_mode = mode
    
    async def get_context_for_question(
        self,
        question: str,
        include_conversation: bool = True,
        include_knowledge: bool = True,
        max_tokens: int = 2000
    ) -> str:
        """
        Build optimized context string for a question
        
        Args:
            question: The question being asked
            include_conversation: Include recent Q&A history
            include_knowledge: Query knowledge base
            max_tokens: Approximate max tokens for context
            
        Returns:
            Formatted context string
        """
        context_parts = []
        
        # 1. Add relevant knowledge base results
        if include_knowledge and self._knowledge_base:
            try:
                kb_results = await self._knowledge_base.search(question, limit=3)
                if kb_results:
                    context_parts.append("## Relevant Knowledge\n" + kb_results)
            except Exception as e:
                logger.debug(f"Knowledge base search failed: {e}")
        
        # 2. Add recent screen context (highest priority for visual questions)
        screen_context = self._get_recent_screen_context()
        if screen_context:
            context_parts.append("## Screen Content\n" + screen_context)
        
        # 3. Add recent audio transcript
        audio_context = self._get_recent_audio_context()
        if audio_context:
            context_parts.append("## Recent Transcript\n" + audio_context)
        
        # 4. Add conversation history
        if include_conversation:
            conv_context = self._get_conversation_context()
            if conv_context:
                context_parts.append("## Previous Q&A\n" + conv_context)
        
        # 5. Add clipboard if relevant
        clipboard_context = self._get_clipboard_context()
        if clipboard_context:
            context_parts.append("## Clipboard\n" + clipboard_context)
        
        # Combine and trim to max length
        full_context = "\n\n".join(context_parts)
        
        # Simple token estimation (4 chars ≈ 1 token)
        max_chars = max_tokens * 4
        if len(full_context) > max_chars:
            full_context = full_context[:max_chars] + "\n...[truncated]"
        
        return full_context
    
    def _get_recent_screen_context(self, max_items: int = 3) -> str:
        """Get recent screen context, prioritizing high-relevance items"""
        now = datetime.now()
        valid_items = [
            item for item in self._screen_context
            if now - item.timestamp < self.max_context_age
        ]
        
        # Sort by relevance and recency
        valid_items.sort(
            key=lambda x: (x.relevance_score, -((now - x.timestamp).total_seconds())),
            reverse=True
        )
        
        items = valid_items[:max_items]
        if not items:
            return ""
        
        parts = []
        for item in items:
            item_type = item.metadata.get("type", "text")
            parts.append(f"[{item_type}]\n{item.content}")
        
        return "\n\n".join(parts)
    
    def _get_recent_audio_context(self, max_items: int = 5) -> str:
        """Get recent audio transcript"""
        now = datetime.now()
        valid_items = [
            item for item in self._audio_context
            if now - item.timestamp < self.max_context_age
        ]
        
        # Get most recent items
        items = list(valid_items)[-max_items:]
        if not items:
            return ""
        
        return " ".join(item.content for item in items)
    
    def _get_conversation_context(self, max_turns: int = 3) -> str:
        """Get recent conversation history"""
        turns = list(self._conversation_history)[-max_turns:]
        if not turns:
            return ""
        
        parts = []
        for turn in turns:
            parts.append(f"Q: {turn.question}\nA: {turn.answer[:200]}...")
        
        return "\n\n".join(parts)
    
    def _get_clipboard_context(self) -> str:
        """Get most recent clipboard content"""
        if not self._clipboard_context:
            return ""
        
        recent = self._clipboard_context[-1]
        now = datetime.now()
        
        # Only include if recent (< 5 minutes)
        if now - recent.timestamp > timedelta(minutes=5):
            return ""
        
        return recent.content[:500]
    
    def get_summary(self) -> Dict[str, Any]:
        """Get a summary of current context state"""
        return {
            "audio_items": len(self._audio_context),
            "screen_items": len(self._screen_context),
            "knowledge_items": len(self._knowledge_context),
            "clipboard_items": len(self._clipboard_context),
            "conversation_turns": len(self._conversation_history),
            "current_app": self._current_app,
            "current_mode": self._current_mode
        }
    
    def clear(self):
        """Clear all context"""
        self._audio_context.clear()
        self._screen_context.clear()
        self._knowledge_context.clear()
        self._clipboard_context.clear()
        self._conversation_history.clear()
        logger.info("Context cleared")
    
    def clear_audio(self):
        """Clear only audio context"""
        self._audio_context.clear()
    
    def clear_screen(self):
        """Clear only screen context"""
        self._screen_context.clear()

