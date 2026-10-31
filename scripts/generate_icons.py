#!/usr/bin/env python3
"""Generate simple app icons with Python stdlib (no external dependencies)."""
from pathlib import Path
import struct
import zlib

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "icons"


def chunk(kind, payload):
    return struct.pack(">I", len(payload)) + kind + payload + struct.pack(">I", zlib.crc32(kind + payload) & 0xFFFFFFFF)


def make_icon(size):
    buffer = bytearray()
    for y in range(size):
        buffer.append(0)  # PNG filter: none
        for x in range(size):
            # Purple canvas with a soft lavender upper-left glow.
            glow = max(0, (size - x - y) / (2 * size))
            base = (120 + int(25 * glow), 64 + int(24 * glow), 222 + int(15 * glow), 255)
            # White medical plus, centred with spacious margins for icon masking.
            cx = size // 2
            cy = size // 2
            dx = abs(x - cx)
            dy = abs(y - cy)
            arm = int(size * 0.237)
            thickness = int(size * 0.060)
            cross = (dx <= thickness and dy <= arm) or (dy <= thickness and dx <= arm)
            # Distinct centre inset, but no trademark or patient imagery.
            buffer.extend((255, 255, 255, 255) if cross else base)

    compressed = zlib.compress(bytes(buffer), level=9)
    ihdr = struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0)
    contents = b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", ihdr) + chunk(b"IDAT", compressed) + chunk(b"IEND", b"")
    OUT.mkdir(exist_ok=True)
    (OUT / f"icon-{size}.png").write_bytes(contents)


if __name__ == "__main__":
    for icon_size in (192, 512):
        make_icon(icon_size)
        print(f"Generated icon-{icon_size}.png")
