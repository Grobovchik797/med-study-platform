#!/usr/bin/env python3
"""Structural QA for the author's three-depth small-intestine histology module.

This validates completeness of expected fields and citations; it is NOT a
substitute for scientific peer review or comparison with the local syllabus.
"""
import json
from pathlib import Path
from urllib.parse import urlsplit
from xml.etree import ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
module = json.loads((ROOT / "data/histology-small-intestine.json").read_text("utf-8"))
assert module["version"] == 1 and module["id"] == "histology-small-intestine"
assert module["status"] == "source-checked-draft"
assert len(module["sources"]) >= 7
refs = {s["url"] for s in module["sources"]}
assert len(refs) == len(module["sources"])
for ref in refs:
    url = urlsplit(ref)
    assert url.scheme == "https" and url.hostname
    assert url.hostname.endswith((".edu", ".ac.uk", ".nih.gov", "histologyguide.org", "histopathology.pennstatehealth.net", "histology.oit.duke.edu", "histology.leeds.ac.uk")) or url.hostname.startswith("www.histologyguide")
versions = module["variants"]
assert {v["id"] for v in versions} == {"intro","brief","deep"}
expected = {"intro":5,"brief":9,"deep":14}
for variant in versions:
    assert len(variant["sections"]) == expected[variant["id"]]
    assert all(isinstance(variant.get(k),str) and variant[k].strip() for k in ("title","label","description"))
    for section in variant["sections"]:
        for key in ("title","key","source"):
            assert isinstance(section.get(key),str) and section[key].strip()
        assert section["source"] in refs, f"Unregistered source: {section['source']}"
        assert isinstance(section["paragraphs"],list) and len(section["paragraphs"]) >= 1
        assert all(isinstance(p,str) and len(p) >= 40 for p in section["paragraphs"])
        if "table" in section:
            t = section["table"]
            assert len(t["headers"]) >= 2 and len(t["rows"]) >= 2
            assert all(len(row)==len(t["headers"]) for row in t["rows"])
assert len(module["checklist"]) >= 8
assert module["future_virtual_slides"]["status"] == "planned"
diagram = ET.parse(ROOT / "illustrations/small-intestine-schematic.svg").getroot()
assert diagram.tag.endswith("svg") and diagram.get("viewBox")
assert len(diagram.findall("{http://www.w3.org/2000/svg}title")) == 1
assert len(diagram.findall("{http://www.w3.org/2000/svg}desc")) == 1
print("PASS: intro 5, brief 9, deep 14 sections; references, tables and original SVG")
