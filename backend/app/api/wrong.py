from fastapi import APIRouter, HTTPException, Query, Depends
from typing import List, Optional, Dict, Any
import random

from app.core.data_manager import data_manager
from app.models.wrong import WrongQuestionResponse
from app.models.common import SuccessResponse
from app.api.auth import get_current_user

router = APIRouter()


@router.get("/", response_model=List[WrongQuestionResponse])
async def get_wrong_questions(
    mastered: Optional[bool] = Query(None),
    subject: Optional[str] = Query(None),
    sort_by: str = Query("last_wrong", description="排序方式: wrong_count, last_wrong, first_wrong"),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """获取当前用户的错题本"""
    try:
        user_id = current_user["id"]
        wrong_questions = [
            wq for wq in data_manager.wrong_questions
            if wq.get("user_id") == user_id
        ]

        if mastered is not None:
            wrong_questions = [wq for wq in wrong_questions if wq.get("mastered", False) == mastered]

        if subject:
            wrong_questions = [
                wq for wq in wrong_questions
                if wq.get("question_data", {}).get("subject") == subject
            ]

        if sort_by == "wrong_count":
            wrong_questions.sort(key=lambda x: x.get("wrong_count", 0), reverse=True)
        elif sort_by == "first_wrong":
            wrong_questions.sort(key=lambda x: x.get("first_wrong", ""))
        else:
            wrong_questions.sort(key=lambda x: x.get("last_wrong", ""), reverse=True)

        return wrong_questions
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取错题本失败: {str(e)}")


@router.post("/{question_id}/master", response_model=SuccessResponse)
async def mark_wrong_mastered(
    question_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    try:
        success = data_manager.mark_wrong_question_mastered(question_id, user_id=current_user["id"])
        if not success:
            raise HTTPException(status_code=404, detail="错题记录不存在")
        return SuccessResponse(message="错题已标记为掌握")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"标记掌握失败: {str(e)}")


@router.post("/clear-mastered", response_model=SuccessResponse)
async def clear_mastered_wrong_questions(
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    try:
        cleared_count = data_manager.clear_mastered_wrong_questions(user_id=current_user["id"])
        return SuccessResponse(
            message=f"已清空 {cleared_count} 道已掌握的错题",
            data={"cleared_count": cleared_count},
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"清空已掌握错题失败: {str(e)}")


@router.post("/paper", response_model=List[Dict[str, Any]])
async def generate_wrong_paper(
    count: int = 10,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """基于当前用户的未掌握错题生成试卷"""
    try:
        user_id = current_user["id"]
        not_mastered = [
            wq for wq in data_manager.wrong_questions
            if wq.get("user_id") == user_id and not wq.get("mastered", False)
        ]
        if not not_mastered:
            raise HTTPException(status_code=404, detail="没有未掌握的错题")

        count = min(count, len(not_mastered))
        selected_wrong = random.sample(not_mastered, count)
        return [wq["question_data"] for wq in selected_wrong]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"生成错题试卷失败: {str(e)}")


@router.delete("/{question_id}", response_model=SuccessResponse)
async def remove_from_wrong(
    question_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    try:
        data_manager.remove_from_wrong_questions(question_id, user_id=current_user["id"])
        return SuccessResponse(message="错题已移除")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"移除错题失败: {str(e)}")


@router.get("/stats", response_model=Dict[str, Any])
async def wrong_stats(current_user: Dict[str, Any] = Depends(get_current_user)):
    """当前用户的错题统计"""
    try:
        user_id = current_user["id"]
        user_wrong = [wq for wq in data_manager.wrong_questions if wq.get("user_id") == user_id]

        mastered_count = sum(1 for wq in user_wrong if wq.get("mastered", False))
        not_mastered_count = len(user_wrong) - mastered_count

        subject_stats: Dict[str, int] = {}
        for wq in user_wrong:
            subject = wq.get("question_data", {}).get("subject", "未分类")
            subject_stats[subject] = subject_stats.get(subject, 0) + 1

        return {
            "total": len(user_wrong),
            "mastered": mastered_count,
            "not_mastered": not_mastered_count,
            "mastery_rate": (mastered_count / len(user_wrong) * 100) if user_wrong else 0,
            "by_subject": subject_stats,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取错题统计失败: {str(e)}")