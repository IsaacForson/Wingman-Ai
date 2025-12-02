"""
Wingman AI - Voice Activity Detection
Detect speech in audio stream using webrtcvad
"""

from typing import Optional
from loguru import logger

try:
    import webrtcvad
except ImportError:
    webrtcvad = None
    logger.warning("webrtcvad not available - using fallback VAD")


class VoiceActivityDetector:
    """
    Voice Activity Detection using WebRTC VAD
    Determines if audio contains speech
    """
    
    def __init__(
        self,
        sample_rate: int = 16000,
        aggressiveness: int = 2
    ):
        """
        Initialize VAD
        
        Args:
            sample_rate: Audio sample rate (must be 8000, 16000, 32000, or 48000)
            aggressiveness: VAD aggressiveness (0-3, higher = more aggressive filtering)
        """
        self.sample_rate = sample_rate
        self.aggressiveness = min(max(aggressiveness, 0), 3)
        
        self._vad: Optional[webrtcvad.Vad] = None
        self._frame_duration = 30  # ms (must be 10, 20, or 30)
        self._frame_size = int(sample_rate * self._frame_duration / 1000) * 2  # bytes
        
        self._init_vad()
    
    def _init_vad(self):
        """Initialize the VAD instance"""
        if webrtcvad is None:
            logger.warning("Using fallback VAD (energy-based)")
            return
        
        try:
            self._vad = webrtcvad.Vad(self.aggressiveness)
            logger.debug(f"VAD initialized (aggressiveness={self.aggressiveness})")
        except Exception as e:
            logger.error(f"Failed to initialize VAD: {e}")
    
    def is_speech(self, audio_chunk: bytes) -> bool:
        """
        Check if audio chunk contains speech
        
        Args:
            audio_chunk: Raw audio bytes (16-bit PCM)
            
        Returns:
            True if speech detected, False otherwise
        """
        if self._vad is None:
            # Fallback to energy-based detection
            return self._energy_based_vad(audio_chunk)
        
        try:
            # webrtcvad requires specific frame sizes
            # Process in 30ms frames
            frames = self._split_into_frames(audio_chunk)
            
            if not frames:
                return False
            
            # Check if majority of frames contain speech
            speech_count = sum(
                1 for frame in frames
                if self._vad.is_speech(frame, self.sample_rate)
            )
            
            return speech_count > len(frames) * 0.3
            
        except Exception as e:
            logger.debug(f"VAD error: {e}")
            return self._energy_based_vad(audio_chunk)
    
    def _split_into_frames(self, audio_chunk: bytes) -> list[bytes]:
        """Split audio chunk into VAD-compatible frames"""
        frames = []
        for i in range(0, len(audio_chunk) - self._frame_size + 1, self._frame_size):
            frames.append(audio_chunk[i:i + self._frame_size])
        return frames
    
    def _energy_based_vad(self, audio_chunk: bytes, threshold: int = 500) -> bool:
        """
        Fallback energy-based voice activity detection
        Simple but less accurate than webrtcvad
        """
        import struct
        
        if len(audio_chunk) < 2:
            return False
        
        # Calculate RMS energy
        try:
            # Unpack as 16-bit signed integers
            samples = struct.unpack(f'{len(audio_chunk)//2}h', audio_chunk)
            
            # Calculate RMS
            sum_squares = sum(s * s for s in samples)
            rms = (sum_squares / len(samples)) ** 0.5
            
            return rms > threshold
            
        except Exception:
            return False
    
    def set_aggressiveness(self, level: int):
        """
        Set VAD aggressiveness level
        
        Args:
            level: 0-3 (0 = least aggressive, 3 = most aggressive)
        """
        self.aggressiveness = min(max(level, 0), 3)
        if self._vad:
            self._vad.set_mode(self.aggressiveness)

