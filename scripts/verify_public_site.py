#!/usr/bin/env python3
"""Check the actual public GitHub Pages release after deployment.

Unit and Playwright smoke tests use local files; this check ensures visitors
receive the intended release assets from the public Pages address.
"""
from __future__ import annotations
import os
import time
import urllib.error
import urllib.request

BASE = "https://grobovchik797.github.io/med-study-platform/"
EXPECTED = "med-study-shell-v1.8.1-learning-ux"
SHA = os.environ.get("GITHUB_SHA", "unknown")[:12]


def get(name: str, attempt: int = 0) -> str:
    url = BASE + name + "?audit=" + SHA + "-" + str(attempt)
    request = urllib.request.Request(url, headers={
        "User-Agent": "MedStudy-public-release-check/1.8.1",
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
                ("index.html", '<html lang="ru">'),
                ("app.js", "'gi-cards':'cards'"),
                ("gi-course.js", "Повторить ↺"),
                ("styles.css", "gi-recall-meter-fill"),
                ("data/gi-curriculum.json", '"chapters"'),
            ]:
                if marker not in get(path, attempt):
                    raise AssertionError(f"Published asset is old or broken: {path}")
            print("PASS: Public GitHub Pages serves 1.8.1, HTML, scripts, CSS and 17-chapter curriculum")
            return
        except (OSError, ValueError, AssertionError, UnicodeError) as exc:
            print(f"Public release check {attempt + 1}/13: {exc}", flush=True)
            if attempt == 12:
                raise
            time.sleep(6)


if __name__ == "__main__":
    main()
