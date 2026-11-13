#!/usr/bin/env python3
"""Validate scalable navigation, unique topics and honest feature flags."""
import json
from pathlib import Path

root = Path(__file__).resolve().parents[1]
catalog = json.loads((root / "data/subjects.json").read_text("utf-8"))
library = json.loads((root / "data/library.json").read_text("utf-8"))
assert library["version"] == 1
subject_ids={s["id"] for s in catalog["subjects"]}
assert len(subject_ids)==11
assert set(library["subjects"]).issubset(subject_ids)
topic_ids=set()
for subject_id, subject_data in library["subjects"].items():
    sections=subject_data["sections"]
    assert isinstance(sections,list) and sections, subject_id
    seen_sections=set()
    for section in sections:
        assert section["id"] not in seen_sections, section["id"]
        seen_sections.add(section["id"])
        assert section["title"] and section["subtitle"]
        assert isinstance(section["topics"],list)
        for topic in section["topics"]:
            assert topic["id"] not in topic_ids, topic["id"]
            topic_ids.add(topic["id"])
            assert topic["title"] and topic["hint"]
            assert topic["route"] in {"intestine","lesson","gi-chapter","gi-workbook","gi-exam","cranial-chapter","cranial-exam","blood-topic","blood-atlas","blood-exam"}
            assert all(isinstance(topic[key],bool) for key in ("quiz","atlas","flashcards"))
            assert set(topic["notes"]) == (set() if topic["route"] in {"gi-exam","cranial-exam","blood-atlas","blood-exam"} else ({"full"} if topic["route"] in {"cranial-chapter","blood-topic"} else ({"brief"} if topic["route"]=="gi-workbook" else {"brief","deep"})))
            assert all(isinstance(value,bool) for value in topic["notes"].values())
            assert any(topic["notes"].values()) or topic["route"] in {"gi-exam","cranial-exam","blood-atlas","blood-exam"}, topic["id"]
            if topic["route"]=="intestine":
                assert topic["id"]=="histology-small-intestine"
                assert all(topic["notes"].values())
                assert topic["quiz"] and topic["atlas"] and topic["flashcards"]
            if topic["route"]=="gi-chapter":
                assert topic["chapterId"] and all(topic["notes"].values())
                assert topic["quiz"] and topic["flashcards"],topic["id"]
            if topic["route"]=="cranial-chapter":
                assert subject_id=="anatomy" and section["id"]=="nervous"
                assert topic["chapterId"] and topic["quiz"] and topic["flashcards"] and not topic["atlas"] and topic["notes"]=={"full":True}
            if topic["route"]=="cranial-exam":
                assert subject_id=="anatomy" and section["id"]=="nervous"
                assert topic["quiz"] and not topic["atlas"] and not topic["flashcards"]
            if topic["route"]=="gi-exam":
                assert topic["quiz"] and not topic["atlas"]
            if topic["route"]=="lesson":
                assert topic["id"]=="ans" and topic["quiz"]
assert len(topic_ids)==86 and {"ans","histology-small-intestine","gi-workbook","gi-final-exam","cranial-final-exam"}.issubset(topic_ids)
assert sum(t.get("route")=="blood-topic" for s in library["subjects"].values() for sec in s["sections"] for t in sec["topics"])==36
print("Navigation OK: 11 subjects, 86 learning entries including 36 physiology of blood topics, honest flags, unique IDs")
