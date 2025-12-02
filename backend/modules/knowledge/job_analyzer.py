"""
Wingman AI - Job Analyzer
Job description analysis and matching
"""

import re
from typing import Optional, Dict, Any, List, Set
from dataclasses import dataclass, field
from loguru import logger


@dataclass
class JobRequirement:
    """A parsed job requirement"""
    text: str
    category: str  # 'skill', 'experience', 'education', 'certification', 'soft_skill'
    is_required: bool
    importance: str  # 'must_have', 'nice_to_have', 'preferred'


@dataclass
class JobAnalysis:
    """Complete job analysis result"""
    title: str
    company: Optional[str]
    location: Optional[str]
    job_type: Optional[str]  # 'full_time', 'part_time', 'contract', 'remote'
    experience_level: str  # 'entry', 'mid', 'senior', 'lead', 'executive'
    salary_range: Optional[str]
    
    # Extracted requirements
    required_skills: List[str]
    preferred_skills: List[str]
    technical_skills: List[str]
    soft_skills: List[str]
    experience_years: Optional[int]
    education_requirements: List[str]
    certifications: List[str]
    
    # Analysis
    key_responsibilities: List[str]
    keywords: List[str]
    red_flags: List[str]
    highlights: List[str]
    
    # Matching
    match_score: Optional[float] = None
    matching_skills: List[str] = field(default_factory=list)
    missing_skills: List[str] = field(default_factory=list)
    
    raw_text: str = ""


class JobAnalyzer:
    """
    Analyzes job descriptions and matches against user profile
    """
    
    def __init__(self):
        self._answer_generator = None
        
        # Common skill patterns
        self._technical_skills = {
            'languages': ['python', 'javascript', 'typescript', 'java', 'c++', 'c#', 'go', 'rust', 'ruby', 'php', 'swift', 'kotlin', 'scala'],
            'frameworks': ['react', 'angular', 'vue', 'django', 'flask', 'fastapi', 'spring', 'node.js', 'express', 'nextjs', 'rails'],
            'databases': ['sql', 'postgresql', 'mysql', 'mongodb', 'redis', 'elasticsearch', 'dynamodb', 'cassandra'],
            'cloud': ['aws', 'azure', 'gcp', 'google cloud', 'kubernetes', 'docker', 'terraform', 'cloudformation'],
            'tools': ['git', 'jenkins', 'ci/cd', 'jira', 'agile', 'scrum', 'linux', 'bash']
        }
        
        self._soft_skills = [
            'communication', 'leadership', 'teamwork', 'problem-solving', 'analytical',
            'time management', 'adaptability', 'creativity', 'attention to detail',
            'collaboration', 'mentoring', 'initiative', 'ownership'
        ]
        
        self._experience_patterns = [
            r'(\d+)\+?\s*(?:years?|yrs?)(?:\s+of)?\s+(?:experience|exp)',
            r'(?:experience|exp)\s*(?:of\s+)?(\d+)\+?\s*(?:years?|yrs?)',
            r'(\d+)\+?\s*(?:years?|yrs?)\s+(?:working|developing|building)'
        ]
    
    def set_answer_generator(self, generator):
        """Set reference to AI answer generator"""
        self._answer_generator = generator
    
    async def analyze(self, job_description: str) -> JobAnalysis:
        """
        Analyze a job description
        
        Args:
            job_description: Raw job description text
        """
        
        text_lower = job_description.lower()
        
        # Extract basic info
        title = self._extract_title(job_description)
        company = self._extract_company(job_description)
        location = self._extract_location(job_description)
        job_type = self._extract_job_type(text_lower)
        experience_level = self._determine_experience_level(text_lower)
        salary_range = self._extract_salary(job_description)
        
        # Extract skills
        technical_skills = self._extract_technical_skills(text_lower)
        soft_skills = self._extract_soft_skills(text_lower)
        required_skills, preferred_skills = self._categorize_skills(job_description, technical_skills)
        
        # Extract requirements
        experience_years = self._extract_experience_years(text_lower)
        education = self._extract_education(text_lower)
        certifications = self._extract_certifications(text_lower)
        
        # Extract responsibilities
        responsibilities = self._extract_responsibilities(job_description)
        
        # Extract keywords for ATS
        keywords = self._extract_keywords(job_description)
        
        # Identify red flags and highlights
        red_flags = self._identify_red_flags(text_lower)
        highlights = self._identify_highlights(text_lower)
        
        return JobAnalysis(
            title=title,
            company=company,
            location=location,
            job_type=job_type,
            experience_level=experience_level,
            salary_range=salary_range,
            required_skills=required_skills,
            preferred_skills=preferred_skills,
            technical_skills=technical_skills,
            soft_skills=soft_skills,
            experience_years=experience_years,
            education_requirements=education,
            certifications=certifications,
            key_responsibilities=responsibilities,
            keywords=keywords,
            red_flags=red_flags,
            highlights=highlights,
            raw_text=job_description
        )
    
    def _extract_title(self, text: str) -> str:
        """Extract job title"""
        # First line is often the title
        lines = text.strip().split('\n')
        if lines:
            first_line = lines[0].strip()
            if len(first_line) < 100:  # Reasonable title length
                return first_line
        return "Unknown Position"
    
    def _extract_company(self, text: str) -> Optional[str]:
        """Extract company name"""
        patterns = [
            r'(?:at|@|company:?)\s+([A-Z][A-Za-z0-9\s&]+?)(?:\s+is|\s+we|\.|,)',
            r'(?:about|join)\s+([A-Z][A-Za-z0-9\s&]+)',
        ]
        
        for pattern in patterns:
            match = re.search(pattern, text)
            if match:
                return match.group(1).strip()
        
        return None
    
    def _extract_location(self, text: str) -> Optional[str]:
        """Extract location"""
        patterns = [
            r'(?:location|based in|office in):?\s*([A-Za-z\s,]+)',
            r'(remote|hybrid|on-?site)',
            r'([A-Z][a-z]+,\s*[A-Z]{2})'  # City, State format
        ]
        
        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                return match.group(1).strip()
        
        return None
    
    def _extract_job_type(self, text: str) -> Optional[str]:
        """Extract job type"""
        if 'full-time' in text or 'full time' in text:
            return 'full_time'
        elif 'part-time' in text or 'part time' in text:
            return 'part_time'
        elif 'contract' in text:
            return 'contract'
        elif 'remote' in text:
            return 'remote'
        return None
    
    def _determine_experience_level(self, text: str) -> str:
        """Determine experience level"""
        if any(word in text for word in ['senior', 'sr.', 'lead', 'principal', 'staff']):
            return 'senior'
        elif any(word in text for word in ['junior', 'jr.', 'entry', 'graduate', 'new grad']):
            return 'entry'
        elif any(word in text for word in ['manager', 'director', 'head of', 'vp ']):
            return 'executive'
        else:
            return 'mid'
    
    def _extract_salary(self, text: str) -> Optional[str]:
        """Extract salary information"""
        patterns = [
            r'\$[\d,]+(?:\s*-\s*\$[\d,]+)?(?:\s*(?:per|/)\s*(?:year|yr|hour|hr))?',
            r'(?:salary|compensation):?\s*\$?[\d,]+(?:\s*-\s*\$?[\d,]+)?'
        ]
        
        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                return match.group(0).strip()
        
        return None
    
    def _extract_technical_skills(self, text: str) -> List[str]:
        """Extract technical skills from text"""
        found_skills = set()
        
        for category, skills in self._technical_skills.items():
            for skill in skills:
                if skill in text:
                    found_skills.add(skill)
        
        return list(found_skills)
    
    def _extract_soft_skills(self, text: str) -> List[str]:
        """Extract soft skills from text"""
        found = []
        for skill in self._soft_skills:
            if skill in text:
                found.append(skill)
        return found
    
    def _categorize_skills(
        self,
        text: str,
        all_skills: List[str]
    ) -> tuple[List[str], List[str]]:
        """Categorize skills as required vs preferred"""
        text_lower = text.lower()
        required = []
        preferred = []
        
        # Look for requirement indicators
        required_indicators = ['required', 'must have', 'essential', 'mandatory']
        preferred_indicators = ['preferred', 'nice to have', 'bonus', 'plus', 'ideally']
        
        for skill in all_skills:
            # Check context around skill mention
            skill_idx = text_lower.find(skill)
            if skill_idx == -1:
                continue
            
            context = text_lower[max(0, skill_idx-100):skill_idx+100]
            
            if any(ind in context for ind in required_indicators):
                required.append(skill)
            elif any(ind in context for ind in preferred_indicators):
                preferred.append(skill)
            else:
                # Default to required if no context
                required.append(skill)
        
        return required, preferred
    
    def _extract_experience_years(self, text: str) -> Optional[int]:
        """Extract years of experience required"""
        for pattern in self._experience_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                try:
                    return int(match.group(1))
                except ValueError:
                    pass
        return None
    
    def _extract_education(self, text: str) -> List[str]:
        """Extract education requirements"""
        education = []
        
        degrees = ['bachelor', 'master', 'phd', 'doctorate', 'bs', 'ms', 'ba', 'ma', 'mba']
        fields = ['computer science', 'engineering', 'mathematics', 'physics', 'related field']
        
        text_lower = text.lower()
        
        for degree in degrees:
            if degree in text_lower:
                education.append(degree.upper() if len(degree) <= 3 else degree.title())
        
        for field in fields:
            if field in text_lower:
                education.append(field.title())
        
        return list(set(education))
    
    def _extract_certifications(self, text: str) -> List[str]:
        """Extract certification requirements"""
        certs = []
        
        cert_patterns = [
            r'(AWS\s+\w+)',
            r'(Azure\s+\w+)',
            r'(GCP\s+\w+)',
            r'(PMP)',
            r'(Scrum\s+Master)',
            r'(CISSP)',
            r'(CKA|CKAD)'
        ]
        
        for pattern in cert_patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            certs.extend(matches)
        
        return list(set(certs))
    
    def _extract_responsibilities(self, text: str) -> List[str]:
        """Extract key responsibilities"""
        responsibilities = []
        
        # Look for bullet points or numbered lists
        lines = text.split('\n')
        in_responsibilities = False
        
        for line in lines:
            line = line.strip()
            
            # Check for responsibilities section
            if any(word in line.lower() for word in ['responsibilities', 'what you\'ll do', 'role involves']):
                in_responsibilities = True
                continue
            
            # Check for next section
            if in_responsibilities and line and line[0].isupper() and ':' in line:
                in_responsibilities = False
            
            # Capture responsibility items
            if in_responsibilities:
                if line.startswith(('-', '•', '*', '–')) or (len(line) > 0 and line[0].isdigit()):
                    cleaned = re.sub(r'^[-•*–\d.)\s]+', '', line).strip()
                    if cleaned and len(cleaned) > 10:
                        responsibilities.append(cleaned)
        
        return responsibilities[:10]  # Limit to top 10
    
    def _extract_keywords(self, text: str) -> List[str]:
        """Extract keywords for ATS optimization"""
        # Combine all extracted items
        keywords = set()
        
        # Add technical skills
        keywords.update(self._extract_technical_skills(text.lower()))
        
        # Add common business keywords
        business_keywords = [
            'stakeholder', 'cross-functional', 'agile', 'scrum', 'sprint',
            'deliverables', 'roadmap', 'strategy', 'metrics', 'kpi'
        ]
        
        for kw in business_keywords:
            if kw in text.lower():
                keywords.add(kw)
        
        return list(keywords)
    
    def _identify_red_flags(self, text: str) -> List[str]:
        """Identify potential red flags in job posting"""
        red_flags = []
        
        flags = {
            'fast-paced environment': 'May indicate high stress/overwork',
            'wear many hats': 'Role may be poorly defined',
            'unlimited pto': 'May mean pressure not to take time off',
            'rockstar': 'May indicate unrealistic expectations',
            'ninja': 'May indicate unrealistic expectations',
            'family': 'May blur work-life boundaries',
            'work hard, play hard': 'May indicate overwork culture',
            'self-starter': 'May mean limited support/mentorship'
        }
        
        for flag, reason in flags.items():
            if flag in text:
                red_flags.append(f"{flag.title()} - {reason}")
        
        return red_flags
    
    def _identify_highlights(self, text: str) -> List[str]:
        """Identify positive highlights in job posting"""
        highlights = []
        
        positives = {
            'remote': 'Remote work available',
            'flexible hours': 'Flexible scheduling',
            '401k match': 'Retirement benefits',
            'equity': 'Stock/equity compensation',
            'unlimited learning': 'Learning & development budget',
            'mentorship': 'Mentorship program',
            'work-life balance': 'Focus on work-life balance',
            'parental leave': 'Parental leave benefits',
            'health insurance': 'Health benefits included'
        }
        
        for positive, description in positives.items():
            if positive in text:
                highlights.append(description)
        
        return highlights
    
    def match_with_profile(
        self,
        analysis: JobAnalysis,
        user_skills: List[str],
        user_experience_years: int,
        user_education: List[str]
    ) -> JobAnalysis:
        """
        Match job analysis against user profile
        
        Args:
            analysis: The job analysis to match
            user_skills: User's skills
            user_experience_years: User's years of experience
            user_education: User's education
        """
        
        user_skills_lower = set(s.lower() for s in user_skills)
        required_skills_lower = set(s.lower() for s in analysis.required_skills)
        
        matching = list(user_skills_lower & required_skills_lower)
        missing = list(required_skills_lower - user_skills_lower)
        
        # Calculate match score
        skill_score = len(matching) / max(len(required_skills_lower), 1) * 100
        
        # Experience match
        exp_score = 100
        if analysis.experience_years:
            if user_experience_years < analysis.experience_years:
                exp_score = (user_experience_years / analysis.experience_years) * 100
        
        # Overall score (weighted average)
        match_score = (skill_score * 0.6) + (exp_score * 0.4)
        
        analysis.match_score = round(match_score, 1)
        analysis.matching_skills = matching
        analysis.missing_skills = missing
        
        return analysis

