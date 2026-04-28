from fastapi import APIRouter, HTTPException, Query, UploadFile, File, Form
from typing import Optional, List, Dict, Any
import pandas as pd
import json
import uuid
from datetime import datetime

from app.core.data_manager import data_manager
# 修改导入语句
from app.models.question import (
    QuestionCreate, QuestionUpdate, QuestionResponse, 
    QuestionListResponse, FilterParams
)

from app.models.common import SuccessResponse, ErrorResponse

router = APIRouter()

@router.get("/", response_model=QuestionListResponse)
async def get_questions(
    subject: Optional[str] = Query(None),
    type: Optional[str] = Query(None),
    difficulty: Optional[str] = Query(None),
    tag: Optional[str] = Query(None),
    keyword: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100)
):
    """获取题目列表，支持筛选和分页"""
    try:
        # 构建筛选条件 - 修复空值处理
        filters = {}
        if subject:
            filters['subject'] = subject
        if type:
            filters['type'] = type
        if difficulty:
            filters['difficulty'] = difficulty
        if tag:
            filters['tag'] = tag
        if keyword:
            filters['keyword'] = keyword
        if status:
            filters['status'] = status
        
        all_questions = data_manager.get_questions(filters)
        total = len(all_questions)
        
        # 分页
        start = (page - 1) * limit
        end = start + limit
        paginated_questions = all_questions[start:end]
        
        return QuestionListResponse(
            items=paginated_questions,
            total=total
        )
    except Exception as e:
        print(f"获取题目列表失败: {e}")
        # 返回空数据而不是抛出异常
        return QuestionListResponse(items=[], total=0)

@router.post("/", response_model=SuccessResponse)
async def create_question(question: QuestionCreate):
    """创建新题目"""
    try:
        question_data = question.dict()
        question_id = data_manager.add_question(question_data)
        return SuccessResponse(
            message="题目创建成功",
            data={"id": question_id}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"创建题目失败: {str(e)}")

@router.get("/{question_id}", response_model=QuestionResponse)
async def get_question(question_id: str):
    """获取单个题目详情"""
    question = next((q for q in data_manager.questions if q['id'] == question_id), None)
    if not question:
        raise HTTPException(status_code=404, detail="题目不存在")
    return question

@router.put("/{question_id}", response_model=SuccessResponse)
async def update_question(question_id: str, question: QuestionUpdate):
    """更新题目"""
    try:
        success = data_manager.update_question(question_id, question.dict(exclude_unset=True))
        if not success:
            raise HTTPException(status_code=404, detail="题目不存在")
        return SuccessResponse(message="题目更新成功")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"更新题目失败: {str(e)}")

@router.delete("/{question_id}", response_model=SuccessResponse)
async def delete_question(question_id: str):
    """删除题目"""
    try:
        success = data_manager.delete_question(question_id)
        if not success:
            raise HTTPException(status_code=404, detail="题目不存在")
        return SuccessResponse(message="题目删除成功")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"删除题目失败: {str(e)}")

@router.post("/batch-delete", response_model=SuccessResponse)
async def batch_delete_questions(question_ids: List[str]):
    """批量删除题目"""
    try:
        deleted_count = data_manager.batch_delete_questions(question_ids)
        return SuccessResponse(
            message=f"成功删除 {deleted_count} 道题目",
            data={"deleted_count": deleted_count}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"批量删除题目失败: {str(e)}")

@router.post("/import/text", response_model=SuccessResponse)
async def import_from_text(text: str = Form(...)):
    """从文本导入题目"""
    try:
        imported_count = data_manager.import_from_text_content(text)
        return SuccessResponse(
            message=f"成功导入 {imported_count} 道题目",
            data={"imported_count": imported_count}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"文本导入失败: {str(e)}")

@router.post("/import/excel", response_model=SuccessResponse)
async def import_from_excel(file: UploadFile = File(...)):
    """从Excel导入题目"""
    try:
        # 读取Excel文件
        contents = await file.read()
        df = pd.read_excel(contents)
        
        imported_count = data_manager.import_from_dataframe(df)
        return SuccessResponse(
            message=f"成功导入 {imported_count} 道题目",
            data={"imported_count": imported_count}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Excel导入失败: {str(e)}")

@router.get("/export/json", response_model=List[QuestionResponse])
async def export_to_json():
    """导出题目为JSON格式"""
    try:
        return data_manager.questions
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"导出JSON失败: {str(e)}")

@router.get("/categories", response_model=Dict[str, List[str]])
async def get_categories():
    """获取所有分类信息"""
    try:
        return data_manager.categories
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取分类信息失败: {str(e)}")

@router.post("/{question_id}/review", response_model=SuccessResponse)
async def mark_as_reviewed(question_id: str):
    """标记题目为已复习"""
    try:
        success = data_manager.mark_as_reviewed(question_id)
        if not success:
            raise HTTPException(status_code=404, detail="题目不存在")
        return SuccessResponse(message="题目已标记为复习")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"标记复习失败: {str(e)}")