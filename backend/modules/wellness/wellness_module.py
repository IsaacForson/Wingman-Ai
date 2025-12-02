"""
Wingman AI - Wellness Module
Break reminders, focus tracking, and digital wellness
"""

import asyncio
from typing import Optional, Dict, Any, Callable, List
from datetime import datetime, timedelta
from dataclasses import dataclass
from enum import Enum
from loguru import logger


class BreakType(str, Enum):
    MICRO = "micro"      # 20 seconds, every 20 minutes
    SHORT = "short"      # 5 minutes, every 50 minutes
    LONG = "long"        # 15-30 minutes, every 2 hours


@dataclass
class BreakReminder:
    """A break reminder"""
    type: BreakType
    scheduled_at: datetime
    message: str
    completed: bool = False


@dataclass
class FocusSession:
    """A focus/work session"""
    started_at: datetime
    ended_at: Optional[datetime]
    duration_seconds: int = 0
    breaks_taken: int = 0
    productivity_score: int = 0  # 1-100


class WellnessModule:
    """
    Digital wellness and productivity features
    - Break reminders (20-20-20 rule, Pomodoro-style)
    - Focus tracking
    - Usage insights
    - Screen time awareness
    """
    
    def __init__(self):
        self._is_monitoring = False
        self._monitor_task: Optional[asyncio.Task] = None
        
        # Break settings
        self._micro_break_interval = 20 * 60  # 20 minutes
        self._short_break_interval = 50 * 60  # 50 minutes
        self._long_break_interval = 2 * 60 * 60  # 2 hours
        
        self._micro_break_duration = 20  # seconds
        self._short_break_duration = 5 * 60  # 5 minutes
        self._long_break_duration = 15 * 60  # 15 minutes
        
        # State
        self._session_start: Optional[datetime] = None
        self._last_micro_break: Optional[datetime] = None
        self._last_short_break: Optional[datetime] = None
        self._last_long_break: Optional[datetime] = None
        
        self._breaks_today: List[BreakReminder] = []
        self._focus_sessions: List[FocusSession] = []
        self._current_focus_session: Optional[FocusSession] = None
        
        # Callbacks
        self._break_callback: Optional[Callable] = None
        self._enabled = False
        
        # Break messages
        self._micro_break_messages = [
            "👀 Time for a 20-second eye break! Look at something 20 feet away.",
            "🌟 Give your eyes a rest! Focus on a distant object for 20 seconds.",
            "✨ Quick eye break! Look away from the screen for 20 seconds.",
        ]
        
        self._short_break_messages = [
            "☕ Time for a 5-minute break! Stretch, walk around, or grab water.",
            "🚶 Stand up and stretch! A short walk does wonders.",
            "💧 Hydration check! Get some water and move around.",
        ]
        
        self._long_break_messages = [
            "🌳 You've been working hard! Take 15 minutes to recharge.",
            "🧘 Time for a longer break. Step away and relax your mind.",
            "🍎 Great focus session! Take a proper break - you've earned it.",
        ]
    
    async def initialize(self):
        """Initialize wellness module"""
        self._session_start = datetime.now()
        logger.info("Wellness module initialized")
    
    async def enable(self):
        """Enable wellness monitoring"""
        if self._is_monitoring:
            return
        
        self._enabled = True
        self._is_monitoring = True
        self._session_start = datetime.now()
        self._last_micro_break = datetime.now()
        self._last_short_break = datetime.now()
        self._last_long_break = datetime.now()
        
        self._monitor_task = asyncio.create_task(self._monitor_loop())
        logger.info("Wellness monitoring enabled")
    
    async def disable(self):
        """Disable wellness monitoring"""
        self._enabled = False
        self._is_monitoring = False
        
        if self._monitor_task:
            self._monitor_task.cancel()
            try:
                await self._monitor_task
            except asyncio.CancelledError:
                pass
        
        logger.info("Wellness monitoring disabled")
    
    def on_break_reminder(self, callback: Callable):
        """Set callback for break reminders"""
        self._break_callback = callback
    
    async def _monitor_loop(self):
        """Main monitoring loop"""
        try:
            while self._is_monitoring:
                await self._check_breaks()
                await asyncio.sleep(60)  # Check every minute
                
        except asyncio.CancelledError:
            logger.debug("Wellness monitoring cancelled")
    
    async def _check_breaks(self):
        """Check if breaks are due"""
        now = datetime.now()
        
        # Check micro break (20-20-20 rule)
        if self._last_micro_break:
            elapsed = (now - self._last_micro_break).total_seconds()
            if elapsed >= self._micro_break_interval:
                await self._trigger_break(BreakType.MICRO)
                self._last_micro_break = now
        
        # Check short break
        if self._last_short_break:
            elapsed = (now - self._last_short_break).total_seconds()
            if elapsed >= self._short_break_interval:
                await self._trigger_break(BreakType.SHORT)
                self._last_short_break = now
        
        # Check long break
        if self._last_long_break:
            elapsed = (now - self._last_long_break).total_seconds()
            if elapsed >= self._long_break_interval:
                await self._trigger_break(BreakType.LONG)
                self._last_long_break = now
    
    async def _trigger_break(self, break_type: BreakType):
        """Trigger a break reminder"""
        import random
        
        if break_type == BreakType.MICRO:
            message = random.choice(self._micro_break_messages)
        elif break_type == BreakType.SHORT:
            message = random.choice(self._short_break_messages)
        else:
            message = random.choice(self._long_break_messages)
        
        reminder = BreakReminder(
            type=break_type,
            scheduled_at=datetime.now(),
            message=message
        )
        
        self._breaks_today.append(reminder)
        
        logger.info(f"Break reminder: {break_type.value} - {message}")
        
        # Notify via callback
        if self._break_callback:
            try:
                if asyncio.iscoroutinefunction(self._break_callback):
                    await self._break_callback(reminder)
                else:
                    self._break_callback(reminder)
            except Exception as e:
                logger.error(f"Break callback error: {e}")
    
    def mark_break_taken(self, break_type: BreakType):
        """Mark that a break was taken"""
        now = datetime.now()
        
        if break_type == BreakType.MICRO:
            self._last_micro_break = now
        elif break_type == BreakType.SHORT:
            self._last_short_break = now
        else:
            self._last_long_break = now
        
        # Update current focus session
        if self._current_focus_session:
            self._current_focus_session.breaks_taken += 1
        
        logger.debug(f"Break taken: {break_type.value}")
    
    def snooze_break(self, minutes: int = 5):
        """Snooze current break reminder"""
        now = datetime.now()
        snooze_time = timedelta(minutes=minutes)
        
        # Adjust all break timers
        self._last_micro_break = now - timedelta(seconds=self._micro_break_interval) + snooze_time
        self._last_short_break = now - timedelta(seconds=self._short_break_interval) + snooze_time
        
        logger.debug(f"Break snoozed for {minutes} minutes")
    
    # Focus session tracking
    
    def start_focus_session(self):
        """Start a focus session"""
        if self._current_focus_session:
            self.end_focus_session()
        
        self._current_focus_session = FocusSession(
            started_at=datetime.now(),
            ended_at=None
        )
        
        logger.info("Focus session started")
    
    def end_focus_session(self) -> Optional[FocusSession]:
        """End current focus session"""
        if not self._current_focus_session:
            return None
        
        session = self._current_focus_session
        session.ended_at = datetime.now()
        session.duration_seconds = int(
            (session.ended_at - session.started_at).total_seconds()
        )
        
        # Calculate productivity score
        session.productivity_score = self._calculate_productivity_score(session)
        
        self._focus_sessions.append(session)
        self._current_focus_session = None
        
        logger.info(f"Focus session ended: {session.duration_seconds}s, score: {session.productivity_score}")
        return session
    
    def _calculate_productivity_score(self, session: FocusSession) -> int:
        """Calculate productivity score for a session"""
        score = 50  # Base score
        
        # Duration bonus (max +30 for 2+ hour sessions)
        duration_minutes = session.duration_seconds / 60
        duration_bonus = min(30, duration_minutes / 4)
        score += duration_bonus
        
        # Break bonus (taking breaks is good!)
        expected_breaks = session.duration_seconds / self._short_break_interval
        if expected_breaks > 0:
            break_ratio = session.breaks_taken / expected_breaks
            if 0.5 <= break_ratio <= 1.5:
                score += 20  # Good break habits
            elif break_ratio < 0.5:
                score -= 10  # Not enough breaks
        
        return max(0, min(100, int(score)))
    
    # Statistics
    
    def get_today_stats(self) -> Dict[str, Any]:
        """Get today's wellness statistics"""
        today = datetime.now().date()
        
        # Filter today's data
        today_breaks = [
            b for b in self._breaks_today
            if b.scheduled_at.date() == today
        ]
        
        today_sessions = [
            s for s in self._focus_sessions
            if s.started_at.date() == today
        ]
        
        # Calculate total focus time
        total_focus = sum(s.duration_seconds for s in today_sessions)
        
        # Calculate average productivity
        avg_productivity = 0
        if today_sessions:
            avg_productivity = sum(s.productivity_score for s in today_sessions) / len(today_sessions)
        
        return {
            "date": today.isoformat(),
            "breaks_triggered": len(today_breaks),
            "breaks_completed": sum(1 for b in today_breaks if b.completed),
            "focus_sessions": len(today_sessions),
            "total_focus_minutes": round(total_focus / 60, 1),
            "avg_productivity_score": round(avg_productivity, 1),
            "current_session_active": self._current_focus_session is not None
        }
    
    def get_current_status(self) -> Dict[str, Any]:
        """Get current wellness status"""
        now = datetime.now()
        
        status = {
            "enabled": self._enabled,
            "time_since_session_start": 0,
            "next_micro_break_in": 0,
            "next_short_break_in": 0,
            "current_focus_session": None
        }
        
        if self._session_start:
            status["time_since_session_start"] = int(
                (now - self._session_start).total_seconds()
            )
        
        if self._last_micro_break:
            elapsed = (now - self._last_micro_break).total_seconds()
            status["next_micro_break_in"] = max(0, int(self._micro_break_interval - elapsed))
        
        if self._last_short_break:
            elapsed = (now - self._last_short_break).total_seconds()
            status["next_short_break_in"] = max(0, int(self._short_break_interval - elapsed))
        
        if self._current_focus_session:
            status["current_focus_session"] = {
                "started_at": self._current_focus_session.started_at.isoformat(),
                "duration_seconds": int((now - self._current_focus_session.started_at).total_seconds()),
                "breaks_taken": self._current_focus_session.breaks_taken
            }
        
        return status
    
    def configure(
        self,
        micro_interval_minutes: int = 20,
        short_interval_minutes: int = 50,
        long_interval_minutes: int = 120
    ):
        """Configure break intervals"""
        self._micro_break_interval = micro_interval_minutes * 60
        self._short_break_interval = short_interval_minutes * 60
        self._long_break_interval = long_interval_minutes * 60
        
        logger.info(f"Wellness configured: micro={micro_interval_minutes}m, short={short_interval_minutes}m, long={long_interval_minutes}m")
    
    async def shutdown(self):
        """Shutdown wellness module"""
        await self.disable()
        
        if self._current_focus_session:
            self.end_focus_session()
        
        logger.info("Wellness module shutdown")

