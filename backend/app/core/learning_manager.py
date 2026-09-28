import json
import threading
from pathlib import Path
from typing import Dict, Any, Optional, List
from datetime import datetime
from .config import DATA_DIR

CACHE_DIR = DATA_DIR / "learning_cache"
RECORDS_FILE = DATA_DIR / "learning_records.json"

_lock = threading.Lock()


class LearningManager:
    def __init__(self):
        CACHE_DIR.mkdir(parents=True, exist_ok=True)
        if not RECORDS_FILE.exists():
            with open(RECORDS_FILE, 'w', encoding='utf-8') as f:
                json.dump({"records": []}, f, ensure_ascii=False, indent=2)

    # ===== 缓存 =====
    def _cache_path(self, qid: str) -> Path:
        return CACHE_DIR / f"{qid}.json"

    def has_cache(self, qid: str) -> bool:
        return self._cache_path(qid).exists()

    def get_cache(self, qid: str) -> Optional[Dict]:
        p = self._cache_path(qid)
        if not p.exists():
            return None
        try:
            with open(p, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            print(f"读取学习缓存失败 {qid}: {e}")
            return None

    def save_cache(self, qid: str, data: Dict) -> bool:
        with _lock:
            try:
                data["question_id"] = qid
                data["generated_at"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                data.setdefault("version", 1)
                with open(self._cache_path(qid), 'w', encoding='utf-8') as f:
                    json.dump(data, f, ensure_ascii=False, indent=2)
                return True
            except Exception as e:
                print(f"保存学习缓存失败 {qid}: {e}")
                return False

    def delete_cache(self, qid: str) -> bool:
        p = self._cache_path(qid)
        if p.exists():
            p.unlink()
            return True
        return False

    # ===== 学习记录 =====
    def _load_records(self) -> List[Dict]:
        if not RECORDS_FILE.exists():
            return []
        try:
            with open(RECORDS_FILE, 'r', encoding='utf-8') as f:
                data = json.load(f)
                return data.get("records", []) if isinstance(data, dict) else []
        except Exception:
            return []

    def _save_records(self, records: List[Dict]) -> bool:
        try:
            with open(RECORDS_FILE, 'w', encoding='utf-8') as f:
                json.dump({"records": records}, f, ensure_ascii=False, indent=2)
            return True
        except Exception as e:
            print(f"保存学习记录失败: {e}")
            return False

    def get_record(self, qid: str) -> Optional[Dict]:
        records = self._load_records()
        for r in records:
            if r.get("question_id") == qid:
                return r
        return None

    def upsert_record(self, qid: str, update: Dict) -> bool:
        with _lock:
            records = self._load_records()
            found = False
            for i, r in enumerate(records):
                if r.get("question_id") == qid:
                    records[i] = {**r, **update, "updated_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S")}
                    found = True
                    break
            if not found:
                records.append({
                    "question_id": qid,
                    **update,
                    "started_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                    "updated_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                })
            return self._save_records(records)

    def list_records(self) -> List[Dict]:
        return self._load_records()


learning_manager = LearningManager()