"""
Wingman AI - Screen Capture
Fast screenshot capture using mss
"""

import hashlib
from typing import Optional, Tuple
from loguru import logger

try:
    import mss
    import mss.tools
except ImportError:
    mss = None
    logger.warning("mss not available - screen capture disabled")

try:
    from PIL import Image
    import numpy as np
except ImportError:
    Image = None
    np = None


class ScreenCapture:
    """
    Fast screen capture using mss
    Supports full screen and region capture
    """
    
    def __init__(self, monitor: int = 0):
        """
        Initialize screen capture
        
        Args:
            monitor: Monitor index (0 = all monitors, 1+ = specific monitor)
        """
        self.monitor = monitor
        self._sct = None
        
        if mss is None:
            logger.error("mss package not installed")
        else:
            self._sct = mss.mss()
    
    def capture(self) -> Optional[Image.Image]:
        """
        Capture full screen
        
        Returns:
            PIL Image or None on failure
        """
        if self._sct is None or Image is None:
            return None
        
        try:
            # Get monitor info
            monitor = self._sct.monitors[self.monitor]
            
            # Capture
            screenshot = self._sct.grab(monitor)
            
            # Convert to PIL Image
            img = Image.frombytes(
                'RGB',
                screenshot.size,
                screenshot.bgra,
                'raw',
                'BGRX'
            )
            
            return img
            
        except Exception as e:
            logger.error(f"Screen capture error: {e}")
            return None
    
    def capture_region(
        self,
        x: int,
        y: int,
        width: int,
        height: int
    ) -> Optional[Image.Image]:
        """
        Capture a specific screen region
        
        Args:
            x: Left coordinate
            y: Top coordinate
            width: Region width
            height: Region height
            
        Returns:
            PIL Image or None on failure
        """
        if self._sct is None or Image is None:
            return None
        
        try:
            region = {
                "left": x,
                "top": y,
                "width": width,
                "height": height
            }
            
            screenshot = self._sct.grab(region)
            
            img = Image.frombytes(
                'RGB',
                screenshot.size,
                screenshot.bgra,
                'raw',
                'BGRX'
            )
            
            return img
            
        except Exception as e:
            logger.error(f"Region capture error: {e}")
            return None
    
    def capture_active_window(self) -> Optional[Image.Image]:
        """
        Capture the currently active window
        Platform-specific implementation
        
        Returns:
            PIL Image or None on failure
        """
        try:
            import sys
            
            if sys.platform == "darwin":
                return self._capture_active_window_macos()
            elif sys.platform == "win32":
                return self._capture_active_window_windows()
            else:
                # Linux - fall back to full screen
                return self.capture()
                
        except Exception as e:
            logger.error(f"Active window capture error: {e}")
            return None
    
    def _capture_active_window_macos(self) -> Optional[Image.Image]:
        """Capture active window on macOS"""
        try:
            from AppKit import NSWorkspace
            from Quartz import (
                CGWindowListCopyWindowInfo,
                kCGWindowListOptionOnScreenOnly,
                kCGNullWindowID
            )
            
            # Get active app
            active_app = NSWorkspace.sharedWorkspace().activeApplication()
            active_pid = active_app['NSApplicationProcessIdentifier']
            
            # Get window info
            windows = CGWindowListCopyWindowInfo(
                kCGWindowListOptionOnScreenOnly,
                kCGNullWindowID
            )
            
            for window in windows:
                if window.get('kCGWindowOwnerPID') == active_pid:
                    bounds = window.get('kCGWindowBounds', {})
                    x = int(bounds.get('X', 0))
                    y = int(bounds.get('Y', 0))
                    w = int(bounds.get('Width', 800))
                    h = int(bounds.get('Height', 600))
                    
                    return self.capture_region(x, y, w, h)
            
            return self.capture()
            
        except Exception as e:
            logger.debug(f"macOS active window capture failed: {e}")
            return self.capture()
    
    def _capture_active_window_windows(self) -> Optional[Image.Image]:
        """Capture active window on Windows"""
        try:
            import win32gui
            
            hwnd = win32gui.GetForegroundWindow()
            rect = win32gui.GetWindowRect(hwnd)
            x, y, x2, y2 = rect
            
            return self.capture_region(x, y, x2 - x, y2 - y)
            
        except Exception as e:
            logger.debug(f"Windows active window capture failed: {e}")
            return self.capture()
    
    @staticmethod
    def get_image_hash(img: Image.Image) -> str:
        """
        Get a simple hash of an image for change detection
        Uses a scaled-down version for speed
        """
        if img is None:
            return ""
        
        try:
            # Scale down for faster hashing
            small = img.resize((100, 100), Image.Resampling.LANCZOS)
            
            # Convert to bytes and hash
            img_bytes = small.tobytes()
            return hashlib.md5(img_bytes).hexdigest()
            
        except Exception:
            return ""
    
    @staticmethod
    def get_monitors() -> list[dict]:
        """Get available monitor information"""
        if mss is None:
            return []
        
        with mss.mss() as sct:
            monitors = []
            for i, m in enumerate(sct.monitors[1:], 1):  # Skip combined monitor
                monitors.append({
                    "id": i,
                    "left": m["left"],
                    "top": m["top"],
                    "width": m["width"],
                    "height": m["height"]
                })
            return monitors

