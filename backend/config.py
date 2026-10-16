"""
Wingman AI - Configuration Management
Centralized configuration for all backend modules
"""

import os
import sys
from typing import Optional, Literal
from pydantic_settings import BaseSettings
from pydantic import Field
from pathlib import Path


class Settings(BaseSettings):
    """Application settings with environment variable support"""
    
    # Application
    app_name: str = "Wingman AI"
    app_version: str = "1.0.0"
    debug: bool = Field(default=False, env="DEBUG")
    environment: Literal["development", "production", "testing"] = "development"
    
    # Server
    host: str = Field(default="127.0.0.1", env="HOST")
    port: int = Field(default=8765, env="PORT")
    websocket_path: str = "/ws"
    cors_origins: list[str] = ["*"]  # Allow all origins for Electron file:// protocol
    
    # AI Providers - API Keys
    groq_api_key: Optional[str] = Field(default=None, env="GROQ_API_KEY")
    # Comma-separated NVIDIA keys, rotated when one is rate-limited or not responding
    nvidia_api_keys: str = Field(default="", env="NVIDIA_API_KEYS")
    openai_api_key: Optional[str] = Field(default=None, env="OPENAI_API_KEY")  # For Whisper transcription fallback
    elevenlabs_api_key: Optional[str] = Field(default=None, env="ELEVENLABS_API_KEY")
    
    # AI Model Settings
    # Provider options: groq, nvidia (the other one is used as automatic backup)
    ai_provider: str = Field(default="groq", env="AI_PROVIDER")
    default_model: str = Field(default="openai/gpt-oss-120b", env="DEFAULT_MODEL")
    fallback_model: str = Field(default="openai/gpt-oss-20b", env="FALLBACK_MODEL")
    max_tokens: int = Field(default=2048, env="MAX_TOKENS")
    temperature: float = Field(default=0.7, env="TEMPERATURE")
    
    # Audio Settings
    audio_sample_rate: int = Field(default=16000, env="AUDIO_SAMPLE_RATE")
    audio_channels: int = Field(default=1, env="AUDIO_CHANNELS")
    audio_chunk_size: int = Field(default=1024, env="AUDIO_CHUNK_SIZE")
    vad_aggressiveness: int = Field(default=2, env="VAD_AGGRESSIVENESS")  # 0-3
    whisper_model: str = Field(default="base", env="WHISPER_MODEL")  # tiny, base, small, medium, large
    use_local_whisper: bool = Field(default=False, env="USE_LOCAL_WHISPER")
    
    # Screen Capture Settings
    screenshot_interval: float = Field(default=2.0, env="SCREENSHOT_INTERVAL")
    ocr_engine: Literal["tesseract", "easyocr"] = Field(default="tesseract", env="OCR_ENGINE")
    
    # Knowledge Base
    vector_db_path: Path = Field(default=Path("./data/vectordb"), env="VECTOR_DB_PATH")
    documents_path: Path = Field(default=Path("./data/documents"), env="DOCUMENTS_PATH")
    
    # Cache Settings
    redis_url: Optional[str] = Field(default=None, env="REDIS_URL")
    cache_ttl: int = Field(default=3600, env="CACHE_TTL")  # 1 hour
    enable_caching: bool = Field(default=True, env="ENABLE_CACHING")
    
    # Database
    database_url: str = Field(default="sqlite+aiosqlite:///./data/wingman.db", env="DATABASE_URL")
    
    # Session & Security
    session_timeout: int = Field(default=3600, env="SESSION_TIMEOUT")  # 1 hour
    encryption_key: Optional[str] = Field(default=None, env="ENCRYPTION_KEY")
    
    # Logging
    log_level: str = Field(default="INFO", env="LOG_LEVEL")
    log_file: Optional[Path] = Field(default=Path("./logs/wingman.log"), env="LOG_FILE")
    
    # Feature Flags
    enable_audio: bool = Field(default=True, env="ENABLE_AUDIO")
    enable_screen_capture: bool = Field(default=True, env="ENABLE_SCREEN_CAPTURE")
    enable_clipboard: bool = Field(default=True, env="ENABLE_CLIPBOARD")
    enable_wellness: bool = Field(default=False, env="ENABLE_WELLNESS")
    
    @property
    def nvidia_keys(self) -> list[str]:
        return [k.strip() for k in self.nvidia_api_keys.replace("\n", ",").split(",") if k.strip()]

    class Config:
        # Bundled app: the .env ships next to the executable, but the app runs us from a
        # writable data folder (so logs/data work even when the app sits on a read-only DMG)
        env_file = (str(Path(sys.executable).parent / ".env"), ".env") if getattr(sys, "frozen", False) else ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False
        extra = "ignore"  # Ignore extra keys in .env file


# Global settings instance
settings = Settings()


def get_data_dir() -> Path:
    """Get or create the data directory"""
    data_dir = Path("./data")
    data_dir.mkdir(parents=True, exist_ok=True)
    return data_dir


def get_logs_dir() -> Path:
    """Get or create the logs directory"""
    logs_dir = Path("./logs")
    logs_dir.mkdir(parents=True, exist_ok=True)
    return logs_dir

