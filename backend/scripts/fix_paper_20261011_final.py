# -*- coding: utf-8 -*-
"""一键修正试卷 P490FCD35（八年级10月物理限时作业）的所有数据"""
import json
import shutil
from pathlib import Path
from datetime import datetime

DATA = Path(__file__).resolve().parent.parent / "data"
PAPER_ID = "P490FCD35"
PAPER_NAME = "2026-2027学年度八年级10月份物理限时作业"
NEW_Q10 = "QPAPER10X"
NEW_Q24 = "QPAPER24X"

# ========== 备份 ==========
backup_dir = DATA / f"_backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
backup_dir.mkdir(exist_ok=True)
for fn in ["question_database.json", "papers.json", "question_exams.json"]:
    src = DATA / fn
    if src.exists():
        shutil.copy(src, backup_dir / fn)
print(f"💾 已备份到: {backup_dir}")

# ========== 答案对照 ==========
ANSWERS = {
    "QE33F4FD6": "B",
    "Q049BEF14": "D",
    "Q0BF3FA73": "C",
    "QCA0CB448": "D",
    "Q87EED682": "C",
    "Q669037BC": "B",
    "QB14A6886": "ABC",
    "QD1C16F81": "AB",
    "Q01868061": "ACD",
    "Q0D828B2F": "18.67；1mm",
    "Q3B7CE700": "(1) 4.08×10⁻¹⁴；(2) 5.28×10⁻⁹",
    "Q55E305E2": "0.1；1.0",
    "Q39858317": "人耳处；不能",
    "QF7BE56D5": "瓶子和水；响度",
    "QFFC3AC95": "（作图题，见原卷）",
    "Q6819B1D8": "（作图题，见原卷）",
    "Q3D492686": "(1) v=s/t；(2) BC；(3) 80.0；0.16；(4) C；(5) 偏大",
    "Q51839672": "(1) 乒乓球被弹开；(2) 不能；(3) 振动；转换；(4) 声音的传播需要介质，真空不能传声；(5) 科学推理法（理想实验法）",
    "Q85780DBA": "(1) A；(2) 低；频率；(3) 响度；控制变量法；(4) 钢尺振动频率低于20Hz（发出的是次声波）",
    "QCA56BF24": "(1) 固体能传播声音；(2) 金属丝的传声性能比棉线的好；(3) 不能；(4) ① a、d；② 音调的高低与琴弦横截面积的关系；③ 没有控制材料相同",
    "Q6867475B": (
        "解：\n"
        "(1) 列车从上海站到无锡站的运行时间：\n"
        "    t = 22:23 - 21:15 = 1h8min = 68min\n\n"
        "(2) 无锡站到北京站全程：s = 1463 - 165 = 1298km，\n"
        "    运行时间：t' = 09:25 + 24h - 22:25 = 11h\n"
        "    平均速度：v = s/t' = 1298/11 = 118km/h = 32.8m/s\n\n"
        "(3) 列车在隧道内：s₁ = 750m，t₁ = 12.5s，v₁ = 750/12.5 = 60m/s\n"
        "    完全通过隧道：s₂ = 750 + 210 = 960m\n"
        "    t₂ = 960/60 = 16s\n\n"
        "答：(1) 68min；(2) 32.8m/s；(3) 16s"
    ),
    "Q3941A838": (
        "解：\n"
        "(1) 声音传播的距离：s声 = v声·t = 340×2 = 680m\n\n"
        "(2) 按喇叭时车距山崖 s₁ = 360m\n"
        "    2s₁ = s声 + s车  →  2×360 = 680 + s车  →  s车 = 40m\n"
        "    听到回声处距山崖：s₂ = 360 - 40 = 320m\n\n"
        "(3) 汽车速度：v车 = s车/t = 40/2 = 20m/s\n\n"
        "答：(1) 680m；(2) 320m；(3) 20m/s"
    ),
}

# ========== 题型修正 ==========
TYPE_FIX = {
    "QD1C16F81": "多选题",
    "Q01868061": "多选题",
    "Q55E305E2": "填空题",
}

# ========== 分值 ==========
SCORES = {
    # 选择/多选 1-9：2 分
    "QE33F4FD6": 2, "Q049BEF14": 2, "Q0BF3FA73": 2, "QCA0CB448": 2,
    "Q87EED682": 2, "Q669037BC": 2, "QB14A6886": 2, "QD1C16F81": 2,
    "Q01868061": 2,
    # 填空 10-15：2 分
    NEW_Q10: 2,
    "Q0D828B2F": 2, "Q3B7CE700": 2, "Q55E305E2": 2,
    "Q39858317": 2, "QF7BE56D5": 2,
    # 作图 16-17：2 分
    "QFFC3AC95": 2, "Q6819B1D8": 2,
    # 实验 18-21：6 分
    "Q3D492686": 6, "Q51839672": 6, "Q85780DBA": 6, "QCA56BF24": 6,
    # 综合 22-24：9/7/6
    "Q6867475B": 9, "Q3941A838": 7,
    NEW_Q24: 6,
}

# ========== 题目顺序（图片原卷顺序） ==========
ORDER = [
    "QE33F4FD6", "Q049BEF14", "Q0BF3FA73", "QCA0CB448", "Q87EED682",
    "Q669037BC", "QB14A6886", "QD1C16F81", "Q01868061",
    NEW_Q10,
    "Q0D828B2F", "Q3B7CE700", "Q55E305E2", "Q39858317", "QF7BE56D5",
    "QFFC3AC95", "Q6819B1D8",
    "Q3D492686", "Q51839672", "Q85780DBA", "QCA56BF24",
    "Q6867475B", "Q3941A838",
    NEW_Q24,
]


# ========== 1. question_database.json ==========
def fix_questions():
    qfile = DATA / "question_database.json"
    with open(qfile, "r", encoding="utf-8") as f:
        questions = json.load(f)

    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    qids = {q["id"] for q in questions}

    # 新增第 10 题
    if NEW_Q10 not in qids:
        questions.append({
            "id": NEW_Q10, "subject": "物理", "type": "填空题",
            "content": "如图1所示，图中木块的长度为______cm。图2中秒表的读数是______s。",
            "options": {}, "answer": "(1) 1.90；(2) 475.3",
            "explanation": "", "difficulty": "基础",
            "knowledge_points": "刻度尺读数、秒表读数",
            "chapter": "", "tags": ["刻度尺读数", "秒表读数"],
            "source": "AI导入卷子", "note": "",
            "created_time": now, "updated_time": now,
            "status": "active", "review_count": 0, "last_review": "",
            "wrong_count": 0, "last_wrong": "",
            "drawing": None, "original_image": None,
        })
        print(f"✅ 新增 QPAPER10X（第10题）")

    # 新增第 24 题
    if NEW_Q24 not in qids:
        questions.append({
            "id": NEW_Q24, "subject": "物理", "type": "综合题",
            "content": (
                "阅读材料，完成相关问题。\n\n"
                "材料1：声音的传播离不开介质，下表是“一些介质中的声速”。\n"
                "| 介质 | v/(m/s) | 介质 | v/(m/s) | 介质 | v/(m/s) |\n"
                "|---|---|---|---|---|---|\n"
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
                "回声的音调就会有所变化：如果回声的音调变高，说明目标正向声呐靠近；"
                "如果回声的音调变低，说明目标远离声呐。\n\n"
                "(1) 分析表格可知，声速可能与______有关；\n"
                "(2) 某声呐发出30000Hz的声波来探测鱼群的位置，下列说法正确的是___；\n"
                "A. 该声波不属于超声波  B. 只要该声波的响度足够大，人是可以听到的\n"
                "C. 声呐主要利用了声音可以传递信息的性质  D. 该声呐在外太空依然可以使用\n"
                "(3) 一科考船利用声呐对海底形状测绘，在 A、B、C 三处向海底发射超声波，"
                "回声时间分别为 0.30s、0.26s、0.30s，则海底形状可能是图___；\n"
                "(4) 如图是声呐发出的原声和回声的波形图，可判断回声的音调______"
                "（选填“变高”或“变低”），说明目标正______（选填“靠近”或“远离”）声呐。"
            ),
            "options": {}, "answer": "(1) 介质种类、介质的温度；(2) C；(3) 甲；(4) 变高；靠近",
            "explanation": "", "difficulty": "中等",
            "knowledge_points": "声速与介质关系、超声波与次声波、声呐原理",
            "chapter": "", "tags": ["声速与介质关系", "超声波与次声波", "声呐原理"],
            "source": "AI导入卷子", "note": "",
            "created_time": now, "updated_time": now,
            "status": "active", "review_count": 0, "last_review": "",
            "wrong_count": 0, "last_wrong": "",
            "drawing": None, "original_image": None,
        })
        print(f"✅ 新增 QPAPER24X（第24题）")

    # 修正答案、题型
    fixed_count = 0
    for q in questions:
        qid = q["id"]
        if qid in ANSWERS:
            old = q.get("answer", "")
            if old != ANSWERS[qid]:
                q["answer"] = ANSWERS[qid]
                fixed_count += 1
        if qid in TYPE_FIX:
            q["type"] = TYPE_FIX[qid]

    # 修正 Q0D828B2F 题干数值（OCR 错）
    for q in questions:
        if q["id"] == "Q0D828B2F":
            q["content"] = q["content"].replace("18.6cm", "18.68cm").replace("19.78cm", "18.9cm")

    with open(qfile, "w", encoding="utf-8") as f:
        json.dump(questions, f, ensure_ascii=False, indent=2)
    print(f"✅ 修正 {fixed_count} 条答案，共 {len(questions)} 道题")


# ========== 2. papers.json ==========
def fix_paper():
    pfile = DATA / "papers.json"
    with open(pfile, "r", encoding="utf-8") as f:
        pdata = json.load(f)

    for p in pdata["papers"]:
        if p["id"] != PAPER_ID:
            continue
        p["name"] = PAPER_NAME
        new_questions = []
        for i, qid in enumerate(ORDER, 1):
            new_questions.append({
                "question_id": qid,
                "number": f"{i}.",
                "score": float(SCORES[qid]),
                "source_page": None,
            })
        p["questions"] = new_questions
        p["question_count"] = len(new_questions)
        p["total_score"] = sum(SCORES.values())
        print(f"✅ 卷子: {PAPER_NAME}，{p['question_count']} 题，{p['total_score']} 分")

    with open(pfile, "w", encoding="utf-8") as f:
        json.dump(pdata, f, ensure_ascii=False, indent=2)


# ========== 3. question_exams.json ==========
def fix_exams():
    efile = DATA / "question_exams.json"
    with open(efile, "r", encoding="utf-8") as f:
        edata = json.load(f)

    # 删除旧的"限时作业"映射
    edata["mappings"] = [
        m for m in edata["mappings"]
        if "限时作业" not in m.get("exam_name", "")
    ]
    # 重建
    for i, qid in enumerate(ORDER, 1):
        edata["mappings"].append({
            "question_id": qid,
            "exam_name": PAPER_NAME,
            "year": 2026,
            "number": f"{i}.",
            "score": SCORES[qid],
            "source": f"{PAPER_NAME} 2026年",
        })

    with open(efile, "w", encoding="utf-8") as f:
        json.dump(edata, f, ensure_ascii=False, indent=2)
    print(f"✅ 重建 {len(ORDER)} 条 exam 映射")


if __name__ == "__main__":
    print("=" * 60)
    fix_questions()
    fix_paper()
    fix_exams()
    print("=" * 60)
    print("🎉 全部完成！")
    print(f"   卷名：{PAPER_NAME}")
    print(f"   题数：{len(ORDER)}")
    print(f"   总分：{sum(SCORES.values())}")
    print(f"\n⚠️ 跑完后请重启后端！")