#!/usr/bin/env python3
"""Verify EduBiotech topics, permissions/credit, source links and safe app wiring.

The source-owner-permitted JPEG/label binary checks are in
validate_edubiotech_images.py; existing two independent CC BY TEM remain separate.
"""
from pathlib import Path
import json
from urllib.parse import urlparse

ROOT=Path(__file__).resolve().parents[1]
def read(name):return json.loads((ROOT/"data"/name).read_text("utf-8"))
atlas=read("gi-edubiotech-atlas.json")
images=read("gi-edubiotech-images.json")
course=read("gi-curriculum.json")
guide=read("gi-colloquium-guide.json")
reference=read("gi-atlas.json")
chapter_ids={c["id"] for c in course["chapters"]}
assert atlas["version"]==1 and atlas["section"]=="gi-histology"
assert images["version"]==1 and images["count"]==21 and images["labelCount"]==143
assert len(chapter_ids)==17 and chapter_ids==set(guide["cues"])
assert len(atlas["topics"])==3
assert [t["number"] for t in atlas["topics"]]==[23,24,25]
assert [t["id"] for t in atlas["topics"]]==["s23","s24","s25"]
all_chapters=[ch for topic in atlas["topics"] for ch in topic["chapterIds"]]
assert len(all_chapters)==17 and len(set(all_chapters))==17 and set(all_chapters)==chapter_ids
prefix="https://edubiotech.ru/images/vetfac/images/ebooks/histology/"
assert atlas["source"]["index"]==prefix+"index.htm"
assert atlas["source"]["contents"]==prefix+"histology/r5frames.htm"
assert "подтвердил разрешение" in atlas["source"]["rights"]
assert "архив" in atlas["source"]["chapterPathStatus"].lower() or "страниц" in atlas["source"]["chapterPathStatus"].lower()
for topic in atlas["topics"]:
    assert topic["url"]==prefix+f"histology/r5/s{topic['number']}lst.html"
    assert len(topic["title"])>18 and len(topic["scope"])>30
    assert set(topic["chapterIds"]).issubset(chapter_ids)
assert len(atlas["electronograms"])==2 and len(atlas["ultrastructureStudy"])==5
ref_by_id={r["id"]:r for r in reference["images"]}
for rec in atlas["electronograms"]:
    assert rec["chapterId"]=="gastric-glands"
    src=ref_by_id[rec["referenceId"]]
    assert src["license"]=="CC BY 4.0" and "электрон" in src["stain"].lower()
    assert "не взята с edubiotech" in rec["note"].lower()
for item in atlas["ultrastructureStudy"]:
    assert item["sourceTopic"] in {"s23","s24","s25"}
    assert set(item["chapterIds"]).issubset(chapter_ids)
    assert len(item["cues"])==3
assert "21 оригинальная" in atlas["methodology"] and "143 обозначения" in atlas["methodology"]
# URL provenance may be recorded, but browsing code may only set img.src to
# a vetted LOCAL image path (never a third-party image hotlink).
def walk(obj):
    if isinstance(obj,dict):
        for key,value in obj.items():
            assert key not in {"img","imageUrl","iframe","bodyHtml"},key
            walk(value)
    elif isinstance(obj,list):
        for value in obj:walk(value)
    elif isinstance(obj,str) and obj.startswith("http"):
        parsed=urlparse(obj)
        assert parsed.scheme=="https" and parsed.hostname=="edubiotech.ru"
        assert obj.startswith(prefix)
walk(atlas)
source=(ROOT/"edubiotech-atlas.js").read_text("utf-8")
assert "window.MedStudyEduBiotech={render}" in source
assert "noopener noreferrer" in source
assert "img.src=item.src" in source and "edu-marker-layer" in source
assert "innerHTML" not in source and "localStorage.setItem" not in source
assert "function localLink(" in source and "photos\\/edubiotech" in source
app=(ROOT/"app.js").read_text("utf-8")
assert "gi-edubiotech-images.json" in app and "gi-edubiotech-atlas.json" in app
assert "showEduBiotechAtlas" in app and "onExternalAtlas:()=>showEduBiotechAtlas(id)" in app
print("PASS: 3 real lowercase EduBiotech theme URLs, 17 chapters, 21 original photos/143 author markers, separately licensed TEM, no external hotlinks")
