"""
Wingman AI - WebSocket Server
Real-time communication with Electron frontend using Socket.IO
"""

import asyncio
from typing import Dict, Any, Optional
from datetime import datetime

import socketio
from loguru import logger

from config import settings
from .event_bus import event_bus, EventType, Event


# Create Socket.IO server
sio = socketio.AsyncServer(
    async_mode='asgi',
    cors_allowed_origins='*',  # Allow all origins for Electron file:// protocol
    logger=False,
    engineio_logger=False,
    max_http_buffer_size=10_000_000  # screenshots are a few hundred KB
)


async def apply_settings(data: Dict[str, Any]):
    """Apply frontend settings to the running engine. Every field is optional."""
    from main import engine
    from modules.conversation import get_conversation_manager
    
    for provider, key in (data.get("apiKeys") or {}).items():
        if not key:
            continue  # blank field = keep the key from .env
        if provider == "groq":
            settings.groq_api_key = key
        elif provider == "nvidia":
            settings.nvidia_api_keys = key
        elif provider == "openai":
            settings.openai_api_key = key
        logger.info(f"API key updated for {provider}")
    
    if "temperature" in data:
        settings.temperature = float(data["temperature"])
    if "maxTokens" in data:
        settings.max_tokens = int(data["maxTokens"])
    if "saveSessionHistory" in data:
        get_conversation_manager().persist = bool(data["saveSessionHistory"])
    
    if not engine:
        return
    
    if "resume" in data:
        engine.resume = str(data["resume"] or "")[:20000]
    if "jobDescription" in data:
        engine.job_description = str(data["jobDescription"] or "")[:20000]
    
    if engine._ai_module:
        generator = engine._ai_module.answer_generator
        if data.get("aiProvider"):
            generator.set_provider(data["aiProvider"])
        if data.get("aiModel"):
            generator.default_model = data["aiModel"]
    
    audio = engine._audio_module
    if audio:
        if "inputDevice" in data and audio.capture:
            device = data["inputDevice"]
            # Takes effect the next time listening starts
            audio.capture.device = None if device in (None, "", "default") else int(device)
        if "vadSensitivity" in data and audio.vad:
            audio.vad.set_aggressiveness(int(data["vadSensitivity"]))
        if data.get("listenSource") in ("mic", "system", "both"):
            audio.listen_source = data["listenSource"]  # takes effect the next time listening starts
        if "silenceThreshold" in data:
            audio.silence_ms = int(data["silenceThreshold"])
        model = data.get("whisperModel", settings.whisper_model)
        use_local = data.get("useLocalWhisper", settings.use_local_whisper)
        if model != settings.whisper_model or use_local != settings.use_local_whisper:
            settings.whisper_model, settings.use_local_whisper = model, use_local
            # Loading a local Whisper model can take a while; don't block the socket
            asyncio.create_task(audio.reload_transcriber())


class WebSocketManager:
    """Manages WebSocket connections and message routing"""
    
    def __init__(self, sio_server: socketio.AsyncServer):
        self.sio = sio_server
        self.connected_clients: Dict[str, Dict[str, Any]] = {}
        self._setup_handlers()
        self._setup_event_forwarding()
    
    def _setup_handlers(self):
        """Setup Socket.IO event handlers"""
        
        @self.sio.event
        async def connect(sid, environ):
            """Handle client connection"""
            self.connected_clients[sid] = {
                "connected_at": datetime.now(),
                "environ": environ
            }
            logger.info(f"Client connected: {sid}")
            
            # Send initial status
            from main import engine
            if engine:
                status = await engine.get_status()
                await self.sio.emit("status", status, room=sid)
        
        @self.sio.event
        async def disconnect(sid):
            """Handle client disconnection"""
            if sid in self.connected_clients:
                del self.connected_clients[sid]
            logger.info(f"Client disconnected: {sid}")
        
        @self.sio.event
        async def start_audio(sid, data=None):
            """Start audio capture"""
            logger.info(f"Start audio requested by {sid}")
            from main import engine
            if engine:
                await engine.start_audio()
                # Only "started" if a source actually started (computer audio may lack permission)
                running = bool(engine._audio_module and engine._audio_module._is_running)
                await self.sio.emit("audio_status", {"status": "started" if running else "stopped"}, room=sid)
        
        @self.sio.event
        async def stop_audio(sid, data=None):
            """Stop audio capture"""
            logger.info(f"Stop audio requested by {sid}")
            from main import engine
            if engine:
                await engine.stop_audio()
                await self.sio.emit("audio_status", {"status": "stopped"}, room=sid)
        
        @self.sio.event
        async def capture_screen(sid, data=None):
            """Capture and analyze screen"""
            logger.info(f"Screen capture requested by {sid}")
            from main import engine
            if engine:
                result = await engine.capture_screen()
                await self.sio.emit("screen_result", result, room=sid)
        
        @self.sio.event
        async def submit_question(sid, data):
            """Submit a manual question with conversation context"""
            question = data.get("question", "")
            conversation_id = data.get("conversation_id")
            mode = data.get("mode")
            logger.debug(f"Manual question from {sid}: {question[:50]}... (conv: {conversation_id}, mode: {mode})")
            from main import engine
            if engine and question:
                await engine.process_manual_question(question, conversation_id=conversation_id, mode=mode)
        
        @self.sio.event
        async def set_mode(sid, data):
            """Set operating mode"""
            mode = data.get("mode", "")
            logger.debug(f"Mode change from {sid}: {mode}")
            from main import engine
            if engine:
                await engine.set_mode(mode)
        
        @self.sio.event
        async def pause(sid, data=None):
            """Pause processing"""
            from main import engine
            if engine:
                await engine.pause()
        
        @self.sio.event
        async def resume(sid, data=None):
            """Resume processing"""
            from main import engine
            if engine:
                await engine.resume()
        
        @self.sio.event
        async def get_status(sid, data=None):
            """Get current status"""
            from main import engine
            if engine:
                status = await engine.get_status()
                await self.sio.emit("status", status, room=sid)
        
        @self.sio.event
        async def get_ai_providers(sid, data=None):
            """Get available AI providers"""
            from main import engine
            if engine and engine._ai_module:
                generator = engine._ai_module.answer_generator
                await self.sio.emit("ai_providers", {
                    "current_provider": generator.provider,
                    "current_model": generator.default_model,
                    "available_providers": generator.get_available_providers()
                }, room=sid)
        
        @self.sio.event
        async def set_ai_provider(sid, data):
            """Set the AI provider"""
            provider = data.get("provider", "")
            model = data.get("model")
            from main import engine
            if engine and engine._ai_module:
                generator = engine._ai_module.answer_generator
                generator.set_provider(provider)
                if model:
                    generator.default_model = model
                await self.sio.emit("ai_provider_changed", {
                    "provider": generator.provider,
                    "model": generator.default_model
                }, room=sid)
        
        @self.sio.event
        async def ping(sid, data=None):
            """Handle ping for latency measurement"""
            await self.sio.emit("pong", {"timestamp": datetime.now().isoformat()}, room=sid)
        
        @self.sio.event
        async def sync_settings(sid, data):
            """Apply settings from the frontend (full sync or a single changed field)"""
            logger.info(f"Settings sync from {sid}: {sorted(data.keys())}")
            await apply_settings(data)
            await self.sio.emit("settings_synced", {"success": True}, room=sid)
        
        @self.sio.event
        async def get_audio_devices(sid, data=None):
            """List microphones the backend can record from (returned as an ack)"""
            from modules.audio.capture import AudioCapture
            return AudioCapture.list_devices()
        
        @self.sio.event
        async def analyze_screenshot(sid, data):
            """Answer what's on a screenshot taken by the desktop app"""
            from main import engine
            if engine and data.get("image"):
                await engine.process_image(data["image"], data.get("conversation_id"), data.get("mode"))
        
        @self.sio.event
        async def request_capture(sid, data=None):
            """Ask the Chrome extension to capture the active tab"""
            from main import request_extension_capture
            if await request_extension_capture() == 0:
                await self.sio.emit("capture_error", {
                    "error": "Chrome extension not connected. Open Chrome and make sure the Wingman extension is enabled (reload it once after updating)."
                }, room=sid)
        
        @self.sio.event
        async def set_temperature(sid, data):
            """Set AI temperature"""
            temp = data.get("temperature", 0.7)
            from config import settings
            settings.temperature = temp
            logger.info(f"Temperature set to {temp}")
        
        @self.sio.event
        async def set_max_tokens(sid, data):
            """Set max tokens"""
            tokens = data.get("maxTokens", 2048)
            from config import settings
            settings.max_tokens = tokens
            logger.info(f"Max tokens set to {tokens}")
        
        @self.sio.event
        async def set_api_key(sid, data):
            """Set API key for a provider"""
            await apply_settings({"apiKeys": {data.get("provider"): data.get("key")}})
        
        @self.sio.event
        async def convert_code(sid, data):
            """Convert code from one language to another"""
            code = data.get("code", "")
            from_lang = data.get("from_language", "")
            to_lang = data.get("to_language", "")
            
            logger.info(f"Code conversion requested: {from_lang} -> {to_lang}")
            
            from main import engine
            if engine and engine._ai_module:
                try:
                    generator = engine._ai_module.answer_generator
                    
                    # Create a prompt for code conversion
                    conversion_prompt = f"""Convert the following {from_lang} code to {to_lang}. 
Only output the converted code, no explanations or markdown formatting.
Keep the same logic and functionality.

{from_lang} code:
```{from_lang}
{code}
```

Output only the {to_lang} code:"""
                    
                    # Generate the converted code
                    converted_code = await generator.generate(
                        question=conversion_prompt,
                        context="",
                        mode="work"
                    )
                    
                    # Clean up the response (remove markdown code blocks if present)
                    converted_code = converted_code.strip()
                    if converted_code.startswith("```"):
                        lines = converted_code.split("\n")
                        # Remove first line (```language) and last line (```)
                        if lines[-1].strip() == "```":
                            lines = lines[1:-1]
                        else:
                            lines = lines[1:]
                        converted_code = "\n".join(lines)
                    
                    await self.sio.emit("code_converted", {
                        "success": True,
                        "converted_code": converted_code,
                        "from_language": from_lang,
                        "to_language": to_lang
                    }, room=sid)
                    
                except Exception as e:
                    logger.error(f"Code conversion failed: {e}")
                    await self.sio.emit("code_converted", {
                        "success": False,
                        "error": str(e),
                        "converted_code": ""
                    }, room=sid)
            else:
                await self.sio.emit("code_converted", {
                    "success": False,
                    "error": "AI engine not available",
                    "converted_code": ""
                }, room=sid)
    
    def _setup_event_forwarding(self):
        """Forward internal events to connected clients"""
        
        async def forward_to_clients(event: Event):
            """Forward event to all connected clients"""
            event_name = event.type.value if isinstance(event.type, EventType) else event.type
            
            # Map internal events to client event names
            event_mapping = {
                EventType.TRANSCRIPT_PARTIAL: "transcript_partial",
                EventType.TRANSCRIPT_FINAL: "transcript_final",
                EventType.QUESTION_DETECTED: "question_detected",
                EventType.ANSWER_GENERATING: "answer_generating",
                EventType.ANSWER_CHUNK: "answer_chunk",
                EventType.ANSWER_COMPLETE: "answer_complete",
                EventType.ANSWER_ERROR: "answer_error",
                EventType.SCREEN_TEXT_DETECTED: "screen_text",
                EventType.SCREEN_CODE_DETECTED: "screen_code",
                EventType.SCREEN_MCQ_DETECTED: "screen_mcq",
                EventType.CONTEXT_MODE_CHANGED: "mode_changed",
                EventType.AUDIO_STARTED: "audio_started",
                EventType.AUDIO_STOPPED: "audio_stopped",
                EventType.SESSION_STARTED: "session_started",
                EventType.SESSION_PAUSED: "session_paused",
                EventType.SESSION_RESUMED: "session_resumed",
                EventType.SESSION_ENDED: "session_ended",
                EventType.SYSTEM_READY: "system_ready",
                EventType.SYSTEM_ERROR: "system_error"
            }
            
            client_event = event_mapping.get(event.type, event_name)
            
            # Emit to all clients
            await self.sio.emit(client_event, {
                # Screenshots go to the AI only, never back over the socket
                "data": {k: v for k, v in event.data.items() if k not in ("image", "prompt")},
                "timestamp": event.timestamp.isoformat(),
                "source": event.source
            })
        
        # Subscribe to all events for forwarding
        event_bus.subscribe("*", forward_to_clients)
    
    async def broadcast(self, event: str, data: Dict[str, Any]):
        """Broadcast a message to all connected clients"""
        await self.sio.emit(event, data)
    
    async def send_to_client(self, sid: str, event: str, data: Dict[str, Any]):
        """Send a message to a specific client"""
        await self.sio.emit(event, data, room=sid)
    
    @property
    def client_count(self) -> int:
        """Get number of connected clients"""
        return len(self.connected_clients)


# Global WebSocket manager
ws_manager: Optional[WebSocketManager] = None


def create_socket_app() -> socketio.ASGIApp:
    """Create and configure the Socket.IO ASGI application"""
    global ws_manager
    # main.py runs twice (as the script, then imported by uvicorn); a second manager
    # would forward every event to the app twice (doubled answer text)
    if ws_manager is None:
        ws_manager = WebSocketManager(sio)
    # socketio_path is empty since we mount the app at /socket.io
    return socketio.ASGIApp(sio, socketio_path="")


def get_ws_manager() -> Optional[WebSocketManager]:
    """Get the WebSocket manager instance"""
    return ws_manager

