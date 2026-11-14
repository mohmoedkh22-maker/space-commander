"""
Extract a day-by-day sunlit/shadow time series for the SELENE-1 site from the
NASA Scientific Visualization Studio (SVS) south-pole illumination frames.

Source
------
NASA SVS 4930 "Illumination at the Moon's South Pole, 2023 to 2030"
  https://svs.gsfc.nasa.gov/4930/   (sister product of SVS 5027, same team and method,
  rendered from the LRO/LOLA DEM (dataset 653) and JPL DE421 ephemerides at 2-hour steps).
We use the 2026 frame set (1920x1080 TIFF, 4380 frames, frame n = 2026-01-01T00:00Z + (n-1)*2h).

Why 4930 and not 5027 for pixel sampling: SVS 5027 (to 80 S) prints crater names and
outlines over the map and the "Shackleton" label covers the SELENE-1 site; its scale is
~0.57 km/px. SVS 4930 (to 88 S) has no labels over the site and ~0.11 km/px.

Method (reproducible, no manual steps)
--------------------------------------
* Only the bytes needed are downloaded: the TIFF directory (HTTP Range on the file tail)
  and the few LZW-compressed rows around the site (one strip = one row).
* Map geometry: orthographic polar view centred on the pole (image centre); the radius per
  degree is measured from the 88 S graticule ring of frame 1 and checked against the
  centre of Shackleton crater.
* Site pixel = (lat, lon) of the best-lit LOLA pixel already used by the game
  (AVGVISIB_85S_060M_201608, see extract_illumination.py).
* A 3x3 pixel block (~0.34 km) is sampled; "lit" = median luminance > LIT_THRESHOLD (i.e. not black:
  the renderer has no ambient light, so cast shadow is exactly 0 while low-angle sunlight is dim but > 0).
  The raw luminance is kept so the threshold can be re-evaluated (scripts/build_svs_dataset.py).
* Output: raw per-frame CSV + compact daily JSON for the game.

Usage:  python scripts/extract_svs_illumination.py [--year 2026] [--workers 12] [--limit N]
"""
from __future__ import annotations

import argparse
import concurrent.futures as cf
import csv
import datetime as dt
import json
import math
import os
import re
import statistics
import struct
import sys
import time
import urllib.request

BASE = "https://svs.gsfc.nasa.gov/vis/a000000/a004900/a004930/frames/1920x1080_16x9_30p/{year}/sp_illum.{n:04d}.tif"
W, H = 1920, 1080
CX, CY = 960.0, 540.0  # pole = image centre (graticule cross)
RING_LAT = -88.0       # outer graticule ring of SVS 4930
LIT_THRESHOLD = 0.5    # 0..255 luminance; cast shadow renders as exactly 0 (no ambient light), any sunlight is > 0

SITES = {
    # Same coordinates as the LOLA best-lit pixel used by the game since v0.1.
    "selene1": {"name": "SELENE-1 site (LOLA best-lit pixel near Shackleton)", "lat": -89.4749, "lon": 222.557},
    # Control: centre of Shackleton crater, a permanently shadowed region (expected ~0 %).
    "shackleton_floor": {"name": "Shackleton crater floor (control, permanent shadow)", "lat": -89.67, "lon": 129.78},
}

UA = {"User-Agent": "space-commander-education-script/1.0"}


def http_range(url: str, rng: str, tries: int = 5) -> tuple[bytes, int | None]:
    for i in range(tries):
        try:
            req = urllib.request.Request(url, headers={**UA, "Range": f"bytes={rng}"})
            with urllib.request.urlopen(req, timeout=60) as r:
                total = None
                cr = r.headers.get("Content-Range")
                if cr and "/" in cr:
                    total = int(cr.rsplit("/", 1)[1])
                if r.status != 206:
                    raise RuntimeError(f"server ignored Range ({r.status})")
                return r.read(), total
        except Exception as e:  # noqa: BLE001 - retry any network error
            if i == tries - 1:
                raise
            time.sleep(1.5 * (i + 1))
    raise RuntimeError("unreachable")


# ---------------- TIFF (little-endian, one row per strip, LZW) ----------------

def lzw_decode(data: bytes) -> bytes:
    """TIFF LZW (MSB-first, 'early change')."""
    out = bytearray()
    table = [bytes([i]) for i in range(256)] + [b"", b""]
    width, bitpos, nbits = 9, 0, len(data) * 8
    prev: bytes | None = None
    while bitpos + width <= nbits:
        byte_i = bitpos >> 3
        chunk = int.from_bytes(data[byte_i:byte_i + 3].ljust(3, b"\0"), "big")
        code = (chunk >> (24 - (bitpos & 7) - width)) & ((1 << width) - 1)
        bitpos += width
        if code == 256:
            table = table[:258]
            width, prev = 9, None
            continue
        if code == 257:
            break
        if prev is None:
            entry = table[code]
            out += entry
            prev = entry
            continue
        if code < len(table):
            entry = table[code]
            table.append(prev + entry[:1])
        else:
            entry = prev + prev[:1]
            table.append(entry)
        out += entry
        prev = entry
        if len(table) + 1 >= (1 << width) and width < 12:
            width += 1
    return bytes(out)


def parse_ifd(tail: bytes, tail_start: int) -> dict[int, list[int]]:
    """Locate the IFD in the downloaded tail (it starts with tag 256 = 1920) and read tags."""
    sig = struct.pack("<HHII", 256, 3, 1, W)
    sig2 = struct.pack("<HHII", 256, 4, 1, W)
    pos = tail.find(sig)
    if pos < 0:
        pos = tail.find(sig2)
    if pos < 2:
        raise ValueError("IFD not found in tail")
    start = pos - 2
    (n,) = struct.unpack_from("<H", tail, start)
    tags: dict[int, list[int]] = {}
    for i in range(n):
        tag, typ, cnt, val = struct.unpack_from("<HHII", tail, start + 2 + 12 * i)
        size = {3: 2, 4: 4}.get(typ)
        if size is None:
            continue
        if cnt * size <= 4:
            raw = struct.pack("<I", val)[: cnt * size]
            vals = list(struct.unpack("<" + ("H" if size == 2 else "I") * cnt, raw))
        else:
            off = val - tail_start
            if off < 0 or off + cnt * size > len(tail):
                raise ValueError(f"tag {tag} array outside tail")
            vals = list(struct.unpack_from("<" + ("H" if size == 2 else "I") * cnt, tail, off))
        tags[tag] = vals
    if tags.get(259, [0])[0] != 5 or tags.get(278, [0])[0] != 1:
        raise ValueError("unexpected TIFF layout (need LZW, 1 row per strip)")
    if tags.get(317, [1])[0] != 1:
        raise ValueError("unexpected predictor")
    return tags


def fetch_rows(url: str, y0: int, y1: int) -> dict[int, bytes]:
    tail, total = http_range(url, "-24576")
    assert total is not None
    tags = parse_ifd(tail, total - len(tail))
    offs, cnts = tags[273], tags[279]
    a, b = offs[y0], offs[y1] + cnts[y1] - 1
    blob, _ = http_range(url, f"{a}-{b}")
    rows = {}
    for y in range(y0, y1 + 1):
        s = offs[y] - a
        rows[y] = lzw_decode(blob[s:s + cnts[y]])[: W * 3]
    return rows


# ---------------- geometry ----------------

def pixel_of(lat: float, lon: float, r_pole: float) -> tuple[float, float]:
    """Orthographic polar view: r = R * sin(colatitude); near side (lon 0) up, 90 E to the right."""
    colat = math.radians(90 + lat)  # lat is negative
    r = r_pole * math.sin(colat)
    lam = math.radians(lon)
    return CX + r * math.sin(lam), CY - r * math.cos(lam)


def lum(row: bytes, x: int) -> float:
    r, g, b = row[3 * x], row[3 * x + 1], row[3 * x + 2]
    return 0.299 * r + 0.587 * g + 0.114 * b


def _ring_peak(values: list[tuple[int, int, int, int]]) -> float:
    """values = (position, r, g, b) along the graticule line, which is teal (r == 0, g == b, g ~ 48).
    Where the 88 S ring crosses the line the teal is brighter (g ~ 60): return the centroid of those pixels."""
    hits = [(p, g) for p, r, g, b in values if r == 0 and g == b and g >= 54]
    if not hits:
        raise RuntimeError("graticule ring crossing not found")
    best = max(g for _, g in hits)
    near = [p for p, g in hits if g >= best - 6 and abs(p - max(hits, key=lambda h: h[1])[0]) <= 3]
    return sum(near) / len(near)


def measure_ring_radius(url: str) -> float:
    """Measure the 88 S ring where it crosses the graticule cross on the left (row 540) and top (column 960).
    The right/bottom crossings run over sunlit terrain, so they are not used."""
    row = fetch_rows(url, int(CY), int(CY))[int(CY)]
    left = _ring_peak([(x, row[3 * x], row[3 * x + 1], row[3 * x + 2]) for x in range(300, 480)])
    top_rows = fetch_rows(url, 0, 40)
    c = int(CX)
    top = _ring_peak([(y, *top_rows[y][3 * c:3 * c + 3]) for y in range(0, 41)])
    return ((CX - left) + (CY - top)) / 2.0


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--year", type=int, default=2026)
    ap.add_argument("--workers", type=int, default=12)
    ap.add_argument("--limit", type=int, default=0, help="only the first N frames (testing)")
    ap.add_argument("--frames", type=int, default=4380)
    ap.add_argument("--ring-radius", type=float, default=0.0, help="override measured ring radius (px)")
    args = ap.parse_args()

    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    raw_dir = os.path.join(root, "data", "svs4930")
    os.makedirs(raw_dir, exist_ok=True)

    url1 = BASE.format(year=args.year, n=1)
    ring_r = args.ring_radius or measure_ring_radius(url1)
    r_pole = ring_r / math.sin(math.radians(90 + RING_LAT))
    print(f"ring radius {ring_r:.1f} px -> {r_pole:.1f} px per unit sphere ({ring_r / 2:.1f} px/deg)")

    px = {k: pixel_of(s["lat"], s["lon"], r_pole) for k, s in SITES.items()}
    for k, (x, y) in px.items():
        print(f"{k}: x={x:.1f} y={y:.1f}")
    ys = [round(y) for _, y in px.values()]
    y0, y1 = min(ys) - 1, max(ys) + 1

    def sample(n: int):
        t = dt.datetime(args.year, 1, 1, tzinfo=dt.timezone.utc) + dt.timedelta(hours=2 * (n - 1))
        rows = fetch_rows(BASE.format(year=args.year, n=n), y0, y1)
        rec = {"frame": n, "utc": t.strftime("%Y-%m-%dT%H:%MZ")}
        for k, (x, y) in px.items():
            xi, yi = round(x), round(y)
            vals = [lum(rows[yy], xx) for yy in (yi - 1, yi, yi + 1) for xx in (xi - 1, xi, xi + 1)]
            rec[k] = round(statistics.median(vals), 1)
        return rec

    n_frames = args.limit or args.frames
    out: list[dict] = []
    t0 = time.time()
    with cf.ThreadPoolExecutor(max_workers=args.workers) as ex:
        futs = {ex.submit(sample, n): n for n in range(1, n_frames + 1)}
        for i, f in enumerate(cf.as_completed(futs), 1):
            out.append(f.result())
            if i % 250 == 0:
                print(f"  {i}/{n_frames} frames ({time.time() - t0:.0f}s)", flush=True)
    out.sort(key=lambda r: r["frame"])

    raw_csv = os.path.join(raw_dir, f"selene1_luminance_{args.year}.csv")
    with open(raw_csv, "w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=["frame", "utc", *SITES.keys()])
        w.writeheader()
        w.writerows(out)
    print("wrote", raw_csv)

    # ---- daily aggregation (12 frames per UTC day) ----
    days = []
    for d in range(0, n_frames // 12):
        recs = out[12 * d: 12 * d + 12]
        date = (dt.date(args.year, 1, 1) + dt.timedelta(days=d)).isoformat()
        if len(recs) < 12:
            days.append({"date": date, "sunlit": None})
            continue
        lit = sum(1 for r in recs if r["selene1"] > LIT_THRESHOLD)
        days.append({"date": date, "sunlit": round(lit / 12, 4)})

    allv = [r["selene1"] for r in out]
    ctrl = [r["shackleton_floor"] for r in out]
    annual = sum(1 for v in allv if v > LIT_THRESHOLD) / len(allv)
    summary = {
        "framesSampled": len(out),
        "annualSunlitFraction": round(annual, 4),
        "controlShackletonFloorSunlitFraction": round(sum(1 for v in ctrl if v > LIT_THRESHOLD) / len(ctrl), 4),
        "exactlyBlackShare": round(sum(1 for v in allv if v == 0) / len(allv), 4),
        "ringRadiusPx": round(ring_r, 1),
        "pxPerDegree": round(ring_r / 2, 1),
        "sitePixel": {k: [round(x, 1), round(y, 1)] for k, (x, y) in px.items()},
    }
    print(json.dumps(summary, indent=2))
    with open(os.path.join(raw_dir, f"summary_{args.year}.json"), "w", encoding="utf-8") as fh:
        json.dump({"summary": summary, "days": days}, fh, indent=1)
    return 0


if __name__ == "__main__":
    sys.exit(main())
