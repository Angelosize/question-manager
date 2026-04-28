import json
import uuid
import re
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Any, Optional
import pandas as pd
from .config import (
    QUESTION_DB_FILE, CATEGORIES_FILE, WRONG_QUESTIONS_FILE,
    DEFAULT_SUBJECTS, DEFAULT_TYPES, DEFAULT_DIFFICULTIES, 
    DEFAULT_SOURCES, DEFAULT_TAGS
)
class DataManager:
    def __init__(self):
        self.questions: List[Dict[str, Any]] = []
        self.categories: Dict[str, List[str]] = {}
        self.wrong_questions: List[Dict[str, Any]] = []
    
    async def load_data(self) -> None:
        """异步加载所有数据"""
        self.questions = await self._load_questions()
        self.categories = self._load_categories()
        self.wrong_questions = await self._load_wrong_questions()
    
    async def _load_questions(self) -> List[Dict]:
        """异步加载题目数据"""
        try:
            if QUESTION_DB_FILE.exists() and QUESTION_DB_FILE.stat().st_size > 0:
                with open(QUESTION_DB_FILE, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    
                    # 修复所有题目的options字段
                    for question in data:
                        # 确保options是字典，不是null
                        if question.get('options') is None:
                            question['options'] = {}
                        
                        # 确保其他字段也有默认值
                        question.setdefault('review_count', 0)
                        question.setdefault('last_review', '')
                        question.setdefault('status', 'active')
                        question.setdefault('difficulty', '中等')
                        question.setdefault('wrong_count', 0)
                        question.setdefault('last_wrong', '')
                        question.setdefault('tags', [])
                    
                    return data
            else:
                self._create_empty_file(QUESTION_DB_FILE, [])
                return []
        except Exception as e:
            print(f"加载题目数据出错: {e}")
            self._create_empty_file(QUESTION_DB_FILE, [])
            return []
    
    def _load_categories(self) -> None:
        """加载分类数据"""
        try:
            if CATEGORIES_FILE.exists() and CATEGORIES_FILE.stat().st_size > 0:
                with open(CATEGORIES_FILE, 'r', encoding='utf-8') as f:
                    self.categories = json.load(f)
            else:
                # 文件不存在或为空，创建默认分类
                self.categories = self._create_default_categories()
        except Exception as e:
            print(f"加载分类数据出错: {e}")
            self.categories = self._create_default_categories()
        
        self._ensure_default_categories()
    
    async def _load_wrong_questions(self) -> List[Dict]:
        """异步加载错题数据"""
        try:
            if WRONG_QUESTIONS_FILE.exists() and WRONG_QUESTIONS_FILE.stat().st_size > 0:
                with open(WRONG_QUESTIONS_FILE, 'r', encoding='utf-8') as f:
                    return json.load(f)
            else:
                # 文件不存在或为空，创建空列表
                self._create_empty_file(WRONG_QUESTIONS_FILE, [])
                return []
        except Exception as e:
            print(f"加载错题本数据出错: {e}")
            self._create_empty_file(WRONG_QUESTIONS_FILE, [])
            return []
    
    def _create_empty_file(self, file_path: Path, default_content: Any) -> None:
        """创建空文件"""
        try:
            with open(file_path, 'w', encoding='utf-8') as f:
                json.dump(default_content, f, ensure_ascii=False, indent=2)
            print(f"创建空文件: {file_path.name}")
        except Exception as e:
            print(f"创建文件 {file_path.name} 失败: {e}")
    def _create_default_categories(self) -> Dict[str, List[str]]:
        """创建默认分类"""
        categories = {
            "subjects": DEFAULT_SUBJECTS,
            "types": DEFAULT_TYPES,
            "difficulties": DEFAULT_DIFFICULTIES,
            "tags": DEFAULT_TAGS,
            "chapters": [],
            "sources": DEFAULT_SOURCES
        }
        self._save_categories(categories)
        return categories
    
    def _ensure_default_categories(self) -> None:
        """确保分类数据有默认值"""
        required_categories = {
            "subjects": DEFAULT_SUBJECTS,
            "types": DEFAULT_TYPES,
            "difficulties": DEFAULT_DIFFICULTIES,
            "sources": DEFAULT_SOURCES,
            "tags": DEFAULT_TAGS,
            "chapters": []
        }
        
        for key, default_value in required_categories.items():
            if key not in self.categories:
                self.categories[key] = default_value
            elif not self.categories[key]:
                self.categories[key] = default_value
    
    def save_questions(self) -> bool:
        """保存题目数据"""
        try:
            with open(QUESTION_DB_FILE, 'w', encoding='utf-8') as f:
                json.dump(self.questions, f, ensure_ascii=False, indent=2)
            return True
        except Exception as e:
            print(f"保存题目数据出错: {e}")
            return False
    
    def _save_categories(self, categories: Optional[Dict[str, List[str]]] = None) -> bool:
        """保存分类信息"""
        if categories is None:
            categories = self.categories
        
        try:
            with open(CATEGORIES_FILE, 'w', encoding='utf-8') as f:
                json.dump(categories, f, ensure_ascii=False, indent=2)
            return True
        except Exception as e:
            print(f"保存分类数据出错: {e}")
            return False
    
    def save_wrong_questions(self) -> bool:
        """保存错题本数据"""
        try:
            with open(WRONG_QUESTIONS_FILE, 'w', encoding='utf-8') as f:
                json.dump(self.wrong_questions, f, ensure_ascii=False, indent=2)
            return True
        except Exception as e:
            print(f"保存错题本数据出错: {e}")
            return False
    
    def update_categories(self, question: Dict[str, Any]) -> None:
        """更新分类信息"""
        updated = False
        
        if question.get('subject') and question['subject'] not in self.categories.get('subjects', []):
            self.categories.setdefault('subjects', []).append(question['subject'])
            updated = True
        
        if question.get('type') and question['type'] not in self.categories.get('types', []):
            self.categories.setdefault('types', []).append(question['type'])
            updated = True
        
        if question.get('chapter') and question['chapter'] not in self.categories.get('chapters', []):
            self.categories.setdefault('chapters', []).append(question['chapter'])
            updated = True
        
        if question.get('tags'):
            for tag in question['tags']:
                if tag and tag not in self.categories.get('tags', []):
                    self.categories.setdefault('tags', []).append(tag)
                    updated = True
        
        if updated:
            self._save_categories()
    
    def get_questions(self, filters: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        """获取题目列表，支持筛选"""
        questions = self.questions.copy()
        
        if not filters:
            return questions
        
        print(f"应用筛选条件: {filters}")
        
        # 应用筛选条件 - 修复空值处理
        if filters.get('subject'):
            questions = [q for q in questions if q.get('subject') == filters['subject']]
        
        if filters.get('type'):
            questions = [q for q in questions if q.get('type') == filters['type']]
        
        if filters.get('difficulty'):
            questions = [q for q in questions if q.get('difficulty') == filters['difficulty']]
        
        if filters.get('tag'):
            questions = [q for q in questions if filters['tag'] in q.get('tags', [])]
        
        if filters.get('keyword'):
            keyword = filters['keyword'].lower()
            filtered_questions = []
            for q in questions:
                search_fields = [
                    q.get('content', ''),
                    q.get('explanation', ''),
                    q.get('knowledge_points', ''),
                    q.get('answer', ''),
                    ' '.join(q.get('tags', []))
                ]
                if any(keyword in str(field).lower() for field in search_fields):
                    filtered_questions.append(q)
            questions = filtered_questions
        
        if filters.get('status'):
            status_value = "active" if filters['status'] == "启用" else "inactive"
            questions = [q for q in questions if q.get('status') == status_value]
        
        return questions
    
    def add_question(self, question_data: Dict[str, Any]) -> str:
        """添加新题目"""
        question_id = f"Q{uuid.uuid4().hex[:8].upper()}"
        
        question = {
            "id": question_id,
            "subject": question_data.get('subject', '通用'),
            "type": question_data.get('type', '综合题'),
            "content": question_data.get('content', ''),
            "options": question_data.get('options', {}),
            "answer": question_data.get('answer', ''),
            "explanation": question_data.get('explanation', ''),
            "difficulty": question_data.get('difficulty', '中等'),
            "knowledge_points": question_data.get('knowledge_points', ''),
            "chapter": question_data.get('chapter', ''),
            "tags": question_data.get('tags', []),
            "source": question_data.get('source', ''),
            "note": question_data.get('note', ''),
            "created_time": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "updated_time": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "status": question_data.get('status', 'active'),
            "review_count": 0,
            "last_review": "",
            "wrong_count": 0,
            "last_wrong": ""
        }
        
        self.questions.append(question)
        self.update_categories(question)
        self.save_questions()
        
        return question_id
    
    def update_question(self, question_id: str, question_data: Dict[str, Any]) -> bool:
        """更新题目"""
        for i, q in enumerate(self.questions):
            if q['id'] == question_id:
                updated_question = {
                    **q,
                    **question_data,
                    "updated_time": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                }
                self.questions[i] = updated_question
                self.update_categories(updated_question)
                self.save_questions()
                return True
        return False
    
    def delete_question(self, question_id: str) -> bool:
        """删除题目"""
        original_length = len(self.questions)
        self.questions = [q for q in self.questions if q['id'] != question_id]
        
        if len(self.questions) < original_length:
            self.save_questions()
            return True
        return False
    
    def batch_delete_questions(self, question_ids: List[str]) -> int:
        """批量删除题目"""
        original_length = len(self.questions)
        self.questions = [q for q in self.questions if q['id'] not in question_ids]
        
        deleted_count = original_length - len(self.questions)
        if deleted_count > 0:
            self.save_questions()
        
        return deleted_count
    
    def mark_as_reviewed(self, question_id: str) -> bool:
        """标记为已复习"""
        for i, q in enumerate(self.questions):
            if q['id'] == question_id:
                self.questions[i]['review_count'] = q.get('review_count', 0) + 1
                self.questions[i]['last_review'] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                self.save_questions()
                return True
        return False
    
    def add_to_wrong_questions(self, question_id: str, user_answer: str, correct_answer: str) -> bool:
        """添加到错题本"""
        try:
            # 检查是否已经在错题本中
            existing_wrong = next((w for w in self.wrong_questions 
                                 if w['question_id'] == question_id), None)
            
            if existing_wrong:
                # 更新错题记录
                existing_wrong['wrong_count'] += 1
                existing_wrong['last_wrong'] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                existing_wrong['user_answers'].append({
                    'answer': user_answer,
                    'time': datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                })
            else:
                # 添加新错题记录
                question = next((q for q in self.questions if q['id'] == question_id), None)
                if question:
                    wrong_question = {
                        'question_id': question_id,
                        'question_data': question,
                        'user_answers': [{
                            'answer': user_answer,
                            'time': datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                        }],
                        'correct_answer': correct_answer,
                        'wrong_count': 1,
                        'first_wrong': datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                        'last_wrong': datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                        'mastered': False,
                        'review_count': 0
                    }
                    self.wrong_questions.append(wrong_question)
            
            # 更新题目的错题统计
            for q in self.questions:
                if q['id'] == question_id:
                    q['wrong_count'] = q.get('wrong_count', 0) + 1
                    q['last_wrong'] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                    break
            
            self.save_wrong_questions()
            self.save_questions()
            return True
        except Exception as e:
            print(f"添加错题时出错: {e}")
            return False
    
    def remove_from_wrong_questions(self, question_id: str) -> None:
        """从错题本移除"""
        self.wrong_questions = [
            w for w in self.wrong_questions 
            if w['question_id'] != question_id
        ]
        self.save_wrong_questions()
    
    def mark_wrong_question_mastered(self, question_id: str) -> bool:
        """标记错题为已掌握"""
        for wrong_question in self.wrong_questions:
            if wrong_question['question_id'] == question_id:
                wrong_question['mastered'] = True
                wrong_question['review_count'] = wrong_question.get('review_count', 0) + 1
                self.save_wrong_questions()
                return True
        return False
    
    def clear_mastered_wrong_questions(self) -> int:
        """清空已掌握的错题"""
        original_length = len(self.wrong_questions)
        self.wrong_questions = [
            wq for wq in self.wrong_questions 
            if not wq.get('mastered', False)
        ]
        cleared_count = original_length - len(self.wrong_questions)
        if cleared_count > 0:
            self.save_wrong_questions()
        return cleared_count
    
    def import_from_text_content(self, content: str) -> int:
        """从文本内容导入题目"""
        try:
            lines = content.split('\n')
            current_question = {}
            questions_added = 0
            
            for line in lines:
                line = line.strip()
                if not line:
                    if current_question and current_question.get('content'):
                        self._process_imported_question(current_question)
                        questions_added += 1
                        current_question = {}
                    continue
                
                if line.startswith('[') and ']' in line:
                    if current_question and current_question.get('content'):
                        self._process_imported_question(current_question)
                        questions_added += 1
                    
                    parts = line[1:].split(']', 1)
                    subject = parts[0].strip()
                    remaining = parts[1].strip() if len(parts) > 1 else ""
                    
                    question_type = "综合题"
                    for q_type in ["选择题", "填空题", "解答题", "判断题", "简答题"]:
                        if q_type in remaining:
                            question_type = q_type
                            remaining = remaining.replace(q_type, "").strip()
                            break
                    
                    current_question = {
                        "subject": subject,
                        "type": question_type,
                        "content": remaining,
                        "options": {},
                        "tags": []
                    }
                elif line.startswith('选项') and (':' in line or '：' in line):
                    line = line.replace('：', ':')
                    parts = line.split(':', 1)
                    if len(parts) == 2:
                        key = parts[0].strip()
                        value = parts[1].strip()
                        letter = key.replace('选项', '').strip()
                        if letter and len(letter) == 1:
                            current_question.setdefault('options', {})[letter] = value
                elif line.startswith('答案:') or line.startswith('答案：'):
                    line = line.replace('：', ':')
                    answer = line.split(':', 1)[1].strip() if ':' in line else line.split('答案', 1)[1].strip()
                    current_question['answer'] = answer
                elif line.startswith('解析:') or line.startswith('解析：'):
                    line = line.replace('：', ':')
                    explanation = line.split(':', 1)[1].strip() if ':' in line else line.split('解析', 1)[1].strip()
                    current_question['explanation'] = explanation
                elif line.startswith('难度:') or line.startswith('难度：'):
                    line = line.replace('：', ':')
                    difficulty = line.split(':', 1)[1].strip() if ':' in line else line.split('难度', 1)[1].strip()
                    current_question['difficulty'] = difficulty
                elif line.startswith('标签:') or line.startswith('标签：'):
                    line = line.replace('：', ':')
                    tags_line = line.split(':', 1)[1].strip() if ':' in line else line.split('标签', 1)[1].strip()
                    current_question['tags'] = [tag.strip() for tag in tags_line.split(',')]
                elif line.startswith('章节:') or line.startswith('章节：'):
                    line = line.replace('：', ':')
                    chapter = line.split(':', 1)[1].strip() if ':' in line else line.split('章节', 1)[1].strip()
                    current_question['chapter'] = chapter
                elif line.startswith('考点:') or line.startswith('考点：'):
                    line = line.replace('：', ':')
                    knowledge_points = line.split(':', 1)[1].strip() if ':' in line else line.split('考点', 1)[1].strip()
                    current_question['knowledge_points'] = knowledge_points
                elif line.startswith('来源:') or line.startswith('来源：'):
                    line = line.replace('：', ':')
                    source = line.split(':', 1)[1].strip() if ':' in line else line.split('来源', 1)[1].strip()
                    current_question['source'] = source
                else:
                    if 'content' in current_question:
                        if current_question['content']:
                            current_question['content'] += '\n' + line
                        else:
                            current_question['content'] = line
            
            if current_question and current_question.get('content'):
                self._process_imported_question(current_question)
                questions_added += 1
            
            self.save_questions()
            return questions_added
            
        except Exception as e:
            print(f"导入文本内容时出错: {e}")
            return 0
    
    def _process_imported_question(self, question_data: Dict[str, Any]) -> None:
        """处理导入的题目数据"""
        try:
            question_id = f"Q{uuid.uuid4().hex[:8].upper()}"
            
            question = {
                "id": question_id,
                "subject": question_data.get('subject', '通用'),
                "type": question_data.get('type', '综合题'),
                "content": question_data.get('content', ''),
                "options": question_data.get('options', {}),
                "answer": question_data.get('answer', ''),
                "explanation": question_data.get('explanation', ''),
                "difficulty": question_data.get('difficulty', '中等'),
                "knowledge_points": question_data.get('knowledge_points', ''),
                "chapter": question_data.get('chapter', ''),
                "tags": question_data.get('tags', []),
                "source": question_data.get('source', '文本导入'),
                "note": question_data.get('note', ''),
                "created_time": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                "updated_time": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                "status": "active",
                "review_count": 0,
                "last_review": "",
                "wrong_count": 0,
                "last_wrong": ""
            }
            
            if not question['content']:
                print(f"跳过题目 {question_id}: 题干内容为空")
                return
                
            if not question['answer']:
                print(f"跳过题目 {question_id}: 答案为空")
                return
            
            self.questions.append(question)
            self.update_categories(question)
            
        except Exception as e:
            print(f"处理导入题目时出错: {e}")
    
    def import_from_dataframe(self, df: pd.DataFrame) -> int:
        """从DataFrame导入题目"""
        try:
            questions_added = 0
            
            for _, row in df.iterrows():
                try:
                    question_id = f"Q{uuid.uuid4().hex[:8].upper()}"
                    
                    options = {}
                    for col in ['选项A', '选项B', '选项C', '选项D', '选项E', '选项F']:
                        if col in row and pd.notna(row[col]):
                            letter = col.replace('选项', '')
                            options[letter] = str(row[col])
                    
                    tags = []
                    if '标签' in row and pd.notna(row['标签']):
                        tags = [tag.strip() for tag in str(row['标签']).split(',')]
                    
                    question = {
                        "id": question_id,
                        "subject": str(row.get('学科', '通用')).strip(),
                        "type": str(row.get('题型', '综合题')).strip(),
                        "content": str(row.get('题干', '')).strip(),
                        "options": options,
                        "answer": str(row.get('答案', '')).strip(),
                        "explanation": str(row.get('解析', '')).strip(),
                        "difficulty": str(row.get('难度', '中等')).strip(),
                        "knowledge_points": str(row.get('考点', '')).strip(),
                        "chapter": str(row.get('章节', '')).strip(),
                        "tags": tags,
                        "source": str(row.get('来源', 'Excel导入')).strip(),
                        "note": str(row.get('备注', '')).strip(),
                        "created_time": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                        "updated_time": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                        "status": "active",
                        "review_count": 0,
                        "last_review": "",
                        "wrong_count": 0,
                        "last_wrong": ""
                    }
                    
                    if question['content'] and question['answer']:
                        self.questions.append(question)
                        self.update_categories(question)
                        questions_added += 1
                    else:
                        print(f"跳过题目 {question_id}: 题干或答案为空")
                        
                except Exception as e:
                    print(f"处理行时出错: {e}")
                    continue
            
            if questions_added > 0:
                self.save_questions()
            
            return questions_added
            
        except Exception as e:
            print(f"导入Excel数据时出错: {e}")
            return 0
    async def load_wrong_questions(self) -> List[Dict]:
        """公共方法：加载错题数据"""
        return await self._load_wrong_questions()
    
    async def load_questions(self) -> List[Dict]:
        """公共方法：加载题目数据"""
        return await self._load_questions()
    
    async def save_wrong_questions(self, data: List[Dict]):
        """公共方法：保存错题数据"""
        return await self._save_wrong_questions(data)
    
    async def save_questions(self, data: List[Dict]):
        """公共方法：保存题目数据"""
        return await self._save_questions(data)

# 全局数据管理器实例
data_manager = DataManager()