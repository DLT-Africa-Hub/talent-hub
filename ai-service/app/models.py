"""
Shared data models for the AI service.
"""

from pydantic import BaseModel
from typing import Optional, List


class GraduateProfile(BaseModel):
    skills: List[str]
    education: str
    experience: Optional[str] = None


class JobRequirements(BaseModel):
    skills: List[str]
    education: Optional[str] = None
    experience: Optional[str] = None
