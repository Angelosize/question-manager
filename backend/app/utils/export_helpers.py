import pandas as pd
from typing import List, Dict, Any, Optional, Tuple
from io import BytesIO
import base64
import uuid
from datetime import datetime

class ExportUtils:
    """导入导出工具类"""
    
    @staticmethod
    def questions_to_dataframe(questions: List[Dict[str, Any]]) -> pd.DataFrame:
        """将题目列表转换为DataFrame"""
        data = []
        for q in questions:
            # 处理选项
            options_str = ""
            if q.get('options'):
                for letter, text in q['options'].items():
                    options_str += f"{letter}. {text}\n"
            
            # 处理标签 - 修复类型问题
            tags = q.get('tags', [])
            if not isinstance(tags, list):
                # 如果tags不是列表，尝试转换
                if isinstance(tags, str):
                    tags = [tag.strip() for tag in tags.split(',') if tag.strip()]
                else:
                    tags = []
            tags_str = ', '.join(tags)
            
            # 处理其他可能为null的字段
            row = {
                "ID": q.get('id', ''),
                "学科": q.get('subject', ''),
                "题型": q.get('type', ''),
                "难度": q.get('difficulty', ''),
                "题干": q.get('content', ''),
                "选项": options_str.strip(),
                "答案": q.get('answer', ''),
                "解析": q.get('explanation', ''),
                "考点": q.get('knowledge_points', ''),
                "章节": q.get('chapter', ''),
                "标签": tags_str,
                "来源": q.get('source', ''),
                "备注": q.get('note', ''),
                "创建时间": q.get('created_time', ''),
                "更新时间": q.get('updated_time', ''),
                "复习次数": q.get('review_count', 0),
                "最后复习": q.get('last_review', ''),
                "错误次数": q.get('wrong_count', 0),
                "最后错误": q.get('last_wrong', ''),
                "状态": "启用" if q.get('status') == 'active' else "停用"
            }
            data.append(row)
        
        return pd.DataFrame(data)
    
    @staticmethod
    def create_excel_export(questions: List[Dict[str, Any]], filename: str = "questions_export.xlsx") -> Dict[str, Any]:
        """创建Excel导出"""
        try:
            # 检查是否有数据
            if not questions:
                return {
                    "success": False,
                    "error": "没有题目数据可导出"
                }
            
            print(f"📊 开始导出Excel，题目数量: {len(questions)}")
            
            # 调试：打印第一个题目的结构
            if questions:
                print(f"🔍 样例题目结构: {list(questions[0].keys())}")
                print(f"🔍 样例题目tags类型: {type(questions[0].get('tags'))}, 值: {questions[0].get('tags')}")
            
            df = ExportUtils.questions_to_dataframe(questions)
            print(f"✅ DataFrame创建成功，行数: {len(df)}")
            
            output = BytesIO()
            with pd.ExcelWriter(output, engine='openpyxl') as writer:
                df.to_excel(writer, index=False, sheet_name='题目数据')
                
                # 添加说明工作表
                instructions = pd.DataFrame({
                    '字段': ['ID', '学科', '题型', '难度', '题干', '选项', '答案', '解析', '考点', '章节', '标签', '来源', '备注', '状态'],
                    '说明': [
                        '唯一标识符（自动生成）',
                        '如：数学、语文、英语',
                        '如：选择题、填空题、解答题',
                        '如：简单、中等、困难',
                        '题目主要内容',
                        '选择题选项，格式：A.选项内容\\nB.选项内容',
                        '正确答案',
                        '题目解析说明',
                        '知识点或考点',
                        '所属章节',
                        '多个标签用逗号分隔',
                        '题目来源',
                        '额外备注信息',
                        '启用或停用'
                    ],
                    '必填': ['否', '是', '是', '否', '是', '否', '是', '否', '否', '否', '否', '否', '否', '否']
                })
                instructions.to_excel(writer, index=False, sheet_name='导入说明')
            
            b64 = base64.b64encode(output.getvalue()).decode()
            print("✅ Excel导出成功")
            return {
                "success": True,
                "filename": filename,
                "data": b64,
                "mime_type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            }
        except Exception as e:
            print(f"❌ Excel导出错误: {e}")
            import traceback
            traceback.print_exc()  # 打印完整堆栈跟踪
            return {
                "success": False,
                "error": f"导出失败: {str(e)}"
            }
    
    @staticmethod
    def create_text_export(questions: List[Dict[str, Any]], filename: str = "questions_export.txt") -> Dict[str, Any]:
        """创建文本导出"""
        try:
            text_content = f"题目导出 ({len(questions)} 道题目)\n"
            text_content += "="*80 + "\n\n"
            
            for i, q in enumerate(questions, 1):
                text_content += f"[{q.get('subject', '')}]{q.get('type', '')}\n"
                text_content += f"ID: {q.get('id', '')}\n"
                text_content += f"难度: {q.get('difficulty', '')}\n"
                
                text_content += f"\n题干:\n"
                text_content += "-"*40 + "\n"
                text_content += f"{q.get('content', '')}\n"
                
                if q.get('options'):
                    text_content += f"\n选项:\n"
                    for letter, text in q['options'].items():
                        text_content += f"  {letter}. {text}\n"
                
                text_content += f"\n答案: {q.get('answer', '')}\n"
                
                if q.get('explanation'):
                    text_content += f"\n解析:\n"
                    text_content += "-"*40 + "\n"
                    text_content += f"{q.get('explanation', '')}\n"
                
                if q.get('knowledge_points'):
                    text_content += f"\n考点: {q.get('knowledge_points', '')}\n"
                
                if q.get('tags'):
                    text_content += f"\n标签: {', '.join(q.get('tags', []))}\n"
                
                text_content += f"\n创建时间: {q.get('created_time', '')}\n"
                text_content += f"复习次数: {q.get('review_count', 0)}\n"
                text_content += f"错误次数: {q.get('wrong_count', 0)}\n"
                text_content += "\n" + "="*80 + "\n\n"
            
            b64 = base64.b64encode(text_content.encode()).decode()
            return {
                "success": True,
                "filename": filename,
                "data": b64,
                "mime_type": "text/plain"
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }

    @staticmethod
    def import_from_excel(file_content: bytes) -> Tuple[int, List[Dict[str, Any]]]:
        """从Excel文件导入题目"""
        try:
            df = pd.read_excel(BytesIO(file_content))
            imported_questions = []
            success_count = 0
            
            for _, row in df.iterrows():
                try:
                    # 解析选项
                    options = {}
                    if pd.notna(row.get('选项')):
                        options_text = str(row['选项'])
                        for line in options_text.split('\n'):
                            if '.' in line:
                                letter, text = line.split('.', 1)
                                letter = letter.strip()
                                text = text.strip()
                                if letter and text:
                                    options[letter] = text
                    
                    # 解析标签
                    tags = []
                    if pd.notna(row.get('标签')):
                        tags = [tag.strip() for tag in str(row['标签']).split(',') if tag.strip()]
                    
                    question = {
                        "id": f"Q{uuid.uuid4().hex[:8].upper()}",
                        "subject": str(row.get('学科', '通用')).strip(),
                        "type": str(row.get('题型', '综合题')).strip(),
                        "content": str(row.get('题干', '')).strip(),
                        "options": options,
                        "answer": str(row.get('答案', '')).strip(),
                        "explanation": str(row.get('解析', '')).strip() if pd.notna(row.get('解析')) else '',
                        "difficulty": str(row.get('难度', '中等')).strip(),
                        "knowledge_points": str(row.get('考点', '')).strip() if pd.notna(row.get('考点')) else '',
                        "chapter": str(row.get('章节', '')).strip() if pd.notna(row.get('章节')) else '',
                        "tags": tags,
                        "source": str(row.get('来源', 'Excel导入')).strip() if pd.notna(row.get('来源')) else 'Excel导入',
                        "note": str(row.get('备注', '')).strip() if pd.notna(row.get('备注')) else '',
                        "created_time": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                        "updated_time": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                        "status": "active",
                        "review_count": 0,
                        "last_review": "",
                        "wrong_count": 0,
                        "last_wrong": ""
                    }
                    
                    # 验证必填字段
                    if question['content'] and question['answer']:
                        imported_questions.append(question)
                        success_count += 1
                    
                except Exception as e:
                    print(f"导入行时出错: {e}")
                    continue
            
            return success_count, imported_questions
            
        except Exception as e:
            print(f"导入Excel文件时出错: {e}")
            return 0, []

    @staticmethod
    def import_from_text(text_content: str) -> Tuple[int, List[Dict[str, Any]]]:
        """从文本内容导入题目"""
        try:
            lines = text_content.split('\n')
            current_question = {}
            imported_questions = []
            success_count = 0
            
            for line in lines:
                line = line.strip()
                if not line:
                    if current_question and current_question.get('content'):
                        question = ExportUtils._process_text_question(current_question)
                        if question:
                            imported_questions.append(question)
                            success_count += 1
                        current_question = {}
                    continue
                
                if line.startswith('[') and ']' in line:
                    if current_question and current_question.get('content'):
                        question = ExportUtils._process_text_question(current_question)
                        if question:
                            imported_questions.append(question)
                            success_count += 1
                    
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
                elif line.startswith(('选项', 'A.', 'B.', 'C.', 'D.', 'E.', 'F.')):
                    if ':' in line or '.' in line:
                        line = line.replace('：', ':').replace('．', '.')
                        if ':' in line:
                            parts = line.split(':', 1)
                            key = parts[0].strip()
                            value = parts[1].strip()
                        else:
                            parts = line.split('.', 1)
                            key = parts[0].strip()
                            value = parts[1].strip()
                        
                        if key.startswith('选项'):
                            letter = key.replace('选项', '').strip()
                        else:
                            letter = key
                        
                        if letter and len(letter) == 1 and value:
                            current_question.setdefault('options', {})[letter] = value
                elif line.startswith(('答案:', '答案：')):
                    answer = line.split(':', 1)[1].strip() if ':' in line else line.split('答案', 1)[1].strip()
                    current_question['answer'] = answer
                elif line.startswith(('解析:', '解析：')):
                    explanation = line.split(':', 1)[1].strip() if ':' in line else line.split('解析', 1)[1].strip()
                    current_question['explanation'] = explanation
                elif line.startswith(('难度:', '难度：')):
                    difficulty = line.split(':', 1)[1].strip() if ':' in line else line.split('难度', 1)[1].strip()
                    current_question['difficulty'] = difficulty
                elif line.startswith(('标签:', '标签：')):
                    tags_line = line.split(':', 1)[1].strip() if ':' in line else line.split('标签', 1)[1].strip()
                    current_question['tags'] = [tag.strip() for tag in tags_line.split(',')]
                elif line.startswith(('章节:', '章节：')):
                    chapter = line.split(':', 1)[1].strip() if ':' in line else line.split('章节', 1)[1].strip()
                    current_question['chapter'] = chapter
                elif line.startswith(('考点:', '考点：')):
                    knowledge_points = line.split(':', 1)[1].strip() if ':' in line else line.split('考点', 1)[1].strip()
                    current_question['knowledge_points'] = knowledge_points
                elif line.startswith(('来源:', '来源：')):
                    source = line.split(':', 1)[1].strip() if ':' in line else line.split('来源', 1)[1].strip()
                    current_question['source'] = source
                else:
                    if 'content' in current_question:
                        current_question['content'] += '\n' + line
                    else:
                        current_question['content'] = line
            
            if current_question and current_question.get('content'):
                question = ExportUtils._process_text_question(current_question)
                if question:
                    imported_questions.append(question)
                    success_count += 1
            
            return success_count, imported_questions
            
        except Exception as e:
            print(f"导入文本内容时出错: {e}")
            return 0, []

    @staticmethod
    def _process_text_question(question_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """处理文本导入的题目数据"""
        try:
            question = {
                "id": f"Q{uuid.uuid4().hex[:8].upper()}",
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
            
            if question['content'] and question['answer']:
                return question
            return None
            
        except Exception as e:
            print(f"处理题目数据时出错: {e}")
            return None