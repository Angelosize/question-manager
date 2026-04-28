import uuid
import re
import json
import pandas as pd
from datetime import datetime
from typing import List, Dict, Any, Optional, Tuple
from io import BytesIO
import base64
import difflib
import string

def generate_unique_id(prefix: str = "Q") -> str:
    """生成唯一ID"""
    return f"{prefix}{uuid.uuid4().hex[:8].upper()}"

def format_datetime(dt: datetime = None, format_str: str = "%Y-%m-%d %H:%M:%S") -> str:
    """格式化日期时间"""
    if dt is None:
        dt = datetime.now()
    return dt.strftime(format_str)

def parse_datetime(datetime_str: str, format_str: str = "%Y-%m-%d %H:%M:%S") -> Optional[datetime]:
    """解析日期时间字符串"""
    try:
        return datetime.strptime(datetime_str, format_str)
    except (ValueError, TypeError):
        return None

def clean_text(text: str) -> str:
    """清理文本，移除多余空格和特殊字符"""
    if not text:
        return ""
    
    # 移除多余空格
    text = re.sub(r'\s+', ' ', text.strip())
    # 移除不可打印字符
    text = ''.join(char for char in text if char.isprintable())
    return text

def validate_email(email: str) -> bool:
    """验证邮箱格式"""
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return bool(re.match(pattern, email))

def paginate_list(items: List[Any], page: int = 1, limit: int = 20) -> Tuple[List[Any], int]:
    """列表分页"""
    total = len(items)
    start = (page - 1) * limit
    end = start + limit
    paginated_items = items[start:end]
    return paginated_items, total

def export_to_excel(data: List[Dict[str, Any]], filename: str = "export.xlsx") -> Dict[str, Any]:
    """导出数据到Excel"""
    try:
        df = pd.DataFrame(data)
        
        output = BytesIO()
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            df.to_excel(writer, index=False, sheet_name='数据导出')
        
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

def export_to_json(data: List[Dict[str, Any]], filename: str = "export.json") -> Dict[str, Any]:
    """导出数据到JSON"""
    try:
        json_data = json.dumps(data, ensure_ascii=False, indent=2)
        b64 = base64.b64encode(json_data.encode()).decode()
        return {
            "success": True,
            "filename": filename,
            "data": b64,
            "mime_type": "application/json"
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }

def export_to_text(data: List[Dict[str, Any]], filename: str = "export.txt") -> Dict[str, Any]:
    """导出数据到文本文件"""
    try:
        text_content = ""
        for i, item in enumerate(data, 1):
            text_content += f"记录 {i}:\n"
            for key, value in item.items():
                text_content += f"  {key}: {value}\n"
            text_content += "\n" + "="*50 + "\n\n"
        
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

def calculate_similarity(text1: str, text2: str) -> float:
    """计算两个文本的相似度"""
    if not text1 or not text2:
        return 0.0
    
    # 使用difflib计算相似度
    sequence_matcher = difflib.SequenceMatcher(None, text1.lower(), text2.lower())
    return sequence_matcher.ratio()

def extract_keywords(text: str, min_length: int = 2) -> List[str]:
    """从文本中提取关键词"""
    if not text:
        return []
    
    # 移除标点符号
    text = text.translate(str.maketrans('', '', string.punctuation))
    # 分割单词
    words = re.findall(r'\w+', text.lower())
    # 过滤短词和常见停用词
    stop_words = {'的', '了', '是', '在', '和', '有', '这个', '那个', '一个'}
    keywords = [word for word in words if len(word) >= min_length and word not in stop_words]
    
    return list(set(keywords))  # 去重

def safe_get(dictionary: Dict, key: str, default: Any = None) -> Any:
    """安全获取字典值"""
    try:
        return dictionary.get(key, default)
    except (AttributeError, TypeError):
        return default

def chunk_list(lst: List[Any], chunk_size: int) -> List[List[Any]]:
    """将列表分割成指定大小的块"""
    return [lst[i:i + chunk_size] for i in range(0, len(lst), chunk_size)]

def format_file_size(size_bytes: int) -> str:
    """格式化文件大小"""
    if size_bytes == 0:
        return "0B"
    
    size_names = ["B", "KB", "MB", "GB"]
    i = 0
    while size_bytes >= 1024 and i < len(size_names) - 1:
        size_bytes /= 1024.0
        i += 1
    
    return f"{size_bytes:.2f}{size_names[i]}"

def is_valid_json(json_str: str) -> bool:
    """检查字符串是否为有效的JSON"""
    try:
        json.loads(json_str)
        return True
    except (json.JSONDecodeError, TypeError):
        return False