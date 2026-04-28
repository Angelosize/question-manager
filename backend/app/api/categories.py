from fastapi import APIRouter, HTTPException
from typing import Dict, List
from app.core.data_manager import data_manager

router = APIRouter()

@router.get("/", response_model=Dict[str, List[str]])
async def get_all_categories():
    """获取所有分类信息"""
    try:
        # 确保返回完整的分类数据结构
        return {
            "subjects": data_manager.categories.get("subjects", []),
            "types": data_manager.categories.get("types", []),
            "difficulties": data_manager.categories.get("difficulties", []),
            "sources": data_manager.categories.get("sources", []),
            "tags": data_manager.categories.get("tags", []),
            "chapters": data_manager.categories.get("chapters", [])
        }
    except Exception as e:
        print(f"获取分类信息失败: {e}")
        # 返回默认分类
        return {
            "subjects": ["语文", "数学", "英语", "物理", "化学", "生物", "历史", "地理", "政治"],
            "types": ["选择题", "填空题", "解答题", "判断题", "简答题"],
            "difficulties": ["基础", "中等", "拔高"],
            "sources": ["教材", "教辅", "真题", "模拟", "自编", "网络"],
            "tags": ["常考", "易错", "重点", "难点", "典型", "综合", "创新"],
            "chapters": []
        }