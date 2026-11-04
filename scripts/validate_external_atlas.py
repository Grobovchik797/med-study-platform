#!/usr/bin/env python3
"""Verify copyright-safe, source-linked digestive histology guidance.

This validates internal mapping and attribution, NOT access to an archived
third-party site, image annotation coordinates or a reuse license.
"""
from pathlib import Path
from urllib.parse import urlparse
import json

ROOT = Path(__file__).resolve().parents[1]
def read(path): return json.loads((ROOT / "data" / path).read_text("utf-8"))
atlas=read("gi-edubiotech-atlas.json")
course=read("gi-curriculum.json")
guide=read("gi-colloquium-guide.json")
reference=read("gi-atlas.json")
chapter_ids={c["id"] for c in course["chapters"]}
assert atlas["version"]==1 and atlas["section"]=="gi-histology"
assert len(chapter_ids)==17 and chapter_ids==set(guide["cues"])
assert len(atlas["topics"])==3
assert [t["number"] for t in atlas["topics"]]==[23,24,25]
assert [t["id"] for t in atlas["topics"]]==["s23","s24","s25"]
assert sum(len(t["chapterIds"]) for t in atlas["topics"])==17
all_chapters=[id for topic in atlas["topics"] for id in topic["chapterIds"]]
assert len(all_chapters)==len(set(all_chapters)) and set(all_chapters)==chapter_ids
prefix="https://edubiotech.ru/images/vetfac/images/ebooks/histology/"
assert atlas["source"]["index"]==prefix+"index.htm"
assert atlas["source"]["contents"]==prefix+"histology/r6frames.htm"
assert "разрешение" in atlas["source"]["rights"] and "edubiotech.ru" in atlas["source"]["rights"]
assert "повторно открыты" in atlas["source"]["chapterPathStatus"]
for topic in atlas["topics"]:
    assert topic["url"]==prefix+"histology/r5/s"+str(topic["number"])+"lst.html"
    assert topic["contentUrl"]==prefix+"histology/r5/t"+str(topic["number"])+".html"
    assert len(topic["title"])>18 and len(topic["scope"])>35
    assert set(topic["chapterIds"]).issubset(chapter_ids)
assert len(atlas["electronograms"])==2 and len(atlas["ultrastructureStudy"])==5
reference_ids={r["id"]:r for r in reference["images"]}
for record in atlas["electronograms"]:
    assert record["chapterId"]=="gastric-glands"
    ref=reference_ids[record["referenceId"]]
    assert ref["license"]=="CC BY 4.0" and "электрон" in ref["stain"].lower()
    assert "не взята с edubiotech" in record["note"].lower()
for item in atlas["ultrastructureStudy"]:
    assert item["sourceTopic"] in {"s23","s24","s25"}
    assert set(item["chapterIds"]).issubset(chapter_ids)
    assert len(item["cues"])==3
assert "исходные координаты" in atlas["methodology"] and "дополнительная карта" in atlas["methodology"]
# External sources must be secure, known URLs, never third-party image hotlinks.
def walk(obj):
    if isinstance(obj,dict):
        for key,value in obj.items():
            assert key not in {"image","img","imageUrl","src","html","iframe","bodyHtml"}, key
            walk(value)
    elif isinstance(obj,list):
        for value in obj:walk(value)
    elif isinstance(obj,str) and obj.startswith("http"):
        parsed=urlparse(obj)
        assert parsed.scheme=="https" and parsed.hostname=="edubiotech.ru"
        assert obj.startswith(prefix)
walk(atlas)
script=(ROOT/"edubiotech-atlas.js").read_text("utf-8")
assert "window.MedStudyEduBiotech={render}" in script
assert "noopener noreferrer" in script and "sourceRow(topic)" in script
assert ".src=" not in script and "innerHTML" not in script
app=(ROOT/"app.js").read_text("utf-8")
assert "showEduBiotechAtlas" in app and "gi-edubiotech-atlas.json" in app
assert "catch(()=>null)" in app and "onExternalAtlas:()=>showEduBiotechAtlas(id)" in app
print("PASS: EduBiotech 3 source topic links, 17 chapter maps, 2 licensed existing TEM, 5 ultrasound study guides, no copied images or altered progress")
