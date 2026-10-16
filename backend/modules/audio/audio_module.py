"""
Wingman AI - Audio Module
Main audio processing orchestrator
"""

import asyncio
from typing import Optional
from loguru import logger

from config import settings
from core.event_bus import event_bus, EventType
from .capture import AudioCapture
from .transcription import Transcriber
from .vad import VoiceActivityDetector
from .system_capture import SystemAudioCapture, SystemAudioUnavailable


class AudioModule:
    """
    Orchestrates audio capture, VAD, and transcription
    Manages the real-time audio processing pipeline
    """
    
    def __init__(self):
        self.capture: Optional[AudioCapture] = None
        self.system_capture: Optional[SystemAudioCapture] = None
        self.transcriber: Optional[Transcriber] = None
        self.vad: Optional[VoiceActivityDetector] = None
        
        self._is_running = False
        self._is_paused = False
        self._processing_tasks: list[asyncio.Task] = []
        self.silence_ms = 2000  # silence that ends a spoken question
        # "mic" = you, "system" = what the Mac plays (the interviewer), "both"
        self.listen_source = "mic"
    
    async def initialize(self):
        """Initialize all audio components"""
        logger.info("Initializing audio module...")
        
        # Initialize audio capture
        self.capture = AudioCapture(
            sample_rate=settings.audio_sample_rate,
            channels=settings.audio_channels,
            chunk_size=settings.audio_chunk_size
        )
        self.system_capture = SystemAudioCapture(sample_rate=settings.audio_sample_rate)
        
        # Initialize voice activity detection
        self.vad = VoiceActivityDetector(
            sample_rate=settings.audio_sample_rate,
            aggressiveness=settings.vad_aggressiveness
        )
        
        # Initialize transcriber
        self.transcriber = Transcriber(
            model=settings.whisper_model,
            use_local=settings.use_local_whisper
        )
        await self.transcriber.initialize()
        
        logger.info("Audio module initialized")
    
    async def start(self):
        """Start audio capture and processing"""
        if self._is_running:
            logger.warning("Audio module already running")
            return
        
        logger.info(f"Starting audio capture (source: {self.listen_source})...")
        sources = []
        if self.listen_source in ("system", "both"):
            try:
                # Blocks while macOS answers, so keep it off the event loop
                await asyncio.to_thread(self.system_capture.start)
                sources.append((self.system_capture, "interviewer"))
            except SystemAudioUnavailable as e:
                logger.error(f"System audio unavailable: {e}")
                await event_bus.emit(EventType.SYSTEM_ERROR, {"error": f"Can't hear computer audio: {e}"}, "audio_module")
                if self.listen_source == "system":
                    return
        if self.listen_source in ("mic", "both"):
            self.capture.start()
            sources.append((self.capture, "you"))
        
        self._is_running = True
        self._is_paused = False
        self._processing_tasks = [
            asyncio.create_task(self._processing_loop(capture, speaker)) for capture, speaker in sources
        ]
        
        await event_bus.emit(EventType.AUDIO_STARTED, {}, "audio_module")
        logger.info("Audio capture started")
    
    async def stop(self):
        """Stop audio capture and processing"""
        if not self._is_running:
            return
        
        logger.info("Stopping audio capture...")
        self._is_running = False
        
        # Stop capture
        if self.capture:
            self.capture.stop()
        if self.system_capture:
            await asyncio.to_thread(self.system_capture.stop)
        
        # Each loop transcribes its leftover speech before it exits
        await asyncio.gather(*self._processing_tasks, return_exceptions=True)
        self._processing_tasks = []
        
        await event_bus.emit(EventType.AUDIO_STOPPED, {}, "audio_module")
        logger.info("Audio capture stopped")
    
    async def pause(self):
        """Pause audio processing"""
        self._is_paused = True
        logger.debug("Audio processing paused")
    
    async def resume(self):
        """Resume audio processing"""
        self._is_paused = False
        logger.debug("Audio processing resumed")
    
    async def _processing_loop(self, capture, speaker: str):
        """Detect speech from one source and transcribe each utterance"""
        logger.debug(f"Audio processing loop started ({speaker})")
        
        speech_buffer: list[bytes] = []
        is_speaking = False
        silence_ms = 0.0
        
        try:
            while self._is_running:
                if self._is_paused:
                    await asyncio.sleep(0.1)
                    continue
                
                # Non-blocking: a waiting get() would freeze the whole backend
                chunk = capture.get_chunk(timeout=0)
                if chunk is None:
                    await asyncio.sleep(0.01)
                    continue
                
                # Voice activity detection
                has_speech = self.vad.is_speech(chunk)
                
                if has_speech:
                    if not is_speaking:
                        is_speaking = True
                        await event_bus.emit(EventType.AUDIO_SPEECH_START, {"speaker": speaker}, "audio_module")
                        logger.debug(f"Speech started ({speaker})")
                    silence_ms = 0.0
                    speech_buffer.append(chunk)
                elif is_speaking:
                    speech_buffer.append(chunk)  # Include trailing silence
                    # Chunk sizes differ between mic and system audio, so time silence by length
                    silence_ms += len(chunk) / 2 / settings.audio_sample_rate * 1000
                    if silence_ms >= self.silence_ms:
                        is_speaking = False
                        await event_bus.emit(EventType.AUDIO_SPEECH_END, {"speaker": speaker}, "audio_module")
                        await self._transcribe_buffer(speech_buffer, speaker)
                        speech_buffer = []
        except asyncio.CancelledError:
            logger.debug(f"Audio processing loop cancelled ({speaker})")
        except Exception as e:
            logger.error(f"Error in audio processing loop ({speaker}): {e}")
        
        # Stopped mid-sentence: still transcribe what was said
        if speech_buffer:
            await self._transcribe_buffer(speech_buffer, speaker)
    
    async def _transcribe_buffer(self, speech_buffer: list[bytes], speaker: str):
        """Transcribe one utterance"""
        try:
            await event_bus.emit(EventType.TRANSCRIPT_PARTIAL, {
                "text": "Processing...",
                "speaker": speaker
            }, "audio_module")
            
            result = await self.transcriber.transcribe(b''.join(speech_buffer))
            
            if result and result.strip():
                await event_bus.emit(EventType.TRANSCRIPT_FINAL, {
                    "text": result,
                    "speaker": speaker,
                    "confidence": 0.9  # TODO: Get actual confidence
                }, "audio_module")
                logger.debug(f"Transcription ({speaker}): {result[:100]}...")
        
        except Exception as e:
            logger.error(f"Transcription error: {e}")
    
    async def reload_transcriber(self):
        """Rebuild the transcriber after the Whisper model / local setting changes"""
        transcriber = Transcriber(model=settings.whisper_model, use_local=settings.use_local_whisper)
        try:
            await transcriber.initialize()
        except Exception as e:
            logger.error(f"Local Whisper unavailable ({e}), using cloud transcription")
            settings.use_local_whisper = False
            transcriber = Transcriber(model=settings.whisper_model, use_local=False)
            await transcriber.initialize()
        self.transcriber = transcriber
        logger.info(f"Transcriber reloaded: model={settings.whisper_model}, local={settings.use_local_whisper}")
    
    async def shutdown(self):
        """Shutdown the audio module"""
        await self.stop()
        if self.transcriber:
            await self.transcriber.shutdown()
        logger.info("Audio module shutdown")

