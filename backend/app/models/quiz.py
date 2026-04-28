from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from .question import QuestionResponse

class QuizSettings(BaseModel):
    subjects: List[str]
    count: int
    difficulty_distribution: Dict[str, int]
    types: List[str]
    include_reviewed: bool = True
    include_wrong: bool = False

class QuizAnswer(BaseModel):
    question_id: str
    user_answer: str

class QuizResult(BaseModel):
    question_id: str
    user_answer: str
    is_correct: bool
    correct_answer: str
    explanation: Optional[str] = None
    score: int

class QuizResponse(BaseModel):
    results: List[QuizResult]
    total_score: int
    max_score: int

class QuizQuestion(QuestionResponse):
    user_answer: Optional[str] = None
    is_correct: Optional[bool] = None
    score: Optional[int] = None