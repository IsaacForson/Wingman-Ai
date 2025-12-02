"""
Wingman AI - Meeting Intelligence
Real-time meeting analysis, summaries, action items, and insights
"""

import asyncio
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
from dataclasses import dataclass, field
from enum import Enum
from loguru import logger

from config import settings


class MeetingState(str, Enum):
    IDLE = "idle"
    ACTIVE = "active"
    PAUSED = "paused"
    ENDED = "ended"


@dataclass
class ActionItem:
    """An action item extracted from meeting"""
    id: str
    text: str
    assignee: Optional[str]
    due_date: Optional[str]
    priority: str  # 'high', 'medium', 'low'
    source_text: str
    timestamp: str


@dataclass
class KeyPoint:
    """A key point or decision from meeting"""
    id: str
    text: str
    category: str  # 'decision', 'insight', 'question', 'concern'
    timestamp: str


@dataclass
class Speaker:
    """Meeting participant with stats"""
    name: str
    talk_time_seconds: int = 0
    word_count: int = 0
    interventions: int = 0


@dataclass
class MeetingSession:
    """A complete meeting session"""
    id: str
    title: str
    started_at: str
    ended_at: Optional[str]
    state: MeetingState
    participants: List[str]
    action_items: List[ActionItem]
    key_points: List[KeyPoint]
    transcript: List[Dict[str, Any]]
    summary: Optional[str]
    speakers: Dict[str, Speaker]


class MeetingIntelligence:
    """
    Real-time meeting intelligence and analysis
    Extracts action items, key points, and generates summaries
    """
    
    def __init__(self):
        self._current_meeting: Optional[MeetingSession] = None
        self._answer_generator = None
        self._transcript_buffer: List[Dict[str, Any]] = []
        self._last_summary_time: Optional[datetime] = None
    
    def set_answer_generator(self, generator):
        """Set reference to AI answer generator"""
        self._answer_generator = generator
    
    async def start_meeting(self, title: str = "Meeting") -> MeetingSession:
        """Start a new meeting session"""
        meeting_id = f"meeting_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        
        self._current_meeting = MeetingSession(
            id=meeting_id,
            title=title,
            started_at=datetime.now().isoformat(),
            ended_at=None,
            state=MeetingState.ACTIVE,
            participants=[],
            action_items=[],
            key_points=[],
            transcript=[],
            summary=None,
            speakers={}
        )
        
        self._transcript_buffer = []
        self._last_summary_time = datetime.now()
        
        logger.info(f"Meeting started: {meeting_id}")
        return self._current_meeting
    
    async def end_meeting(self) -> Optional[MeetingSession]:
        """End current meeting and generate final summary"""
        if not self._current_meeting:
            return None
        
        self._current_meeting.state = MeetingState.ENDED
        self._current_meeting.ended_at = datetime.now().isoformat()
        
        # Generate final summary
        await self._generate_final_summary()
        
        meeting = self._current_meeting
        self._current_meeting = None
        
        logger.info(f"Meeting ended: {meeting.id}")
        return meeting
    
    async def add_transcript_line(
        self,
        text: str,
        speaker: Optional[str] = None,
        timestamp: Optional[str] = None
    ):
        """Add a transcript line to the meeting"""
        if not self._current_meeting or self._current_meeting.state != MeetingState.ACTIVE:
            return
        
        entry = {
            "text": text,
            "speaker": speaker or "Unknown",
            "timestamp": timestamp or datetime.now().isoformat()
        }
        
        self._current_meeting.transcript.append(entry)
        self._transcript_buffer.append(entry)
        
        # Update speaker stats
        if speaker:
            if speaker not in self._current_meeting.speakers:
                self._current_meeting.speakers[speaker] = Speaker(name=speaker)
            
            self._current_meeting.speakers[speaker].word_count += len(text.split())
            self._current_meeting.speakers[speaker].interventions += 1
        
        # Check for action items in real-time
        await self._detect_action_items(text, speaker)
        
        # Check for key points
        await self._detect_key_points(text)
        
        # Generate periodic summary (every 5 minutes)
        if self._should_generate_periodic_summary():
            await self._generate_periodic_summary()
    
    async def _detect_action_items(self, text: str, speaker: Optional[str]):
        """Detect action items from transcript"""
        text_lower = text.lower()
        
        # Action item indicators
        action_indicators = [
            "i will", "i'll", "i'm going to",
            "we need to", "we should", "we must",
            "action item", "todo", "to-do",
            "follow up", "follow-up",
            "by tomorrow", "by next week", "by monday",
            "can you", "could you", "would you please",
            "let's schedule", "set up a meeting",
            "take care of", "handle this"
        ]
        
        for indicator in action_indicators:
            if indicator in text_lower:
                # Found potential action item
                action_item = ActionItem(
                    id=f"ai_{len(self._current_meeting.action_items)}",
                    text=self._extract_action_text(text, indicator),
                    assignee=self._infer_assignee(text, speaker),
                    due_date=self._extract_due_date(text),
                    priority=self._infer_priority(text),
                    source_text=text,
                    timestamp=datetime.now().isoformat()
                )
                
                self._current_meeting.action_items.append(action_item)
                logger.debug(f"Action item detected: {action_item.text}")
                break
    
    def _extract_action_text(self, text: str, indicator: str) -> str:
        """Extract the action item text"""
        # Find the indicator and take text after it
        idx = text.lower().find(indicator)
        if idx >= 0:
            return text[idx:].strip()[:200]
        return text[:200]
    
    def _infer_assignee(self, text: str, speaker: Optional[str]) -> Optional[str]:
        """Try to infer who is assigned"""
        text_lower = text.lower()
        
        # If "I will", assignee is the speaker
        if any(p in text_lower for p in ["i will", "i'll", "i'm going to"]):
            return speaker
        
        # Look for names or "you"
        if "you should" in text_lower or "can you" in text_lower:
            return "Other participant"
        
        return None
    
    def _extract_due_date(self, text: str) -> Optional[str]:
        """Extract due date from text"""
        text_lower = text.lower()
        
        if "tomorrow" in text_lower:
            return (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
        elif "next week" in text_lower:
            return (datetime.now() + timedelta(weeks=1)).strftime("%Y-%m-%d")
        elif "by friday" in text_lower:
            # Calculate next Friday
            days_ahead = 4 - datetime.now().weekday()
            if days_ahead <= 0:
                days_ahead += 7
            return (datetime.now() + timedelta(days=days_ahead)).strftime("%Y-%m-%d")
        
        return None
    
    def _infer_priority(self, text: str) -> str:
        """Infer priority from text"""
        text_lower = text.lower()
        
        high_priority_words = ["urgent", "asap", "immediately", "critical", "important"]
        if any(word in text_lower for word in high_priority_words):
            return "high"
        
        return "medium"
    
    async def _detect_key_points(self, text: str):
        """Detect key points and decisions"""
        text_lower = text.lower()
        
        # Decision indicators
        decision_indicators = [
            "we've decided", "let's go with", "the decision is",
            "we agreed", "the plan is", "conclusion"
        ]
        
        # Insight indicators
        insight_indicators = [
            "key insight", "important point", "note that",
            "keep in mind", "the takeaway"
        ]
        
        # Question indicators
        question_indicators = [
            "the question is", "we need to figure out",
            "unclear", "need clarification"
        ]
        
        category = None
        for indicator in decision_indicators:
            if indicator in text_lower:
                category = "decision"
                break
        
        if not category:
            for indicator in insight_indicators:
                if indicator in text_lower:
                    category = "insight"
                    break
        
        if not category:
            for indicator in question_indicators:
                if indicator in text_lower:
                    category = "question"
                    break
        
        if category:
            key_point = KeyPoint(
                id=f"kp_{len(self._current_meeting.key_points)}",
                text=text[:300],
                category=category,
                timestamp=datetime.now().isoformat()
            )
            self._current_meeting.key_points.append(key_point)
    
    def _should_generate_periodic_summary(self) -> bool:
        """Check if we should generate a periodic summary"""
        if not self._last_summary_time:
            return False
        
        # Generate every 5 minutes
        elapsed = datetime.now() - self._last_summary_time
        return elapsed > timedelta(minutes=5) and len(self._transcript_buffer) > 20
    
    async def _generate_periodic_summary(self):
        """Generate a periodic summary of recent content"""
        if not self._answer_generator or not self._transcript_buffer:
            return
        
        try:
            # Combine recent transcript
            recent_text = "\n".join([
                f"{entry['speaker']}: {entry['text']}"
                for entry in self._transcript_buffer[-50:]
            ])
            
            prompt = f"""Summarize the following meeting segment in 2-3 bullet points.
Focus on: decisions made, action items, and key discussion points.

Transcript:
{recent_text}

Summary:"""
            
            summary = await self._answer_generator.generate(
                prompt,
                context="",
                mode="meeting"
            )
            
            self._last_summary_time = datetime.now()
            self._transcript_buffer = []
            
            logger.debug("Generated periodic meeting summary")
            
        except Exception as e:
            logger.error(f"Failed to generate periodic summary: {e}")
    
    async def _generate_final_summary(self):
        """Generate final meeting summary"""
        if not self._answer_generator or not self._current_meeting:
            return
        
        try:
            # Combine full transcript (limit to recent 100 entries for token limit)
            transcript_text = "\n".join([
                f"{entry['speaker']}: {entry['text']}"
                for entry in self._current_meeting.transcript[-100:]
            ])
            
            # Format action items
            action_items_text = "\n".join([
                f"- {ai.text} (Assigned to: {ai.assignee or 'TBD'})"
                for ai in self._current_meeting.action_items
            ])
            
            prompt = f"""Generate a comprehensive meeting summary including:
1. Meeting Overview (2-3 sentences)
2. Key Decisions Made
3. Main Discussion Points
4. Action Items (verify and consolidate the detected items below)
5. Next Steps

Detected Action Items:
{action_items_text}

Meeting Transcript (most recent portion):
{transcript_text}

Summary:"""
            
            self._current_meeting.summary = await self._answer_generator.generate(
                prompt,
                context="",
                mode="meeting"
            )
            
            logger.info("Generated final meeting summary")
            
        except Exception as e:
            logger.error(f"Failed to generate final summary: {e}")
            self._current_meeting.summary = "Summary generation failed"
    
    async def get_live_stats(self) -> Dict[str, Any]:
        """Get live meeting statistics"""
        if not self._current_meeting:
            return {"state": "no_meeting"}
        
        meeting = self._current_meeting
        
        return {
            "state": meeting.state.value,
            "duration_seconds": self._calculate_duration(),
            "transcript_lines": len(meeting.transcript),
            "action_items_count": len(meeting.action_items),
            "key_points_count": len(meeting.key_points),
            "participants": list(meeting.speakers.keys()),
            "speaker_stats": {
                name: {
                    "word_count": speaker.word_count,
                    "interventions": speaker.interventions
                }
                for name, speaker in meeting.speakers.items()
            }
        }
    
    def _calculate_duration(self) -> int:
        """Calculate meeting duration in seconds"""
        if not self._current_meeting:
            return 0
        
        started = datetime.fromisoformat(self._current_meeting.started_at)
        ended = datetime.now()
        return int((ended - started).total_seconds())
    
    async def get_action_items(self) -> List[Dict[str, Any]]:
        """Get all action items from current meeting"""
        if not self._current_meeting:
            return []
        
        return [
            {
                "id": ai.id,
                "text": ai.text,
                "assignee": ai.assignee,
                "due_date": ai.due_date,
                "priority": ai.priority
            }
            for ai in self._current_meeting.action_items
        ]
    
    async def export_meeting(self) -> Optional[Dict[str, Any]]:
        """Export meeting data"""
        if not self._current_meeting:
            return None
        
        return {
            "id": self._current_meeting.id,
            "title": self._current_meeting.title,
            "started_at": self._current_meeting.started_at,
            "ended_at": self._current_meeting.ended_at,
            "duration_seconds": self._calculate_duration(),
            "summary": self._current_meeting.summary,
            "action_items": [
                {
                    "text": ai.text,
                    "assignee": ai.assignee,
                    "due_date": ai.due_date,
                    "priority": ai.priority
                }
                for ai in self._current_meeting.action_items
            ],
            "key_points": [
                {
                    "text": kp.text,
                    "category": kp.category
                }
                for kp in self._current_meeting.key_points
            ],
            "transcript": self._current_meeting.transcript,
            "speakers": {
                name: {
                    "word_count": speaker.word_count,
                    "interventions": speaker.interventions
                }
                for name, speaker in self._current_meeting.speakers.items()
            }
        }
    
    @property
    def current_meeting(self) -> Optional[MeetingSession]:
        return self._current_meeting
    
    @property
    def is_active(self) -> bool:
        return self._current_meeting is not None and self._current_meeting.state == MeetingState.ACTIVE

