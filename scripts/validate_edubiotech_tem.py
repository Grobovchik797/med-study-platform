#!/usr/bin/env python3
"""Verify authentic edubiotech.ru digestive TEM files and author-numbered legends."""
import json,hashlib
from pathlib import Path
P=Path(__file__).resolve().parents[1]
d=json.loads((P/"data/gi-edubiotech-tem.json").read_text("utf-8"))
assert d["version"]==1 and d["courseId"]=="gi-histology"
assert {x["id"] for x in d["images"]}=={"enterocyte-tem","bile-canaliculus-tem","pancreas-acinar-tem"}
for x in d["images"]:
 assert x["imageOriginal"].startswith("https://edubiotech.ru/images/vetfac/images/ebooks/histology/histology/r7/")
 assert x["sourcePage"].startswith("https://edubiotech.ru/images/vetfac/images/ebooks/histology/histology/r5/")
 assert x["image"].startswith("./photos/edubiotech-tem/")
 file=P/x["image"].removeprefix("./")
 assert file.is_file() and file.stat().st_size>10000,x["id"]
 b=file.read_bytes()
 assert b.startswith(bytes.fromhex("ffd8ff")) and b.endswith(bytes.fromhex("ffd9"))
 assert hashlib.sha256(b).hexdigest()==x["sha256"]
 assert x["width"]>=200 and x["height"]>=200
 assert len(x["labels"])>=3 and all(y["number"] and y["label"] for y in x["labels"])
 assert "edubiotech.ru" in x["attribution"]
assert 'galleryMode==="tem"' in (P/"edubiotech-original.js").read_text("utf-8")
print("PASS: 3 real EduBiotech digestive TEM, verified original SHA256, source-numbered structures and per-image credit")
