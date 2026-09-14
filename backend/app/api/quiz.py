from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any, Optional
import asyncio
import threading
import uuid
from datetime import datetime

from app.core.data_manager import data_manager
from app.core.quiz_engine import QuizEngine
from app.models.quiz import (
    QuizSettings, QuizQuestion, QuizAnswer, 
    QuizResponse, QuizResult
)
from app.models.common import SuccessResponse
from app.core.ai_assistant import AIAssistant

router = APIRouter()
quiz_engine = QuizEngine()
ai_assistant = AIAssistant()

# ============ 异步批改任务状态 ============
_quiz_tasks: Dict[str, Dict[str, Any]] = {}
_quiz_tasks_lock = threading.Lock()


def _update_quiz_task(task_id: str, **kwargs):
    with _quiz_tasks_lock:
        if task_id in _quiz_tasks:
            _quiz_tasks[task_id].update(kwargs)


def _get_quiz_task(task_id: str) -> Optional[Dict[str, Any]]:
    with _quiz_tasks_lock:
        task = _quiz_tasks.get(task_id)
        return dict(task) if task else None


def _fallback_full_score(q: Dict[str, Any], exam: Dict[str, Any] = None) -> float:
    """按题型/考试映射给出该题的满分"""
    if exam and exam.get('score'):
        try:
            return float(exam['score'])
        except (ValueError, TypeError):
            pass
    t = q.get('type', '')
    if t in ('选择题', '多选题', '填空题'):
        return 3.0
    if t in ('解答题', '计算题'):
        return 10.0
    if t in ('实验题', '简答题'):
        return 6.0
    return 5.0


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


# 抽取核心批改逻辑
def _do_submit(answers: List[Dict], task_id: Optional[str] = None) -> Dict[str, Any]:
    """批改逻辑（同步执行，可在后台线程中调用）"""

    def _progress(stage: str, current: int = 0, total: int = 0):
        if task_id:
            _update_quiz_task(task_id, stage=stage, current=current, total=total)

    print("📥 收到答案:", answers)
    _progress("preparing", 0, len(answers))

    # 容错：处理数字 question_id
    resolved_answers = []
    for ans in answers:
        qid = ans.get("question_id")
        question = next((q for q in data_manager.questions if q['id'] == qid), None)
        if question:
            resolved_answers.append(ans)
            continue

        if isinstance(qid, str) and qid.isdigit():
            number = int(qid)
            matched = [q for q in data_manager.questions if q.get('number') == number]
            if matched:
                question = matched[0]
                ans['question_id'] = question['id']
                resolved_answers.append(ans)
                print(f"🔄 转换数字ID {qid} -> {question['id']}")
            else:
                resolved_answers.append(ans)
        else:
            resolved_answers.append(ans)

    question_ids = [a["question_id"] for a in resolved_answers if a.get("question_id")]
    user_answer_map = {a["question_id"]: a.get("user_answer", "") for a in resolved_answers}

    # 收集每题满分
    question_scores: Dict[str, float] = {}
    for ans in resolved_answers:
        qid = ans.get("question_id")
        fs = ans.get("full_score")
        if fs and float(fs) > 0:
            question_scores[qid] = float(fs)

    # 获取题目数据
    questions_data = []
    for qid in question_ids:
        q = next((q for q in data_manager.questions if q['id'] == qid), None)
        if q:
            questions_data.append(q)
            if qid not in question_scores or question_scores[qid] <= 0:
                exam = data_manager.get_exam_by_question_id(qid)
                question_scores[qid] = _fallback_full_score(q, exam)
        else:
            print(f"⚠️ 未找到题目: {qid}")

    if not questions_data:
        raise HTTPException(status_code=400, detail="没有有效的题目，请检查题目ID是否正确")

    # AI 批改（带进度回调）
    _progress("grading", 0, len(questions_data))

    def _grading_progress(done: int, total: int):
        _progress("grading", done, total)

    if hasattr(ai_assistant, 'batch_correct_with_progress'):
        ai_results = ai_assistant.batch_correct_with_progress(
            questions_data, user_answer_map, progress_callback=_grading_progress
        )
    else:
        ai_results = ai_assistant.batch_correct(questions_data, user_answer_map)

    # 计算结果
    _progress("saving", 0, len(resolved_answers))
    results = []
    total_score = 0.0
    max_score = 0.0

    for answer_data in resolved_answers:
        qid = answer_data["question_id"]
        user_ans = answer_data.get("user_answer", "")
        ai_res = ai_results.get(qid, {})
        is_correct = ai_res.get("is_correct", False)
        ai_score_pct = float(ai_res.get("score", 100 if is_correct else 0))

        full_score = float(question_scores.get(qid, 5.0))
        actual_score = round(ai_score_pct * full_score / 100, 2)

        total_score += actual_score
        max_score += full_score

        if not is_correct:
            q = next((q for q in questions_data if q['id'] == qid), None)
            if q:
                data_manager.add_to_wrong_questions(qid, user_ans, q.get('answer', ''), save=False)

        data_manager.mark_as_reviewed(qid, save=False)

        results.append({
            "question_id": qid,
            "user_answer": user_ans,
            "is_correct": is_correct,
            "correct_answer": next((q.get('answer', '') for q in questions_data if q['id'] == qid), ''),
            "explanation": next((q.get('explanation', '') for q in questions_data if q['id'] == qid), ''),
            "score": actual_score,
            "full_score": full_score,
            "ai_score_pct": ai_score_pct,
            "ai_feedback": ai_res.get("ai_feedback", ""),
            "detailed_analysis": ai_res.get("detailed_analysis", ""),
        })

    data_manager.save_questions()
    data_manager.save_wrong_questions()
    print(f"💾 已批量保存。总分: {round(total_score, 2)} / {round(max_score, 2)}")

    return {
        "results": results,
        "total_score": round(total_score, 2),
        "max_score": round(max_score, 2),
    }


# ⭐ /submit → 放到线程池
@router.post("/submit")
async def submit_quiz(request: Dict[str, Any]):
    """同步批改（兼容旧版）"""
    try:
        answers = request.get("answers", [])
        # 放到线程池，避免阻塞 event loop
        return await asyncio.to_thread(_do_submit, answers, None)
    except HTTPException:
        raise
    except Exception as e:
        print(f"提交试卷失败: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"提交试卷失败: {str(e)}")


@router.post("/submit-async")
async def submit_quiz_async(request: Dict[str, Any]):
    """异步批改，立即返回 task_id"""
    answers = request.get("answers", [])
    if not answers:
        raise HTTPException(status_code=400, detail="没有有效的答案")

    task_id = uuid.uuid4().hex
    _quiz_tasks[task_id] = {
        "status": "running",
        "stage": "preparing",
        "current": 0,
        "total": len(answers),
        "result": None,
        "error": None,
        "started_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
    }

    def _run():
        try:
            result = _do_submit(answers, task_id=task_id)
            _update_quiz_task(task_id, status="done", stage="done", result=result)
        except HTTPException as e:
            _update_quiz_task(task_id, status="error", error=str(e.detail))
        except Exception as e:
            import traceback
            traceback.print_exc()
            _update_quiz_task(task_id, status="error", error=str(e))

    threading.Thread(target=_run, daemon=True).start()
    return {"task_id": task_id, "message": "批改任务已启动"}


@router.get("/submit-status/{task_id}")
async def get_quiz_submit_status(task_id: str):
    """查询批改任务状态"""
    task = _get_quiz_task(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在或已过期")
    return task


@router.post("/quick/{subject}", response_model=List[QuizQuestion])
async def quick_subject_quiz(subject: str, count: int = 10):
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
    try:
        subjects = data_manager.categories.get('subjects', [])

        if template_type == 'daily':
            questions = quiz_engine.generate_paper(
                subjects=subjects[:3],
                count=15,
                difficulty_distribution={'基础': 40, '中等': 40, '拔高': 20},
                types=data_manager.categories.get('types', []),
                include_reviewed=False,
                include_wrong=False
            )
        elif template_type == 'exam':
            questions = quiz_engine.generate_paper(
                subjects=subjects,
                count=30,
                difficulty_distribution={'基础': 20, '中等': 50, '拔高': 30},
                types=data_manager.categories.get('types', []),
                include_reviewed=True,
                include_wrong=True
            )
        elif template_type == 'wrong':
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