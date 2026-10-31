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
            assert topic["route"] in {"intestine","lesson"}
            assert all(isinstance(topic[key],bool) for key in ("quiz","atlas","flashcards"))
            assert set(topic["notes"]) == {"intro","brief","deep"}
            assert all(isinstance(value,bool) for value in topic["notes"].values())
            assert any(topic["notes"].values()), topic["id"]
            if topic["route"]=="intestine":
                assert topic["id"]=="histology-small-intestine"
                assert all(topic["notes"].values())
                assert not topic["quiz"] and not topic["atlas"] and not topic["flashcards"]
            if topic["route"]=="lesson":
                assert topic["id"]=="ans" and topic["quiz"]
assert topic_ids=={"ans","histology-small-intestine"}
print("Navigation OK: 11 subjects, 2 real topics, honest resource flags, unique IDs")
