import pandas as pd
from typing import List, Dict, Any
from io import BytesIO
import base64

class ExportUtils:
    """导出工具类"""
    
    @staticmethod
    def questions_to_dataframe(questions: List[Dict[str, Any]]) -> pd.DataFrame:
        """将题目列表转换为DataFrame"""
        data = []
        for q in questions:
            options_str = ""
            if q.get('options'):
                for letter, text in q['options'].items():
                    options_str += f"{letter}. {text}\n"
            
            row = {
                "ID": q.get('id', ''),
                "学科": q.get('subject', ''),
                "题型": q.get('type', ''),
                "难度": q.get('difficulty', ''),
                "题干": q.get('content', ''),
                "选项": options_str,
                "答案": q.get('answer', ''),
                "解析": q.get('explanation', ''),
                "考点": q.get('knowledge_points', ''),
                "章节": q.get('chapter', ''),
                "标签": ', '.join(q.get('tags', [])),
                "来源": q.get('source', ''),
                "备注": q.get('note', ''),
                "创建时间": q.get('created_time', ''),
                "更新时间": q.get('updated_time', ''),
                "复习次数": q.get('review_count', 0),
                "最后复习": q.get('last_review', ''),
                "错误次数": q.get('wrong_count', 0),
                "最后错误": q.get('last_wrong', ''),
                "状态": q.get('status', '')
            }
            data.append(row)
        
        return pd.DataFrame(data)
    
    @staticmethod
    def create_excel_export(questions: List[Dict[str, Any]], filename: str = "questions_export.xlsx") -> Dict[str, Any]:
        """创建Excel导出"""
        try:
            df = ExportUtils.questions_to_dataframe(questions)
            
            output = BytesIO()
            with pd.ExcelWriter(output, engine='openpyxl') as writer:
                df.to_excel(writer, index=False, sheet_name='题目数据')
            
            b64 = base64.b64encode(output.getvalue()).decode()
            return {
                "success": True,
                "filename": filename,
                "data": b64,
                "mime_type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
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