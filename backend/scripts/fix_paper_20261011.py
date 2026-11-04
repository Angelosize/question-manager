# -*- coding: utf-8 -*-
"""修正试卷 P490FCD35（八年级10月物理限时作业）的所有数据错误"""
import json
from pathlib import Path
from datetime import datetime

DATA = Path(__file__).resolve().parent.parent / "data"

PAPER_ID = "P490FCD35"
PAPER_NAME = "2026-2027学年度八年级10月份物理限时作业"

# ⭐ 新题 ID（固定，可重复跑）
NEW_Q10 = "QPAPER10X"   # 木块长度 + 秒表
NEW_Q24 = "QPAPER24X"   # 声速材料

# ⭐ 现有题 → 新题号
REMAP = {
    "QE33F4FD6": "1.", "Q049BEF14": "2.", "Q0BF3FA73": "3.",
    "QCA0CB448": "4.", "Q87EED682": "5.", "Q669037BC": "6.",
    "QB14A6886": "7.", "QD1C16F81": "8.", "Q01868061": "9.",
    "Q0D828B2F": "11.", "Q3B7CE700": "12.", "Q55E305E2": "13.",
    "Q39858317": "14.", "QF7BE56D5": "15.", "Q6819B1D8": "16.",
    "QFFC3AC95": "17.", "Q3D492686": "18.", "Q51839672": "19.",
    "Q85780DBA": "20.", "QCA56BF24": "21.", "Q6867475B": "22.",
    "Q3941A838": "23.",
}

# ⭐ 分值
SCORES = {
    "QE33F4FD6": 2, "Q049BEF14": 2, "Q0BF3FA73": 2, "QCA0CB448": 2,
    "Q87EED682": 2, "Q669037BC": 2, "QB14A6886": 2, "QD1C16F81": 2,
    "Q01868061": 2,
    NEW_Q10: 2,
    "Q0D828B2F": 2, "Q3B7CE700": 2, "Q55E305E2": 2,
    "Q39858317": 2, "QF7BE56D5": 2,
    "Q6819B1D8": 2, "QFFC3AC95": 2,
    "Q3D492686": 6, "Q51839672": 6, "Q85780DBA": 6, "QCA56BF24": 6,
    "Q6867475B": 9, "Q3941A838": 7,
    NEW_Q24: 6,
}


def main():
    # ====== 1. question_database.json ======
    qfile = DATA / "question_database.json"
    with open(qfile, "r", encoding="utf-8") as f:
        questions = json.load(f)

    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    qids = {q["id"] for q in questions}

    # 新增第 10 题
    if NEW_Q10 not in qids:
        questions.append({
            "id": NEW_Q10,
            "subject": "物理",
            "type": "填空题",
            "content": "如图1所示，图中木块的长度为______cm。图2中秒表的读数是______s。",
            "options": {},
            "answer": "3.80；217.5",   # ⚠️ 请对照图片修改
            "explanation": "",
            "difficulty": "基础",
            "knowledge_points": "刻度尺读数、秒表读数",
            "chapter": "",
            "tags": ["刻度尺读数", "秒表读数"],
            "source": "AI导入卷子",
            "note": "",
            "created_time": now, "updated_time": now,
            "status": "active",
            "review_count": 0, "last_review": "",
            "wrong_count": 0, "last_wrong": "",
            "drawing": None, "original_image": None,
        })
        print(f"✅ 新增第 10 题: {NEW_Q10}")

    # 新增第 24 题
    if NEW_Q24 not in qids:
        questions.append({
            "id": NEW_Q24,
            "subject": "物理",
            "type": "综合题",
            "content": (
                "阅读材料，完成相关问题。\n\n"
                "材料1：声音的传播离不开介质，下表是“一些介质中的声速”。\n\n"
                "| 介质 | v/(m/s) | 介质 | v/(m/s) | 介质 | v/(m/s) |\n"
                "|------|---------|------|---------|------|---------|\n"
                "| 空气(15℃) | 340 | 煤油(25℃) | 1324 | 铜(棒) | 3750 |\n"
                "| 空气(25℃) | 346 | 蒸馏水(25℃) | 1497 | 铝(棒) | 5000 |\n"
                "| 空气(35℃) | 352 | 海水(25℃) | 1531 | 铁(棒) | 5200 |\n\n"
                "材料2：人能听到的声音频率有一定的范围。多数人能够听到的频率范围是20~20000Hz。"
                "人们把高于20000Hz的声波叫作超声波，因为它们超过人类听觉频率的上限；"
                "把低于20Hz的声波叫作次声波，因为它们低于人类听觉频率的下限。声音、超声波、次声波统称声。\n\n"
                "材料3：在黑暗的深海，光传不远，无线电波衰减很快。于是，人类发明了声呐。"
                "声呐能够向水中发射声波，比如某声呐发出的声波的频率在5kHz~40kHz，"
                "由于这种声波的频率较高，可以形成较强指向性的声波，在水中传播时，"
                "如果遇到潜艇、水雷、鱼群等目标就会被反射回来，反射回来的声波（下称“回声”）被声呐接收，"
                "根据声信号往返时间可以确定目标的距离。声呐发出声波碰到的目标如果是运动的，"
                "回声的音调就会有所变化，它的变化规律是：如果回声的音调变高，说明目标正向声呐靠近；"
                "如果回声的音调变低，说明目标远离声呐。\n\n"
                "(1)分析表格可知，声速可能与______有关；\n"
                "(2)某声呐发出30000Hz的声波来探测鱼群的位置，下列说法正确的是___；\n"
                "A.该声波不属于超声波  B.只要该声波的响度足够大，人是可以听到的\n"
                "C.声呐主要利用了声音可以传递信息的性质  D.该声呐在外太空依然可以使用\n"
                "(3)一艘科考船行驶在某海域，利用声呐系统对该海域的海底形状进行了测绘："
                "在经过该海域水平面等间距的A、B、C三个位置时，向海底定向发射超声波，"
                "测得回声的时间分别为0.30s、0.26s、0.30s。根据时间，求出海底与海平面的距离，"
                "就可以绘出海底的大致形状，则该海域海底的大致形状可能是图___；\n"
                "(4)如图是声呐发出的原声和回声的波形图，由图像可判断回声的音调______"
                "（选填“变高”或“变低”），说明目标正______（选填“靠近”或“远离”）声呐。"
            ),
            "options": {},
            "answer": "(1)温度、介质种类；(2)C；(3)乙；(4)变低；远离",
            "explanation": "",
            "difficulty": "中等",
            "knowledge_points": "声速与介质关系、超声波与次声波、声呐原理",
            "chapter": "",
            "tags": ["声速与介质关系", "超声波与次声波", "声呐原理"],
            "source": "AI导入卷子",
            "note": "",
            "created_time": now, "updated_time": now,
            "status": "active",
            "review_count": 0, "last_review": "",
            "wrong_count": 0, "last_wrong": "",
            "drawing": None, "original_image": None,
        })
        print(f"✅ 新增第 24 题: {NEW_Q24}")

    # 修正已有题（第13题铁轨的题型）
    for q in questions:
        if q["id"] == "Q55E305E2":
            q["type"] = "填空题"
            print(f"🔧 Q55E305E2 题型修正: 计算题 → 填空题")
        if q["id"] == "Q0D828B2F":
            # OCR 错的数值修正
            q["content"] = q["content"].replace("18.6cm", "18.68cm").replace("19.78cm", "18.9cm")
            print(f"🔧 Q0D828B2F 题干数值修正")

    with open(qfile, "w", encoding="utf-8") as f:
        json.dump(questions, f, ensure_ascii=False, indent=2)
    print(f"💾 已保存 {len(questions)} 道题")

    # ====== 2. papers.json ======
    pfile = DATA / "papers.json"
    with open(pfile, "r", encoding="utf-8") as f:
        pdata = json.load(f)

    # 新题目顺序
    ORDER = (
        ["QE33F4FD6", "Q049BEF14", "Q0BF3FA73", "QCA0CB448", "Q87EED682",
         "Q669037BC", "QB14A6886", "QD1C16F81", "Q01868061"] +
        [NEW_Q10] +
        ["Q0D828B2F", "Q3B7CE700", "Q55E305E2", "Q39858317", "QF7BE56D5",
         "Q6819B1D8", "QFFC3AC95", "Q3D492686", "Q51839672", "Q85780DBA",
         "QCA56BF24", "Q6867475B", "Q3941A838"] +
        [NEW_Q24]
    )
    NUMBERS = [f"{i}." for i in range(1, len(ORDER) + 1)]

    for p in pdata["papers"]:
        if p["id"] != PAPER_ID:
            continue
        p["name"] = PAPER_NAME
        new_questions = []
        for qid, num in zip(ORDER, NUMBERS):
            new_questions.append({
                "question_id": qid,
                "number": num,
                "score": float(SCORES.get(qid, 2)),
                "source_page": None,
            })
        p["questions"] = new_questions
        p["question_count"] = len(new_questions)
        p["total_score"] = sum(q["score"] for q in new_questions)
        print(f"📝 卷子修正: {p['name']}，{p['question_count']} 题，{p['total_score']} 分")

    with open(pfile, "w", encoding="utf-8") as f:
        json.dump(pdata, f, ensure_ascii=False, indent=2)

    # ====== 3. question_exams.json =====
    efile = DATA / "question_exams.json"
    with open(efile, "r", encoding="utf-8") as f:
        edata = json.load(f)

    # 删除旧映射（只保留别的卷子的）
    edata["mappings"] = [
        m for m in edata["mappings"]
        if "限时作业" not in m.get("exam_name", "")
    ]

    # 新增映射
    for qid, num in zip(ORDER, NUMBERS):
        edata["mappings"].append({
            "question_id": qid,
            "exam_name": PAPER_NAME,
            "year": 2026,
            "number": num,
            "score": SCORES.get(qid, 2),
            "source": f"{PAPER_NAME} 2026年",
        })

    with open(efile, "w", encoding="utf-8") as f:
        json.dump(edata, f, ensure_ascii=False, indent=2)
    print(f"💾 已重建 {len(ORDER)} 条 exam 映射")

    print("\n🎉 全部完成！")
    print(f"   卷子名: {PAPER_NAME}")
    print(f"   题数: {len(ORDER)} 题")
    print(f"   总分: {sum(SCORES.values())} 分")


if __name__ == "__main__":
    main()