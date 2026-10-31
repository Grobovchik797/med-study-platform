#!/usr/bin/env python3
"""Validate university subject catalog without claiming educational completeness."""
import json
from pathlib import Path

root = Path(__file__).resolve().parents[1]
data = json.loads((root / "data/subjects.json").read_text("utf-8"))
subjects = data.get("subjects", [])
assert data.get("version") == 1
assert isinstance(subjects, list) and len(subjects) == 11
assert {mode["id"] for mode in data["note_modes"]} == {"brief","deep"}
ids = [x["id"] for x in subjects]
assert len(ids) == len(set(ids))
assert sum(x["status"] == "learning-material" for x in subjects) == 2
assert {x["status"] for x in subjects} <= {"planned","learning-material"}
assert {x["group"] for x in subjects} <= {"medical","general"}
for x in subjects:
    assert isinstance(x["name"], str) and x["name"].strip()
    for topic in x.get("topics", []):
        assert topic.get("intro_status","planned") in {"planned","introductory","draft","reviewed","source-checked-draft"}
        assert topic["brief_status"] in {"planned","introductory","draft","reviewed","source-checked-draft"}
        assert topic["deep_status"] in {"planned","draft","reviewed","source-checked-draft"}
assert "Нормальная физиология" in {x["name"] for x in subjects}
print("OK: 11 university subjects, intro/brief/deep modes, clear work-in-progress statuses")
