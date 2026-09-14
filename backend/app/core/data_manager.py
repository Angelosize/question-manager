import json
import os
import uuid
import re
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Any, Optional
import pandas as pd
from .config import (
    DATA_DIR, QUESTION_DB_FILE, CATEGORIES_FILE, QUESTION_EXAMS_FILE, WRONG_QUESTIONS_FILE,
    DEFAULT_SUBJECTS, DEFAULT_TYPES, DEFAULT_DIFFICULTIES, 
    DEFAULT_SOURCES, DEFAULT_TAGS
)

class DataManager:
    def __init__(self):
        self.questions: List[Dict[str, Any]] = []
        self.categories: Dict[str, List[str]] = self._create_default_categories()
        self.wrong_questions: List[Dict[str, Any]] = []
        self.exams: List[Dict[str, Any]] = []
        self.papers: List[Dict[str, Any]] = []
    
    async def load_data(self) -> None:
        """异步加载所有数据"""
        self.questions = await self._load_questions()
        self.categories = self._load_categories()
        self.wrong_questions = await self._load_wrong_questions()
        self.exams = await self._load_exams()
        # ⭐ 关键修复：清理非字典元素
        self.exams = [e for e in self.exams if isinstance(e, dict)]
        self.papers = await self._load_papers()
    
    async def _load_questions(self) -> List[Dict]:
        """异步加载题目数据"""
        try:
            if QUESTION_DB_FILE.exists() and QUESTION_DB_FILE.stat().st_size > 0:
                with open(QUESTION_DB_FILE, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    
                    for question in data:
                        if question.get('options') is None:
                            question['options'] = {}
                        
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
    
    def _load_categories(self) -> Dict[str, List[str]]:
        """加载分类数据"""
        try:
            if CATEGORIES_FILE.exists() and CATEGORIES_FILE.stat().st_size > 0:
                with open(CATEGORIES_FILE, 'r', encoding='utf-8') as f:
                    categories = json.load(f)
                    if isinstance(categories, dict):
                        return categories
                    else:
                        print("⚠️ 分类文件格式错误，使用默认分类")
                        return self._create_default_categories()
            else:
                return self._create_default_categories()
        except Exception as e:
            print(f"加载分类数据出错: {e}")
            return self._create_default_categories()
    
    async def _load_wrong_questions(self) -> List[Dict]:
        """异步加载错题数据"""
        try:
            if WRONG_QUESTIONS_FILE.exists() and WRONG_QUESTIONS_FILE.stat().st_size > 0:
                with open(WRONG_QUESTIONS_FILE, 'r', encoding='utf-8') as f:
                    return json.load(f)
            else:
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
    
    def _save_questions_data(self, data: List[Dict]) -> bool:
        """内部保存方法"""
        try:
            os.makedirs(os.path.dirname(QUESTION_DB_FILE), exist_ok=True)
            
            if not QUESTION_DB_FILE.exists():
                with open(QUESTION_DB_FILE, 'w', encoding='utf-8') as f:
                    json.dump([], f, ensure_ascii=False, indent=2)
            
            with open(QUESTION_DB_FILE, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            
            print(f"✅ 成功保存 {len(data)} 道题目到 {QUESTION_DB_FILE}")
            return True
        except Exception as e:
            print(f"❌ 保存题目数据出错: {e}")
            print(f"📁 文件路径: {QUESTION_DB_FILE}")
            print(f"📊 数据长度: {len(data)}")
            return False

    def save_questions(self, data: Optional[List[Dict]] = None) -> bool:
        """保存题目数据（兼容旧调用）"""
        if data is None:
            data = self.questions
        return self._save_questions_data(data)
        
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
        if self.categories is None:
            print("⚠️ categories为None，初始化默认分类")
            self.categories = self._create_default_categories()
        
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
        questions.sort(key=lambda x: x.get('created_time', ''), reverse=True)
        if not filters:
            return questions
        
        print(f"应用筛选条件: {filters}")
        
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
        
        print("排序后前3条时间:", [q['created_time'] for q in questions[:3]])
        return questions
    
    def add_question(self, question_data: Dict[str, Any], save: bool = True) -> str:
        """
        添加新题目
        save=True（默认）：立即写文件
        save=False：只加到内存，稍后批量 save_questions()（性能优化）
        """
        print(f"📝 添加题目（save={save}）: {str(question_data.get('content', ''))[:40]}...")

        question_id = f"Q{uuid.uuid4().hex[:8].upper()}"

        def fix_none_fields(data: Dict[str, Any]) -> Dict[str, Any]:
            fixed_data = {}
            for key, value in data.items():
                if value is None:
                    if key in ['options']:
                        fixed_data[key] = {}
                    elif key in ['tags']:
                        fixed_data[key] = []
                    elif key in ['knowledge_points', 'chapter', 'source', 'note', 'explanation']:
                        fixed_data[key] = ''
                    else:
                        fixed_data[key] = value
                else:
                    fixed_data[key] = value
            return fixed_data

        fixed_data = fix_none_fields(question_data)

        question = {
            "id": question_id,
            "subject": fixed_data.get('subject', '通用'),
            "type": fixed_data.get('type', '综合题'),
            "content": fixed_data.get('content', ''),
            "options": fixed_data.get('options', {}),
            "answer": fixed_data.get('answer', ''),
            "explanation": fixed_data.get('explanation', ''),
            "difficulty": fixed_data.get('difficulty', '中等'),
            "knowledge_points": fixed_data.get('knowledge_points', ''),
            "chapter": fixed_data.get('chapter', ''),
            "tags": fixed_data.get('tags', []),
            "source": fixed_data.get('source', ''),
            "note": fixed_data.get('note', ''),
            "created_time": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "updated_time": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "status": fixed_data.get('status', 'active'),
            "review_count": 0,
            "last_review": "",
            "wrong_count": 0,
            "last_wrong": "",
            "drawing": fixed_data.get('drawing', None),
            "original_image": fixed_data.get('original_image', None),
        }

        self.questions.append(question)
        self.update_categories(question)

        if save:
            success = self.save_questions()
            print(f"💾 保存结果: {success}")
            if not success:
                raise Exception("保存题目数据失败")

        return question_id
    
    def update_question(self, question_id: str, question_data: Dict[str, Any]) -> bool:
        """更新题目"""
        for i, q in enumerate(self.questions):
            if q['id'] == question_id:
                update_data = question_data.copy()
                if 'options' in update_data and update_data['options'] is None:
                    update_data['options'] = {}
                
                updated_question = {
                    **q,
                    **update_data,
                    "updated_time": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                }
                self.questions[i] = updated_question
                self.update_categories(updated_question)
                self.save_questions()
                return True
        return False
    
    def delete_question(self, question_id: str) -> bool:
        """删除题目（不检查依赖，仅删除）"""
        print(f"🗑️ 尝试删除题目: {question_id}")
        print(f"📊 删除前题目数量: {len(self.questions)}")
        print(f"📋 所有题目ID: {[q['id'] for q in self.questions]}")
        
        original_length = len(self.questions)
        self.questions = [q for q in self.questions if q['id'] != question_id]
        
        print(f"📊 删除后题目数量: {len(self.questions)}")
        deleted = len(self.questions) < original_length
        print(f"✅ 删除结果: {deleted}")
        
        if deleted:
            return self._save_questions_data(self.questions)
        
        print(f"❌ 未找到题目: {question_id}")
        return False
    
    def get_delete_conflicts(self, question_id: str) -> Dict[str, Any]:
        """检查删除题目时可能存在的依赖冲突"""
        conflicts = {
            "has_conflict": False,
            "papers": [],
            "in_wrong_book": False
        }
        
        referencing_papers = []
        for paper in self.papers:
            for q in paper.get("questions", []):
                if q.get("question_id") == question_id:
                    referencing_papers.append({
                        "id": paper.get("id"),
                        "name": paper.get("name", "未命名试卷")
                    })
                    break
        conflicts["papers"] = referencing_papers
        
        in_wrong = any(wq.get("question_id") == question_id for wq in self.wrong_questions)
        conflicts["in_wrong_book"] = in_wrong
        
        conflicts["has_conflict"] = bool(referencing_papers) or in_wrong
        return conflicts
    
    def batch_check_conflicts(self, question_ids: List[str]) -> Dict[str, Dict]:
        """批量检查冲突"""
        result = {}
        for qid in question_ids:
            result[qid] = self.get_delete_conflicts(qid)
        return result
    
    def batch_delete_questions(self, question_ids: List[str]) -> int:
        """批量删除题目（不检查依赖）"""
        original_length = len(self.questions)
        self.questions = [q for q in self.questions if q['id'] not in question_ids]
        
        deleted_count = original_length - len(self.questions)
        if deleted_count > 0:
            self.save_questions()
        
        return deleted_count
    
    # ⭐ 修改：增加 save 参数，支持批量保存
    def mark_as_reviewed(self, question_id: str, save: bool = True) -> bool:
        """标记为已复习（save=False 时只更新内存）"""
        for i, q in enumerate(self.questions):
            if q['id'] == question_id:
                self.questions[i]['review_count'] = q.get('review_count', 0) + 1
                self.questions[i]['last_review'] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                if save:
                    self.save_questions()
                return True
        return False
    
    # ⭐ 修改：增加 save 参数，支持批量保存
    def add_to_wrong_questions(self, question_id: str, user_answer: str, correct_answer: str, save: bool = True) -> bool:
        """添加到错题本（save=False 时只更新内存，稍后统一保存）"""
        try:
            existing_wrong = next((w for w in self.wrong_questions 
                                 if w['question_id'] == question_id), None)
            
            if existing_wrong:
                existing_wrong['wrong_count'] += 1
                existing_wrong['last_wrong'] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                existing_wrong['user_answers'].append({
                    'answer': user_answer,
                    'time': datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                })
            else:
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
            
            if save:
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
    
    async def _load_exams(self) -> List[Dict[str, Any]]:
        """加载考试归属信息，返回扁平字典列表"""
        try:
            if QUESTION_EXAMS_FILE.exists() and QUESTION_EXAMS_FILE.stat().st_size > 0:
                with open(QUESTION_EXAMS_FILE, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    mappings = []
                    if isinstance(data, dict) and "mappings" in data:
                        raw = data["mappings"]
                    elif isinstance(data, list):
                        raw = data
                    else:
                        raw = []
                    for item in raw:
                        if isinstance(item, dict):
                            mappings.append(item)
                        elif isinstance(item, list):
                            for sub in item:
                                if isinstance(sub, dict):
                                    mappings.append(sub)
                    return mappings
            else:
                self._create_empty_file(QUESTION_EXAMS_FILE, {"mappings": []})
                return []
        except Exception as e:
            print(f"加载考试归属数据出错: {e}")
            self._create_empty_file(QUESTION_EXAMS_FILE, {"mappings": []})
            return []
    
    def _save_exams_data(self, data: List[Dict]) -> bool:
        """保存考试归属数据（内部）"""
        try:
            os.makedirs(os.path.dirname(QUESTION_EXAMS_FILE), exist_ok=True)
            clean_data = [d for d in data if isinstance(d, dict)]
            with open(QUESTION_EXAMS_FILE, 'w', encoding='utf-8') as f:
                json.dump({"mappings": clean_data}, f, ensure_ascii=False, indent=2)
            return True
        except Exception as e:
            print(f"保存考试归属数据出错: {e}")
            return False

    def save_exams(self) -> bool:
        """保存考试归属数据（外部调用）"""
        return self._save_exams_data(self.exams)
    
    def get_exam_by_question_id(self, question_id: str) -> Optional[Dict[str, Any]]:
        """根据题目ID查询考试归属信息"""
        for exam in self.exams:
            if isinstance(exam, dict) and exam.get("question_id") == question_id:
                return exam.copy()
        return None

    def add_exam_mapping(self, question_id: str, exam_data: Dict[str, Any]) -> bool:
        """添加或更新考试归属信息"""
        self.exams = [e for e in self.exams if isinstance(e, dict) and e.get("question_id") != question_id]
        exam_entry = {"question_id": question_id, **exam_data}
        self.exams.append(exam_entry)
        return self.save_exams()

    def delete_exam_mapping(self, question_id: str) -> bool:
        """删除某道题的考试归属信息"""
        original_len = len(self.exams)
        self.exams = [e for e in self.exams if isinstance(e, dict) and e.get("question_id") != question_id]
        if len(self.exams) < original_len:
            return self.save_exams()
        return True

    def update_exam_mapping(self, question_id: str, update_data: Dict[str, Any]) -> bool:
        """更新考试归属信息"""
        for exam in self.exams:
            if isinstance(exam, dict) and exam.get("question_id") == question_id:
                exam.update(update_data)
                return self.save_exams()
        return False
    
    async def _load_papers(self) -> List[Dict]:
        try:
            papers_file = DATA_DIR / "papers.json"
            if papers_file.exists() and papers_file.stat().st_size > 0:
                with open(papers_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    return data.get("papers", [])
            else:
                self._create_empty_file(papers_file, {"papers": []})
                return []
        except Exception as e:
            print(f"加载卷子数据出错: {e}")
            return []

    def _save_papers_data(self, data: List[Dict]) -> bool:
        try:
            papers_file = DATA_DIR / "papers.json"
            os.makedirs(os.path.dirname(papers_file), exist_ok=True)
            with open(papers_file, 'w', encoding='utf-8') as f:
                json.dump({"papers": data}, f, ensure_ascii=False, indent=2)
            return True
        except Exception as e:
            print(f"保存卷子数据出错: {e}")
            return False

    def save_papers(self) -> bool:
        return self._save_papers_data(self.papers)

    def add_paper(self, paper_data: Dict) -> str:
        paper_id = f"P{uuid.uuid4().hex[:8].upper()}"
        paper_data["id"] = paper_id
        paper_data["created_time"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        paper_data["updated_time"] = paper_data["created_time"]
        self.papers.append(paper_data)
        self.save_papers()
        return paper_id

    def update_paper(self, paper_id: str, update_data: Dict) -> bool:
        for i, p in enumerate(self.papers):
            if p["id"] == paper_id:
                p.update(update_data)
                p["updated_time"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                self.papers[i] = p
                self.save_papers()
                return True
        return False

    def delete_paper(self, paper_id: str) -> bool:
        original_len = len(self.papers)
        self.papers = [p for p in self.papers if p["id"] != paper_id]
        if len(self.papers) < original_len:
            self.save_papers()
            return True
        return False

    def get_paper(self, paper_id: str) -> Optional[Dict]:
        for p in self.papers:
            if p["id"] == paper_id:
                return p.copy()
        return None

    def get_all_papers(self) -> List[Dict]:
        return self.papers.copy()


# 全局数据管理器实例
data_manager = DataManager()

def get_data_manager() -> DataManager:
    """获取数据管理器实例（FastAPI依赖注入）"""
    return data_manager