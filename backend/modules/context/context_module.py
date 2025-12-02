"""
Wingman AI - Context Module
Active application detection and mode switching
"""

import asyncio
import sys
from typing import Optional, Dict, Any
from loguru import logger

from core.event_bus import event_bus, EventType


class ContextModule:
    """
    Monitors active application and system context
    Enables auto mode switching based on context
    """
    
    def __init__(self):
        self._current_app: Optional[str] = None
        self._current_window: Optional[str] = None
        self._is_monitoring = False
        self._monitor_task: Optional[asyncio.Task] = None
        
        # App-to-mode mappings
        self._app_mode_map = {
            # Meeting apps
            "zoom": "meeting",
            "zoom.us": "meeting",
            "microsoft teams": "meeting",
            "slack": "meeting",
            "google meet": "meeting",
            "webex": "meeting",
            "discord": "meeting",
            
            # Code editors / IDEs
            "code": "work",
            "visual studio code": "work",
            "cursor": "work",
            "pycharm": "work",
            "intellij": "work",
            "xcode": "work",
            "android studio": "work",
            "sublime text": "work",
            "atom": "work",
            "vim": "work",
            "neovim": "work",
            "terminal": "work",
            "iterm": "work",
            
            # Browsers (could be anything - check window title)
            "chrome": None,  # Check title
            "google chrome": None,
            "firefox": None,
            "safari": None,
            "arc": None,
            "brave": None,
            "edge": None,
            
            # Study/Documentation
            "notion": "study",
            "obsidian": "study",
            "anki": "study",
            "kindle": "study",
            "books": "study",
            "preview": "study",
            
            # Research
            "papers": "research",
            "zotero": "research",
            "mendeley": "research"
        }
        
        # Window title keywords for browsers
        self._browser_title_keywords = {
            "study": ["coursera", "udemy", "khan academy", "youtube - ", "lecture", "tutorial", "learn"],
            "interview": ["hackerrank", "leetcode", "codesignal", "pramp", "interviewing.io"],
            "meeting": ["zoom", "teams", "meet.google", "webex"],
            "work": ["github", "gitlab", "bitbucket", "jira", "confluence", "stackoverflow"]
        }
    
    async def initialize(self):
        """Initialize context module"""
        logger.info("Context module initialized")
    
    async def start_monitoring(self, interval: float = 2.0):
        """Start monitoring active app"""
        if self._is_monitoring:
            return
        
        self._is_monitoring = True
        self._monitor_task = asyncio.create_task(self._monitoring_loop(interval))
        logger.info("Context monitoring started")
    
    async def stop_monitoring(self):
        """Stop monitoring"""
        self._is_monitoring = False
        if self._monitor_task:
            self._monitor_task.cancel()
            try:
                await self._monitor_task
            except asyncio.CancelledError:
                pass
        logger.info("Context monitoring stopped")
    
    async def _monitoring_loop(self, interval: float):
        """Main monitoring loop"""
        try:
            while self._is_monitoring:
                app_info = await self.get_active_app()
                
                if app_info and app_info.get("app_name") != self._current_app:
                    old_app = self._current_app
                    self._current_app = app_info.get("app_name")
                    self._current_window = app_info.get("window_title")
                    
                    await event_bus.emit(EventType.CONTEXT_APP_CHANGED, {
                        "old_app": old_app,
                        "new_app": self._current_app,
                        "window_title": self._current_window,
                        "suggested_mode": self.suggest_mode(
                            self._current_app,
                            self._current_window
                        )
                    }, "context_module")
                
                await asyncio.sleep(interval)
                
        except asyncio.CancelledError:
            logger.debug("Context monitoring cancelled")
        except Exception as e:
            logger.error(f"Context monitoring error: {e}")
    
    async def get_active_app(self) -> Optional[Dict[str, Any]]:
        """Get currently active application"""
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, self._get_active_app_sync)
    
    def _get_active_app_sync(self) -> Optional[Dict[str, Any]]:
        """Synchronous active app detection"""
        try:
            if sys.platform == "darwin":
                return self._get_active_app_macos()
            elif sys.platform == "win32":
                return self._get_active_app_windows()
            else:
                return self._get_active_app_linux()
        except Exception as e:
            logger.debug(f"Failed to get active app: {e}")
            return None
    
    def _get_active_app_macos(self) -> Optional[Dict[str, Any]]:
        """Get active app on macOS"""
        try:
            from AppKit import NSWorkspace
            
            workspace = NSWorkspace.sharedWorkspace()
            active_app = workspace.activeApplication()
            
            if active_app:
                return {
                    "app_name": active_app.get('NSApplicationName', '').lower(),
                    "bundle_id": active_app.get('NSApplicationBundleIdentifier', ''),
                    "window_title": self._get_window_title_macos()
                }
        except Exception as e:
            logger.debug(f"macOS app detection failed: {e}")
        return None
    
    def _get_window_title_macos(self) -> str:
        """Get active window title on macOS"""
        try:
            from Quartz import (
                CGWindowListCopyWindowInfo,
                kCGWindowListOptionOnScreenOnly,
                kCGNullWindowID,
                kCGWindowListExcludeDesktopElements
            )
            
            windows = CGWindowListCopyWindowInfo(
                kCGWindowListOptionOnScreenOnly | kCGWindowListExcludeDesktopElements,
                kCGNullWindowID
            )
            
            for window in windows:
                # Get the frontmost window with a title
                if window.get('kCGWindowLayer', 0) == 0:
                    title = window.get('kCGWindowName', '')
                    if title:
                        return title
        except Exception:
            pass
        return ""
    
    def _get_active_app_windows(self) -> Optional[Dict[str, Any]]:
        """Get active app on Windows"""
        try:
            import win32gui
            import win32process
            import psutil
            
            hwnd = win32gui.GetForegroundWindow()
            _, pid = win32process.GetWindowThreadProcessId(hwnd)
            
            try:
                process = psutil.Process(pid)
                app_name = process.name().lower().replace('.exe', '')
            except Exception:
                app_name = "unknown"
            
            window_title = win32gui.GetWindowText(hwnd)
            
            return {
                "app_name": app_name,
                "bundle_id": "",
                "window_title": window_title
            }
        except Exception as e:
            logger.debug(f"Windows app detection failed: {e}")
        return None
    
    def _get_active_app_linux(self) -> Optional[Dict[str, Any]]:
        """Get active app on Linux"""
        try:
            import subprocess
            
            # Try using xdotool
            result = subprocess.run(
                ['xdotool', 'getactivewindow', 'getwindowname'],
                capture_output=True,
                text=True
            )
            
            if result.returncode == 0:
                window_title = result.stdout.strip()
                
                # Try to get app name
                result2 = subprocess.run(
                    ['xdotool', 'getactivewindow', 'getwindowpid'],
                    capture_output=True,
                    text=True
                )
                
                app_name = "unknown"
                if result2.returncode == 0:
                    pid = result2.stdout.strip()
                    try:
                        import psutil
                        process = psutil.Process(int(pid))
                        app_name = process.name().lower()
                    except Exception:
                        pass
                
                return {
                    "app_name": app_name,
                    "bundle_id": "",
                    "window_title": window_title
                }
        except Exception as e:
            logger.debug(f"Linux app detection failed: {e}")
        return None
    
    def suggest_mode(self, app_name: Optional[str], window_title: Optional[str]) -> Optional[str]:
        """
        Suggest an operating mode based on context
        
        Args:
            app_name: Active application name
            window_title: Active window title
            
        Returns:
            Suggested mode or None
        """
        if not app_name:
            return None
        
        app_name_lower = app_name.lower()
        
        # Check direct app mapping
        if app_name_lower in self._app_mode_map:
            mode = self._app_mode_map[app_name_lower]
            if mode:
                return mode
            
            # For browsers, check window title
            if window_title:
                window_lower = window_title.lower()
                for mode, keywords in self._browser_title_keywords.items():
                    if any(kw in window_lower for kw in keywords):
                        return mode
        
        return None
    
    @property
    def current_app(self) -> Optional[str]:
        """Get current active app name"""
        return self._current_app
    
    @property
    def current_window(self) -> Optional[str]:
        """Get current window title"""
        return self._current_window
    
    async def shutdown(self):
        """Shutdown context module"""
        await self.stop_monitoring()
        logger.info("Context module shutdown")

