"""
Wingman AI - Health Check Endpoints
System health monitoring and diagnostics
"""

from datetime import datetime
from typing import Dict, Any

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from config import settings


router = APIRouter()


class HealthStatus(BaseModel):
    """Health check response model"""
    status: str
    version: str
    timestamp: str
    components: Dict[str, Any]


@router.get("/health", response_model=HealthStatus)
async def health_check():
    """
    Comprehensive health check endpoint
    Returns status of all system components
    """
    components = {
        "api": {"status": "healthy"},
        "websocket": {"status": "healthy"},
    }
    
    # Check audio module
    try:
        import sounddevice
        components["audio"] = {
            "status": "healthy",
            "devices": len(sounddevice.query_devices())
        }
    except Exception as e:
        components["audio"] = {
            "status": "degraded",
            "error": str(e)
        }
    
    # Check AI providers
    ai_status = {}
    if settings.openai_api_key:
        ai_status["openai"] = "configured"
    if settings.anthropic_api_key:
        ai_status["anthropic"] = "configured"
    
    components["ai_providers"] = {
        "status": "healthy" if ai_status else "not_configured",
        "providers": ai_status
    }
    
    # Check OCR
    try:
        if settings.ocr_engine == "tesseract":
            import pytesseract
            pytesseract.get_tesseract_version()
            components["ocr"] = {"status": "healthy", "engine": "tesseract"}
        else:
            components["ocr"] = {"status": "healthy", "engine": "easyocr"}
    except Exception as e:
        components["ocr"] = {
            "status": "degraded",
            "error": str(e)
        }
    
    # Overall status
    overall_status = "healthy"
    for comp in components.values():
        if comp.get("status") == "unhealthy":
            overall_status = "unhealthy"
            break
        elif comp.get("status") == "degraded":
            overall_status = "degraded"
    
    return HealthStatus(
        status=overall_status,
        version=settings.app_version,
        timestamp=datetime.now().isoformat(),
        components=components
    )


@router.get("/health/live")
async def liveness_probe():
    """Simple liveness probe for container orchestration"""
    return {"status": "alive"}


@router.get("/health/ready")
async def readiness_probe():
    """Readiness probe - checks if app is ready to serve traffic"""
    # Could add more sophisticated checks here
    return {"status": "ready"}

