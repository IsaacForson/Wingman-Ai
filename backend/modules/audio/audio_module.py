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


class AudioModule:
    """
    Orchestrates audio capture, VAD, and transcription
    Manages the real-time audio processing pipeline
    """
    
    def __init__(self):
        self.capture: Optional[AudioCapture] = None
        self.transcriber: Optional[Transcriber] = None
        self.vad: Optional[VoiceActivityDetector] = None
        
        self._is_running = False
        self._is_paused = False
        self._speech_buffer: list[bytes] = []
        self._processing_task: Optional[asyncio.Task] = None
    
    async def initialize(self):
        """Initialize all audio components"""
        logger.info("Initializing audio module...")
        
        # Initialize audio capture
        self.capture = AudioCapture(
            sample_rate=settings.audio_sample_rate,
            channels=settings.audio_channels,
            chunk_size=settings.audio_chunk_size
        )
        
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
        
        logger.info("Starting audio capture...")
        self._is_running = True
        self._is_paused = False
        
        # Start audio capture
        self.capture.start()
        
        # Start processing loop
        self._processing_task = asyncio.create_task(self._processing_loop())
        
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
        
        # Cancel processing task
        if self._processing_task:
            self._processing_task.cancel()
            try:
                await self._processing_task
            except asyncio.CancelledError:
                pass
        
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
    
    async def _processing_loop(self):
        """Main audio processing loop"""
        logger.debug("Audio processing loop started")
        
        is_speaking = False
        silence_frames = 0
        max_silence_frames = 30  # ~1 second of silence at 30fps
        
        try:
            while self._is_running:
                if self._is_paused:
                    await asyncio.sleep(0.1)
                    continue
                
                # Get audio chunk
                chunk = self.capture.get_chunk()
                if chunk is None:
                    await asyncio.sleep(0.01)
                    continue
                
                # Emit raw audio chunk event
                await event_bus.emit(EventType.AUDIO_CHUNK, {
                    "size": len(chunk)
                }, "audio_module")
                
                # Voice activity detection
                has_speech = self.vad.is_speech(chunk)
                
                if has_speech:
                    if not is_speaking:
                        is_speaking = True
                        await event_bus.emit(EventType.AUDIO_SPEECH_START, {}, "audio_module")
                        logger.debug("Speech started")
                    
                    silence_frames = 0
                    self._speech_buffer.append(chunk)
                    
                else:
                    if is_speaking:
                        silence_frames += 1
                        self._speech_buffer.append(chunk)  # Include trailing silence
                        
                        if silence_frames >= max_silence_frames:
                            # Speech ended - process the buffer
                            is_speaking = False
                            await event_bus.emit(EventType.AUDIO_SPEECH_END, {}, "audio_module")
                            logger.debug("Speech ended")
                            
                            # Transcribe the speech
                            await self._transcribe_buffer()
                    else:
                        # Emit silence event periodically
                        if silence_frames % 100 == 0:
                            await event_bus.emit(EventType.AUDIO_SILENCE, {}, "audio_module")
                
                await asyncio.sleep(0.01)
                
        except asyncio.CancelledError:
            logger.debug("Audio processing loop cancelled")
        except Exception as e:
            logger.error(f"Error in audio processing loop: {e}")
    
    async def _transcribe_buffer(self):
        """Transcribe accumulated speech buffer"""
        if not self._speech_buffer:
            return
        
        try:
            # Combine audio chunks
            audio_data = b''.join(self._speech_buffer)
            self._speech_buffer = []
            
            # Get partial result first (streaming feel)
            await event_bus.emit(EventType.TRANSCRIPT_PARTIAL, {
                "text": "Processing..."
            }, "audio_module")
            
            # Transcribe
            result = await self.transcriber.transcribe(audio_data)
            
            if result and result.strip():
                await event_bus.emit(EventType.TRANSCRIPT_FINAL, {
                    "text": result,
                    "confidence": 0.9  # TODO: Get actual confidence
                }, "audio_module")
                logger.debug(f"Transcription: {result[:100]}...")
        
        except Exception as e:
            logger.error(f"Transcription error: {e}")
    
    async def shutdown(self):
        """Shutdown the audio module"""
        await self.stop()
        if self.transcriber:
            await self.transcriber.shutdown()
        logger.info("Audio module shutdown")

