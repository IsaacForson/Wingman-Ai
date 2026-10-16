"""
Wingman AI - Main Entry Point
FastAPI application with WebSocket support for real-time AI assistance
"""

import asyncio
import signal
import sys
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, HTTPException, WebSocket
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
from modules.conversation import get_conversation_manager
from modules.ai.answer_generator import PROVIDER_MODELS


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
            "provider_models": {p: m["models"] for p, m in PROVIDER_MODELS.items()},
            "nvidia_key_count": len(settings.nvidia_keys)
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
        
        # Report what actually answered (may be the NVIDIA backup)
        used_provider = generator.last_used_provider or generator.provider
        used_model = generator.last_used_model or generator.default_model
        
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


# ============================================
# Chrome extension capture trigger
# The extension keeps this socket open so the desktop app can ask it to capture
# ============================================

extension_sockets: set[WebSocket] = set()


@app.websocket("/ws/extension")
async def extension_socket(ws: WebSocket):
    await ws.accept()
    extension_sockets.add(ws)
    logger.info(f"🧩 Chrome extension connected ({len(extension_sockets)} open)")
    try:
        while True:
            await ws.receive_text()  # keepalive pings from the extension
    except Exception:
        pass
    finally:
        extension_sockets.discard(ws)
        logger.info("🧩 Chrome extension disconnected")


async def request_extension_capture() -> int:
    """Ask every connected extension to capture its active tab. Returns how many were asked."""
    sent = 0
    for ws in list(extension_sockets):
        try:
            await ws.send_text("capture")
            sent += 1
        except Exception:
            extension_sockets.discard(ws)
    return sent


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


# ============================================
# Conversation History API
# ============================================

@app.get("/api/conversations")
async def list_conversations():
    """List all conversations"""
    conv_manager = get_conversation_manager()
    return {
        "conversations": conv_manager.list_conversations(),
        "active_id": conv_manager.active_conversation_id
    }


@app.post("/api/conversations")
async def create_conversation(mode: str = "interview"):
    """Create a new conversation"""
    conv_manager = get_conversation_manager()
    conv = conv_manager.create_conversation(mode)
    return {"id": conv.id, "mode": conv.mode, "created": True}


@app.get("/api/conversations/{conv_id}")
async def get_conversation(conv_id: str):
    """Get a specific conversation with messages"""
    conv_manager = get_conversation_manager()
    conv = conv_manager.get_conversation(conv_id)
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return conv.to_dict()


@app.delete("/api/conversations/{conv_id}")
async def delete_conversation(conv_id: str):
    """Delete a specific conversation"""
    conv_manager = get_conversation_manager()
    if conv_manager.delete_conversation(conv_id):
        return {"deleted": True}
    raise HTTPException(status_code=404, detail="Conversation not found")


@app.post("/api/conversations/{conv_id}/activate")
async def activate_conversation(conv_id: str):
    """Set a conversation as active"""
    conv_manager = get_conversation_manager()
    if conv_manager.set_active_conversation(conv_id):
        return {"activated": True, "id": conv_id}
    raise HTTPException(status_code=404, detail="Conversation not found")


@app.post("/api/conversations/{conv_id}/mode")
async def change_conversation_mode(conv_id: str, mode: str):
    """Change the mode of a conversation"""
    conv_manager = get_conversation_manager()
    conv = conv_manager.change_mode(mode, conv_id)
    if conv:
        return {"mode": conv.mode, "id": conv_id}
    raise HTTPException(status_code=404, detail="Conversation not found")


@app.delete("/api/conversations")
async def clear_all_conversations():
    """Clear all conversations"""
    conv_manager = get_conversation_manager()
    conv_manager.clear_all()
    return {"cleared": True}


@app.post("/api/conversations/cleanup")
async def cleanup_expired_conversations(hours: int = 48):
    """Clean up conversations older than specified hours"""
    conv_manager = get_conversation_manager()
    conv_manager.cleanup_expired(hours)
    return {"cleaned_up": True, "hours": hours}


# Request model for conversational analyze endpoint
class ConversationalAnalyzeRequest(BaseModel):
    content: str
    conversation_id: str = None  # Optional: use existing conversation
    mode: str = "interview"
    provider: str = None
    model: str = None
    route_to_electron: bool = False


@app.post("/api/analyze/conversational")
async def analyze_conversational(request: ConversationalAnalyzeRequest):
    """
    Analyze content with conversation history context.
    Maintains conversation continuity across requests.
    """
    logger.info(f"📝 Conversational analyze: mode={request.mode}, conv_id={request.conversation_id}")
    
    if not engine or not engine._ai_module:
        raise HTTPException(status_code=503, detail="Engine not initialized")
    
    content = request.content.strip()
    if not content:
        raise HTTPException(status_code=400, detail="No content provided")
    
    try:
        conv_manager = get_conversation_manager()
        generator = engine._ai_module.answer_generator
        
        # Get or create conversation
        if request.conversation_id:
            conv = conv_manager.get_conversation(request.conversation_id)
            if not conv:
                conv = conv_manager.create_conversation(request.mode)
        else:
            # Use active conversation or create new
            conv = conv_manager.get_active_conversation()
            if not conv:
                conv = conv_manager.create_conversation(request.mode)
        
        # Get conversation history for context
        history = conv.get_context_messages(limit=10)
        
        # Add user message to conversation
        conv_manager.add_message("user", content, conv.id)
        
        # Temporarily switch provider if specified
        original_provider = generator.provider
        original_model = generator.default_model
        
        if request.provider:
            generator.set_provider(request.provider)
            if request.model:
                generator.default_model = request.model
        
        # Emit processing event
        if request.route_to_electron:
            await sio.emit('extension_capture', {
                'status': 'processing',
                'question': content[:300],
                'conversation_id': conv.id,
                'source': 'conversational'
            })
        
        # Generate answer with conversation history
        answer_chunks = []
        async for chunk in generator.generate_stream(
            content, 
            mode=conv.mode,
            conversation_history=history
        ):
            answer_chunks.append(chunk)
        
        full_answer = "".join(answer_chunks)
        
        # Add assistant response to conversation
        conv_manager.add_message("assistant", full_answer, conv.id)
        
        # Report what actually answered (may be the NVIDIA backup)
        used_provider = generator.last_used_provider or generator.provider
        used_model = generator.last_used_model or generator.default_model
        
        # Restore original provider
        if request.provider and original_provider != request.provider:
            generator.set_provider(original_provider)
            generator.default_model = original_model
        
        logger.info(f"✅ Conversational answer using {used_provider}: {len(full_answer)} chars")
        
        # Route to Electron
        if request.route_to_electron:
            await sio.emit('extension_answer', {
                'question': content[:300],
                'answer': full_answer,
                'provider': used_provider,
                'model': used_model,
                'conversation_id': conv.id,
                'mode': conv.mode,
                'source': 'conversational'
            })
        
        return {
            "question": content[:200] + "..." if len(content) > 200 else content,
            "answer": full_answer,
            "provider": used_provider,
            "model": used_model,
            "conversation_id": conv.id,
            "mode": conv.mode,
            "message_count": len(conv.messages),
            "routed_to_electron": request.route_to_electron
        }
        
    except Exception as e:
        logger.error(f"❌ Conversational analysis error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


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

