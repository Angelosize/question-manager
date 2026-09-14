from pydantic import BaseModel
from typing import List, Optional, Union
from datetime import datetime

class PaperQuestion(BaseModel):
    question_id: str
    number: Union[int, str]
    score: float
    source_page: Optional[int] = None    # ⭐ 新增：题目来源页（1-based）

class PaperBase(BaseModel):
    name: str
    subject: str
    year: int
    total_score: Optional[float] = 0
    question_count: Optional[int] = 0
    duration: Optional[int] = 0
    page_images: Optional[List[str]] = None   # ⭐ 新增：多页原图文件名列表

class PaperCreate(PaperBase):
    questions: List[PaperQuestion] = []

class PaperUpdate(BaseModel):
    name: Optional[str] = None
    subject: Optional[str] = None
    year: Optional[int] = None
    duration: Optional[int] = None
    questions: Optional[List[PaperQuestion]] = None
    page_images: Optional[List[str]] = None   # ⭐ 新增

class Paper(PaperBase):
    id: str
    questions: List[PaperQuestion] = []
    created_time: str
    updated_time: Optional[str] = None

    class Config:
        from_attributes = True