#!/usr/bin/env python3
"""Verify manifest and generated icons, without dependencies."""
import json
import struct
from pathlib import Path

root = Path(__file__).resolve().parents[1]
manifest = json.loads((root / "manifest.webmanifest").read_text("utf-8"))
assert manifest["name"].startswith("Med Study")
assert manifest["start_url"] == "./"
assert manifest["scope"] == "./"
assert manifest["display"] == "standalone"

assert (root / "sw.js").is_file()
index = (root / "index.html").read_text("utf-8")
assert 'rel="manifest"' in index
assert "data-nav=\"install\"" in index

icons = manifest["icons"]
assert len(icons) >= 2
for size in (192, 512):
    file_path = root / "icons" / f"icon-{size}.png"
    contents = file_path.read_bytes()
    assert contents[:8] == b"\x89PNG\r\n\x1a\n"
    width, height = struct.unpack(">II", contents[16:24])
    assert (width, height) == (size, size)
    assert any(f"{size}x{size}" == icon["sizes"] for icon in icons)
print("PWA manifest and 192/512 icons validated")
