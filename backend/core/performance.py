"""
Wingman AI - Performance Monitor
Track and report application performance metrics
"""

import time
import asyncio
import psutil
import statistics
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional, Callable
from dataclasses import dataclass, field
from collections import deque
from loguru import logger


@dataclass
class TimingMetric:
    """A single timing measurement"""
    name: str
    duration_ms: float
    timestamp: datetime = field(default_factory=datetime.now)


@dataclass
class PerformanceSnapshot:
    """Snapshot of system performance"""
    timestamp: datetime
    cpu_percent: float
    memory_mb: float
    memory_percent: float
    
    # App-specific metrics
    active_connections: int = 0
    pending_tasks: int = 0
    
    # Timing averages
    avg_transcription_ms: float = 0
    avg_ai_response_ms: float = 0
    avg_ocr_ms: float = 0


class PerformanceMonitor:
    """
    Monitors and tracks application performance
    Provides metrics for optimization and debugging
    """
    
    def __init__(self, history_size: int = 1000):
        self._history_size = history_size
        self._process = psutil.Process()
        
        # Timing metrics by category
        self._timings: Dict[str, deque[TimingMetric]] = {
            'transcription': deque(maxlen=history_size),
            'ai_response': deque(maxlen=history_size),
            'ocr': deque(maxlen=history_size),
            'websocket': deque(maxlen=history_size),
            'question_detection': deque(maxlen=history_size),
            'screen_capture': deque(maxlen=history_size)
        }
        
        # Performance snapshots
        self._snapshots: deque[PerformanceSnapshot] = deque(maxlen=history_size)
        
        # Active timers
        self._active_timers: Dict[str, float] = {}
        
        # Counters
        self._counters: Dict[str, int] = {
            'questions_asked': 0,
            'answers_generated': 0,
            'errors': 0,
            'cache_hits': 0,
            'cache_misses': 0
        }
        
        # Alerts
        self._alert_thresholds = {
            'cpu_percent': 80,
            'memory_percent': 80,
            'response_time_ms': 5000
        }
        self._alert_callbacks: List[Callable] = []
        
        # Start background monitoring
        self._monitoring = False
        self._monitor_task: Optional[asyncio.Task] = None
    
    async def start(self, interval_seconds: float = 5.0):
        """Start background performance monitoring"""
        if self._monitoring:
            return
        
        self._monitoring = True
        self._monitor_task = asyncio.create_task(
            self._monitoring_loop(interval_seconds)
        )
        logger.info("Performance monitoring started")
    
    async def stop(self):
        """Stop background monitoring"""
        self._monitoring = False
        if self._monitor_task:
            self._monitor_task.cancel()
            try:
                await self._monitor_task
            except asyncio.CancelledError:
                pass
        logger.info("Performance monitoring stopped")
    
    async def _monitoring_loop(self, interval: float):
        """Background monitoring loop"""
        while self._monitoring:
            try:
                snapshot = await self._take_snapshot()
                self._snapshots.append(snapshot)
                await self._check_alerts(snapshot)
                await asyncio.sleep(interval)
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Monitoring error: {e}")
                await asyncio.sleep(interval)
    
    async def _take_snapshot(self) -> PerformanceSnapshot:
        """Take a performance snapshot"""
        return PerformanceSnapshot(
            timestamp=datetime.now(),
            cpu_percent=self._process.cpu_percent(),
            memory_mb=self._process.memory_info().rss / (1024 * 1024),
            memory_percent=self._process.memory_percent(),
            avg_transcription_ms=self._get_avg_timing('transcription'),
            avg_ai_response_ms=self._get_avg_timing('ai_response'),
            avg_ocr_ms=self._get_avg_timing('ocr')
        )
    
    async def _check_alerts(self, snapshot: PerformanceSnapshot):
        """Check for performance alerts"""
        alerts = []
        
        if snapshot.cpu_percent > self._alert_thresholds['cpu_percent']:
            alerts.append(f"High CPU usage: {snapshot.cpu_percent:.1f}%")
        
        if snapshot.memory_percent > self._alert_thresholds['memory_percent']:
            alerts.append(f"High memory usage: {snapshot.memory_percent:.1f}%")
        
        if snapshot.avg_ai_response_ms > self._alert_thresholds['response_time_ms']:
            alerts.append(f"Slow AI responses: {snapshot.avg_ai_response_ms:.0f}ms avg")
        
        for alert in alerts:
            logger.warning(f"Performance alert: {alert}")
            for callback in self._alert_callbacks:
                try:
                    callback(alert)
                except Exception as e:
                    logger.error(f"Alert callback error: {e}")
    
    def start_timer(self, name: str) -> str:
        """Start a timer and return timer ID"""
        timer_id = f"{name}_{time.time()}"
        self._active_timers[timer_id] = time.perf_counter()
        return timer_id
    
    def stop_timer(self, timer_id: str, category: str = None):
        """Stop a timer and record the metric"""
        if timer_id not in self._active_timers:
            return
        
        start_time = self._active_timers.pop(timer_id)
        duration_ms = (time.perf_counter() - start_time) * 1000
        
        # Extract category from timer_id if not provided
        if not category:
            category = timer_id.split('_')[0]
        
        if category in self._timings:
            self._timings[category].append(TimingMetric(
                name=category,
                duration_ms=duration_ms
            ))
    
    def record_timing(self, category: str, duration_ms: float):
        """Directly record a timing metric"""
        if category not in self._timings:
            self._timings[category] = deque(maxlen=self._history_size)
        
        self._timings[category].append(TimingMetric(
            name=category,
            duration_ms=duration_ms
        ))
    
    def increment_counter(self, name: str, amount: int = 1):
        """Increment a counter"""
        if name not in self._counters:
            self._counters[name] = 0
        self._counters[name] += amount
    
    def _get_avg_timing(self, category: str, window_minutes: int = 5) -> float:
        """Get average timing for a category within time window"""
        if category not in self._timings or not self._timings[category]:
            return 0
        
        cutoff = datetime.now() - timedelta(minutes=window_minutes)
        recent = [t.duration_ms for t in self._timings[category] 
                  if t.timestamp > cutoff]
        
        return statistics.mean(recent) if recent else 0
    
    def get_current_stats(self) -> Dict[str, Any]:
        """Get current performance statistics"""
        try:
            cpu = self._process.cpu_percent()
            mem = self._process.memory_info()
        except Exception:
            cpu = 0
            mem = type('obj', (object,), {'rss': 0})()
        
        return {
            'timestamp': datetime.now().isoformat(),
            'system': {
                'cpu_percent': cpu,
                'memory_mb': mem.rss / (1024 * 1024),
                'memory_percent': self._process.memory_percent() if hasattr(self._process, 'memory_percent') else 0
            },
            'timings': {
                category: {
                    'avg_ms': self._get_avg_timing(category),
                    'count': len(timings),
                    'last_ms': timings[-1].duration_ms if timings else 0
                }
                for category, timings in self._timings.items()
            },
            'counters': self._counters.copy()
        }
    
    def get_timing_stats(self, category: str) -> Dict[str, Any]:
        """Get detailed statistics for a timing category"""
        if category not in self._timings or not self._timings[category]:
            return {'count': 0}
        
        durations = [t.duration_ms for t in self._timings[category]]
        
        return {
            'count': len(durations),
            'avg_ms': statistics.mean(durations),
            'min_ms': min(durations),
            'max_ms': max(durations),
            'median_ms': statistics.median(durations),
            'p95_ms': self._percentile(durations, 95),
            'p99_ms': self._percentile(durations, 99)
        }
    
    def _percentile(self, data: List[float], percentile: int) -> float:
        """Calculate percentile of data"""
        if not data:
            return 0
        sorted_data = sorted(data)
        index = int(len(sorted_data) * percentile / 100)
        return sorted_data[min(index, len(sorted_data) - 1)]
    
    def get_performance_report(self) -> Dict[str, Any]:
        """Generate comprehensive performance report"""
        return {
            'generated_at': datetime.now().isoformat(),
            'current': self.get_current_stats(),
            'timing_details': {
                category: self.get_timing_stats(category)
                for category in self._timings
            },
            'snapshots_count': len(self._snapshots),
            'alerts_threshold': self._alert_thresholds
        }
    
    def get_health_status(self) -> Dict[str, Any]:
        """Get simplified health status"""
        stats = self.get_current_stats()
        
        status = 'healthy'
        issues = []
        
        if stats['system']['cpu_percent'] > 70:
            status = 'degraded'
            issues.append('High CPU usage')
        
        if stats['system']['memory_mb'] > 400:
            status = 'degraded'
            issues.append('High memory usage')
        
        avg_response = stats['timings'].get('ai_response', {}).get('avg_ms', 0)
        if avg_response > 3000:
            status = 'degraded'
            issues.append('Slow AI responses')
        
        return {
            'status': status,
            'issues': issues,
            'cpu_percent': stats['system']['cpu_percent'],
            'memory_mb': stats['system']['memory_mb'],
            'avg_response_ms': avg_response
        }
    
    def add_alert_callback(self, callback: Callable):
        """Add callback for performance alerts"""
        self._alert_callbacks.append(callback)
    
    def set_alert_threshold(self, metric: str, value: float):
        """Set alert threshold for a metric"""
        self._alert_thresholds[metric] = value
    
    def reset_counters(self):
        """Reset all counters"""
        for key in self._counters:
            self._counters[key] = 0
    
    def clear_history(self):
        """Clear all timing history"""
        for timings in self._timings.values():
            timings.clear()
        self._snapshots.clear()


# Context manager for timing
class Timer:
    """Context manager for timing code blocks"""
    
    def __init__(self, monitor: PerformanceMonitor, category: str):
        self._monitor = monitor
        self._category = category
        self._start = 0
    
    def __enter__(self):
        self._start = time.perf_counter()
        return self
    
    def __exit__(self, *args):
        duration_ms = (time.perf_counter() - self._start) * 1000
        self._monitor.record_timing(self._category, duration_ms)


# Global instance
_performance_monitor: Optional[PerformanceMonitor] = None


def get_performance_monitor() -> PerformanceMonitor:
    """Get or create global performance monitor"""
    global _performance_monitor
    if _performance_monitor is None:
        _performance_monitor = PerformanceMonitor()
    return _performance_monitor

