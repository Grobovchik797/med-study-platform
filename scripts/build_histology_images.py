#!/usr/bin/env python3
"""Build local, offline microscope photographs from author-attributed Commons sources.

Requires Pillow. Download only already-curated images listed in slides JSON.
Build FAILS if photos cannot be downloaded and verified; never silently ship
broken external links or pretend a synthetic diagram is a histology slide.
"""
import io
import json
import hashlib
import time
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.error import URLError, HTTPError
from PIL import Image, ImageOps, UnidentifiedImageError

ROOT = Path(__file__).resolve().parents[1]
slides = json.loads((ROOT / "data/small-intestine-slides.json").read_text("utf-8"))
output = ROOT / "media" / "histology"
output.mkdir(parents=True, exist_ok=True)
HEADERS = {
    "User-Agent": "MedStudyEducation/0.9 (licensed image mirroring; educational project; contact via GitHub Grobovchik797/med-study-platform)",
    "Accept": "image/avif,image/webp,image/jpeg,image/png,image/*",
}
for file_index, s in enumerate(slides["images"]):
    if file_index:
        time.sleep(5)  # Wikimedia CDN rate-limit courtesy delay
    name = s["id"]
    destination = ROOT / s["src"]
    assert destination.resolve().is_relative_to(output.resolve()), s["src"]
    urls = [s["originalSrc"]]
    # Originals are publicly licensed; if the original thumbnail route fails,
    # use Commons' redirect to the original; compress locally after download.
    if s.get("originalSourceUrl"):
        urls.append(s["originalSourceUrl"])
    content = None
    failures = []
    for url in urls:
        for attempt in range(4):
            try:
                request = Request(url, headers=HEADERS)
                with urlopen(request, timeout=35) as response:
                    if not response.headers.get("Content-Type", "").startswith("image/"):
                        raise ValueError("Not an image response")
                    content = response.read(36 * 1024 * 1024 + 1)
                if len(content) > 36 * 1024 * 1024:
                    raise ValueError("Downloaded image exceeds 36MB")
                if len(content) < 1000:
                    raise ValueError("Image unexpectedly short")
                break
            except (URLError, HTTPError, TimeoutError, OSError, ValueError) as err:
                failures.append(str(err))
                time.sleep(5 + attempt * 6)  # backoff after 429/other transient errors
        if content is not None:
            break
    if content is None:
        raise SystemExit(f"Unable to fetch {name} from verified source: {failures[-3:]}")
    try:
        with Image.open(io.BytesIO(content)) as original:
            frame = ImageOps.exif_transpose(original)
            image = frame.convert("RGB")
            image.thumbnail((1500, 1500), Image.Resampling.LANCZOS)
            actual_ratio = image.width / image.height
            expected = float(s["aspect"])
            if abs(actual_ratio / expected - 1) > 0.04:
                raise ValueError(f"Image ratio unexpected: {actual_ratio} vs {expected}")
            image.save(destination, "WEBP", quality=84, method=6)
    except (UnidentifiedImageError, OSError, ValueError) as e:
        raise SystemExit(f"Image validation failure for {name}: {e}")
    raw = destination.read_bytes()
    assert raw[:4] == b"RIFF" and raw[8:12] == b"WEBP"
    assert 15000 <= len(raw) <= 1900000, (name, len(raw))
    print(f"{name}: {image.width}x{image.height}, {len(raw)} bytes, sha256={hashlib.sha256(raw).hexdigest()[:12]}, saved locally")
print("PASS: all curated CC BY-SA microscopy photographs available as local images")
