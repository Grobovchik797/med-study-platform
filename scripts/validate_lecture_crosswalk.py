#!/usr/bin/env python3
"""Audit source-backed GI additions after two user-supplied lecture summaries.
Structural guardrails only: this is NOT a departmental scientific peer review.
"""
from pathlib import Path
import json
import re
ROOT=Path(__file__).resolve().parents[1]
def data(name):
    return json.loads((ROOT/"data"/name).read_text("utf-8"))
chapters=data("gi-curriculum.json")["chapters"]
journal=data("update-journal.json")
assert len(chapters)==17 and len({c["id"] for c in chapters})==17
by_id={c["id"]:c for c in chapters}
new={"teeth":(4,("Гертвига","звёздчатый ретикулум")),
     "liver":(3,("Портальная долька","ацинус")),
     "pancreas":(3,("лактаза","щёточной каёмкой")),
     "colon":(3,("микроорганизмы","терминальном илеуме"))}
for chapter in chapters:
    expected,terms=new.get(chapter["id"],(2,()))
    assert len(chapter["deep"])==expected,(chapter["id"],len(chapter["deep"]),expected)
    added=" ".join(chapter["deep"][2:])
    for term in terms:
        assert term.lower() in added.lower(),(chapter["id"],term)
assert any(entry["version"]=="1.9.4" for entry in journal["entries"]), "Preserve archived scientific lecture release"
science=journal["scientificChanges"]
assert len(science)==4
assert {item["chapterId"] for item in science}==set(new)
assert len({item["id"] for item in science})==4
for item in science:
    assert item["version"]=="1.9.4" and item["category"]=="science"
    assert item["lecture"] and "с." in item["lecture"]
    assert len(item["references"])>=2 and all(url.startswith("https://") for url in item["references"])
    assert item["source"]=="https://github.com/Grobovchik797/med-study-platform/pull/57"
    assert len(item["verification"])>=50, (item["id"], "Need explicit qualification of scientific verification")
assert "кафедр" in journal["scientificNote"].lower(), "Do not imply a department has medically reviewed the additions"
notes=(ROOT/"docs/gi-lectures-crosswalk-2026-11-03.md").read_text("utf-8")
for chapter_id in by_id:
    assert re.search(r"\x60"+re.escape(chapter_id)+r"\x60",notes),chapter_id
assert "19 страниц" in notes or ("10 с." in notes and "9 с." in notes)
assert "Не публикуются" in notes or "не публикуются" in notes
print("PASS: 17 chapters crosswalked; 5 verified editorial paragraphs in 4 chapters; 4 scientific journal entries with evidence")
