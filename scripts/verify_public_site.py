#!/usr/bin/env python3
"""Check the actual public GitHub Pages release after deployment.

Unit and Playwright smoke tests use local files; this check ensures visitors
receive the intended release assets from the public Pages address.
"""
from __future__ import annotations
import os
import re
from pathlib import Path
import time
import urllib.error
import urllib.request
from urllib.parse import quote
from io import BytesIO
from PIL import Image

BASE = "https://grobovchik797.github.io/med-study-platform/"
ROOT = Path(__file__).resolve().parents[1]
def expected_marker(path: str, pattern: str) -> str:
    match = re.search(pattern, (ROOT / path).read_text(encoding="utf-8"))
    if not match:
        raise ValueError(f"Missing local version marker in {path}")
    return match.group(1)

EXPECTED = expected_marker("sw.js", r'const CACHE = "(med-study-shell-v[^"]+)"')
VERSION = expected_marker("index.html", r'Med Study · (\d+\.\d+\.\d+)')
SHA = os.environ.get("GITHUB_SHA", "unknown")[:12]


def get(name: str, attempt: int = 0) -> str:
    url = BASE + name + "?audit=" + SHA + "-" + str(attempt)
    request = urllib.request.Request(url, headers={
        "User-Agent": "MedStudy-public-release-check/" + VERSION,
        "Cache-Control": "no-cache",
    })
    with urllib.request.urlopen(request, timeout=20) as response:
        if response.status != 200:
            raise ValueError(f"{name} HTTP {response.status}")
        data = response.read()
        if not data or len(data) > 1500000:
            raise ValueError(f"Unexpected asset size: {name}")
        return data.decode("utf-8")


def main():
    # Pages' CDN may take a short time to serve a newly deployed version.
    for attempt in range(13):
        try:
            sw = get("sw.js", attempt)
            if EXPECTED not in sw:
                raise ValueError("CDN still serves a previous service worker")
            for path, marker in [
                ("index.html", "Med Study · " + VERSION),
                ("app.js", "'gi-cards':'cards'"),
                ("gi-course.js", "med-study-topic-milestones-v1"),
                ("study-tools.js", "window.MedStudyTools"),
                ("data/update-journal.json", '"med-1-9-7"'),
                ("data/gi-edubiotech-atlas.json", 'S23lst.html'),
                ("data/gi-edubiotech-atlas.json", 'S25lst.html'),
                ("edubiotech-atlas.js", "window.MedStudyEduBiotech"),
                ("app.js", "showEduBiotechAtlas"),
                ("data/gi-atlas.json", '"liver-central-vein"'),
                ("data/gi-atlas.json", '"liver-portal-triad"'),
                ("data/gi-atlas.json", '"gastric-parietal-tem"'),
                ("data/gi-atlas.json", '"gastric-chief-tem"'),
                ("data/department-public.json", '"ПОДЖЕЛУДОЧНАЯ ЖЕЛЕЗА"'),
                ("data/gi-colloquium-guide.json", '"parotid-pancreas"'),
                ("gi-course.js", "renderColloquium"),
                ("data/gi-curriculum.json", "влагалище Гертвига"),
                ("data/gi-answer-reasons.json", '"questions"'),
                ("styles.css", "gi-milestone-items"),
                ("data/gi-curriculum.json", '"chapters"'),
            ]:
                if marker not in get(path, attempt):
                    raise AssertionError(f"Published asset is old or broken: {path}")
            for asset in ("photos/department/ПОДЖЕЛУДОЧНАЯ ЖЕЛЕЗА (PDF стр. 5).jpg",
                          "photos/liver-central-vein.jpg","photos/liver-portal-triad.jpg",
                          "photos/gastric-parietal-tem.jpg","photos/gastric-chief-tem.jpg"):
                url=BASE+quote(asset,safe="/")+"?audit="+SHA+"-"+str(attempt)
                with urllib.request.urlopen(urllib.request.Request(url,headers={"User-Agent":"MedStudy-public-release-check/"+VERSION}),timeout=20) as response:
                    image_bytes=response.read(1500001)
                if not 12000<len(image_bytes)<1500001:
                    raise ValueError("Published image missing or outside size limits: "+asset)
                with Image.open(BytesIO(image_bytes)) as image:
                    image.verify()
            print(f"PASS: Public GitHub Pages serves {VERSION} ({EXPECTED}), 15 real faculty records, 23 references, EduBiotech source-linked atlas and original pancreas PDF JPEG")
            return
        except (OSError, ValueError, AssertionError, UnicodeError) as exc:
            print(f"Public release check {attempt + 1}/13: {exc}", flush=True)
            if attempt == 12:
                raise
            time.sleep(6)


if __name__ == "__main__":
    main()
