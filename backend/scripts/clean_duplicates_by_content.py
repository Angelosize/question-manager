# -*- coding: utf-8 -*-
"""
终极清理：题干+选项一致视为重复题。
保留策略：优先保留“在卷子中”的题，其次保留“最近更新”的题。
"""
import json
import shutil
from pathlib import Path
from datetime import datetime

DATA = Path(__file__).resolve().parent.parent / "data"

def clean_by_content():
    # 备份
    backup_dir = DATA / f"_backup_content_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    backup_dir.mkdir(exist_ok=True)
    for fn in ["question_database.json", "papers.json", "question_exams.json", "wrong_questions.json"]:
        src = DATA / fn
        if src.exists():
            shutil.copy(src, backup_dir / fn)
    print(f"💾 备份至: {backup_dir}\n")

    # 加载
    with open(DATA / "question_database.json", "r", encoding="utf-8") as f:
        questions = json.load(f)
    with open(DATA / "papers.json", "r", encoding="utf-8") as f:
        papers_data = json.load(f)
        papers = papers_data.get("papers", [])
    with open(DATA / "question_exams.json", "r", encoding="utf-8") as f:
        exams_data = json.load(f)
        exams = exams_data.get("mappings", [])
    with open(DATA / "wrong_questions.json", "r", encoding="utf-8") as f:
        wrong_questions = json.load(f)

    # 收集所有在卷子里的 QID 集合
    qids_in_papers = set()
    for p in papers:
        for q in p.get("questions", []):
            qids_in_papers.add(q.get("question_id"))

    # 按 (题干+选项) 分组
    groups = {}
    for q in questions:
        content = (q.get("content") or "").strip()
        options = q.get("options") or {}
        opts_str = "|".join(f"{k}:{v}" for k, v in sorted(options.items()))
        fingerprint = f"{content}#{opts_str}"

        if fingerprint not in groups:
            groups[fingerprint] = []
        groups[fingerprint].append(q)

    delete_qids = set()
    duplicate_map = {}

    # 遍历每组，处理重复
    for fp, q_list in groups.items():
        if len(q_list) <= 1:
            continue
        
        # 排序策略：优先在卷子里的；其次更新时间新的
        def sort_key(q):
            in_paper = q["id"] in qids_in_papers
            update_time = q.get("updated_time", "")
            return (in_paper, update_time)
        
        # 降序排列：in_paper=True 的在前，时间新的在前
        q_list.sort(key=sort_key, reverse=True)
        
        keep_q = q_list[0]
        keep_id = keep_q["id"]
        keep_ans = keep_q.get("answer", "")
        
        for q in q_list[1:]:
            del_id = q["id"]
            del_ans = q.get("answer", "")
            
            delete_qids.add(del_id)
            duplicate_map[del_id] = keep_id
            
            print(f"🗑️ 发现同题干题: {del_id} 和 {keep_id}")
            print(f"   题干: {keep_q.get('content', '')[:30]}...")
            print(f"   保留答案: {keep_ans} (来自 {keep_id})")
            print(f"   删除答案: {del_ans} (来自 {del_id})\n")

    # 更新题库
    valid_questions = [q for q in questions if q["id"] not in delete_qids]
    
    # 修复卷子引用
    for p in papers:
        new_q_list = []
        seen = set()
        for q in p.get("questions", []):
            old_id = q.get("question_id")
            new_id = duplicate_map.get(old_id, old_id)
            if new_id not in seen:
                seen.add(new_id)
                q["question_id"] = new_id
                new_q_list.append(q)
        p["questions"] = new_q_list
        p["question_count"] = len(new_q_list)
        p["total_score"] = sum(float(q.get("score", 0)) for q in new_q_list)

    # 修复错题本和映射
    valid_exams = []
    seen_exams = set()
    for e in exams:
        qid = e.get("question_id")
        if qid in delete_qids: continue
        if qid not in seen_exams:
            seen_exams.add(qid)
            valid_exams.append(e)

    valid_wrong = []
    seen_wrong = set()
    for w in wrong_questions:
        qid = w.get("question_id")
        if qid in delete_qids or qid in seen_wrong: continue
        seen_wrong.add(qid)
        valid_wrong.append(w)

    # 保存
    with open(DATA / "question_database.json", "w", encoding="utf-8") as f:
        json.dump(valid_questions, f, ensure_ascii=False, indent=2)
    with open(DATA / "papers.json", "w", encoding="utf-8") as f:
        json.dump({"papers": papers}, f, ensure_ascii=False, indent=2)
    with open(DATA / "question_exams.json", "w", encoding="utf-8") as f:
        json.dump({"mappings": valid_exams}, f, ensure_ascii=False, indent=2)
    with open(DATA / "wrong_questions.json", "w", encoding="utf-8") as f:
        json.dump(valid_wrong, f, ensure_ascii=False, indent=2)

    print(f"\n🎉 清理完成！")
    print(f"   - 题目剩余: {len(valid_questions)}")
    print(f"   - 本次清理: {len(delete_qids)} 道重复题")

if __name__ == "__main__":
    clean_by_content()