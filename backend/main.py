"""
Wingman AI - Main Entry Point
FastAPI application with WebSocket support for real-time AI assistance
"""

import asyncio
import signal
import sys
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from loguru import logger
import json

from config import settings, get_data_dir, get_logs_dir
from core.engine import WingmanEngine
from core.websocket_server import create_socket_app, sio
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
from typing import Optional
engine: Optional[WingmanEngine] = None


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

# Mount Socket.IO application at /socket.io path
socket_app = create_socket_app()
app.mount("/socket.io", socket_app)


@app.get("/")
async def root():
    """Root endpoint - basic info"""
    return {
        "name": settings.app_name,
        "version": settings.app_version,
        "status": "running",
        "websocket": f"ws://{settings.host}:{settings.port}/ws"
    }


@app.get("/health")
async def simple_health():
    """Simple health check for quick startup verification"""
    return {"status": "ok", "version": settings.app_version}


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


# Request model for analyze endpoint
class AnalyzeRequest(BaseModel):
    content: str
    type: str = "screen"  # screen, audio, manual
    provider: str = None  # Optional: override AI provider
    model: str = None     # Optional: override model
    route_to_electron: bool = False  # If true, emit answer to Electron via WebSocket


@app.post("/api/analyze")
async def analyze_content(request: AnalyzeRequest):
    """
    Analyze content for questions and generate answers.
    Used by Chrome extension for REST-based analysis.
    Routes answers to Electron desktop app if route_to_electron is True.
    """
    logger.info(f"📝 REST API analyze request: type={request.type}, provider={request.provider}, route_to_electron={request.route_to_electron}")
    
    if not engine or not engine._ai_module:
        raise HTTPException(status_code=503, detail="Engine not initialized")
    
    content = request.content.strip()
    if not content:
        raise HTTPException(status_code=400, detail="No content provided")
    
    try:
        generator = engine._ai_module.answer_generator
        
        # Temporarily switch provider if specified (for this request only)
        original_provider = generator.provider
        original_model = generator.default_model
        
        if request.provider:
            logger.info(f"🔄 Switching to provider: {request.provider}")
            generator.set_provider(request.provider)
            if request.model:
                generator.default_model = request.model
        
        # Emit "processing" event to Electron if routing
        if request.route_to_electron:
            await sio.emit('extension_capture', {
                'status': 'processing',
                'question': content[:300] + '...' if len(content) > 300 else content,
                'source': request.type
            })
        
        # Build prompt based on content type
        if request.type in ["screen", "extension_capture"]:
            prompt = f"""Analyze the following content and provide a helpful answer or solution.

IMPORTANT FORMATTING RULES:
- For code, ALWAYS use markdown code blocks with the language specified: ```python, ```javascript, etc.
- For multiple choice questions, clearly state the correct answer (e.g., "The correct answer is B") and explain why
- Keep explanations concise but complete
- Use bullet points for lists

Content to analyze:
{content}

Provide your response:"""
        else:
            prompt = f"""Answer the following question clearly and concisely.

FORMATTING: If your answer includes code, use markdown code blocks with the language: ```python, ```javascript, etc.

Question: {content}

Answer:"""
        
        # Generate answer (non-streaming for REST)
        answer_chunks = []
        async for chunk in generator.generate_stream(prompt):
            answer_chunks.append(chunk)
        
        full_answer = "".join(answer_chunks)
        
        used_provider = generator.provider
        used_model = generator.default_model
        
        # Restore original provider if we switched
        if request.provider and original_provider != request.provider:
            generator.set_provider(original_provider)
            generator.default_model = original_model
        
        logger.info(f"✅ Generated answer using {used_provider}: {len(full_answer)} chars")
        
        # 🚀 ROUTE TO ELECTRON: Emit answer via WebSocket so Electron can display it
        if request.route_to_electron:
            logger.info("📤 Routing answer to Electron desktop app...")
            await sio.emit('extension_answer', {
                'question': content[:300] + '...' if len(content) > 300 else content,
                'answer': full_answer,
                'provider': used_provider,
                'model': used_model,
                'source': request.type
            })
        
        return {
            "question": content[:200] + "..." if len(content) > 200 else content,
            "answer": full_answer,
            "provider": used_provider,
            "model": used_model,
            "routed_to_electron": request.route_to_electron
        }
        
    except Exception as e:
        logger.error(f"❌ Analysis error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/test-extension")
async def test_extension_flow():
    """
    Test endpoint to verify Electron receives extension answers.
    Visit http://localhost:8765/api/test-extension in your browser.
    """
    logger.info("🧪 TEST: Sending test answer to Electron...")
    
    await sio.emit('extension_answer', {
        'question': 'Test question from backend',
        'answer': '**This is a test answer!**\n\nIf you see this in the Dynamic Island, the flow works! 🎉',
        'provider': 'test',
        'model': 'test',
        'source': 'test_endpoint'
    })
    
    logger.info("✅ TEST: Emitted extension_answer event")
    
    return {"status": "ok", "message": "Test answer sent to Electron. Check Dynamic Island!"}


@app.post("/api/analyze/stream")
async def analyze_content_stream(request: AnalyzeRequest):
    """
    Analyze content and stream the response.
    Used by Chrome extension for streaming answers.
    """
    logger.info(f"📝 REST API streaming analyze: type={request.type}, length={len(request.content)}")
    
    if not engine or not engine._ai_module:
        raise HTTPException(status_code=503, detail="Engine not initialized")
    
    content = request.content.strip()
    if not content:
        raise HTTPException(status_code=400, detail="No content provided")
    
    async def generate():
        try:
            generator = engine._ai_module.answer_generator
            
            # Build prompt
            prompt = f"""Analyze the following and provide a helpful answer:

{content}

Answer:"""
            
            async for chunk in generator.generate_stream(prompt):
                yield f"data: {json.dumps({'chunk': chunk})}\n\n"
            
            yield f"data: {json.dumps({'done': True})}\n\n"
            
        except Exception as e:
            logger.error(f"Streaming error: {e}")
            yield f"data: {json.dumps({'error': str(e)})}\n\n"
    
    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        }
    )


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

