"""
Wingman AI - STAR Method Coach
Coaching for behavioral interview answers using STAR framework
"""

from typing import Optional, Dict, Any, List
from dataclasses import dataclass, field
from enum import Enum
from loguru import logger


class STARComponent(str, Enum):
    SITUATION = "situation"
    TASK = "task"
    ACTION = "action"
    RESULT = "result"


@dataclass
class STARAnalysis:
    """Analysis of a STAR-formatted answer"""
    situation_score: int  # 0-100
    task_score: int
    action_score: int
    result_score: int
    overall_score: int
    
    situation_present: bool
    task_present: bool
    action_present: bool
    result_present: bool
    
    situation_feedback: str
    task_feedback: str
    action_feedback: str
    result_feedback: str
    
    strengths: List[str]
    improvements: List[str]
    example_structure: str


@dataclass
class STARPrompt:
    """A prompt to help structure STAR response"""
    component: STARComponent
    question: str
    tips: List[str]
    example: str


class STARCoach:
    """
    STAR Method coaching for behavioral interviews
    Helps users structure their answers effectively
    """
    
    def __init__(self):
        self._answer_generator = None
        
        # Keywords that indicate each STAR component
        self._situation_keywords = [
            'when i was', 'at my previous', 'in my role', 'during', 
            'there was a time', 'one instance', 'at company', 'while working',
            'the context was', 'background', 'setting'
        ]
        
        self._task_keywords = [
            'my responsibility', 'i needed to', 'i was asked', 'my goal',
            'the objective', 'challenge was', 'problem was', 'i had to',
            'was tasked with', 'assigned to', 'expected to'
        ]
        
        self._action_keywords = [
            'i decided', 'i implemented', 'i created', 'i led',
            'first i', 'then i', 'i took', 'i organized', 'i developed',
            'my approach', 'i initiated', 'i collaborated', 'i analyzed'
        ]
        
        self._result_keywords = [
            'as a result', 'outcome was', 'we achieved', 'this led to',
            'impact was', 'resulted in', 'improved by', 'reduced by',
            'increased', 'saved', 'learned', 'received recognition'
        ]
        
        # Common behavioral question types
        self._question_types = {
            'leadership': ['lead', 'managed', 'directed', 'motivated'],
            'teamwork': ['team', 'collaborate', 'together', 'group'],
            'conflict': ['conflict', 'disagree', 'difficult person', 'challenge'],
            'problem_solving': ['problem', 'challenge', 'overcome', 'solution'],
            'failure': ['fail', 'mistake', 'wrong', 'learn from'],
            'achievement': ['proud', 'accomplish', 'success', 'achieve'],
            'pressure': ['pressure', 'deadline', 'stress', 'tight'],
            'initiative': ['initiative', 'proactive', 'beyond', 'extra']
        }
    
    def set_answer_generator(self, generator):
        """Set AI answer generator for enhanced feedback"""
        self._answer_generator = generator
    
    async def analyze_answer(
        self,
        question: str,
        answer: str
    ) -> STARAnalysis:
        """
        Analyze an answer for STAR method compliance
        
        Args:
            question: The behavioral question asked
            answer: User's response
        """
        answer_lower = answer.lower()
        
        # Check presence of each component
        situation_present = self._has_component(answer_lower, self._situation_keywords)
        task_present = self._has_component(answer_lower, self._task_keywords)
        action_present = self._has_component(answer_lower, self._action_keywords)
        result_present = self._has_component(answer_lower, self._result_keywords)
        
        # Score each component
        situation_score = self._score_component(answer_lower, self._situation_keywords, 'situation')
        task_score = self._score_component(answer_lower, self._task_keywords, 'task')
        action_score = self._score_component(answer_lower, self._action_keywords, 'action')
        result_score = self._score_component(answer_lower, self._result_keywords, 'result')
        
        # Calculate overall score (weighted - action and result are most important)
        overall_score = int(
            situation_score * 0.2 +
            task_score * 0.2 +
            action_score * 0.35 +
            result_score * 0.25
        )
        
        # Generate feedback for each component
        situation_feedback = self._get_component_feedback('situation', situation_present, situation_score)
        task_feedback = self._get_component_feedback('task', task_present, task_score)
        action_feedback = self._get_component_feedback('action', action_present, action_score)
        result_feedback = self._get_component_feedback('result', result_present, result_score)
        
        # Identify strengths and improvements
        strengths, improvements = self._identify_feedback(
            situation_present, task_present, action_present, result_present,
            situation_score, task_score, action_score, result_score
        )
        
        # Generate example structure
        example_structure = self._generate_example_structure(question)
        
        return STARAnalysis(
            situation_score=situation_score,
            task_score=task_score,
            action_score=action_score,
            result_score=result_score,
            overall_score=overall_score,
            situation_present=situation_present,
            task_present=task_present,
            action_present=action_present,
            result_present=result_present,
            situation_feedback=situation_feedback,
            task_feedback=task_feedback,
            action_feedback=action_feedback,
            result_feedback=result_feedback,
            strengths=strengths,
            improvements=improvements,
            example_structure=example_structure
        )
    
    def _has_component(self, text: str, keywords: List[str]) -> bool:
        """Check if text contains any keywords for a component"""
        return any(kw in text for kw in keywords)
    
    def _score_component(self, text: str, keywords: List[str], component: str) -> int:
        """Score a component based on keyword presence and depth"""
        score = 0
        keyword_count = sum(1 for kw in keywords if kw in text)
        
        # Base score from keyword presence
        if keyword_count == 0:
            return 0
        elif keyword_count == 1:
            score = 40
        elif keyword_count == 2:
            score = 60
        else:
            score = 75
        
        # Bonus for specificity
        # Check for numbers (quantification)
        import re
        numbers = re.findall(r'\d+', text)
        if numbers:
            score += 10
        
        # Check for specific details
        if component == 'result' and any(w in text for w in ['%', 'percent', 'increased', 'decreased', 'saved']):
            score += 15
        
        if component == 'action' and len(text.split()) > 50:  # Detailed actions
            score += 10
        
        return min(100, score)
    
    def _get_component_feedback(self, component: str, present: bool, score: int) -> str:
        """Generate feedback for a specific STAR component"""
        
        if not present:
            feedback_missing = {
                'situation': "Missing context. Start by setting the scene - where and when did this happen?",
                'task': "Unclear what your responsibility was. Explain what you needed to accomplish.",
                'action': "Your specific actions are not clear. Detail the steps YOU took.",
                'result': "Missing outcome. What was the measurable result of your actions?"
            }
            return feedback_missing[component]
        
        if score >= 80:
            return f"Excellent {component}! Clear and well-detailed."
        elif score >= 60:
            return f"Good {component}, but could use more specific details."
        elif score >= 40:
            return f"Basic {component} present. Add more context and specifics."
        else:
            return f"Weak {component}. Needs significant improvement."
    
    def _identify_feedback(
        self,
        sit_present: bool, task_present: bool, act_present: bool, res_present: bool,
        sit_score: int, task_score: int, act_score: int, res_score: int
    ) -> tuple[List[str], List[str]]:
        """Identify strengths and areas for improvement"""
        
        strengths = []
        improvements = []
        
        # Situation
        if sit_present and sit_score >= 60:
            strengths.append("Good context setting")
        elif not sit_present:
            improvements.append("Add clear situation/context")
        
        # Task
        if task_present and task_score >= 60:
            strengths.append("Clear problem/task definition")
        elif not task_present:
            improvements.append("Clarify your specific responsibility")
        
        # Action
        if act_present and act_score >= 60:
            strengths.append("Detailed personal actions")
        elif not act_present:
            improvements.append("Focus more on YOUR specific actions")
        elif act_score < 60:
            improvements.append("Add more detail to your actions")
        
        # Result
        if res_present and res_score >= 60:
            strengths.append("Clear outcomes with impact")
        elif not res_present:
            improvements.append("Include measurable results")
        elif res_score < 60:
            improvements.append("Quantify your results (%, numbers, impact)")
        
        # General feedback
        components_present = sum([sit_present, task_present, act_present, res_present])
        if components_present == 4:
            strengths.append("Complete STAR structure")
        
        avg_score = (sit_score + task_score + act_score + res_score) / 4
        if avg_score >= 70:
            strengths.append("Well-structured response")
        
        return strengths, improvements
    
    def _generate_example_structure(self, question: str) -> str:
        """Generate an example STAR structure for the question"""
        
        # Determine question type
        question_lower = question.lower()
        q_type = 'general'
        
        for type_name, keywords in self._question_types.items():
            if any(kw in question_lower for kw in keywords):
                q_type = type_name
                break
        
        structures = {
            'leadership': """
**Situation**: "In my role as [position] at [company], our team was facing [challenge]..."
**Task**: "I was responsible for leading the team to [specific goal]..."
**Action**: "I implemented a new approach by first [action 1], then [action 2]..."
**Result**: "As a result, we achieved [specific outcome], improving [metric] by [X%]..."
""",
            'conflict': """
**Situation**: "While working on [project] at [company], there was a disagreement about [topic]..."
**Task**: "I needed to resolve this conflict while maintaining team productivity..."
**Action**: "I scheduled a meeting to understand all perspectives, then [specific steps]..."
**Result**: "We reached a consensus that [outcome], and the project was completed [result]..."
""",
            'failure': """
**Situation**: "During [project/time] at [company], I made a mistake when [what happened]..."
**Task**: "I needed to address the issue and prevent it from happening again..."
**Action**: "I immediately [corrective action], then implemented [preventive measure]..."
**Result**: "I learned [lesson], and since then [positive outcome from learning]..."
""",
            'achievement': """
**Situation**: "At [company], we had an opportunity to [context]..."
**Task**: "I took on the challenge of [specific goal]..."
**Action**: "I developed a plan that included [action 1], [action 2], and [action 3]..."
**Result**: "This resulted in [quantified achievement], and I was recognized for [recognition]..."
""",
            'general': """
**Situation**: Set the scene - where, when, what was the context?
**Task**: What was your specific responsibility or challenge?
**Action**: What steps did YOU personally take? (Use "I" not "we")
**Result**: What was the outcome? Include numbers/metrics if possible.
"""
        }
        
        return structures.get(q_type, structures['general'])
    
    def get_star_prompts(self, question: str) -> List[STARPrompt]:
        """Get prompting questions to help user build STAR response"""
        
        return [
            STARPrompt(
                component=STARComponent.SITUATION,
                question="What was the context? Where and when did this happen?",
                tips=[
                    "Briefly describe your role and the company",
                    "Set up the scenario in 2-3 sentences",
                    "Include relevant background information"
                ],
                example="In my role as a software engineer at XYZ Corp, our team was tasked with..."
            ),
            STARPrompt(
                component=STARComponent.TASK,
                question="What was your specific responsibility or goal?",
                tips=[
                    "Clarify what YOU were expected to do",
                    "Explain the challenge or problem",
                    "Make your role clear"
                ],
                example="I was responsible for leading the migration of our legacy system..."
            ),
            STARPrompt(
                component=STARComponent.ACTION,
                question="What specific actions did YOU take?",
                tips=[
                    "Use 'I' not 'we' - focus on YOUR contribution",
                    "Break down into specific steps",
                    "Explain your reasoning",
                    "This should be the longest part"
                ],
                example="First, I analyzed the existing system... Then, I created a detailed plan... I also coordinated with..."
            ),
            STARPrompt(
                component=STARComponent.RESULT,
                question="What was the outcome? What did you achieve or learn?",
                tips=[
                    "Quantify results when possible (%, $, time saved)",
                    "Mention recognition or feedback received",
                    "Include what you learned",
                    "Connect back to the original challenge"
                ],
                example="As a result, we reduced processing time by 40%, saving the company $50K annually. I also learned..."
            )
        ]
    
    def get_common_mistakes(self) -> List[Dict[str, str]]:
        """Get common STAR method mistakes and how to avoid them"""
        
        return [
            {
                "mistake": "Being too vague",
                "fix": "Use specific details, numbers, and concrete examples"
            },
            {
                "mistake": "Using 'we' instead of 'I'",
                "fix": "Focus on YOUR specific contributions, even in team projects"
            },
            {
                "mistake": "Skipping the Result",
                "fix": "Always include outcomes, even if the project didn't succeed"
            },
            {
                "mistake": "Rambling or going off-topic",
                "fix": "Keep answers to 2-3 minutes, stay focused on the question"
            },
            {
                "mistake": "Not quantifying results",
                "fix": "Include numbers: percentages, dollar amounts, time saved"
            },
            {
                "mistake": "Being too modest",
                "fix": "Own your achievements - you're selling yourself!"
            }
        ]

