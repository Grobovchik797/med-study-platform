#!/usr/bin/env python3
"""Embed a snapshot of the public Med Study website in the Android APK."""
from pathlib import Path
import shutil

root = Path(__file__).resolve().parents[1]
web = root / "android" / "app" / "src" / "main" / "assets" / "www"
web.mkdir(parents=True, exist_ok=True)
files = [
    "index.html", "styles.css", "app.js", "small-intestine-interact.js", "gi-course.js", "department-atlas.js", "department-public.js", "sw.js", "manifest.webmanifest",
    "data/gi-deep-a.json", "data/gi-deep-b.json", "data/gi-department-questions.json", "data/gi-curriculum.json", "data/gi-inline-quiz.json", "data/gi-final-quiz.json", "data/gi-workbook.json", "data/gi-atlas.json", "data/department-public.json",
    "data/questions.json", "data/lesson.json", "data/atlas.json", "data/subjects.json", "data/histology-small-intestine.json", "data/library.json", "data/small-intestine-quiz.json", "data/small-intestine-slides.json",
    "icons/icon-192.png", "icons/icon-512.png",
    "photos/duodenum.jpg", "photos/jejunum.jpg", "photos/ileum.jpg",
    "photos/salivary-submandibular.jpg", "photos/esophagus.jpg", "photos/stomach-fundus.jpg",
    "photos/colon.jpg", "photos/liver.jpg", "photos/pancreas.jpg",
    "photos/tooth-enamel-organ.jpg", "photos/gastro-esophageal-junction.jpg",
    "photos/tooth-enamel-dentin.jpg", "photos/mixed-salivary.jpg", "photos/palatine-tonsil.jpg", "photos/stomach-pyloric.jpg", "photos/parotid.jpg", "photos/foliate-papillae.jpg", "photos/filiform-papillae.jpg",
    "illustrations/gi-tongue.svg", "illustrations/gi-stomach.svg", "illustrations/gi-liver.svg", "illustrations/gi-pancreas.svg",
    "illustrations/pathways.svg", "illustrations/receptors.svg",
    "illustrations/organs.svg", "illustrations/small-intestine-schematic.svg",
]
from json import loads
manifest = loads((root / "data" / "department-public.json").read_text("utf-8"))
for specimen in manifest["specimens"]:
    for frame in specimen["frames"]:
        files.append(frame["src"])
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
