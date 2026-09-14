from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
from typing import List, Dict, Any
import base64
from pydantic import BaseModel

from app.core.data_manager import data_manager
from app.utils.export_helpers import ExportUtils

router = APIRouter()

class TextImportRequest(BaseModel):
    text: str

@router.post("/export/excel")
async def export_questions_to_excel():
    """导出题目到Excel"""
    try:
        questions = data_manager.questions
        print(f"📊 准备导出Excel，题目数量: {len(questions)}")
        
        # 调试：检查数据格式
        for i, q in enumerate(questions[:3]):
            print(f"🔍 题目{i+1}: id={q.get('id')}, tags={q.get('tags')} (type: {type(q.get('tags'))})")
        
        result = ExportUtils.create_excel_export(questions)
        
        if result["success"]:
            return JSONResponse(content=result)
        else:
            print(f"❌ Excel导出失败: {result['error']}")
            raise HTTPException(status_code=500, detail=result["error"])
    except Exception as e:
        print(f"❌ 导出异常: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"导出异常: {str(e)}")

@router.post("/export/text")
async def export_questions_to_text():
    """导出题目到文本"""
    questions = data_manager.questions
    result = ExportUtils.create_text_export(questions)
    
    if result["success"]:
        return JSONResponse(content=result)
    else:
        raise HTTPException(status_code=500, detail=result["error"])

@router.post("/import/excel")
async def import_questions_from_excel(file: UploadFile = File(...)):
    """从Excel导入题目"""
    try:
        content = await file.read()
        success_count, imported_questions = ExportUtils.import_from_excel(content)
        
        if success_count > 0:
            # 添加到数据管理器
            data_manager.questions.extend(imported_questions)
            
            # 修复保存方法
            if hasattr(data_manager, 'save_questions'):
                data_manager.save_questions(data_manager.questions)
            elif hasattr(data_manager, '_save_questions'):
                data_manager._save_questions(data_manager.questions)
            else:
                import json
                with open('backend/data/question_database.json', 'w', encoding='utf-8') as f:
                    json.dump(data_manager.questions, f, ensure_ascii=False, indent=2)
            
            return {
                "success": True,
                "imported_count": success_count,
                "message": f"成功导入 {success_count} 道题目"
            }
        else:
            return {
                "success": False,
                "imported_count": 0,
                "message": "未导入任何题目，请检查文件格式"
            }
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"导入失败: {str(e)}")

@router.post("/import/text")
async def import_questions_from_text(request: TextImportRequest):
    """从文本导入题目"""
    try:
        print(f"📥 接收到文本导入请求，文本长度: {len(request.text)}")
        
        if not request.text or not request.text.strip():
            return {
                "success": False,
                "imported_count": 0,
                "message": "文本内容为空"
            }
        
        success_count, imported_questions = ExportUtils.import_from_text(request.text)
        print(f"✅ 解析成功: {success_count} 道题目")
        
        if success_count > 0:
            # 添加到数据管理器
            data_manager.questions.extend(imported_questions)
            
            # 修复保存方法
            if hasattr(data_manager, 'save_questions'):
                data_manager.save_questions(data_manager.questions)
            elif hasattr(data_manager, '_save_questions'):
                data_manager._save_questions(data_manager.questions)
            else:
                import json
                with open('backend/data/question_database.json', 'w', encoding='utf-8') as f:
                    json.dump(data_manager.questions, f, ensure_ascii=False, indent=2)
            
            return {
               "success": True,
                "imported_count": success_count,
                "message": f"成功导入 {success_count} 道题目"
            }
        else:
            return {
                "success": False,
                "imported_count": 0,
                "message": "未导入任何题目，请检查文本格式"
            }
            
    except Exception as e:
        print(f"❌ 导入失败: {str(e)}")
        import traceback
        traceback.print_exc()
        return {
            "success": False,
            "imported_count": 0,
            "message": f"导入失败: {str(e)}"
        }