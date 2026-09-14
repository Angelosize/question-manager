from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
from collections import defaultdict
from app.core.data_manager import data_manager

router = APIRouter()

@router.get("/list-papers")
async def list_paper_names():
    try:
        all_questions = data_manager.questions
        paper_names = set()
        for q in all_questions:
            # 确保题目有 id
            qid = q.get('id')
            if not qid:
                continue
            exam = data_manager.get_exam_by_question_id(qid)
            if exam:
                name = exam.get('exam_name')
                if name:
                    paper_names.add(name)
        return {"papers": sorted(paper_names)}
    except Exception as e:
        # 打印详细错误信息到控制台
        import traceback
        print(f"❌ list_paper_names 错误: {e}")
        print(traceback.format_exc())
        # 返回空列表，避免前端崩溃
        return {"papers": []}

@router.get("/")
async def get_paper_compare(
    paper_name: str = Query(..., description="卷子名称"),
    years: Optional[List[int]] = Query(None, description="年份列表")
):
    try:
        all_questions = data_manager.questions
        filtered = []
        for q in all_questions:
            qid = q.get('id')
            if not qid:
                continue
            exam = data_manager.get_exam_by_question_id(qid)
            if not exam:
                continue
            if exam.get('exam_name') != paper_name:
                continue
            year = exam.get('year')
            # 修复：当 years 为 None 时，包含所有年份（包括 0）
            if years is not None and year not in years:
                continue
            q_copy = q.copy()
            q_copy['year'] = year
            q_copy['number'] = exam.get('number')
            q_copy['score'] = exam.get('score')
            kp = q_copy.get('knowledge_points', '')
            if isinstance(kp, str):
                kp_list = [p.strip() for p in kp.split('、') if p.strip()] if kp else []
            else:
                kp_list = []
            q_copy['knowledge_points_list'] = kp_list
            filtered.append(q_copy)

        if not filtered:
            raise HTTPException(status_code=404, detail=f"未找到卷名 '{paper_name}' 的题目")

        years_set = sorted(set(q['year'] for q in filtered if q.get('year') is not None))
        grouped_by_year = defaultdict(list)
        for q in filtered:
            grouped_by_year[q['year']].append(q)

        kp_stats = {}
        for year, questions in grouped_by_year.items():
            kp_count = defaultdict(int)
            for q in questions:
                for kp in q.get('knowledge_points_list', []):
                    kp_count[kp] += 1
            kp_stats[year] = dict(kp_count)

        type_stats = {}
        for year, questions in grouped_by_year.items():
            type_count = defaultdict(int)
            for q in questions:
                q_type = q.get('type', '未知')
                type_count[q_type] += 1
            type_stats[year] = dict(type_count)

        number_stats = {}
        for year, questions in grouped_by_year.items():
            num_count = defaultdict(int)
            for q in questions:
                num = q.get('number')
                if num:
                    num_count[num] += 1
            number_stats[year] = dict(num_count)

        all_kps = set()
        for year_data in kp_stats.values():
            all_kps.update(year_data.keys())
        all_kps = sorted(all_kps)

        heatmap_data = []
        for year in years_set:
            row = {'year': year}
            for kp in all_kps:
                row[kp] = kp_stats.get(year, {}).get(kp, 0)
            heatmap_data.append(row)

        return {
            "paper_name": paper_name,
            "years": years_set,
            "total_questions": len(filtered),
            "kp_stats": kp_stats,
            "type_stats": type_stats,
            "number_stats": number_stats,
            "heatmap": {
                "years": years_set,
                "knowledge_points": all_kps,
                "data": heatmap_data
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        print(f"❌ get_paper_compare 错误: {e}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"获取对比数据失败: {str(e)}")