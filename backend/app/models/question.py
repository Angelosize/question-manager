from pydantic import BaseModel, Field
from typing import Dict, List, Optional
from datetime import datetime

class QuestionBase(BaseModel):
    subject: str
    type: str
    content: str
    answer: str
    difficulty: str = "中等"
    knowledge_points: Optional[str] = None
    chapter: Optional[str] = None
    tags: Optional[List[str]] = None
    source: Optional[str] = None
    note: Optional[str] = None
    status: str = "active"

class QuestionCreate(QuestionBase):
    options: Optional[Dict[str, str]] = None
    explanation: Optional[str] = None

class QuestionUpdate(BaseModel):
    subject: Optional[str] = None
    type: Optional[str] = None
    content: Optional[str] = None
    options: Optional[Dict[str, str]] = None
    answer: Optional[str] = None
    explanation: Optional[str] = None
    difficulty: Optional[str] = None
    knowledge_points: Optional[str] = None
    chapter: Optional[str] = None
    tags: Optional[List[str]] = None
    source: Optional[str] = None
    note: Optional[str] = None
    status: Optional[str] = None

class QuestionResponse(QuestionBase):
    id: str
    options: Dict[str, str] = {}  # 确保有默认值
    explanation: Optional[str] = None
    created_time: str
    updated_time: str
    review_count: int = 0
    last_review: Optional[str] = None
    wrong_count: int = 0
    last_wrong: Optional[str] = None
    
    class Config:
        from_attributes = True

class QuestionListResponse(BaseModel):
    items: List[QuestionResponse]
    total: int

class FilterParams(BaseModel):
    subject: Optional[str] = None
    type: Optional[str] = None
    difficulty: Optional[str] = None
    tag: Optional[str] = None
    keyword: Optional[str] = None
    status: Optional[str] = None
    page: int = 1
    limit: int = 20