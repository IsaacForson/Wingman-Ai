"""
Wingman AI - Conversation Module
Manages conversation history and context
"""

from .conversation_manager import (
    ConversationManager,
    Conversation,
    Message,
    get_conversation_manager
)

__all__ = [
    "ConversationManager",
    "Conversation", 
    "Message",
    "get_conversation_manager"
]

