#!/usr/bin/env python3
"""Verify licensed local EduBiotech originals and native Java marker provenance.
Does not assert that any unrelated faculty preparation is an EduBiotech original.
"""
import hashlib,json,re
from pathlib import Path
from urllib.parse import urlparse
ROOT=Path(__file__).resolve().parents[1]
catalog=json.loads((ROOT/"data/gi-edubiotech-plates.json").read_text("utf-8"))
course=json.loads((ROOT/"data/gi-curriculum.json").read_text("utf-8"))
valid_chapters={x["id"] for x in course["chapters"]}
assert catalog["version"]==1 and catalog["origin"]=="edubiotech.ru"
records=catalog["plates"]
assert len(records)>=19, f"Incomplete authorized source set: {len(records)}"
assert len({r["id"] for r in records})==len(records)
assert sum(len(r["annotations"]) for r in records)>=90
assert sum("электрон" in r["kind"] for r in records)>=2
assert any(r["id"]=="liver-lobules" and len(r["annotations"])>=3 for r in records)
assert any(r["id"]=="pancreas-overview" and len(r["annotations"])>=8 for r in records)
assert all(r["chapterId"] in valid_chapters for r in records)
for r in records:
    assert re.fullmatch(r"[a-z0-9-]+",r["id"])
    assert r["src"]=="./photos/edubiotech/"+r["id"]+".jpg"
    target=ROOT/r["src"][2:]
    assert target.is_file(),r["src"]
    binary=target.read_bytes()
    assert len(binary)>12000 and binary[:3]==bytes.fromhex("ffd8ff"),r["id"]
    assert hashlib.sha256(binary).hexdigest()==r["sha256"],r["id"]
    assert r["width"]>=170 and r["height"]>=170
    assert "edubiotech.ru" in r["credit"] and "Кузнецов" in r["credit"]
    for field in ("sourcePage","sourceViewer","sourceImage"):
        url=r[field];parsed=urlparse(url)
        assert parsed.scheme=="https" and parsed.hostname=="edubiotech.ru",r["id"]
        assert "/histology/histology/" in parsed.path
    assert "Подпись" not in r.get("rights","") or "edubiotech" in r["credit"].lower()
    annotations=r["annotations"]
    assert all(a["label"].strip() and a["mark"].strip() for a in annotations)
    if r["overlayNativeCoordinates"]:
        for a in annotations:
            assert 0<=a["start"]["x"]<r["width"] and 0<=a["start"]["y"]<r["height"]
    assert len(r["caption"])>=10
assert "Разрешение" in catalog["permission"]
print("PASS: local EduBiotech originals",len(records),"native marks",sum(len(r["annotations"]) for r in records),"TEM",sum("электрон" in r["kind"] for r in records))
