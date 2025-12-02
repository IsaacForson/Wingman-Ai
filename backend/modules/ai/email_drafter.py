"""
Wingman AI - Email Drafter
AI-powered email response drafting
"""

from typing import Optional, Dict, Any, List
from enum import Enum
from dataclasses import dataclass
from loguru import logger


class EmailTone(str, Enum):
    PROFESSIONAL = "professional"
    FRIENDLY = "friendly"
    FORMAL = "formal"
    CASUAL = "casual"
    ASSERTIVE = "assertive"
    APOLOGETIC = "apologetic"


class EmailType(str, Enum):
    REPLY = "reply"
    FOLLOW_UP = "follow_up"
    INTRODUCTION = "introduction"
    THANK_YOU = "thank_you"
    REQUEST = "request"
    DECLINE = "decline"
    CONFIRMATION = "confirmation"


@dataclass
class EmailDraft:
    """Generated email draft"""
    subject: str
    body: str
    tone: EmailTone
    type: EmailType
    key_points: List[str]


class EmailDrafter:
    """
    AI-powered email response drafting
    """
    
    def __init__(self):
        self._answer_generator = None
    
    def set_answer_generator(self, generator):
        """Set reference to AI answer generator"""
        self._answer_generator = generator
    
    async def draft_email(
        self,
        context: str,
        email_type: EmailType = EmailType.REPLY,
        tone: EmailTone = EmailTone.PROFESSIONAL,
        key_points: List[str] = None,
        recipient_name: Optional[str] = None,
        your_name: Optional[str] = None,
        additional_context: Optional[str] = None
    ) -> EmailDraft:
        """
        Draft an email response
        
        Args:
            context: The original email or context to respond to
            email_type: Type of email to draft
            tone: Desired tone of the email
            key_points: Key points to include
            recipient_name: Name of the recipient
            your_name: Your name for the signature
            additional_context: Any additional context
        """
        
        key_points = key_points or []
        
        # Build the prompt
        prompt = self._build_prompt(
            context=context,
            email_type=email_type,
            tone=tone,
            key_points=key_points,
            recipient_name=recipient_name,
            your_name=your_name,
            additional_context=additional_context
        )
        
        try:
            if self._answer_generator:
                response = await self._answer_generator.generate(
                    prompt,
                    context="",
                    mode="work"
                )
                
                # Parse the response
                return self._parse_response(response, tone, email_type, key_points)
            else:
                # Fallback to template-based draft
                return self._template_draft(
                    context, email_type, tone, key_points, recipient_name, your_name
                )
                
        except Exception as e:
            logger.error(f"Email drafting failed: {e}")
            return self._template_draft(
                context, email_type, tone, key_points, recipient_name, your_name
            )
    
    def _build_prompt(
        self,
        context: str,
        email_type: EmailType,
        tone: EmailTone,
        key_points: List[str],
        recipient_name: Optional[str],
        your_name: Optional[str],
        additional_context: Optional[str]
    ) -> str:
        """Build the AI prompt for email drafting"""
        
        type_instructions = {
            EmailType.REPLY: "Write a reply to this email",
            EmailType.FOLLOW_UP: "Write a follow-up email regarding this context",
            EmailType.INTRODUCTION: "Write an introduction email",
            EmailType.THANK_YOU: "Write a thank you email",
            EmailType.REQUEST: "Write a request email",
            EmailType.DECLINE: "Write a polite decline email",
            EmailType.CONFIRMATION: "Write a confirmation email"
        }
        
        tone_instructions = {
            EmailTone.PROFESSIONAL: "Use a professional, business-appropriate tone",
            EmailTone.FRIENDLY: "Use a warm, friendly tone while remaining professional",
            EmailTone.FORMAL: "Use a very formal, traditional business tone",
            EmailTone.CASUAL: "Use a casual, relaxed tone",
            EmailTone.ASSERTIVE: "Use a confident, assertive tone",
            EmailTone.APOLOGETIC: "Use an apologetic, understanding tone"
        }
        
        prompt = f"""You are an expert email writer. {type_instructions.get(email_type, 'Write an email')}.

Context/Original Email:
{context}

Requirements:
- {tone_instructions.get(tone, 'Use a professional tone')}
- Keep it concise but complete
- Be clear and direct
"""
        
        if key_points:
            prompt += "\nKey points to include:\n"
            for point in key_points:
                prompt += f"- {point}\n"
        
        if recipient_name:
            prompt += f"\nAddress the recipient as: {recipient_name}"
        
        if your_name:
            prompt += f"\nSign off with: {your_name}"
        
        if additional_context:
            prompt += f"\nAdditional context: {additional_context}"
        
        prompt += """

Format your response as:
SUBJECT: [email subject line]
---
[email body]
"""
        
        return prompt
    
    def _parse_response(
        self,
        response: str,
        tone: EmailTone,
        email_type: EmailType,
        key_points: List[str]
    ) -> EmailDraft:
        """Parse AI response into EmailDraft"""
        
        # Try to extract subject and body
        subject = "Re: Your message"
        body = response
        
        if "SUBJECT:" in response:
            parts = response.split("---", 1)
            if len(parts) == 2:
                subject_line = parts[0].replace("SUBJECT:", "").strip()
                body = parts[1].strip()
                if subject_line:
                    subject = subject_line
        
        return EmailDraft(
            subject=subject,
            body=body,
            tone=tone,
            type=email_type,
            key_points=key_points
        )
    
    def _template_draft(
        self,
        context: str,
        email_type: EmailType,
        tone: EmailTone,
        key_points: List[str],
        recipient_name: Optional[str],
        your_name: Optional[str]
    ) -> EmailDraft:
        """Fallback template-based email drafting"""
        
        greeting = f"Dear {recipient_name}," if recipient_name else "Hello,"
        sign_off = f"Best regards,\n{your_name}" if your_name else "Best regards"
        
        templates = {
            EmailType.REPLY: f"""{greeting}

Thank you for your email. I wanted to respond to your message.

{self._format_key_points(key_points)}

Please let me know if you have any questions.

{sign_off}""",
            
            EmailType.FOLLOW_UP: f"""{greeting}

I wanted to follow up on our previous conversation.

{self._format_key_points(key_points)}

Looking forward to hearing from you.

{sign_off}""",
            
            EmailType.THANK_YOU: f"""{greeting}

Thank you so much for your time and consideration.

{self._format_key_points(key_points)}

I really appreciate it.

{sign_off}""",
            
            EmailType.REQUEST: f"""{greeting}

I hope this email finds you well. I'm reaching out to request your assistance.

{self._format_key_points(key_points)}

Thank you for considering my request.

{sign_off}""",
            
            EmailType.DECLINE: f"""{greeting}

Thank you for reaching out. After careful consideration, I regret to inform you that I won't be able to proceed at this time.

{self._format_key_points(key_points)}

I appreciate your understanding.

{sign_off}""",
            
            EmailType.CONFIRMATION: f"""{greeting}

I'm writing to confirm the following:

{self._format_key_points(key_points)}

Please let me know if anything needs to be adjusted.

{sign_off}"""
        }
        
        body = templates.get(email_type, templates[EmailType.REPLY])
        
        return EmailDraft(
            subject=self._generate_subject(email_type, context),
            body=body,
            tone=tone,
            type=email_type,
            key_points=key_points
        )
    
    def _format_key_points(self, key_points: List[str]) -> str:
        """Format key points for email body"""
        if not key_points:
            return ""
        return "\n".join(f"• {point}" for point in key_points)
    
    def _generate_subject(self, email_type: EmailType, context: str) -> str:
        """Generate email subject based on type"""
        subjects = {
            EmailType.REPLY: "Re: ",
            EmailType.FOLLOW_UP: "Following Up: ",
            EmailType.INTRODUCTION: "Introduction: ",
            EmailType.THANK_YOU: "Thank You",
            EmailType.REQUEST: "Request: ",
            EmailType.DECLINE: "Re: ",
            EmailType.CONFIRMATION: "Confirmation: "
        }
        
        prefix = subjects.get(email_type, "")
        
        # Try to extract subject from context
        if context:
            first_line = context.split('\n')[0][:50]
            return f"{prefix}{first_line}"
        
        return f"{prefix}Your message"
    
    async def improve_email(self, email_text: str, improvement_type: str = "clarity") -> str:
        """
        Improve an existing email draft
        
        Args:
            email_text: The email to improve
            improvement_type: Type of improvement (clarity, tone, brevity, professionalism)
        """
        
        prompt = f"""Improve this email for better {improvement_type}:

{email_text}

Provide the improved version only, no explanations."""

        try:
            if self._answer_generator:
                return await self._answer_generator.generate(
                    prompt,
                    context="",
                    mode="work"
                )
        except Exception as e:
            logger.error(f"Email improvement failed: {e}")
        
        return email_text
    
    async def suggest_responses(
        self,
        email_context: str,
        num_suggestions: int = 3
    ) -> List[Dict[str, str]]:
        """
        Suggest multiple response options
        
        Args:
            email_context: The email to respond to
            num_suggestions: Number of suggestions to generate
        """
        
        suggestions = []
        
        # Generate different tone options
        tones = [EmailTone.PROFESSIONAL, EmailTone.FRIENDLY, EmailTone.FORMAL][:num_suggestions]
        
        for tone in tones:
            draft = await self.draft_email(
                context=email_context,
                email_type=EmailType.REPLY,
                tone=tone
            )
            suggestions.append({
                "tone": tone.value,
                "subject": draft.subject,
                "preview": draft.body[:150] + "..." if len(draft.body) > 150 else draft.body,
                "full_body": draft.body
            })
        
        return suggestions

