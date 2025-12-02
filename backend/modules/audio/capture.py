"""
Wingman AI - Audio Capture
Real-time audio capture using sounddevice
"""

import queue
import threading
from typing import Optional
import numpy as np
from loguru import logger

try:
    import sounddevice as sd
except ImportError:
    sd = None
    logger.warning("sounddevice not available - audio capture disabled")


class AudioCapture:
    """
    Real-time audio capture using sounddevice
    Thread-safe implementation with buffer management
    """
    
    def __init__(
        self,
        sample_rate: int = 16000,
        channels: int = 1,
        chunk_size: int = 1024,
        device: Optional[int] = None
    ):
        self.sample_rate = sample_rate
        self.channels = channels
        self.chunk_size = chunk_size
        self.device = device
        
        self._audio_queue: queue.Queue = queue.Queue()
        self._stream: Optional[sd.InputStream] = None
        self._is_running = False
        self._lock = threading.Lock()
    
    def _audio_callback(self, indata: np.ndarray, frames: int, time_info, status):
        """Callback for audio stream"""
        if status:
            logger.warning(f"Audio status: {status}")
        
        # Convert to bytes and add to queue
        audio_bytes = (indata * 32767).astype(np.int16).tobytes()
        self._audio_queue.put(audio_bytes)
    
    def start(self):
        """Start audio capture"""
        if sd is None:
            logger.error("sounddevice not available")
            return
        
        with self._lock:
            if self._is_running:
                return
            
            try:
                self._stream = sd.InputStream(
                    samplerate=self.sample_rate,
                    channels=self.channels,
                    blocksize=self.chunk_size,
                    dtype=np.float32,
                    device=self.device,
                    callback=self._audio_callback
                )
                self._stream.start()
                self._is_running = True
                logger.info(f"Audio capture started (sample_rate={self.sample_rate}, device={self.device})")
            except Exception as e:
                logger.error(f"Failed to start audio capture: {e}")
                raise
    
    def stop(self):
        """Stop audio capture"""
        with self._lock:
            if not self._is_running:
                return
            
            if self._stream:
                self._stream.stop()
                self._stream.close()
                self._stream = None
            
            self._is_running = False
            
            # Clear the queue
            while not self._audio_queue.empty():
                try:
                    self._audio_queue.get_nowait()
                except queue.Empty:
                    break
            
            logger.info("Audio capture stopped")
    
    def get_chunk(self, timeout: float = 0.1) -> Optional[bytes]:
        """
        Get an audio chunk from the buffer
        Returns None if no data available within timeout
        """
        try:
            return self._audio_queue.get(timeout=timeout)
        except queue.Empty:
            return None
    
    def get_all_chunks(self) -> list[bytes]:
        """Get all available audio chunks"""
        chunks = []
        while not self._audio_queue.empty():
            try:
                chunks.append(self._audio_queue.get_nowait())
            except queue.Empty:
                break
        return chunks
    
    @property
    def is_running(self) -> bool:
        """Check if capture is running"""
        return self._is_running
    
    @property
    def queue_size(self) -> int:
        """Get current queue size"""
        return self._audio_queue.qsize()
    
    @staticmethod
    def list_devices() -> list[dict]:
        """List available audio input devices"""
        if sd is None:
            return []
        
        devices = []
        for i, device in enumerate(sd.query_devices()):
            if device['max_input_channels'] > 0:
                devices.append({
                    "id": i,
                    "name": device['name'],
                    "channels": device['max_input_channels'],
                    "sample_rate": device['default_samplerate']
                })
        return devices
    
    @staticmethod
    def get_default_device() -> Optional[int]:
        """Get default input device ID"""
        if sd is None:
            return None
        
        try:
            return sd.default.device[0]  # Input device
        except Exception:
            return None

