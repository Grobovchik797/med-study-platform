#!/usr/bin/env python3
"""Validate source links and structure of the VNS receptor atlas."""
import json
from pathlib import Path

root = Path(__file__).resolve().parents[1]
data = json.loads((root / "data" / "atlas.json").read_text("utf-8"))
assert data["version"] == 1
assert len(data["items"]) == 6
assert {r["id"] for r in data["items"]} == {"alpha1","beta1","beta2","beta3","m2","m3"}
for item in data["items"]:
    assert item["division"] in ("sympathetic","parasympathetic")
    for field in ("short","title","mediator","organ","effect","remember","source"):
        assert isinstance(item[field],str) and item[field].strip()
    assert item["source"].startswith("https://www.ncbi.nlm.nih.gov/books/")
print("Atlas validated: six unique receptors and NCBI references")
