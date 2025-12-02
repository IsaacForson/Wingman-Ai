"""
Wingman AI - Main Entry Point
FastAPI application with WebSocket support for real-time AI assistance
"""

import asyncio
import signal
import sys
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from loguru import logger

from config import settings, get_data_dir, get_logs_dir
from core.engine import WingmanEngine
from core.websocket_server import create_socket_app
from core.event_bus import event_bus
from core.health import router as health_router


# Configure logging
def setup_logging():
    """Configure loguru for the application"""
    log_format = (
        "<green>{time:YYYY-MM-DD HH:mm:ss}</green> | "
        "<level>{level: <8}</level> | "
        "<cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> | "
        "<level>{message}</level>"
    )
    
    # Remove default handler
    logger.remove()
    
    # Add console handler
    logger.add(
        sys.stderr,
        format=log_format,
        level=settings.log_level,
        colorize=True
    )
    
    # Add file handler
    logs_dir = get_logs_dir()
    logger.add(
        logs_dir / "wingman.log",
        format=log_format,
        level=settings.log_level,
        rotation="10 MB",
        retention="7 days",
        compression="zip"
    )


# Global engine instance
engine: WingmanEngine | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler for startup and shutdown"""
    global engine
    
    setup_logging()
    logger.info(f"🚀 Starting {settings.app_name} v{settings.app_version}")
    
    # Ensure data directories exist
    get_data_dir()
    (get_data_dir() / "documents").mkdir(exist_ok=True)
    (get_data_dir() / "vectordb").mkdir(exist_ok=True)
    (get_data_dir() / "sessions").mkdir(exist_ok=True)
    
    # Initialize the Wingman engine
    engine = WingmanEngine()
    await engine.initialize()
    
    # Store engine in app state for access in routes
    app.state.engine = engine
    
    logger.info("✅ Wingman AI initialized successfully")
    
    yield
    
    # Shutdown
    logger.info("🛑 Shutting down Wingman AI...")
    if engine:
        await engine.shutdown()
    logger.info("👋 Wingman AI stopped")


# Create FastAPI application
app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="Your AI co-pilot for interviews, exams, meetings, and deep work",
    lifespan=lifespan
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include health check routes
app.include_router(health_router, prefix="/api", tags=["Health"])

# Mount Socket.IO application
socket_app = create_socket_app()
app.mount("/", socket_app)


@app.get("/")
async def root():
    """Root endpoint - basic info"""
    return {
        "name": settings.app_name,
        "version": settings.app_version,
        "status": "running",
        "websocket": f"ws://{settings.host}:{settings.port}/ws"
    }


@app.get("/api/status")
async def get_status():
    """Get current engine status"""
    if engine:
        return await engine.get_status()
    return {"status": "not_initialized"}


@app.post("/api/mode/{mode}")
async def set_mode(mode: str):
    """Set the operating mode (interview, study, work, research)"""
    if engine:
        await engine.set_mode(mode)
        return {"mode": mode, "status": "updated"}
    return {"error": "Engine not initialized"}


@app.get("/api/ai/providers")
async def get_ai_providers():
    """Get available AI providers and current selection"""
    if engine and engine._ai_module:
        generator = engine._ai_module.answer_generator
        return {
            "current_provider": generator.provider,
            "current_model": generator.default_model,
            "available_providers": generator.get_available_providers(),
            "provider_models": {
                "openai": ["gpt-4-turbo-preview", "gpt-4", "gpt-3.5-turbo"],
                "anthropic": ["claude-3-opus-20240229", "claude-3-sonnet-20240229", "claude-3-haiku-20240307"],
                "groq": ["llama-3.3-70b-versatile", "llama-3.1-70b-versatile", "llama-3.1-8b-instant", "mixtral-8x7b-32768"],
                "gemini": ["gemini-1.5-pro", "gemini-1.5-flash", "gemini-1.0-pro"],
                "together": ["meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo", "meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo"],
                "huggingface": ["meta-llama/Meta-Llama-3-8B-Instruct", "mistralai/Mistral-7B-Instruct-v0.2"],
                "ollama": ["llama3.2", "llama3.1", "mistral", "codellama", "phi3"]
            }
        }
    return {"error": "Engine not initialized"}


@app.post("/api/ai/provider/{provider}")
async def set_ai_provider(provider: str, model: str = None):
    """Set the AI provider and optionally the model"""
    if engine and engine._ai_module:
        generator = engine._ai_module.answer_generator
        generator.set_provider(provider)
        if model:
            generator.default_model = model
        return {
            "provider": generator.provider,
            "model": generator.default_model,
            "status": "updated"
        }
    return {"error": "Engine not initialized"}


def main():
    """Run the application"""
    import uvicorn
    
    logger.info(f"Starting server on {settings.host}:{settings.port}")
    
    uvicorn.run(
        "main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug,
        log_level=settings.log_level.lower()
    )


if __name__ == "__main__":
    main()

