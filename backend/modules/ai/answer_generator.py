"""
Wingman AI - Answer Generator
AI-powered answer generation with streaming support
"""

from typing import Optional, AsyncGenerator, Dict, Any
from loguru import logger

from config import settings


class AnswerGenerator:
    """
    Generates answers using LLM (GPT-4, Claude, etc.)
    Supports streaming responses and multiple modes
    """
    
    def __init__(
        self,
        default_model: str = "gpt-4-turbo-preview",
        fallback_model: str = "gpt-3.5-turbo"
    ):
        self.default_model = default_model
        self.fallback_model = fallback_model
        
        self._openai_client = None
        self._anthropic_client = None
    
    async def initialize(self):
        """Initialize AI clients"""
        # Initialize OpenAI
        if settings.openai_api_key:
            try:
                from openai import AsyncOpenAI
                self._openai_client = AsyncOpenAI(api_key=settings.openai_api_key)
                logger.info("OpenAI client initialized")
            except ImportError:
                logger.warning("OpenAI package not installed")
        
        # Initialize Anthropic
        if settings.anthropic_api_key:
            try:
                from anthropic import AsyncAnthropic
                self._anthropic_client = AsyncAnthropic(api_key=settings.anthropic_api_key)
                logger.info("Anthropic client initialized")
            except ImportError:
                logger.warning("Anthropic package not installed")
        
        if not self._openai_client and not self._anthropic_client:
            logger.warning("No AI providers configured")
    
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
    
    def _build_prompt(
        self,
        question: str,
        context: str,
        mode: str
    ) -> list[Dict[str, str]]:
        """Build the prompt messages"""
        messages = [
            {"role": "system", "content": self._get_system_prompt(mode)}
        ]
        
        # Add context if available
        if context:
            messages.append({
                "role": "system",
                "content": f"Relevant context:\n{context}"
            })
        
        # Add the question
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
        """
        Generate a complete answer
        
        Args:
            question: The question to answer
            context: Additional context
            mode: Operating mode
            
        Returns:
            Generated answer
        """
        # Collect streamed response
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
        """
        Stream answer generation
        
        Args:
            question: The question to answer
            context: Additional context
            mode: Operating mode
            
        Yields:
            Answer chunks
        """
        messages = self._build_prompt(question, context, mode)
        
        # Try OpenAI first
        if self._openai_client:
            try:
                async for chunk in self._stream_openai(messages):
                    yield chunk
                return
            except Exception as e:
                logger.error(f"OpenAI error: {e}")
        
        # Try Anthropic as fallback
        if self._anthropic_client:
            try:
                async for chunk in self._stream_anthropic(messages):
                    yield chunk
                return
            except Exception as e:
                logger.error(f"Anthropic error: {e}")
        
        # No provider available
        yield "Error: No AI provider available. Please check your API keys."
    
    async def _stream_openai(
        self,
        messages: list[Dict[str, str]]
    ) -> AsyncGenerator[str, None]:
        """Stream from OpenAI"""
        try:
            response = await self._openai_client.chat.completions.create(
                model=self.default_model,
                messages=messages,
                max_tokens=settings.max_tokens,
                temperature=settings.temperature,
                stream=True
            )
            
            async for chunk in response:
                if chunk.choices[0].delta.content:
                    yield chunk.choices[0].delta.content
                    
        except Exception as e:
            # Try fallback model
            logger.warning(f"Trying fallback model: {e}")
            response = await self._openai_client.chat.completions.create(
                model=self.fallback_model,
                messages=messages,
                max_tokens=settings.max_tokens,
                temperature=settings.temperature,
                stream=True
            )
            
            async for chunk in response:
                if chunk.choices[0].delta.content:
                    yield chunk.choices[0].delta.content
    
    async def _stream_anthropic(
        self,
        messages: list[Dict[str, str]]
    ) -> AsyncGenerator[str, None]:
        """Stream from Anthropic Claude"""
        # Convert messages format for Anthropic
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
        
        async with self._anthropic_client.messages.stream(
            model="claude-3-opus-20240229",
            max_tokens=settings.max_tokens,
            system=system_content.strip(),
            messages=anthropic_messages
        ) as stream:
            async for text in stream.text_stream:
                yield text
    
    async def shutdown(self):
        """Cleanup"""
        self._openai_client = None
        self._anthropic_client = None
        logger.debug("Answer generator shutdown")

