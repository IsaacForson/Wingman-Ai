"""
Wingman AI - Answer Generator
AI-powered answer generation with streaming support
Supports multiple AI providers: OpenAI, Anthropic, Groq, Gemini, Together, HuggingFace, Ollama
"""

from typing import Optional, AsyncGenerator, Dict, Any, Literal
from loguru import logger
import aiohttp
import json

from config import settings


# Provider type
AIProvider = Literal["openai", "anthropic", "groq", "gemini", "together", "huggingface", "ollama"]

# Model configurations for each provider
PROVIDER_MODELS = {
    "openai": {
        "default": "gpt-4-turbo-preview",
        "fallback": "gpt-3.5-turbo",
        "models": ["gpt-4-turbo-preview", "gpt-4", "gpt-3.5-turbo"]
    },
    "anthropic": {
        "default": "claude-3-opus-20240229",
        "fallback": "claude-3-sonnet-20240229",
        "models": ["claude-3-opus-20240229", "claude-3-sonnet-20240229", "claude-3-haiku-20240307"]
    },
    "groq": {
        "default": "llama-3.3-70b-versatile",
        "fallback": "llama-3.1-8b-instant",
        "models": ["llama-3.3-70b-versatile", "llama-3.1-70b-versatile", "llama-3.1-8b-instant", "mixtral-8x7b-32768", "gemma2-9b-it"]
    },
    "gemini": {
        "default": "gemini-1.5-flash",
        "fallback": "gemini-1.5-flash",
        "models": ["gemini-1.5-pro", "gemini-1.5-flash", "gemini-1.0-pro"]
    },
    "together": {
        "default": "meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo",
        "fallback": "meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo",
        "models": ["meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo", "meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo", "mistralai/Mixtral-8x7B-Instruct-v0.1"]
    },
    "huggingface": {
        "default": "meta-llama/Meta-Llama-3-8B-Instruct",
        "fallback": "mistralai/Mistral-7B-Instruct-v0.2",
        "models": ["meta-llama/Meta-Llama-3-8B-Instruct", "mistralai/Mistral-7B-Instruct-v0.2", "microsoft/Phi-3-mini-4k-instruct"]
    },
    "ollama": {
        "default": "llama3.2",
        "fallback": "llama3.2",
        "models": ["llama3.2", "llama3.1", "mistral", "codellama", "phi3"]
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
        
        # Client instances
        self._openai_client = None
        self._anthropic_client = None
        self._http_session: Optional[aiohttp.ClientSession] = None
    
    async def initialize(self):
        """Initialize AI clients based on available API keys"""
        logger.info(f"Initializing AI provider: {self.provider}")
        
        # Create HTTP session for API calls
        self._http_session = aiohttp.ClientSession()
        
        # Initialize OpenAI if key available
        if settings.openai_api_key:
            try:
                from openai import AsyncOpenAI
                self._openai_client = AsyncOpenAI(api_key=settings.openai_api_key)
                logger.info("OpenAI client initialized")
            except ImportError:
                logger.warning("OpenAI package not installed")
        
        # Initialize Anthropic if key available
        if settings.anthropic_api_key:
            try:
                from anthropic import AsyncAnthropic
                self._anthropic_client = AsyncAnthropic(api_key=settings.anthropic_api_key)
                logger.info("Anthropic client initialized")
            except ImportError:
                logger.warning("Anthropic package not installed")
        
        # Log available providers
        available = self.get_available_providers()
        logger.info(f"Available AI providers: {available}")
        
        if not available:
            logger.warning("No AI providers configured! Please set at least one API key.")
    
    def get_available_providers(self) -> list[str]:
        """Get list of available providers based on configured API keys"""
        available = []
        
        if settings.openai_api_key:
            available.append("openai")
        if settings.anthropic_api_key:
            available.append("anthropic")
        if settings.groq_api_key:
            available.append("groq")
        if settings.google_api_key:
            available.append("gemini")
        if settings.together_api_key:
            available.append("together")
        if settings.huggingface_api_key:
            available.append("huggingface")
        # Ollama is always available if running locally
        available.append("ollama")
        
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
    
    def _get_system_prompt(self, mode: str) -> str:
        """Get system prompt based on operating mode"""
        prompts = {
            "interview": """You are an expert interview assistant helping someone in a live interview.
Your responses should be:
- Concise but comprehensive
- Structured with clear points
- Include specific examples when relevant
- Use the STAR method for behavioral questions
- For technical questions, explain your reasoning
- For coding questions, provide clean, well-commented code

Always be helpful and supportive. If context from a knowledge base is provided, use it to personalize your answers.""",

            "study": """You are a knowledgeable tutor helping someone study.
Your responses should be:
- Clear and educational
- Break down complex concepts
- Provide examples and analogies
- Suggest related topics to explore
- Include memory aids when helpful
- For math/science, show step-by-step solutions

Focus on helping the user truly understand the material.""",

            "work": """You are a professional assistant helping with work tasks.
Your responses should be:
- Professional and business-appropriate
- Direct and actionable
- Include relevant details
- For emails/messages, maintain appropriate tone
- For documents, follow standard formats
- For code, prioritize clean and maintainable solutions

Help the user be more productive and effective.""",

            "research": """You are a research assistant helping with investigation and analysis.
Your responses should be:
- Thorough and well-reasoned
- Include multiple perspectives
- Cite sources when possible
- Distinguish facts from opinions
- Suggest additional research directions
- Be objective and balanced

Help the user gain deep understanding of topics.""",

            "meeting": """You are an assistant helping during a live meeting.
Your responses should be:
- Quick and concise
- Relevant to the discussion
- Include key points only
- Suggest talking points when asked
- Help with summarization
- Track action items

Keep responses brief since the user is in a live meeting.""",

            "practice": """You are a practice interviewer and coach.
Your responses should be:
- Evaluate answers constructively
- Provide specific feedback
- Suggest improvements
- Rate responses when asked
- Offer alternative approaches
- Be encouraging but honest

Help the user improve their interview skills."""
        }
        
        return prompts.get(mode, prompts["interview"])
    
    def _build_messages(
        self,
        question: str,
        context: str,
        mode: str
    ) -> list[Dict[str, str]]:
        """Build the prompt messages"""
        messages = [
            {"role": "system", "content": self._get_system_prompt(mode)}
        ]
        
        if context:
            messages.append({
                "role": "system",
                "content": f"Relevant context:\n{context}"
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
        mode: str = "interview"
    ) -> str:
        """Generate a complete answer"""
        chunks = []
        async for chunk in self.generate_stream(question, context, mode):
            chunks.append(chunk)
        return "".join(chunks)
    
    async def generate_stream(
        self,
        question: str,
        context: str = "",
        mode: str = "interview"
    ) -> AsyncGenerator[str, None]:
        """Stream answer generation from the selected provider"""
        messages = self._build_messages(question, context, mode)
        
        provider_methods = {
            "openai": self._stream_openai,
            "anthropic": self._stream_anthropic,
            "groq": self._stream_groq,
            "gemini": self._stream_gemini,
            "together": self._stream_together,
            "huggingface": self._stream_huggingface,
            "ollama": self._stream_ollama
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
        fallback_order = ["groq", "ollama", "gemini", "together", "huggingface", "openai", "anthropic"]
        for fallback in fallback_order:
            if fallback != self.provider and fallback in self.get_available_providers():
                try:
                    logger.info(f"Trying fallback provider: {fallback}")
                    async for chunk in provider_methods[fallback](messages):
                        yield chunk
                    return
                except Exception as e:
                    logger.error(f"{fallback} fallback error: {e}")
        
        yield "Error: No AI provider available. Please configure at least one API key or run Ollama locally."
    
    async def _stream_openai(self, messages: list[Dict[str, str]]) -> AsyncGenerator[str, None]:
        """Stream from OpenAI"""
        if not self._openai_client:
            raise Exception("OpenAI client not initialized")
        
        model = self.default_model if self.provider == "openai" else "gpt-3.5-turbo"
        
        response = await self._openai_client.chat.completions.create(
            model=model,
            messages=messages,
            max_tokens=settings.max_tokens,
            temperature=settings.temperature,
            stream=True
        )
        
        async for chunk in response:
            if chunk.choices[0].delta.content:
                yield chunk.choices[0].delta.content
    
    async def _stream_anthropic(self, messages: list[Dict[str, str]]) -> AsyncGenerator[str, None]:
        """Stream from Anthropic Claude"""
        if not self._anthropic_client:
            raise Exception("Anthropic client not initialized")
        
        system_content = ""
        anthropic_messages = []
        
        for msg in messages:
            if msg["role"] == "system":
                system_content += msg["content"] + "\n\n"
            else:
                anthropic_messages.append({
                    "role": msg["role"],
                    "content": msg["content"]
                })
        
        model = self.default_model if self.provider == "anthropic" else "claude-3-haiku-20240307"
        
        async with self._anthropic_client.messages.stream(
            model=model,
            max_tokens=settings.max_tokens,
            system=system_content.strip(),
            messages=anthropic_messages
        ) as stream:
            async for text in stream.text_stream:
                yield text
    
    async def _stream_groq(self, messages: list[Dict[str, str]]) -> AsyncGenerator[str, None]:
        """Stream from Groq (FREE - very fast)"""
        if not settings.groq_api_key:
            raise Exception("Groq API key not configured")
        
        model = self.default_model if self.provider == "groq" else PROVIDER_MODELS["groq"]["default"]
        
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
        
        model = self.default_model if self.provider == "gemini" else PROVIDER_MODELS["gemini"]["default"]
        
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
        
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:streamGenerateContent?key={settings.google_api_key}"
        
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
        
        async with self._http_session.post(url, json=payload) as resp:
            if resp.status != 200:
                error = await resp.text()
                raise Exception(f"Gemini API error: {error}")
            
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
    
    async def _stream_together(self, messages: list[Dict[str, str]]) -> AsyncGenerator[str, None]:
        """Stream from Together AI (FREE credits on signup)"""
        if not settings.together_api_key:
            raise Exception("Together API key not configured")
        
        model = self.default_model if self.provider == "together" else PROVIDER_MODELS["together"]["default"]
        
        url = "https://api.together.xyz/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {settings.together_api_key}",
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
                raise Exception(f"Together API error: {error}")
            
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
    
    async def _stream_huggingface(self, messages: list[Dict[str, str]]) -> AsyncGenerator[str, None]:
        """Stream from HuggingFace Inference API (FREE)"""
        if not settings.huggingface_api_key:
            raise Exception("HuggingFace API key not configured")
        
        model = self.default_model if self.provider == "huggingface" else PROVIDER_MODELS["huggingface"]["default"]
        
        # Build prompt from messages
        prompt = ""
        for msg in messages:
            if msg["role"] == "system":
                prompt += f"<|system|>\n{msg['content']}</s>\n"
            elif msg["role"] == "user":
                prompt += f"<|user|>\n{msg['content']}</s>\n"
            elif msg["role"] == "assistant":
                prompt += f"<|assistant|>\n{msg['content']}</s>\n"
        prompt += "<|assistant|>\n"
        
        url = f"https://api-inference.huggingface.co/models/{model}"
        headers = {
            "Authorization": f"Bearer {settings.huggingface_api_key}",
            "Content-Type": "application/json"
        }
        payload = {
            "inputs": prompt,
            "parameters": {
                "max_new_tokens": settings.max_tokens,
                "temperature": settings.temperature,
                "return_full_text": False
            },
            "stream": True
        }
        
        async with self._http_session.post(url, headers=headers, json=payload) as resp:
            if resp.status != 200:
                error = await resp.text()
                raise Exception(f"HuggingFace API error: {error}")
            
            async for line in resp.content:
                line = line.decode('utf-8').strip()
                if line.startswith('data:'):
                    try:
                        data = json.loads(line[5:])
                        token = data.get('token', {}).get('text', '')
                        if token and not token.startswith('<|'):
                            yield token
                    except json.JSONDecodeError:
                        continue
    
    async def _stream_ollama(self, messages: list[Dict[str, str]]) -> AsyncGenerator[str, None]:
        """Stream from Ollama (FREE - runs locally)"""
        model = self.default_model if self.provider == "ollama" else PROVIDER_MODELS["ollama"]["default"]
        
        url = f"{settings.ollama_base_url}/api/chat"
        payload = {
            "model": model,
            "messages": messages,
            "stream": True,
            "options": {
                "num_predict": settings.max_tokens,
                "temperature": settings.temperature
            }
        }
        
        try:
            async with self._http_session.post(url, json=payload) as resp:
                if resp.status != 200:
                    error = await resp.text()
                    raise Exception(f"Ollama error: {error}")
                
                async for line in resp.content:
                    line = line.decode('utf-8').strip()
                    if line:
                        try:
                            data = json.loads(line)
                            content = data.get('message', {}).get('content', '')
                            if content:
                                yield content
                        except json.JSONDecodeError:
                            continue
        except aiohttp.ClientError as e:
            raise Exception(f"Ollama not running. Start it with: ollama serve\nError: {e}")
    
    async def shutdown(self):
        """Cleanup resources"""
        if self._http_session:
            await self._http_session.close()
        self._openai_client = None
        self._anthropic_client = None
        logger.debug("Answer generator shutdown")
