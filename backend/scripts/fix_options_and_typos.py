# -*- coding: utf-8 -*-
"""
1. 第3题选项："树背" → "椅背"
2. 扫描所有选择题/多选题：题干里若含 A./B./C./D. 选项且 options 非空，剥离题干
"""
import json
import re
import shutil
from pathlib import Path
from datetime import datetime

DATA = Path(__file__).resolve().parent.parent / "data"
qfile = DATA / "question_database.json"

# 备份
backup_dir = DATA / f"_backup_clean_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
backup_dir.mkdir(exist_ok=True)
shutil.copy(qfile, backup_dir / "question_database.json")
print(f"💾 备份: {backup_dir}")


def strip_options_from_content(content: str) -> str:
    """从题干里剥离 A. B. C. D. 选项部分"""
    if not content:
        return content

    # 找所有 [A-F] + 点/顿号 的位置
    pattern = re.compile(r'[A-F]\s*[.、．]\s*\S')
    valid_starts = []
    for m in pattern.finditer(content):
        p = m.start()
        if p == 0:
            valid_starts.append(p)
        elif content[p - 1] in ' \t\n\u3000':
            valid_starts.append(p)
        elif content[p - 1] in '）)':
            valid_starts.append(p)

    # 至少 2 个连续选项才认为是"题干里藏了选项"
    if len(valid_starts) < 2:
        return content

    first = valid_starts[0]
    # 从 first 往前跳过空格/全角空格
    cut = first
    while cut > 0 and content[cut - 1] in ' \t\u3000':
        cut -= 1
    stripped = content[:cut].rstrip()
    return stripped if stripped else content


def main():
    with open(qfile, "r", encoding="utf-8") as f:
        questions = json.load(f)

    # ===== 1. 第3题：树背 → 椅背（题干和选项都改） =====
    for q in questions:
        if q["id"] == "Q0BF3FA73":
            # 选项
            if q.get("options"):
                for k in list(q["options"].keys()):
                    old = q["options"][k]
                    new = old.replace("树背", "椅背")
                    if old != new:
                        print(f"🔧 Q0BF3FA73 选项{k}: {old} → {new}")
                        q["options"][k] = new
            # 题干（保险起见也改）
            if "树背" in (q.get("content") or ""):
                old = q["content"]
                q["content"] = old.replace("树背", "椅背")
                print(f"🔧 Q0BF3FA73 题干: 树背 → 椅背")

    # ===== 2. 扫描所有题，清理题干中的重复选项 =====
    cleaned = 0
    for q in questions:
        content = q.get("content", "") or ""
        opts = q.get("options") or {}
        if not content or not opts:
            continue
        if q.get("type") not in ("选择题", "多选题"):
            continue

        new_content = strip_options_from_content(content)
        if new_content != content and new_content:
            print(f"🔧 {q['id']} 题干清理:")
            print(f"   旧: {content[:90]}...")
            print(f"   新: {new_content[:90]}...")
            q["content"] = new_content
            cleaned += 1

    with open(qfile, "w", encoding="utf-8") as f:
        json.dump(questions, f, ensure_ascii=False, indent=2)

    print(f"\n✅ 完成：第3题修正 + {cleaned} 道题题干清理")
    print("⚠️ 请重启后端！")


if __name__ == "__main__":
    main()