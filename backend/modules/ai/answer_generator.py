"""
Wingman AI - Answer Generator
AI-powered answer generation with streaming support
Supports: Groq (primary) with NVIDIA as backup (rotating keys)
"""

from typing import Optional, AsyncGenerator, Dict, Any, Literal, Tuple
from loguru import logger
import aiohttp
import json

from config import settings


# Provider type
AIProvider = Literal["groq", "nvidia"]

# Model configurations for each provider
PROVIDER_MODELS = {
    "groq": {
        "default": "openai/gpt-oss-120b",
        "fallback": "openai/gpt-oss-20b",
        "models": ["openai/gpt-oss-120b", "openai/gpt-oss-20b", "qwen/qwen3.8-27b"]
    },
    "nvidia": {
        "default": "nvidia/nemotron-3-super-120b-a12b",
        "fallback": "openai/gpt-oss-20b",
        "models": ["nvidia/nemotron-3-super-120b-a12b", "openai/gpt-oss-20b", "nvidia/nemotron-3.5-lightning-30b-a3b"]
    }
}

# Models that can read screenshots (tested: Groq answers in <1s, NVIDIA is the backup)
PROVIDER_VISION_MODELS = {
    "groq": "qwen/qwen3.8-27b",
    "nvidia": "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning",
}

PROVIDER_URLS = {
    "groq": "https://api.groq.com/openai/v1/chat/completions",
    "nvidia": "https://integrate.api.nvidia.com/v1/chat/completions",
}

# A provider/key that doesn't answer within these limits counts as "not responding"
REQUEST_TIMEOUT = aiohttp.ClientTimeout(total=None, sock_connect=10, sock_read=30)


class AnswerGenerator:
    """
    Generates answers using multiple LLM providers
    Supports streaming responses and automatic fallback
    """
    
    def __init__(
        self,
        provider: AIProvider = None,
        default_model: str = None,
        fallback_model: str = None
    ):
        self.provider = provider or settings.ai_provider
        self.default_model = default_model or settings.default_model
        self.fallback_model = fallback_model or settings.fallback_model
        
        # Track the actual provider/model used for responses
        self.last_used_provider: str = None
        self.last_used_model: str = None
        
        # NVIDIA key currently in use (rotates on failure)
        self._nvidia_key_index = 0
        
        # HTTP session for API calls
        self._http_session: Optional[aiohttp.ClientSession] = None
    
    async def initialize(self):
        """Initialize AI clients based on available API keys"""
        logger.info(f"Initializing AI provider: {self.provider}")
        
        # Create HTTP session for API calls
        self._http_session = aiohttp.ClientSession()
        
        # Log available providers
        available = self.get_available_providers()
        logger.info(f"Available AI providers: {available}")
        
        if not available:
            logger.warning("No AI providers configured! Please set at least one API key.")
    
    def get_available_providers(self) -> list[str]:
        """Get list of available providers based on configured API keys"""
        available = []
        if settings.groq_api_key:
            available.append("groq")
        if settings.nvidia_keys:
            available.append("nvidia")
        return available
    
    def set_provider(self, provider: AIProvider):
        """Change the active AI provider"""
        if provider in self.get_available_providers():
            self.provider = provider
            # Update model to provider's default
            if provider in PROVIDER_MODELS:
                self.default_model = PROVIDER_MODELS[provider]["default"]
                self.fallback_model = PROVIDER_MODELS[provider]["fallback"]
            logger.info(f"Switched to provider: {provider}")
        else:
            logger.warning(f"Provider {provider} not available")
    
    def get_last_used_info(self) -> Tuple[str, str]:
        """Get the last used provider and model"""
        return self.last_used_provider, self.last_used_model
    
    def _get_system_prompt(self, mode: str) -> str:
        """Get system prompt based on operating mode"""
        
        # Base instruction for human-like responses
        human_style = """
IMPORTANT: Write like a helpful, knowledgeable friend - NOT like a robot or AI assistant.
- Use natural, conversational language
- Vary your sentence structure 
- Use contractions (don't, you'll, it's)
- Be warm and personable
- Avoid phrases like "I'd be happy to help" or "Certainly!" or "Great question!"
- Don't start with "Sure!" or "Absolutely!"
- Just answer directly and naturally, like a real person would
- Use simple words when possible
- Feel free to use casual expressions occasionally
"""
        
        prompts = {
            "interview": f"""{human_style}
You're helping someone during a live interview. Give answers they can actually say out loud naturally.

For behavioral questions: Share a structured story (situation, task, action, result) but make it sound conversational, not robotic.

For technical questions: Explain your thinking clearly. Walk through your reasoning like you're explaining to a colleague.

For coding: Provide clean code with brief comments. Explain the key parts naturally.

Keep answers focused - the person needs to actually speak these words. Make it sound like THEIR answer, not a textbook.""",

            "study": f"""{human_style}
You're a friendly tutor helping someone understand their material.

Break things down simply - use everyday examples and analogies that actually make sense.

If it's a math or science problem, walk through it step by step, explaining WHY each step matters.

Make complex ideas click by connecting them to things they already know.""",

            "work": f"""{human_style}
You're helping with work stuff - be professional but not stiff.

Get straight to the point. Give practical, actionable advice.

For emails or messages, match the appropriate tone for the situation.

For code, keep it clean and maintainable - no over-engineering.""",

            "research": f"""{human_style}
You're helping dig into a topic thoroughly.

Consider different angles and perspectives. Be balanced and honest about what's fact vs. opinion.

Point out where they might want to look further. Be thorough but don't ramble.""",

            "meeting": f"""{human_style}
You're helping during a live meeting - keep it SHORT and snappy.

Get to the point fast. The person is actively in a conversation.

Give just the key points they need right now. Save the details for later.""",

            "practice": f"""{human_style}
You're coaching someone on their interview skills.

Give honest, constructive feedback. Be specific about what worked and what could be better.

Suggest concrete improvements they can actually use. Be encouraging but real."""
        }
        
        return prompts.get(mode, prompts["interview"])
    
    def _build_messages(
        self,
        question: str,
        context: str,
        mode: str,
        conversation_history: list[Dict[str, str]] = None,
        image: str = None
    ) -> list[Dict[str, Any]]:
        """Build the prompt messages with optional conversation history"""
        messages = [
            {"role": "system", "content": self._get_system_prompt(mode)}
        ]
        
        if context:
            messages.append({
                "role": "system",
                "content": f"Relevant context:\n{context}"
            })
        
        # Add conversation history for context (maintains continuity)
        if conversation_history:
            for msg in conversation_history:
                messages.append({
                    "role": msg["role"],
                    "content": msg["content"]
                })
        
        content: Any = question
        if image:
            # OpenAI-style vision message: text + base64 JPEG screenshot
            content = [
                {"type": "text", "text": question},
                {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{image}"}},
            ]
        messages.append({
            "role": "user",
            "content": content
        })
        
        return messages
    
    async def generate(
        self,
        question: str,
        context: str = "",
        mode: str = "interview",
        conversation_history: list[Dict[str, str]] = None
    ) -> str:
        """Generate a complete answer"""
        chunks = []
        async for chunk in self.generate_stream(question, context, mode, conversation_history):
            if isinstance(chunk, dict):
                # Skip metadata chunks
                continue
            chunks.append(chunk)
        return "".join(chunks)
    
    async def generate_stream(
        self,
        question: str,
        context: str = "",
        mode: str = "interview",
        conversation_history: list[Dict[str, str]] = None,
        image: str = None,
        provider: str = None,
        model: str = None
    ) -> AsyncGenerator[str, None]:
        """Stream an answer (image = base64 JPEG screenshot).
        provider/model: this chat's AI; defaults to the app-wide choice. The other provider is the backup."""
        messages = self._build_messages(question, context, mode, conversation_history, image)
        
        self.last_used_provider = None
        self.last_used_model = None
        
        primary = provider if provider in PROVIDER_URLS else self.provider
        primary_model = model if provider in PROVIDER_URLS else self.default_model
        order = [primary] + [p for p in PROVIDER_URLS if p != primary]
        
        for name in order:
            if name not in self.get_available_providers():
                continue
            yielded = False
            try:
                if image:
                    use_model = PROVIDER_VISION_MODELS[name]
                else:
                    use_model = (primary_model if name == primary else None) or PROVIDER_MODELS[name]["default"]
                async for chunk in self._stream_provider(name, messages, use_model):
                    yielded = True
                    yield chunk
                return
            except Exception as e:
                logger.error(f"{name} error: {e}")
                if yielded:
                    # Part of the answer is already out; switching now would duplicate it
                    return
                logger.info("Falling back to next provider...")
        
        yield "Error: No AI provider available. Please configure a Groq or NVIDIA API key."
    
    async def _stream_provider(self, provider: str, messages: list[Dict[str, Any]], model: str) -> AsyncGenerator[str, None]:
        """Stream from a provider. For NVIDIA, rotate through keys until one responds."""
        if model not in PROVIDER_MODELS[provider]["models"] and model != PROVIDER_VISION_MODELS[provider]:
            # Stale/retired model name (e.g. from old saved settings)
            model = PROVIDER_MODELS[provider]["default"]
        keys = [settings.groq_api_key] if provider == "groq" else settings.nvidia_keys
        
        last_error = None
        for attempt in range(len(keys)):
            idx = (self._nvidia_key_index + attempt) % len(keys) if provider == "nvidia" else 0
            yielded = False
            try:
                async for chunk in self._stream_openai_compatible(PROVIDER_URLS[provider], keys[idx], model, messages):
                    if not yielded:
                        yielded = True
                        if provider == "nvidia":
                            # Stick with the key that worked for the next request
                            self._nvidia_key_index = idx
                        self.last_used_provider = provider
                        self.last_used_model = model
                        logger.info(f"✅ Using {provider} model {model}" + (f" (key {idx + 1}/{len(keys)})" if provider == "nvidia" else ""))
                    yield chunk
                return
            except Exception as e:
                if yielded:
                    raise
                last_error = e
                if provider == "nvidia":
                    logger.warning(f"NVIDIA key {idx + 1}/{len(keys)} failed ({e}), rotating to next key")
        
        raise Exception(f"All {provider} keys failed. Last error: {last_error}")
    
    async def _stream_openai_compatible(self, url: str, api_key: str, model: str, messages: list[Dict[str, str]]) -> AsyncGenerator[str, None]:
        """Stream from an OpenAI-compatible chat completions endpoint (Groq, NVIDIA)"""
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        payload = {
            "model": model,
            "messages": messages,
            "max_tokens": settings.max_tokens,
            "temperature": settings.temperature,
            "stream": True
        }
        
        async with self._http_session.post(url, headers=headers, json=payload, timeout=REQUEST_TIMEOUT) as resp:
            if resp.status != 200:
                error = await resp.text()
                raise Exception(f"HTTP {resp.status}: {error[:200]}")
            
            async for line in resp.content:
                line = line.decode('utf-8').strip()
                if line.startswith('data: ') and line != 'data: [DONE]':
                    try:
                        data = json.loads(line[6:])
                        content = (data.get('choices') or [{}])[0].get('delta', {}).get('content') or ''
                        if content:
                            yield content
                    except json.JSONDecodeError:
                        continue
    
    async def shutdown(self):
        """Cleanup resources"""
        if self._http_session:
            await self._http_session.close()
        logger.debug("Answer generator shutdown")
