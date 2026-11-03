#!/usr/bin/env python3
"""Validate the published answer-rationale coverage and change journal, no external libraries."""
from pathlib import Path
import json
ROOT=Path(__file__).resolve().parents[1]
def read(path):
    return json.loads((ROOT/"data"/path).read_text("utf-8"))
exam=read("gi-final-quiz.json")["questions"]
reason=read("gi-answer-reasons.json")
journal=read("update-journal.json")
assert reason["version"]==1 and reason["reviewStatus"]=="editorial-crosscheck-pending"
assert len(exam)==24 and set(reason["questions"])=={q["id"] for q in exam}
for q in exam:
    extra=reason["questions"][q["id"]]["wrong"]
    expected={str(i) for i in range(len(q["options"])) if i!=q["answer"]}
    assert set(extra)==expected, (q["id"],"missing or extra distractor",extra.keys())
    assert all(isinstance(text,str) and len(text)>=35 for text in extra.values()),q["id"]
assert journal["version"]==1 and isinstance(journal["scientificChanges"],list)
assert all(isinstance(item,dict) for item in journal["scientificChanges"])
ids=[e["id"] for e in journal["entries"]]
assert len(set(ids))==len(ids) and any(e["version"]=="1.9.3" for e in journal["entries"])
for e in journal["entries"]:
    assert e["category"] in ("feature","science") and e["date"] and e["changes"]
    assert e["source"].startswith("https://github.com/Grobovchik797/")
assert "study-tools.js" in (ROOT/"index.html").read_text("utf-8")
index=(ROOT/"index.html").read_text("utf-8")
version=journal["entries"][0]["version"]
assert len(version.split("."))==3 and all(x.isdigit() for x in version.split(".")), "Invalid release version"
assert f"Med Study · {version}" in index, "Index version must match latest journal entry"
assert f"med-study-shell-v{version}-" in (ROOT/"sw.js").read_text("utf-8"), "PWA cache version mismatch"
print("PASS: 24 complete editorial distractor explanations and versioned change journal")
