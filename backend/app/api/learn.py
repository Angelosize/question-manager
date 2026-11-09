import threading
import re
import json
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, HTTPException, Depends
from app.core.data_manager import DataManager, get_data_manager
from app.core.ai_assistant import AIAssistant
from app.core.learning_manager import learning_manager

router = APIRouter(tags=["learn"])

# 预热任务状态（内存，进程重启即清空）
_warmup_tasks: Dict[str, str] = {}   # qid -> "running" / "done" / "error"
_warmup_lock = threading.Lock()

# ⭐ AI 单例（懒加载）：避免每次请求都 new AIAssistant() 触发真实健康检测
_ai_singleton: Optional[AIAssistant] = None
_ai_lock = threading.Lock()


def _get_ai() -> AIAssistant:
    """获取 AI 实例。不可用时不缓存，下次请求会重试。"""
    global _ai_singleton
    if _ai_singleton is not None and _ai_singleton.is_available:
        return _ai_singleton
    with _ai_lock:
        if _ai_singleton is None or not _ai_singleton.is_available:
            _ai_singleton = AIAssistant()
    return _ai_singleton


@router.get("/cache/{question_id}")
async def get_learning_cache(question_id: str):
    """读学习缓存（毫秒级）"""
    cache = learning_manager.get_cache(question_id)
    if not cache:
        return {"cached": False, "data": None}
    return {"cached": True, "data": cache}


@router.get("/status/{question_id}")
async def get_learning_status(question_id: str):
    """查预热状态"""
    with _warmup_lock:
        s = _warmup_tasks.get(question_id)
    return {
        "cached": learning_manager.has_cache(question_id),
        "task_status": s or "idle",
    }


@router.post("/warmup")
async def warmup_learning(
    request: Dict[str, str],
    db: DataManager = Depends(get_data_manager),
):
    """
    触发预热（幂等，立即返回，后台跑）
    body: {"question_id": "QXXXX"}
    """
    qid = (request.get("question_id") or "").strip()
    if not qid:
        raise HTTPException(status_code=400, detail="question_id 不能为空")

    if learning_manager.has_cache(qid):
        return {"status": "cached", "message": "已有缓存"}

    with _warmup_lock:
        if _warmup_tasks.get(qid) == "running":
            return {"status": "running", "message": "预热中"}
        _warmup_tasks[qid] = "running"

    def _run():
        try:
            question = next((q for q in db.questions if q["id"] == qid), None)
            if not question:
                with _warmup_lock:
                    _warmup_tasks[qid] = "error"
                print(f"❌ 预热失败: 题目 {qid} 不存在")
                return

            ai = _get_ai()
            if not ai.is_available:
                with _warmup_lock:
                    _warmup_tasks[qid] = "error"
                print(f"❌ 预热失败: AI 不可用")
                return

            print(f"🔥 开始预热学习材料: {qid} ({question.get('content', '')[:30]}...)")
            data = ai.generate_learning_material(question)
            if not data:
                with _warmup_lock:
                    _warmup_tasks[qid] = "error"
                print(f"❌ 预热失败: AI 返回空 {qid}")
                return

            ok = learning_manager.save_cache(qid, data)
            with _warmup_lock:
                _warmup_tasks[qid] = "done" if ok else "error"
            if ok:
                print(f"✅ 预热完成: {qid}")
        except Exception as e:
            import traceback
            traceback.print_exc()
            with _warmup_lock:
                _warmup_tasks[qid] = "error"

    threading.Thread(target=_run, daemon=True).start()
    return {"status": "started", "message": "预热任务已启动"}


@router.post("/warmup-batch")
async def warmup_batch(
    request: Dict[str, Any],
    db: DataManager = Depends(get_data_manager),
):
    """
    批量预热（幂等，立即返回）
    body: {"question_ids": ["Q1", "Q2", ...]}
    """
    qids = request.get("question_ids") or []
    if not isinstance(qids, list):
        raise HTTPException(status_code=400, detail="question_ids 必须是数组")
    if len(qids) > 50:
        raise HTTPException(status_code=400, detail="单次最多 50 道")

    started = []
    skipped = []
    for qid in qids:
        qid = str(qid).strip()
        if not qid:
            continue
        if learning_manager.has_cache(qid):
            skipped.append(qid)
            continue
        with _warmup_lock:
            if _warmup_tasks.get(qid) == "running":
                skipped.append(qid)
                continue
            _warmup_tasks[qid] = "running"

        def _make_run(q_id):
            def _run():
                try:
                    question = next((q for q in db.questions if q["id"] == q_id), None)
                    if not question:
                        with _warmup_lock:
                            _warmup_tasks[q_id] = "error"
                        return
                    ai = _get_ai()
                    if not ai.is_available:
                        with _warmup_lock:
                            _warmup_tasks[q_id] = "error"
                        return
                    print(f"🔥 预热: {q_id}")
                    data = ai.generate_learning_material(question)
                    if not data:
                        with _warmup_lock:
                            _warmup_tasks[q_id] = "error"
                        return
                    ok = learning_manager.save_cache(q_id, data)
                    with _warmup_lock:
                        _warmup_tasks[q_id] = "done" if ok else "error"
                    if ok:
                        print(f"✅ 预热完成: {q_id}")
                except Exception:
                    import traceback
                    traceback.print_exc()
                    with _warmup_lock:
                        _warmup_tasks[q_id] = "error"
            return _run

        threading.Thread(target=_make_run(qid), daemon=True).start()
        started.append(qid)

    return {
        "started": len(started),
        "skipped": len(skipped),
        "message": f"已启动 {len(started)} 道题的预热",
    }


# 根据知识点推荐同类题（knowledge_points 是顿号分隔的字符串，逻辑不变）
@router.get("/similar/{question_id}")
async def get_similar_questions(
    question_id: str,
    db: DataManager = Depends(get_data_manager),
):
    question = next((q for q in db.questions if q["id"] == question_id), None)
    if not question:
        return {"data": []}

    kp_str = str(question.get("knowledge_points", ""))
    if not kp_str:
        return {"data": []}

    kps = [k.strip() for k in re.split(r'[,，、]', kp_str) if k.strip()]
    if not kps:
        return {"data": []}

    similar = []
    for q in db.questions:
        if q["id"] == question_id:
            continue
        q_kp = str(q.get("knowledge_points", ""))
        if any(k in q_kp for k in kps):
            similar.append(q)
            if len(similar) >= 3:
                break

    return {"data": similar}


# 我卡住了，求助 AI
@router.post("/stuck")
async def stuck_help(
    request: Dict[str, Any],
    db: DataManager = Depends(get_data_manager),
):
    qid = request.get("question_id")
    step_content = request.get("step_content", "")
    confusion = request.get("confusion", "")

    question = next((q for q in db.questions if q["id"] == qid), None)
    if not question:
        raise HTTPException(status_code=404, detail="题目不存在")

    ai = _get_ai()
    if not ai.is_available:
        raise HTTPException(status_code=503, detail="AI 服务不可用")

    text = ai.generate_stuck_explanation(
        question.get("content", ""),
        step_content,
        confusion,
    )
    if not text:
        raise HTTPException(status_code=500, detail="AI 生成失败")

    return {"explanation": text}


@router.post("/feynman")
async def feynman_check(
    request: Dict[str, Any],
    db: DataManager = Depends(get_data_manager),
):
    qid = (request.get("question_id") or "").strip()
    user_text = (request.get("user_text") or "").strip()
    if not qid or not user_text:
        raise HTTPException(status_code=400, detail="question_id 和 user_text 必填")

    question = next((q for q in db.questions if q["id"] == qid), None)
    if not question:
        raise HTTPException(status_code=404, detail="题目不存在")

    ai = _get_ai()
    if not ai.is_available:
        raise HTTPException(status_code=503, detail="AI 服务不可用")

    cache = learning_manager.get_cache(qid) or {}
    steps_summary = "；".join([
        s.get("content", "") for s in cache.get("steps", [])
    ])

    prompt = f"""学生要用自己的话讲这道题。请判断他是否讲清楚。

题目：{question.get('content', '')}
标准答案：{question.get('answer', '')}
标准思路：{steps_summary if steps_summary else "（未提供）"}

学生说：{user_text}

请严格返回 JSON（不要 markdown 代码块）：
{{
  "verdict": "讲清楚了" 或 "差一点" 或 "没讲到点上",
  "feedback": "针对学生的具体内容点评（30-60字）",
  "missing": ["漏掉的关键点1", "漏掉的关键点2"]
}}

判定标准：
- 讲清楚了：核心逻辑对，关键点都提到
- 差一点：方向对但漏了关键点
- 没讲到点上：理解错误或偏题
"""
    system_prompt = "你是严格的老师，只输出合法 JSON。"

    try:
        result = ai.client.generate(prompt, system_prompt, timeout=60, max_tokens=800)
        if not result:
            raise HTTPException(status_code=500, detail="AI 返回为空")

        cleaned = re.sub(r'^```(?:json)?\s*', '', result, flags=re.MULTILINE)
        cleaned = re.sub(r'\s*```\s*$', '', cleaned, flags=re.MULTILINE)
        m = re.search(r'\{[\s\S]*\}', cleaned)
        if not m:
            raise HTTPException(status_code=500, detail="AI 返回格式错误")
        data = json.loads(m.group())

        record = learning_manager.get_record(qid) or {}
        attempts = record.get("feynman_attempts", [])
        attempts.append({
            "text": user_text,
            "verdict": data.get("verdict", ""),
            "feedback": data.get("feedback", ""),
            "time": __import__("datetime").datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        })
        learning_manager.upsert_record(qid, {"feynman_attempts": attempts})

        return data
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"费曼判断失败: {str(e)}")


@router.get("/record/{question_id}")
async def get_learning_record(question_id: str):
    """读学习记录"""
    record = learning_manager.get_record(question_id)
    return {"record": record}


@router.post("/record/{question_id}")
async def update_learning_record(question_id: str, request: Dict[str, Any]):
    ok = learning_manager.upsert_record(question_id, request)
    return {"success": ok}


@router.get("/records")
async def list_all_records():
    """列出所有学习记录"""
    return {"records": learning_manager.list_records()}