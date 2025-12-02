"""
Wingman AI - Analytics Engine
Usage tracking, performance metrics, and insights
"""

import asyncio
from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta
from collections import defaultdict
from dataclasses import dataclass, field
import json
from loguru import logger


@dataclass
class UsageMetrics:
    """Usage statistics"""
    total_questions: int = 0
    total_answers: int = 0
    total_sessions: int = 0
    total_time_seconds: int = 0
    questions_by_source: Dict[str, int] = field(default_factory=dict)
    questions_by_mode: Dict[str, int] = field(default_factory=dict)
    ai_provider_usage: Dict[str, int] = field(default_factory=dict)


@dataclass
class PerformanceMetrics:
    """Performance statistics"""
    avg_answer_time_ms: float = 0
    avg_transcription_time_ms: float = 0
    avg_ocr_time_ms: float = 0
    cache_hit_rate: float = 0
    error_count: int = 0
    errors_by_type: Dict[str, int] = field(default_factory=dict)


class AnalyticsEngine:
    """
    Tracks usage patterns, performance metrics, and provides insights
    All data is stored locally for privacy
    """
    
    def __init__(self):
        self._usage = UsageMetrics()
        self._performance = PerformanceMetrics()
        self._daily_stats: Dict[str, Dict[str, Any]] = {}
        self._event_log: List[Dict[str, Any]] = []
        self._timing_samples: Dict[str, List[float]] = defaultdict(list)
        self._max_samples = 100  # Keep last N samples per metric
        self._session_manager = None
    
    def set_session_manager(self, manager):
        """Set reference to session manager"""
        self._session_manager = manager
    
    async def initialize(self):
        """Initialize analytics"""
        # Load historical data if available
        await self._load_historical_data()
        logger.info("Analytics engine initialized")
    
    async def _load_historical_data(self):
        """Load historical analytics from session manager"""
        if not self._session_manager:
            return
        
        try:
            # Load saved analytics
            saved_usage = await self._session_manager.get_setting("analytics_usage")
            if saved_usage:
                self._usage = UsageMetrics(**saved_usage)
            
            saved_daily = await self._session_manager.get_setting("analytics_daily")
            if saved_daily:
                self._daily_stats = saved_daily
                
        except Exception as e:
            logger.debug(f"Could not load historical analytics: {e}")
    
    async def _save_data(self):
        """Save analytics data"""
        if not self._session_manager:
            return
        
        try:
            await self._session_manager.save_setting("analytics_usage", {
                "total_questions": self._usage.total_questions,
                "total_answers": self._usage.total_answers,
                "total_sessions": self._usage.total_sessions,
                "total_time_seconds": self._usage.total_time_seconds,
                "questions_by_source": self._usage.questions_by_source,
                "questions_by_mode": self._usage.questions_by_mode,
                "ai_provider_usage": self._usage.ai_provider_usage
            })
            
            await self._session_manager.save_setting("analytics_daily", self._daily_stats)
        except Exception as e:
            logger.debug(f"Could not save analytics: {e}")
    
    # Event tracking
    
    def track_question(self, source: str, mode: str):
        """Track a question asked"""
        self._usage.total_questions += 1
        
        # By source
        self._usage.questions_by_source[source] = \
            self._usage.questions_by_source.get(source, 0) + 1
        
        # By mode
        self._usage.questions_by_mode[mode] = \
            self._usage.questions_by_mode.get(mode, 0) + 1
        
        # Daily stats
        today = datetime.now().strftime("%Y-%m-%d")
        self._ensure_daily_stats(today)
        self._daily_stats[today]["questions"] += 1
        
        self._log_event("question", {"source": source, "mode": mode})
    
    def track_answer(self, provider: str, time_ms: float):
        """Track an answer generated"""
        self._usage.total_answers += 1
        
        # AI provider usage
        self._usage.ai_provider_usage[provider] = \
            self._usage.ai_provider_usage.get(provider, 0) + 1
        
        # Timing
        self._add_timing_sample("answer_time", time_ms)
        
        # Daily stats
        today = datetime.now().strftime("%Y-%m-%d")
        self._ensure_daily_stats(today)
        self._daily_stats[today]["answers"] += 1
        
        self._log_event("answer", {"provider": provider, "time_ms": time_ms})
    
    def track_session_start(self, mode: str):
        """Track session start"""
        self._usage.total_sessions += 1
        
        today = datetime.now().strftime("%Y-%m-%d")
        self._ensure_daily_stats(today)
        self._daily_stats[today]["sessions"] += 1
        
        self._log_event("session_start", {"mode": mode})
    
    def track_session_end(self, duration_seconds: int):
        """Track session end"""
        self._usage.total_time_seconds += duration_seconds
        
        today = datetime.now().strftime("%Y-%m-%d")
        self._ensure_daily_stats(today)
        self._daily_stats[today]["time_seconds"] += duration_seconds
        
        self._log_event("session_end", {"duration_seconds": duration_seconds})
    
    def track_transcription(self, time_ms: float):
        """Track transcription timing"""
        self._add_timing_sample("transcription_time", time_ms)
    
    def track_ocr(self, time_ms: float):
        """Track OCR timing"""
        self._add_timing_sample("ocr_time", time_ms)
    
    def track_cache_hit(self, hit: bool):
        """Track cache hit/miss"""
        self._add_timing_sample("cache_hit", 1.0 if hit else 0.0)
    
    def track_error(self, error_type: str, error_message: str):
        """Track an error"""
        self._performance.error_count += 1
        self._performance.errors_by_type[error_type] = \
            self._performance.errors_by_type.get(error_type, 0) + 1
        
        self._log_event("error", {"type": error_type, "message": error_message[:200]})
    
    # Helper methods
    
    def _ensure_daily_stats(self, date: str):
        """Ensure daily stats entry exists"""
        if date not in self._daily_stats:
            self._daily_stats[date] = {
                "questions": 0,
                "answers": 0,
                "sessions": 0,
                "time_seconds": 0
            }
    
    def _add_timing_sample(self, metric: str, value: float):
        """Add a timing sample"""
        samples = self._timing_samples[metric]
        samples.append(value)
        
        # Trim to max samples
        if len(samples) > self._max_samples:
            self._timing_samples[metric] = samples[-self._max_samples:]
    
    def _log_event(self, event_type: str, data: Dict[str, Any]):
        """Log an event"""
        self._event_log.append({
            "type": event_type,
            "timestamp": datetime.now().isoformat(),
            "data": data
        })
        
        # Trim event log
        if len(self._event_log) > 1000:
            self._event_log = self._event_log[-500:]
    
    # Reporting methods
    
    def get_usage_stats(self) -> Dict[str, Any]:
        """Get usage statistics"""
        return {
            "total_questions": self._usage.total_questions,
            "total_answers": self._usage.total_answers,
            "total_sessions": self._usage.total_sessions,
            "total_time_hours": round(self._usage.total_time_seconds / 3600, 1),
            "questions_by_source": self._usage.questions_by_source,
            "questions_by_mode": self._usage.questions_by_mode,
            "ai_provider_usage": self._usage.ai_provider_usage,
            "avg_questions_per_session": round(
                self._usage.total_questions / max(self._usage.total_sessions, 1), 1
            )
        }
    
    def get_performance_stats(self) -> Dict[str, Any]:
        """Get performance statistics"""
        def avg_samples(metric: str) -> float:
            samples = self._timing_samples.get(metric, [])
            return round(sum(samples) / len(samples), 2) if samples else 0
        
        return {
            "avg_answer_time_ms": avg_samples("answer_time"),
            "avg_transcription_time_ms": avg_samples("transcription_time"),
            "avg_ocr_time_ms": avg_samples("ocr_time"),
            "cache_hit_rate": round(avg_samples("cache_hit") * 100, 1),
            "error_count": self._performance.error_count,
            "errors_by_type": self._performance.errors_by_type
        }
    
    def get_daily_stats(self, days: int = 7) -> List[Dict[str, Any]]:
        """Get daily statistics for the last N days"""
        result = []
        
        for i in range(days):
            date = (datetime.now() - timedelta(days=i)).strftime("%Y-%m-%d")
            stats = self._daily_stats.get(date, {
                "questions": 0,
                "answers": 0,
                "sessions": 0,
                "time_seconds": 0
            })
            
            result.append({
                "date": date,
                **stats,
                "time_minutes": round(stats.get("time_seconds", 0) / 60, 1)
            })
        
        return result
    
    def get_insights(self) -> List[Dict[str, str]]:
        """Generate insights from analytics"""
        insights = []
        
        # Most used mode
        if self._usage.questions_by_mode:
            top_mode = max(self._usage.questions_by_mode.items(), key=lambda x: x[1])
            insights.append({
                "type": "usage",
                "title": "Most Used Mode",
                "message": f"You use {top_mode[0]} mode the most ({top_mode[1]} questions)"
            })
        
        # Most used AI provider
        if self._usage.ai_provider_usage:
            top_provider = max(self._usage.ai_provider_usage.items(), key=lambda x: x[1])
            insights.append({
                "type": "usage",
                "title": "Preferred AI Provider",
                "message": f"Your go-to AI is {top_provider[0]} ({top_provider[1]} answers)"
            })
        
        # Average session length
        if self._usage.total_sessions > 0:
            avg_session = self._usage.total_time_seconds / self._usage.total_sessions / 60
            insights.append({
                "type": "usage",
                "title": "Average Session",
                "message": f"Your average session is {round(avg_session, 1)} minutes"
            })
        
        # Performance insight
        avg_answer = self._timing_samples.get("answer_time", [])
        if avg_answer:
            avg_ms = sum(avg_answer) / len(avg_answer)
            if avg_ms < 2000:
                insights.append({
                    "type": "performance",
                    "title": "Fast Responses",
                    "message": f"Average answer time is {round(avg_ms)}ms - great performance!"
                })
            elif avg_ms > 5000:
                insights.append({
                    "type": "performance",
                    "title": "Response Time",
                    "message": f"Average answer time is {round(avg_ms/1000, 1)}s. Consider using Groq for faster responses."
                })
        
        # Streak insight
        streak = self._calculate_streak()
        if streak > 1:
            insights.append({
                "type": "engagement",
                "title": "Current Streak",
                "message": f"You've been using Wingman for {streak} days in a row! 🔥"
            })
        
        return insights
    
    def _calculate_streak(self) -> int:
        """Calculate current usage streak"""
        streak = 0
        current_date = datetime.now()
        
        for i in range(30):  # Check last 30 days
            date = (current_date - timedelta(days=i)).strftime("%Y-%m-%d")
            if date in self._daily_stats and self._daily_stats[date]["sessions"] > 0:
                streak += 1
            else:
                break
        
        return streak
    
    def get_recent_events(self, limit: int = 50) -> List[Dict[str, Any]]:
        """Get recent events"""
        return list(reversed(self._event_log[-limit:]))
    
    async def export_analytics(self) -> Dict[str, Any]:
        """Export all analytics data"""
        return {
            "exported_at": datetime.now().isoformat(),
            "usage": self.get_usage_stats(),
            "performance": self.get_performance_stats(),
            "daily_stats": self.get_daily_stats(30),
            "insights": self.get_insights()
        }
    
    def reset(self):
        """Reset all analytics (dangerous!)"""
        self._usage = UsageMetrics()
        self._performance = PerformanceMetrics()
        self._daily_stats = {}
        self._event_log = []
        self._timing_samples = defaultdict(list)
        logger.warning("Analytics reset")
    
    async def shutdown(self):
        """Save analytics and shutdown"""
        await self._save_data()
        logger.info("Analytics engine shutdown")

