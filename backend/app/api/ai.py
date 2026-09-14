import asyncio
import base64
from datetime import datetime
import uuid

from fastapi import APIRouter, HTTPException
from typing import Dict, Any, List, Optional

from pydantic import BaseModel

from app.core.ai_assistant import AIAssistant
from app.core.data_manager import data_manager
from app.models.ai import AIGradeRequest, AIGradeResponse
from app.models.common import SuccessResponse
from app.core.config import DATA_DIR

router = APIRouter()
ai_assistant = AIAssistant()


class RecognizeRequest(BaseModel):
    text: str

class RecognizeResponse(BaseModel):
    success: bool
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None

class BatchRecognizeResponse(BaseModel):
    success: bool
    data: Optional[List[Dict[str, Any]]] = None
    error: Optional[str] = None


# ⭐ AI 识别单题 → 放到线程池
@router.post("/recognize", response_model=RecognizeResponse)
async def recognize_question(req: RecognizeRequest):
    """AI识别单道题目"""
    try:
        result = await asyncio.to_thread(ai_assistant.recognize_question, req.text)
        return RecognizeResponse(success=True, data=result)
    except Exception as e:
        return RecognizeResponse(success=False, error=str(e))


# ⭐ AI 批量识别 → 放到线程池
@router.post("/recognize-batch", response_model=BatchRecognizeResponse)
async def recognize_batch(req: RecognizeRequest):
    """AI分割并识别多道题目"""
    try:
        results = await asyncio.to_thread(ai_assistant.split_and_recognize, req.text)
        return BatchRecognizeResponse(success=True, data=results)
    except Exception as e:
        return BatchRecognizeResponse(success=False, error=str(e))


# ⭐ AI 单题批改 → 放到线程池
@router.post("/grade", response_model=AIGradeResponse)
async def ai_grade(request: AIGradeRequest):
    """AI批改单个题目"""
    try:
        question = next((q for q in data_manager.questions if q['id'] == request.question_id), None)
        if not question:
            raise HTTPException(status_code=404, detail="题目不存在")

        result = await asyncio.to_thread(
            ai_assistant.correct_answer, question, request.user_answer
        )
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI批改失败: {str(e)}")


# ⭐ 快速检查 → 放到线程池
@router.post("/quick-check", response_model=Dict[str, bool])
async def quick_check(question_id: str, user_answer: str):
    """快速答案检查"""
    try:
        question = next((q for q in data_manager.questions if q['id'] == question_id), None)
        if not question:
            raise HTTPException(status_code=404, detail="题目不存在")

        is_correct = await asyncio.to_thread(
            ai_assistant.quick_check,
            question['content'],
            question['answer'],
            user_answer,
        )
        return {"is_correct": is_correct}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"快速检查失败: {str(e)}")


# ⭐ AI 状态检查 → 放到线程池
@router.get("/status", response_model=Dict[str, Any])
async def ai_status():
    """获取AI服务状态"""
    try:
        status = await asyncio.to_thread(ai_assistant.check_status)
        return {
            "available": status,
            "model": ai_assistant.client.model if status else None
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取AI状态失败: {str(e)}")


class ImageRecognizeRequest(BaseModel):
    image: str
    mime_type: str = "image/jpeg"


# ⭐ 图片识别 → 放到线程池
@router.post("/recognize-image")
async def recognize_image(request: ImageRecognizeRequest):
    """
    识别图片中的题目（手写/印刷/几何/公式）
    自动保存原始图片到 backend/data/images/
    """
    # 1. 校验 base64
    try:
        image_bytes = base64.b64decode(request.image)
    except Exception:
        raise HTTPException(status_code=400, detail="图片 base64 格式错误")

    # 2. 大小限制 10MB
    if len(image_bytes) > 10 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="图片过大（>10MB），请压缩后重试")

    # 3. AI 可用性
    ai = AIAssistant()
    if not ai.is_available:
        raise HTTPException(status_code=401, detail="请先配置智谱 API Key")

    # 4. 调用视觉模型（放到线程池，避免阻塞 event loop）
    result = await asyncio.to_thread(
        ai.recognize_image, request.image, request.mime_type
    )

    if "error" in result:
        if "超时" in result["error"]:
            raise HTTPException(status_code=504, detail=result.get("detail", result["error"]))
        raise HTTPException(status_code=500, detail=result)

    # 5. 保存原图
    images_dir = DATA_DIR / "images"
    images_dir.mkdir(parents=True, exist_ok=True)

    ext = "jpg"
    if "png" in request.mime_type:
        ext = "png"
    elif "webp" in request.mime_type:
        ext = "webp"
    elif "jpeg" in request.mime_type or "jpg" in request.mime_type:
        ext = "jpg"

    filename = f"{datetime.now().strftime('%Y%m%d%H%M%S')}_{uuid.uuid4().hex[:6]}.{ext}"
    filepath = images_dir / filename
    with open(filepath, "wb") as f:
        f.write(image_bytes)

    result["original_image"] = filename
    print(f"✅ 图片已保存: {filename}")
    return result