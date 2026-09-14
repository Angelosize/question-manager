from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form
from typing import Optional, List, Dict, Any
import pandas as pd
import json
import uuid
from datetime import datetime

from app.core.data_manager import DataManager, data_manager, get_data_manager
from app.models.question import (
    QuestionCreate, QuestionUpdate, QuestionResponse,
    QuestionListResponse, FilterParams
)
from app.models.common import SuccessResponse, ErrorResponse
from app.core.config import QUESTION_DB_FILE

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

        start = (page - 1) * limit
        end = start + limit
        paginated_questions = all_questions[start:end]

        # ===== 为每道题合并 exam 信息 =====
        for q in paginated_questions:
            exam = data_manager.get_exam_by_question_id(q['id'])
            if exam:
                q['exam'] = exam

        return QuestionListResponse(
            items=paginated_questions,
            total=total
        )
    except Exception as e:
        print(f"获取题目列表失败: {e}")
        return QuestionListResponse(items=[], total=0)

@router.post("/")
async def create_question(question: QuestionCreate, db: DataManager = Depends(get_data_manager)):
    try:
        question_data = question.dict(exclude_unset=True)
        exam_fields = ['exam_name', 'year', 'number', 'score', 'exam_source']
        exam_info = {k: question_data.pop(k, None) for k in exam_fields}
        exam_info = {k: v for k, v in exam_info.items() if v is not None}
        print(f"📌 提取的考试字段: {exam_info}")

        for key in ['knowledge_points', 'chapter', 'source', 'note', 'explanation']:
            if question_data.get(key) is None:
                question_data[key] = ''
        if question_data.get('options') is None:
            question_data['options'] = {}
        if question_data.get('tags') is None:
            question_data['tags'] = []

        question_id = db.add_question(question_data)

        if exam_info:
            exam_mapping = {
                "exam_name": exam_info.get('exam_name'),
                "year": exam_info.get('year'),
                "number": exam_info.get('number'),
                "score": exam_info.get('score'),
                "source": exam_info.get('exam_source'),
            }
            exam_mapping = {k: v for k, v in exam_mapping.items() if v is not None}
            db.add_exam_mapping(question_id, exam_mapping)
            print(f"✅ 已保存考试映射: {exam_info}")

        return {"id": question_id, "message": "题目创建成功"}
    except Exception as e:
        import traceback
        print(f"❌ 创建题目详细错误: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"创建题目失败: {str(e)}")

@router.get("/{question_id}", response_model=QuestionResponse)
async def get_question(question_id: str):
    question = next((q for q in data_manager.questions if q['id'] == question_id), None)
    if not question:
        raise HTTPException(status_code=404, detail="题目不存在")

    exam = data_manager.get_exam_by_question_id(question_id)
    response = dict(question)
    response['exam'] = exam
    return response

@router.put("/{question_id}", response_model=SuccessResponse)
async def update_question(question_id: str, question: QuestionUpdate):
    try:
        success = data_manager.update_question(question_id, question.dict(exclude_unset=True))
        if not success:
            raise HTTPException(status_code=404, detail="题目不存在")
        return SuccessResponse(message="题目更新成功")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"更新题目失败: {str(e)}")

# ⚠️ 修改：单个删除，增加冲突检查
@router.delete("/{question_id}", response_model=SuccessResponse)
async def delete_question(question_id: str, db: DataManager = Depends(get_data_manager)):
    try:
        # 1. 检查题目是否存在
        question = next((q for q in db.questions if q['id'] == question_id), None)
        if not question:
            raise HTTPException(status_code=404, detail="题目不存在")

        # 2. 检查冲突
        conflicts = db.get_delete_conflicts(question_id)
        if conflicts["has_conflict"]:
            # 构造详细的冲突信息
            detail_parts = []
            if conflicts["papers"]:
                paper_names = [f"「{p['name']}」" for p in conflicts["papers"]]
                detail_parts.append(f"被试卷 {', '.join(paper_names)} 引用")
            if conflicts["in_wrong_book"]:
                detail_parts.append("存在于错题本中")
            conflict_msg = "；".join(detail_parts)
            raise HTTPException(
                status_code=409,
                detail=f"无法删除该题目，因为{conflict_msg}。请先解除关联后再删除。"
            )

        # 3. 无冲突，执行删除
        # 删除题目本身
        success = db.delete_question(question_id)
        if not success:
            raise HTTPException(status_code=500, detail="删除题目失败")

        # 删除考试归属映射
        db.delete_exam_mapping(question_id)

        # 从错题本中移除（如果有）
        db.remove_from_wrong_questions(question_id)

        return SuccessResponse(message="题目删除成功")
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ 删除题目失败: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"删除题目失败: {str(e)}")

# ⚠️ 修改：批量删除，增加冲突检查，跳过有冲突的题目
@router.post("/batch-delete", response_model=SuccessResponse)
async def batch_delete_questions(question_ids: List[str], db: DataManager = Depends(get_data_manager)):
    try:
        if not question_ids:
            raise HTTPException(status_code=400, detail="请提供要删除的题目ID列表")

        # 检查冲突
        conflicts = db.batch_check_conflicts(question_ids)
        deletable_ids = []
        conflict_info = {}
        for qid, conf in conflicts.items():
            if conf["has_conflict"]:
                # 记录冲突原因
                reasons = []
                if conf["papers"]:
                    reasons.append(f"被试卷引用: {', '.join([p['name'] for p in conf['papers']])}")
                if conf["in_wrong_book"]:
                    reasons.append("在错题本中")
                conflict_info[qid] = "; ".join(reasons)
            else:
                deletable_ids.append(qid)

        # 执行删除
        deleted_count = 0
        for qid in deletable_ids:
            # 删除题目
            if db.delete_question(qid):
                db.delete_exam_mapping(qid)
                db.remove_from_wrong_questions(qid)
                deleted_count += 1

        # 构造返回信息
        message = f"成功删除 {deleted_count} 道题目"
        if conflict_info:
            conflict_msgs = [f"题目 {qid} 无法删除：{reason}" for qid, reason in conflict_info.items()]
            message += f"；{len(conflict_info)} 道题目因依赖冲突未删除: " + "；".join(conflict_msgs)

        return SuccessResponse(
            message=message,
            data={
                "deleted_count": deleted_count,
                "conflicts": conflict_info
            }
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"批量删除题目失败: {str(e)}")

@router.post("/import/text", response_model=SuccessResponse)
async def import_from_text(text: str = Form(...)):
    try:
        imported_count = data_manager.import_from_text_content(text)
        data_manager.save_questions()
        return SuccessResponse(
            message=f"成功导入 {imported_count} 道题目",
            data={"imported_count": imported_count}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"文本导入失败: {str(e)}")

@router.post("/import/excel", response_model=SuccessResponse)
async def import_from_excel(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        df = pd.read_excel(contents)
        imported_count = data_manager.import_from_dataframe(df)
        data_manager.save_questions()
        return SuccessResponse(
            message=f"成功导入 {imported_count} 道题目",
            data={"imported_count": imported_count}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Excel导入失败: {str(e)}")

@router.get("/export/json", response_model=List[QuestionResponse])
async def export_to_json():
    try:
        return data_manager.questions
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"导出JSON失败: {str(e)}")

@router.get("/categories", response_model=Dict[str, List[str]])
async def get_categories():
    try:
        return data_manager.categories
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取分类信息失败: {str(e)}")

@router.post("/{question_id}/review", response_model=SuccessResponse)
async def mark_as_reviewed(question_id: str):
    try:
        success = data_manager.mark_as_reviewed(question_id)
        if not success:
            raise HTTPException(status_code=404, detail="题目不存在")
        return SuccessResponse(message="题目已标记为复习")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"标记复习失败: {str(e)}")

@router.get("/debug/test")
async def debug_test():
    try:
        with open(QUESTION_DB_FILE, 'r', encoding='utf-8') as f:
            data = json.load(f)
        return {
            "status": "success",
            "file_exists": True,
            "data_count": len(data),
            "file_path": QUESTION_DB_FILE
        }
    except Exception as e:
        return {
            "status": "error",
            "error": str(e),
            "file_path": QUESTION_DB_FILE
        }