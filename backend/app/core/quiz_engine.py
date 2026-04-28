import random
from typing import List, Dict, Any, Optional
import difflib
import re
from .data_manager import data_manager

class QuizEngine:
    def __init__(self):
        pass
    
    def generate_paper(self, 
                      subjects: List[str], 
                      count: int, 
                      difficulty_distribution: Dict[str, int],
                      types: List[str],
                      include_reviewed: bool = True,
                      include_wrong: bool = False) -> List[Dict[str, Any]]:
        """根据设置生成试卷"""
        try:
            # 筛选题目
            filtered_questions = []
            for q in data_manager.questions:
                if (q.get('subject') in subjects and 
                    q.get('type') in types and 
                    q.get('status') == 'active'):
                    if not include_reviewed and q.get('review_count', 0) > 0:
                        continue
                    filtered_questions.append(q)
            
            # 包含错题
            if include_wrong:
                wrong_question_ids = [wq['question_id'] for wq in data_manager.wrong_questions]
                wrong_questions = [q for q in filtered_questions if q['id'] in wrong_question_ids]
                filtered_questions.extend(wrong_questions)
            
            if not filtered_questions:
                return []
            
            # 按难度分布选择题目
            paper = []
            for difficulty, percentage in difficulty_distribution.items():
                if percentage > 0:
                    diff_questions = [q for q in filtered_questions if q.get('difficulty') == difficulty]
                    count_for_diff = max(1, int(count * percentage / 100))
                    if diff_questions:
                        selected = random.sample(diff_questions, min(count_for_diff, len(diff_questions)))
                        paper.extend(selected)
            
            # 如果题目不够，补充其他题目
            if len(paper) < count:
                remaining_questions = [q for q in filtered_questions if q not in paper]
                need_more = count - len(paper)
                if remaining_questions:
                    additional = random.sample(remaining_questions, min(need_more, len(remaining_questions)))
                    paper.extend(additional)
            
            # 打乱顺序
            random.shuffle(paper)
            return paper[:count]  # 确保不超过指定数量
            
        except Exception as e:
            print(f"生成试卷时出错: {e}")
            return []
    
    def check_answer(self, user_answer: str, correct_answer: str, question_type: str) -> bool:
        """智能答案检查"""
        user_answer = user_answer.strip()
        correct_answer = correct_answer.strip()
        
        if not user_answer:
            return False
            
        # 选择题和判断题：精确匹配（忽略大小写和空格）
        if question_type in ["选择题", "判断题", "多选题"]:
            user_clean = user_answer.lower().replace(' ', '')
            correct_clean = correct_answer.lower().replace(' ', '')
            return user_clean == correct_clean
        
        # 填空题和简答题：使用多种匹配策略
        user_lower = user_answer.lower()
        correct_lower = correct_answer.lower()
        
        # 1. 完全匹配
        if user_lower == correct_lower:
            return True
        
        # 2. 去除标点符号后匹配
        import string
        translator = str.maketrans('', '', string.punctuation + ' ')
        user_clean = user_lower.translate(translator)
        correct_clean = correct_lower.translate(translator)
        
        if user_clean == correct_clean:
            return True
        
        # 3. 关键词匹配
        correct_words = set(re.findall(r'[\w]+', correct_lower))
        user_words = set(re.findall(r'[\w]+', user_lower))
        
        if correct_words:
            # 计算重叠度
            overlap = len(correct_words.intersection(user_words)) / len(correct_words)
            return overlap > 0.6  # 60%的关键词匹配即视为正确
        
        # 4. 字符串相似度匹配
        similarity = difflib.SequenceMatcher(None, user_clean, correct_clean).ratio()
        return similarity > 0.8
    
    def calculate_difficulty_distribution(self, questions: List[Dict[str, Any]]) -> Dict[str, int]:
        """计算题目集的难度分布"""
        difficulty_count = {}
        for q in questions:
            difficulty = q.get('difficulty', '未知')
            difficulty_count[difficulty] = difficulty_count.get(difficulty, 0) + 1
        
        total = len(questions)
        distribution = {}
        for difficulty, count in difficulty_count.items():
            distribution[difficulty] = round((count / total) * 100)
        
        return distribution