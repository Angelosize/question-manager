from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from datetime import datetime
from .question import QuestionResponse

class WrongQuestionBase(BaseModel):
    question_id: str
    user_answers: List[Dict[str, str]]
    correct_answer: str
    wrong_count: int
    first_wrong: str
    last_wrong: str
    mastered: bool
    review_count: int

class WrongQuestionResponse(WrongQuestionBase):
    question_data: QuestionResponse
    
    class Config:
        from_attributes = True

class WrongQuestionCreate(BaseModel):
    question_id: str
    user_answer: str
    correct_answer: str

class WrongQuestionUpdate(BaseModel):
    mastered: Optional[bool] = None

class WrongQuestionStats(BaseModel):
    total: int
    mastered: int
    not_mastered: int
    mastery_rate: float
    by_subject: Dict[str, int]