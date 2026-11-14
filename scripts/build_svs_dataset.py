"""
Offline step 2: turn the raw per-frame luminance CSV produced by extract_svs_illumination.py
into the small, documented dataset the game ships with:

    data/svs4930/selene1_luminance_2026.csv   (4380 rows, raw, reproducible)
        -> src/data/nasa/svs-4930-selene1-2026.json   (365 daily values + provenance)

No network access. Re-run after changing LIT_THRESHOLD to see how sensitive the result is.
Usage: python scripts/build_svs_dataset.py
"""
from __future__ import annotations

import csv
import datetime as dt
import json
import os

# The SVS renderer has no ambient light: a cast shadow is exactly 0 (the permanently shadowed control
# reads 0.0 in all 4380 frames). Dim, non-zero values are low-angle sunlight (shading by incidence angle),
# not shadow. So "lit" = the 3x3 median is not black. Sensitivity to other cut-offs is reported.
LIT_THRESHOLD = 0.5
YEAR = 2026
LOLA_LONG_TERM = 0.8844  # AVGVISIB_85S_060M_201608 at the same site (src/data/nasa/lunar-illumination.json)

root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
raw_csv = os.path.join(root, "data", "svs4930", f"selene1_luminance_{YEAR}.csv")
out_json = os.path.join(root, "src", "data", "nasa", f"svs-4930-selene1-{YEAR}.json")

with open(raw_csv, encoding="utf-8") as fh:
    rows = list(csv.DictReader(fh))
assert len(rows) == 4380, f"expected 4380 frames, got {len(rows)}"
for i, r in enumerate(rows, 1):
    assert int(r["frame"]) == i, "frames must be complete and ordered"

lit = [float(r["selene1"]) > LIT_THRESHOLD for r in rows]
ctrl = [float(r["shackleton_floor"]) > LIT_THRESHOLD for r in rows]
daily = [round(sum(lit[12 * d:12 * d + 12]) / 12, 4) for d in range(365)]

# sensitivity of the annual mean to the threshold choice
sens = {}
for th in (0.5, 5, 10, 25):
    sens[str(th)] = round(sum(1 for r in rows if float(r["selene1"]) > th) / len(rows), 4)

# longest continuous shadow (in 2-hour steps)
longest, cur = 0, 0
for v in lit:
    cur = 0 if v else cur + 1
    longest = max(longest, cur)

dataset = {
    "schemaVersion": 1,
    "source": {
        "id": "SVS-4930",
        "title": "Illumination at the Moon's South Pole, 2023 to 2030",
        "organization": "NASA Scientific Visualization Studio (Goddard Space Flight Center)",
        "url": "https://svs.gsfc.nasa.gov/4930/",
        "framesUrl": f"https://svs.gsfc.nasa.gov/vis/a000000/a004900/a004930/frames/1920x1080_16x9_30p/{YEAR}/",
        "credits": "Visualizer: Ernie Wright (STC). Scientist: Noah Petro (NASA/GSFC). Technical support: Laurence Schuler, Ian Jones (ADNET Systems).",
        "dataUsed": [
            "LRO LOLA digital elevation model (SVS dataset 653)",
            "JPL DE421 planetary ephemerides (SVS dataset 752)",
        ],
        "relatedProduct": {
            "id": "SVS-5027",
            "title": "Illumination at the Moon's South Pole to 80°S, 2025 to 2028",
            "url": "https://svs.gsfc.nasa.gov/5027/",
            "whyNotSampled": "Same team, method and inputs, but crater names are printed over the map and the 'Shackleton' label covers the SELENE-1 site; scale ~0.57 km/px vs ~0.11 km/px in SVS 4930.",
        },
        "accessDate": "2026-11-14",
    },
    "observationContext": "Model-based visualization, not a direct observation: sunlight and shadow are ray-traced over measured LOLA terrain for the Sun positions given by the DE421 ephemeris. It is a prediction for 2026, valid for the terrain resolution of the rendering.",
    "site": {
        "name": "SELENE-1 (fictional base) at the LOLA best-lit pixel near Shackleton crater",
        "lat": -89.4749,
        "lon": 222.557,
    },
    "method": {
        "script": "scripts/extract_svs_illumination.py + scripts/build_svs_dataset.py",
        "frames": len(rows),
        "timeStepHours": 2,
        "firstFrameUtc": rows[0]["utc"],
        "lastFrameUtc": rows[-1]["utc"],
        "timeCheck": "On-screen time labels checked: frame 1 = 01 Jan 2026 00:00 UT, frame 2000 = 16 Jun 2026 14:00 UT, frame 4380 = 31 Dec 2026 22:00 UT.",
        "projection": "Orthographic polar view centred on the pole; 88°S ring measured at 539.5 px (≈269.8 px per degree, ≈0.11 km per px); Shackleton centre predicted at the crater's rim centre.",
        "sampleBlockPx": 3,
        "litThreshold": LIT_THRESHOLD,
        "variable": "sunlitFraction = share of the day's twelve 2-hour frames in which the site's 3×3-pixel median luminance is above the threshold (0..1)",
    },
    "validation": {
        "annualSunlitFraction": round(sum(lit) / len(lit), 4),
        "lolaLongTermFractionSameSite": LOLA_LONG_TERM,
        "thresholdSensitivity": sens,
        "controlShackletonFloorSunlitFraction": round(sum(ctrl) / len(ctrl), 4),
        "longestShadowHours": longest * 2,
    },
    "limitations": [
        "Derived from rendered visualization frames, not from a published numeric data product.",
        "Lit/shadow is binary per 2-hour frame; partial Sun-disc visibility and shadow edges are not resolved.",
        "One pixel ≈ 110 m, coarser than the 60 m LOLA illumination map; a 3×3 block (~330 m) is sampled.",
        "Only the Sun is modelled; Earth-shine, panel height above ground and panel orientation are ignored.",
        "Sunlit fraction is not electrical power: converting it to kWh uses game assumptions (panel size, performance).",
    ],
    "daily": {"start": f"{YEAR}-01-01", "stepDays": 1, "sunlitFraction": daily},
}

os.makedirs(os.path.dirname(out_json), exist_ok=True)
with open(out_json, "w", encoding="utf-8") as fh:
    json.dump(dataset, fh, ensure_ascii=False, indent=1)
print("wrote", out_json)
print(json.dumps(dataset["validation"], indent=1))
