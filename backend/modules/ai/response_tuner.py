"""
Wingman AI - Response Tuner
Fine-tune AI response styles based on user preferences
"""

from typing import Optional, Dict, Any, List
from dataclasses import dataclass, field
from enum import Enum
from loguru import logger


class ResponseLength(str, Enum):
    CONCISE = "concise"      # 1-2 sentences
    BALANCED = "balanced"    # 2-4 sentences
    DETAILED = "detailed"    # Full explanation


class ResponseTone(str, Enum):
    PROFESSIONAL = "professional"
    CASUAL = "casual"
    ACADEMIC = "academic"
    FRIENDLY = "friendly"
    DIRECT = "direct"


class ResponseFormat(str, Enum):
    PROSE = "prose"          # Normal paragraphs
    BULLET_POINTS = "bullet_points"  # Bullet list
    NUMBERED = "numbered"    # Numbered list
    STRUCTURED = "structured"  # Headers + sections


@dataclass
class ResponseStyle:
    """User's preferred response style"""
    length: ResponseLength = ResponseLength.BALANCED
    tone: ResponseTone = ResponseTone.PROFESSIONAL
    format: ResponseFormat = ResponseFormat.PROSE
    include_examples: bool = True
    include_code_comments: bool = True
    technical_level: int = 3  # 1-5 scale
    use_analogies: bool = False
    prefer_step_by_step: bool = False
    highlight_key_points: bool = True
    
    # Custom instructions
    custom_prefix: str = ""  # Added to start of every response
    custom_suffix: str = ""  # Added to end of every response
    custom_instructions: str = ""  # Additional instructions for AI


@dataclass  
class ModeStyle:
    """Style settings per operating mode"""
    mode: str
    style: ResponseStyle


class ResponseTuner:
    """
    Tunes AI responses based on user preferences
    Can be customized per mode (interview, study, work, etc.)
    """
    
    def __init__(self):
        # Default style
        self._default_style = ResponseStyle()
        
        # Mode-specific styles
        self._mode_styles: Dict[str, ResponseStyle] = {
            'interview': ResponseStyle(
                length=ResponseLength.BALANCED,
                tone=ResponseTone.PROFESSIONAL,
                format=ResponseFormat.PROSE,
                include_examples=True,
                prefer_step_by_step=True,
                highlight_key_points=True
            ),
            'study': ResponseStyle(
                length=ResponseLength.DETAILED,
                tone=ResponseTone.ACADEMIC,
                format=ResponseFormat.STRUCTURED,
                include_examples=True,
                use_analogies=True,
                prefer_step_by_step=True
            ),
            'work': ResponseStyle(
                length=ResponseLength.CONCISE,
                tone=ResponseTone.DIRECT,
                format=ResponseFormat.BULLET_POINTS,
                include_examples=False,
                highlight_key_points=True
            ),
            'meeting': ResponseStyle(
                length=ResponseLength.CONCISE,
                tone=ResponseTone.PROFESSIONAL,
                format=ResponseFormat.BULLET_POINTS,
                include_examples=False,
                prefer_step_by_step=False
            ),
            'research': ResponseStyle(
                length=ResponseLength.DETAILED,
                tone=ResponseTone.ACADEMIC,
                format=ResponseFormat.STRUCTURED,
                include_examples=True,
                use_analogies=True,
                technical_level=4
            )
        }
    
    def get_style(self, mode: str) -> ResponseStyle:
        """Get response style for a specific mode"""
        return self._mode_styles.get(mode, self._default_style)
    
    def set_style(self, mode: str, style: ResponseStyle):
        """Set response style for a specific mode"""
        self._mode_styles[mode] = style
    
    def update_style(self, mode: str, **kwargs):
        """Update specific style attributes for a mode"""
        style = self.get_style(mode)
        for key, value in kwargs.items():
            if hasattr(style, key):
                setattr(style, key, value)
        self._mode_styles[mode] = style
    
    def build_system_prompt(self, mode: str) -> str:
        """
        Build a system prompt modifier based on response style
        
        Args:
            mode: Operating mode
            
        Returns:
            System prompt string to prepend to AI instructions
        """
        style = self.get_style(mode)
        
        instructions = []
        
        # Length instruction
        length_map = {
            ResponseLength.CONCISE: "Keep responses brief and to the point (1-2 sentences max).",
            ResponseLength.BALANCED: "Provide balanced responses (2-4 sentences).",
            ResponseLength.DETAILED: "Provide thorough, detailed explanations."
        }
        instructions.append(length_map.get(style.length, ""))
        
        # Tone instruction
        tone_map = {
            ResponseTone.PROFESSIONAL: "Use a professional, business-appropriate tone.",
            ResponseTone.CASUAL: "Use a casual, conversational tone.",
            ResponseTone.ACADEMIC: "Use an academic, educational tone.",
            ResponseTone.FRIENDLY: "Use a warm, friendly, and approachable tone.",
            ResponseTone.DIRECT: "Be direct and straight to the point."
        }
        instructions.append(tone_map.get(style.tone, ""))
        
        # Format instruction
        format_map = {
            ResponseFormat.PROSE: "Write in natural paragraphs.",
            ResponseFormat.BULLET_POINTS: "Use bullet points for clarity.",
            ResponseFormat.NUMBERED: "Use numbered lists when explaining steps.",
            ResponseFormat.STRUCTURED: "Use headers and structured sections."
        }
        instructions.append(format_map.get(style.format, ""))
        
        # Technical level
        tech_levels = {
            1: "Explain concepts as if to a complete beginner.",
            2: "Assume basic familiarity with the topic.",
            3: "Assume moderate technical knowledge.",
            4: "Assume advanced technical knowledge.",
            5: "Assume expert-level understanding."
        }
        instructions.append(tech_levels.get(style.technical_level, ""))
        
        # Optional features
        if style.include_examples:
            instructions.append("Include relevant examples when helpful.")
        
        if style.use_analogies:
            instructions.append("Use analogies to explain complex concepts.")
        
        if style.prefer_step_by_step:
            instructions.append("Break down complex topics into steps.")
        
        if style.highlight_key_points:
            instructions.append("Highlight key takeaways.")
        
        if style.include_code_comments:
            instructions.append("Add comments to code examples.")
        
        # Custom instructions
        if style.custom_instructions:
            instructions.append(style.custom_instructions)
        
        return "\n".join(filter(None, instructions))
    
    def format_response(self, response: str, mode: str) -> str:
        """
        Post-process response to match style preferences
        
        Args:
            response: Raw AI response
            mode: Operating mode
            
        Returns:
            Formatted response
        """
        style = self.get_style(mode)
        
        # Add prefix/suffix
        if style.custom_prefix:
            response = f"{style.custom_prefix}\n\n{response}"
        
        if style.custom_suffix:
            response = f"{response}\n\n{style.custom_suffix}"
        
        return response
    
    def get_all_styles(self) -> Dict[str, ResponseStyle]:
        """Get all mode styles"""
        return self._mode_styles.copy()
    
    def export_settings(self) -> Dict[str, Any]:
        """Export all settings as dictionary"""
        return {
            mode: {
                'length': style.length.value,
                'tone': style.tone.value,
                'format': style.format.value,
                'include_examples': style.include_examples,
                'include_code_comments': style.include_code_comments,
                'technical_level': style.technical_level,
                'use_analogies': style.use_analogies,
                'prefer_step_by_step': style.prefer_step_by_step,
                'highlight_key_points': style.highlight_key_points,
                'custom_prefix': style.custom_prefix,
                'custom_suffix': style.custom_suffix,
                'custom_instructions': style.custom_instructions
            }
            for mode, style in self._mode_styles.items()
        }
    
    def import_settings(self, settings: Dict[str, Any]):
        """Import settings from dictionary"""
        for mode, style_dict in settings.items():
            try:
                style = ResponseStyle(
                    length=ResponseLength(style_dict.get('length', 'balanced')),
                    tone=ResponseTone(style_dict.get('tone', 'professional')),
                    format=ResponseFormat(style_dict.get('format', 'prose')),
                    include_examples=style_dict.get('include_examples', True),
                    include_code_comments=style_dict.get('include_code_comments', True),
                    technical_level=style_dict.get('technical_level', 3),
                    use_analogies=style_dict.get('use_analogies', False),
                    prefer_step_by_step=style_dict.get('prefer_step_by_step', False),
                    highlight_key_points=style_dict.get('highlight_key_points', True),
                    custom_prefix=style_dict.get('custom_prefix', ''),
                    custom_suffix=style_dict.get('custom_suffix', ''),
                    custom_instructions=style_dict.get('custom_instructions', '')
                )
                self._mode_styles[mode] = style
            except Exception as e:
                logger.error(f"Failed to import style for mode {mode}: {e}")


# Preset styles for quick selection
PRESETS = {
    'default': ResponseStyle(),
    'interview_pro': ResponseStyle(
        length=ResponseLength.BALANCED,
        tone=ResponseTone.PROFESSIONAL,
        format=ResponseFormat.STRUCTURED,
        include_examples=True,
        prefer_step_by_step=True,
        custom_instructions="Focus on demonstrating competence and confidence."
    ),
    'quick_answers': ResponseStyle(
        length=ResponseLength.CONCISE,
        tone=ResponseTone.DIRECT,
        format=ResponseFormat.PROSE,
        include_examples=False,
        highlight_key_points=False
    ),
    'learning_mode': ResponseStyle(
        length=ResponseLength.DETAILED,
        tone=ResponseTone.FRIENDLY,
        format=ResponseFormat.STRUCTURED,
        include_examples=True,
        use_analogies=True,
        prefer_step_by_step=True,
        technical_level=2
    ),
    'expert_mode': ResponseStyle(
        length=ResponseLength.BALANCED,
        tone=ResponseTone.ACADEMIC,
        format=ResponseFormat.PROSE,
        include_examples=False,
        technical_level=5
    )
}

