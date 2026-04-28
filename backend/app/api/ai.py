from fastapi import APIRouter, HTTPException
from typing import Dict, Any

from app.core.ai_assistant import AIAssistant
from app.core.data_manager import data_manager
from app.models.ai import AIGradeRequest, AIGradeResponse
from app.models.common import SuccessResponse

router = APIRouter()
ai_assistant = AIAssistant()

@router.post("/grade", response_model=AIGradeResponse)
async def ai_grade(request: AIGradeRequest):
    """AI批改单个题目"""
    try:
        question = next((q for q in data_manager.questions if q['id'] == request.question_id), None)
        if not question:
            raise HTTPException(status_code=404, detail="题目不存在")
        
        result = ai_assistant.correct_answer(question, request.user_answer)
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI批改失败: {str(e)}")

@router.post("/quick-check", response_model=Dict[str, bool])
async def quick_check(question_id: str, user_answer: str):
    """快速答案检查"""
    try:
        question = next((q for q in data_manager.questions if q['id'] == question_id), None)
        if not question:
            raise HTTPException(status_code=404, detail="题目不存在")
        
        is_correct = ai_assistant.quick_check(
            question['content'],
            question['answer'],
            user_answer
        )
        return {"is_correct": is_correct}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"快速检查失败: {str(e)}")

@router.get("/status", response_model=Dict[str, Any])
async def ai_status():
    """获取AI服务状态"""
    try:
        status = ai_assistant.check_status()
        return {
            "available": status,
            "model": ai_assistant.client.model if status else None
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取AI状态失败: {str(e)}")