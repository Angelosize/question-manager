from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional, Dict, Any
import random

from app.core.data_manager import data_manager
from app.models.wrong import WrongQuestionResponse  # 修正导入
from app.models.common import SuccessResponse

router = APIRouter()

@router.get("/", response_model=List[WrongQuestionResponse])
async def get_wrong_questions(
    mastered: Optional[bool] = Query(None),
    subject: Optional[str] = Query(None),
    sort_by: str = Query("last_wrong", description="排序方式: wrong_count, last_wrong, first_wrong")
):
    """获取错题本列表，支持筛选和排序"""
    try:
        wrong_questions = data_manager.wrong_questions.copy()
        
        # 筛选已掌握/未掌握
        if mastered is not None:
            wrong_questions = [wq for wq in wrong_questions if wq.get('mastered', False) == mastered]
        
        # 筛选学科
        if subject:
            wrong_questions = [wq for wq in wrong_questions 
                             if wq['question_data'].get('subject') == subject]
        
        # 排序
        if sort_by == "wrong_count":
            wrong_questions.sort(key=lambda x: x.get('wrong_count', 0), reverse=True)
        elif sort_by == "first_wrong":
            wrong_questions.sort(key=lambda x: x.get('first_wrong', ''))
        else:  # last_wrong
            wrong_questions.sort(key=lambda x: x.get('last_wrong', ''), reverse=True)
        
        return wrong_questions
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取错题本失败: {str(e)}")

@router.post("/{question_id}/master", response_model=SuccessResponse)
async def mark_wrong_mastered(question_id: str):
    """标记错题为已掌握"""
    try:
        success = data_manager.mark_wrong_question_mastered(question_id)
        if not success:
            raise HTTPException(status_code=404, detail="错题记录不存在")
        return SuccessResponse(message="错题已标记为掌握")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"标记掌握失败: {str(e)}")

@router.post("/clear-mastered", response_model=SuccessResponse)
async def clear_mastered_wrong_questions():
    """清空已掌握的错题"""
    try:
        cleared_count = data_manager.clear_mastered_wrong_questions()
        return SuccessResponse(
            message=f"已清空 {cleared_count} 道已掌握的错题",
            data={"cleared_count": cleared_count}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"清空已掌握错题失败: {str(e)}")

@router.post("/paper", response_model=List[Dict[str, Any]])
async def generate_wrong_paper(count: int = 10):
    """生成错题试卷"""
    try:
        not_mastered = [wq for wq in data_manager.wrong_questions if not wq.get('mastered', False)]
        if not not_mastered:
            raise HTTPException(status_code=404, detail="没有未掌握的错题")
        
        count = min(count, len(not_mastered))
        selected_wrong = random.sample(not_mastered, count)
        
        return [wq['question_data'] for wq in selected_wrong]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"生成错题试卷失败: {str(e)}")

@router.delete("/{question_id}", response_model=SuccessResponse)
async def remove_from_wrong(question_id: str):
    """从错题本移除"""
    try:
        data_manager.remove_from_wrong_questions(question_id)
        return SuccessResponse(message="错题已移除")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"移除错题失败: {str(e)}")

@router.get("/stats", response_model=Dict[str, Any])
async def wrong_stats():
    """获取错题统计信息"""
    try:
        mastered_count = sum(1 for wq in data_manager.wrong_questions if wq.get('mastered', False))
        not_mastered_count = len(data_manager.wrong_questions) - mastered_count
        
        # 按学科统计
        subject_stats = {}
        for wq in data_manager.wrong_questions:
            subject = wq['question_data'].get('subject', '未分类')
            subject_stats[subject] = subject_stats.get(subject, 0) + 1
        
        return {
            "total": len(data_manager.wrong_questions),
            "mastered": mastered_count,
            "not_mastered": not_mastered_count,
            "mastery_rate": (mastered_count / len(data_manager.wrong_questions) * 100) if data_manager.wrong_questions else 0,
            "by_subject": subject_stats
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取错题统计失败: {str(e)}")