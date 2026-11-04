#!/usr/bin/env python3
"""Offline tests for the EduBiotech source inventory collector."""
import json
from pathlib import Path
from tempfile import TemporaryDirectory
from types import SimpleNamespace
import unittest
from unittest.mock import patch

from scripts import collect_edubiotech as collector


class EduBiotechCollectorTests(unittest.TestCase):
    def test_rejects_external_and_traversal(self):
        base = collector.ROOT + "histology/R5/S24lst.html"
        self.assertIsNone(collector.normalized(base, "https://evil.test/x.jpg"))
        self.assertIsNone(collector.normalized(base, "../../../../../../elsewhere.jpg"))
        self.assertIsNone(collector.normalized(base, "http://edubiotech.ru/photo.jpg"))
        self.assertEqual(
            collector.normalized(base, "../images/photo.jpg?x=2#top"),
            collector.ROOT + "histology/images/photo.jpg")

    def test_extracts_real_links_without_guessing_captions(self):
        page = collector.SourcePage()
        page.feed('<a href="slides/s24a.html">View</a>'
                  '<img src="a.jpg" alt="Печень" title="Фото">'
                  '<a href="b.png">Photo</a><frame src="part.htm">')
        self.assertEqual(len(page.image_links), 1)
        self.assertEqual(page.image_links[0]["alt"], "Печень")
        self.assertEqual(page.page_links, ["slides/s24a.html", "b.png", "part.htm"])

    def test_legacy_cp1251_content(self):
        raw = "Гистология".encode("windows-1251")
        self.assertEqual(collector.decode_html(raw, None), "Гистология")

    def test_inventory_is_staging_and_preserves_origin(self):
        def fake_fetch(url, limit=collector.MAX_BYTES):
            if "S24lst.html" in url:
                return (b'<img src="photos/liver.jpg" alt="Original alt">'
                        b'<a href="more.jpg">download</a>', "utf-8")
            return b"<html></html>", "utf-8"

        with TemporaryDirectory() as folder:
            args = SimpleNamespace(output=folder, max_pages=10, max_depth=0,
                                   max_images=5, delay=0.3,
                                   download_images=False)
            with patch.object(collector, "fetch", side_effect=fake_fetch), \
                 patch.object(collector.time, "sleep"):
                collector.collect(args)
            report = json.loads((Path(folder) / "inventory.json").read_text())
            self.assertEqual(report["summary"]["image_candidates"], 2)
            self.assertEqual(report["summary"]["images_staged"], 0)
            self.assertTrue(all(i["verification"].startswith("NOT REVIEWED")
                                for i in report["images"]))
            self.assertTrue(all(i["source_pages"] for i in report["images"]))


if __name__ == "__main__":
    unittest.main()
