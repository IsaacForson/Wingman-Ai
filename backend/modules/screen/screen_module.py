"""
Wingman AI - Screen Module
Main screen analysis orchestrator
"""

import asyncio
from typing import Optional, Dict, Any
from datetime import datetime
from loguru import logger

from config import settings
from core.event_bus import event_bus, EventType
from .capture import ScreenCapture
from .ocr import OCRProcessor


class ScreenModule:
    """
    Orchestrates screen capture and analysis
    Handles OCR, code detection, and MCQ detection
    """
    
    def __init__(self):
        self.capture: Optional[ScreenCapture] = None
        self.ocr: Optional[OCRProcessor] = None
        
        self._is_monitoring = False
        self._monitor_task: Optional[asyncio.Task] = None
        self._last_capture_hash: Optional[str] = None
        self._capture_interval = settings.screenshot_interval
    
    async def initialize(self):
        """Initialize screen components"""
        logger.info("Initializing screen module...")
        
        self.capture = ScreenCapture()
        self.ocr = OCRProcessor(engine=settings.ocr_engine)
        
        logger.info("Screen module initialized")
    
    async def start_monitoring(self):
        """Start continuous screen monitoring"""
        if self._is_monitoring:
            return
        
        self._is_monitoring = True
        self._monitor_task = asyncio.create_task(self._monitoring_loop())
        logger.info("Screen monitoring started")
    
    async def stop_monitoring(self):
        """Stop screen monitoring"""
        self._is_monitoring = False
        if self._monitor_task:
            self._monitor_task.cancel()
            try:
                await self._monitor_task
            except asyncio.CancelledError:
                pass
        logger.info("Screen monitoring stopped")
    
    async def _monitoring_loop(self):
        """Continuous screen monitoring loop"""
        try:
            while self._is_monitoring:
                # Capture and analyze
                result = await self.capture_and_analyze()
                
                # Only emit if content changed
                if result and result.get("has_changes"):
                    await self._emit_detected_content(result)
                
                await asyncio.sleep(self._capture_interval)
                
        except asyncio.CancelledError:
            logger.debug("Screen monitoring loop cancelled")
        except Exception as e:
            logger.error(f"Error in screen monitoring: {e}")
    
    async def capture_and_analyze(self) -> Optional[Dict[str, Any]]:
        """
        Capture screen and analyze content
        
        Returns:
            Analysis result with detected text, code, MCQs
        """
        try:
            # Capture screenshot
            screenshot = self.capture.capture()
            if screenshot is None:
                return None
            
            # Check if content changed (using simple hash)
            current_hash = self.capture.get_image_hash(screenshot)
            has_changes = current_hash != self._last_capture_hash
            self._last_capture_hash = current_hash
            
            if not has_changes:
                return {"has_changes": False}
            
            # Perform OCR
            ocr_result = await self.ocr.extract_text(screenshot)
            
            # Analyze extracted text
            analysis = self._analyze_content(ocr_result)
            analysis["has_changes"] = True
            analysis["timestamp"] = datetime.now().isoformat()
            
            await event_bus.emit(EventType.SCREEN_CAPTURED, {
                "has_text": bool(analysis.get("text")),
                "has_code": bool(analysis.get("code_blocks")),
                "has_mcq": bool(analysis.get("mcq"))
            }, "screen_module")
            
            return analysis
            
        except Exception as e:
            logger.error(f"Screen capture/analysis error: {e}")
            return None
    
    def _analyze_content(self, ocr_result: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze OCR result for different content types"""
        text = ocr_result.get("text", "")
        
        result = {
            "text": text,
            "code_blocks": [],
            "mcq": None,
            "type": "general"
        }
        
        if not text:
            return result
        
        # Detect code blocks
        code_blocks = self._detect_code(text)
        if code_blocks:
            result["code_blocks"] = code_blocks
            result["type"] = "code"
        
        # Detect MCQs
        mcq = self._detect_mcq(text)
        if mcq:
            result["mcq"] = mcq
            result["type"] = "mcq"
        
        return result
    
    def _detect_code(self, text: str) -> list[Dict[str, str]]:
        """Detect code blocks in text"""
        import re
        
        code_blocks = []
        
        # Patterns that suggest code
        code_indicators = [
            r'def\s+\w+\s*\(',  # Python function
            r'function\s+\w+\s*\(',  # JavaScript function
            r'class\s+\w+',  # Class definition
            r'import\s+\w+',  # Import statement
            r'from\s+\w+\s+import',  # Python import
            r'const\s+\w+\s*=',  # JavaScript const
            r'let\s+\w+\s*=',  # JavaScript let
            r'var\s+\w+\s*=',  # JavaScript var
            r'public\s+\w+\s+\w+\s*\(',  # Java method
            r'void\s+\w+\s*\(',  # C-style function
            r'int\s+\w+\s*\(',  # C-style function
            r'\w+\s*=\s*\[',  # Array assignment
            r'\w+\s*=\s*\{',  # Object/dict assignment
            r'for\s*\(.+\)',  # For loop
            r'while\s*\(.+\)',  # While loop
            r'if\s*\(.+\)',  # If statement
            r'return\s+',  # Return statement
        ]
        
        for pattern in code_indicators:
            matches = re.findall(pattern, text, re.MULTILINE)
            if matches:
                # Extract surrounding context as code block
                for match in matches:
                    start = text.find(match)
                    # Get some context around the match
                    block_start = max(0, start - 50)
                    block_end = min(len(text), start + 200)
                    
                    code_block = text[block_start:block_end].strip()
                    if code_block and code_block not in [b["code"] for b in code_blocks]:
                        code_blocks.append({
                            "code": code_block,
                            "language": self._detect_language(code_block)
                        })
        
        return code_blocks
    
    def _detect_language(self, code: str) -> str:
        """Detect programming language from code snippet"""
        code_lower = code.lower()
        
        if 'def ' in code_lower and ':' in code:
            return "python"
        elif 'function ' in code_lower or '=>' in code:
            return "javascript"
        elif 'public class' in code_lower or 'private ' in code_lower:
            return "java"
        elif '#include' in code_lower or 'int main' in code_lower:
            return "c"
        elif 'fn ' in code_lower and '->' in code:
            return "rust"
        elif 'func ' in code_lower:
            return "go"
        else:
            return "unknown"
    
    def _detect_mcq(self, text: str) -> Optional[Dict[str, Any]]:
        """Detect multiple choice question format"""
        import re
        
        # Look for option patterns
        option_patterns = [
            r'([A-D])\)\s*(.+?)(?=(?:[A-D]\)|$))',
            r'([A-D])\.\s*(.+?)(?=(?:[A-D]\.|$))',
            r'([1-4])\)\s*(.+?)(?=(?:[1-4]\)|$))',
            r'([1-4])\.\s*(.+?)(?=(?:[1-4]\.|$))',
        ]
        
        for pattern in option_patterns:
            matches = re.findall(pattern, text, re.DOTALL | re.MULTILINE)
            if len(matches) >= 2:
                options = [{"label": m[0], "text": m[1].strip()} for m in matches]
                
                # Find question (text before first option)
                first_match = re.search(pattern, text)
                question = text[:first_match.start()].strip() if first_match else ""
                
                return {
                    "question": question,
                    "options": options
                }
        
        return None
    
    async def _emit_detected_content(self, result: Dict[str, Any]):
        """Emit events for detected content"""
        if result.get("text"):
            await event_bus.emit(EventType.SCREEN_TEXT_DETECTED, {
                "text": result["text"],
                "type": result.get("type", "general")
            }, "screen_module")
        
        if result.get("code_blocks"):
            await event_bus.emit(EventType.SCREEN_CODE_DETECTED, {
                "blocks": result["code_blocks"]
            }, "screen_module")
        
        if result.get("mcq"):
            await event_bus.emit(EventType.SCREEN_MCQ_DETECTED, {
                "mcq": result["mcq"]
            }, "screen_module")
    
    async def capture_region(
        self,
        x: int,
        y: int,
        width: int,
        height: int
    ) -> Optional[Dict[str, Any]]:
        """Capture and analyze a specific screen region"""
        screenshot = self.capture.capture_region(x, y, width, height)
        if screenshot is None:
            return None
        
        ocr_result = await self.ocr.extract_text(screenshot)
        return self._analyze_content(ocr_result)
    
    async def shutdown(self):
        """Shutdown screen module"""
        await self.stop_monitoring()
        logger.info("Screen module shutdown")

