"""
Wingman AI - Transcription
Speech-to-text using Whisper (local or API)
"""

import asyncio
import io
import wave
from typing import Optional
from loguru import logger

from config import settings


class Transcriber:
    """
    Speech-to-text transcription using OpenAI Whisper
    Supports both local model and API-based transcription
    """
    
    def __init__(
        self,
        model: str = "base",
        use_local: bool = False,
        language: str = "en"
    ):
        self.model_name = model
        self.use_local = use_local
        self.language = language
        
        self._local_model = None
        self._openai_client = None
    
    async def initialize(self):
        """Initialize the transcriber"""
        if self.use_local:
            await self._init_local_model()
        else:
            await self._init_openai_client()
    
    async def _init_local_model(self):
        """Initialize local Whisper model"""
        try:
            import whisper
            
            logger.info(f"Loading local Whisper model: {self.model_name}")
            
            # Load model in background thread
            loop = asyncio.get_event_loop()
            self._local_model = await loop.run_in_executor(
                None,
                whisper.load_model,
                self.model_name
            )
            
            logger.info("Local Whisper model loaded")
            
        except ImportError:
            logger.error("whisper package not installed")
            raise
        except Exception as e:
            logger.error(f"Failed to load Whisper model: {e}")
            raise
    
    async def _init_openai_client(self):
        """Initialize OpenAI client for API transcription"""
        try:
            from openai import AsyncOpenAI
            
            if not settings.openai_api_key:
                logger.warning("OpenAI API key not configured")
                return
            
            self._openai_client = AsyncOpenAI(api_key=settings.openai_api_key)
            logger.info("OpenAI client initialized for transcription")
            
        except ImportError:
            logger.error("openai package not installed")
            raise
    
    async def transcribe(self, audio_data: bytes) -> Optional[str]:
        """
        Transcribe audio data to text
        
        Args:
            audio_data: Raw audio bytes (16-bit PCM)
            
        Returns:
            Transcribed text or None on failure
        """
        if not audio_data:
            return None
        
        try:
            if self.use_local and self._local_model:
                return await self._transcribe_local(audio_data)
            elif self._openai_client:
                return await self._transcribe_api(audio_data)
            else:
                logger.warning("No transcription method available")
                return None
                
        except Exception as e:
            logger.error(f"Transcription failed: {e}")
            return None
    
    async def _transcribe_local(self, audio_data: bytes) -> Optional[str]:
        """Transcribe using local Whisper model"""
        import numpy as np
        
        # Convert bytes to numpy array
        audio_np = np.frombuffer(audio_data, dtype=np.int16).astype(np.float32) / 32768.0
        
        # Run transcription in thread pool
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(
            None,
            self._local_model.transcribe,
            audio_np,
            {
                "language": self.language,
                "fp16": False,
                "task": "transcribe"
            }
        )
        
        return result.get("text", "").strip()
    
    async def _transcribe_api(self, audio_data: bytes) -> Optional[str]:
        """Transcribe using OpenAI Whisper API"""
        # Create WAV file in memory
        wav_buffer = io.BytesIO()
        with wave.open(wav_buffer, 'wb') as wav_file:
            wav_file.setnchannels(1)
            wav_file.setsampwidth(2)  # 16-bit
            wav_file.setframerate(settings.audio_sample_rate)
            wav_file.writeframes(audio_data)
        
        wav_buffer.seek(0)
        wav_buffer.name = "audio.wav"  # OpenAI requires a filename
        
        # Call API
        response = await self._openai_client.audio.transcriptions.create(
            model="whisper-1",
            file=wav_buffer,
            language=self.language if self.language != "auto" else None
        )
        
        return response.text.strip()
    
    async def shutdown(self):
        """Cleanup resources"""
        self._local_model = None
        self._openai_client = None
        logger.debug("Transcriber shutdown")

