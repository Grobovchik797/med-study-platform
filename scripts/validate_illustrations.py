#!/usr/bin/env python3
"""Check educational SVG diagrams and lesson references; no third-party dependencies."""
import json
from pathlib import Path
import xml.etree.ElementTree as ET

root = Path(__file__).resolve().parents[1]
lesson = json.loads((root / "data/lesson.json").read_text("utf-8"))
references = []
for section in lesson["sections"]:
    visual = section.get("illustration")
    if not visual:
        continue
    assert isinstance(visual, dict)
    assert all(isinstance(visual.get(k), str) and visual[k].strip()
               for k in ("src", "alt", "title", "caption"))
    path = visual["src"]
    assert path.startswith("./illustrations/") and path.endswith(".svg")
    file = (root / path[2:]).resolve()
    assert file.is_relative_to(root.resolve()), "Illustration escaped repository"
    assert file.is_file(), f"Missing illustration: {file}"
    references.append(file)
    tree = ET.parse(file)
    node = tree.getroot()
    assert node.tag == "{http://www.w3.org/2000/svg}svg"
    assert node.get("viewBox"), "SVG needs responsive viewBox"
    assert len(node.findall("{http://www.w3.org/2000/svg}title")) > 0
    assert len(node.findall("{http://www.w3.org/2000/svg}desc")) > 0
    for inner in node.iter():
        assert inner.tag not in ("{http://www.w3.org/2000/svg}script", "{http://www.w3.org/1999/xhtml}script")
        for attr, value in inner.attrib.items():
            assert not attr.lower().endswith("href") or not value.lower().startswith(("http:", "https:", "javascript:")), "External SVG resources are disallowed"

assert len(references) == 3, f"Expected exactly three diagrams, found {len(references)}"
assert len(set(references)) == len(references)
print("PASS: 3 original responsive SVGs with accessible titles and no remote dependencies")
