# 核心业务逻辑包初始化文件
from .config import settings
from .data_manager import data_manager
from .quiz_engine import QuizEngine
from .ai_assistant import AIAssistant
from .statistics import Statistics

__all__ = ["settings", "data_manager", "QuizEngine", "AIAssistant", "Statistics"]