import re
from typing import Dict, Any, List, Optional
from datetime import datetime

class ValidationUtils:
    """验证工具类"""
    
    @staticmethod
    def validate_question_data(question_data: Dict[str, Any]) -> Dict[str, Any]:
        """验证题目数据"""
        errors = []
        
        # 检查必填字段
        required_fields = ['subject', 'type', 'content', 'answer']
        for field in required_fields:
            if not question_data.get(field):
                errors.append(f"{field} 是必填字段")
        
        # 检查内容长度
        content = question_data.get('content', '')
        if len(content) < 5:
            errors.append("题干内容太短")
        elif len(content) > 1000:
            errors.append("题干内容太长")
        
        # 检查答案长度
        answer = question_data.get('answer', '')
        if len(answer) < 1:
            errors.append("答案不能为空")
        elif len(answer) > 500:
            errors.append("答案太长")
        
        # 检查选项格式（如果是选择题）
        if question_data.get('type') in ['选择题', '多选题']:
            options = question_data.get('options', {})
            if not options:
                errors.append("选择题必须提供选项")
            else:
                for letter, text in options.items():
                    if not text.strip():
                        errors.append(f"选项 {letter} 的内容不能为空")
        
        return {
            "valid": len(errors) == 0,
            "errors": errors
        }
    
    @staticmethod
    def validate_email(email: str) -> bool:
        """验证邮箱格式"""
        pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        return bool(re.match(pattern, email))
    
    @staticmethod
    def validate_date_format(date_str: str, format_str: str = "%Y-%m-%d %H:%M:%S") -> bool:
        """验证日期格式"""
        try:
            datetime.strptime(date_str, format_str)
            return True
        except ValueError:
            return False
    
    @staticmethod
    def validate_number_range(value: Any, min_val: float, max_val: float) -> bool:
        """验证数字范围"""
        try:
            num = float(value)
            return min_val <= num <= max_val
        except (ValueError, TypeError):
            return False
    
    @staticmethod
    def validate_list_items(items: List[Any], validator: callable) -> List[str]:
        """验证列表中的每个项目"""
        errors = []
        for i, item in enumerate(items):
            if not validator(item):
                errors.append(f"第 {i + 1} 个项目验证失败")
        return errors