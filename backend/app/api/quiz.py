from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any
import random

from app.core.data_manager import data_manager
from app.core.quiz_engine import QuizEngine
# 修改导入语句
from app.models.quiz import (
    QuizSettings, QuizQuestion, QuizAnswer, 
    QuizResponse, QuizResult
)
from app.models.common import SuccessResponse

router = APIRouter()
quiz_engine = QuizEngine()

@router.post("/generate", response_model=List[QuizQuestion])
async def generate_quiz(settings: QuizSettings):
    """根据设置生成试卷"""
    try:
        questions = quiz_engine.generate_paper(
            subjects=settings.subjects,
            count=settings.count,
            difficulty_distribution=settings.difficulty_distribution,
            types=settings.types,
            include_reviewed=settings.include_reviewed,
            include_wrong=settings.include_wrong
        )
        return questions
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"生成试卷失败: {str(e)}")

@router.post("/submit", response_model=QuizResponse)
async def submit_quiz(request: Dict[str, Any]):  # 接受原始字典
    """提交试卷答案并批改"""
    try:
        answers = request.get("answers", [])
        
        results = []
        total_score = 0
        max_score = len(answers) * 100
        
        for answer_data in answers:
            question_id = answer_data.get("question_id")
            user_answer = answer_data.get("user_answer", "")
            ai_result = answer_data.get("ai_result")
            
            question = next((q for q in data_manager.questions if q['id'] == question_id), None)
            if not question:
                continue
                
            # 使用AI批改结果（如果提供）
            if ai_result and "is_correct" in ai_result:
                is_correct = ai_result["is_correct"]
                score = ai_result.get("score", 100 if is_correct else 0)
            else:
                # 回退到基础检查
                is_correct = quiz_engine.check_answer(
                    user_answer, 
                    question['answer'], 
                    question.get('type', '')
                )
                score = 100 if is_correct else 0
            
            total_score += score
            
            # 记录错题
            if not is_correct:
                data_manager.add_to_wrong_questions(
                    question_id, 
                    user_answer, 
                    question['answer']
                )
            
            results.append({
                "question_id": question_id,
                "user_answer": user_answer,
                "is_correct": is_correct,
                "correct_answer": question['answer'],
                "explanation": question.get('explanation', ''),
                "score": score
            })
        
        # 标记所有题目为已复习
        for answer_data in answers:
            data_manager.mark_as_reviewed(answer_data.get("question_id"))
        
        return {
            "results": results,
            "total_score": total_score,
            "max_score": max_score
        }
        
    except Exception as e:
        print(f"提交试卷失败: {e}")
        raise HTTPException(status_code=500, detail=f"提交试卷失败: {str(e)}")

@router.post("/quick/{subject}", response_model=List[QuizQuestion])
async def quick_subject_quiz(subject: str, count: int = 10):
    """快速生成学科试卷"""
    try:
        questions = quiz_engine.generate_paper(
            subjects=[subject],
            count=count,
            difficulty_distribution={'基础': 30, '中等': 50, '拔高': 20},
            types=data_manager.categories.get('types', []),
            include_reviewed=False,
            include_wrong=False
        )
        return questions
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"快速组卷失败: {str(e)}")

@router.get("/preset/{template_type}", response_model=List[QuizQuestion])
async def preset_template_quiz(template_type: str):
    """使用预设模板生成试卷"""
    try:
        subjects = data_manager.categories.get('subjects', [])
        
        if template_type == 'daily':
            # 日常练习：各学科均衡，中等难度为主
            questions = quiz_engine.generate_paper(
                subjects=subjects[:3],
                count=15,
                difficulty_distribution={'基础': 40, '中等': 40, '拔高': 20},
                types=data_manager.categories.get('types', []),
                include_reviewed=False,
                include_wrong=False
            )
        elif template_type == 'exam':
            # 考前模拟：全面覆盖，偏难
            questions = quiz_engine.generate_paper(
                subjects=subjects,
                count=30,
                difficulty_distribution={'基础': 20, '中等': 50, '拔高': 30},
                types=data_manager.categories.get('types', []),
                include_reviewed=True,
                include_wrong=True
            )
        elif template_type == 'wrong':
            # 错题巩固
            wrong_questions = [wq for wq in data_manager.wrong_questions if not wq.get('mastered', False)]
            if not wrong_questions:
                raise HTTPException(status_code=404, detail="暂无错题需要巩固")
            
            questions = [wq['question_data'] for wq in wrong_questions[:20]]
        else:
            raise HTTPException(status_code=400, detail="不支持的模板类型")
        
        return questions
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"预设模板组卷失败: {str(e)}")