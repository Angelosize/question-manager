"""
全能题目管理器 - FastAPI 后端应用
版本: 4.2.0
作者: AI助手
描述: 完整的题目管理系统后端API
"""

from .main import app
from .core.config import settings
from .core.data_manager import data_manager
from .core.quiz_engine import QuizEngine
from .core.ai_assistant import AIAssistant
from .core.statistics import Statistics

__version__ = "4.2.0"
__author__ = "AI助手"
__description__ = "全能题目管理器后端API"

__all__ = [
    "app",
    "settings",
    "data_manager",
    "QuizEngine",
    "AIAssistant",
    "Statistics"
]