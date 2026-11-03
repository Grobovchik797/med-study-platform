#!/usr/bin/env python3
"""Verify all 21 imported original EduBiotech JPEGs and 143 source annotations.

These records are extracted from the site's Java imagepg applet (user-confirmed
educational-use permission with attribution), not invented region labels.
"""
from pathlib import Path
import hashlib
import json
import re
from import_edubiotech_samples import jpg_size

ROOT=Path(__file__).resolve().parents[1]
def load(path):
    return json.loads((ROOT/"data"/path).read_text("utf-8"))
manifest=load("gi-edubiotech-images.json")
assert manifest["version"]==1 and manifest["course"]=="gi-histology"
assert manifest["count"]==21 and manifest["labelCount"]==143
assert manifest["provenance"]["host"]=="edubiotech.ru"
assert "разрешен" in manifest["provenance"]["rights"].lower()
assert "Кузнецов" in manifest["provenance"]["authors"]
items=manifest["items"]
assert isinstance(items,list) and len(items)==21
chapters={x["id"] for x in load("gi-curriculum.json")["chapters"]}
seen=set()
topics={23:0,24:0,25:0}
label_count=0
prefix="https://edubiotech.ru/images/vetfac/images/ebooks/histology/histology/"
for specimen in items:
    topic=specimen["topic"]
    assert topic in topics
    topics[topic]+=1
    target_id=f"edu-t{topic}-{topics[topic]:02}"
    assert specimen["id"]==target_id,(specimen["id"],target_id)
    assert target_id not in seen
    seen.add(target_id)
    assert specimen["kind"]=="light-micrograph"
    assert specimen["chapterId"] in chapters and set(specimen["chapterIds"]).issubset(chapters)
    assert len(specimen["title"])>=22
    assert specimen["sourcePage"].startswith(prefix+f"r5/images/")
    assert specimen["sourcePage"].endswith(".html")
    assert specimen["sourceImage"].startswith(prefix+"samples/")
    assert specimen["sourceImage"].endswith(".jpg")
    assert specimen["sourceList"]==prefix+f"r5/s{topic}lst.html"
    assert "Кузнецов" in specimen["sourceCredit"] and "edubiotech.ru" in specimen["sourceCredit"]
    assert specimen["sourceMarkCount"]==len(specimen["labels"])>0
    assert specimen["src"]==f"./photos/edubiotech/t{topic}-{topics[topic]:02}.jpg"
    path=ROOT/specimen["src"].removeprefix("./")
    content=path.read_bytes()
    assert len(content)>4000 and content.startswith(b"\xff\xd8")
    assert hashlib.sha256(content).hexdigest()==specimen["sha256"],path
    width,height=jpg_size(content)
    assert (width,height)==(specimen["width"],specimen["height"])
    for label in specimen["labels"]:
        assert label["id"] and len(label["label"])>=2
        assert len(label["label"])<160
        for x in ("x1","x2"):
            assert 0<=label[x]<=width,(target_id,x,label[x],width)
        for y in ("y1","y2"):
            assert 0<=label[y]<=height,(target_id,y,label[y],height)
        label_count+=1
assert topics=={23:9,24:6,25:6},topics
assert label_count==143
for topic,number in [(23,9),(24,6),(25,6)]:
    subset=load(f"gi-edubiotech-t{topic}.json")
    assert subset["topic"]==topic and len(subset["items"])==number
    for raw,merged in zip(subset["items"],[x for x in items if x["topic"]==topic]):
        assert raw["sha256"]==merged["sha256"] and raw["labels"]==merged["labels"]
assert "обозначени" in manifest["title"].lower()
print("PASS: 21 genuine EduBiotech JPEGs (9/6/6), 143 original source applet markers, SHA-256 & coordinate bounds")
