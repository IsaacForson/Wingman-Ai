"""
Wingman AI - Answer Generator
AI-powered answer generation with streaming support
Supports: Groq, Gemini, Mistral
"""

from typing import Optional, AsyncGenerator, Dict, Any, Literal, Tuple
from loguru import logger
import aiohttp
import json

from config import settings


# Provider type
AIProvider = Literal["groq", "gemini", "mistral"]

# Model configurations for each provider
PROVIDER_MODELS = {
    "groq": {
        "default": "llama-3.3-70b-versatile",
        "fallback": "llama-3.1-8b-instant",
        "models": ["llama-3.3-70b-versatile", "llama-3.1-70b-versatile", "llama-3.1-8b-instant", "mixtral-8x7b-32768", "gemma2-9b-it"]
    },
    "gemini": {
        "default": "gemini-1.5-flash",
        "fallback": "gemini-1.5-pro",
        "models": ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-2.0-flash-exp"]
    },
    "mistral": {
        "default": "mistral-large-latest",
        "fallback": "mistral-small-latest",
        "models": ["mistral-large-latest", "mistral-medium-latest", "mistral-small-latest", "open-mistral-7b"]
    }
}


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
        if settings.google_api_key:
            available.append("gemini")
        if settings.mistral_api_key:
            available.append("mistral")
        
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
        conversation_history: list[Dict[str, str]] = None
    ) -> list[Dict[str, str]]:
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
        
        messages.append({
            "role": "user",
            "content": question
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
        conversation_history: list[Dict[str, str]] = None
    ) -> AsyncGenerator[str, None]:
        """Stream answer generation from the selected provider"""
        messages = self._build_messages(question, context, mode, conversation_history)
        
        provider_methods = {
            "groq": self._stream_groq,
            "gemini": self._stream_gemini,
            "mistral": self._stream_mistral
        }
        
        # Try primary provider
        if self.provider in provider_methods:
            try:
                async for chunk in provider_methods[self.provider](messages):
                    yield chunk
                return
            except Exception as e:
                logger.error(f"{self.provider} error: {e}")
        
        # Try fallback providers
        fallback_order = ["groq", "gemini", "mistral"]
        for fallback in fallback_order:
            if fallback != self.provider and fallback in self.get_available_providers():
                try:
                    logger.info(f"Trying fallback provider: {fallback}")
                    async for chunk in provider_methods[fallback](messages):
                        yield chunk
                    return
                except Exception as e:
                    logger.error(f"{fallback} fallback error: {e}")
        
        yield "Error: No AI provider available. Please configure at least one API key."
    
    async def _stream_groq(self, messages: list[Dict[str, str]]) -> AsyncGenerator[str, None]:
        """Stream from Groq (FREE - very fast)"""
        if not settings.groq_api_key:
            raise Exception("Groq API key not configured")
        
        model = self.default_model if self.provider == "groq" else PROVIDER_MODELS["groq"]["default"]
        
        # Track what we're using
        self.last_used_provider = "groq"
        self.last_used_model = model
        logger.info(f"Using Groq model: {model}")
        
        url = "https://api.groq.com/openai/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {settings.groq_api_key}",
            "Content-Type": "application/json"
        }
        payload = {
            "model": model,
            "messages": messages,
            "max_tokens": settings.max_tokens,
            "temperature": settings.temperature,
            "stream": True
        }
        
        async with self._http_session.post(url, headers=headers, json=payload) as resp:
            if resp.status != 200:
                error = await resp.text()
                raise Exception(f"Groq API error: {error}")
            
            async for line in resp.content:
                line = line.decode('utf-8').strip()
                if line.startswith('data: ') and line != 'data: [DONE]':
                    try:
                        data = json.loads(line[6:])
                        content = data.get('choices', [{}])[0].get('delta', {}).get('content', '')
                        if content:
                            yield content
                    except json.JSONDecodeError:
                        continue
    
    async def _stream_gemini(self, messages: list[Dict[str, str]]) -> AsyncGenerator[str, None]:
        """Stream from Google Gemini (FREE tier available)"""
        if not settings.google_api_key:
            raise Exception("Google API key not configured")
        
        # Gemini models to try (in order of preference)
        gemini_models = ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-2.0-flash-exp"]
        
        # Convert messages to Gemini format
        system_instruction = ""
        contents = []
        
        for msg in messages:
            if msg["role"] == "system":
                system_instruction += msg["content"] + "\n"
            elif msg["role"] == "user":
                contents.append({"role": "user", "parts": [{"text": msg["content"]}]})
            elif msg["role"] == "assistant":
                contents.append({"role": "model", "parts": [{"text": msg["content"]}]})
        
        payload = {
            "contents": contents,
            "systemInstruction": {"parts": [{"text": system_instruction}]} if system_instruction else None,
            "generationConfig": {
                "maxOutputTokens": settings.max_tokens,
                "temperature": settings.temperature
            }
        }
        
        # Remove None values
        payload = {k: v for k, v in payload.items() if v is not None}
        
        # Try each Gemini model until one works
        last_error = None
        for model in gemini_models:
            try:
                logger.info(f"Trying Gemini model: {model}")
                url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:streamGenerateContent?alt=sse&key={settings.google_api_key}"
                
                async with self._http_session.post(url, json=payload) as resp:
                    if resp.status != 200:
                        error_text = await resp.text()
                        logger.warning(f"Gemini model {model} failed: {error_text[:200]}")
                        last_error = error_text
                        continue  # Try next model
                    
                    # Success! Track and stream the response
                    self.last_used_provider = "gemini"
                    self.last_used_model = model
                    logger.info(f"✅ Using Gemini model: {model}")
                    
                    async for line in resp.content:
                        line = line.decode('utf-8').strip()
                        if line.startswith('data: '):
                            try:
                                data = json.loads(line[6:])
                                text = data.get('candidates', [{}])[0].get('content', {}).get('parts', [{}])[0].get('text', '')
                                if text:
                                    yield text
                            except json.JSONDecodeError:
                                continue
                    return  # Success, exit the function
                    
            except Exception as e:
                logger.warning(f"Gemini model {model} error: {e}")
                last_error = str(e)
                continue  # Try next model
        
        # All models failed
        raise Exception(f"All Gemini models failed. Last error: {last_error}")
    
    async def _stream_mistral(self, messages: list[Dict[str, str]]) -> AsyncGenerator[str, None]:
        """Stream from Mistral AI"""
        if not settings.mistral_api_key:
            raise Exception("Mistral API key not configured")
        
        # Mistral models to try
        mistral_models = ["mistral-large-latest", "mistral-small-latest", "open-mistral-7b"]
        
        last_error = None
        for model in mistral_models:
            try:
                logger.info(f"Trying Mistral model: {model}")
                
                url = "https://api.mistral.ai/v1/chat/completions"
                headers = {
                    "Authorization": f"Bearer {settings.mistral_api_key}",
                    "Content-Type": "application/json"
                }
                payload = {
                    "model": model,
                    "messages": messages,
                    "max_tokens": settings.max_tokens,
                    "temperature": settings.temperature,
                    "stream": True
                }
                
                async with self._http_session.post(url, headers=headers, json=payload) as resp:
                    if resp.status != 200:
                        error = await resp.text()
                        logger.warning(f"Mistral model {model} failed: {error[:200]}")
                        last_error = error
                        continue
                    
                    # Success! Track and stream
                    self.last_used_provider = "mistral"
                    self.last_used_model = model
                    logger.info(f"✅ Using Mistral model: {model}")
                    
                    async for line in resp.content:
                        line = line.decode('utf-8').strip()
                        if line.startswith('data: ') and line != 'data: [DONE]':
                            try:
                                data = json.loads(line[6:])
                                content = data.get('choices', [{}])[0].get('delta', {}).get('content', '')
                                if content:
                                    yield content
                            except json.JSONDecodeError:
                                continue
                    return
                    
            except Exception as e:
                logger.warning(f"Mistral model {model} error: {e}")
                last_error = str(e)
                continue
        
        raise Exception(f"All Mistral models failed. Last error: {last_error}")
    
    async def shutdown(self):
        """Cleanup resources"""
        if self._http_session:
            await self._http_session.close()
        logger.debug("Answer generator shutdown")
