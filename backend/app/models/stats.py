from datetime import datetime
from typing import Dict, List, Optional, Any
from pydantic import BaseModel
from collections import defaultdict

class AnalyticsTimeRange(BaseModel):
    start_date: str
    end_date: str

class SubjectDistribution(BaseModel):
    subject: str
    count: int
    percentage: float

class QuestionTypeDistribution(BaseModel):
    question_type: str
    count: int
    error_rate: float

class TrendDataPoint(BaseModel):
    date: str
    count: int
    subjects: Dict[str, int]

class WeaknessTopic(BaseModel):
    topic: str
    wrong_count: int
    total_questions: int
    error_rate: float
    improvement_suggestions: List[str]

class CommonMistake(BaseModel):
    pattern: str
    frequency: int
    example_questions: List[str]

class WrongQuestionAnalytics(BaseModel):
    # 基础统计
    total_wrong_questions: int
    unique_wrong_questions: int
    average_wrong_per_question: float
    
    # 分布统计
    by_subject: List[SubjectDistribution]
    by_question_type: List[QuestionTypeDistribution]
    by_difficulty: Dict[str, float]
    
    # 时间趋势
    trend_last_30_days: List[TrendDataPoint]
    
    # 深度分析
    weakest_topics: List[WeaknessTopic]
    common_mistakes: List[CommonMistake]
    
    # 元数据
    generated_at: datetime
    time_range: AnalyticsTimeRange

class ImprovementSuggestion(BaseModel):
    topic: str
    current_level: str  # e.g., "weak", "average", "strong"
    suggested_actions: List[str]
    recommended_resources: List[str]

class AnalyticsResponse(BaseModel):
    success: bool
    data: Optional[WrongQuestionAnalytics] = None
    error: Optional[str] = None
    processing_time: float