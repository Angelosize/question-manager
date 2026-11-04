# -*- coding: utf-8 -*-
"""
题库、卷子去重与数据修复脚本
规则：题干 + 选项 + 答案 完全一致，即视为重复题。
"""
import json
import shutil
from pathlib import Path
from datetime import datetime

DATA = Path(__file__).resolve().parent.parent / "data"

def clean_all():
    # ========== 0. 备份 ==========
    backup_dir = DATA / f"_backup_clean_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    backup_dir.mkdir(exist_ok=True)
    for fn in ["question_database.json", "papers.json", "question_exams.json", "wrong_questions.json"]:
        src = DATA / fn
        if src.exists():
            shutil.copy(src, backup_dir / fn)
    print(f"💾 数据已备份至: {backup_dir}\n")

    # ========== 1. 加载数据 ==========
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

    # ========== 2. 题目去重 ==========
    seen_fingerprints = {} # 指纹 -> 保留的 QID
    delete_qids = set()    # 要删除的 QID
    duplicate_map = {}     # 被删的 QID -> 保留的 QID

    for q in questions:
        qid = q["id"]
        # 构造指纹：题干去空格 + 选项排序 + 答案去空格
        content = (q.get("content") or "").strip()
        options = q.get("options") or {}
        opts_str = "|".join(f"{k}:{v}" for k, v in sorted(options.items()))
        answer = (q.get("answer") or "").strip()
        fingerprint = f"{content}#{opts_str}#{answer}"

        if fingerprint in seen_fingerprints:
            keep_qid = seen_fingerprints[fingerprint]
            delete_qids.add(qid)
            duplicate_map[qid] = keep_qid
            print(f"🗑️ 发现重复题目: {qid} 和 {keep_qid} 内容一致，标记删除 {qid}")
        else:
            seen_fingerprints[fingerprint] = qid

    # 过滤题目
    valid_questions = [q for q in questions if q["id"] not in delete_qids]
    print(f"\n✅ 题目去重完成: 原始 {len(questions)} 道 -> 剩余 {len(valid_questions)} 道 (清理了 {len(delete_qids)} 道)")

    # ========== 3. 卷子修复与去重 ==========
    papers_to_delete = set()
    for i, paper in enumerate(papers):
        # 3.1 修复卷子里的题目引用
        new_q_list = []
        seen_in_paper = set()
        for q in paper.get("questions", []):
            old_id = q.get("question_id")
            new_id = duplicate_map.get(old_id, old_id) # 替换为保留下来的题目ID
            
            if new_id not in seen_in_paper:
                seen_in_paper.add(new_id)
                q["question_id"] = new_id
                new_q_list.append(q)
                
        # 3.2 重排题号和重算总分
        for idx, q in enumerate(new_q_list, 1):
            q["number"] = f"{idx}." if isinstance(q.get("number"), str) else idx
            
        paper["questions"] = new_q_list
        paper["question_count"] = len(new_q_list)
        paper["total_score"] = sum(float(q.get("score", 0)) for q in new_q_list)
        
        # 3.3 判断卷子是否重复（同名且题目ID列表完全一致）
        p_fingerprint = f"{paper.get('name')}#{','.join(q['question_id'] for q in new_q_list)}"
        
        is_dup = False
        for j in range(i):
            if j in papers_to_delete: continue
            old_p = papers[j]
            old_fingerprint = f"{old_p.get('name')}#{','.join(q['question_id'] for q in old_p.get('questions', []))}"
            if p_fingerprint == old_fingerprint:
                print(f"🗑️ 发现重复卷子: '{paper.get('name')}' (ID: {paper.get('id')}) 与之前的卷子完全一样，标记删除")
                papers_to_delete.add(i)
                is_dup = True
                break
        
        if not is_dup:
            print(f"🔧 卷子 '{paper.get('name')}' 数据修复完成: {paper['question_count']} 题, {paper['total_score']} 分")

    valid_papers = [p for i, p in enumerate(papers) if i not in papers_to_delete]
    
    # ========== 4. 考试映射去重 ==========
    seen_exams = set()
    valid_exams = []
    for e in exams:
        qid = e.get("question_id")
        if qid in delete_qids:
            continue # 删除已废弃题目的映射
        # 简单去重：同一个 qid 只要有映射即可
        if qid not in seen_exams:
            seen_exams.add(qid)
            valid_exams.append(e)

    # ========== 5. 错题本清理 ==========
    valid_wrong = []
    seen_wrong = set()
    for w in wrong_questions:
        qid = w.get("question_id")
        if qid in delete_qids or qid in seen_wrong:
            continue
        seen_wrong.add(qid)
        valid_wrong.append(w)

    # ========== 6. 保存数据 ==========
    with open(DATA / "question_database.json", "w", encoding="utf-8") as f:
        json.dump(valid_questions, f, ensure_ascii=False, indent=2)
        
    with open(DATA / "papers.json", "w", encoding="utf-8") as f:
        json.dump({"papers": valid_papers}, f, ensure_ascii=False, indent=2)
        
    with open(DATA / "question_exams.json", "w", encoding="utf-8") as f:
        json.dump({"mappings": valid_exams}, f, ensure_ascii=False, indent=2)
        
    with open(DATA / "wrong_questions.json", "w", encoding="utf-8") as f:
        json.dump(valid_wrong, f, ensure_ascii=False, indent=2)

    print(f"\n🎉 清理全部完成！")
    print(f"   - 题目剩余: {len(valid_questions)}")
    print(f"   - 卷子剩余: {len(valid_papers)}")
    print(f"   - 错题剩余: {len(valid_wrong)}")
    print("⚠️ 请重启后端！")

if __name__ == "__main__":
    clean_all()