#!/usr/bin/env python3
"""Validate the 17-chapter colloquium navigator and claim-level citation mapping.
Structural/source-integrity validation, not expert medical slide annotations.
"""
from pathlib import Path
import json
ROOT=Path(__file__).resolve().parents[1]
def load(name):
    return json.loads((ROOT/"data"/name).read_text("utf-8"))
course=load("gi-curriculum.json")
guide=load("gi-colloquium-guide.json")
journal=load("update-journal.json")
atlas=load("gi-atlas.json")
dept=load("department-public.json")
deep_a=load("gi-deep-a.json")["blocks"]
deep_b=load("gi-deep-b.json")["blocks"]
blocks={**deep_a,**deep_b}
chapters=course["chapters"]
ids={ch["id"] for ch in chapters}
assert guide["version"]==1 and guide["courseId"]==course["courseId"]
assert len(chapters)==17 and len(ids)==17
assert set(guide["cues"])==ids
assert set(blocks)==ids and all(len(blocks[k])==5 for k in ids)
assert all(len(x["title"])>8 for pieces in blocks.values() for x in pieces)
assert len(guide["comparisons"])==6
assert len({x["id"] for x in guide["comparisons"]})==6
for chapter_id,item in guide["cues"].items():
    assert all(isinstance(item[k],str) and len(item[k])>35 for k in ("primary","supporting","notProof")),chapter_id
for item in guide["comparisons"]:
    assert set(item["chapters"]).issubset(ids) and item["chapters"]
    assert all(isinstance(item[key],str) and len(item[key])>35 for key in ("left","right","caution")),item["id"]
assert set(guide["pendingDepartmentChapters"])=={"liver","pancreas"}
assert len(dept["specimens"])==14
assert not any({"liver","pancreas"}&set(spec["chapters"]) for spec in dept["specimens"])
assert {"liver","pancreas"}.issubset({x["id"] for x in atlas["images"]})
assert journal["entries"][0]["version"]=="1.9.5"
science=journal["scientificChanges"]
assert len(science)==4 and {item["chapterId"] for item in science}=={"teeth","liver","pancreas","colon"}
assert sum(len(ch["deep"])-2 for ch in chapters)==5
for item in science:
    chapter=next(ch for ch in chapters if ch["id"]==item["chapterId"])
    assert len(chapter["deep"])>2 and item["lecture"] and item["verification"]
    assert item["claimIndices"]==([2,3] if item["chapterId"]=="teeth" else [2])
    assert all(2<=idx<len(chapter["deep"]) for idx in item["claimIndices"])
    assert len(item["references"])>=2
    assert all(url.startswith("https://") and len(url)>35 for url in item["references"])
    assert item["version"]=="1.9.4"
source=(ROOT/"gi-course.js").read_text("utf-8")
assert "renderColloquium" in source and "gi-claim-evidence" in source
assert "checkedChange?.claimIndices?.includes(index)" in source
assert "readMilestones(ch.id)" in source
app=(ROOT/"app.js").read_text("utf-8")
assert "showGIColloquium" in app and "gi-colloquium-guide.json" in app
print("PASS: 17 chapters, six comparisons, two pending faculty originals, five cited scientific claims, unchanged local progress schema")
