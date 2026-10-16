"""
Wingman AI - Conversation Manager
Manages conversation history with auto-cleanup after 48 hours
"""

import json
import os
from datetime import datetime, timedelta
from typing import List, Dict, Optional
from loguru import logger
from pathlib import Path


class Message:
    """A single message in a conversation"""
    def __init__(self, role: str, content: str, timestamp: datetime = None):
        self.role = role  # 'user' or 'assistant'
        self.content = content
        self.timestamp = timestamp or datetime.now()
    
    def to_dict(self) -> Dict:
        return {
            "role": self.role,
            "content": self.content,
            "timestamp": self.timestamp.isoformat()
        }
    
    @classmethod
    def from_dict(cls, data: Dict) -> "Message":
        return cls(
            role=data["role"],
            content=data["content"],
            timestamp=datetime.fromisoformat(data["timestamp"])
        )


class Conversation:
    """A conversation with message history"""
    def __init__(
        self, 
        id: str, 
        mode: str = "interview",
        title: str = None,
        created_at: datetime = None,
        messages: List[Message] = None
    ):
        self.id = id
        self.mode = mode
        self.title = title
        self.created_at = created_at or datetime.now()
        self.updated_at = self.created_at
        self.messages: List[Message] = messages or []
    
    def add_message(self, role: str, content: str):
        """Add a message to the conversation"""
        msg = Message(role, content)
        self.messages.append(msg)
        self.updated_at = datetime.now()
        
        # Auto-generate title from first user message
        if not self.title and role == "user":
            self.title = content[:50] + ("..." if len(content) > 50 else "")
    
    def get_context_messages(self, limit: int = 10) -> List[Dict[str, str]]:
        """Get recent messages formatted for AI context"""
        recent = self.messages[-limit:] if len(self.messages) > limit else self.messages
        return [{"role": m.role, "content": m.content} for m in recent]
    
    def is_expired(self, hours: int = 48) -> bool:
        """Check if conversation has expired"""
        return datetime.now() - self.updated_at > timedelta(hours=hours)
    
    def to_dict(self) -> Dict:
        return {
            "id": self.id,
            "mode": self.mode,
            "title": self.title,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
            "messages": [m.to_dict() for m in self.messages]
        }
    
    @classmethod
    def from_dict(cls, data: Dict) -> "Conversation":
        messages = [Message.from_dict(m) for m in data.get("messages", [])]
        conv = cls(
            id=data["id"],
            mode=data.get("mode", "interview"),
            title=data.get("title"),
            created_at=datetime.fromisoformat(data["created_at"]),
            messages=messages
        )
        conv.updated_at = datetime.fromisoformat(data.get("updated_at", data["created_at"]))
        return conv


class ConversationManager:
    """Manages all conversations with persistence and auto-cleanup"""
    
    def __init__(self, storage_path: str = None):
        self.storage_path = storage_path or self._get_default_storage_path()
        self.persist = True  # "Save session history" setting
        self.conversations: Dict[str, Conversation] = {}
        self.active_conversation_id: Optional[str] = None
        self._load_conversations()
    
    def _get_default_storage_path(self) -> str:
        """Get default storage path in user's app data"""
        home = Path.home()
        app_data = home / ".wingman"
        app_data.mkdir(exist_ok=True)
        return str(app_data / "conversations.json")
    
    def _load_conversations(self):
        """Load conversations from disk"""
        try:
            if os.path.exists(self.storage_path):
                with open(self.storage_path, 'r') as f:
                    data = json.load(f)
                
                for conv_data in data.get("conversations", []):
                    conv = Conversation.from_dict(conv_data)
                    self.conversations[conv.id] = conv
                
                self.active_conversation_id = data.get("active_conversation_id")
                logger.info(f"Loaded {len(self.conversations)} conversations")
                
                # Clean up expired conversations
                self.cleanup_expired()
        except Exception as e:
            logger.error(f"Failed to load conversations: {e}")
            self.conversations = {}
    
    def _save_conversations(self):
        """Save conversations to disk"""
        if not self.persist:
            return
        try:
            data = {
                "conversations": [c.to_dict() for c in self.conversations.values()],
                "active_conversation_id": self.active_conversation_id
            }
            with open(self.storage_path, 'w') as f:
                json.dump(data, f, indent=2)
        except Exception as e:
            logger.error(f"Failed to save conversations: {e}")
    
    def cleanup_expired(self, hours: int = 48):
        """Remove conversations older than specified hours"""
        expired = [cid for cid, conv in self.conversations.items() if conv.is_expired(hours)]
        
        for cid in expired:
            del self.conversations[cid]
            logger.info(f"Removed expired conversation: {cid}")
        
        if expired:
            if self.active_conversation_id in expired:
                self.active_conversation_id = None
            self._save_conversations()
            logger.info(f"Cleaned up {len(expired)} expired conversations")
    
    def create_conversation(self, mode: str = "interview") -> Conversation:
        """Create a new conversation"""
        import uuid
        conv_id = str(uuid.uuid4())[:8]
        conv = Conversation(id=conv_id, mode=mode)
        self.conversations[conv_id] = conv
        self.active_conversation_id = conv_id
        self._save_conversations()
        logger.info(f"Created new conversation: {conv_id} (mode: {mode})")
        return conv
    
    def get_conversation(self, conv_id: str) -> Optional[Conversation]:
        """Get a specific conversation"""
        return self.conversations.get(conv_id)
    
    def get_active_conversation(self) -> Optional[Conversation]:
        """Get the currently active conversation"""
        if self.active_conversation_id:
            return self.conversations.get(self.active_conversation_id)
        return None
    
    def set_active_conversation(self, conv_id: str) -> bool:
        """Set the active conversation"""
        if conv_id in self.conversations:
            self.active_conversation_id = conv_id
            self._save_conversations()
            return True
        return False
    
    def add_message(self, role: str, content: str, conv_id: str = None) -> Optional[Conversation]:
        """Add a message to a conversation (creates new if none exists)"""
        conv_id = conv_id or self.active_conversation_id
        
        if not conv_id or conv_id not in self.conversations:
            # Create new conversation if none exists
            conv = self.create_conversation()
        else:
            conv = self.conversations[conv_id]
        
        conv.add_message(role, content)
        self._save_conversations()
        return conv
    
    def get_context_for_ai(self, conv_id: str = None, limit: int = 10) -> List[Dict[str, str]]:
        """Get conversation context formatted for AI"""
        conv_id = conv_id or self.active_conversation_id
        
        if not conv_id or conv_id not in self.conversations:
            return []
        
        return self.conversations[conv_id].get_context_messages(limit)
    
    def list_conversations(self) -> List[Dict]:
        """List all conversations (for UI)"""
        convs = sorted(
            self.conversations.values(),
            key=lambda c: c.updated_at,
            reverse=True
        )
        return [
            {
                "id": c.id,
                "title": c.title or "New conversation",
                "mode": c.mode,
                "created_at": c.created_at.isoformat(),
                "updated_at": c.updated_at.isoformat(),
                "message_count": len(c.messages),
                "is_active": c.id == self.active_conversation_id
            }
            for c in convs
        ]
    
    def delete_conversation(self, conv_id: str) -> bool:
        """Delete a specific conversation"""
        if conv_id in self.conversations:
            del self.conversations[conv_id]
            if self.active_conversation_id == conv_id:
                self.active_conversation_id = None
            self._save_conversations()
            logger.info(f"Deleted conversation: {conv_id}")
            return True
        return False
    
    def clear_all(self):
        """Clear all conversations"""
        self.conversations = {}
        self.active_conversation_id = None
        self._save_conversations()
        logger.info("Cleared all conversations")
    
    def change_mode(self, mode: str, conv_id: str = None) -> Optional[Conversation]:
        """Change the mode of the active conversation"""
        conv_id = conv_id or self.active_conversation_id
        
        if conv_id and conv_id in self.conversations:
            self.conversations[conv_id].mode = mode
            self._save_conversations()
            return self.conversations[conv_id]
        return None


# Singleton instance
_conversation_manager: Optional[ConversationManager] = None


def get_conversation_manager() -> ConversationManager:
    """Get the singleton conversation manager instance"""
    global _conversation_manager
    if _conversation_manager is None:
        _conversation_manager = ConversationManager()
    return _conversation_manager

