"""
SPACE COMMANDER — WP04 / V4.1
Reproducible extraction of NASA/LOLA average solar illumination near Shackleton crater.

Source: Mazarico et al. (2011), Icarus 211, 1066-1081, doi:10.1016/j.icarus.2010.10.030
Product: AVGVISIB_85S_060M_201608 (Cloud-Optimized GeoTIFF), NASA GSFC PGDA product 69
  https://pgda.gsfc.nasa.gov/products/69
Label: values are the fraction of timesteps in which the solar disc is visible (0..1),
  stored as int16 with SCALING_FACTOR = 0.00004, OFFSET = 0.

Only a small window is read over HTTP range requests (the COG is not fully downloaded).

Usage:  python -I scripts/extract_illumination.py  [output.json]
Requires: rasterio, numpy
"""
import json
import math
import sys
from datetime import date

import numpy as np
import rasterio
from rasterio.windows import Window

# The PGDA COG link returned an HTML page on 2026-11-14, so we read the original PDS3 product
# (same data, linked from the same PGDA page) through GDAL's PDS driver over HTTP range requests.
COG_URL = "/vsicurl/http://imbrium.mit.edu/EXTRAS/ILLUMINATION/IMG/AVGVISIB_85S_060M_201608.LBL"
SCALE = 0.00004  # from the PDS label AVGVISIB_85S_060M_201608.LBL
R_MOON_M = 1737400.0
# Shackleton crater centre (IAU Gazetteer of Planetary Nomenclature)
SHACKLETON_LAT, SHACKLETON_LON = -89.67, 129.78
SEARCH_RADIUS_M = 20000.0


def latlon_to_xy(lat_deg: float, lon_deg: float):
    """South polar stereographic, true scale at the pole (same as the product)."""
    rho = 2 * R_MOON_M * math.tan(math.radians(90 + lat_deg) / 2)
    lon = math.radians(lon_deg)
    return rho * math.sin(lon), rho * math.cos(lon)


def xy_to_latlon(x: float, y: float):
    rho = math.hypot(x, y)
    lat = -90 + math.degrees(2 * math.atan(rho / (2 * R_MOON_M)))
    lon = math.degrees(math.atan2(x, y)) % 360
    return lat, lon


def check_projection(ds):
    """Cross-check our manual projection against GDAL's CRS transform."""
    from rasterio.warp import transform as warp
    geo = "+proj=longlat +R=1737400 +no_defs"
    xs, ys = warp(geo, ds.crs, [SHACKLETON_LON], [SHACKLETON_LAT])
    mx, my = latlon_to_xy(SHACKLETON_LAT, SHACKLETON_LON)
    if abs(xs[0] - mx) > 1 or abs(ys[0] - my) > 1:
        raise SystemExit(f"Projection mismatch: GDAL {xs[0]:.1f},{ys[0]:.1f} vs manual {mx:.1f},{my:.1f}")


def main(out_path: str):
    with rasterio.open(COG_URL) as ds:
        info = {
            "crs": ds.crs.to_wkt() if ds.crs else None,
            "width": ds.width,
            "height": ds.height,
            "dtype": ds.dtypes[0],
            "transform": list(ds.transform)[:6],
            "nodata": ds.nodata,
        }
        check_projection(ds)
        cx, cy = latlon_to_xy(SHACKLETON_LAT, SHACKLETON_LON)
        row_c, col_c = ds.index(cx, cy)
        px = abs(ds.transform.a)
        half = int(SEARCH_RADIUS_M / px)
        win = Window(col_c - half, row_c - half, 2 * half + 1, 2 * half + 1)
        raw = ds.read(1, window=win).astype("float64")
        win_transform = ds.window_transform(win)

    raw_min, raw_max = float(raw.min()), float(raw.max())
    frac = raw * SCALE
    # Validate interpretation: fractions must lie in [0, 1]
    valid = (frac >= 0) & (frac <= 1.0000001)
    if not valid.all():
        raise SystemExit(f"Unexpected values outside [0,1]: raw range {raw_min}..{raw_max}")

    yy, xx = np.mgrid[0 : frac.shape[0], 0 : frac.shape[1]]
    dist = np.hypot(yy - half, xx - half) * px
    frac_in = np.where(dist <= SEARCH_RADIUS_M, frac, -1)
    r, c = np.unravel_index(np.argmax(frac_in), frac_in.shape)
    best = float(frac[r, c])
    bx, by = rasterio.transform.xy(win_transform, int(r), int(c))
    blat, blon = xy_to_latlon(bx, by)

    inside = frac[dist <= SEARCH_RADIUS_M]
    centre = float(frac[half, half])

    out = {
        "schemaVersion": 1,
        "source": {
            "id": "AVGVISIB_85S_060M_201608",
            "title": "Lunar Polar Illumination — average solar illumination, 85S-90S, 60 m/px",
            "organization": "NASA Goddard Space Flight Center — Planetary Geodesy Data Archive (PGDA)",
            "url": "https://pgda.gsfc.nasa.gov/products/69",
            "fileUrl": COG_URL.replace("/vsicurl/", ""),
            "citation": "Mazarico, E., Neumann, G.A., Smith, D.E., Zuber, M.T., Torrence, M.H. (2011). Illumination conditions of the lunar polar regions using LOLA topography. Icarus 211, 1066-1081. doi:10.1016/j.icarus.2010.10.030",
            "instrument": "LRO / LOLA topography (LDEM_85S_060M)",
            "accessDate": date.today().isoformat(),
        },
        "raster": info,
        "interpretation": {
            "variable": "Average fraction of time the solar disc is visible",
            "units": "fraction (0 = permanent shadow, 1 = always sunlit)",
            "scaleFactor": SCALE,
            "temporalMeaning": "Long-term average over hourly timesteps spanning one lunar nutation cycle (~18.6 years). NOT a day-by-day time series.",
            "rawRangeInWindow": [raw_min, raw_max],
        },
        "sample": {
            "searchCentre": {"name": "Shackleton crater (centre)", "lat": SHACKLETON_LAT, "lon": SHACKLETON_LON},
            "searchRadiusKm": SEARCH_RADIUS_M / 1000,
            "selectedSite": {
                "name": "Best-lit 60 m pixel within 20 km of Shackleton centre (used as the fictional SELENE-1 site)",
                "lat": round(blat, 4),
                "lon": round(blon, 3),
                "x_m": round(bx, 1),
                "y_m": round(by, 1),
                "illuminationFraction": round(best, 4),
            },
            "windowStats": {
                "meanFraction": round(float(inside.mean()), 4),
                "medianFraction": round(float(np.median(inside)), 4),
                "fractionOfPixelsAbove50pct": round(float((inside > 0.5).mean()), 4),
                "fractionOfPixelsInPermanentShadow": round(float((inside == 0).mean()), 4),
                "craterCentreFraction": round(centre, 4),
            },
        },
        "notes": [
            "SELENE-1 is fictional; only the illumination fraction comes from NASA data.",
            "Illumination fraction is not electrical power. Panel size and efficiency are game assumptions (see src/lib/nasa/energyModel.ts).",
        ],
    }
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(out, f, indent=2, ensure_ascii=False)
    print(json.dumps(out["sample"], indent=2))


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "src/data/nasa/lunar-illumination.json")

