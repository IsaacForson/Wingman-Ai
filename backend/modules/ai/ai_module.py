"""
Wingman AI - AI Module
Main AI processing orchestrator
"""

from typing import Optional, AsyncGenerator
from loguru import logger

from config import settings
from .question_detector import QuestionDetector
from .answer_generator import AnswerGenerator


class AIModule:
    """
    Main AI processing module
    Handles question detection and answer generation
    """
    
    def __init__(self):
        self.question_detector: Optional[QuestionDetector] = None
        self.answer_generator: Optional[AnswerGenerator] = None
    
    async def initialize(self):
        """Initialize AI components"""
        logger.info("Initializing AI module...")
        
        # Initialize question detector
        self.question_detector = QuestionDetector()
        
        # Initialize answer generator
        self.answer_generator = AnswerGenerator(
            default_model=settings.default_model,
            fallback_model=settings.fallback_model
        )
        await self.answer_generator.initialize()
        
        logger.info("AI module initialized")
    
    async def is_question(self, text: str) -> bool:
        """
        Check if text contains a question
        
        Args:
            text: Text to analyze
            
        Returns:
            True if text contains a question
        """
        if not self.question_detector:
            return False
        return self.question_detector.is_question(text)
    
    async def classify_question(self, text: str) -> dict:
        """
        Classify a question by type
        
        Args:
            text: Question text
            
        Returns:
            Classification result with type and confidence
        """
        if not self.question_detector:
            return {"type": "general", "confidence": 0.5}
        return self.question_detector.classify(text)
    
    async def generate_answer(
        self,
        question: str,
        context: str = "",
        mode: str = "interview"
    ) -> str:
        """
        Generate an answer to a question
        
        Args:
            question: The question to answer
            context: Additional context (from knowledge base, transcript, etc.)
            mode: Operating mode (interview, study, work, research)
            
        Returns:
            Generated answer
        """
        if not self.answer_generator:
            return "AI module not initialized"
        
        return await self.answer_generator.generate(
            question=question,
            context=context,
            mode=mode
        )
    
    async def generate_answer_stream(
        self,
        question: str,
        context: str = "",
        mode: str = "interview",
        conversation_history: list = None
    ) -> AsyncGenerator[str, None]:
        """
        Stream answer generation with conversation history
        
        Args:
            question: The question to answer
            context: Additional context
            mode: Operating mode
            conversation_history: List of previous messages for context
            
        Yields:
            Answer chunks as they're generated
        """
        if not self.answer_generator:
            yield "AI module not initialized"
            return
        
        async for chunk in self.answer_generator.generate_stream(
            question=question,
            context=context,
            mode=mode,
            conversation_history=conversation_history
        ):
            yield chunk
    
    def get_last_used_provider_info(self) -> tuple:
        """Get the provider and model used for the last response"""
        if self.answer_generator:
            return self.answer_generator.get_last_used_info()
        return None, None
    
    async def shutdown(self):
        """Shutdown AI module"""
        if self.answer_generator:
            await self.answer_generator.shutdown()
        logger.info("AI module shutdown")

