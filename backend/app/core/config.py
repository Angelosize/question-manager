import os
from pathlib import Path
from typing import List, Dict, Any

BASE_DIR = Path(__file__).resolve().parent.parent.parent
DATA_DIR = BASE_DIR / "data"

# 确保数据目录存在
DATA_DIR.mkdir(exist_ok=True)

# 文件路径
QUESTION_DB_FILE = DATA_DIR / "question_database.json"
CATEGORIES_FILE = DATA_DIR / "question_categories.json"
WRONG_QUESTIONS_FILE = DATA_DIR / "wrong_questions.json"

# 默认分类
DEFAULT_SUBJECTS = ["数学", "语文", "英语", "物理", "化学", "生物", "历史", "地理", "政治", "通用"]
DEFAULT_TYPES = ["选择题", "填空题", "解答题", "判断题", "简答题", "计算题", "证明题", "综合题", "实验题", "作文题"]
DEFAULT_DIFFICULTIES = ["基础", "中等", "拔高", "竞赛", "入门", "熟练", "精通"]
DEFAULT_SOURCES = ["教材", "教辅", "真题", "模拟", "自编", "网络"]
DEFAULT_TAGS = ["常考", "易错", "重点", "难点", "典型", "综合", "创新"]

# AI配置
OLLAMA_CONFIG = {
    "base_url": "http://localhost:11434",
    "model": "qwen2.5:7b",
    "timeout": 30,
    "max_tokens": 4096,
}

# 提示词模板
AI_CORRECTION_PROMPT = """你是一个专业的题目批改助手。请对以下题目和答案进行专业、准确的批改：

题目信息：
学科：{subject}
题型：{question_type}
题目：{content}
标准答案：{correct_answer}
用户答案：{user_answer}

请按照以下格式返回批改结果：
1. 正确性判断：正确/部分正确/错误
2. 得分比例：0-100之间的分数
3. 详细分析：逐项分析用户答案的优点和不足
4. 改进建议：具体的改进建议
5. 知识点总结：相关知识点复习

请确保分析专业、客观，并给出建设性的反馈。"""

# 简化版答案检查提示词
SIMPLE_CHECK_PROMPT = """判断用户答案是否正确。只返回"正确"或"错误"，不要其他内容。

题目：{content}
标准答案：{correct_answer}  
用户答案：{user_answer}"""

class Settings:
    PROJECT_NAME: str = "全能题目管理器 API"
    VERSION: str = "4.2.0"
    DESCRIPTION: str = "全能题目管理器后端API"
    
    # CORS设置
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:3000",  # React开发服务器
        "http://127.0.0.1:3000",
    ]
    
settings = Settings()