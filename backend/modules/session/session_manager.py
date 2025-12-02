"""
Wingman AI - Session Manager
Save/load sessions, manage history, persist state
"""

import asyncio
import json
import os
from typing import Optional, Dict, Any, List
from datetime import datetime
from pathlib import Path
from dataclasses import dataclass, asdict
import uuid
import aiosqlite
from loguru import logger

from config import settings


@dataclass
class QuestionAnswer:
    """A question-answer pair with metadata"""
    id: str
    question: str
    answer: str
    source: str  # 'audio', 'screen', 'manual'
    mode: str
    timestamp: str
    duration_ms: int = 0
    feedback: Optional[str] = None  # 'positive', 'negative', None
    tags: List[str] = None
    
    def __post_init__(self):
        if self.tags is None:
            self.tags = []


@dataclass
class Session:
    """A user session with all associated data"""
    id: str
    started_at: str
    ended_at: Optional[str]
    mode: str
    questions_count: int
    answers_count: int
    total_duration_ms: int
    metadata: Dict[str, Any]
    
    @classmethod
    def create_new(cls, mode: str = "interview") -> "Session":
        return cls(
            id=f"session_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{uuid.uuid4().hex[:6]}",
            started_at=datetime.now().isoformat(),
            ended_at=None,
            mode=mode,
            questions_count=0,
            answers_count=0,
            total_duration_ms=0,
            metadata={}
        )


class SessionManager:
    """
    Manages sessions, history, and persistent storage
    Uses SQLite for reliable local storage
    """
    
    def __init__(self, db_path: Optional[Path] = None):
        self.db_path = db_path or Path(settings.database_url.replace("sqlite+aiosqlite:///", ""))
        self._current_session: Optional[Session] = None
        self._db: Optional[aiosqlite.Connection] = None
        self._initialized = False
    
    async def initialize(self):
        """Initialize the database"""
        # Ensure data directory exists
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        
        # Connect to database
        self._db = await aiosqlite.connect(str(self.db_path))
        
        # Create tables
        await self._create_tables()
        
        self._initialized = True
        logger.info(f"Session manager initialized (db: {self.db_path})")
    
    async def _create_tables(self):
        """Create database tables"""
        await self._db.executescript("""
            CREATE TABLE IF NOT EXISTS sessions (
                id TEXT PRIMARY KEY,
                started_at TEXT NOT NULL,
                ended_at TEXT,
                mode TEXT NOT NULL,
                questions_count INTEGER DEFAULT 0,
                answers_count INTEGER DEFAULT 0,
                total_duration_ms INTEGER DEFAULT 0,
                metadata TEXT DEFAULT '{}'
            );
            
            CREATE TABLE IF NOT EXISTS questions_answers (
                id TEXT PRIMARY KEY,
                session_id TEXT NOT NULL,
                question TEXT NOT NULL,
                answer TEXT NOT NULL,
                source TEXT NOT NULL,
                mode TEXT NOT NULL,
                timestamp TEXT NOT NULL,
                duration_ms INTEGER DEFAULT 0,
                feedback TEXT,
                tags TEXT DEFAULT '[]',
                FOREIGN KEY (session_id) REFERENCES sessions(id)
            );
            
            CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
            
            CREATE INDEX IF NOT EXISTS idx_qa_session ON questions_answers(session_id);
            CREATE INDEX IF NOT EXISTS idx_qa_timestamp ON questions_answers(timestamp);
            CREATE INDEX IF NOT EXISTS idx_sessions_started ON sessions(started_at);
        """)
        await self._db.commit()
    
    async def start_session(self, mode: str = "interview") -> Session:
        """Start a new session"""
        self._current_session = Session.create_new(mode)
        
        await self._db.execute(
            """INSERT INTO sessions (id, started_at, ended_at, mode, questions_count, answers_count, total_duration_ms, metadata)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                self._current_session.id,
                self._current_session.started_at,
                self._current_session.ended_at,
                self._current_session.mode,
                self._current_session.questions_count,
                self._current_session.answers_count,
                self._current_session.total_duration_ms,
                json.dumps(self._current_session.metadata)
            )
        )
        await self._db.commit()
        
        logger.info(f"Started session: {self._current_session.id}")
        return self._current_session
    
    async def end_session(self) -> Optional[Session]:
        """End current session"""
        if not self._current_session:
            return None
        
        self._current_session.ended_at = datetime.now().isoformat()
        
        # Calculate total duration
        started = datetime.fromisoformat(self._current_session.started_at)
        ended = datetime.fromisoformat(self._current_session.ended_at)
        self._current_session.total_duration_ms = int((ended - started).total_seconds() * 1000)
        
        await self._db.execute(
            """UPDATE sessions SET ended_at = ?, total_duration_ms = ? WHERE id = ?""",
            (self._current_session.ended_at, self._current_session.total_duration_ms, self._current_session.id)
        )
        await self._db.commit()
        
        logger.info(f"Ended session: {self._current_session.id}")
        
        session = self._current_session
        self._current_session = None
        return session
    
    async def save_qa(
        self,
        question: str,
        answer: str,
        source: str = "audio",
        mode: str = "interview",
        duration_ms: int = 0,
        tags: List[str] = None
    ) -> QuestionAnswer:
        """Save a question-answer pair"""
        if not self._current_session:
            await self.start_session(mode)
        
        qa = QuestionAnswer(
            id=f"qa_{uuid.uuid4().hex[:12]}",
            question=question,
            answer=answer,
            source=source,
            mode=mode,
            timestamp=datetime.now().isoformat(),
            duration_ms=duration_ms,
            tags=tags or []
        )
        
        await self._db.execute(
            """INSERT INTO questions_answers (id, session_id, question, answer, source, mode, timestamp, duration_ms, feedback, tags)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                qa.id,
                self._current_session.id,
                qa.question,
                qa.answer,
                qa.source,
                qa.mode,
                qa.timestamp,
                qa.duration_ms,
                qa.feedback,
                json.dumps(qa.tags)
            )
        )
        
        # Update session counts
        self._current_session.questions_count += 1
        self._current_session.answers_count += 1
        
        await self._db.execute(
            """UPDATE sessions SET questions_count = ?, answers_count = ? WHERE id = ?""",
            (self._current_session.questions_count, self._current_session.answers_count, self._current_session.id)
        )
        
        await self._db.commit()
        return qa
    
    async def set_feedback(self, qa_id: str, feedback: str):
        """Set feedback for a Q&A pair"""
        await self._db.execute(
            """UPDATE questions_answers SET feedback = ? WHERE id = ?""",
            (feedback, qa_id)
        )
        await self._db.commit()
    
    async def get_history(
        self,
        limit: int = 50,
        offset: int = 0,
        session_id: Optional[str] = None,
        mode: Optional[str] = None,
        search: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Get Q&A history with filters"""
        query = "SELECT * FROM questions_answers WHERE 1=1"
        params = []
        
        if session_id:
            query += " AND session_id = ?"
            params.append(session_id)
        
        if mode:
            query += " AND mode = ?"
            params.append(mode)
        
        if search:
            query += " AND (question LIKE ? OR answer LIKE ?)"
            params.extend([f"%{search}%", f"%{search}%"])
        
        query += " ORDER BY timestamp DESC LIMIT ? OFFSET ?"
        params.extend([limit, offset])
        
        async with self._db.execute(query, params) as cursor:
            rows = await cursor.fetchall()
            columns = [description[0] for description in cursor.description]
            
            results = []
            for row in rows:
                item = dict(zip(columns, row))
                item['tags'] = json.loads(item.get('tags', '[]'))
                results.append(item)
            
            return results
    
    async def get_sessions(
        self,
        limit: int = 20,
        offset: int = 0
    ) -> List[Dict[str, Any]]:
        """Get session list"""
        query = """SELECT * FROM sessions ORDER BY started_at DESC LIMIT ? OFFSET ?"""
        
        async with self._db.execute(query, (limit, offset)) as cursor:
            rows = await cursor.fetchall()
            columns = [description[0] for description in cursor.description]
            
            results = []
            for row in rows:
                item = dict(zip(columns, row))
                item['metadata'] = json.loads(item.get('metadata', '{}'))
                results.append(item)
            
            return results
    
    async def get_session_stats(self, session_id: str) -> Dict[str, Any]:
        """Get detailed stats for a session"""
        async with self._db.execute(
            """SELECT * FROM sessions WHERE id = ?""",
            (session_id,)
        ) as cursor:
            row = await cursor.fetchone()
            if not row:
                return {}
            
            columns = [description[0] for description in cursor.description]
            session = dict(zip(columns, row))
        
        # Get Q&A count by source
        async with self._db.execute(
            """SELECT source, COUNT(*) as count FROM questions_answers WHERE session_id = ? GROUP BY source""",
            (session_id,)
        ) as cursor:
            source_counts = {row[0]: row[1] for row in await cursor.fetchall()}
        
        # Get feedback stats
        async with self._db.execute(
            """SELECT feedback, COUNT(*) as count FROM questions_answers WHERE session_id = ? AND feedback IS NOT NULL GROUP BY feedback""",
            (session_id,)
        ) as cursor:
            feedback_counts = {row[0]: row[1] for row in await cursor.fetchall()}
        
        return {
            **session,
            "source_breakdown": source_counts,
            "feedback_breakdown": feedback_counts
        }
    
    async def save_setting(self, key: str, value: Any):
        """Save a setting"""
        await self._db.execute(
            """INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, ?)""",
            (key, json.dumps(value), datetime.now().isoformat())
        )
        await self._db.commit()
    
    async def get_setting(self, key: str, default: Any = None) -> Any:
        """Get a setting"""
        async with self._db.execute(
            """SELECT value FROM settings WHERE key = ?""",
            (key,)
        ) as cursor:
            row = await cursor.fetchone()
            if row:
                return json.loads(row[0])
            return default
    
    async def export_session(self, session_id: str) -> Dict[str, Any]:
        """Export a session with all Q&A pairs"""
        session = await self.get_session_stats(session_id)
        history = await self.get_history(limit=1000, session_id=session_id)
        
        return {
            "session": session,
            "questions_answers": history,
            "exported_at": datetime.now().isoformat()
        }
    
    async def delete_session(self, session_id: str):
        """Delete a session and its Q&A pairs"""
        await self._db.execute(
            """DELETE FROM questions_answers WHERE session_id = ?""",
            (session_id,)
        )
        await self._db.execute(
            """DELETE FROM sessions WHERE id = ?""",
            (session_id,)
        )
        await self._db.commit()
        logger.info(f"Deleted session: {session_id}")
    
    async def clear_all_history(self):
        """Clear all history (dangerous!)"""
        await self._db.execute("DELETE FROM questions_answers")
        await self._db.execute("DELETE FROM sessions")
        await self._db.commit()
        logger.warning("Cleared all history")
    
    @property
    def current_session(self) -> Optional[Session]:
        return self._current_session
    
    async def shutdown(self):
        """Shutdown and cleanup"""
        if self._current_session:
            await self.end_session()
        
        if self._db:
            await self._db.close()
        
        logger.info("Session manager shutdown")

