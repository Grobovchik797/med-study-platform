#!/usr/bin/env python3
"""Integrity check for owner-authorized EduBiotech microscopy photos and marks.

Original JPEG checksums, author markup, pixel-plane bounds, per-record
attribution, and existing collection preservation. This is not a faculty
peer review of the specimen labels.
"""
from pathlib import Path
from collections import Counter
import hashlib,json
ROOT=Path(__file__).resolve().parents[1]
read=lambda p:json.loads((ROOT/"data"/p).read_text("utf-8"))
source=read("gi-edubiotech-original.json")
course=read("gi-curriculum.json")
department=read("department-public.json")
gallery=read("gi-atlas.json")
assert source["version"]==1 and source["courseId"]==course["courseId"]
assert source["sourceTopics"]==[23,24,25]
assert "edubiotech.ru" in source["source"]["credit"]
assert "разрешение" in source["rightsNote"]
assert len(source["images"])==36
assert sum(x["variant"]=="base" for x in source["images"])==21
assert Counter(x["topic"] for x in source["images"])=={23:16,24:10,25:10}
assert len({x["id"] for x in source["images"]})==36
assert sum(len(x["marks"]) for x in source["images"])==228
assert len(department["specimens"])==15 and len(gallery["images"])==20
ids={x["id"] for x in course["chapters"]}
origin="https://edubiotech.ru/images/vetfac/images/ebooks/histology/histology/"
for item in source["images"]:
 assert item["chapterId"] in ids and item["topic"] in (23,24,25)
 assert item["sourceList"]==origin+f'r5/s{item["topic"]}lst.html'
 assert item["sourcePage"].startswith(origin+"r5/images/") and item["sourcePage"].endswith(".html")
 assert item["imageOriginal"].startswith(origin+"samples/") and item["imageOriginal"].lower().endswith(".jpg")
 assert "edubiotech.ru" in item["attribution"]
 assert len(item["title"])>=18 and len(item["viewerTitle"])>=12
 assert item["image"].startswith("./photos/edubiotech/") and item["image"].endswith(".jpg")
 file=ROOT/item["image"].removeprefix("./")
 assert file.is_file() and file.stat().st_size>3500, item["id"]
 data=file.read_bytes()
 assert data.startswith(bytes.fromhex("ffd8ff")) and data.endswith(bytes.fromhex("ffd9")),item["id"]
 assert hashlib.sha256(data).hexdigest()==item["imageSha256"],item["id"]
 assert item["width"]>=100 and item["height"]>=200
 assert item["declaredMarks"]==len(item["marks"]),item["id"]
 assert len(item["marks"])>0,item["id"]
 for mark in item["marks"]:
  assert 0<=mark["x"]<item["width"] and 0<=mark["y"]<item["height"],(item["id"],mark)
  assert isinstance(mark["label"],str) and len(mark["label"])>2,mark
src=(ROOT/"edubiotech-original.js").read_text("utf-8")
assert "window.MedStudyEduBiotechOriginal={render}" in src
assert "mode=\"study\"" in src and "mode===\"check\"" in src and "mode===\"find\"" in src
assert "current.width*100" in src and "current.height*100" in src
assert "innerHTML" not in src and "localStorage" not in src
app=(ROOT/"app.js").read_text("utf-8")
assert "gi-edubiotech-original.json" in app and "showEduBiotechAtlas" in app
print("PASS: 36 original EduBiotech microphotographs, 228 source-author marks, SHA-256 and original JPEGs; 15 faculty and 23 Commons image records untouched")
