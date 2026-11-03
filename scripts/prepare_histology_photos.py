#!/usr/bin/env python3
"""Download and audit licensed Commons histology photographs at BUILD TIME.

The app never hotlinks thumbnails or sends user microscope requests to third-party
proxies. Fail a production build on missing/corrupt files; never ship placeholders.
"""
import hashlib
import json
import os
import time
import urllib.request
import urllib.error
from urllib.parse import quote
from pathlib import Path
from PIL import Image, UnidentifiedImageError
from io import BytesIO
ROOT=Path(__file__).resolve().parents[1]
SLIDES=json.loads((ROOT/"data/small-intestine-slides.json").read_text("utf-8"))
EXTRA=json.loads((ROOT/"data/gi-atlas.json").read_text("utf-8"))
BASE=ROOT/"photos"
BASE.mkdir(parents=True,exist_ok=True)
assert len(SLIDES["images"])==3 and len(EXTRA["images"])==18
assert [x["id"] for x in EXTRA["images"][16:]]==["liver-central-vein","liver-portal-triad"]

# Our previous published build and successful PR #53 debug APK contain the same
# 19 licensed JPEGs. Never accept a CDN response without its pinned SHA-256, and
# never use an old image if any source manifest changed.
LOCK=json.loads((ROOT/"data/gi-photo-lock.json").read_text("utf-8"))
EXPECTED_PHOTO_NAMES={Path(slide["src"]).name for slide in SLIDES["images"]+EXTRA["images"]}
EXISTING_NAMES=set(LOCK["photos"])
NEW_NAMES=EXPECTED_PHOTO_NAMES-EXISTING_NAMES
if len(EXPECTED_PHOTO_NAMES)!=21 or len(EXISTING_NAMES)!=19 or not EXISTING_NAMES.issubset(EXPECTED_PHOTO_NAMES) or NEW_NAMES!={"liver-central-vein.jpg","liver-portal-triad.jpg"}:
    raise SystemExit("Photo checksum lock must preserve all 19 known-good reference files and add only two verified liver images")
# Reconstruct the original sixteen-entry JSON exactly. The two appended records
# must not invalidate SHA-256-proven recovery of previously published microscopy.
LEGACY_EXTRA=dict(EXTRA)
LEGACY_EXTRA["images"]=EXTRA["images"][:16]
legacy_raw=(json.dumps(LEGACY_EXTRA,ensure_ascii=False,indent=2)+"\n").encode("utf-8")
LOCK_VALID=(hashlib.sha256(legacy_raw).hexdigest()==LOCK["atlas_sha256"]
    and hashlib.sha256((ROOT/"data/small-intestine-slides.json").read_bytes()).hexdigest()==LOCK["small_sha256"])
if not LOCK_VALID:
    raise SystemExit("Original 19 licensed images/metadata differ from the verified previous release; refuse unverified reuse")

def reuse_verified_published(path):
    if not LOCK_VALID or path.name not in LOCK["photos"]:
        return False
    url="https://grobovchik797.github.io/med-study-platform/photos/"+quote(path.name)
    try:
        req=urllib.request.Request(url,headers={
            "User-Agent":"MedStudyEducation/1.9 (recover unchanged published Commons image)",
            "Accept":"image/jpeg",
            "Cache-Control":"no-cache",
        })
        with urllib.request.urlopen(req, timeout=20) as response:
            mime=response.headers.get("Content-Type","").lower()
            raw=response.read(35_000_001)
        if not mime.startswith("image/") or not 12000<len(raw)<=35_000_000:
            raise ValueError("Published asset is not a valid image download")
        if hashlib.sha256(raw).hexdigest()!=LOCK["photos"][path.name]:
            raise ValueError("Published image checksum differs from verified PR #53 build")
        with Image.open(BytesIO(raw)) as image:
            image.verify()
        with Image.open(BytesIO(raw)) as image:
            if min(image.size)<420:
                raise ValueError("Published microscopy image too small")
        path.write_bytes(raw)
        print(f"Reused SHA-256 verified previously published image: {path.name} ({len(raw)} bytes)")
        return True
    except Exception as exc:
        print(f"Previous published image unavailable for {path.name}: {str(exc)[:130]}")
        return False
for slide in SLIDES["images"]+EXTRA["images"]:
    local=slide.get("src","")
    if not local.startswith("./photos/") or ".." in local:
        raise SystemExit(f"Unsafe local photo path {local}")
    path=ROOT/local[2:]
    if path.is_file() and path.stat().st_size>12000:
        with Image.open(path) as im:
            im.verify()
        print(f"Existing licensed preparation OK: {path.name}")
        continue
    sources=slide.get("buildSources",[])
    if not sources or slide.get("license") not in {"CC BY-SA 4.0","CC BY-SA 3.0","CC BY 4.0","CC BY 3.0","Public domain"} or not slide.get("source"):
        raise SystemExit("Missing Commons provenance for "+slide["id"])
    if reuse_verified_published(path):
        continue
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
                if not mime.startswith("image/") or len(raw)<12000:
                    raise ValueError(f"Expected image, got {mime} len={len(raw)}")
                with Image.open(BytesIO(raw)) as image:
                    rgb=image.convert("RGB")
                    rgb.thumbnail((1440,1440),Image.Resampling.LANCZOS)
                    if min(rgb.size)<420:
                        raise ValueError(f"Image too small for microscopy: {rgb.size}")
                    rgb.save(path,"JPEG",quality=88,optimize=True,progressive=True)
                with Image.open(path) as test:
                    test.verify()
                assert path.stat().st_size>12000
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
print("PASS: 21 Commons histology assets (19 SHA-256-locked old + 2 licensed human liver) are local and decoded; fine-grained landmarks unverified")
