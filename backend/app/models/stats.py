from pydantic import BaseModel
from typing import List, Dict, Any

class SubjectStats(BaseModel):
    subject: str
    count: int

class TypeStats(BaseModel):
    type: str
    count: int

class DifficultyStats(BaseModel):
    difficulty: str
    count: int

class TrendStats(BaseModel):
    month: str
    count: int

class WrongMasteredStats(BaseModel):
    mastered: int
    not_mastered: int

class OverviewStats(BaseModel):
    total_questions: int
    reviewed_count: int
    not_reviewed_count: int
    wrong_count: int
    recent_week_added: int
    subject_distribution: Dict[str, int]
    review_percentage: float