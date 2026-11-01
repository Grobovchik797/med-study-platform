#!/usr/bin/env python3
"""Download and audit licensed Commons histology photographs at BUILD TIME.

The app never hotlinks thumbnails or sends user microscope requests to third-party
proxies. Fail a production build on missing/corrupt files; never ship placeholders.
"""
import json
import os
import time
import urllib.request
import urllib.error
from pathlib import Path
from PIL import Image, UnidentifiedImageError
from io import BytesIO
ROOT=Path(__file__).resolve().parents[1]
SLIDES=json.loads((ROOT/"data/small-intestine-slides.json").read_text("utf-8"))
EXTRA=json.loads((ROOT/"data/gi-atlas.json").read_text("utf-8"))
BASE=ROOT/"photos"
BASE.mkdir(parents=True,exist_ok=True)
assert len(SLIDES["images"])==3 and len(EXTRA["images"])==8
for slide in SLIDES["images"]+EXTRA["images"]:
    local=slide.get("src","")
    if not local.startswith("./photos/") or ".." in local:
        raise SystemExit(f"Unsafe local photo path {local}")
    path=ROOT/local[2:]
    if path.is_file() and path.stat().st_size>30000:
        with Image.open(path) as im:
            im.verify()
        print(f"Existing licensed preparation OK: {path.name}")
        continue
    sources=slide.get("buildSources",[])
    if not sources or slide.get("license") not in {"CC BY-SA 4.0","CC BY-SA 3.0","CC BY 4.0","Public domain"} or not slide.get("source"):
        raise SystemExit("Missing Commons provenance for "+slide["id"])
    err=None
    for url in sources:
        for retry in range(3):
            try:
                req=urllib.request.Request(url, headers={
                    "User-Agent":"MedStudyEducation/1.4 (GitHub grobovchik797/med-study-platform; noncommercial attribution)",
                    "Referer":"https://commons.wikimedia.org/",
                    "Accept":"image/avif,image/webp,image/png,image/jpeg,image/*;q=0.8"
                })
                with urllib.request.urlopen(req,timeout=25) as response:
                    mime=response.headers.get("Content-Type","")
                    raw=response.read(35_000_000)
                if not mime.startswith("image/") or len(raw)<30000:
                    raise ValueError(f"Expected image, got {mime} len={len(raw)}")
                with Image.open(BytesIO(raw)) as image:
                    rgb=image.convert("RGB")
                    rgb.thumbnail((1440,1440),Image.Resampling.LANCZOS)
                    if min(rgb.size)<420:
                        raise ValueError(f"Image too small for microscopy: {rgb.size}")
                    rgb.save(path,"JPEG",quality=88,optimize=True,progressive=True)
                with Image.open(path) as test:
                    test.verify()
                assert path.stat().st_size>30000
                print(f"Ready {slide['id']}: {path.name} ({path.stat().st_size} bytes)")
                err=None
                # Wikimedia rate limits automated requests. Space requests between assets.
                time.sleep(11)
                break
            except (Exception) as exc:
                err=exc
                print(f"Image attempt {slide['id']}, {retry+1}: {str(exc)[:160]}")
                time.sleep((15, 25, 40)[retry] if isinstance(exc, urllib.error.HTTPError) and exc.code == 429 else 2+retry*3)
        if err is None:break
    if err is not None:
        raise SystemExit(f"COULD NOT BUILD ATLAS: {slide['id']}: {err}. Never publish broken microscope images.")
print("PASS: eleven Commons histology assets are local, decoded and ready; fine-grained landmarks remain unverified")
