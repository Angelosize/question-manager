import json
import os
import uuid
from datetime import datetime
from typing import Dict, Any, Optional, List

from .config import DATA_DIR

USERS_FILE = DATA_DIR / "users.json"


class UserManager:
    def __init__(self):
        self.users: List[Dict[str, Any]] = []

    async def load(self) -> None:
        if USERS_FILE.exists() and USERS_FILE.stat().st_size > 0:
            try:
                with open(USERS_FILE, "r", encoding="utf-8") as f:
                    data = json.load(f)
                if isinstance(data, dict):
                    self.users = data.get("users", [])
                elif isinstance(data, list):
                    self.users = data
                else:
                    self.users = []
                print(f"👥 已加载 {len(self.users)} 个用户")
            except Exception as e:
                print(f"加载用户数据出错: {e}")
                self.users = []
        else:
            os.makedirs(DATA_DIR, exist_ok=True)
            with open(USERS_FILE, "w", encoding="utf-8") as f:
                json.dump({"users": []}, f, ensure_ascii=False, indent=2)
            self.users = []
            print("👥 用户文件不存在，已创建空 users.json")

    def save(self) -> bool:
        try:
            with open(USERS_FILE, "w", encoding="utf-8") as f:
                json.dump({"users": self.users}, f, ensure_ascii=False, indent=2)
            return True
        except Exception as e:
            print(f"保存用户数据出错: {e}")
            return False

    def get_by_username(self, username: str) -> Optional[Dict[str, Any]]:
        return next((u for u in self.users if u.get("username") == username), None)

    def get_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        return next((u for u in self.users if u.get("email") == email), None)

    def get_by_id(self, user_id: str) -> Optional[Dict[str, Any]]:
        return next((u for u in self.users if u.get("id") == user_id), None)

    def create(
        self,
        username: str,
        email: str,
        full_name: Optional[str],
        hashed_password: str,
    ) -> Dict[str, Any]:
        user = {
            "id": str(uuid.uuid4()),
            "username": username,
            "email": email,
            "full_name": full_name,
            "hashed_password": hashed_password,
            "created_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "is_active": True,
            "role": "user",
        }
        self.users.append(user)
        self.save()
        return user


user_manager = UserManager()


def get_user_manager() -> UserManager:
    return user_manager