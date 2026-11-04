#!/usr/bin/env python3
"""Verify complete text-only cranial nerve curriculum without publishing the protected PDF."""
import json
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
read=lambda path: json.loads((ROOT/path).read_text("utf-8"))
course=read("data/cranial-nerves.json")
library=read("data/library.json")
subjects=read("data/subjects.json")

assert course["version"]==1 and course["courseId"]=="anatomy-cranial-nerves"
assert course["source"]["pages"]==14 and course["source"]["filename"]=="Черепные нервы.pdf"
assert course["scope"]["missing"]==["VIII","IX","X","XI","XII"]
expected=["olfactory","optic","visual-reflexes","oculomotor","trochlear",
          "trigeminal-core","ophthalmic","maxillary","mandibular","abducens",
          "facial-main","facial-intracanal","facial-extracranial"]
chapters=course["chapters"]
assert [c["id"] for c in chapters]==expected
assert len(chapters)==13
question_ids=set()
total_questions=total_cards=total_blocks=0
for chapter in chapters:
    assert chapter["roman"] and chapter["title"] and chapter["pages"]
    assert len(chapter["brief"])>=2 and all(len(x)>65 for x in chapter["brief"]),chapter["id"]
    assert len(chapter["sections"])>=2 and chapter["cards"] and len(chapter["questions"])==4
    for block in chapter["sections"]:
        assert block["title"] and block["points"] and all(len(x)>=60 for x in block["points"]),chapter["id"]
    for card in chapter["cards"]:
        assert len(card["front"])>10 and len(card["back"])>=9
    for question in chapter["questions"]:
        assert question["id"] not in question_ids
        question_ids.add(question["id"])
        assert len(question["prompt"])>22 and len(question["explanation"])>=30
        assert len(question["options"])==4 and len(set(question["options"]))==4
        assert isinstance(question["answer"],int) and 0<=question["answer"]<4
    total_questions+=len(chapter["questions"])
    total_cards+=len(chapter["cards"])
    total_blocks+=len(chapter["sections"])
assert (total_questions,total_cards,total_blocks)==(52,53,49)
anatomy=library["subjects"]["anatomy"]["sections"]
assert len(anatomy)==1 and anatomy[0]["id"]=="nervous"
topics=anatomy[0]["topics"]
assert len(topics)==14
assert [t["chapterId"] for t in topics[:-1]]==expected
for topic in topics[:-1]:
    assert topic["route"]=="cranial-chapter" and topic["quiz"] and topic["flashcards"]
    assert not topic["atlas"] and topic["notes"]=={"brief":True,"deep":True}
assert topics[-1]["route"]=="cranial-exam" and topics[-1]["quiz"] and not topics[-1]["atlas"]
assert next(s for s in subjects["subjects"] if s["id"]=="anatomy")["status"]=="learning-material"
index=(ROOT/"index.html").read_text("utf-8")
assert "./cranial-nerves.js" in index
sw=(ROOT/"sw.js").read_text("utf-8")
assert '"./cranial-nerves.js"' in sw and '"./data/cranial-nerves.json"' in sw
assert "cranial-nerves.js" in (ROOT/"scripts/package_android_assets.py").read_text("utf-8")
assert "data/cranial-nerves.json" in (ROOT/".github/workflows/deploy.yml").read_text("utf-8")
print(f"PASS: 13 cranial sections, {total_blocks} complete blocks, {total_cards} recall cards, "
      f"{total_questions} unique explained questions, source-only scope I–VII, no atlas routes")
