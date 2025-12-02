"""
Wingman AI - Practice Mode
Mock interviews, feedback scoring, and skill development
"""

import asyncio
import random
from typing import Optional, List, Dict, Any
from datetime import datetime
from dataclasses import dataclass, field
from enum import Enum
from loguru import logger


class InterviewType(str, Enum):
    BEHAVIORAL = "behavioral"
    TECHNICAL = "technical"
    CODING = "coding"
    SYSTEM_DESIGN = "system_design"
    MIXED = "mixed"


class DifficultyLevel(str, Enum):
    EASY = "easy"
    MEDIUM = "medium"
    HARD = "hard"


@dataclass
class PracticeQuestion:
    """A practice question"""
    id: str
    question: str
    category: str
    type: InterviewType
    difficulty: DifficultyLevel
    hints: List[str] = field(default_factory=list)
    follow_ups: List[str] = field(default_factory=list)
    key_points: List[str] = field(default_factory=list)


@dataclass
class AnswerFeedback:
    """Feedback for a practice answer"""
    score: int  # 1-10
    strengths: List[str]
    improvements: List[str]
    key_points_covered: List[str]
    key_points_missed: List[str]
    follow_up_suggested: bool
    overall_feedback: str


@dataclass
class PracticeSession:
    """A complete practice session"""
    id: str
    type: InterviewType
    difficulty: DifficultyLevel
    started_at: str
    ended_at: Optional[str]
    questions_asked: int
    total_score: int
    answers: List[Dict[str, Any]]


class PracticeMode:
    """
    Mock interview practice with AI feedback
    Supports behavioral, technical, and coding interviews
    """
    
    def __init__(self):
        self._answer_generator = None
        self._current_session: Optional[PracticeSession] = None
        self._current_question: Optional[PracticeQuestion] = None
        self._question_bank = self._load_question_bank()
    
    def set_answer_generator(self, generator):
        """Set reference to AI answer generator"""
        self._answer_generator = generator
    
    def _load_question_bank(self) -> Dict[str, List[PracticeQuestion]]:
        """Load built-in practice questions"""
        return {
            "behavioral": [
                PracticeQuestion(
                    id="bh1",
                    question="Tell me about a time you faced a challenging situation at work and how you handled it.",
                    category="problem_solving",
                    type=InterviewType.BEHAVIORAL,
                    difficulty=DifficultyLevel.MEDIUM,
                    hints=["Use the STAR method", "Focus on your specific actions"],
                    key_points=["Specific situation", "Actions taken", "Measurable results", "Lessons learned"]
                ),
                PracticeQuestion(
                    id="bh2",
                    question="Describe a time when you had to work with a difficult team member.",
                    category="teamwork",
                    type=InterviewType.BEHAVIORAL,
                    difficulty=DifficultyLevel.MEDIUM,
                    hints=["Stay professional", "Focus on resolution"],
                    key_points=["Conflict description", "Communication approach", "Resolution", "Relationship outcome"]
                ),
                PracticeQuestion(
                    id="bh3",
                    question="Tell me about your greatest professional achievement.",
                    category="accomplishments",
                    type=InterviewType.BEHAVIORAL,
                    difficulty=DifficultyLevel.EASY,
                    hints=["Quantify your impact", "Explain why it mattered"],
                    key_points=["Context", "Your role", "Quantifiable results", "Impact"]
                ),
                PracticeQuestion(
                    id="bh4",
                    question="How do you handle tight deadlines and pressure?",
                    category="stress_management",
                    type=InterviewType.BEHAVIORAL,
                    difficulty=DifficultyLevel.EASY,
                    hints=["Give specific examples", "Show your strategies"],
                    key_points=["Prioritization", "Time management", "Stress management", "Example"]
                ),
                PracticeQuestion(
                    id="bh5",
                    question="Describe a time when you failed. What did you learn?",
                    category="growth",
                    type=InterviewType.BEHAVIORAL,
                    difficulty=DifficultyLevel.HARD,
                    hints=["Be honest", "Focus on learning"],
                    key_points=["Honest failure description", "Accountability", "Lessons learned", "How you've grown"]
                ),
            ],
            "technical": [
                PracticeQuestion(
                    id="tc1",
                    question="Explain the difference between a stack and a queue.",
                    category="data_structures",
                    type=InterviewType.TECHNICAL,
                    difficulty=DifficultyLevel.EASY,
                    hints=["Think about LIFO vs FIFO"],
                    key_points=["LIFO vs FIFO", "Use cases", "Operations complexity"]
                ),
                PracticeQuestion(
                    id="tc2",
                    question="What is the difference between SQL and NoSQL databases?",
                    category="databases",
                    type=InterviewType.TECHNICAL,
                    difficulty=DifficultyLevel.MEDIUM,
                    hints=["Consider structure, scalability, use cases"],
                    key_points=["Schema differences", "Scalability", "ACID vs BASE", "Use cases"]
                ),
                PracticeQuestion(
                    id="tc3",
                    question="Explain how HTTP works. What happens when you type a URL in a browser?",
                    category="networking",
                    type=InterviewType.TECHNICAL,
                    difficulty=DifficultyLevel.MEDIUM,
                    hints=["DNS, TCP, HTTP request/response"],
                    key_points=["DNS resolution", "TCP handshake", "HTTP request", "Response rendering"]
                ),
                PracticeQuestion(
                    id="tc4",
                    question="What is the difference between processes and threads?",
                    category="operating_systems",
                    type=InterviewType.TECHNICAL,
                    difficulty=DifficultyLevel.MEDIUM,
                    hints=["Think about memory, communication, overhead"],
                    key_points=["Memory space", "Communication", "Overhead", "Use cases"]
                ),
            ],
            "coding": [
                PracticeQuestion(
                    id="cd1",
                    question="Write a function to reverse a string.",
                    category="strings",
                    type=InterviewType.CODING,
                    difficulty=DifficultyLevel.EASY,
                    hints=["Consider edge cases", "Think about in-place vs new string"],
                    key_points=["Correct logic", "Edge cases", "Time complexity", "Space complexity"]
                ),
                PracticeQuestion(
                    id="cd2",
                    question="Implement a function to find if a linked list has a cycle.",
                    category="linked_lists",
                    type=InterviewType.CODING,
                    difficulty=DifficultyLevel.MEDIUM,
                    hints=["Floyd's cycle detection", "Two pointers"],
                    key_points=["Algorithm choice", "Edge cases", "Optimal solution", "Code quality"]
                ),
                PracticeQuestion(
                    id="cd3",
                    question="Given an array of integers, find two numbers that add up to a target sum.",
                    category="arrays",
                    type=InterviewType.CODING,
                    difficulty=DifficultyLevel.EASY,
                    hints=["Hash map for O(n)", "Sorted array + two pointers"],
                    key_points=["Multiple approaches", "Optimal O(n) solution", "Edge cases", "Clean code"]
                ),
            ],
            "system_design": [
                PracticeQuestion(
                    id="sd1",
                    question="Design a URL shortening service like bit.ly.",
                    category="system_design",
                    type=InterviewType.SYSTEM_DESIGN,
                    difficulty=DifficultyLevel.MEDIUM,
                    hints=["Start with requirements", "Consider scale", "Database choice"],
                    key_points=["Requirements gathering", "API design", "Database schema", "Scalability"]
                ),
                PracticeQuestion(
                    id="sd2",
                    question="Design a rate limiter.",
                    category="system_design",
                    type=InterviewType.SYSTEM_DESIGN,
                    difficulty=DifficultyLevel.MEDIUM,
                    hints=["Token bucket, sliding window", "Distributed considerations"],
                    key_points=["Algorithm choice", "Distributed system", "Storage", "Edge cases"]
                ),
            ]
        }
    
    async def start_session(
        self,
        interview_type: InterviewType = InterviewType.MIXED,
        difficulty: DifficultyLevel = DifficultyLevel.MEDIUM
    ) -> PracticeSession:
        """Start a new practice session"""
        session_id = f"practice_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        
        self._current_session = PracticeSession(
            id=session_id,
            type=interview_type,
            difficulty=difficulty,
            started_at=datetime.now().isoformat(),
            ended_at=None,
            questions_asked=0,
            total_score=0,
            answers=[]
        )
        
        logger.info(f"Practice session started: {session_id}")
        return self._current_session
    
    async def end_session(self) -> Optional[Dict[str, Any]]:
        """End current practice session"""
        if not self._current_session:
            return None
        
        self._current_session.ended_at = datetime.now().isoformat()
        
        # Calculate average score
        avg_score = 0
        if self._current_session.questions_asked > 0:
            avg_score = self._current_session.total_score / self._current_session.questions_asked
        
        result = {
            "session_id": self._current_session.id,
            "type": self._current_session.type.value,
            "difficulty": self._current_session.difficulty.value,
            "duration": self._calculate_duration(),
            "questions_asked": self._current_session.questions_asked,
            "average_score": round(avg_score, 1),
            "answers": self._current_session.answers
        }
        
        self._current_session = None
        self._current_question = None
        
        return result
    
    def _calculate_duration(self) -> int:
        """Calculate session duration in seconds"""
        if not self._current_session:
            return 0
        
        started = datetime.fromisoformat(self._current_session.started_at)
        ended = datetime.now()
        return int((ended - started).total_seconds())
    
    async def get_next_question(self) -> Optional[PracticeQuestion]:
        """Get the next practice question"""
        if not self._current_session:
            return None
        
        # Select question based on session type and difficulty
        available_questions = []
        
        if self._current_session.type == InterviewType.MIXED:
            for questions in self._question_bank.values():
                available_questions.extend(questions)
        else:
            type_key = self._current_session.type.value
            if type_key in self._question_bank:
                available_questions = self._question_bank[type_key]
        
        # Filter by difficulty
        available_questions = [
            q for q in available_questions
            if q.difficulty == self._current_session.difficulty
        ]
        
        if not available_questions:
            # Fallback to any difficulty
            if self._current_session.type == InterviewType.MIXED:
                for questions in self._question_bank.values():
                    available_questions.extend(questions)
            else:
                type_key = self._current_session.type.value
                if type_key in self._question_bank:
                    available_questions = self._question_bank[type_key]
        
        if available_questions:
            self._current_question = random.choice(available_questions)
            self._current_session.questions_asked += 1
            return self._current_question
        
        return None
    
    async def evaluate_answer(
        self,
        answer: str,
        question: Optional[PracticeQuestion] = None
    ) -> AnswerFeedback:
        """Evaluate a practice answer using AI"""
        question = question or self._current_question
        
        if not question:
            return AnswerFeedback(
                score=0,
                strengths=[],
                improvements=["No question context provided"],
                key_points_covered=[],
                key_points_missed=[],
                follow_up_suggested=False,
                overall_feedback="Cannot evaluate without a question."
            )
        
        # Build evaluation prompt
        key_points_str = "\n".join(f"- {kp}" for kp in question.key_points)
        
        prompt = f"""You are an expert interview coach. Evaluate the following answer to an interview question.

Question Type: {question.type.value}
Difficulty: {question.difficulty.value}

Question: {question.question}

Key Points to Cover:
{key_points_str}

Candidate's Answer:
{answer}

Please evaluate the answer and provide:
1. Score (1-10)
2. Strengths (bullet points)
3. Areas for Improvement (bullet points)
4. Key Points Covered (from the list above)
5. Key Points Missed (from the list above)
6. Overall Feedback (2-3 sentences)

Format your response as:
SCORE: [number]
STRENGTHS:
- [strength 1]
- [strength 2]
IMPROVEMENTS:
- [improvement 1]
- [improvement 2]
COVERED:
- [point 1]
MISSED:
- [point 1]
FEEDBACK: [your feedback]"""

        try:
            if self._answer_generator:
                evaluation = await self._answer_generator.generate(
                    prompt,
                    context="",
                    mode="practice"
                )
                feedback = self._parse_evaluation(evaluation, question)
            else:
                # Fallback to basic evaluation
                feedback = self._basic_evaluation(answer, question)
            
            # Store in session
            if self._current_session:
                self._current_session.total_score += feedback.score
                self._current_session.answers.append({
                    "question": question.question,
                    "answer": answer,
                    "score": feedback.score,
                    "feedback": feedback.overall_feedback
                })
            
            return feedback
            
        except Exception as e:
            logger.error(f"Evaluation error: {e}")
            return self._basic_evaluation(answer, question)
    
    def _parse_evaluation(self, evaluation: str, question: PracticeQuestion) -> AnswerFeedback:
        """Parse AI evaluation response"""
        import re
        
        # Extract score
        score_match = re.search(r'SCORE:\s*(\d+)', evaluation)
        score = int(score_match.group(1)) if score_match else 5
        score = max(1, min(10, score))  # Clamp to 1-10
        
        # Extract lists
        def extract_list(pattern: str) -> List[str]:
            match = re.search(pattern, evaluation, re.DOTALL)
            if match:
                items = re.findall(r'-\s*(.+?)(?=\n|$)', match.group(1))
                return [item.strip() for item in items if item.strip()]
            return []
        
        strengths = extract_list(r'STRENGTHS:(.*?)(?=IMPROVEMENTS:|COVERED:|$)')
        improvements = extract_list(r'IMPROVEMENTS:(.*?)(?=COVERED:|MISSED:|$)')
        covered = extract_list(r'COVERED:(.*?)(?=MISSED:|FEEDBACK:|$)')
        missed = extract_list(r'MISSED:(.*?)(?=FEEDBACK:|$)')
        
        # Extract feedback
        feedback_match = re.search(r'FEEDBACK:\s*(.+?)$', evaluation, re.DOTALL)
        overall_feedback = feedback_match.group(1).strip() if feedback_match else "Good effort!"
        
        return AnswerFeedback(
            score=score,
            strengths=strengths or ["Answer provided"],
            improvements=improvements or ["Keep practicing!"],
            key_points_covered=covered,
            key_points_missed=missed,
            follow_up_suggested=score < 7,
            overall_feedback=overall_feedback
        )
    
    def _basic_evaluation(self, answer: str, question: PracticeQuestion) -> AnswerFeedback:
        """Basic evaluation without AI"""
        answer_lower = answer.lower()
        
        # Check key points
        covered = []
        missed = []
        
        for kp in question.key_points:
            # Simple keyword matching
            keywords = kp.lower().split()
            if any(kw in answer_lower for kw in keywords if len(kw) > 3):
                covered.append(kp)
            else:
                missed.append(kp)
        
        # Calculate score based on coverage
        if question.key_points:
            coverage_score = (len(covered) / len(question.key_points)) * 10
        else:
            coverage_score = 5
        
        # Adjust for length
        word_count = len(answer.split())
        if word_count < 20:
            coverage_score -= 2
        elif word_count > 300:
            coverage_score += 1
        
        score = max(1, min(10, int(coverage_score)))
        
        return AnswerFeedback(
            score=score,
            strengths=["Answer provided", f"Covered {len(covered)} key points"],
            improvements=[f"Consider addressing: {kp}" for kp in missed[:2]],
            key_points_covered=covered,
            key_points_missed=missed,
            follow_up_suggested=score < 7,
            overall_feedback=f"You covered {len(covered)}/{len(question.key_points)} key points. {'Good job!' if score >= 7 else 'Keep practicing!'}"
        )
    
    async def get_hint(self) -> Optional[str]:
        """Get a hint for the current question"""
        if not self._current_question or not self._current_question.hints:
            return None
        
        return random.choice(self._current_question.hints)
    
    def get_session_stats(self) -> Optional[Dict[str, Any]]:
        """Get current session statistics"""
        if not self._current_session:
            return None
        
        avg_score = 0
        if self._current_session.questions_asked > 0:
            avg_score = self._current_session.total_score / self._current_session.questions_asked
        
        return {
            "questions_asked": self._current_session.questions_asked,
            "average_score": round(avg_score, 1),
            "duration_seconds": self._calculate_duration()
        }
    
    @property
    def current_session(self) -> Optional[PracticeSession]:
        return self._current_session
    
    @property
    def current_question(self) -> Optional[PracticeQuestion]:
        return self._current_question

