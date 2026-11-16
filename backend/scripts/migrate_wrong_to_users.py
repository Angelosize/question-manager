"""
把现有全局错题本 / 学习记录归到指定用户名下。

用法（在 backend 目录下）：
    python -m scripts.migrate_wrong_to_users --username <你的用户名>
    python -m scripts.migrate_wrong_to_users --username <你的用户名> --dry-run

行为：
    - wrong_questions.json 中 user_id 缺失或 = "legacy" 的记录 → 改成目标用户 id
    - learning_records.json 同上
    - 已属于其他用户的记录不动
"""
import argparse
import json
import sys
from pathlib import Path

# 允许直接 `python scripts/migrate_wrong_to_users.py` 或 `python -m scripts...`
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.core.config import DATA_DIR
from app.core.user_manager import UserManager


def migrate(target_user_id: str, dry_run: bool = False) -> None:
    for filename in ("wrong_questions.json", "learning_records.json"):
        path = DATA_DIR / filename
        if not path.exists():
            print(f"⏭  {filename} 不存在，跳过")
            continue

        with open(path, "r", encoding="utf-8") as f:
            raw = json.load(f)

        # 两种结构：list 或 {"records": [...]}
        if isinstance(raw, dict):
            key = "records"
            items = raw.get(key, [])
        else:
            key = None
            items = raw

        migrated = 0
        for item in items:
            if item.get("user_id") in (None, "", "legacy"):
                item["user_id"] = target_user_id
                migrated += 1

        print(f"📦 {filename}: 共 {len(items)} 条，迁移 {migrated} 条 → {target_user_id}")

        if dry_run:
            continue

        if key is not None:
            with open(path, "w", encoding="utf-8") as f:
                json.dump({key: items}, f, ensure_ascii=False, indent=2)
        else:
            with open(path, "w", encoding="utf-8") as f:
                json.dump(items, f, ensure_ascii=False, indent=2)
        print(f"✅ {filename} 已写回")


def main():
    parser = argparse.ArgumentParser(description="把 legacy 错题本/学习记录认领到指定用户")
    parser.add_argument("--username", required=True, help="目标用户名")
    parser.add_argument("--dry-run", action="store_true", help="只打印，不写文件")
    args = parser.parse_args()

    um = UserManager()
    # 直接读文件，不依赖 async load
    users_file = DATA_DIR / "users.json"
    if not users_file.exists():
        print("❌ users.json 不存在，先启动一次后端再跑")
        sys.exit(1)

    with open(users_file, "r", encoding="utf-8") as f:
        data = json.load(f)
    users = data.get("users", []) if isinstance(data, dict) else data

    user = next((u for u in users if u.get("username") == args.username), None)
    if not user:
        print(f"❌ 用户 {args.username} 不存在，请先注册")
        sys.exit(1)

    print(f"🎯 目标用户: {user['username']} ({user['id']})")
    if args.dry_run:
        print("🧪 DRY RUN：不会写文件")

    migrate(user["id"], dry_run=args.dry_run)


if __name__ == "__main__":
    main()