"""
Wingman AI - Smart Clipboard
Intelligent clipboard monitoring, code detection, and auto-paste
"""

import asyncio
import re
from typing import Optional, Dict, Any, List, Callable
from datetime import datetime
from dataclasses import dataclass
from enum import Enum
from loguru import logger

try:
    import pyperclip
except ImportError:
    pyperclip = None
    logger.warning("pyperclip not available - clipboard features disabled")


class ContentType(str, Enum):
    TEXT = "text"
    CODE = "code"
    URL = "url"
    EMAIL = "email"
    JSON = "json"
    COMMAND = "command"
    UNKNOWN = "unknown"


@dataclass
class ClipboardEntry:
    """A clipboard entry with metadata"""
    content: str
    content_type: ContentType
    language: Optional[str]
    timestamp: datetime
    source: str  # 'user', 'wingman'
    metadata: Dict[str, Any]


class SmartClipboard:
    """
    Intelligent clipboard management
    - Monitors clipboard changes
    - Detects content types (code, URLs, etc.)
    - Provides quick paste functionality
    - Maintains clipboard history
    """
    
    def __init__(self, max_history: int = 50):
        self.max_history = max_history
        self._history: List[ClipboardEntry] = []
        self._monitoring = False
        self._monitor_task: Optional[asyncio.Task] = None
        self._last_content: Optional[str] = None
        self._callbacks: List[Callable] = []
        
        # Code detection patterns
        self._code_patterns = {
            "python": [
                r'def\s+\w+\s*\(', r'import\s+\w+', r'from\s+\w+\s+import',
                r'class\s+\w+:', r'if\s+__name__\s*==', r'print\s*\('
            ],
            "javascript": [
                r'function\s+\w+\s*\(', r'const\s+\w+\s*=', r'let\s+\w+\s*=',
                r'=>', r'async\s+function', r'export\s+(default\s+)?'
            ],
            "java": [
                r'public\s+class', r'private\s+\w+', r'System\.out\.print',
                r'public\s+static\s+void\s+main'
            ],
            "sql": [
                r'SELECT\s+', r'FROM\s+', r'WHERE\s+', r'INSERT\s+INTO',
                r'UPDATE\s+', r'DELETE\s+FROM'
            ],
            "html": [
                r'<html', r'<div', r'<span', r'<script', r'<!DOCTYPE'
            ],
            "css": [
                r'\{[\s\S]*?:\s*[\s\S]*?;', r'@media', r'\.[\w-]+\s*\{',
                r'#[\w-]+\s*\{'
            ],
            "shell": [
                r'^#!.*sh', r'\$\(', r'echo\s+', r'export\s+', r'sudo\s+'
            ]
        }
    
    async def initialize(self):
        """Initialize clipboard monitoring"""
        if pyperclip is None:
            logger.warning("Clipboard monitoring disabled (pyperclip not installed)")
            return
        
        try:
            self._last_content = pyperclip.paste()
        except Exception as e:
            logger.warning(f"Could not read clipboard: {e}")
        
        logger.info("Smart clipboard initialized")
    
    async def start_monitoring(self, interval: float = 0.5):
        """Start monitoring clipboard changes"""
        if pyperclip is None or self._monitoring:
            return
        
        self._monitoring = True
        self._monitor_task = asyncio.create_task(self._monitor_loop(interval))
        logger.info("Clipboard monitoring started")
    
    async def stop_monitoring(self):
        """Stop clipboard monitoring"""
        self._monitoring = False
        if self._monitor_task:
            self._monitor_task.cancel()
            try:
                await self._monitor_task
            except asyncio.CancelledError:
                pass
        logger.info("Clipboard monitoring stopped")
    
    async def _monitor_loop(self, interval: float):
        """Main monitoring loop"""
        try:
            while self._monitoring:
                try:
                    current = pyperclip.paste()
                    
                    if current and current != self._last_content:
                        self._last_content = current
                        entry = self._process_content(current, "user")
                        self._add_to_history(entry)
                        
                        # Notify callbacks
                        for callback in self._callbacks:
                            try:
                                if asyncio.iscoroutinefunction(callback):
                                    await callback(entry)
                                else:
                                    callback(entry)
                            except Exception as e:
                                logger.error(f"Clipboard callback error: {e}")
                
                except Exception as e:
                    logger.debug(f"Clipboard read error: {e}")
                
                await asyncio.sleep(interval)
                
        except asyncio.CancelledError:
            logger.debug("Clipboard monitoring cancelled")
    
    def _process_content(self, content: str, source: str) -> ClipboardEntry:
        """Process clipboard content and detect type"""
        content_type, language = self._detect_content_type(content)
        
        return ClipboardEntry(
            content=content,
            content_type=content_type,
            language=language,
            timestamp=datetime.now(),
            source=source,
            metadata=self._extract_metadata(content, content_type)
        )
    
    def _detect_content_type(self, content: str) -> tuple[ContentType, Optional[str]]:
        """Detect the type of clipboard content"""
        content_stripped = content.strip()
        
        # Check for URL
        url_pattern = r'^https?://[^\s]+'
        if re.match(url_pattern, content_stripped):
            return ContentType.URL, None
        
        # Check for email
        email_pattern = r'^[\w\.-]+@[\w\.-]+\.\w+$'
        if re.match(email_pattern, content_stripped):
            return ContentType.EMAIL, None
        
        # Check for JSON
        if content_stripped.startswith('{') or content_stripped.startswith('['):
            try:
                import json
                json.loads(content_stripped)
                return ContentType.JSON, None
            except Exception:
                pass
        
        # Check for shell command
        if content_stripped.startswith('$') or content_stripped.startswith('sudo'):
            return ContentType.COMMAND, "shell"
        
        # Check for code
        for language, patterns in self._code_patterns.items():
            for pattern in patterns:
                if re.search(pattern, content, re.IGNORECASE | re.MULTILINE):
                    return ContentType.CODE, language
        
        # Check for multi-line with indentation (likely code)
        lines = content.split('\n')
        if len(lines) > 3:
            indented_lines = sum(1 for line in lines if line.startswith(('  ', '\t')))
            if indented_lines / len(lines) > 0.3:
                return ContentType.CODE, None
        
        return ContentType.TEXT, None
    
    def _extract_metadata(self, content: str, content_type: ContentType) -> Dict[str, Any]:
        """Extract metadata from content"""
        metadata = {
            "length": len(content),
            "line_count": len(content.split('\n')),
            "word_count": len(content.split())
        }
        
        if content_type == ContentType.URL:
            # Extract domain
            match = re.search(r'https?://([^/]+)', content)
            if match:
                metadata["domain"] = match.group(1)
        
        elif content_type == ContentType.CODE:
            # Count function definitions
            metadata["functions"] = len(re.findall(r'(?:def|function|fn)\s+\w+', content))
            metadata["classes"] = len(re.findall(r'class\s+\w+', content))
        
        return metadata
    
    def _add_to_history(self, entry: ClipboardEntry):
        """Add entry to history"""
        self._history.append(entry)
        
        # Trim history
        if len(self._history) > self.max_history:
            self._history = self._history[-self.max_history:]
    
    def on_clipboard_change(self, callback: Callable):
        """Register a callback for clipboard changes"""
        self._callbacks.append(callback)
    
    async def copy(self, content: str, track: bool = True):
        """Copy content to clipboard"""
        if pyperclip is None:
            return
        
        try:
            pyperclip.copy(content)
            self._last_content = content
            
            if track:
                entry = self._process_content(content, "wingman")
                self._add_to_history(entry)
            
            logger.debug(f"Copied to clipboard: {content[:50]}...")
        except Exception as e:
            logger.error(f"Failed to copy to clipboard: {e}")
    
    async def paste(self) -> Optional[str]:
        """Get current clipboard content"""
        if pyperclip is None:
            return None
        
        try:
            return pyperclip.paste()
        except Exception as e:
            logger.error(f"Failed to paste from clipboard: {e}")
            return None
    
    def get_history(
        self,
        limit: int = 20,
        content_type: Optional[ContentType] = None
    ) -> List[Dict[str, Any]]:
        """Get clipboard history"""
        entries = self._history
        
        if content_type:
            entries = [e for e in entries if e.content_type == content_type]
        
        # Most recent first
        entries = list(reversed(entries[-limit:]))
        
        return [
            {
                "content": e.content[:500],  # Truncate for display
                "content_type": e.content_type.value,
                "language": e.language,
                "timestamp": e.timestamp.isoformat(),
                "source": e.source,
                "metadata": e.metadata
            }
            for e in entries
        ]
    
    def get_code_history(self, limit: int = 10) -> List[Dict[str, Any]]:
        """Get code snippets from history"""
        return self.get_history(limit=limit, content_type=ContentType.CODE)
    
    async def copy_answer(self, answer: str):
        """Copy an AI-generated answer to clipboard"""
        # Clean up markdown for plain text
        cleaned = self._clean_for_clipboard(answer)
        await self.copy(cleaned)
    
    def _clean_for_clipboard(self, text: str) -> str:
        """Clean text for clipboard (remove excessive markdown)"""
        # Remove code block markers but keep code
        text = re.sub(r'```\w*\n?', '', text)
        
        # Convert markdown headers to plain text
        text = re.sub(r'^#+\s+', '', text, flags=re.MULTILINE)
        
        # Convert bold/italic
        text = re.sub(r'\*\*([^*]+)\*\*', r'\1', text)
        text = re.sub(r'\*([^*]+)\*', r'\1', text)
        
        return text.strip()
    
    def clear_history(self):
        """Clear clipboard history"""
        self._history = []
        logger.info("Clipboard history cleared")
    
    async def shutdown(self):
        """Shutdown clipboard monitoring"""
        await self.stop_monitoring()
        logger.info("Smart clipboard shutdown")

