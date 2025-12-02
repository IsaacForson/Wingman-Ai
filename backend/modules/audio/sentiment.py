"""
Wingman AI - Sentiment Analysis
Real-time sentiment tracking from audio and text
"""

import asyncio
from typing import Optional, Dict, Any, List, Tuple
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from collections import deque
import re
from loguru import logger


class SentimentLevel(str, Enum):
    VERY_POSITIVE = "very_positive"
    POSITIVE = "positive"
    NEUTRAL = "neutral"
    NEGATIVE = "negative"
    VERY_NEGATIVE = "very_negative"


@dataclass
class SentimentResult:
    """Sentiment analysis result"""
    level: SentimentLevel
    score: float  # -1 to 1
    confidence: float  # 0 to 1
    emotions: Dict[str, float]  # emotion -> intensity
    timestamp: datetime = field(default_factory=datetime.now)
    source_text: str = ""


@dataclass
class SentimentTrend:
    """Sentiment trend over time"""
    timestamps: List[datetime]
    scores: List[float]
    average_score: float
    trend_direction: str  # 'improving', 'declining', 'stable'


class SentimentAnalyzer:
    """
    Real-time sentiment analysis for conversations
    Uses lexicon-based approach with emotion detection
    """
    
    def __init__(self, window_size: int = 20):
        self._window_size = window_size
        self._history: deque[SentimentResult] = deque(maxlen=window_size)
        self._ai_analyzer = None
        
        # Sentiment lexicon
        self._positive_words = {
            'great': 0.8, 'excellent': 0.9, 'good': 0.6, 'wonderful': 0.85,
            'amazing': 0.9, 'fantastic': 0.85, 'happy': 0.7, 'love': 0.8,
            'perfect': 0.9, 'awesome': 0.8, 'brilliant': 0.85, 'enjoy': 0.6,
            'excited': 0.75, 'pleased': 0.65, 'satisfied': 0.6, 'impressive': 0.7,
            'helpful': 0.6, 'thank': 0.5, 'appreciate': 0.6, 'agree': 0.4,
            'interesting': 0.5, 'confident': 0.6, 'success': 0.7, 'yes': 0.3
        }
        
        self._negative_words = {
            'bad': -0.6, 'terrible': -0.9, 'awful': -0.85, 'horrible': -0.9,
            'poor': -0.5, 'hate': -0.8, 'sad': -0.6, 'angry': -0.7,
            'frustrated': -0.65, 'disappointed': -0.6, 'annoyed': -0.5,
            'worried': -0.4, 'confused': -0.4, 'difficult': -0.3, 'wrong': -0.5,
            'problem': -0.4, 'issue': -0.3, 'unfortunately': -0.4, 'sorry': -0.3,
            'fail': -0.6, 'failed': -0.6, 'no': -0.2, 'never': -0.3,
            "can't": -0.3, "don't": -0.2, 'not': -0.2
        }
        
        # Emotion patterns
        self._emotion_patterns = {
            'joy': ['happy', 'excited', 'delighted', 'pleased', 'thrilled', 'glad'],
            'confidence': ['confident', 'sure', 'certain', 'definitely', 'absolutely'],
            'interest': ['interesting', 'curious', 'fascinated', 'intrigued'],
            'anxiety': ['worried', 'nervous', 'anxious', 'concerned', 'stressed'],
            'frustration': ['frustrated', 'annoyed', 'irritated', 'bothered'],
            'confusion': ['confused', 'unclear', 'lost', "don't understand"],
            'satisfaction': ['satisfied', 'content', 'fulfilled', 'accomplished']
        }
        
        # Intensifiers and negations
        self._intensifiers = {
            'very': 1.5, 'really': 1.4, 'extremely': 1.8, 'absolutely': 1.7,
            'quite': 1.2, 'somewhat': 0.8, 'slightly': 0.6, 'a bit': 0.7
        }
        
        self._negations = ['not', "n't", 'no', 'never', 'neither', 'nobody', 'nothing']
    
    def set_ai_analyzer(self, analyzer):
        """Set AI-based sentiment analyzer for enhanced analysis"""
        self._ai_analyzer = analyzer
    
    async def analyze(self, text: str) -> SentimentResult:
        """
        Analyze sentiment of text
        
        Args:
            text: Text to analyze
            
        Returns:
            SentimentResult with score, level, and emotions
        """
        if not text.strip():
            return SentimentResult(
                level=SentimentLevel.NEUTRAL,
                score=0.0,
                confidence=0.0,
                emotions={},
                source_text=text
            )
        
        # Normalize text
        text_lower = text.lower()
        words = re.findall(r'\b\w+\b', text_lower)
        
        # Calculate sentiment score
        score = self._calculate_score(text_lower, words)
        
        # Detect emotions
        emotions = self._detect_emotions(text_lower)
        
        # Determine sentiment level
        level = self._score_to_level(score)
        
        # Calculate confidence based on word matches
        confidence = self._calculate_confidence(words)
        
        result = SentimentResult(
            level=level,
            score=score,
            confidence=confidence,
            emotions=emotions,
            source_text=text
        )
        
        # Add to history
        self._history.append(result)
        
        return result
    
    def _calculate_score(self, text: str, words: List[str]) -> float:
        """Calculate sentiment score from text"""
        scores = []
        negation_window = 0
        prev_intensifier = 1.0
        
        for i, word in enumerate(words):
            # Check for negation
            if word in self._negations or word.endswith("n't"):
                negation_window = 3
                continue
            
            # Check for intensifier
            if word in self._intensifiers:
                prev_intensifier = self._intensifiers[word]
                continue
            
            # Get word sentiment
            word_score = 0
            if word in self._positive_words:
                word_score = self._positive_words[word]
            elif word in self._negative_words:
                word_score = self._negative_words[word]
            
            if word_score != 0:
                # Apply negation
                if negation_window > 0:
                    word_score *= -0.5
                
                # Apply intensifier
                word_score *= prev_intensifier
                
                scores.append(word_score)
            
            # Decay negation window and reset intensifier
            if negation_window > 0:
                negation_window -= 1
            prev_intensifier = 1.0
        
        if not scores:
            return 0.0
        
        # Average score, bounded to [-1, 1]
        return max(-1, min(1, sum(scores) / len(scores)))
    
    def _detect_emotions(self, text: str) -> Dict[str, float]:
        """Detect emotions in text"""
        emotions = {}
        
        for emotion, keywords in self._emotion_patterns.items():
            intensity = 0.0
            for keyword in keywords:
                if keyword in text:
                    # Base intensity
                    intensity += 0.5
                    
                    # Check for intensifiers before keyword
                    for intensifier, mult in self._intensifiers.items():
                        if f"{intensifier} {keyword}" in text:
                            intensity *= mult
                            break
            
            if intensity > 0:
                emotions[emotion] = min(1.0, intensity)
        
        return emotions
    
    def _score_to_level(self, score: float) -> SentimentLevel:
        """Convert score to sentiment level"""
        if score >= 0.5:
            return SentimentLevel.VERY_POSITIVE
        elif score >= 0.2:
            return SentimentLevel.POSITIVE
        elif score <= -0.5:
            return SentimentLevel.VERY_NEGATIVE
        elif score <= -0.2:
            return SentimentLevel.NEGATIVE
        else:
            return SentimentLevel.NEUTRAL
    
    def _calculate_confidence(self, words: List[str]) -> float:
        """Calculate confidence based on sentiment word coverage"""
        sentiment_words = 0
        for word in words:
            if word in self._positive_words or word in self._negative_words:
                sentiment_words += 1
        
        # More sentiment words = higher confidence
        coverage = sentiment_words / max(len(words), 1)
        return min(1.0, coverage * 3)  # Scale up since coverage is typically low
    
    def get_current_sentiment(self) -> SentimentResult:
        """Get the current overall sentiment"""
        if not self._history:
            return SentimentResult(
                level=SentimentLevel.NEUTRAL,
                score=0.0,
                confidence=0.0,
                emotions={}
            )
        
        # Weight recent results more heavily
        weights = [0.5 ** i for i in range(len(self._history))]
        weights.reverse()
        
        total_weight = sum(weights)
        weighted_score = sum(
            h.score * w for h, w in zip(self._history, weights)
        ) / total_weight
        
        # Aggregate emotions
        all_emotions: Dict[str, List[float]] = {}
        for result in self._history:
            for emotion, intensity in result.emotions.items():
                if emotion not in all_emotions:
                    all_emotions[emotion] = []
                all_emotions[emotion].append(intensity)
        
        avg_emotions = {
            emotion: sum(values) / len(values)
            for emotion, values in all_emotions.items()
        }
        
        return SentimentResult(
            level=self._score_to_level(weighted_score),
            score=weighted_score,
            confidence=sum(h.confidence for h in self._history) / len(self._history),
            emotions=avg_emotions
        )
    
    def get_trend(self) -> SentimentTrend:
        """Get sentiment trend over recent history"""
        if len(self._history) < 2:
            return SentimentTrend(
                timestamps=[],
                scores=[],
                average_score=0.0,
                trend_direction='stable'
            )
        
        timestamps = [h.timestamp for h in self._history]
        scores = [h.score for h in self._history]
        
        # Calculate trend direction
        recent_half = scores[len(scores)//2:]
        early_half = scores[:len(scores)//2]
        
        recent_avg = sum(recent_half) / len(recent_half) if recent_half else 0
        early_avg = sum(early_half) / len(early_half) if early_half else 0
        
        diff = recent_avg - early_avg
        if diff > 0.1:
            direction = 'improving'
        elif diff < -0.1:
            direction = 'declining'
        else:
            direction = 'stable'
        
        return SentimentTrend(
            timestamps=timestamps,
            scores=scores,
            average_score=sum(scores) / len(scores),
            trend_direction=direction
        )
    
    def get_summary(self) -> Dict[str, Any]:
        """Get summary of sentiment analysis"""
        current = self.get_current_sentiment()
        trend = self.get_trend()
        
        return {
            "current_level": current.level.value,
            "current_score": round(current.score, 2),
            "confidence": round(current.confidence, 2),
            "dominant_emotions": sorted(
                current.emotions.items(),
                key=lambda x: x[1],
                reverse=True
            )[:3],
            "trend": trend.trend_direction,
            "average_score": round(trend.average_score, 2),
            "samples_analyzed": len(self._history)
        }
    
    def reset(self):
        """Reset sentiment history"""
        self._history.clear()

