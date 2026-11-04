#!/usr/bin/env python3
"""Collect an auditable *staging* inventory from EduBiotech's legacy atlas.

This never edits the public atlas, and NEVER treats alt text as verified
microscopic labels. All harvested assets require manual origin/rights/science
review before they can be committed as local Med Study images.
"""
import argparse
from collections import deque
from hashlib import sha256
from html.parser import HTMLParser
from io import BytesIO
import json
from pathlib import Path
import re
import time
from urllib.error import HTTPError, URLError
from urllib.parse import urljoin, urlsplit, urlunsplit
from urllib.request import Request, urlopen

ROOT = "https://edubiotech.ru/images/vetfac/images/ebooks/histology/"
PATH_PREFIX = "/images/vetfac/images/ebooks/histology/"
STARTS = {
    "23": ["histology/R5/S23lst.html", "histology/r5/t23.html"],
    "24": ["histology/R5/S24lst.html", "histology/r5/t24.html"],
    "25": ["histology/R5/S25lst.html", "histology/r5/t25.html"],
}
IMAGE_EXT = {".jpg", ".jpeg", ".png", ".gif", ".webp"}
HTML_EXT = {".htm", ".html"}
USER_AGENT = "MedStudy-EduBiotech-source-audit/1.0 (educational source attribution)"
MAX_BYTES = 8 * 1024 * 1024


def allowed(url):
    parts = urlsplit(url)
    return (parts.scheme == "https"
            and (parts.hostname or "").lower() == "edubiotech.ru"
            and parts.path.lower().startswith(PATH_PREFIX.lower())
            and not parts.username and not parts.password)


def normalized(parent, relative):
    try:
        value = urljoin(parent, relative.strip())
        parts = urlsplit(value)
    except ValueError:
        return None
    value = urlunsplit((parts.scheme.lower(), parts.netloc.lower(),
                        parts.path, "", ""))
    return value if allowed(value) else None


def ext(url):
    return Path(urlsplit(url).path).suffix.lower()


class SourcePage(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.page_links = []
        self.image_links = []

    def handle_starttag(self, tag, attr_pairs):
        attrs = dict(attr_pairs)
        if tag in ("a", "frame", "iframe"):
            target = attrs.get("href") if tag == "a" else attrs.get("src")
            if target:
                self.page_links.append(target)
        if tag == "img":
            target = attrs.get("src") or attrs.get("data-src")
            if target:
                self.image_links.append({
                    "url": target,
                    "alt": (attrs.get("alt") or "").strip()[:500],
                    "title": (attrs.get("title") or "").strip()[:500],
                    "tag": "img",
                })


def fetch(url, limit=MAX_BYTES):
    request = Request(url, headers={
        "User-Agent": USER_AGENT, "Accept": "text/html,image/*;q=0.9,*/*;q=0.5"
    })
    with urlopen(request, timeout=18) as response:
        if not allowed(response.geturl()):
            raise ValueError("Redirect outside allowed EduBiotech origin")
        data = response.read(limit + 1)
        if len(data) > limit:
            raise ValueError("Response exceeds safety limit")
        return data, response.headers.get_content_charset()


def decode_html(data, charset):
    options = [charset, "utf-8", "windows-1251", "cp1251"]
    meta = re.search(br"charset\s*=\s*['\"]?([\w-]+)", data[:4096], re.I)
    if meta:
        options.insert(0, meta.group(1).decode("ascii", "ignore"))
    for encoding in options:
        if not encoding:
            continue
        try:
            return data.decode(encoding)
        except (LookupError, UnicodeError):
            continue
    return data.decode("windows-1251", errors="replace")


def collect(args):
    output = Path(args.output)
    output.mkdir(parents=True, exist_ok=True)
    queue = deque((topic, normalized(ROOT, path), 0)
                  for topic, paths in STARTS.items() for path in paths)
    seen_pages, images, pages = set(), {}, []
    while queue and len(seen_pages) < args.max_pages:
        topic, url, depth = queue.popleft()
        if not url or url in seen_pages:
            continue
        seen_pages.add(url)
        entry = {"url": url, "topic": topic, "depth": depth}
        try:
            time.sleep(args.delay)
            raw, charset = fetch(url, 2 * 1024 * 1024)
            html = decode_html(raw, charset)
            parser = SourcePage()
            parser.feed(html)
            entry["status"] = "ok"
            entry["bytes"] = len(raw)
            discovered = parser.image_links[:]
            for target in parser.page_links:
                candidate = normalized(url, target)
                if not candidate:
                    continue
                suffix = ext(candidate)
                if suffix in IMAGE_EXT:
                    discovered.append({"url": target, "alt": "",
                                       "title": "", "tag": "linked-image"})
                elif suffix in HTML_EXT and depth < args.max_depth:
                    if "/r5/" in urlsplit(candidate).path.lower():
                        queue.append((topic, candidate, depth + 1))
            for candidate in discovered:
                image_url = normalized(url, candidate["url"])
                if not image_url or ext(image_url) not in IMAGE_EXT:
                    continue
                item = images.setdefault(image_url, {
                    "source_image_url": image_url, "source_pages": [],
                    "candidate_topics": [], "alt": [], "title": [],
                    "verification": "NOT REVIEWED — do not publish",
                })
                if url not in item["source_pages"]:
                    item["source_pages"].append(url)
                if topic not in item["candidate_topics"]:
                    item["candidate_topics"].append(topic)
                for field in ("alt", "title"):
                    val = candidate.get(field, "")
                    if val and val not in item[field]:
                        item[field].append(val)
            entry["image_candidates"] = len(discovered)
        except (OSError, ValueError, UnicodeError, HTTPError, URLError) as exc:
            entry["status"] = "error"
            entry["error"] = f"{type(exc).__name__}: {exc}"[:500]
        pages.append(entry)
    candidates = sorted(images.values(), key=lambda item: item["source_image_url"])
    if args.download_images:
        from PIL import Image, UnidentifiedImageError
        asset_dir = output / "source-images"
        asset_dir.mkdir(exist_ok=True)
        for item in candidates[:args.max_images]:
            try:
                time.sleep(args.delay)
                raw, _ = fetch(item["source_image_url"])
                with Image.open(BytesIO(raw)) as photo:
                    photo.verify()
                with Image.open(BytesIO(raw)) as photo:
                    item["width"], item["height"] = photo.size
                    fmt = photo.format
                if fmt not in ("JPEG", "PNG", "GIF", "WEBP"):
                    raise ValueError("Unsupported original image format")
                filename = sha256(item["source_image_url"].encode()).hexdigest()[:20] + ext(item["source_image_url"])
                (asset_dir / filename).write_bytes(raw)
                item["staged_file"] = "source-images/" + filename
                item["sha256"] = sha256(raw).hexdigest()
                item["bytes"] = len(raw)
                item["download_status"] = "staged-for-review"
            except (OSError, ValueError, UnidentifiedImageError, HTTPError, URLError) as exc:
                item["download_status"] = "error"
                item["download_error"] = f"{type(exc).__name__}: {exc}"[:500]
    report = {
        "source": "Руководство-атлас по гистологии, цитологии и эмбриологии",
        "authors": "С. Л. Кузнецов; Н. Н. Мушкамбаров; В. Л. Горячкина",
        "provider": "edubiotech.ru",
        "source_index": ROOT + "index.htm",
        "user_permission_statement": "Owner reports educational reuse permission with mandatory source attribution; exact scope remains to be documented.",
        "publication_status": "STAGING ONLY — no unreviewed assets may be published",
        "pages": pages,
        "images": candidates,
        "summary": {
            "pages_checked": len(pages),
            "pages_ok": sum(p["status"] == "ok" for p in pages),
            "image_candidates": len(candidates),
            "images_staged": sum(i.get("download_status") == "staged-for-review" for i in candidates),
            "queue_remaining": len(queue),
        },
    }
    (output / "inventory.json").write_text(
        json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(json.dumps(report["summary"], ensure_ascii=False))
    if not candidates:
        raise SystemExit("No verified image URLs collected; inventory saved with source-access failures.")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", default="build/edubiotech-intake")
    parser.add_argument("--max-pages", type=int, default=90)
    parser.add_argument("--max-depth", type=int, default=4)
    parser.add_argument("--max-images", type=int, default=250)
    parser.add_argument("--delay", type=float, default=0.6)
    parser.add_argument("--download-images", action="store_true")
    args = parser.parse_args()
    if not (1 <= args.max_pages <= 300 and 1 <= args.max_images <= 500 and
            0 <= args.max_depth <= 6 and 0.3 <= args.delay <= 10):
        parser.error("Refusing unsafe crawl limits.")
    collect(args)


if __name__ == "__main__":
    main()
