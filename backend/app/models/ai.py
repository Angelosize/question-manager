from pydantic import BaseModel
from typing import Dict, Any, Optional

class AIGradeRequest(BaseModel):
    question_id: str
    user_answer: str

class AIGradeResponse(BaseModel):
    is_correct: bool
    ai_feedback: str
    confidence: float
    detailed_analysis: str
    score: int
    timestamp: str

class AIStatusResponse(BaseModel):
    available: bool
    model: Optional[str] = None