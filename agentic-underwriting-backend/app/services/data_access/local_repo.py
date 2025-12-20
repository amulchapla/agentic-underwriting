from __future__ import annotations
from pathlib import Path
import json
from typing import Any, Optional
from app.config import settings

root = Path(settings.data_root)

def _load_json(path: Path) -> Any:
    if not path.exists():
        return None
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)

def get_case(case_id: str) -> Optional[dict]:
    return _load_json(root / "cases" / f"{case_id}.json")

def list_cases() -> list[dict]:
    cases_dir = root / "cases"
    if not cases_dir.exists():
        return []
    items: list[dict] = []
    for path in cases_dir.glob("*.json"):
        data = _load_json(path)
        if data:
            items.append(data)
    return items

def get_memories(case_id: str) -> list[dict]:
    data = _load_json(root / "memories" / f"{case_id}.json")
    return data or []

def get_decisions(case_id: str) -> list[dict]:
    # In sprint 1, a single decision example is stored in one file; listify
    d = _load_json(root / "decisions" / f"D-987.json")
    return [d] if d else []


def get_ai_audit(case_id: str) -> Optional[dict]:
    return _load_json(root / "ai_audits" / f"{case_id}.json")
