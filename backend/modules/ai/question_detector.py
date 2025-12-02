"""
Wingman AI - Question Detector
Detect and classify questions from text
"""

import re
from typing import Dict, Any, List
from dataclasses import dataclass
from enum import Enum
from loguru import logger


class QuestionType(str, Enum):
    """Types of questions"""
    TECHNICAL = "technical"
    BEHAVIORAL = "behavioral"
    CODING = "coding"
    MCQ = "mcq"
    CONCEPTUAL = "conceptual"
    DEFINITION = "definition"
    COMPARISON = "comparison"
    SCENARIO = "scenario"
    GENERAL = "general"


@dataclass
class QuestionClassification:
    """Question classification result"""
    type: QuestionType
    confidence: float
    keywords: List[str]
    is_follow_up: bool = False


class QuestionDetector:
    """
    Detects and classifies questions from text
    Uses pattern matching and keyword analysis
    """
    
    def __init__(self):
        # Question indicators
        self._question_patterns = [
            r'\?$',  # Ends with question mark
            r'^(what|who|where|when|why|how|which|whose|whom)\s',  # WH-questions
            r'^(is|are|was|were|do|does|did|can|could|would|should|will|have|has|had)\s',  # Yes/No questions
            r'^(tell me|explain|describe|define|compare|discuss|elaborate)\s',  # Imperative questions
            r'^(can you|could you|would you|please)\s',  # Polite requests
        ]
        
        # Compile patterns
        self._compiled_patterns = [
            re.compile(p, re.IGNORECASE) for p in self._question_patterns
        ]
        
        # Keywords for classification
        self._type_keywords = {
            QuestionType.TECHNICAL: [
                'implement', 'algorithm', 'database', 'api', 'system design',
                'architecture', 'optimize', 'performance', 'scalable', 'debug',
                'framework', 'library', 'protocol', 'server', 'client',
                'cache', 'memory', 'thread', 'async', 'sync'
            ],
            QuestionType.BEHAVIORAL: [
                'tell me about a time', 'describe a situation', 'give an example',
                'how did you handle', 'what would you do', 'challenging', 'conflict',
                'teamwork', 'leadership', 'mistake', 'failure', 'success',
                'strength', 'weakness', 'accomplish', 'proud', 'difficult'
            ],
            QuestionType.CODING: [
                'write a function', 'implement', 'code', 'program', 'algorithm',
                'data structure', 'array', 'linked list', 'tree', 'graph',
                'sort', 'search', 'binary', 'recursive', 'iterate', 'complexity',
                'time complexity', 'space complexity', 'big o', 'leetcode'
            ],
            QuestionType.MCQ: [
                'which of the following', 'select the correct', 'choose',
                'a)', 'b)', 'c)', 'd)', 'option a', 'option b',
                'all of the above', 'none of the above', 'true or false'
            ],
            QuestionType.CONCEPTUAL: [
                'concept', 'principle', 'theory', 'fundamental', 'basis',
                'understand', 'underlying', 'core', 'essential'
            ],
            QuestionType.DEFINITION: [
                'what is', 'define', 'meaning of', 'definition', 'what are',
                'what does', 'explain what'
            ],
            QuestionType.COMPARISON: [
                'difference between', 'compare', 'versus', 'vs', 'similarities',
                'pros and cons', 'advantages', 'disadvantages', 'better',
                'which is better', 'prefer'
            ],
            QuestionType.SCENARIO: [
                'scenario', 'situation', 'imagine', 'suppose', 'assume',
                'given that', 'in this case', 'what if'
            ]
        }
    
    def is_question(self, text: str) -> bool:
        """
        Check if text contains a question
        
        Args:
            text: Text to analyze
            
        Returns:
            True if text appears to be a question
        """
        if not text or len(text.strip()) < 5:
            return False
        
        text = text.strip()
        
        # Check against patterns
        for pattern in self._compiled_patterns:
            if pattern.search(text):
                return True
        
        # Check for imperative statements that are questions in disguise
        imperative_starters = [
            'tell me', 'explain', 'describe', 'walk me through',
            'give me', 'show me', 'help me understand'
        ]
        text_lower = text.lower()
        for starter in imperative_starters:
            if text_lower.startswith(starter):
                return True
        
        return False
    
    def classify(self, text: str) -> Dict[str, Any]:
        """
        Classify a question by type
        
        Args:
            text: Question text
            
        Returns:
            Classification result
        """
        text_lower = text.lower()
        
        # Score each type based on keyword matches
        scores = {}
        matched_keywords = {}
        
        for q_type, keywords in self._type_keywords.items():
            matches = [kw for kw in keywords if kw in text_lower]
            scores[q_type] = len(matches)
            matched_keywords[q_type] = matches
        
        # Find the type with highest score
        if scores:
            best_type = max(scores, key=scores.get)
            max_score = scores[best_type]
            
            if max_score > 0:
                # Normalize confidence based on keyword matches
                confidence = min(0.9, 0.5 + (max_score * 0.1))
                
                return {
                    "type": best_type.value,
                    "confidence": confidence,
                    "keywords": matched_keywords[best_type],
                    "is_follow_up": self._is_follow_up(text)
                }
        
        # Default to general question
        return {
            "type": QuestionType.GENERAL.value,
            "confidence": 0.5,
            "keywords": [],
            "is_follow_up": self._is_follow_up(text)
        }
    
    def _is_follow_up(self, text: str) -> bool:
        """Check if this appears to be a follow-up question"""
        follow_up_indicators = [
            'also', 'and what about', 'what else', 'can you elaborate',
            'more specifically', 'building on that', 'related to that',
            'in addition', 'furthermore'
        ]
        
        text_lower = text.lower()
        return any(indicator in text_lower for indicator in follow_up_indicators)
    
    def extract_code_question(self, text: str) -> Dict[str, Any]:
        """
        Extract structured information from a coding question
        
        Args:
            text: The question text
            
        Returns:
            Structured question info
        """
        result = {
            "raw_text": text,
            "requirements": [],
            "constraints": [],
            "examples": [],
            "expected_output_type": None
        }
        
        # Extract constraints (e.g., "O(n) time", "in-place")
        constraint_patterns = [
            r'O\([^)]+\)',  # Big O notation
            r'in[- ]place',
            r'without using',
            r'only using',
            r'at most \d+',
            r'at least \d+'
        ]
        
        for pattern in constraint_patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            result["constraints"].extend(matches)
        
        # Extract examples (look for input/output pairs)
        example_pattern = r'(?:input|example)[:\s]*([^\n]+)[\s\n]*(?:output)[:\s]*([^\n]+)'
        examples = re.findall(example_pattern, text, re.IGNORECASE)
        for inp, out in examples:
            result["examples"].append({"input": inp.strip(), "output": out.strip()})
        
        return result
    
    def extract_mcq_options(self, text: str) -> Dict[str, Any]:
        """
        Extract MCQ options from text
        
        Args:
            text: Text containing MCQ
            
        Returns:
            Structured MCQ info
        """
        result = {
            "question": "",
            "options": [],
            "option_format": None
        }
        
        # Try different option formats
        option_patterns = [
            (r'([A-D])\)\s*([^\n]+)', 'letter_paren'),  # A) Option
            (r'([A-D])\.\s*([^\n]+)', 'letter_dot'),     # A. Option
            (r'([1-4])\)\s*([^\n]+)', 'number_paren'),   # 1) Option
            (r'([1-4])\.\s*([^\n]+)', 'number_dot'),     # 1. Option
        ]
        
        for pattern, format_type in option_patterns:
            matches = re.findall(pattern, text)
            if matches and len(matches) >= 2:
                result["options"] = [{"label": m[0], "text": m[1].strip()} for m in matches]
                result["option_format"] = format_type
                
                # Extract question (text before first option)
                first_option_match = re.search(pattern, text)
                if first_option_match:
                    result["question"] = text[:first_option_match.start()].strip()
                break
        
        return result

