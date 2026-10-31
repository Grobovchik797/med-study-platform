#!/usr/bin/env python3
"""Embed a snapshot of the public Med Study website in the Android APK."""
from pathlib import Path
import shutil

root = Path(__file__).resolve().parents[1]
web = root / "android" / "app" / "src" / "main" / "assets" / "www"
web.mkdir(parents=True, exist_ok=True)
files = [
    "index.html", "styles.css", "app.js", "small-intestine-interact.js", "sw.js", "manifest.webmanifest",
    "data/questions.json", "data/lesson.json", "data/atlas.json", "data/subjects.json", "data/histology-small-intestine.json", "data/library.json", "data/small-intestine-quiz.json", "data/small-intestine-slides.json",
    "media/histology/duodenum.webp", "media/histology/jejunum.webp", "media/histology/ileum.webp",
    "icons/icon-192.png", "icons/icon-512.png",
    "illustrations/pathways.svg", "illustrations/receptors.svg",
    "illustrations/organs.svg", "illustrations/small-intestine-schematic.svg",
]
for name in files:
    source = root / name
    target = web / name
    if not source.is_file():
        raise SystemExit(f"Missing input: {name}")
    target.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(source, target)
    print("Packed:", name)

drawable = root / "android" / "app" / "src" / "main" / "res" / "drawable-nodpi"
drawable.mkdir(parents=True, exist_ok=True)
shutil.copy2(root / "icons" / "icon-192.png", drawable / "ic_medstudy.png")
print("Copied Android launcher icon")
