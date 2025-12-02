"""
Wingman AI - Context Awareness Module
Active app detection, mode switching, and context management
"""

from .context_module import ContextModule
from .context_manager import ContextManager, ContextItem, ConversationTurn

__all__ = [
    "ContextModule",
    "ContextManager",
    "ContextItem",
    "ConversationTurn"
]
