# -*- coding: utf-8 -*-
"""补全第20题的完整子问题"""
import json
import shutil
from pathlib import Path
from datetime import datetime

DATA = Path(__file__).resolve().parent.parent / "data"
qfile = DATA / "question_database.json"

backup_dir = DATA / f"_backup_q20_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
backup_dir.mkdir(exist_ok=True)
shutil.copy(qfile, backup_dir / "question_database.json")
print(f"💾 备份: {backup_dir}")

# 第20题正确完整题干
Q20_CONTENT = (
    "如图丙所示，用钢尺做探究实验，把钢尺的一端紧按在桌面上，拨动伸出桌面的一端，"
    "会听到它发出的声音，同时注意观察钢尺振动的快慢，改变钢尺伸出桌面的长度，用相同的"
    "力度再次拨动。\n\n"
    "(1) 本实验中应该听的声音是____。\n"
    "  A. 钢尺伸出桌面部分振动发出的\n"
    "  B. 钢尺拍打桌面发出的\n\n"
    "(2) 实验时，钢尺伸出桌面的长度越长，振动越慢，发出声音的音调越____，"
    "说明：音调的高低与声源振动的____有关。\n\n"
    "(3) 实验时，保持钢尺伸出桌面的长度不变，改变拨动力度，则是研究声音的____"
    "与振动幅度的关系，实验中运用到的研究方法是____。\n\n"
    "(4) 小华发现钢尺伸出桌面的长度太长时，可以明显看到钢尺在振动，但听不到声音，"
    "这是因为____。"
)


def main():
    with open(qfile, "r", encoding="utf-8") as f:
        questions = json.load(f)

    # 题目 ID 是 Q85780DBA
    target_id = "Q85780DBA"
    found = False
    for q in questions:
        if q["id"] == target_id:
            old = q.get("content", "")
            q["content"] = Q20_CONTENT
            # 顺便保证答案正确
            q["answer"] = "(1) A；(2) 低；频率；(3) 响度；控制变量法；(4) 钢尺振动频率低于20Hz（发出的是次声波）"
            q["type"] = "实验题"
            print(f"🔧 Q85780DBA 题干已补全")
            print(f"   旧: {old[:80]}...")
            print(f"   新: {Q20_CONTENT[:80]}...")
            found = True
            break

    if not found:
        print(f"❌ 未找到题目 {target_id}")

    with open(qfile, "w", encoding="utf-8") as f:
        json.dump(questions, f, ensure_ascii=False, indent=2)

    print("\n✅ 完成，请重启后端")


if __name__ == "__main__":
    main()